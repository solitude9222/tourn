import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { visitorDevice, visitorSource, visitorHash, recordProfileVisit, profileAnalytics } from "../backends/analytics.js";

let db;
const pool = { connect: async () => ({ query: (...args) => db.query(...args), release() {} }) };
before(async () => {
  db = new PGlite();
  const source = await readFile(new URL("../backends/index.js", import.meta.url), "utf8");
  await db.exec(source.slice(source.indexOf("create table if not exists profile_views"), source.indexOf("create table if not exists verification_codes")));
});
beforeEach(async () => { await db.exec("truncate profile_views, profile_view_events"); });
after(async () => { await db.close(); });
const visit = (visitor, extra = {}) => ({ handle: "reviewer", visitor, device: "Desktop", source: "Direct", ...extra });

test("repeated visitors increment totals and analytics once", async () => {
  assert.equal(await recordProfileVisit(pool, visit("same-person")), 1);
  assert.equal(await recordProfileVisit(pool, visit("same-person")), 1);
  assert.equal(await recordProfileVisit(pool, visit("another-person", { device: "Mobile", source: "github.com" })), 2);
  const data = await profileAnalytics(pool, "reviewer");
  assert.equal(data.total, 2); assert.equal(data.periodViews, 2);
  assert.deepEqual(data.devices.map((r) => r.label).sort(), ["Desktop", "Mobile"]);
  assert.equal(data.sources.find((r) => r.label === "github.com").views, 1);
  assert.equal(data.daily.length, 1); assert.equal(data.daily[0].views, 2);
});

test("date filters use recorded days and keep legacy lifetime totals", async () => {
  await db.query("insert into profile_views values ('reviewer', 100)");
  await db.query("insert into profile_view_events (username, day, visitor_hash, device, source) values ('reviewer', (now() at time zone 'UTC')::date - 10, 'old', 'Tablet', 'example.com')");
  await recordProfileVisit(pool, visit("new-person"));
  const today = await profileAnalytics(pool, "reviewer", "24h");
  const all = await profileAnalytics(pool, "reviewer", "all");
  assert.equal(today.periodViews, 1); assert.equal(today.total, 101);
  assert.equal(all.periodViews, 2); assert.equal(all.daily.length, 2);
  assert.equal((await profileAnalytics(pool, "reviewer", "invalid")).periodViews, 1);
});

test("a failed total update rolls back its visit so retries are counted", async () => {
  const broken = { connect: async () => ({ release() {}, query(sql, args) {
    if (/insert into profile_views/.test(sql)) throw new Error("Simulated counter failure");
    return db.query(sql, args);
  } }) };
  await assert.rejects(recordProfileVisit(broken, visit("retry-person")), /counter failure/);
  assert.equal((await db.query("select count(*)::int as count from profile_view_events")).rows[0].count, 0);
  assert.equal(await recordProfileVisit(pool, visit("retry-person")), 1);
});

test("analytics stay isolated to the requested owner", async () => {
  await recordProfileVisit(pool, visit("a"));
  await recordProfileVisit(pool, visit("b", { handle: "other" }));
  await recordProfileVisit(pool, visit("c", { handle: "other" }));
  const mine = await profileAnalytics(pool, "reviewer", "all");
  assert.equal(mine.total, 1); assert.equal(mine.periodViews, 1);
  assert.equal((await profileAnalytics(pool, "missing")).total, 0);
});

test("device, source and rotating visitor identity normalization", () => {
  assert.equal(visitorDevice("Mozilla iPhone Mobile"), "Mobile");
  assert.equal(visitorDevice("Mozilla iPad"), "Tablet");
  assert.equal(visitorDevice("Android Tablet"), "Tablet");
  assert.equal(visitorDevice("Windows NT 10.0"), "Desktop");
  assert.equal(visitorSource("https://github.com/a?secret=hidden", "https://tourn.lol"), "github.com");
  assert.equal(visitorSource("https://tourn.lol/profile", "https://tourn.lol"), "Direct");
  assert.equal(visitorSource("javascript:alert(1)", "https://tourn.lol"), "Direct");
  assert.equal(visitorSource("invalid", "https://tourn.lol"), "Direct");
  assert.notEqual(visitorHash("1.2.3.4", "a", "secret", "2026-11-10"), visitorHash("1.2.3.4", "a", "secret", "2026-11-11"));
});
