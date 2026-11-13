/* swats.bio is a second front door to the same profiles. Premium-only: the
   domain serves tourn.lol accounts, and non-Premium handles are refused by the
   profile endpoint when it is asked with ?site=swats. */

export const IS_SWATS_HOST =
  typeof window !== "undefined" && /(^|\.)swats\.bio$/i.test(window.location.hostname);

/** The handle in a swats.bio path, e.g. swats.bio/koni → "koni". */
export function swatsHandleFromPath(): string | null {
  if (!IS_SWATS_HOST) return null;
  const handle = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, "").trim().toLowerCase();
  if (!handle || handle.includes("/")) return null;
  return /^[a-z0-9_-]{1,24}$/.test(handle) ? handle : null;
}

/** Hands a swats.bio/deep link to the hash router on first load. */
export function bridgeSwatsUrl(): void {
  const handle = swatsHandleFromPath();
  if (handle && !window.location.hash.startsWith("#/profile/")) {
    window.location.hash = `#/profile/${encodeURIComponent(handle)}`;
  }
}
