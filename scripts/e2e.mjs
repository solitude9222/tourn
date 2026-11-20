/* Runs the browser suites in tests/ against a running dev server.
 *
 *   npm run test:e2e                 every suite
 *   npm run test:e2e mute-name-settings layout-upgrade
 *
 * The suites drive a real Chromium (playwright-core) and import source modules
 * straight from the dev server, so one has to be up first:
 *   npm run dev -- --port 5180
 * Set TOURN_BASE to point at a different origin, BROWSER_PATH to pick a browser.
 */

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const base = (process.env.TOURN_BASE || "http://127.0.0.1:5180").replace(/\/$/, "");

const wanted = process.argv.slice(2).map(name => name.replace(/^tests\//, "").replace(/\.mjs$/, ""));
const available = (await readdir(join(root, "tests")))
  .filter(file => file.endsWith(".mjs") && !file.endsWith(".test.mjs"))
  .map(file => file.slice(0, -4))
  .sort();

const suites = wanted.length ? wanted : available;
const unknown = suites.filter(name => !available.includes(name));
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(", ")}\nAvailable: ${available.join(", ")}`);
  process.exit(1);
}

const reachable = await fetch(base + "/", { signal: AbortSignal.timeout(4000) })
  .then(response => response.ok)
  .catch(() => false);
if (!reachable) {
  console.error(`No dev server at ${base}. Start one with: npm run dev -- --port 5180`);
  process.exit(1);
}

const failed = [];
for (const name of suites) {
  process.stdout.write(`\n▶ ${name}\n`);
  const code = await new Promise(done => {
    const child = spawn(process.execPath, [join("tests", name + ".mjs")], { cwd: root, stdio: "inherit", env: { ...process.env, TOURN_BASE: base } });
    child.on("exit", value => done(value ?? 1));
    child.on("error", () => done(1));
  });
  if (code !== 0) failed.push(name);
}

process.stdout.write(`\n${suites.length - failed.length}/${suites.length} suites passed\n`);
if (failed.length) {
  console.error("Failed: " + failed.join(", "));
  process.exit(1);
}
