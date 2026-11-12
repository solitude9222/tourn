/* Cloudflare Pages middleware.
 *
 * The static site is same-origin: /api/* is proxied through the page host so
 * the session cookie stays first-party and the API host never appears in
 * markup. /env.js is a static whitelisted file in the build output and is
 * deliberately not proxied. Set BACKEND_URL in the Pages project (or use the
 * Railway fallback).
 */
const FALLBACK_BACKEND = "https://tourn-production.up.railway.app";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const isProxy = url.pathname.startsWith("/api/");
  if (!isProxy) return context.next();

  const backend = (env.BACKEND_URL || FALLBACK_BACKEND).replace(/\/+$/, "");
  const target = new URL(url.pathname + url.search, backend);
  const headers = new Headers(request.headers);
  headers.delete("host");

  return fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}
