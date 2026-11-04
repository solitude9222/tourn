import { preloadProfile } from "./serverProfile";

/**
 * Warm public profile payloads before the visitor commits to the click.
 * A pointer/focus on any /handle link starts the same request ProfilePage
 * would make, so the page usually paints from cache instead of waiting on the
 * API. Idle time is used to preload the links already visible on the page.
 */
const RESERVED = new Set([
  "dashboard",
  "premium",
  "leaderboard",
  "shop",
  "admin",
  "demo",
  "legal",
  "faq",
  "about",
  "login",
  "signup",
]);

const warmed = new Set<string>();

function handleFrom(anchor: HTMLAnchorElement): string | null {
  try {
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) return null;
    const handle = parts[0];
    if (!handle || RESERVED.has(handle.toLowerCase())) return null;
    return handle;
  } catch {
    return null;
  }
}

function warm(target: EventTarget | null): void {
  const element = target as Element | null;
  const anchor = element?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return;
  const handle = handleFrom(anchor);
  if (!handle) return;
  const key = handle.toLowerCase();
  if (warmed.has(key)) return;
  warmed.add(key);
  preloadProfile(handle);
}

function warmVisibleLinks(): void {
  const seen = new Set<string>();
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((anchor) => {
    const handle = handleFrom(anchor);
    if (!handle || seen.has(handle.toLowerCase())) return;
    seen.add(handle.toLowerCase());
    if (seen.size > 8) return;
    warm(anchor);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("pointerover", (event) => warm(event.target), { passive: true });
  document.addEventListener("focusin", (event) => warm(event.target));

  const start = () => warmVisibleLinks();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 3000 });
  } else {
    setTimeout(start, 2000);
  }
}
