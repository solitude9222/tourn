/* ---------------------------------------------------------------------------
   Frontend origins.

   FRONTEND_URL can name more than one deploy target (tourn.lol and swats.bio,
   comma or space separated). Each configured domain also answers on its apex
   and www host, because the site redirects between the two. Returning a real
   list keeps CORS and the OAuth return URL valid — using the raw env value
   produces a comma-joined string that is not a URL.
   --------------------------------------------------------------------------- */

export function frontendOrigins(value) {
  const origins = [];
  const seen = new Set();

  const add = (origin) => {
    if (!origin || seen.has(origin)) return;
    seen.add(origin);
    origins.push(origin);
  };

  for (const entry of String(value ?? "").split(/[\s,]+/)) {
    if (!entry) continue;
    let url;
    try {
      url = new URL(entry);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;

    add(url.origin);
    const sibling = url.hostname.startsWith("www.")
      ? url.hostname.slice(4)
      : `www.${url.hostname}`;
    add(`${url.protocol}//${sibling}${url.port ? `:${url.port}` : ""}`);
  }

  return origins;
}
