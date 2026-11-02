/* ---------------------------------------------------------------------------
   tourn.lol backend — one Express app on Railway Postgres.

   Owns: sessions (JWT cookie), Discord OAuth sign-up, email+password
   sign-in, profiles/claims, MFA (TOTP), admin directory, view counters,
   the public /env.js runtime config, and the verification-codes flow.

   Env it reads (all set in Railway):
     DATABASE_URL              Railway Postgres connection string
     JWT_SECRET                session signing key
     FRONTEND_URL              https://tourn.lol (CORS + OAuth return)
     BACKEND_URL               https://tourn-production.up.railway.app
    CLOUDINARY_*              media/file hosting — the only external besides
                              Postgres (declared here, wired per feature)
     VITE_OWNER_EMAIL          owner account email
     ADMIN_EMAIL / ADMIN_PASSWORD
     VITE_DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_BOT_TOKEN
     VITE_SPOTIFY_CLIENT_ID / VITE_TURNSTILE_SITE_KEY / VITE_STRIPE_PUBLISHABLE_KEY
   --------------------------------------------------------------------------- */

import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const {
  DATABASE_URL,
  JWT_SECRET,
  FRONTEND_URL = "http://127.0.0.1:5180",
  BACKEND_URL = "https://tourn-production.up.railway.app",
  VITE_OWNER_EMAIL = "",
  ADMIN_EMAIL = "",
  ADMIN_PASSWORD = "",
  VITE_DISCORD_CLIENT_ID = "",
  DISCORD_CLIENT_SECRET = "",
  DISCORD_BOT_TOKEN = "",
  VITE_SPOTIFY_CLIENT_ID = "",
  VITE_TURNSTILE_SITE_KEY = "",
  VITE_STRIPE_PUBLISHABLE_KEY = "",
  PORT = 8787,
} = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required (Railway → Postgres → connection string)");
}
if (!JWT_SECRET) {
  console.error("JWT_SECRET is required (openssl rand -hex 32)");
}

/* ── database ──────────────────────────────────────────────────────────── */

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && !/localhost|127\.0\.0\.1/.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : undefined,
});

const SCHEMA = `
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique,
  password_hash text,
  avatar_url text,
  discord_id text unique,
  alias text unique,
  alias2 text unique,
  premium boolean not null default false,
  is_admin boolean not null default false,
  is_owner boolean not null default false,
  totp_secret text,
  totp_pending text,
  token_version integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists profile_views (
  username text primary key,
  views bigint not null default 0
);

create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  action text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
`;

async function initDb() {
  await pool.query(SCHEMA);
  // Seed the backend admin account if configured and not present yet.
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const existing = await pool.query("select id from users where email = $1", [ADMIN_EMAIL.toLowerCase()]);
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      const name = (ADMIN_EMAIL.split("@")[0] || "admin").toLowerCase().replace(/[^a-z0-9._-]/g, "") || "admin";
      await pool.query(
        `insert into users (username, email, password_hash, is_admin, is_owner)
         values ($1, $2, $3, true, true)
         on conflict (email) do nothing`,
        [name, ADMIN_EMAIL.toLowerCase(), hash],
      );
      console.log(`[db] seeded admin account ${ADMIN_EMAIL}`);
    }
  }
}

/* ── helpers ───────────────────────────────────────────────────────────── */

const COOKIE = "tourn_session";
const secureCookie = BACKEND_URL.startsWith("https://");

function signSession(user) {
  return jwt.sign({ sub: user.id, v: user.token_version }, JWT_SECRET, { expiresIn: "30d" });
}

function setSession(res, user) {
  res.cookie(COOKIE, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

function accountOf(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    alias: row.alias ?? null,
    alias2: row.alias2 ?? null,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
    joinedAt: row.created_at,
    premium: Boolean(row.premium),
    isAdmin: Boolean(row.is_admin),
    isOwner: Boolean(row.is_owner),
  };
}

async function userById(id) {
  const { rows } = await pool.query("select * from users where id = $1", [id]);
  return rows[0] ?? null;
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Sign in first." });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Your session expired — sign in again." });
  }
  next();
}

async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    const user = await userById(req.auth.sub);
    if (!user || !user.is_admin) return res.status(403).json({ error: "Admins only." });
    req.user = user;
    next();
  });
}

async function currentUser(req) {
  if (!req.auth) return null;
  const user = await userById(req.auth.sub);
  if (!user) return null;
  if (user.token_version !== req.auth.v) return null; // signed out elsewhere
  return user;
}

const cleanHandle = (input) =>
  String(input ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

const RESERVED = new Set([
  "admin", "about", "shop", "leaderboard", "dashboard", "profile", "demo",
  "login", "signin", "signup", "help", "support", "api", "assets", "premium",
]);

async function claimTaken(clean, exceptUserId) {
  const { rows } = await pool.query(
    `select id from users
     where (username = $1 or alias = $1 or alias2 = $1) and id <> $2
     limit 1`,
    [clean, exceptUserId ?? "00000000-0000-0000-0000-000000000000"],
  );
  return rows.length > 0;
}

async function uniqueUsername(base) {
  const root = cleanHandle(base) || "player";
  let candidate = root;
  for (let i = 0; i < 50; i += 1) {
    const { rows } = await pool.query("select id from users where username = $1", [candidate]);
    if (rows.length === 0) return candidate;
    candidate = `${root}${Math.floor(Math.random() * 9000) + 100}`;
  }
  return `${root}${Date.now().toString(36)}`;
}

async function sendDiscordDm(discordId, content) {
  if (!DISCORD_BOT_TOKEN || !discordId) return false;
  try {
    const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!channelRes.ok) return false;
    const channel = await channelRes.json();
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    return msgRes.ok;
  } catch {
    return false;
  }
}

/* ── app ───────────────────────────────────────────────────────────────── */

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use(
  cors({
    origin: [FRONTEND_URL, "http://127.0.0.1:5180", "http://localhost:5180"],
    credentials: true,
  }),
);

/* ── runtime public env (the only config the static site needs) ────────── */

app.get("/env.js", (_req, res) => {
  res.set("Content-Type", "application/javascript; charset=utf-8");
  res.set("Cache-Control", "public, max-age=60");
  res.send(
    `window.__ENV__ = ${JSON.stringify({
      VITE_API_BASE_URL: BACKEND_URL,
      VITE_OWNER_EMAIL: VITE_OWNER_EMAIL,
      VITE_DISCORD_CLIENT_ID: VITE_DISCORD_CLIENT_ID,
      VITE_SPOTIFY_CLIENT_ID: VITE_SPOTIFY_CLIENT_ID,
      VITE_TURNSTILE_SITE_KEY: VITE_TURNSTILE_SITE_KEY,
      VITE_STRIPE_PUBLISHABLE_KEY: VITE_STRIPE_PUBLISHABLE_KEY,
    })};`,
  );
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ── auth ──────────────────────────────────────────────────────────────── */

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.json({ account: null });
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      clearSession(res);
      return res.json({ account: null });
    }
    const user = await userById(payload.sub);
    if (!user || user.token_version !== payload.v) {
      clearSession(res);
      return res.json({ account: null });
    }
    res.json({ account: accountOf(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password) return res.status(400).json({ error: "Enter your email and password." });
    const { rows } = await pool.query("select * from users where email = $1", [email]);
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "No email/password sign-in on this account — use Discord." });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Email or password is incorrect." });
    setSession(res, user);
    res.json({ account: accountOf(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.post("/api/auth/signout-others", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "update users set token_version = token_version + 1 where id = $1 returning *",
      [req.auth.sub],
    );
    const user = rows[0];
    // Re-issue this device's session with the new version so it survives.
    setSession(res, user);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Discord OAuth — THE sign-up path. */
app.get("/api/auth/discord", (req, res) => {
  if (!VITE_DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error(
      "[discord oauth] not configured — set VITE_DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET in Railway",
    );
    return res.redirect(`${FRONTEND_URL}/#/?error=oauth_config`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("tourn_oauth", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  const params = new URLSearchParams({
    client_id: VITE_DISCORD_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/api/auth/discord/callback`,
    response_type: "code",
    scope: "identify email",
    state,
    prompt: "consent",
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/api/auth/discord/callback", async (req, res) => {
  try {
    const code = String(req.query?.code ?? "");
    const state = String(req.query?.state ?? "");
    const expectedState = req.cookies?.tourn_oauth;
    res.clearCookie("tourn_oauth", { path: "/" });
    if (!code || !state || state !== expectedState) {
      return res.redirect(`${FRONTEND_URL}/#/?error=oauth_state`);
    }

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: VITE_DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${BACKEND_URL}/api/auth/discord/callback`,
      }),
    });
    if (!tokenRes.ok) return res.redirect(`${FRONTEND_URL}/#/?error=discord_token`);
    const token = await tokenRes.json();

    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) return res.redirect(`${FRONTEND_URL}/#/?error=discord_profile`);
    const me = await meRes.json();

    const discordId = String(me.id);
    const email = me.email ? String(me.email).toLowerCase() : null;
    const avatar = me.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${me.avatar}.png?size=256`
      : null;
    const displayName = me.global_name || me.username || "player";

    // Existing account by Discord id, else by email (attach Discord to it).
    let { rows } = await pool.query("select * from users where discord_id = $1", [discordId]);
    let user = rows[0] ?? null;
    if (!user && email) {
      const byEmail = await pool.query("select * from users where email = $1", [email]);
      user = byEmail.rows[0] ?? null;
    }

    const ownerEmail = VITE_OWNER_EMAIL.trim().toLowerCase();
    const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
    const isOwner = Boolean(ownerEmail && email && email === ownerEmail);
    const isAdmin = Boolean(
      (adminEmail && email && email === adminEmail) || isOwner,
    );

    if (user) {
      const updated = await pool.query(
        `update users set discord_id = $1, avatar_url = coalesce($2, avatar_url),
           is_owner = is_owner or $3, is_admin = is_admin or $4
         where id = $5 returning *`,
        [discordId, avatar, isOwner, isAdmin, user.id],
      );
      user = updated.rows[0];
    } else {
      const username = await uniqueUsername(displayName);
      const first = await pool.query("select count(*)::int as count from users");
      const isFirst = first.rows[0].count === 0;
      const inserted = await pool.query(
        `insert into users (username, email, discord_id, avatar_url, is_owner, is_admin)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [username, email, discordId, avatar, isOwner || isFirst, isAdmin || isFirst],
      );
      user = inserted.rows[0];
    }

    setSession(res, user);
    res.redirect(`${FRONTEND_URL}/#/dashboard`);
  } catch (error) {
    console.error("[discord callback]", error);
    res.redirect(`${FRONTEND_URL}/#/?error=oauth_failed`);
  }
});

/* Password — set (Discord accounts) or change (email accounts). */
app.post("/api/auth/password", requireAuth, async (req, res) => {
  try {
    const newPassword = String(req.body?.newPassword ?? "");
    const currentPassword = String(req.body?.currentPassword ?? "");
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Use a password with at least 8 characters." });
    }
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in again." });

    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Confirm with your current password." });
      }
      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) return res.status(400).json({ error: "Your current password is incorrect." });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query("update users set password_hash = $1 where id = $2", [hash, user.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/email", requireAuth, async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    const taken = await pool.query("select id from users where email = $1 and id <> $2", [
      email,
      req.auth.sub,
    ]);
    if (taken.rowCount > 0) return res.status(400).json({ error: "That email is already in use." });
    await pool.query("update users set email = $1 where id = $2", [email, req.auth.sub]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── MFA (TOTP) ────────────────────────────────────────────────────────── */

app.get("/api/auth/mfa/factors", requireAuth, async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Sign in again." });
  res.json({
    factors: user.totp_secret
      ? [{ id: "totp", createdAt: user.created_at, friendlyName: "Authenticator app" }]
      : [],
  });
});

app.post("/api/auth/mfa/enroll", requireAuth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    if (user.totp_secret) return res.status(400).json({ error: "Two-factor is already on." });
    const secret = authenticator.generateSecret();
    await pool.query("update users set totp_pending = $1 where id = $2", [secret, user.id]);
    const uri = authenticator.keyuri(user.email ?? user.username, "tourn.lol", secret);
    const qr = await QRCode.toDataURL(uri);
    res.json({ factorId: "totp", qr, secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/mfa/verify", requireAuth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    const code = String(req.body?.code ?? "").replace(/\D/g, "");
    if (!user.totp_pending) return res.status(400).json({ error: "Start the enrollment first." });
    const ok = authenticator.check(code, user.totp_pending);
    if (!ok) return res.status(400).json({ error: "That code isn't right — try the next one." });
    await pool.query(
      "update users set totp_secret = totp_pending, totp_pending = null where id = $1",
      [user.id],
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/mfa/unenroll", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "update users set totp_secret = null, totp_pending = null where id = $1",
      [req.auth.sub],
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── verification codes (Discord bot DMs) ──────────────────────────────── */

app.post("/api/security/request-code", requireAuth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    const action = ["password", "email", "mfa"].includes(String(req.body?.action))
      ? String(req.body.action)
      : null;
    if (!action) return res.status(400).json({ error: "Unknown action." });
    if (!user.discord_id) {
      return res.status(400).json({ error: "Link Discord to your account first — the bot delivers codes there." });
    }
    const recent = await pool.query(
      `select count(*)::int as count from verification_codes
       where user_id = $1 and created_at > now() - interval '1 hour'`,
      [user.id],
    );
    if (recent.rows[0].count >= 3) {
      return res.status(429).json({ error: "Too many codes requested — try again later." });
    }
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const hash = await bcrypt.hash(code, 10);
    await pool.query(
      `insert into verification_codes (user_id, action, code_hash, expires_at)
       values ($1, $2, $3, now() + interval '10 minutes')`,
      [user.id, action, hash],
    );
    const sent = await sendDiscordDm(
      user.discord_id,
      `tourn.lol — your code is ${code}. It expires in 10 minutes. If you didn't request this, ignore it.`,
    );
    if (!sent) {
      return res.status(502).json({ error: "Couldn't DM you — make sure the bot shares a server with you." });
    }
    res.json({ ok: true, action });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/security/confirm-code", requireAuth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    const code = String(req.body?.code ?? "").replace(/\D/g, "");
    const action = String(req.body?.action ?? "");
    if (!code || !action) return res.status(400).json({ error: "Enter the code." });
    const { rows } = await pool.query(
      `select * from verification_codes
       where user_id = $1 and action = $2 and used = false and expires_at > now()
       order by created_at desc limit 1`,
      [user.id, action],
    );
    const record = rows[0];
    if (!record) return res.status(400).json({ error: "No active code — request a new one." });
    const ok = await bcrypt.compare(code, record.code_hash);
    if (!ok) return res.status(400).json({ error: "That code isn't right." });
    await pool.query("update verification_codes set used = true where id = $1", [record.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── profiles & claims ─────────────────────────────────────────────────── */

app.post("/api/profile/alias", requireAuth, async (req, res) => {
  try {
    const clean = cleanHandle(req.body?.alias);
    if (clean && clean.length < 3) return res.status(400).json({ error: "Aliases need at least 3 characters." });
    if (clean.length > 24) return res.status(400).json({ error: "Aliases must be 24 characters or fewer." });
    if (RESERVED.has(clean)) return res.status(400).json({ error: `"${clean}" is reserved by the site.` });
    if (clean && (await claimTaken(clean, req.auth.sub))) {
      return res.status(400).json({ error: `@${clean} is already claimed — try another.` });
    }
    const { rows } = await pool.query(
      "update users set alias = $1 where id = $2 returning *",
      [clean || null, req.auth.sub],
    );
    res.json({ account: accountOf(rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/profile/alias2", requireAuth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    const clean = cleanHandle(req.body?.alias2);
    if (!clean) {
      const { rows } = await pool.query(
        "update users set alias2 = null where id = $1 returning *",
        [user.id],
      );
      return res.json({ account: accountOf(rows[0]) });
    }
    if (clean.length < 3) return res.status(400).json({ error: "Aliases need at least 3 characters." });
    if (clean.length > 24) return res.status(400).json({ error: "Aliases must be 24 characters or fewer." });
    if (RESERVED.has(clean) || clean === user.username) {
      return res.status(400).json({ error: `"${clean}" is already taken.` });
    }
    if (!user.premium && !user.is_owner) {
      return res.status(403).json({ error: "A second alias is part of Premium." });
    }
    if (await claimTaken(clean, user.id)) {
      return res.status(400).json({ error: `@${clean} is already claimed — try another.` });
    }
    const { rows } = await pool.query(
      "update users set alias2 = $1 where id = $2 returning *",
      [clean, user.id],
    );
    res.json({ account: accountOf(rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── public reads ──────────────────────────────────────────────────────── */

app.get("/api/profiles/owner", async (_req, res) => {
  const { rows } = await pool.query(
    `select id, username, alias, avatar_url, created_at
     from users where is_owner = true order by created_at asc limit 1`,
  );
  const row = rows[0];
  if (!row) return res.json({ owner: null });
  res.json({
    owner: {
      id: row.id,
      username: row.username,
      alias: row.alias ?? null,
      avatarUrl: row.avatar_url ?? null,
      joinedAt: row.created_at,
    },
  });
});

app.get("/api/profiles", async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const { rows } = await pool.query(
    `select id, username, alias, avatar_url, created_at
     from users order by created_at asc limit $1`,
    [limit],
  );
  res.json({
    profiles: rows.map((row) => ({
      id: row.id,
      username: row.username,
      alias: row.alias ?? null,
      avatarUrl: row.avatar_url ?? null,
      joinedAt: row.created_at,
    })),
  });
});

app.get("/api/stats", async (_req, res) => {
  const users = await pool.query("select count(*)::int as count from users");
  const views = await pool.query("select coalesce(sum(views), 0)::bigint as total from profile_views");
  res.json({ users: users.rows[0].count, views: Number(views.rows[0].total) });
});

app.get("/api/views/:username", async (req, res) => {
  const handle = cleanHandle(req.params.username);
  const { rows } = await pool.query("select views from profile_views where username = $1", [handle]);
  res.json({ views: rows[0] ? Number(rows[0].views) : 0 });
});

const viewThrottle = new Map(); // ip+handle → day
app.post("/api/views/:username", async (req, res) => {
  try {
    const handle = cleanHandle(req.params.username);
    if (!handle) return res.status(400).json({ error: "Unknown handle." });
    const ip = req.ip ?? "unknown";
    const today = new Date().toISOString().slice(0, 10);
    const key = `${ip}:${handle}`;
    const incremented = viewThrottle.get(key) !== today;
    viewThrottle.set(key, today);
    if (viewThrottle.size > 10_000) viewThrottle.clear();

    if (incremented) {
      const { rows } = await pool.query(
        `insert into profile_views (username, views) values ($1, 1)
         on conflict (username) do update set views = profile_views.views + 1
         returning views`,
        [handle],
      );
      return res.json({ views: Number(rows[0].views) });
    }
    const { rows } = await pool.query("select views from profile_views where username = $1", [handle]);
    res.json({ views: rows[0] ? Number(rows[0].views) : 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── admin directory ───────────────────────────────────────────────────── */

app.get("/api/admin/profiles", requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `select id, username, alias, alias2, avatar_url, premium, is_admin, created_at
     from users order by created_at desc limit 300`,
  );
  res.json({ profiles: rows });
});

app.patch("/api/admin/profiles/:id", requireAdmin, async (req, res) => {
  try {
    const patch = {};
    if (typeof req.body?.premium === "boolean") patch.premium = req.body.premium;
    if (typeof req.body?.is_admin === "boolean") {
      if (req.body.is_admin === false && req.params.id === req.user.id) {
        return res.status(400).json({ error: "You can't remove your own admin flag." });
      }
      patch.is_admin = req.body.is_admin;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to update." });
    }
    const sets = Object.keys(patch).map((key, index) => `${key} = $${index + 2}`);
    const { rows } = await pool.query(
      `update users set ${sets.join(", ")} where id = $1 returning id, username, alias, alias2, avatar_url, premium, is_admin, created_at`,
      [req.params.id, ...Object.values(patch)],
    );
    if (!rows[0]) return res.status(404).json({ error: "No such account." });
    res.json({ profile: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── boot ──────────────────────────────────────────────────────────────── */

/* If the repo was built (`dist/`, one level up), serve the static site from
   this same service so a single Railway app can host frontend + backend
   together. API routes and /env.js above always win; everything else falls
   back to index.html (SPA). Without a build, unknown paths stay 404 JSON. */

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const hasStaticBuild = fs.existsSync(path.join(distDir, "index.html"));

if (hasStaticBuild) {
  console.log("[tourn] serving the built frontend from ../dist");
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: "1h",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) res.set("Cache-Control", "no-cache");
      },
    }),
  );
}

app.use((req, res) => {
  if (hasStaticBuild && req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.sendFile(path.join(distDir, "index.html"));
  }
  res.status(404).json({ error: "Not found." });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[tourn] backend listening on :${PORT}`);
      console.log(`[tourn] frontend: ${FRONTEND_URL} · backend: ${BACKEND_URL}`);
    });
  })
  .catch((error) => {
    console.error("[tourn] database init failed:", error.message);
    process.exit(1);
  });
