# tourn.lol

A bio-link site for people who play. One handle (`tourn.lol/yourname`), a live
profile card, a widget stack (Discord, Roblox, Spotify, Steam, weather, …), a
links row and a fully customisable public page. Signed-in accounts get a full
dashboard: About me, Assets (effects/cursor/audio), Widgets, Links, Badges,
Card/layout and Settings (claims, security, premium).

**Stack:** React 19 + Vite static frontend (Vercel) · Express backend in
`backends/` on Railway with Postgres — sessions, Discord OAuth, claims, MFA,
view counters, and the public `/env.js` runtime config. **No Supabase.**
The only external services are Railway Postgres and Cloudinary (media).

## Setup

**Read [`SETUP.md`](./SETUP.md)** — the full guide. Short version:

```bash
npm install
npm --prefix backends install

# Railway: add PostgreSQL, then put DATABASE_URL + the rest in .env
cp .env.example .env

npm run dev       # frontend → http://127.0.0.1:5180
npm run server    # backend  → http://127.0.0.1:8787
npm run build     # typecheck + production bundle in dist/
```

Deploy: backend service on Railway (root directory `backends`, Postgres
attached, env vars from SETUP.md) + frontend on Vercel with **zero env vars**
(the build ships a static `/env.js` with only the public API base).

Or host **everything on Railway**: run `npm run build` (or make the backend
build it) and leave the service's root directory at the repo root — the
backend serves the `dist/` bundle and the SPA alongside the API, so
`/env.js` is same-origin and there is no separate frontend host.

## Accounts

- **Sign-up is Discord-only** — `GET /api/auth/discord` starts the OAuth
  flow, the callback creates the account and session.
- **Email + password sign-in** works for accounts that added a password in
  **Settings → Security** (Discord accounts can set one; leave "current
  password" empty the first time).
- **Owner** = the account whose email matches `OWNER_EMAIL` (the legacy
  `VITE_OWNER_EMAIL` name still works), or the seeded `ADMIN_EMAIL`, or the
  first account created. Owner profile renders on the home card and at `/demo`.
- There are **no demo accounts** — without a reachable backend, sign-in is
  disabled and the UI says so.

## The database

Railway Postgres. The backend creates its own tables on boot — no manual SQL:

- `users` — username, email, password_hash, discord_id, alias/alias2
  (claims), premium/is_admin/is_owner, TOTP secret, token_version (session
  revocation)
- `profile_views` — per-handle view counters
- `verification_codes` — hashed 6-digit codes the Discord bot DMs for
  password/email/2FA changes (single-use, 10-min expiry, service-role only)

## The cards & widgets

Everything on the bio comes from public APIs, read directly by the browser:

| Widget | Source | Needs |
| --- | --- | --- |
| Discord | `api.lanyard.rest` + a lookup worker | account joined to the Lanyard Discord |
| Server | `discord.com/api/v10/invites/:code?with_counts=true` | a valid invite code |
| Roblox | `users/thumbnails/friends.roblox.com` via `/api/roblox` proxy | a profile URL or ID |
| Spotify | Lanyard's `spotify` object, featured-track fallback, oEmbed | Spotify activity on Discord |
| Steam | `steamcommunity.com/:id/:vanity/?xml=1` via `/api/steam-profile` | a public profile URL |
| Weather / Minecraft / YouTube / GitHub | open-meteo, mcsrvstat, oEmbed, GitHub API | public data only |

The Roblox and Steam endpoints have no CORS headers, so `vite.config.ts`
exposes same-origin proxies with a browser-like user agent and a retry for
dev and `vite preview`. On a static host those two widgets report that the
platform is unreachable rather than inventing numbers.

## Audio player

Upload-only: an MP3/WAV/OGG/M4A file, custom cover, title/artist, accent,
size, four styles (Compact, Marquee with seamless infinite scroll, Vinyl,
Lyrics with LRC sync). Native `<audio>` — no embeds, no third-party scripts.

## Dashboard

`#/dashboard` — Overview, Profile group (About me, Assets, Widgets, Links,
Card/layout, Badges), Extra group (Templates, Analytics, Leaderboard, Entry
screen), Settings and Premium. Settings is a full page (claims, security,
plan); platform connections are widgets, not settings. `/demo` renders the
real public link page (owner's profile, your own when signed in, or the
claim prompt — never fake data).

## Premium

`#/premium` — price hero, Free-vs-Premium table, FAQ. Perks: background /
overlay effects beyond None, flashier audio styles + upload audio, Glass/Glow
link styles, second claim on swats.bio. Checkout runs through Stripe
(`POST /api/billing/checkout` + a signed webhook); grants can also be issued
in the admin console. See SETUP.md for the keys and webhook setup.

## Security posture

- Sessions are httpOnly JWT cookies (30d) with per-account `token_version` —
  "kill other sessions" revokes stolen devices instantly.
- Passwords hashed with bcrypt; admin actions gated server-side
  (`requireAdmin`), self-demotion blocked.
- Secrets live only in Railway. `/env.js` exposes only `VITE_API_BASE_URL`
  (empty = same origin); the owner email and every key stay server-side.
- Verification codes: hashed, single-use, 10-minute expiry, rate-limited,
  DM-only delivery.
- Premium checkout: the price id is server-side, webhooks are signature-
  verified and idempotent, checkout/portal are rate-limited, and entitlement
  is read only from `users.premium` — never from the browser.
- Cookie-authenticated mutations must match a configured site origin; auth
  and billing responses are `no-store`; `requireAuth` re-checks
  `token_version` on every request so revoked sessions stop working.

## Structure

```
backends/                Express backend (Railway + Postgres)
  index.js               routes: auth, claims, MFA, admin, views, env.js
  railway.json           Railway build/deploy config for this directory
railway.json             Railway config when deploying from the repo root
                         (runs the backend; also serves dist/ if built)
src/
  App.tsx                routing, hero identity, dialogs
  lib/backend.ts         API client (cookie sessions)
  lib/auth.tsx           Discord sign-up, email sign-in, claims, MFA
  lib/bgEffects.ts       12 animated canvas background effects
  lib/profileAssets.ts   per-account customisation model
  lib/widgets.ts         widget platform catalogue
  lib/widgetLive.ts      live data fetchers per platform
  components/SettingsPage.tsx  settings page (claims, security, premium)
  components/Pages.tsx   leaderboard, shop, premium
  components/DemoPage.tsx real public link page at /demo
```

## Notes

- The only "server" code in dev is the backend (`npm run server`) plus the
  Roblox/Steam proxies in Vite dev/preview.
- The credits shop is a preview; Premium checkout is live through Stripe once
  its keys are set on the backend.
- Cloudflare Pages config lives in `wrangler.toml` + `functions/_middleware.js`;
  `public/_headers` carries the security headers for a Pages deploy.
