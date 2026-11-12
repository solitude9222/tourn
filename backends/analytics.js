import crypto from "node:crypto";

export function visitorDevice(agent = "") {
  if (/ipad|tablet|android(?!.*mobile)/i.test(agent)) return "Tablet";
  if (/mobi|iphone|ipod/i.test(agent)) return "Mobile";
  return "Desktop";
}

export function visitorSource(referrer, siteOrigin) {
  try {
    const url = new URL(String(referrer));
    if (!["https:", "http:"].includes(url.protocol)) return "Direct";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === new URL(siteOrigin).hostname.replace(/^www\./, "")) return "Direct";
    return host.slice(0, 253);
  } catch { return "Direct"; }
}

export function visitorHash(ip, handle, secret, day = new Date().toISOString().slice(0, 10)) {
  return crypto.createHmac("sha256", secret).update(`${day}:${handle}:${ip}`).digest("hex");
}

// The event insert and lifetime counter commit together. The unique key also
// deduplicates visitors across server restarts and multiple backend instances.
export async function recordProfileVisit(pool, { handle, visitor, device, source }) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    const added = await db.query(
      `insert into profile_view_events (username, visitor_hash, device, source)
       values ($1, $2, $3, $4) on conflict (username, day, visitor_hash) do nothing returning username`,
      [handle, visitor, device, source],
    );
    if (added.rows.length) {
      await db.query(
        `insert into profile_views (username, views) values ($1, 1)
         on conflict (username) do update set views = profile_views.views + 1`, [handle],
      );
    }
    const { rows } = await db.query("select views from profile_views where username = $1", [handle]);
    await db.query("commit");
    return Number(rows[0]?.views) || 0;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally { db.release(); }
}

export async function profileAnalytics(pool, handle, period = "7d") {
  const windows = { "24h": 1, "3d": 3, "7d": 7, "30d": 30, all: null };
  const days = Object.hasOwn(windows, period) ? windows[period] : 7;
  const db = await pool.connect();
  try {
    // A single snapshot keeps totals, the chart and the breakdowns consistent.
    await db.query("begin isolation level repeatable read read only");
    const total = await db.query("select views from profile_views where username = $1", [handle]);
    const daily = await db.query(
      `select day::text as date, count(*)::int as views from profile_view_events
       where username = $1 and ($2::int is null or day >= (now() at time zone 'UTC')::date - ($2::int - 1))
       group by day order by day`, [handle, days],
    );
    const groups = await db.query(
      `select device, source, count(*)::int as views from profile_view_events
       where username = $1 and ($2::int is null or day >= (now() at time zone 'UTC')::date - ($2::int - 1))
       group by device, source`, [handle, days],
    );
    const started = await db.query("select min(day)::text as date from profile_view_events where username = $1", [handle]);
    await db.query("commit");
    const devices = new Map(), sources = new Map();
    for (const row of groups.rows) {
      devices.set(row.device, (devices.get(row.device) || 0) + Number(row.views));
      sources.set(row.source, (sources.get(row.source) || 0) + Number(row.views));
    }
    const breakdown = (map) => [...map].map(([label, views]) => ({ label, views })).sort((a, b) => b.views - a.views);
    return {
      total: Number(total.rows[0]?.views) || 0,
      periodViews: daily.rows.reduce((sum, row) => sum + Number(row.views), 0),
      daily: daily.rows.map((row) => ({ date: row.date, views: Number(row.views) })),
      devices: breakdown(devices), sources: breakdown(sources),
      historySince: started.rows[0]?.date || null,
    };
  } catch (error) { await db.query("rollback"); throw error; }
  finally { db.release(); }
}
