/* ---------------------------------------------------------------------------
   tourn.lol backend — one Express app on Railway Postgres.

   Owns: sessions (JWT cookie), Discord OAuth sign-up, email+password
   sign-in, profiles/claims, MFA (TOTP), admin directory, view counters,
   the public /env.js runtime config, and the verification-codes flow.

   Env it reads (all set in Railway):
     DATABASE_URL              Railway Postgres connection string
     JWT_SECRET                session signing key
     FRONTEND_URL              https://tourn.lol (CORS + OAuth return)      BACKEND_URL               https://tourn-production.up.railway.app
      OAUTH_REDIRECT_URI        optional; the exact Discord callback URL
    CLOUDINARY_*              media/file hosting — the only external besides
                              Postgres (declared here, wired per feature)
     OWNER_EMAIL               owner account email (server-only)
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
import { frontendOrigins } from "./origins.js";
import { visitorDevice, visitorSource, visitorHash, recordProfileVisit, profileAnalytics } from "./analytics.js";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import Stripe from "stripe";

const {
  DATABASE_URL,
  JWT_SECRET,
  FRONTEND_URL = "http://127.0.0.1:5180",
  BACKEND_URL = "https://tourn-production.up.railway.app",
  OAUTH_REDIRECT_URI = "",
  OWNER_EMAIL = "",
  VITE_OWNER_EMAIL = "", // legacy name; never exposed to the browser
  ADMIN_EMAIL = "",
  ADMIN_PASSWORD = "",
  VITE_DISCORD_CLIENT_ID = "",
  DISCORD_CLIENT_SECRET = "",
  DISCORD_BOT_TOKEN = "",
  DISCORD_GUILD_ID = "",
  VITE_SPOTIFY_CLIENT_ID = "",
  VITE_TURNSTILE_SITE_KEY = "",
  VITE_STRIPE_PUBLISHABLE_KEY = "",
  STRIPE_SECRET_KEY = "",
  STRIPE_PRICE_ID = "",
  STRIPE_WEBHOOK_SECRET = "",
  PORT = 8787,
} = process.env;

const DISCORD_CLIENT_ID = VITE_DISCORD_CLIENT_ID.trim();
const DISCORD_CLIENT_SECRET_KEY = DISCORD_CLIENT_SECRET.trim();
const OAUTH_REDIRECT = OAUTH_REDIRECT_URI.trim();

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required (Railway → Postgres → connection string)");
}
if (!JWT_SECRET) {
  console.error("JWT_SECRET is required (openssl rand -hex 32)");
}

/* The owner email is server-only. It used to be published through /env.js,
   which put a personal address in every visitor's source view. */
const OWNER_EMAIL_ADDRESS = (OWNER_EMAIL || VITE_OWNER_EMAIL).trim().toLowerCase();

/* Billing is optional: with no secret key + price id the site still runs, and
   the checkout route explains what is missing instead of failing at boot. */
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

/* ── frontend origins ──────────────────────────────────────────────────── */

/* FRONTEND_URL may name several deploy targets (tourn.lol + swats.bio) and
   every domain answers on its apex and www host. CORS and the OAuth return
   need one real origin at a time, never the raw comma-joined env value. */
const CONFIGURED_FRONTEND_ORIGINS = frontendOrigins(FRONTEND_URL);
const FRONTEND_ORIGINS = new Set([
  ...CONFIGURED_FRONTEND_ORIGINS,
  "http://127.0.0.1:5180",
  "http://localhost:5180",
]);
const CANONICAL_FRONTEND_ORIGIN = CONFIGURED_FRONTEND_ORIGINS[0] ?? "http://127.0.0.1:5180";

/* Sign-in started on www.tourn.lol used to come back to www.tourn.lol while the
   canonical site (and its session cookie) lives on the apex, so a visitor could
   finish OAuth and still look signed out. Return to the apex when the visitor
   started on the www sibling of a configured origin. */
function canonicalReturnOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.hostname.startsWith("www.")) {
      const apex = `${url.protocol}//${url.hostname.slice(4)}`;
      if (FRONTEND_ORIGINS.has(apex)) return apex;
    }
  } catch {
    /* not a URL — the caller's value is used as-is */
  }
  return origin;
}

/* Discord sends the browser back to this exact URL, so it has to be the one
   registered in the Discord portal. By default that is the backend host. Set
   OAUTH_REDIRECT_URI to the branded callback (e.g.
   https://www.tourn.lol/api/auth/discord/callback) once it is registered and
   the site proxies /api/* — then visitors never see the API host at all. */
const DISCORD_REDIRECT_URI =
  OAUTH_REDIRECT ||
  `${BACKEND_URL.replace(/\/+$/, "")}/api/auth/discord/callback`;

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
  stripe_customer_id text,
  stripe_subscription_id text,
  is_admin boolean not null default false,
  is_owner boolean not null default false,
  badges jsonb not null default '[]'::jsonb,
  totp_secret text,
  totp_pending text,
  token_version integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists profile_views (
  username text primary key,
  views bigint not null default 0
);

create table if not exists profile_view_events (
  username text not null,
  day date not null default ((now() at time zone 'UTC')::date),
  visitor_hash text not null,
  device text not null,
  source text not null,
  created_at timestamptz not null default now(),
  primary key (username, day, visitor_hash)
);
create index if not exists profile_view_events_user_date on profile_view_events (username, day);

create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  action text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists invite_codes (
  code text primary key,
  created_by uuid references users(id) on delete set null,
  premium boolean not null default false,
  max_uses integer not null default 1,
  uses integer not null default 0,
  note text,
  revoked boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
`;

async function initDb() {
  await pool.query(SCHEMA);
  // Databases created before admin-granted badges existed.
  await pool.query(
    "alter table users add column if not exists badges jsonb not null default '[]'::jsonb",
  );
  // Billing columns added when Premium checkout went live.
  await pool.query("alter table users add column if not exists stripe_customer_id text");
  await pool.query("alter table users add column if not exists stripe_subscription_id text");
  await pool.query(
    "create index if not exists users_stripe_customer_idx on users (stripe_customer_id)",
  );
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

/* The static site is on tourn.lol / swats.bio while this API is on
   railway.app, so API calls are cross-site. A `lax` session cookie is dropped
   on those fetches and every reload looks signed out; `none` keeps the session
   but requires HTTPS, so local HTTP development stays on `lax`. */
const sessionCookie = secureCookie
  ? { sameSite: "none", secure: true }
  : { sameSite: "lax" };

function setSession(res, user) {
  res.cookie(COOKIE, signSession(user), {
    httpOnly: true,
    ...sessionCookie,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/** The site fetches the authorize URL instead of navigating to the API. */
function wantsJson(req) {
  return String(req.get("accept") ?? "").toLowerCase().includes("application/json");
}

/** The allowed site the sign-in started from, so OAuth returns to it. */
function returnOriginFromReferer(req) {
  const referer = req.get("referer");
  if (referer) {
    try {
      const origin = new URL(referer).origin;
      if (FRONTEND_ORIGINS.has(origin)) return origin;
    } catch {
      /* malformed referer — fall back to the canonical origin */
    }
  }
  return CANONICAL_FRONTEND_ORIGIN;
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

function accountOf(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid ?? null,
    username: row.username,
    alias: row.alias ?? null,
    alias2: row.alias2 ?? null,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
    joinedAt: row.created_at,
    premium: Boolean(row.premium),
    isAdmin: Boolean(row.is_admin),
    isOwner: Boolean(row.is_owner),
    /** True once a Discord account is attached (sign-up or linked later). */
    discordLinked: Boolean(row.discord_id),
    /** The signed-in owner's Discord id. Never part of the public payload. */
    discordId: row.discord_id ?? null,
  };
}

/**
 * Sequential account number (#1, #2, …) from sign-up order, used on the
 * profile card. Cheap enough to attach to the one user a request needs.
 */
async function withUid(row) {
  if (!row) return row;
  try {
    const { rows } = await pool.query(
      "select count(*)::int as uid from users where created_at <= $1",
      [row.created_at],
    );
    return { ...row, uid: rows[0]?.uid ?? 1 };
  } catch {
    return row;
  }
}

async function userById(id) {
  const { rows } = await pool.query("select * from users where id = $1", [id]);
  return withUid(rows[0] ?? null);
}

/* Verifies the JWT *and* the account's token_version, so signing out other
   devices (or a password change) invalidates old cookies immediately instead
   of leaving a stolen 30-day token usable. */
async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Sign in first." });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Your session expired — sign in again." });
  }
  try {
    const user = await userById(payload.sub);
    if (!user || user.token_version !== payload.v) {
      clearSession(res);
      return res.status(401).json({ error: "Your session expired — sign in again." });
    }
    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Couldn't verify your session. Try again." });
  }
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

/* The public shape of an account — never includes email, password, MFA or
   Discord ids. Used by every profile page read. */
function publicAccountOf(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid ?? null,
    username: row.username,
    alias: row.alias ?? null,
    alias2: row.alias2 ?? null,
    avatarUrl: row.avatar_url ?? null,
    joinedAt: row.created_at,
    premium: Boolean(row.premium),
    isAdmin: Boolean(row.is_admin),
    isOwner: Boolean(row.is_owner),
  };
}

async function userByHandle(handle) {
  const clean = cleanHandle(handle);
  if (!clean) return null;
  const { rows } = await pool.query(
    `select * from users
     where lower(username) = $1 or lower(alias) = $1 or lower(alias2) = $1
     limit 1`,
    [clean],
  );
  return withUid(rows[0] ?? null);
}

async function profileRow(userId) {
  const { rows } = await pool.query("select data from profiles where user_id = $1", [userId]);
  return rows[0]?.data ?? null;
}

/* ── badges ────────────────────────────────────────────────────────────── */
/* Badges are earned, not picked: every one is derived from a fact the backend
   can check. The catalogue (names, art, requirement copy) lives in the
   frontend; this only decides which ids an account has actually earned. */

const guildMemberCache = new Map();

/** Is this Discord account in the site's Discord server? null = can't tell. */
async function discordGuildMember(discordId) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !discordId) return null;
  const cached = guildMemberCache.get(discordId);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.member;
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${encodeURIComponent(discordId)}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
    );
    if (res.status === 404) {
      guildMemberCache.set(discordId, { member: false, at: Date.now() });
      return false;
    }
    if (!res.ok) return null;
    guildMemberCache.set(discordId, { member: true, at: Date.now() });
    if (guildMemberCache.size > 5_000) guildMemberCache.clear();
    return true;
  } catch {
    return null;
  }
}

async function earnedBadges(user, profile) {
  const earned = [];
  const created = new Date(user.created_at);
  const ageDays = (Date.now() - created.getTime()) / 86_400_000;
  let rank = 1;
  try {
    const { rows } = await pool.query(
      "select count(*)::int as n from users where created_at <= $1",
      [user.created_at],
    );
    rank = rows[0]?.n ?? 1;
  } catch {
    rank = 1;
  }
  const document = JSON.stringify(profile ?? {});
  const bio = typeof profile?.about?.bio === "string" ? profile.about.bio.trim() : "";

  if (user.is_owner) earned.push("owner");
  if (user.is_admin) earned.push("staff");
  if (user.premium) earned.push("premium");
  if (ageDays < 7) earned.push("newbie");
  if (ageDays >= 30 && bio.length >= 20) earned.push("user");
  if (/github/i.test(document)) earned.push("coder");

  const month = created.getUTCMonth();
  const year = created.getUTCFullYear();
  if (year === 2026 && month === 9) earned.push("halloween_2026");
  if (year === 2026 && month === 11) earned.push("christmas_2026");

  if ((await discordGuildMember(user.discord_id)) === true) earned.push("dc_indiscord");

  // Badges an admin granted by hand sit alongside the earned ones.
  const granted = Array.isArray(user.badges) ? user.badges : [];
  for (const id of granted) {
    if (typeof id === "string" && !earned.includes(id)) earned.push(id);
  }

  return earned;
}

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

/* ── site settings & invite codes ─────────────────────────────────────── */

const REGISTRATION_MODES = new Set(["open", "invite", "closed"]);

async function readSetting(key, fallback) {
  const { rows } = await pool.query("select value from site_settings where key = $1", [key]);
  return rows[0]?.value ?? fallback;
}

async function writeSetting(key, value) {
  await pool.query(
    `insert into site_settings (key, value, updated_at) values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, String(value)],
  );
}

/** open = anyone with Discord, invite = code required, closed = no new accounts. */
async function registrationMode() {
  const value = await readSetting("registration_mode", "open");
  return REGISTRATION_MODES.has(value) ? value : "open";
}

const cleanInviteCode = (input) =>
  String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 40);

function newInviteCode() {
  return `TOURN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function usableInvite(code) {
  const clean = cleanInviteCode(code);
  if (!clean) return null;
  const { rows } = await pool.query(
    `select * from invite_codes
     where code = $1 and not revoked
       and (expires_at is null or expires_at > now())
       and uses < max_uses`,
    [clean],
  );
  return rows[0] ?? null;
}

function inviteOf(row) {
  if (!row) return null;
  return {
    code: row.code,
    premium: Boolean(row.premium),
    maxUses: row.max_uses,
    uses: row.uses,
    note: row.note ?? null,
    revoked: Boolean(row.revoked),
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
    creator: row.creator ?? null,
  };
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

/* In-memory limits: the API runs as one Railway instance. They blunt password
   guessing, sign-up spam and checkout abuse without a Redis dependency. */
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10_000) hits.clear();
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    return next();
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 40,
  message: "Too many sign-in attempts — wait a few minutes and try again.",
});
const billingLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 20,
  message: "Too many billing attempts — wait a few minutes and try again.",
});

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());
/* Security headers for every API response. There is no HTML served from the
   API routes, so these stay conservative and never break the JSON clients. */
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set("Cross-Origin-Opener-Policy", "same-origin");
  if (secureCookie) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server requests and same-origin reads send no Origin header.
      if (!origin || FRONTEND_ORIGINS.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);

/* Cookie-authenticated writes must come from one of the site's own origins.
   Browsers always send Origin on cross-site POST/PATCH, so a request forged by
   another site is rejected before it reaches a handler. Requests with no
   Origin (Stripe's webhook, curl) are allowed through and still need a valid
   session or signature. */
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin || FRONTEND_ORIGINS.has(origin)) return next();
  return res.status(403).json({ error: "Cross-origin request blocked." });
});

/* Signed-in responses and billing must never sit in a shared cache. */
app.use(["/api/auth", "/api/billing"], (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

/* ── profile documents ─────────────────────────────────────────────────── */
/* A saved profile carries the bio, links, badges and widget stack — including
   uploaded art as data URLs — so this single route gets a larger JSON body.
   It is registered before the global parser, which stays tight for the rest
   of the API. */
/* Public profile pages are read far more than they are written, and each read
   costs a handle lookup, a document read and a badge query. A short in-memory
   cache keeps repeat visits off the database without making saves look stale. */
const profilePageCache = new Map();
const PROFILE_PAGE_TTL = 20_000;

app.put("/api/profile", express.json({ limit: "8mb" }), requireAuth, async (req, res) => {
  try {
    if (req.body?.accountId && String(req.body.accountId) !== String(req.auth.sub)) {
      return res.status(409).json({ error: "Your account changed. Switch back to publish this draft." });
    }
    const data = req.body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({ error: "Send the profile document as { data }." });
    }
    const serialized = JSON.stringify(data);
    if (serialized.length > 7_500_000) {
      return res.status(413).json({ error: "That profile is too large — remove a big upload." });
    }
    await pool.query(
      `insert into profiles (user_id, data, updated_at) values ($1, $2::jsonb, now())
       on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
      [req.auth.sub, serialized],
    );
    profilePageCache.clear();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── billing (Stripe) ──────────────────────────────────────────────────── */
/* Checkout is created here, never in the browser: the price comes from
   STRIPE_PRICE_ID and Premium is only switched on by a signed webhook. */

const STRIPE_READY = Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_ID);

function requireStripe(res) {
  if (STRIPE_READY && stripe) return true;
  res.status(503).json({
    error: "Checkout isn't configured yet — add STRIPE_SECRET_KEY, STRIPE_PRICE_ID and STRIPE_WEBHOOK_SECRET to the backend.",
  });
  return false;
}

/** Applies a subscription state to the account that owns it. */
async function applySubscription({ userId, customerId, subscriptionId, active }) {
  if (userId) {
    await pool.query(
      `update users set premium = $2,
         stripe_customer_id = coalesce($3, stripe_customer_id),
         stripe_subscription_id = coalesce($4, stripe_subscription_id)
       where id = $1`,
      [userId, active, customerId ?? null, subscriptionId ?? null],
    );
    return;
  }
  if (customerId) {
    await pool.query(
      `update users set premium = $2,
         stripe_subscription_id = coalesce($3, stripe_subscription_id)
       where stripe_customer_id = $1`,
      [customerId, active, subscriptionId ?? null],
    );
  }
}

app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Billing webhook isn't configured." });
  }
  const signature = req.get("stripe-signature");
  if (!signature) return res.status(400).json({ error: "Missing Stripe signature." });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: "Invalid Stripe signature." });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId || null;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        await applySubscription({
          userId,
          customerId,
          subscriptionId: subscription.id,
          active: ["active", "trialing"].includes(subscription.status),
        });
      } else if (userId) {
        await applySubscription({
          userId,
          customerId,
          active: session.payment_status === "paid",
        });
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object;
      await applySubscription({
        userId: subscription.metadata?.userId || null,
        customerId: typeof subscription.customer === "string" ? subscription.customer : null,
        subscriptionId: subscription.id,
        active: ["active", "trialing"].includes(subscription.status),
      });
    }
    res.json({ received: true });
  } catch (error) {
    console.error("[billing] webhook failed:", error.message);
    res.status(500).json({ error: "Webhook processing failed." });
  }
});

app.post("/api/billing/checkout", billingLimiter, requireAuth, async (req, res) => {
  if (!requireStripe(res)) return;
  try {
    const { rows } = await pool.query(
      "select id, email, username, premium, stripe_customer_id from users where id = $1",
      [req.auth.sub],
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Sign in first." });
    if (user.premium) return res.status(409).json({ error: "Premium is already active on this account." });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.username,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await pool.query("update users set stripe_customer_id = $2 where id = $1", [
        user.id,
        customerId,
      ]);
    }

    const origin = returnOriginFromReferer(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
      success_url: `${origin}/premium?checkout=success`,
      cancel_url: `${origin}/premium?checkout=cancelled`,
    });
    if (!session.url) return res.status(502).json({ error: "Stripe didn't return a checkout link." });
    res.json({ url: session.url });
  } catch (error) {
    console.error("[billing] checkout failed:", error.message);
    res.status(502).json({ error: "Couldn't open checkout — try again in a moment." });
  }
});

app.post("/api/billing/portal", billingLimiter, requireAuth, async (req, res) => {
  if (!requireStripe(res)) return;
  try {
    const { rows } = await pool.query(
      "select stripe_customer_id from users where id = $1",
      [req.auth.sub],
    );
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: "No billing profile on this account yet." });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnOriginFromReferer(req)}/premium`,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("[billing] portal failed:", error.message);
    res.status(502).json({ error: "Couldn't open the billing portal — try again in a moment." });
  }
});

app.use(express.json({ limit: "256kb" }));

/* ── runtime public env (the only config the static site needs) ────────── */

app.get("/env.js", (_req, res) => {
  res.set("Content-Type", "application/javascript; charset=utf-8");
  res.set("Cache-Control", "no-store, max-age=0");
  res.send(
    `window.__ENV__ = ${JSON.stringify({
      // Empty = same origin. The site proxies /api/* through its own host, so
      // the API domain never shows up in markup or requests. /env.js itself is
      // a static public file in the site build; this route is the fallback.
      // Nothing else belongs here: OAuth ids, keys and the owner email are
      // server-side only, and the browser never needs them.
      VITE_API_BASE_URL: "",
    })};`,
  );
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ── widget data proxies ────────────────────────────────────────────────
   Roblox and Steam send no CORS headers, so the browser can never call them
   directly. These two routes are deliberately narrow: GET only, a fixed host
   allowlist, a browser-like user agent and a short public cache. */

const WIDGET_PROXY_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const ROBLOX_HOSTS = new Set([
  "users.roblox.com",
  "thumbnails.roblox.com",
  "friends.roblox.com",
  "apis.roblox.com",
]);

app.get("/api/roblox", async (req, res) => {
  let target;
  try {
    target = new URL(String(req.query.url ?? ""));
  } catch {
    return res.status(400).json({ error: "Missing url" });
  }
  if (target.protocol !== "https:" || !ROBLOX_HOSTS.has(target.hostname)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const upstream = await fetch(target, {
      headers: { accept: "application/json", "accept-language": "en-US,en;q=0.9", "user-agent": WIDGET_PROXY_UA },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Cache-Control", "public, max-age=60");
    res.send(body);
  } catch (error) {
    console.warn("[roblox-proxy]", error?.message ?? error);
    res.status(502).json({ error: "Roblox proxy error" });
  }
});

app.get("/api/steam-profile", async (req, res) => {
  let target;
  try {
    target = new URL(String(req.query.url ?? ""));
  } catch {
    return res.status(400).send("Missing url");
  }
  if (target.protocol !== "https:" || !/(^|\.)steamcommunity\.com$/i.test(target.hostname)) {
    return res.status(403).send("Forbidden");
  }
  try {
    const upstream = await fetch(target, {
      headers: {
        "user-agent": WIDGET_PROXY_UA,
        accept: "text/xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.set("Content-Type", "text/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=120");
    res.send(body);
  } catch (error) {
    console.warn("[steam-proxy]", error?.message ?? error);
    res.status(502).send("Steam proxy error");
  }
});

/* Public site config — the sign-up dialog reads this before it opens Discord. */
app.get("/api/site/config", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({ registration: await registrationMode(), discordOnly: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.post("/api/auth/login", authLimiter, async (req, res) => {
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

/* Email + password sign-up. Discord used to be the only door in, so a broken
   Discord handshake meant nobody could create an account at all. */
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const inviteCode = cleanInviteCode(req.body?.invite);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Use a password with at least 8 characters." });
    }
    const existing = await pool.query("select id from users where email = $1", [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "An account with that email already exists — sign in instead." });
    }

    const first = await pool.query("select count(*)::int as count from users");
    const isFirst = first.rows[0].count === 0;
    let invite = null;
    if (!isFirst) {
      const mode = await registrationMode();
      if (mode === "closed") {
        return res.status(403).json({ error: "New accounts are closed right now." });
      }
      if (mode === "invite") {
        invite = await usableInvite(inviteCode);
        if (!invite) {
          return res.status(403).json({ error: "That invite code isn't valid or has already been used." });
        }
      }
    }

    const username = await uniqueUsername(email.split("@")[0]);
    const hash = await bcrypt.hash(password, 12);
    const ownerEmail = OWNER_EMAIL_ADDRESS;
    const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
    const isOwner = Boolean(ownerEmail && email === ownerEmail);
    const isAdmin = Boolean((adminEmail && email === adminEmail) || isOwner);

    const inserted = await pool.query(
      `insert into users (username, email, password_hash, is_owner, is_admin, premium)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [
        username,
        email,
        hash,
        isOwner || isFirst,
        isAdmin || isFirst,
        Boolean(invite?.premium),
      ],
    );
    if (invite) {
      await pool.query("update invite_codes set uses = uses + 1 where code = $1", [invite.code]);
    }

    const user = await withUid(inserted.rows[0]);
    setSession(res, user);
    res.json({ account: accountOf(user) });
  } catch (error) {
    console.error("[register]", error?.message ?? error);
    res.status(500).json({ error: "Couldn't create the account. Try again in a moment." });
  }
});

/* Trades the OAuth handoff ticket for a session cookie on the site's own
   origin (the callback ran on the API host, so its cookie never reached it). */
/** A device-local pass that can re-establish this session later. */
function switchTicket(user) {
  return jwt.sign({ sub: user.id, v: user.token_version, account: true }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

/* Issued to the signed-in account so this device can list and switch back to
   it without asking for a password again. */
app.post("/api/auth/ticket", requireAuth, async (req, res) => {
  try {
    const user = await userById(req.auth.sub);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    res.json({ ticket: switchTicket(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Swaps the session cookie for a stored account pass. */
app.post("/api/auth/switch", async (req, res) => {
  try {
    const ticket = String(req.body?.ticket ?? "");
    if (!ticket) return res.status(400).json({ error: "Pick an account first." });
    const payload = jwt.verify(ticket, JWT_SECRET);
    if (!payload?.account) {
      return res.status(401).json({ error: "That account link expired — sign in again." });
    }
    const user = await userById(payload.sub);
    if (!user || user.token_version !== payload.v) {
      return res.status(401).json({ error: "That account link expired — sign in again." });
    }
    setSession(res, user);
    res.json({ account: accountOf(user) });
  } catch {
    res.status(401).json({ error: "That account link expired — sign in again." });
  }
});

app.post("/api/auth/session", async (req, res) => {
  try {
    const ticket = String(req.body?.ticket ?? "");
    if (!ticket) return res.status(400).json({ error: "That sign-in link is incomplete — try again." });
    const payload = jwt.verify(ticket, JWT_SECRET);
    if (!payload?.login) {
      return res.status(401).json({ error: "That sign-in link expired — press Continue with Discord again." });
    }
    const user = await userById(payload.sub);
    if (!user || user.token_version !== payload.v) {
      return res.status(401).json({ error: "That sign-in link expired — press Continue with Discord again." });
    }
    setSession(res, user);
    res.json({ account: accountOf(user) });
  } catch {
    res.status(401).json({ error: "That sign-in link expired — press Continue with Discord again." });
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

/* Discord OAuth — THE sign-up path.
   `state` is signed with JWT_SECRET and carries the site to return to, so the
   flow needs no cookie and survives the site/API domain split. */
/** One-time handoff for a completed OAuth sign-in (2 minutes, session shape). */
function loginTicket(user) {
  return jwt.sign({ sub: user.id, v: user.token_version, login: true }, JWT_SECRET, {
    expiresIn: "2m",
  });
}

function signOAuthState(returnOrigin, invite = "", linkUserId = null) {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(12).toString("hex"),
      returnOrigin,
      invite: cleanInviteCode(invite) || null,
      // Set when an already signed-in account is attaching Discord to itself.
      linkUserId: linkUserId || null,
      issuedAt: Date.now(),
    }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readOAuthState(state) {
  const [payload, signature] = String(state ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.issuedAt !== "number" || Date.now() - data.issuedAt > 10 * 60 * 1000) {
      return null;
    }
    if (typeof data?.returnOrigin !== "string" || !FRONTEND_ORIGINS.has(data.returnOrigin)) {
      return null;
    }
    return {
      returnOrigin: data.returnOrigin,
      invite: cleanInviteCode(data.invite) || null,
      linkUserId: typeof data.linkUserId === "string" ? data.linkUserId : null,
    };
  } catch {
    return null;
  }
}

app.get("/api/auth/discord", (req, res) => {
  const returnOrigin = returnOriginFromReferer(req);
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET_KEY) {
    console.error(
      "[discord oauth] not configured — set VITE_DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET in Railway",
    );
    if (wantsJson(req)) {
      return res.status(503).json({ error: "Discord sign-in isn't configured yet." });
    }
    return res.redirect(`${returnOrigin}/#/?error=oauth_config`);
  }
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state: signOAuthState(returnOrigin, req.query?.invite),
    prompt: "consent",
  });
  const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
  // The site asks for this URL and navigates to Discord itself, so visitors
  // never land on the Railway API host.
  if (wantsJson(req)) return res.json({ url });
  res.redirect(url);
});

/* Attach Discord to an account that is already signed in — the email/password
   path. The signed state carries the user id, so the callback links instead of
   creating a second account. */
app.get("/api/auth/discord/link", requireAuth, (req, res) => {
  const returnOrigin = returnOriginFromReferer(req);
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET_KEY) {
    console.error("[discord link] not configured — set VITE_DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET");
    return res.status(503).json({ error: "Discord linking isn't configured yet." });
  }
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state: signOAuthState(returnOrigin, "", req.auth.sub),
    prompt: "consent",
  });
  res.json({ url: `https://discord.com/oauth2/authorize?${params.toString()}` });
});

/** Discord's own error code, so the site can explain the real cause. */
function discordErrorCode(body) {
  try {
    return String(JSON.parse(body)?.error ?? "unknown");
  } catch {
    return "unknown";
  }
}

async function exchangeDiscordCode(code) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET_KEY,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    const text = await response.text();
    if (response.ok) {
      try {
        return { ok: true, token: JSON.parse(text) };
      } catch {
        return { ok: false, status: response.status, text: "unreadable token response" };
      }
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 1) {
      return { ok: false, status: response.status, text };
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  return { ok: false, status: 0, text: "" };
}

app.get("/api/auth/discord/callback", async (req, res) => {
  try {
    const code = String(req.query?.code ?? "");
    const state = readOAuthState(req.query?.state);
    if (!code || !state) {
      return res.redirect(`${CANONICAL_FRONTEND_ORIGIN}/#/?error=oauth_state`);
    }
    const returnOrigin = canonicalReturnOrigin(state.returnOrigin);

    const exchange = await exchangeDiscordCode(code);
    if (!exchange.ok) {
      // Discord names the cause (invalid_client, invalid_grant, redirect_uri
      // mismatch); log it and pass the code back so the dialog can say what to
      // fix instead of asking people to press the button again.
      console.error(
        `[discord token] ${exchange.status} ${exchange.text.slice(0, 400)} | redirect_uri=${DISCORD_REDIRECT_URI}`,
      );
      const reason = discordErrorCode(exchange.text);
      return res.redirect(
        `${returnOrigin}/#/?error=discord_token&detail=${encodeURIComponent(reason)}`,
      );
    }
    const token = exchange.token;

    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) return res.redirect(`${returnOrigin}/#/?error=discord_profile`);
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

    const ownerEmail = OWNER_EMAIL_ADDRESS;
    const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
    const isOwner = Boolean(ownerEmail && email && email === ownerEmail);
    const isAdmin = Boolean(
      (adminEmail && email && email === adminEmail) || isOwner,
    );

    // Linking flow: attach this Discord account to the signed-in user and stop
    // — no new account, no username collision, no invite check.
    if (state.linkUserId) {
      const target = await userById(state.linkUserId);
      if (!target) {
        return res.redirect(`${returnOrigin}/#/dashboard/settings?error=link_expired`);
      }
      const clash = await pool.query(
        "select id from users where discord_id = $1 and id <> $2",
        [discordId, target.id],
      );
      if (clash.rowCount > 0) {
        return res.redirect(`${returnOrigin}/#/dashboard/settings?error=discord_taken`);
      }
      const linked = await pool.query(
        `update users set discord_id = $1, avatar_url = coalesce($2, avatar_url),
           is_owner = is_owner or $3, is_admin = is_admin or $4
         where id = $5 returning *`,
        [discordId, avatar, isOwner, isAdmin, target.id],
      );
      setSession(res, linked.rows[0]);
      return res.redirect(
        `${returnOrigin}/#/dashboard/settings?linked=discord&login=${encodeURIComponent(loginTicket(linked.rows[0]))}`,
      );
    }

    if (user) {
      const updated = await pool.query(
        `update users set discord_id = $1, avatar_url = coalesce($2, avatar_url),
           is_owner = is_owner or $3, is_admin = is_admin or $4
         where id = $5 returning *`,
        [discordId, avatar, isOwner, isAdmin, user.id],
      );
      user = updated.rows[0];
    } else {
      const first = await pool.query("select count(*)::int as count from users");
      const isFirst = first.rows[0].count === 0;

      // Registration policy. The very first account always gets in, otherwise
      // nobody could ever configure the site.
      let invite = null;
      if (!isFirst) {
        const mode = await registrationMode();
        if (mode === "closed") {
          return res.redirect(`${returnOrigin}/#/?error=registration_closed`);
        }
        if (mode === "invite") {
          invite = await usableInvite(state.invite);
          if (!invite) {
            return res.redirect(`${returnOrigin}/#/?error=invite_required`);
          }
        }
      }

      const username = await uniqueUsername(displayName);
      const inserted = await pool.query(
        `insert into users (username, email, discord_id, avatar_url, is_owner, is_admin, premium)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [
          username,
          email,
          discordId,
          avatar,
          isOwner || isFirst,
          isAdmin || isFirst,
          Boolean(invite?.premium),
        ],
      );
      user = inserted.rows[0];
      if (invite) {
        await pool.query("update invite_codes set uses = uses + 1 where code = $1", [invite.code]);
      }
    }

    setSession(res, user);
    // The callback normally runs on the API host, where the cookie is useless
    // to the site; hand back a ticket the site trades for a first-party one.
    res.redirect(`${returnOrigin}/#/?login=${encodeURIComponent(loginTicket(user))}`);
  } catch (error) {
    console.error("[discord callback]", error);
    res.redirect(`${CANONICAL_FRONTEND_ORIGIN}/#/?error=oauth_failed`);
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

/* The signed-in account's own profile document (used to hydrate the
   dashboard on a new device). */
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const user = await userById(req.auth.sub);
    if (!user) return res.status(401).json({ error: "Sign in again." });
    const profile = await profileRow(user.id);
    res.set("Cache-Control", "no-store");
    res.json({
      account: publicAccountOf(user),
      profile: profile ?? null,
      earned: await earnedBadges(user, profile),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* The public page behind tourn.lol/<handle>. */
app.get("/api/profile/:handle", async (req, res) => {
  try {
    const key = String(req.params.handle ?? "").trim().toLowerCase();
    const cached = profilePageCache.get(key);
    if (cached && Date.now() - cached.at < PROFILE_PAGE_TTL) {
      res.set("Cache-Control", "public, max-age=30");
      return res.json(cached.body);
    }
    const user = await userByHandle(req.params.handle);
    if (!user) return res.status(404).json({ error: "No profile with that handle." });
    const profile = await profileRow(user.id);
    const body = {
      account: publicAccountOf(user),
      profile: profile ?? null,
      earned: await earnedBadges(user, profile),
    };
    if (profilePageCache.size > 500) profilePageCache.clear();
    profilePageCache.set(key, { at: Date.now(), body });
    res.set("Cache-Control", "public, max-age=30");
    res.json(body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stats", async (_req, res) => {
  const users = await pool.query("select count(*)::int as count from users");
  const views = await pool.query("select coalesce(sum(views), 0)::bigint as total from profile_views");
  res.json({ users: users.rows[0].count, views: Number(views.rows[0].total) });
});

/* Public leaderboard: top profiles by lifetime views. */
app.get("/api/leaderboard", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `select u.username, u.alias, u.avatar_url, coalesce(v.views, 0)::int as views
       from users u
       left join profile_views v on v.username = u.username
       order by views desc, u.created_at asc
       limit 25`,
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json({
      profiles: rows.map((row) => ({
        username: row.username,
        displayName: row.alias ?? null,
        avatarUrl: row.avatar_url ?? null,
        views: Number(row.views) || 0,
      })),
    });
  } catch {
    res.json({ profiles: [] });
  }
});

async function canonicalViewHandle(input) {
  const handle = cleanHandle(input);
  if (!handle) return null;
  const { rows } = await pool.query(
    "select username from users where lower(username) = $1 or lower(alias) = $1 or lower(alias2) = $1 limit 1", [handle],
  );
  return rows[0]?.username?.toLowerCase() || null;
}

app.get("/api/analytics", requireAuth, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    res.json(await profileAnalytics(pool, req.user.username.toLowerCase(), String(req.query.period || "7d")));
  } catch { res.status(503).json({ error: "Analytics could not be loaded. Please try again." }); }
});

app.get("/api/views/:username", async (req, res) => {
  try {
    const handle = await canonicalViewHandle(req.params.username);
    if (!handle) return res.status(404).json({ error: "Unknown handle." });
    const { rows } = await pool.query("select views from profile_views where username = $1", [handle]);
    res.set("Cache-Control", "no-store");
    res.json({ views: Number(rows[0]?.views) || 0 });
  } catch { res.status(503).json({ error: "Views could not be loaded." }); }
});

app.post("/api/views/:username", async (req, res) => {
  try {
    const handle = await canonicalViewHandle(req.params.username);
    if (!handle) return res.status(404).json({ error: "Unknown handle." });
    const views = await recordProfileVisit(pool, {
      handle,
      visitor: visitorHash(req.ip || "unknown", handle, JWT_SECRET),
      device: visitorDevice(req.get("user-agent")),
      source: visitorSource(req.body?.referrer, FRONTEND_URL),
    });
    res.json({ views });
  } catch { res.status(503).json({ error: "This visit could not be recorded. Please retry." }); }
});

const ADMIN_PROFILE_SELECT = `select u.id, u.username, u.alias, u.alias2, u.avatar_url,
       u.premium, u.is_admin, u.is_owner, coalesce(u.badges, '[]'::jsonb) as badges,
       u.created_at, coalesce(v.views, 0)::bigint as views
from users u
left join profile_views v on v.username = u.username`;

app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
  const [users, views, premium, admins, invites] = await Promise.all([
    pool.query("select count(*)::int as count from users"),
    pool.query("select coalesce(sum(views), 0)::bigint as total from profile_views"),
    pool.query("select count(*)::int as count from users where premium = true"),
    pool.query("select count(*)::int as count from users where is_admin = true"),
    pool.query(
      `select count(*)::int as active from invite_codes
       where not revoked and (expires_at is null or expires_at > now()) and uses < max_uses`,
    ),
  ]);
  res.json({
    users: users.rows[0].count,
    views: Number(views.rows[0].total),
    premium: premium.rows[0].count,
    admins: admins.rows[0].count,
    activeInvites: invites.rows[0].active,
  });
});

app.get("/api/admin/profiles", requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(`${ADMIN_PROFILE_SELECT} order by u.created_at desc limit 500`);
  res.json({ profiles: rows.map((row) => ({ ...row, views: Number(row.views) })) });
});

app.patch("/api/admin/profiles/:id", requireAdmin, async (req, res) => {
  try {
    const target = await pool.query("select id, username from users where id = $1", [req.params.id]);
    const account = target.rows[0];
    if (!account) return res.status(404).json({ error: "No such account." });

    const patch = {};
    if (typeof req.body?.premium === "boolean") patch.premium = req.body.premium;
    if (typeof req.body?.is_admin === "boolean") {
      if (req.body.is_admin === false && req.params.id === req.user.id) {
        return res.status(400).json({ error: "You can't remove your own admin flag." });
      }
      patch.is_admin = req.body.is_admin;
    }

    // Roles bundle the two flags so the console offers one control:
    // member < staff (admin) < owner (admin + owner).
    if (typeof req.body?.role === "string") {
      const role = req.body.role;
      if (!["member", "staff", "owner"].includes(role)) {
        return res.status(400).json({ error: "Unknown role." });
      }
      if (role !== "owner" && req.params.id === req.user.id) {
        return res.status(400).json({ error: "You can't demote your own account." });
      }
      if (role === "owner" && req.user.is_owner !== true) {
        return res.status(403).json({ error: "Only an owner can grant owner." });
      }
      patch.is_owner = role === "owner";
      patch.is_admin = role !== "member";
    }

    // Hand-granted badges: jsonb, merged into the earned list on read.
    if (Array.isArray(req.body?.badges)) {
      const ids = [...new Set(
        req.body.badges
          .map((value) => String(value))
          .filter((value) => /^[a-z0-9_]{2,32}$/.test(value)),
      )].slice(0, 40);
      patch.badges = JSON.stringify(ids);
    }

    // Handles are unique across username + both claims, so an admin edit is
    // validated exactly like a claim.
    for (const field of ["alias", "alias2"]) {
      if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, field)) continue;
      const clean = cleanHandle(req.body[field]);
      if (clean) {
        if (clean.length < 3) return res.status(400).json({ error: "Aliases need at least 3 characters." });
        if (clean.length > 24) return res.status(400).json({ error: "Aliases must be 24 characters or fewer." });
        if (RESERVED.has(clean)) return res.status(400).json({ error: `"${clean}" is reserved by the site.` });
        const taken = await pool.query(
          `select id from users where (username = $1 or alias = $1 or alias2 = $1) and id <> $2 limit 1`,
          [clean, account.id],
        );
        if (taken.rowCount > 0) return res.status(400).json({ error: `@${clean} is already claimed.` });
      }
      patch[field] = clean || null;
    }

    let views = null;
    if (req.body?.views !== undefined) {
      const parsed = Number(req.body.views);
      if (!Number.isFinite(parsed)) return res.status(400).json({ error: "Views must be a number." });
      views = Math.max(0, Math.trunc(parsed));
    }

    if (Object.keys(patch).length === 0 && views === null) {
      return res.status(400).json({ error: "Nothing to update." });
    }
    if (Object.keys(patch).length > 0) {
      const sets = Object.keys(patch).map((key, index) =>
        key === "badges" ? `${key} = $${index + 2}::jsonb` : `${key} = $${index + 2}`,
      );
      await pool.query(
        `update users set ${sets.join(", ")} where id = $1`,
        [account.id, ...Object.values(patch)],
      );
    }
    if (views !== null) {
      await pool.query(
        `insert into profile_views (username, views) values ($1, $2)
         on conflict (username) do update set views = excluded.views`,
        [account.username, views],
      );
    }

    const { rows } = await pool.query(`${ADMIN_PROFILE_SELECT} where u.id = $1`, [account.id]);
    res.json({ profile: { ...rows[0], views: Number(rows[0].views) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── admin: site settings ──────────────────────────────────────────────── */

app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
  res.json({ settings: { registration: await registrationMode() } });
});

app.patch("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    if (req.body?.registration !== undefined) {
      const mode = String(req.body.registration);
      if (!REGISTRATION_MODES.has(mode)) {
        return res.status(400).json({ error: "Unknown registration mode." });
      }
      await writeSetting("registration_mode", mode);
    }
    res.json({ settings: { registration: await registrationMode() } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── admin: invite codes ───────────────────────────────────────────────── */

app.get("/api/admin/invites", requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `select i.*, u.username as creator
     from invite_codes i left join users u on u.id = i.created_by
     order by i.created_at desc limit 300`,
  );
  res.json({ invites: rows.map(inviteOf) });
});

app.post("/api/admin/invites", requireAdmin, async (req, res) => {
  try {
    const count = Math.min(100, Math.max(1, Math.trunc(Number(req.body?.count) || 1)));
    const maxUses = Math.min(10_000, Math.max(1, Math.trunc(Number(req.body?.maxUses) || 1)));
    const premium = Boolean(req.body?.premium);
    const note = String(req.body?.note ?? "").trim().slice(0, 80) || null;
    const days = Number(req.body?.expiresInDays);
    const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86_400_000) : null;

    const created = [];
    for (let index = 0; index < count; index += 1) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = newInviteCode();
        try {
          const { rows } = await pool.query(
            `insert into invite_codes (code, created_by, premium, max_uses, note, expires_at)
             values ($1, $2, $3, $4, $5, $6) returning *`,
            [code, req.user.id, premium, maxUses, note, expiresAt],
          );
          created.push(inviteOf(rows[0]));
          break;
        } catch (error) {
          if (error.code !== "23505") throw error;
        }
      }
    }
    res.status(201).json({ invites: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/admin/invites/:code", requireAdmin, async (req, res) => {
  try {
    const code = cleanInviteCode(req.params.code);
    const revoked = Boolean(req.body?.revoked);
    const { rows } = await pool.query(
      `update invite_codes set revoked = $2 where code = $1 returning *`,
      [code, revoked],
    );
    if (!rows[0]) return res.status(404).json({ error: "No such invite code." });
    res.json({ invite: inviteOf(rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── admin: Discord bot ────────────────────────────────────────────────── */

async function discordBot() {
  if (!DISCORD_BOT_TOKEN) return null;
  try {
    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!meRes.ok) return null;
    const me = await meRes.json();
    return {
      id: String(me.id),
      username: me.username,
      avatar: me.avatar
        ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
        : null,
    };
  } catch {
    return null;
  }
}

app.get("/api/admin/bot", requireAdmin, async (_req, res) => {
  const [bot, pending, guild] = await Promise.all([
    discordBot(),
    pool.query(
      `select count(*)::int as count from verification_codes
       where used = false and expires_at > now()`,
    ),
    (async () => {
      if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) return null;
      try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        });
        if (!response.ok) return null;
        const data = await response.json();
        return {
          id: String(data.id),
          name: data.name,
          icon: data.icon
            ? `https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png?size=64`
            : null,
        };
      } catch {
        return null;
      }
    })(),
  ]);

  res.json({
    configured: Boolean(DISCORD_BOT_TOKEN),
    tokenValid: Boolean(bot),
    bot,
    guildId: DISCORD_GUILD_ID || null,
    guild,
    pendingCodes: pending.rows[0].count,
    inviteUrl: VITE_DISCORD_CLIENT_ID
      ? `https://discord.com/oauth2/authorize?client_id=${VITE_DISCORD_CLIENT_ID}&scope=bot%20applications.commands&permissions=2048`
      : null,
  });
});

app.post("/api/admin/bot/test-dm", requireAdmin, async (req, res) => {
  try {
    const discordId = String(req.body?.discordId ?? "").trim();
    if (!/^\d{16,20}$/.test(discordId)) {
      return res.status(400).json({ error: "Enter a Discord user ID (17–20 digits)." });
    }
    if (!DISCORD_BOT_TOKEN) {
      return res.status(400).json({ error: "No DISCORD_BOT_TOKEN is set on the backend." });
    }
    const message =
      String(req.body?.message ?? "").trim().slice(0, 500) ||
      "tourn.lol bot check — DMs are working.";
    const sent = await sendDiscordDm(discordId, message);
    if (!sent) {
      return res.status(502).json({
        error: "Discord rejected the DM. The bot must share a server with that user.",
      });
    }
    res.json({ ok: true });
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
      console.log(
        `[tourn] frontend: ${[...FRONTEND_ORIGINS].join(", ")} · backend: ${BACKEND_URL}`,
      );
    });
  })
  .catch((error) => {
    console.error("[tourn] database init failed:", error.message);
    process.exit(1);
  });
