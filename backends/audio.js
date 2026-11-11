import express from "express";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// Tracks are stored independently of profile JSON and sent in bounded chunks.
// There is no application-level limit on total track size or duration.
export const AUDIO_CHUNK_BYTES = 1024 * 1024;
export const AUDIO_SCHEMA = `
create table if not exists profile_audio (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  mime text not null,
  bytes bigint not null,
  received bigint not null default 0,
  complete boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profile_audio_owner on profile_audio(user_id);
create table if not exists profile_audio_chunks (
  audio_id uuid not null references profile_audio(id) on delete cascade,
  part integer not null,
  data bytea not null,
  primary key(audio_id, part)
);`;
const validId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const handler = (run) => async (req, res, next) => {
  try { await run(req, res); } catch (error) { if (res.headersSent) res.destroy(error); else next(error); }
};

export function registerAudioRoutes(app, pool, requireAuth) {
  app.post("/api/media/audio", requireAuth, express.json({ limit: "4kb" }), handler(async (req, res) => {
    const { bytes, mime } = req.body || {};
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || typeof mime !== "string" || !/^audio\/[a-z0-9.+-]+$/i.test(mime)) return res.status(400).json({ error: "Choose a non-empty audio file." });
    await pool.query("delete from profile_audio where user_id = $1 and complete = false and created_at < now() - interval '1 day'", [req.auth.sub]);
    const id = randomUUID();
    await pool.query("insert into profile_audio (id,user_id,mime,bytes) values ($1,$2,$3,$4)", [id, req.auth.sub, mime, bytes]);
    res.status(201).json({ id, chunkBytes: AUDIO_CHUNK_BYTES });
  }));

  app.put("/api/media/audio/:id/chunks/:part", requireAuth, express.raw({ type: "application/octet-stream", limit: AUDIO_CHUNK_BYTES }), handler(async (req, res) => {
    const { id } = req.params, part = Number(req.params.part);
    if (!validId(id) || !Number.isSafeInteger(part) || part < 0 || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Invalid audio chunk." });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query("select * from profile_audio where id=$1 and user_id=$2 for update", [id, req.auth.sub]);
      const track = rows[0];
      const fail = async (status, error) => { await client.query("rollback"); res.status(status).json({ error }); };
      if (!track) return await fail(404, "Upload not found.");
      const offset = part * AUDIO_CHUNK_BYTES, received = Number(track.received), bytes = Number(track.bytes);
      // A retry of an acknowledged chunk is safe and never appends it twice.
      if (offset < received) {
        const existing = await client.query("select data from profile_audio_chunks where audio_id=$1 and part=$2", [id, part]);
        if (!existing.rows[0] || !Buffer.from(existing.rows[0].data).equals(req.body)) return await fail(409, "That audio chunk has different contents.");
        await client.query("commit"); return res.json({ received });
      }
      if (track.complete || offset !== received || req.body.length !== Math.min(AUDIO_CHUNK_BYTES, bytes - received)) return await fail(409, "Audio chunks arrived out of order. Retry the upload.");
      await client.query("insert into profile_audio_chunks (audio_id,part,data) values ($1,$2,$3)", [id, part, req.body]);
      await client.query("update profile_audio set received=received+$2 where id=$1", [id, req.body.length]);
      await client.query("commit"); res.json({ received: received + req.body.length });
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }));

  app.post("/api/media/audio/:id/complete", requireAuth, handler(async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).json({ error: "Upload not found." });
    const { rows } = await pool.query("update profile_audio set complete=true where id=$1 and user_id=$2 and received=bytes returning id", [req.params.id, req.auth.sub]);
    if (!rows.length) return res.status(409).json({ error: "Audio upload is incomplete. Please try again." });
    res.json({ url: `/api/media/audio/${rows[0].id}` });
  }));

  app.get("/api/media/audio/:id", handler(async (req, res) => {
    if (!validId(req.params.id)) return res.sendStatus(404);
    const { rows } = await pool.query("select bytes,mime from profile_audio where id=$1 and complete=true", [req.params.id]);
    if (!rows.length) return res.sendStatus(404);
    const bytes = Number(rows[0].bytes);
    let start = 0, end = bytes - 1;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) return res.set("Content-Range", `bytes */${bytes}`).sendStatus(416);
      if (!match[1]) start = Math.max(0, bytes - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes) return res.set("Content-Range", `bytes */${bytes}`).sendStatus(416);
      res.status(206).set("Content-Range", `bytes ${start}-${end}/${bytes}`);
    }
    res.set({ "Content-Type": rows[0].mime, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
    if (req.method === "HEAD") return res.end();
    async function* chunks() {
      for (let part = Math.floor(start / AUDIO_CHUNK_BYTES); part <= Math.floor(end / AUDIO_CHUNK_BYTES); part++) {
        const result = await pool.query("select data from profile_audio_chunks where audio_id=$1 and part=$2", [req.params.id, part]);
        if (!result.rows.length) throw new Error("Audio chunk missing.");
        const data = Buffer.from(result.rows[0].data), base = part * AUDIO_CHUNK_BYTES;
        yield data.subarray(Math.max(0, start - base), Math.min(data.length, end - base + 1));
      }
    }
    await pipeline(Readable.from(chunks(), { objectMode: false, highWaterMark: 65536 }), res);
  }));
}
