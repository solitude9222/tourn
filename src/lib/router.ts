import { useEffect, useState } from "react";

export type Route =
  | ""
  | "leaderboard"
  | "shop"
  | "premium"
  | "dashboard"
  | "profile"
  | "admin"
  | "demo";

const DEMO_PATH = "/demo";

/** First path segments that are pages (or static files), never handles. */
const RESERVED_PATHS = new Set([
  "",
  "demo",
  "admin",
  "about",
  "shop",
  "leaderboard",
  "premium",
  "dashboard",
  "profile",
  "login",
  "signin",
  "signup",
  "help",
  "support",
  "api",
  "assets",
  "badges",
]);

function isDemoPath(): boolean {
  return window.location.pathname.replace(/\/+$/, "").toLowerCase() === DEMO_PATH;
}

/** `tourn.lol/trackdown` — the shareable profile URL. */
function handleFromPath(): string | null {
  const segment = window.location.pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")[0]
    .toLowerCase();
  if (!segment || RESERVED_PATHS.has(segment)) return null;
  // A dot is a file request (logo.png, favicon.ico), not a handle.
  if (/\.[a-z0-9]+$/.test(segment)) return null;
  const handle = segment.replace(/[^a-z0-9._-]/g, "");
  return handle || null;
}

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  if (hash === "demo") return "demo";
  if (hash === "leaderboard" || hash === "shop" || hash === "dashboard" || hash === "premium") {
    return hash;
  }
  if (hash === "admin") return "admin";
  if (hash.startsWith("profile/")) return "profile";
  if (!hash) {
    if (isDemoPath()) return "demo";
    if (handleFromPath()) return "profile";
  }
  return "";
}

/** The handle in `#/profile/<handle>`, or null when the hash is not a profile page. */
export function profileHandleFromHash(): string | null {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  if (!hash.startsWith("profile/")) return null;
  const handle = decodeURIComponent(hash.slice("profile/".length)).trim().toLowerCase();
  return handle || null;
}

/** The handle in either `#/profile/<handle>` or the path URL `/<handle>`. */
export function profileHandleFromLocation(): string | null {
  return profileHandleFromHash() ?? handleFromPath();
}

/** Tiny hash router — the site is four static pages, no router dependency needed. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => readRoute());

  useEffect(() => {
    const apply = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    const onChange = () => {
      const doc = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
      };
      if (!doc.startViewTransition) {
        apply();
        return;
      }

      // A view transition can be skipped entirely (for example when the tab is
      // backgrounded), which aborts the callback. Always apply the route, even
      // when the transition never runs.
      let applied = false;
      const run = () => {
        if (applied) return;
        applied = true;
        apply();
      };

      try {
        const transition = doc.startViewTransition(run) as
          | { finished?: Promise<unknown> }
          | undefined;
        void transition?.finished?.catch(run);
      } catch {
        run();
      }
    };

    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function hrefFor(route: Route): string {
  return route ? `#/${route}` : "#/";
}

export function profileHref(handle: string): string {
  return `#/profile/${encodeURIComponent(handle)}`;
}
