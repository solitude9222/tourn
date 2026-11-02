# tourn.lol — setup

**Stack:** Vercel (static frontend, zero env) · Railway (backend + Postgres).

No Supabase. The backend in `backends/` is an Express app on Railway
Postgres — it owns sessions, Discord sign-up, claims, MFA, view counts, and
`/env.js`. The only external services: Railway Postgres and Cloudinary.

---

## ⚡ Short version

### 1) Local dev

```bash
npm install
npm --prefix backends install
```

Provision Postgres (Railway → New → Database → **Add PostgreSQL** → copy its
`DATABASE_URL`), put it plus the rest of the env into `.env` (copy
`.env.example`), then run **both** processes:

```bash
npm run dev       # frontend → http://127.0.0.1:5180
npm run server    # backend  → http://127.0.0.1:8787
```

For local dev, point the two URL vars at localhost in `.env`:

```bash
FRONTEND_URL=http://127.0.0.1:5180
BACKEND_URL=http://127.0.0.1:8787
VITE_API_BASE_URL=http://127.0.0.1:8787
```

(And in `index.html`, temporarily point the `<script src="…/env.js">` at
`http://127.0.0.1:8787/env.js` — or leave it on Railway if that's already
deployed.)

### 2) Supabase-free database (Railway Postgres)

The backend creates its own tables on boot (`users`, `profile_views`,
`verification_codes`) — **no SQL to run by hand.** Just give it a
`DATABASE_URL`.

### 3) Railway — two services

**Service A — Postgres:** New → Database → **Add PostgreSQL**. Copy its
`DATABASE_URL` variable.

**Service B — backend:** New → GitHub repo → `solitude9222/tourn` →
**Settings → Root Directory: `backends`** → deploy. Add variables:

```bash
DATABASE_URL=            # from service A
JWT_SECRET=              # openssl rand -hex 32
FRONTEND_URL=https://tourn.lol,https://swats.bio   # comma-separated list; apex + www both work
BACKEND_URL=https://tourn-production.up.railway.app
VITE_OWNER_EMAIL=you@example.com
ADMIN_EMAIL=             # optional seeded admin (gets is_admin + is_owner)
ADMIN_PASSWORD=
VITE_DISCORD_CLIENT_ID=1557279875423932467
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
VITE_SPOTIFY_CLIENT_ID=b5e787041316466893ef7eabfb717e3a
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFThWr36t2uJbW1e
VITE_STRIPE_PUBLISHABLE_KEY=
```

✅ **Check:** open `https://<your-backend>/env.js` → `window.__ENV__ = {…}`,
and `/api/health` → `{"ok":true}`.

**First admin:** if `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set, the backend seeds
that account automatically (owner + admin). Otherwise the **first account
ever created becomes owner + admin**.

### 4) Discord OAuth (sign-up)

1. <https://discord.com/developers/applications> → your app → **OAuth2**:
   - Redirects → add `https://<backend>/api/auth/discord/callback`
     (e.g. `https://tourn-production.up.railway.app/api/auth/discord/callback`)
     and, for local dev, `http://127.0.0.1:8787/api/auth/discord/callback`.
   - Copy Client Secret → `DISCORD_CLIENT_SECRET`.
2. **Bot → Reset Token** → `DISCORD_BOT_TOKEN` (the verification-codes bot;
   invite it with only *Send Direct Messages* to a server you're in).

### 5) Vercel — frontend, zero env

Import `solitude9222/tourn`, preset **Vite**, deploy. **No environment
variables** — `index.html` loads the public config from the backend's
`/env.js` at runtime. Update `FRONTEND_URL` in Railway to your final domain
(used for OAuth return + CORS).

### 6) Make yourself the owner

Sign up with Discord → your email matches `VITE_OWNER_EMAIL` (or the seeded
`ADMIN_EMAIL`) → owner + admin. Then **Settings → Security** → set a password,
**Settings → Claims** → claim your alias. `/demo` and the home card show your
page immediately.

---

## The complete env (Railway + local `.env`)

```bash
FRONTEND_URL=https://tourn.lol,https://swats.bio   # comma-separated list; apex + www both work
BACKEND_URL=https://tourn-production.up.railway.app
VITE_API_BASE_URL=https://tourn-production.up.railway.app

DATABASE_URL=                 # Railway Postgres connection string
JWT_SECRET=                   # openssl rand -hex 32

VITE_OWNER_EMAIL=             # your email → owner profile on home + /demo
ADMIN_EMAIL=                  # optional seeded admin (owner + admin)
ADMIN_PASSWORD=

VITE_DISCORD_CLIENT_ID=1557279875423932467
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=            # verification-codes bot
DISCORD_GUILD_ID=             # server for the bot to live in

VITE_SPOTIFY_CLIENT_ID=b5e787041316466893ef7eabfb717e3a
SPOTIFY_CLIENT_SECRET=

VIEW_SECRET=

VITE_STRIPE_PUBLISHABLE_KEY=  # Premium checkout (later)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFThWr36t2uJbW1e
TURNSTILE_SECRET_KEY=

CLOUDINARY_URL=               # media hosting — the only external besides Postgres
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`VITE_` values are public — the backend re-serves them via `/env.js`. Plain
values are secrets, backend only.

---

## API the backend exposes (for reference)

| Endpoint | What |
| --- | --- |
| `GET /env.js` | runtime public config for the static site |
| `GET /api/health` | `{ok:true}` |
| `GET /api/auth/me` | current account (JWT cookie) |
| `POST /api/auth/login` | email + password sign-in |
| `GET /api/auth/discord` → `/callback` | Discord sign-up/sign-in (redirect flow) |
| `POST /api/auth/logout` / `signout-others` | sessions |
| `POST /api/auth/password` / `email` | account security |
| `GET·POST /api/auth/mfa/*` | TOTP enroll / verify / remove |
| `POST /api/security/request-code` + `confirm-code` | 6-digit codes DM'd by the bot |
| `POST /api/profile/alias` / `alias2` | claims (alias2 = premium) |
| `GET /api/profiles` · `/api/profiles/owner` | leaderboard + owner card |
| `GET·POST /api/views/:username` | view counters (throttled per IP/day) |
| `GET /api/stats` | total users + views |
| `GET /api/admin/profiles` · `PATCH …/:id` | admin directory (is_admin gate) |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Sign-up bounces to `/api/auth/discord` and shows the homepage; console says `env.js … MIME type ('text/html') is not executable` | The Railway service is serving the static frontend, not this backend. Set **Root Directory: `backends`** (or use the root `railway.json`), redeploy, then verify `https://<backend>/env.js` shows `window.__ENV__ = {…}` and `/api/health` shows `{"ok":true}`. |
| "Couldn't reach the tourn.lol backend" | Backend service down, `VITE_API_BASE_URL`/`env.js` URL wrong, or the visitor's origin is missing from `FRONTEND_URL`. That variable is a comma-separated list and each entry also allows its apex + www host, so `https://tourn.lol,https://swats.bio` covers `https://www.tourn.lol`. Check `/api/health` and `/env.js`. |
| Sign-in works, then every reload is signed out | API calls are cross-site (site on tourn.lol, API on railway.app). The backend marks the session cookie `SameSite=None; Secure` in production for this; it needs HTTPS on both ends. Browsers that block all third-party cookies need the API on a `tourn.lol` subdomain instead. |
| `DATABASE_URL is required` in Railway logs | The Postgres service's variable isn't linked (reference it: `${{Postgres.DATABASE_URL}}`). |
| Discord login loops back signed out | OAuth redirect must be exactly `https://<backend>/api/auth/discord/callback`, and `FRONTEND_URL` must match your real domain. |
| Bot DM fails | The bot must share a server with the user, and `DISCORD_BOT_TOKEN` must be set. |
| "A second alias is part of Premium" | Grant premium in the admin console (or be owner). |
| Roblox widget "temporarily unreachable" | Static hosts have no `/api/roblox` proxy — it exists in dev/preview only. |
