/* Cloudflare Pages metadata edge.
 *
 * The app is a client-rendered SPA, so Discord/Slack/X crawlers never execute
 * the React metadata component. For a single-segment profile URL this function
 * fetches the published document and rewrites the static index.html tags before
 * the HTML leaves the edge. Normal assets, API calls and reserved routes pass
 * straight through to the existing app.
 */
const FALLBACK_BACKEND = "https://tourn-production.up.railway.app";
const RESERVED = new Set([
  "dashboard", "admin", "shop", "cart", "premium", "leaderboard", "legal",
  "demo", "about", "profile", "login", "signin", "signup", "help", "support",
  "api", "assets", "badges", "favicon.ico", "favicon-32.png",
  "favicon-rounded.png", "apple-touch-icon.png", "logo.png", "env.js",
  "robots.txt", "sitemap.xml",
]);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function absolute(origin, value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return `${origin}/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function meta(html, attr, key, content) {
  const pattern = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
}

function link(html, rel, href) {
  const pattern = new RegExp(`<link\\s+rel="${rel}"[^>]*>`, "i");
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
}

export function rewriteProfileHtml(html, { origin, account, profile }) {
  const about = profile?.about ?? {};
  const metadata = about.metadata ?? {};
  const displayName =
    String(about.displayName ?? "").trim() ||
    String(account?.alias ?? "").trim() ||
    String(account?.username ?? "").trim() ||
    "tourn.lol";
  const title = String(metadata.shareTitle ?? "").trim() || displayName;
  const description =
    String(metadata.shareDescription ?? "").trim() ||
    String(about.bio ?? "").trim() ||
    `Check out ${displayName} on tourn.lol.`;
  const image = absolute(origin, metadata.shareImageUrl || about.assets?.avatarUrl || account?.avatarUrl);
  const faviconRaw = String(metadata.faviconUrl ?? "").trim() || about.assets?.avatarUrl || account?.avatarUrl;
  const favicon = /^https?:\/\//i.test(faviconRaw) || String(faviconRaw).startsWith("data:")
    ? faviconRaw
    : absolute(origin, faviconRaw);
  const pageUrl = `${origin}/${encodeURIComponent(account?.alias || account?.username || "")}`;

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(String(metadata.title ?? "").trim() || `${displayName} · tourn.lol`)}</title>`)
    .replace(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>\s*/gi, "");
  output = meta(output, "name", "description", description);
  output = meta(output, "property", "og:type", "profile");
  output = meta(output, "property", "og:site_name", "tourn.lol");
  output = meta(output, "property", "og:title", title);
  output = meta(output, "property", "og:description", description);
  output = meta(output, "property", "og:url", pageUrl);
  output = meta(output, "property", "og:image", image);
  output = meta(output, "name", "twitter:card", "summary_large_image");
  output = meta(output, "name", "twitter:title", title);
  output = meta(output, "name", "twitter:description", description);
  output = meta(output, "name", "twitter:image", image);
  output = meta(output, "name", "theme-color", String(metadata.themeColor ?? "").trim() || "#09090b");
  output = link(output, "canonical", pageUrl);
  if (metadata.noIndex) output = meta(output, "name", "robots", "noindex, nofollow");

  const iconTags = [
    `<link rel="icon" href="${escapeHtml(favicon)}">`,
    `<link rel="apple-touch-icon" href="${escapeHtml(favicon)}">`,
  ].join("\n");
  return output.replace("</head>", `${iconTags}\n</head>`);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return context.next();
  const handle = String(params.handle ?? "").trim().toLowerCase();
  if (!handle || handle.includes(".") || RESERVED.has(handle)) return context.next();

  const asset = await context.next();
  const type = asset.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return asset;

  const backend = (env.BACKEND_URL || FALLBACK_BACKEND).replace(/\/+$/, "");
  try {
    const response = await fetch(`${backend}/api/profile/${encodeURIComponent(handle)}`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 120 },
    });
    if (!response.ok) return asset;
    const data = await response.json();
    if (!data?.profile) return asset;
    const html = await asset.text();
    const headers = new Headers(asset.headers);
    headers.delete("content-length");
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    return new Response(
      rewriteProfileHtml(html, {
        origin: new URL(request.url).origin,
        account: data.account,
        profile: data.profile,
      }),
      { status: asset.status, headers },
    );
  } catch {
    return asset;
  }
}
