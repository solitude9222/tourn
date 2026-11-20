/* Fails when the built bundle grows past its budget.
 *
 *   npm run build && npm run budget
 *
 * Sizes are gzip, which is what a visitor actually downloads. The entry chunk
 * is the one loaded before any route; the total covers every lazy chunk too,
 * so a page cannot quietly double in weight without anyone noticing.
 */

import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(resolve(here, ".."), "dist", "assets");

const ENTRY_LIMIT_KB = Number(process.env.BUNDLE_ENTRY_LIMIT_KB || 160);
const TOTAL_LIMIT_KB = Number(process.env.BUNDLE_TOTAL_LIMIT_KB || 800);

let files;
try {
  files = (await readdir(assets)).filter(name => name.endsWith(".js"));
} catch {
  console.error("No dist/assets found. Run `npm run build` first.");
  process.exit(1);
}

let total = 0;
const rows = [];
for (const name of files) {
  const gzip = gzipSync(await readFile(join(assets, name))).length;
  total += gzip;
  rows.push({ name, kb: Math.ceil(gzip / 1024) });
}

rows.sort((a, b) => b.kb - a.kb);
const entry = rows.find(row => row.name.startsWith("index-")) || rows[0];
const kb = bytes => Math.ceil(bytes / 1024);

console.log(`entry ${entry.name}: ${entry.kb} kB gzip (budget ${ENTRY_LIMIT_KB})`);
console.log(`total JS: ${kb(total)} kB gzip (budget ${TOTAL_LIMIT_KB}) across ${rows.length} chunks`);

const over = [];
if (entry.kb > ENTRY_LIMIT_KB) over.push(`entry ${entry.kb} kB > ${ENTRY_LIMIT_KB} kB`);
if (kb(total) > TOTAL_LIMIT_KB) over.push(`total ${kb(total)} kB > ${TOTAL_LIMIT_KB} kB`);

if (over.length) {
  console.error("Bundle budget exceeded: " + over.join("; "));
  process.exit(1);
}
