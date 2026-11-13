/* ---------------------------------------------------------------------------
   Template marketplace.

   A template is a look: the card, colours, effects, link/widget/badge styling.
   Members publish their own, everyone can apply one. Snapshots are design-only
   (uploads are stripped client-side), capped in size, and applied locally — the
   server never renders or executes anything from them.
   --------------------------------------------------------------------------- */

export const TEMPLATE_SCHEMA = `
create table if not exists profile_templates (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  name text not null,
  note text not null default '',
  snapshot jsonb not null,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists profile_templates_recent on profile_templates(created_at desc);
create index if not exists profile_templates_author on profile_templates(author_id);
`;

const fail = (status, message) => Object.assign(new Error(message), { status });

const SNAPSHOT_LIMIT = 80_000;
const PER_AUTHOR_LIMIT = 12;

const cleanName = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
const cleanNote = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);

export function registerTemplateRoutes(app, { pool, requireAuth, limiter }) {
  const route = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      console.error('[templates]', error.message);
      res.status(500).json({ error: 'Something went wrong.' });
    }
  };

  app.get(
    '/api/templates',
    requireAuth,
    route(async (req, res) => {
      const rows = (
        await pool.query(
          `select t.id, t.name, t.note, t.uses, t.created_at, t.author_id, t.snapshot,
                  coalesce(u.alias, u.username) as author
             from profile_templates t join users u on u.id = t.author_id
            order by t.uses desc, t.created_at desc
            limit 60`,
        )
      ).rows;
      res.json({
        templates: rows.map((row) => ({
          id: row.id,
          name: row.name,
          note: row.note,
          uses: row.uses,
          createdAt: row.created_at,
          author: row.author,
          mine: row.author_id === req.auth.sub,
          snapshot: row.snapshot,
        })),
      });
    }),
  );

  app.post(
    '/api/templates',
    limiter,
    requireAuth,
    route(async (req, res) => {
      const name = cleanName(req.body?.name);
      const note = cleanNote(req.body?.note);
      const snapshot = req.body?.snapshot;
      if (name.length < 2) throw fail(400, 'Give the template a name (at least 2 characters).');
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw fail(400, 'The look could not be read.');
      let serialized;
      try {
        serialized = JSON.stringify(snapshot);
      } catch {
        throw fail(400, 'The look could not be read.');
      }
      if (serialized.length > SNAPSHOT_LIMIT) throw fail(413, 'That look is too large to publish.');
      const count = (await pool.query('select count(*)::int as n from profile_templates where author_id=$1', [req.auth.sub])).rows[0].n;
      if (count >= PER_AUTHOR_LIMIT) throw fail(409, `You can keep ${PER_AUTHOR_LIMIT} templates. Delete one first.`);
      const row = (
        await pool.query(
          'insert into profile_templates(author_id,name,note,snapshot) values($1,$2,$3,$4) returning id',
          [req.auth.sub, name, note, serialized],
        )
      ).rows[0];
      res.json({ ok: true, id: row.id });
    }),
  );

  app.post(
    '/api/templates/:id/use',
    requireAuth,
    route(async (req, res) => {
      await pool.query('update profile_templates set uses = uses + 1 where id=$1', [req.params.id]);
      res.json({ ok: true });
    }),
  );

  app.delete(
    '/api/templates/:id',
    requireAuth,
    route(async (req, res) => {
      const row = (await pool.query('delete from profile_templates where id=$1 and author_id=$2 returning id', [req.params.id, req.auth.sub])).rows[0];
      if (!row) throw fail(404, 'That template is not yours.');
      res.json({ ok: true });
    }),
  );
}
