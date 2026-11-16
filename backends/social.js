/* ---------------------------------------------------------------------------
   tourn social — the admin-only Discord-style area.

   Everything here is real account data. There are no seeded communities or
   demo members: a server is created by an admin, channels are created by an
   admin, and members are added from the existing users table.

   All routes are mounted under /api/social behind requireAdmin, so a non-admin
   cannot read or write social data even with a guessed URL.
   --------------------------------------------------------------------------- */

export const SOCIAL_SCHEMA = `
create table if not exists social_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists social_categories (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references social_servers(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists social_categories_server_idx
  on social_categories (server_id, position);

create table if not exists social_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references social_servers(id) on delete cascade,
  category_id uuid references social_categories(id) on delete set null,
  name text not null,
  type text not null default 'text',
  topic text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists social_channels_server_idx
  on social_channels (server_id, position);
create unique index if not exists social_channels_name_unique
  on social_channels (server_id, lower(name));

create table if not exists social_server_members (
  server_id uuid not null references social_servers(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);
create index if not exists social_server_members_user_idx
  on social_server_members (user_id);

create table if not exists social_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references social_channels(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists social_messages_channel_idx
  on social_messages (channel_id, created_at desc);
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const serverOf = (row) => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  createdAt: row.created_at,
  memberCount: Number(row.member_count) || 0,
  channelCount: Number(row.channel_count) || 0,
});

const memberOf = (row) => ({
  id: row.user_id ?? row.id,
  username: row.username,
  alias: row.alias ?? null,
  avatarUrl: row.avatar_url ?? null,
  premium: Boolean(row.premium),
  isAdmin: Boolean(row.is_admin),
  isOwner: Boolean(row.is_owner),
  joinedAt: row.joined_at ?? null,
});

const messageOf = (row) => ({
  id: row.id,
  channelId: row.channel_id,
  content: row.content,
  createdAt: row.created_at,
  author: {
    id: row.author_id,
    username: row.username,
    alias: row.alias ?? null,
    avatarUrl: row.avatar_url ?? null,
    premium: Boolean(row.premium),
    isAdmin: Boolean(row.is_admin),
    isOwner: Boolean(row.is_owner),
  },
});

export function cleanChannelName(input) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function cleanServerName(input) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

async function findServer(pool, id) {
  if (!UUID_RE.test(String(id ?? ""))) return null;
  const { rows } = await pool.query(
    `select s.*,
       (select count(*) from social_server_members m where m.server_id = s.id)::int as member_count,
       (select count(*) from social_channels c where c.server_id = s.id)::int as channel_count
     from social_servers s where s.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

async function findChannel(pool, id) {
  if (!UUID_RE.test(String(id ?? ""))) return null;
  const { rows } = await pool.query(
    `select c.*, s.name as server_name
     from social_channels c join social_servers s on s.id = c.server_id
     where c.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

const MEMBER_SELECT = `
  select u.id, u.username, u.alias, u.avatar_url, u.premium, u.is_admin, u.is_owner,
         m.joined_at
  from social_server_members m
  join users u on u.id = m.user_id
  where m.server_id = $1
  order by u.is_owner desc, u.is_admin desc, lower(coalesce(u.alias, u.username)) asc
`;

export function registerSocialRoutes(app, { pool, requireAdmin }) {
  app.use("/api/social", requireAdmin);

  app.get("/api/social/servers", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `select s.*,
           (select count(*) from social_server_members m where m.server_id = s.id)::int as member_count,
           (select count(*) from social_channels c where c.server_id = s.id)::int as channel_count
         from social_servers s
         order by s.created_at asc`,
      );
      res.json({ servers: rows.map(serverOf) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social/servers", async (req, res) => {
    const name = cleanServerName(req.body?.name);
    if (name.length < 2) {
      return res.status(400).json({ error: "Give the server a name with at least 2 characters." });
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const inserted = await client.query(
        "insert into social_servers (name, owner_id) values ($1, $2) returning *",
        [name, req.user.id],
      );
      const server = inserted.rows[0];
      await client.query(
        "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
        [server.id, req.user.id],
      );
      const info = await client.query(
        "insert into social_categories (server_id, name, position) values ($1, 'Information', 0) returning id",
        [server.id],
      );
      const community = await client.query(
        "insert into social_categories (server_id, name, position) values ($1, 'Community', 1) returning id",
        [server.id],
      );
      await client.query(
        `insert into social_channels (server_id, category_id, name, type, position)
         values ($1, $2, 'welcome', 'text', 0), ($1, $3, 'general', 'text', 1)`,
        [server.id, info.rows[0].id, community.rows[0].id],
      );
      await client.query("commit");
      res.status(201).json({
        server: serverOf({ ...server, member_count: 1, channel_count: 2 }),
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  });

  app.get("/api/social/servers/:id", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      const [categories, channels, members] = await Promise.all([
        pool.query(
          "select id, server_id, name, position from social_categories where server_id = $1 order by position asc, created_at asc",
          [server.id],
        ),
        pool.query(
          "select id, server_id, category_id, name, type, topic, position from social_channels where server_id = $1 order by position asc, created_at asc",
          [server.id],
        ),
        pool.query(MEMBER_SELECT, [server.id]),
      ]);
      res.json({
        server: serverOf(server),
        categories: categories.rows.map((row) => ({
          id: row.id,
          serverId: row.server_id,
          name: row.name,
          position: Number(row.position) || 0,
        })),
        channels: channels.rows.map((row) => ({
          id: row.id,
          serverId: row.server_id,
          categoryId: row.category_id ?? null,
          name: row.name,
          type: row.type,
          topic: row.topic ?? "",
          position: Number(row.position) || 0,
        })),
        members: members.rows.map(memberOf),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social/servers/:id/channels", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      const name = cleanChannelName(req.body?.name);
      if (name.length < 2) {
        return res.status(400).json({ error: "Channel names need at least 2 letters or numbers." });
      }
      let categoryId = req.body?.categoryId || null;
      if (categoryId) {
        if (!UUID_RE.test(String(categoryId))) {
          return res.status(400).json({ error: "Choose a category from this server." });
        }
        const category = await pool.query(
          "select id from social_categories where id = $1 and server_id = $2",
          [categoryId, server.id],
        );
        if (!category.rows[0]) {
          return res.status(400).json({ error: "Choose a category from this server." });
        }
      } else {
        const first = await pool.query(
          "select id from social_categories where server_id = $1 order by position asc limit 1",
          [server.id],
        );
        categoryId = first.rows[0]?.id ?? null;
      }
      const duplicate = await pool.query(
        "select id from social_channels where server_id = $1 and lower(name) = $2",
        [server.id, name],
      );
      if (duplicate.rows[0]) {
        return res.status(409).json({ error: `#${name} already exists in this server.` });
      }
      const position = await pool.query(
        "select coalesce(max(position), -1) + 1 as next from social_channels where server_id = $1",
        [server.id],
      );
      const { rows } = await pool.query(
        `insert into social_channels (server_id, category_id, name, type, topic, position)
         values ($1, $2, $3, 'text', $4, $5) returning *`,
        [
          server.id,
          categoryId,
          name,
          String(req.body?.topic ?? "").trim().slice(0, 200),
          position.rows[0].next,
        ],
      );
      const channel = rows[0];
      res.status(201).json({
        channel: {
          id: channel.id,
          serverId: channel.server_id,
          categoryId: channel.category_id ?? null,
          name: channel.name,
          type: channel.type,
          topic: channel.topic ?? "",
          position: Number(channel.position) || 0,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social/servers/:id/users", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      const query = String(req.query.q ?? "").trim().slice(0, 40);
      if (!query) return res.json({ users: [] });
      const { rows } = await pool.query(
        `select u.id, u.username, u.alias, u.avatar_url, u.premium, u.is_admin, u.is_owner
         from users u
         where (lower(coalesce(u.alias, '')) like $1 or lower(u.username) like $1)
           and not exists (
             select 1 from social_server_members m
             where m.server_id = $2 and m.user_id = u.id
           )
         order by lower(coalesce(u.alias, u.username)) asc
         limit 12`,
        [`%${query.toLowerCase()}%`, server.id],
      );
      res.json({ users: rows.map((row) => ({ ...memberOf(row), joinedAt: null })) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social/servers/:id/members", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      const userId = String(req.body?.userId ?? "");
      if (!UUID_RE.test(userId)) return res.status(400).json({ error: "Choose a real account." });
      const account = await pool.query(
        "select id, username, alias, avatar_url, premium, is_admin, is_owner from users where id = $1",
        [userId],
      );
      if (!account.rows[0]) return res.status(404).json({ error: "Account not found." });
      await pool.query(
        "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
        [server.id, userId],
      );
      res.status(201).json({
        member: memberOf({ ...account.rows[0], joined_at: new Date() }),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social/channels/:id/messages", async (req, res) => {
    try {
      const channel = await findChannel(pool, req.params.id);
      if (!channel) return res.status(404).json({ error: "Channel not found." });
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? ""), 10) || 80));
      const before = req.query.before ? new Date(String(req.query.before)) : null;
      const validBefore = before && !Number.isNaN(before.getTime()) ? before : null;
      const { rows } = await pool.query(
        `select m.id, m.channel_id, m.content, m.created_at,
                u.id as author_id, u.username, u.alias, u.avatar_url, u.premium,
                u.is_admin, u.is_owner
         from social_messages m
         join users u on u.id = m.author_id
         where m.channel_id = $1
           ${validBefore ? "and m.created_at < $3" : ""}
         order by m.created_at desc
         limit $2`,
        validBefore ? [channel.id, limit, validBefore] : [channel.id, limit],
      );
      res.json({ messages: rows.reverse().map(messageOf) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social/channels/:id/messages", async (req, res) => {
    try {
      const channel = await findChannel(pool, req.params.id);
      if (!channel) return res.status(404).json({ error: "Channel not found." });
      const content = String(req.body?.content ?? "").replace(/\r\n/g, "\n").trim();
      if (!content) return res.status(400).json({ error: "Write a message first." });
      if (content.length > 2000) {
        return res.status(400).json({ error: "Messages are limited to 2,000 characters." });
      }
      const inserted = await pool.query(
        "insert into social_messages (channel_id, author_id, content) values ($1, $2, $3) returning id",
        [channel.id, req.user.id, content],
      );
      const { rows } = await pool.query(
        `select m.id, m.channel_id, m.content, m.created_at,
                u.id as author_id, u.username, u.alias, u.avatar_url, u.premium,
                u.is_admin, u.is_owner
         from social_messages m join users u on u.id = m.author_id
         where m.id = $1`,
        [inserted.rows[0].id],
      );
      res.status(201).json({ message: messageOf(rows[0]) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
