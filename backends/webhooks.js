import dns from "node:dns/promises";
import net from "node:net";
import express from "express";

export const PROFILE_WEBHOOK_SCHEMA = `
create table if not exists profile_webhooks (
  user_id uuid primary key references users(id) on delete cascade,
  url text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_status integer,
  last_error text,
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table profile_webhooks add column if not exists config jsonb not null default '{}'::jsonb;
`;

const MAX_URL_LENGTH = 2048;
const DELIVERY_TIMEOUT_MS = 8_000;

function privateIp(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }
  return true;
}

export function normalizeWebhookUrl(input, { allowHttp = false } = {}) {
  const raw = String(input ?? "").trim();
  if (!raw) throw new Error("Enter a webhook endpoint URL.");
  if (raw.length > MAX_URL_LENGTH) throw new Error("That webhook URL is too long.");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a complete webhook URL, including https://.");
  }
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new Error("Webhook endpoints must use HTTPS.");
  }
  if (url.username || url.password) throw new Error("Webhook URLs cannot contain credentials.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    (net.isIP(hostname) && privateIp(hostname))
  ) {
    throw new Error("That webhook host is not reachable from the public internet.");
  }
  url.hash = "";
  return url.toString();
}

async function assertPublicEndpoint(url) {
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("The webhook host could not be resolved.");
  if (addresses.some((entry) => privateIp(entry.address))) {
    throw new Error("The webhook host resolves to a private address.");
  }
}

export const DEFAULT_WEBHOOK_CONFIG = {
  format: "discord",
  username: "",
  avatarUrl: "",
  content: "",
  embed: true,
  title: "",
  description: "",
  color: "#5865f2",
  image: "background",
  thumbnail: "avatar",
  footer: "",
  footerIcon: "avatar",
  timestamp: true,
  fields: true,
  buttons: [],
};

const WEBHOOK_IMAGES = new Set(["background", "banner", "avatar", "share", "none"]);
const WEBHOOK_THUMBS = new Set(["avatar", "share", "favicon", "none"]);
const WEBHOOK_FOOTER_ICONS = new Set(["avatar", "logo", "none"]);

const cleanText = (value, max) => String(value ?? "").trim().slice(0, max);
const webUrl = (value, max = 2048) => {
  const text = cleanText(value, max);
  return /^https?:\/\//i.test(text) ? text : "";
};
const hexColour = (value) => (/^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? String(value) : DEFAULT_WEBHOOK_CONFIG.color);

/** The public, validated shape stored for a webhook endpoint. */
export function normalizeWebhookConfig(input, url = "") {
  const raw = input && typeof input === "object" ? input : {};
  let inferred = "discord";
  if (url) {
    try {
      inferred = /(^|\.)discord(?:app)?\.com$/i.test(new URL(url).hostname) ? "discord" : "raw";
    } catch {
      inferred = "raw";
    }
  }
  const format = raw.format === "raw" || raw.format === "discord" ? raw.format : inferred;
  const buttons = Array.isArray(raw.buttons)
    ? raw.buttons
        .map((button) => ({
          label: cleanText(button?.label, 80),
          url: webUrl(button?.url, 512),
        }))
        .filter((button) => button.label && button.url)
        .slice(0, 5)
    : [];
  return {
    format,
    username: cleanText(raw.username, 80),
    avatarUrl: webUrl(raw.avatarUrl),
    content: cleanText(raw.content, 2000),
    embed: raw.embed !== false,
    title: cleanText(raw.title, 256),
    description: cleanText(raw.description, 2000),
    color: hexColour(raw.color),
    image: WEBHOOK_IMAGES.has(raw.image) ? raw.image : DEFAULT_WEBHOOK_CONFIG.image,
    thumbnail: WEBHOOK_THUMBS.has(raw.thumbnail) ? raw.thumbnail : DEFAULT_WEBHOOK_CONFIG.thumbnail,
    footer: cleanText(raw.footer, 2048),
    footerIcon: WEBHOOK_FOOTER_ICONS.has(raw.footerIcon) ? raw.footerIcon : DEFAULT_WEBHOOK_CONFIG.footerIcon,
    timestamp: raw.timestamp !== false,
    fields: raw.fields !== false,
    buttons,
  };
}

function publicConfig(row) {
  if (!row) return null;
  return {
    url: row.url,
    enabled: row.enabled !== false,
    config: normalizeWebhookConfig(row.config, row.url),
    lastStatus: row.last_status == null ? null : Number(row.last_status),
    lastError: row.last_error ?? null,
    lastSentAt: row.last_sent_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function publicImage(value, siteUrl = "") {
  const text = String(value ?? "").trim();
  if (/^https?:\/\//i.test(text)) return text;
  return siteUrl && text.startsWith("/") ? `${siteUrl}${text}` : "";
}

function pickImage(kind, { about, account, siteUrl }) {
  if (kind === "background") return publicImage(about.assets?.background?.imageUrl, siteUrl);
  if (kind === "banner") return publicImage(about.assets?.banner?.imageUrl, siteUrl);
  if (kind === "avatar") return publicImage(about.assets?.avatarUrl, siteUrl) || publicImage(account.avatarUrl, siteUrl);
  if (kind === "share") return publicImage(about.metadata?.shareImageUrl, siteUrl);
  if (kind === "favicon") return publicImage(about.metadata?.faviconUrl, siteUrl) || publicImage(about.assets?.avatarUrl, siteUrl) || publicImage(account.avatarUrl, siteUrl);
  return "";
}

function discordColour(hex) {
  return Number.parseInt(String(hex).replace("#", ""), 16);
}

function buildDiscordPayload({ account, profile, config, siteUrl, revision }) {
  const about = profile?.about ?? {};
  const metadata = about.metadata ?? {};
  const handle = account.alias?.trim() || account.username;
  const pageUrl = `${siteUrl}/${encodeURIComponent(handle)}`;
  const name = String(about.displayName ?? "").trim() || account.alias?.trim() || account.username;
  const image = pickImage(config.image, { about, account, siteUrl });
  const thumb = pickImage(config.thumbnail, { about, account, siteUrl });
  const footerIcon =
    config.footerIcon === "logo"
      ? `${siteUrl}/logo.png`
      : config.footerIcon === "avatar"
        ? publicImage(account.avatarUrl, siteUrl)
        : "";
  const buttons = config.buttons.map((button) => ({
    type: 2,
    style: 5,
    label: button.label,
    url: button.url,
  }));
  const embed = {
    title: config.title || name,
    description: config.description || String(about.bio ?? "").trim() || `Check out ${name} on tourn.lol.`,
    url: pageUrl,
    color: discordColour(config.color),
    ...(image ? { image: { url: image } } : {}),
    ...(thumb ? { thumbnail: { url: thumb } } : {}),
    ...(config.fields
      ? {
          fields: [
            { name: "Profile", value: `[tourn.lol/${handle}](${pageUrl})`, inline: true },
            { name: "Member since", value: account.joinedAt ? new Date(account.joinedAt).toLocaleDateString("en-US") : "Unknown", inline: true },
            ...(revision != null ? [{ name: "Revision", value: String(revision), inline: true }] : []),
          ],
        }
      : {}),
    ...(config.footer || config.timestamp
      ? {
          footer: { text: config.footer || "tourn.lol", ...(footerIcon ? { icon_url: footerIcon } : {}) },
          ...(config.timestamp ? { timestamp: new Date().toISOString() } : {}),
        }
      : {}),
  };
  const payload = {
    allowed_mentions: { parse: [] },
    ...(config.username ? { username: config.username } : {}),
    ...(config.avatarUrl ? { avatar_url: config.avatarUrl } : {}),
    ...(config.content ? { content: config.content } : {}),
    ...(config.embed ? { embeds: [embed] } : {}),
    ...(buttons.length ? { components: [{ type: 1, components: buttons }] } : {}),
  };
  if (!config.embed && !config.content) payload.content = `Check out ${name}: ${pageUrl}`;
  return payload;
}

export function createProfileWebhooks({ pool, fetchImpl = fetch, allowHttp = false, onDelivered, siteUrl = process.env.FRONTEND_URL || "https://tourn.lol" } = {}) {
  const webSite = String(siteUrl).replace(/\/+$/, "");
  const load = async (userId) => {
    const { rows } = await pool.query("select * from profile_webhooks where user_id = $1", [userId]);
    return rows[0] ?? null;
  };

  const account = async (userId) => {
    const { rows } = await pool.query(
      `select id, username, alias, alias2, avatar_url, premium, created_at
       from users where id = $1`,
      [userId],
    );
    if (!rows[0]) throw new Error("Account not found.");
    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      alias: row.alias ?? null,
      alias2: row.alias2 ?? null,
      avatarUrl: row.avatar_url ?? null,
      premium: Boolean(row.premium),
      joinedAt: row.created_at ?? null,
    };
  };

  const profile = async (userId) => {
    const { rows } = await pool.query("select data, revision, updated_at from profiles where user_id = $1", [userId]);
    const row = rows[0];
    return row
      ? { profile: row.data ?? {}, revision: Number(row.revision) || 0, updatedAt: row.updated_at ?? null }
      : { profile: {}, revision: 0, updatedAt: null };
  };

  const deliver = async (userId, { event = "profile.updated", profile: document, revision, updatedAt, force = false } = {}) => {
    const row = await load(userId);
    if (!row) return { delivered: false, error: "No webhook is configured for this account." };
    if (row.enabled === false && !force) return { delivered: false, skipped: true };
    const url = normalizeWebhookUrl(row.url, { allowHttp });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      await assertPublicEndpoint(new URL(url));
      const config = normalizeWebhookConfig(row.config, url);
      const accountData = await account(userId);
      const profileData = document ?? (await profile(userId)).profile;
      const body = JSON.stringify(
        config.format === "discord"
          ? buildDiscordPayload({ account: accountData, profile: profileData, config, siteUrl: webSite, revision })
          : {
              event,
              sentAt: new Date().toISOString(),
              account: accountData,
              revision: revision ?? null,
              updatedAt: updatedAt ?? null,
              profile: profileData,
              settings: document ?? null,
            },
      );
      const response = await fetchImpl(url, {
        method: "POST",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "user-agent": "tourn-webhook/1.0",
          "x-tourn-event": event,
        },
        body,
      });
      const ok = response.status >= 200 && response.status < 300;
      const error = ok ? null : `Endpoint returned HTTP ${response.status}.`;
      await pool.query(
        `update profile_webhooks set last_status = $2, last_error = $3, last_sent_at = now()
         where user_id = $1`,
        [userId, response.status, error],
      );
      if (ok) await onDelivered?.(userId, document);
      return { delivered: ok, status: response.status, error };
    } catch (error) {
      const message = error?.name === "AbortError" ? "The endpoint timed out." : error?.message || "Delivery failed.";
      await pool.query(
        `update profile_webhooks set last_status = null, last_error = $2, last_sent_at = now()
         where user_id = $1`,
        [userId, message],
      ).catch(() => {});
      return { delivered: false, error: message };
    } finally {
      clearTimeout(timeout);
    }
  };

  return { load, account, profile, deliver };
}

export function registerProfileWebhookRoutes(app, { pool, requireAuth, limiter, allowHttp = false }) {
  const webhooks = createProfileWebhooks({ pool, allowHttp });

  app.get("/api/settings/webhook", requireAuth, async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      res.json({ webhook: publicConfig(await webhooks.load(req.auth.sub)) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings/webhook", limiter, requireAuth, express.json({ limit: "8kb" }), async (req, res) => {
    try {
      const raw = String(req.body?.url ?? "").trim();
      if (!raw) {
        await pool.query("delete from profile_webhooks where user_id = $1", [req.auth.sub]);
        return res.json({ webhook: null });
      }
      let url;
      try {
        url = normalizeWebhookUrl(raw, { allowHttp });
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
      const enabled = req.body?.enabled !== false;
      const config = normalizeWebhookConfig(req.body?.config, url);
      const { rows } = await pool.query(
        `insert into profile_webhooks (user_id, url, enabled, config, last_status, last_error, last_sent_at)
         values ($1, $2, $3, $4::jsonb, null, null, null)
         on conflict (user_id) do update set
           url = excluded.url,
           enabled = excluded.enabled,
           config = excluded.config,
           last_status = null,
           last_error = null,
           last_sent_at = null,
           updated_at = now()
         returning *`,
        [req.auth.sub, url, enabled, JSON.stringify(config)],
      );
      res.json({ webhook: publicConfig(rows[0]) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/settings/webhook", limiter, requireAuth, async (req, res) => {
    try {
      await pool.query("delete from profile_webhooks where user_id = $1", [req.auth.sub]);
      res.json({ webhook: null });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/webhook/test", limiter, requireAuth, async (req, res) => {
    try {
      const current = await webhooks.load(req.auth.sub);
      if (!current) return res.status(400).json({ error: "Save a webhook URL first." });
      const snapshot = await webhooks.profile(req.auth.sub);
      const result = await webhooks.deliver(req.auth.sub, {
        event: "webhook.test",
        ...snapshot,
        force: true,
      });
      const webhook = publicConfig(await webhooks.load(req.auth.sub));
      if (!result.delivered) return res.status(502).json({ error: result.error || "The test could not be delivered.", webhook });
      res.json({ ok: true, status: result.status, webhook });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
