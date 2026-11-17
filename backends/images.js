import express from "express";
import { randomUUID } from "node:crypto";

export const IMAGE_SCHEMA = `
create table if not exists profile_images (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  mime text not null,
  bytes integer not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists profile_images_owner on profile_images(user_id);
`;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_MIME = /^image\/(png|jpeg|webp|gif)$/i;

function decodeDataUrl(value) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\s]+)$/i.exec(String(value ?? ""));
  if (!match || !IMAGE_MIME.test(match[1])) return null;
  try {
    const data = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (!data.length || data.length > MAX_IMAGE_BYTES) return null;
    return { mime: match[1].toLowerCase(), data };
  } catch {
    return null;
  }
}

export function registerImageRoutes(app, pool, requireAuth) {
  app.post("/api/media/image", requireAuth, express.json({ limit: "6mb" }), async (req, res) => {
    try {
      const decoded = decodeDataUrl(req.body?.dataUrl);
      if (!decoded) return res.status(400).json({ error: "Choose a PNG, JPG, WebP or GIF under 4 MB." });
      const id = randomUUID();
      await pool.query(
        "insert into profile_images (id, user_id, mime, bytes, data) values ($1, $2, $3, $4, $5)",
        [id, req.auth.sub, decoded.mime, decoded.data.length, decoded.data],
      );
      res.status(201).json({ url: `/api/media/image/${id}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/media/image/:id", async (req, res) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) return res.sendStatus(404);
    try {
      const { rows } = await pool.query("select mime, bytes, data from profile_images where id = $1", [req.params.id]);
      if (!rows[0]) return res.sendStatus(404);
      res.set({
        "Content-Type": rows[0].mime,
        "Content-Length": String(rows[0].bytes),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });
      res.send(Buffer.from(rows[0].data));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
