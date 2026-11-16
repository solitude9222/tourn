/* ---------------------------------------------------------------------------
   tourn social — the admin-only Discord-style area.

   Everything here is real account data. There are no seeded messages or fake
   members: the Socials Hub is assembled from existing accounts, and any member
   or message shown in the UI comes from Postgres.

   Roles carry permissions, channel view/send access is enforced server-side,
   and every route remains behind requireAdmin.
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

create table if not exists social_roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references social_servers(id) on delete cascade,
  name text not null,
  color text not null default '#ff8f92',
  position integer not null default 0,
  permissions jsonb not null default '{"read_messages":true,"send_messages":true,"manage_channels":false,"manage_roles":false,"manage_members":false,"manage_server":false}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists social_roles_server_idx
  on social_roles (server_id, position desc);
create unique index if not exists social_roles_name_unique
  on social_roles (server_id, lower(name));
create unique index if not exists social_roles_default_unique
  on social_roles (server_id) where is_default;

create table if not exists social_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references social_servers(id) on delete cascade,
  category_id uuid references social_categories(id) on delete set null,
  name text not null,
  type text not null default 'text',
  topic text not null default '',
  position integer not null default 0,
  view_role_id uuid references social_roles(id) on delete set null,
  send_role_id uuid references social_roles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table social_channels add column if not exists view_role_id uuid references social_roles(id) on delete set null;
alter table social_channels add column if not exists send_role_id uuid references social_roles(id) on delete set null;
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

create table if not exists social_member_roles (
  server_id uuid not null references social_servers(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references social_roles(id) on delete cascade,
  primary key (server_id, user_id, role_id)
);
create index if not exists social_member_roles_user_idx
  on social_member_roles (user_id, server_id);

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
const DEFAULT_PERMISSIONS = {
  read_messages: true,
  send_messages: true,
  manage_channels: false,
  manage_roles: false,
  manage_members: false,
  manage_server: false,
};
const OWNER_PERMISSIONS = {
  read_messages: true,
  send_messages: true,
  manage_channels: true,
  manage_roles: true,
  manage_members: true,
  manage_server: true,
};
const STAFF_PERMISSIONS = {
  read_messages: true,
  send_messages: true,
  manage_channels: true,
  manage_roles: false,
  manage_members: true,
  manage_server: false,
};

const serverOf = (row) => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  createdAt: row.created_at,
  memberCount: Number(row.member_count) || 0,
  channelCount: Number(row.channel_count) || 0,
});

const roleOf = (row) => ({
  id: row.id,
  name: row.name,
  color: row.color || "#ff8f92",
  position: Number(row.position) || 0,
  permissions: row.permissions && typeof row.permissions === "object"
    ? { ...DEFAULT_PERMISSIONS, ...row.permissions }
    : { ...DEFAULT_PERMISSIONS },
  isDefault: Boolean(row.is_default),
});

const badgesOf = (value) =>
  Array.isArray(value)
    ? value
        .filter((badge) => badge && typeof badge.id === "string" && badge.visible !== false)
        .slice(0, 8)
        .map((badge) => ({ id: badge.id, visible: badge.visible !== false }))
    : [];

const rolesOf = (value) => (Array.isArray(value) ? value.map((role) => roleOf(role)) : []);

const memberOf = (row) => ({
  id: row.user_id ?? row.id,
  username: row.username,
  alias: row.alias ?? null,
  avatarUrl: row.avatar_url ?? null,
  premium: Boolean(row.premium),
  isAdmin: Boolean(row.is_admin),
  isOwner: Boolean(row.is_owner),
  joinedAt: row.joined_at ?? null,
  roles: rolesOf(row.roles),
  badges: badgesOf(row.badges),
  profileViews: Number(row.profile_views) || 0,
  serverCount: Number(row.server_count) || 0,
});

const authorOf = (row) => ({
  id: row.author_id,
  username: row.username,
  alias: row.alias ?? null,
  avatarUrl: row.avatar_url ?? null,
  premium: Boolean(row.premium),
  isAdmin: Boolean(row.is_admin),
  isOwner: Boolean(row.is_owner),
  roles: rolesOf(row.roles),
  badges: badgesOf(row.badges),
});

const messageOf = (row) => ({
  id: row.id,
  channelId: row.channel_id,
  content: row.content,
  createdAt: row.created_at,
  author: authorOf(row),
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

function cleanRoleName(input) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
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
    `select c.*, s.name as server_name,
            vr.name as view_role_name, vr.color as view_role_color,
            vr.position as view_role_position,
            sr.name as send_role_name, sr.color as send_role_color,
            sr.position as send_role_position
     from social_channels c
     join social_servers s on s.id = c.server_id
     left join social_roles vr on vr.id = c.view_role_id
     left join social_roles sr on sr.id = c.send_role_id
     where c.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

const channelOf = (row) => ({
  id: row.id,
  serverId: row.server_id,
  categoryId: row.category_id ?? null,
  name: row.name,
  type: row.type,
  topic: row.topic ?? "",
  position: Number(row.position) || 0,
  viewRoleId: row.view_role_id ?? null,
  sendRoleId: row.send_role_id ?? null,
  viewRole: row.view_role_id
    ? {
        id: row.view_role_id,
        name: row.view_role_name || "Restricted",
        color: row.view_role_color || "#ff8f92",
        position: Number(row.view_role_position) || 0,
      }
    : null,
  sendRole: row.send_role_id
    ? {
        id: row.send_role_id,
        name: row.send_role_name || "Restricted",
        color: row.send_role_color || "#ff8f92",
        position: Number(row.send_role_position) || 0,
      }
    : null,
});

const MEMBER_SELECT = `
  select u.id, u.username, u.alias, u.avatar_url, u.premium, u.is_admin, u.is_owner,
         m.joined_at,
         coalesce((
           select json_agg(json_build_object(
             'id', r.id, 'name', r.name, 'color', r.color,
             'position', r.position, 'permissions', r.permissions
           ) order by r.position desc)
           from social_member_roles mr
           join social_roles r on r.id = mr.role_id
           where mr.server_id = m.server_id and mr.user_id = u.id
         ), '[]'::json) as roles,
         coalesce(p.data->'badges'->'equipped', '[]'::jsonb) as badges,
         coalesce((select v.views from profile_views v where v.username = u.username), 0)::int as profile_views,
         (select count(*) from social_server_members sm where sm.user_id = u.id)::int as server_count
  from social_server_members m
  join users u on u.id = m.user_id
  left join profiles p on p.user_id = u.id
  where m.server_id = $1
  order by u.is_owner desc, u.is_admin desc, lower(coalesce(u.alias, u.username)) asc
`;

async function memberById(pool, serverId, userId) {
  const { rows } = await pool.query(
    `${MEMBER_SELECT.replace("where m.server_id = $1", "where m.server_id = $1 and m.user_id = $2")}`,
    [serverId, userId],
  );
  return rows[0] ? memberOf(rows[0]) : null;
}

async function ensureAdminMembership(pool, serverId, user) {
  if (!user?.is_admin && !user?.is_owner) return;
  const member = await pool.query(
    "select 1 from social_server_members where server_id = $1 and user_id = $2",
    [serverId, user.id],
  );
  if (!member.rows[0]) {
    await pool.query(
      "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
      [serverId, user.id],
    );
  }
  const assigned = await pool.query(
    "select 1 from social_member_roles where server_id = $1 and user_id = $2 limit 1",
    [serverId, user.id],
  );
  if (assigned.rows[0]) return;
  const staff = await pool.query(
    "select id from social_roles where server_id = $1 and lower(name) = 'staff' order by position desc limit 1",
    [serverId],
  );
  if (staff.rows[0]) {
    await pool.query(
      "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
      [serverId, user.id, staff.rows[0].id],
    );
  }
}

async function rolesForMember(pool, serverId, userId) {
  const { rows } = await pool.query(
    `select r.*
     from social_member_roles mr
     join social_roles r on r.id = mr.role_id
     where mr.server_id = $1 and mr.user_id = $2
     order by r.position desc`,
    [serverId, userId],
  );
  if (rows.length) return rows.map(roleOf);
  const fallback = await pool.query(
    "select * from social_roles where server_id = $1 and is_default = true limit 1",
    [serverId],
  );
  return fallback.rows.map(roleOf);
}

function canUseChannel(channel, roles, mode) {
  const requiredId = mode === "view" ? channel.view_role_id : channel.send_role_id;
  const requiredPosition = mode === "view" ? channel.view_role_position : channel.send_role_position;
  if (!requiredId) return true;
  if (!roles.length) return false;
  if (roles.some((role) => role.id === requiredId)) return true;
  return Math.max(...roles.map((role) => Number(role.position) || 0)) >= (Number(requiredPosition) || 0);
}

function hasPermission(roles, permission) {
  return roles.some((role) => Boolean(role.permissions?.[permission]));
}

async function createDefaultRoles(client, serverId) {
  const owner = await client.query(
    `insert into social_roles (server_id, name, color, position, permissions, is_default)
     values ($1, 'Owner', '#ff8f92', 100, $2::jsonb, false) returning *`,
    [serverId, JSON.stringify(OWNER_PERMISSIONS)],
  );
  const staff = await client.query(
    `insert into social_roles (server_id, name, color, position, permissions, is_default)
     values ($1, 'Staff', '#8db6ff', 50, $2::jsonb, false) returning *`,
    [serverId, JSON.stringify(STAFF_PERMISSIONS)],
  );
  const member = await client.query(
    `insert into social_roles (server_id, name, color, position, permissions, is_default)
     values ($1, 'Member', '#8991a3', 0, $2::jsonb, true) returning *`,
    [serverId, JSON.stringify(DEFAULT_PERMISSIONS)],
  );
  return { owner: roleOf(owner.rows[0]), staff: roleOf(staff.rows[0]), member: roleOf(member.rows[0]) };
}

async function ensureServerRoles(pool, server) {
  const existing = await pool.query(
    "select count(*)::int as count from social_roles where server_id = $1",
    [server.id],
  );
  if (existing.rows[0].count > 0) return;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const roles = await createDefaultRoles(client, server.id);
    await client.query(
      "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
      [server.id, server.owner_id],
    );
    await client.query(
      "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
      [server.id, server.owner_id, roles.owner.id],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/* The first boot after this ships builds a real Socials Hub from the accounts
   already in the database. It is intentionally skipped after the first build
   so an admin can rename/remove things without them reappearing. */
export async function seedSocialHub(pool) {
  let owner = await pool.query(
    "select id from users where is_owner = true order by created_at asc limit 1",
  );
  if (!owner.rows[0]) {
    owner = await pool.query(
      "select id from users where is_admin = true order by created_at asc limit 1",
    );
  }
  if (!owner.rows[0]) return;
  const existing = await pool.query(
    "select id from social_servers where lower(name) = lower('Socials Hub') limit 1",
  );
  if (existing.rows[0]) return;

  const client = await pool.connect();
  try {
    await client.query("begin");
    const ownerId = owner.rows[0].id;
    const server = await client.query(
      "insert into social_servers (name, owner_id) values ('Socials Hub', $1) returning *",
      [ownerId],
    );
    const serverId = server.rows[0].id;
    const roles = await createDefaultRoles(client, serverId);

    const start = await client.query(
      "insert into social_categories (server_id, name, position) values ($1, 'START HERE', 0) returning id",
      [serverId],
    );
    const community = await client.query(
      "insert into social_categories (server_id, name, position) values ($1, 'COMMUNITY', 1) returning id",
      [serverId],
    );
    const staffCategory = await client.query(
      "insert into social_categories (server_id, name, position) values ($1, 'STAFF', 2) returning id",
      [serverId],
    );
    const profileCategory = await client.query(
      "insert into social_categories (server_id, name, position) values ($1, 'YOUR PROFILE', 3) returning id",
      [serverId],
    );

    const channels = [
      [start.rows[0].id, "welcome", "Start here. Your tourn alias is your name here.", 0, null, null],
      [start.rows[0].id, "rules", "The short version: be real, be kind, keep it clean.", 1, null, roles.staff.id],
      [start.rows[0].id, "announcements", "Staff updates live here.", 2, null, roles.staff.id],
      [community.rows[0].id, "general", "Talk about anything. Keep it clean, keep it kind.", 3, null, null],
      [community.rows[0].id, "introductions", "Say hello and point people at your page.", 4, null, null],
      [community.rows[0].id, "clips", "Drop the clips worth watching.", 5, null, null],
      [community.rows[0].id, "showcase", "Show what you made.", 6, null, null],
      [staffCategory.rows[0].id, "staff-chat", "Staff-only room. Normal members cannot view or post.", 7, roles.staff.id, roles.staff.id],
      [profileCategory.rows[0].id, "profile-card", "Share your tourn page and see everyone else's.", 8, null, null],
    ];
    for (const [categoryId, name, topic, position, viewRoleId, sendRoleId] of channels) {
      await client.query(
        `insert into social_channels
           (server_id, category_id, name, type, topic, position, view_role_id, send_role_id)
         values ($1, $2, $3, 'text', $4, $5, $6, $7)`,
        [serverId, categoryId, name, topic, position, viewRoleId, sendRoleId],
      );
    }

    await client.query(
      "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
      [serverId, ownerId],
    );
    await client.query(
      "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
      [serverId, ownerId, roles.owner.id],
    );

    const admins = await client.query(
      "select id from users where is_admin = true and id <> $1 order by created_at asc limit 24",
      [ownerId],
    );
    for (const row of admins.rows) {
      await client.query(
        "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
        [serverId, row.id],
      );
      await client.query(
        "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
        [serverId, row.id, roles.staff.id],
      );
    }

    const members = await client.query(
      "select id from users where is_admin = false and id <> $1 order by created_at asc limit 24",
      [ownerId],
    );
    for (const row of members.rows) {
      await client.query(
        "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
        [serverId, row.id],
      );
      await client.query(
        "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
        [serverId, row.id, roles.member.id],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

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
      const roles = await createDefaultRoles(client, server.id);
      await client.query(
        "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
        [server.id, req.user.id],
      );
      await client.query(
        "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
        [server.id, req.user.id, roles.owner.id],
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
      await ensureServerRoles(pool, server);
      await ensureAdminMembership(pool, server.id, req.user);
      const [categories, roles, channels, members] = await Promise.all([
        pool.query(
          "select id, server_id, name, position from social_categories where server_id = $1 order by position asc, created_at asc",
          [server.id],
        ),
        pool.query(
          "select * from social_roles where server_id = $1 order by position desc, created_at asc",
          [server.id],
        ),
        pool.query(
          `select c.*, vr.name as view_role_name, vr.color as view_role_color,
                  vr.position as view_role_position, sr.name as send_role_name,
                  sr.color as send_role_color, sr.position as send_role_position
           from social_channels c
           left join social_roles vr on vr.id = c.view_role_id
           left join social_roles sr on sr.id = c.send_role_id
           where c.server_id = $1 order by c.position asc, c.created_at asc`,
          [server.id],
        ),
        pool.query(MEMBER_SELECT, [server.id]),
      ]);
      const viewerRoles = await rolesForMember(pool, server.id, req.user.id);
      const visibleChannels = channels.rows
        .filter((row) => canUseChannel(row, viewerRoles, "view"))
        .map((row) => ({
          ...channelOf(row),
          canSend: canUseChannel(row, viewerRoles, "send"),
        }));
      res.json({
        server: serverOf(server),
        categories: categories.rows.map((row) => ({
          id: row.id,
          serverId: row.server_id,
          name: row.name,
          position: Number(row.position) || 0,
        })),
        roles: roles.rows.map(roleOf),
        channels: visibleChannels,
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
      await ensureAdminMembership(pool, server.id, req.user);
      const viewerRoles = await rolesForMember(pool, server.id, req.user.id);
      if (!hasPermission(viewerRoles, "manage_channels")) {
        return res.status(403).json({ error: "You do not have permission to manage channels here." });
      }
      const name = cleanChannelName(req.body?.name);
      if (name.length < 2) {
        return res.status(400).json({ error: "Channel names need at least 2 letters or numbers." });
      }
      const roles = await pool.query("select id from social_roles where server_id = $1", [server.id]);
      const roleIds = new Set(roles.rows.map((row) => row.id));
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
      const viewRoleId = req.body?.viewRoleId || null;
      const sendRoleId = req.body?.sendRoleId || null;
      if (viewRoleId && !roleIds.has(viewRoleId)) {
        return res.status(400).json({ error: "Choose a role from this server." });
      }
      if (sendRoleId && !roleIds.has(sendRoleId)) {
        return res.status(400).json({ error: "Choose a role from this server." });
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
        `insert into social_channels
           (server_id, category_id, name, type, topic, position, view_role_id, send_role_id)
         values ($1, $2, $3, 'text', $4, $5, $6, $7) returning *`,
        [
          server.id,
          categoryId,
          name,
          String(req.body?.topic ?? "").trim().slice(0, 200),
          position.rows[0].next,
          viewRoleId,
          sendRoleId,
        ],
      );
      res.status(201).json({ channel: channelOf(rows[0]) });
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
        `select u.id, u.username, u.alias, u.avatar_url, u.premium, u.is_admin, u.is_owner,
                null::timestamptz as joined_at, '[]'::json as roles,
                coalesce(p.data->'badges'->'equipped', '[]'::jsonb) as badges,
                coalesce((select v.views from profile_views v where v.username = u.username), 0)::int as profile_views,
                (select count(*) from social_server_members sm where sm.user_id = u.id)::int as server_count
         from users u
         left join profiles p on p.user_id = u.id
         where (lower(coalesce(u.alias, '')) like $1 or lower(u.username) like $1)
           and not exists (
             select 1 from social_server_members m
             where m.server_id = $2 and m.user_id = u.id
           )
         order by lower(coalesce(u.alias, u.username)) asc
         limit 12`,
        [`%${query.toLowerCase()}%`, server.id],
      );
      res.json({ users: rows.map(memberOf) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social/servers/:id/members", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      await ensureAdminMembership(pool, server.id, req.user);
      const viewerRoles = await rolesForMember(pool, server.id, req.user.id);
      if (!hasPermission(viewerRoles, "manage_members")) {
        return res.status(403).json({ error: "You do not have permission to add members here." });
      }
      const userId = String(req.body?.userId ?? "");
      if (!UUID_RE.test(userId)) return res.status(400).json({ error: "Choose a real account." });
      const account = await pool.query("select id from users where id = $1", [userId]);
      if (!account.rows[0]) return res.status(404).json({ error: "Account not found." });
      await pool.query(
        "insert into social_server_members (server_id, user_id) values ($1, $2) on conflict do nothing",
        [server.id, userId],
      );
      const defaultRole = await pool.query(
        "select id from social_roles where server_id = $1 and is_default = true limit 1",
        [server.id],
      );
      if (defaultRole.rows[0]) {
        await pool.query(
          "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3) on conflict do nothing",
          [server.id, userId, defaultRole.rows[0].id],
        );
      }
      const member = await memberById(pool, server.id, userId);
      res.status(201).json({ member });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social/servers/:id/roles", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      await ensureAdminMembership(pool, server.id, req.user);
      const viewerRoles = await rolesForMember(pool, server.id, req.user.id);
      if (!hasPermission(viewerRoles, "manage_roles")) {
        return res.status(403).json({ error: "You do not have permission to manage roles here." });
      }
      const name = cleanRoleName(req.body?.name);
      if (name.length < 2) return res.status(400).json({ error: "Role names need at least 2 characters." });
      const color = /^#[0-9a-f]{6}$/i.test(String(req.body?.color ?? ""))
        ? String(req.body.color)
        : "#ff8f92";
      const duplicate = await pool.query(
        "select id from social_roles where server_id = $1 and lower(name) = lower($2)",
        [server.id, name],
      );
      if (duplicate.rows[0]) return res.status(409).json({ error: `The ${name} role already exists.` });
      const input = req.body?.permissions ?? {};
      const permissions = {
        ...Object.fromEntries(
          Object.entries(DEFAULT_PERMISSIONS).map(([key, fallback]) => [
            key,
            typeof input[key] === "boolean" ? input[key] : fallback,
          ]),
        ),
      };
      const position = await pool.query(
        "select coalesce(max(position), -1) + 1 as next from social_roles where server_id = $1",
        [server.id],
      );
      const { rows } = await pool.query(
        `insert into social_roles (server_id, name, color, position, permissions)
         values ($1, $2, $3, $4, $5::jsonb) returning *`,
        [server.id, name, color, Math.min(49, position.rows[0].next), JSON.stringify(permissions)],
      );
      res.status(201).json({ role: roleOf(rows[0]) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/social/servers/:id/members/:userId/roles", async (req, res) => {
    try {
      const server = await findServer(pool, req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found." });
      await ensureAdminMembership(pool, server.id, req.user);
      const viewerRoles = await rolesForMember(pool, server.id, req.user.id);
      if (!hasPermission(viewerRoles, "manage_roles")) {
        return res.status(403).json({ error: "You do not have permission to manage roles here." });
      }
      const userId = String(req.params.userId ?? "");
      if (!UUID_RE.test(userId)) return res.status(400).json({ error: "Choose a real account." });
      const member = await pool.query(
        "select 1 from social_server_members where server_id = $1 and user_id = $2",
        [server.id, userId],
      );
      if (!member.rows[0]) return res.status(404).json({ error: "That account is not in this server." });
      const requested = Array.isArray(req.body?.roleIds)
        ? [...new Set(req.body.roleIds.map(String))].filter((id) => UUID_RE.test(id))
        : [];
      const serverRoles = await pool.query("select id from social_roles where server_id = $1", [server.id]);
      const valid = new Set(serverRoles.rows.map((row) => row.id));
      if (requested.some((id) => !valid.has(id))) {
        return res.status(400).json({ error: "Choose roles from this server." });
      }
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(
          "delete from social_member_roles where server_id = $1 and user_id = $2",
          [server.id, userId],
        );
        for (const roleId of requested) {
          await client.query(
            "insert into social_member_roles (server_id, user_id, role_id) values ($1, $2, $3)",
            [server.id, userId, roleId],
          );
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social/channels/:id/messages", async (req, res) => {
    try {
      const channel = await findChannel(pool, req.params.id);
      if (!channel) return res.status(404).json({ error: "Channel not found." });
      await ensureAdminMembership(pool, channel.server_id, req.user);
      const roles = await rolesForMember(pool, channel.server_id, req.user.id);
      if (!canUseChannel(channel, roles, "view")) {
        return res.status(403).json({ error: "You do not have access to this channel." });
      }
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? ""), 10) || 80));
      const before = req.query.before ? new Date(String(req.query.before)) : null;
      const validBefore = before && !Number.isNaN(before.getTime()) ? before : null;
      const { rows } = await pool.query(
        `select m.id, m.channel_id, m.content, m.created_at,
                u.id as author_id, u.username, u.alias, u.avatar_url, u.premium,
                u.is_admin, u.is_owner,
                coalesce((
                  select json_agg(json_build_object(
                    'id', r.id, 'name', r.name, 'color', r.color,
                    'position', r.position, 'permissions', r.permissions
                  ) order by r.position desc)
                  from social_member_roles mr
                  join social_roles r on r.id = mr.role_id
                  where mr.server_id = c.server_id and mr.user_id = u.id
                ), '[]'::json) as roles,
                coalesce(p.data->'badges'->'equipped', '[]'::jsonb) as badges
         from social_messages m
         join users u on u.id = m.author_id
         join social_channels c on c.id = m.channel_id
         left join profiles p on p.user_id = u.id
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
      await ensureAdminMembership(pool, channel.server_id, req.user);
      const roles = await rolesForMember(pool, channel.server_id, req.user.id);
      if (!canUseChannel(channel, roles, "view")) {
        return res.status(403).json({ error: "You do not have access to this channel." });
      }
      if (!canUseChannel(channel, roles, "send")) {
        return res.status(403).json({
          error: `Only ${channel.send_role_name || "a required role"} can post in #${channel.name}.`,
        });
      }
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
                u.is_admin, u.is_owner,
                coalesce((
                  select json_agg(json_build_object(
                    'id', r.id, 'name', r.name, 'color', r.color,
                    'position', r.position, 'permissions', r.permissions
                  ) order by r.position desc)
                  from social_member_roles mr
                  join social_roles r on r.id = mr.role_id
                  where mr.server_id = c.server_id and mr.user_id = u.id
                ), '[]'::json) as roles,
                coalesce(p.data->'badges'->'equipped', '[]'::jsonb) as badges
         from social_messages m
         join users u on u.id = m.author_id
         join social_channels c on c.id = m.channel_id
         left join profiles p on p.user_id = u.id
         where m.id = $1`,
        [inserted.rows[0].id],
      );
      res.status(201).json({ message: messageOf(rows[0]) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
