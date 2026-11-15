/*
 * Regenerates src/lib/decorations.json from the public Discord collectibles
 * catalogue. The old list came from a community gist with ~195 presets; the
 * shop now carries far more, so the picker is built from the full feed.
 *
 *   bun scripts/build-decorations.mjs
 *
 * The feed is public metadata (names + Discord CDN asset URLs), refreshed by
 * litruv/discord-collectibles after Discord's shop updates.
 */
import { writeFileSync } from "node:fs";

const FEED =
  "https://github.com/litruv/discord-collectibles/releases/download/latest/avatardecorations.json";

const response = await fetch(FEED, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Decorations feed returned ${response.status}`);
const body = await response.json();
const items = Array.isArray(body.items) ? body.items : [];

const seen = new Set();
const decorations = [];
for (const item of items) {
  if (item.type && item.type !== "avatar_decoration") continue;
  const asset = (item.assets ?? []).find((entry) => entry.role === "animated") ?? (item.assets ?? [])[0];
  if (!asset?.url) continue;
  const url = `${asset.url}${asset.url.includes("?") ? "&" : "?"}size=240`;
  if (seen.has(url)) continue;
  seen.add(url);
  decorations.push({
    id: String(item.skuId ?? item.id ?? decorations.length),
    label: String(item.name ?? "Avatar decoration"),
    category: String(item.category ?? ""),
    url,
  });
}

decorations.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
writeFileSync(new URL("../src/lib/decorations.json", import.meta.url), `${JSON.stringify(decorations, null, 0)}\n`);
console.log(`Wrote ${decorations.length} decorations.`);
