/* ---------------------------------------------------------------------------
   Runtime public env.

   The frontend is a static bundle — the only runtime value is the public API
   base, written to `public/env.js` and copied into the build:

       window.__ENV__ = { VITE_API_BASE_URL: "" };

   That is deliberately the whole list. The owner email and every private key
   stay server-side. OAuth client ids and the Turnstile site key are public
   identifiers the browser must have; they are not secrets. `import.meta.env`
   remains the local-development fallback.
   --------------------------------------------------------------------------- */

export type PublicEnvKey = "VITE_API_BASE_URL";

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
