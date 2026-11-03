import { useEffect, useState } from "react";

export type Route =
  | ""
  | "leaderboard"
  | "shop"
  | "premium"
  | "legal"
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
  "legal",
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

/** Page paths that work without a hash, e.g. tourn.lol/dashboard. */
const PATH_ROUTES: Record<string, Route> = {
  dashboard: "dashboard",
  admin: "dashboard",
  leaderboard: "leaderboard",
  shop: "shop",
  premium: "premium",
  legal: "legal",
};

function routeFromPath(): Route | null {
  const segment = window.location.pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")[0]
    .toLowerCase();
  return PATH_ROUTES[segment] ?? null;
}

function readRoute(): Route {
  const rawHash = window.location.hash;
  const hash = rawHash.replace(/^#\/?/, "").split("?")[0];
  if (hash === "demo") return "demo";
  // The admin console lives inside the dashboard — old #/admin links land there.
  if (hash === "admin" || hash === "dashboard/admin") return "dashboard";
  if (hash === "leaderboard" || hash === "shop" || hash === "premium" || hash === "legal") {
    return hash;
  }
  // `#/legal/terms` is a section of the legal page, not a different route.
  if (hash.startsWith("legal/")) return "legal";
  // `#/dashboard`, `#/dashboard/settings`, `#/dashboard/admin` — all the dashboard.
  if (hash === "dashboard" || hash.startsWith("dashboard/")) return "dashboard";
  if (hash.startsWith("profile/")) return "profile";
  if (!hash) {
    // `#/` is an explicit "home" link; only a hash-less URL falls back to the
    // path, so leaving /dashboard for Home still lands on the home page.
    if (rawHash) return "";
    if (isDemoPath()) return "demo";
    const pathRoute = routeFromPath();
    if (pathRoute) return pathRoute;
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

    // Route changes apply straight away. The old document.startViewTransition
    // wrapper cross-faded a snapshot of the previous page over the new one,
    // which read as the page flickering (and, with a tilted card, flashing a
    // stale tilted frame) on every navigation.
    const onChange = () => apply();

    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function hrefFor(route: Route): string {
  return route ? `#/${route}` : "#/";
}

/** The shareable URL a visitor opens: tourn.lol/<handle>. */
export function publicProfileUrl(handle: string): string {
  return `/${encodeURIComponent(handle)}`;
}

/** In-app link to a profile — always the public path, never a hash. */
export function profileHref(handle: string): string {
  return publicProfileUrl(handle);
}
