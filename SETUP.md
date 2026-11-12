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
```

Nothing else is needed: the frontend always calls its own origin (`/api/*`)
and Vite forwards `/api/*` to `http://127.0.0.1:8787` in dev/preview, just like
`vercel.json` does in production. `/env.js` is the static public file in
`public/` (API base only), so it needs no backend. The Railway host never
appears in the page.

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
OAUTH_REDIRECT_URI=      # optional, see §4 — hides the API host from sign-in
OWNER_EMAIL=you@example.com       # server-only; never exposed via /env.js
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
that account automatically (owner + admin). Otherwise use Discord with a verified email matching `OWNER_EMAIL`. Public email/password registration never grants owner or admin roles, and the first signup is not privileged.

### 4) Discord OAuth (sign-up)

1. <https://discord.com/developers/applications> → your app → **OAuth2**:
   - Redirects → add `https://<backend>/api/auth/discord/callback`
     (e.g. `https://tourn-production.up.railway.app/api/auth/discord/callback`)
     and, for local dev, `http://127.0.0.1:8787/api/auth/discord/callback`.
   - Copy Client Secret → `DISCORD_CLIENT_SECRET`.
   - **Fully branded sign-in (optional):** also add
     `https://www.tourn.lol/api/auth/discord/callback`, then set
     `OAUTH_REDIRECT_URI=https://www.tourn.lol/api/auth/discord/callback` on
     Railway. The site proxies that path to the backend, so the address bar
     stays on `tourn.lol` from the first click to the dashboard. Leave the
     variable empty and the callback uses the backend host (still works, but
     the URL flashes once after you approve Discord).
2. **Bot → Reset Token** → `DISCORD_BOT_TOKEN` (the verification-codes bot;
   invite it with only *Send Direct Messages* to a server you're in).

### 5) Vercel — frontend, zero env

Import `solitude9222/tourn`, preset **Vite**, deploy. **No environment
variables** — the build ships `public/env.js` (API base only), which is served
as a static, `no-store` file. `vercel.json` rewrites `/api/*` to the Railway
service, so every request the browser makes is to `tourn.lol` itself: no
backend URL in the markup, no cross-site cookie. Update `FRONTEND_URL` in
Railway to your final domain (used for the OAuth return).

### 6) Make yourself the owner

Sign up with Discord → your verified email matches `OWNER_EMAIL` (or the seeded
`ADMIN_EMAIL`) → owner + admin. Then **Settings → Security** → set a password,
**Settings → Claims** → claim your alias. `/demo` and the home card show your
page immediately.

---

## The complete env (Railway + local `.env`)

```bash
FRONTEND_URL=https://tourn.lol,https://swats.bio   # comma-separated list; apex + www both work
BACKEND_URL=https://tourn-production.up.railway.app
VITE_API_BASE_URL=            # leave empty: the site is same-origin (proxied)

DATABASE_URL=                 # Railway Postgres connection string
JWT_SECRET=                   # openssl rand -hex 32

OWNER_EMAIL=                  # server-only; never exposed via /env.js
ADMIN_EMAIL=                  # optional seeded admin (owner + admin)
ADMIN_PASSWORD=

VITE_DISCORD_CLIENT_ID=1557279875423932467
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=            # verification-codes bot
DISCORD_GUILD_ID=             # server for the bot to live in

VITE_SPOTIFY_CLIENT_ID=b5e787041316466893ef7eabfb717e3a
SPOTIFY_CLIENT_SECRET=

VIEW_SECRET=

VITE_STRIPE_PUBLISHABLE_KEY=  # optional — checkout is a server redirect
STRIPE_SECRET_KEY=            # sk_live_… / sk_test_… — backend only, never VITE_
STRIPE_PRICE_ID=              # price_… for the monthly Premium plan
STRIPE_WEBHOOK_SECRET=        # whsec_… from the Stripe webhook endpoint

VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFThWr36t2uJbW1e
TURNSTILE_SECRET_KEY=

CLOUDINARY_URL=               # media hosting — the only external besides Postgres
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`/env.js` exposes only `VITE_API_BASE_URL` (empty = same origin). The owner
email and every private key stay on the backend. OAuth client ids and the
Turnstile site key are public identifiers the browser must have; they are not
secrets.

---

## Turning on Premium checkout

Premium is sold as one recurring Stripe subscription. The backend stores only
the entitlement (`users.premium`); Stripe owns the card, the invoice and the
subscription. The price is chosen on the server, so a browser cannot change
what is charged.

1. In the Stripe dashboard create a product **tourn.lol Premium** with a
   recurring monthly price (the page shows `$3`). Copy its price id
   (`price_…`).
2. On the **Railway backend** service add:
   `STRIPE_SECRET_KEY` (secret key), `STRIPE_PRICE_ID` and
   `STRIPE_WEBHOOK_SECRET`. Never put any of these in a `VITE_` variable or
   the client bundle — anything prefixed `VITE_` is compiled into the browser
   JavaScript.
3. Add a webhook endpoint pointing at
   `https://<backend-host>/api/billing/webhook` and subscribe it to
   `checkout.session.completed` and `customer.subscription.*`. Copy the
   signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Deploy the backend, sign in on `/premium`, press **Buy premium** and pay
   with Stripe's test card `4242 4242 4242 4242` while using test keys. The
   webhook flips `premium` on; cancelling in the Stripe portal flips it off.

Admin grants made in the admin console keep working independently of Stripe,
and an account can hold either kind. The dashboard reads `premium` from
`/api/auth/me` on every load, so a webhook change shows up on the next refresh.

What the checkout path already enforces:

- price and mode are server-side constants — no client-supplied amount;
- every webhook is verified with the Stripe signature secret before any row is
  written, and events are idempotent;
- checkout/portal require a live session (JWT **and** `token_version`);
- mutations must come from a configured site origin, and billing is rate-limited;
- `premium` is never read from localStorage or a request body.

## Cloudflare

`tourn.lol` already resolves through Cloudflare nameservers
(`martin.ns.cloudflare.com`, `haley.ns.cloudflare.com`), but the records are
**DNS-only** — the apex currently answers with the hosting provider's IP, not a
Cloudflare edge IP. Two ways to finish the connection:

**A. Proxy the existing host (fastest, no migration).** In Cloudflare → DNS,
set the `tourn.lol` and `www` records to **Proxied** (orange cloud), then set
SSL/TLS → Overview to **Full (strict)**. Add a WAF rate-limit rule for
`/api/auth/*` if the site is public. Vercel/Railway keep serving; Cloudflare
now terminates TLS, caches the static assets and fronts the API.

**B. Host the static build on Cloudflare Pages.** The repo now has
`wrangler.toml`, `public/_headers` and `functions/_middleware.js` (the latter
proxies only `/api/*` to Railway; `/env.js` is the static public file). Run:

```bash
npm run build
npx wrangler pages deploy dist --project-name tourn
```

Set `BACKEND_URL=https://tourn-production.up.railway.app` in the Pages project,
then add `tourn.lol` as a custom domain there and point the DNS records at the
Pages project. The backend stays on Railway; only the static site moves.

Neither step can be completed from the repo alone — both need a logged-in
Cloudflare account (dashboard or `npx wrangler login`).

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
