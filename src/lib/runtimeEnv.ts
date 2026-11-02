/* ---------------------------------------------------------------------------
   Runtime public env.

   The frontend is a static bundle — env vars live ONLY on the backend. The
   backend serves a tiny public script at `/env.js` that does:

       window.__ENV__ = {
         VITE_API_BASE_URL: "",
         VITE_OWNER_EMAIL: "you@example.com",
         VITE_DISCORD_CLIENT_ID: "…"
       };

   index.html loads it from this site's own `/env.js` (proxied to the API) so
   no backend host is ever written into the page. `import.meta.env` stays as
   the fallback so local `.env` development works exactly as before. The
   backend WHITELISTS which vars it exposes — secrets never appear here.
   --------------------------------------------------------------------------- */

export type PublicEnvKey =
  | "VITE_API_BASE_URL"
  | "VITE_OWNER_EMAIL"
  | "VITE_DISCORD_CLIENT_ID"
  | "VITE_SPOTIFY_CLIENT_ID"
  | "VITE_TURNSTILE_SITE_KEY"
  | "VITE_STRIPE_PUBLISHABLE_KEY";

type PublicEnv = Partial<Record<PublicEnvKey, string>>;

declare global {
  interface Window {
    __ENV__?: PublicEnv;
  }
}

export function publicEnv(key: PublicEnvKey): string {
  const runtime = window.__ENV__?.[key];
  if (runtime && runtime.trim()) return runtime.trim();
  const buildTime = (import.meta.env as Record<string, unknown>)[key];
  return typeof buildTime === "string" ? buildTime.trim() : "";
}
