/* Vercel Routing Middleware.
 *
 * tourn.lol is deployed on Vercel, so the Cloudflare Pages function in
 * functions/[handle].js never runs in production. This middleware gives
 * single-segment profile routes the same crawler-facing metadata rewrite:
 * fetch the static shell, ask the backend for the published profile, then
 * replace the Open Graph, Twitter, favicon and title tags before returning it.
 *
 * Everything else passes through untouched.
 */
import { next } from "@vercel/functions";
import { rewriteProfileHtml } from "./functions/[handle].js";

const FALLBACK_BACKEND = "https://tourn-production.up.railway.app";
const RESERVED = new Set([
  "dashboard", "admin", "shop", "cart", "premium", "leaderboard", "legal",
  "demo", "about", "profile", "login", "signin", "signup", "help", "support",
  "api", "assets", "badges", "favicon.ico", "favicon-32.png",
  "favicon-rounded.png", "apple-touch-icon.png", "logo.png", "env.js",
  "robots.txt", "sitemap.xml",
]);

export default async function middleware(request: Request) {
  if (request.method !== "GET") return next();

  const url = new URL(request.url);
  let handle = "";
  try {
    handle = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, "")).trim().toLowerCase();
  } catch {
    return next();
  }

  // Profiles are exactly one path segment. The matcher is intentionally broad
  // enough to catch trailing slash requests; anything else is left alone.
  if (!handle || handle.includes("/") || handle.includes(".") || RESERVED.has(handle)) {
    return next();
  }

  const backend = (process.env.BACKEND_URL || FALLBACK_BACKEND).replace(/\/+$/, "");
  const [shell, profileResponse] = await Promise.all([
    fetch(new URL("/index.html", url.origin), { headers: { accept: "text/html" } }).catch(() => null),
    fetch(`${backend}/api/profile/${encodeURIComponent(handle)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!shell?.ok || !profileResponse?.ok) return next();
  if (!(shell.headers.get("content-type") || "").includes("text/html")) return next();

  try {
    const data = await profileResponse.json();
    if (!data?.profile) return next();
    const html = rewriteProfileHtml(await shell.text(), {
      origin: url.origin,
      account: data.account,
      profile: data.profile,
    });
    const headers = new Headers(shell.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
    headers.delete("last-modified");
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    return new Response(html, { status: 200, headers });
  } catch {
    return next();
  }
}

export const config = {
  // Profiles are one path segment; reserved nouns are filtered above.
  matcher: "/:handle",
};
