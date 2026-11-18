import { randomUUID } from "node:crypto";

/* ---------------------------------------------------------------------------
   Support tickets.

   One thread per account: a user can have a single open ticket at a time, and
   every message (theirs, ours, and the close) is mirrored into SUPPORT_WEBHOOK
   as a Discord-style embed so the conversation also lands wherever the team
   reads it. The database is the source of truth; the webhook is a copy.
   --------------------------------------------------------------------------- */

export const SUPPORT_SCHEMA = `
create table if not exists support_tickets (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists support_one_open_ticket
  on support_tickets(user_id) where status = 'open';
create table if not exists support_messages (
  id uuid primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid,
  role text not null default 'user',
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_thread
  on support_messages(ticket_id, created_at);
`;

const fail = (status, message) => Object.assign(new Error(message), { status });
/* Support tickets use the same blue as every other Discord embed. */
const ACCENT = 0x3b82f6;

/** Discord-compatible embed. Never throws: a dead webhook must not fail a ticket. */
async function postEmbed(env, embed) {
  const url = typeof env?.SUPPORT_WEBHOOK === "string" ? env.SUPPORT_WEBHOOK.trim() : "";
  if (!url) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "tourn.lol support", embeds: [embed] }),
    });
    if (!response.ok) console.error("[support] webhook", response.status);
    return response.ok;
  } catch (error) {
    console.error("[support] webhook", error.message);
    return false;
  }
}

const clip = (value, limit) => {
  const text = String(value ?? "").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

const embed = ({ title, description, fields = [], url }) => ({
  title: clip(title, 250),
  description: description ? clip(description, 4000) : undefined,
  color: ACCENT,
  url,
  fields: fields
    .filter((field) => field && field.value)
    .map((field) => ({ name: clip(field.name, 250), value: clip(field.value, 1020), inline: Boolean(field.inline) })),
  timestamp: new Date().toISOString(),
  footer: { text: "tourn.lol · support" },
});

const ticketOf = (row) =>
  row && {
    id: row.id,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

const messageOf = (row) => ({
  id: row.id,
  role: row.role,
  body: row.body,
  createdAt: row.created_at,
});

const webOrigin = (env) =>
  (typeof env?.CANONICAL_FRONTEND_ORIGIN === "string" && env.CANONICAL_FRONTEND_ORIGIN) ||
  (typeof env?.FRONTEND_ORIGIN === "string" && env.FRONTEND_ORIGIN) ||
  "";

export function registerSupportRoutes(app, { pool, requireAuth, requireAdmin, limiter, env = process.env }) {
  const route = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error("[support]", error.message);
      const status = error.status || 503;
      res.status(status).json({
        error: error.status ? error.message : "Support is temporarily unavailable. Try again in a moment.",
      });
    }
  };

  const accountOf = (id) =>
    pool
      .query("select username, alias, email from users where id = $1", [id])
      .then(({ rows }) => rows[0] ?? null)
      .catch(() => null);

  const display = async (id) => {
    const row = await accountOf(id);
    return row?.alias || row?.username || "unknown";
  };

  const thread = async (ticketId) => {
    const { rows } = await pool.query(
      "select id, role, body, created_at from support_messages where ticket_id = $1 order by created_at asc limit 500",
      [ticketId],
    );
    return rows.map(messageOf);
  };

  const openTicketFor = async (userId) => {
    const { rows } = await pool.query(
      "select * from support_tickets where user_id = $1 and status = 'open' order by created_at desc limit 1",
      [userId],
    );
    return rows[0] ?? null;
  };

  /* ---- the account's own thread ------------------------------------------ */

  app.get("/api/support/thread", limiter, requireAuth, route(async (req, res) => {
    const ticket = await openTicketFor(req.auth.sub);
    res.set("Cache-Control", "no-store").json({
      ticket: ticketOf(ticket),
      messages: ticket ? await thread(ticket.id) : [],
    });
  }));

  app.post("/api/support/tickets", limiter, requireAuth, route(async (req, res) => {
    const subject = clip(req.body?.subject, 120);
    const body = clip(req.body?.message, 4000);
    if (subject.length < 3) throw fail(400, "Give the ticket a subject of at least 3 characters.");
    if (body.length < 3) throw fail(400, "Write a message so we know what happened.");
    const existing = await openTicketFor(req.auth.sub);
    if (existing) throw fail(409, "You already have an open ticket. Add to it instead of opening another.");

    const id = randomUUID();
    const user = await accountOf(req.auth.sub);
    try {
      await pool.query(
        "insert into support_tickets(id, user_id, subject) values ($1, $2, $3)",
        [id, req.auth.sub, subject],
      );
    } catch (error) {
      if (String(error.code) === "23505") throw fail(409, "You already have an open ticket.");
      throw error;
    }
    await pool.query(
      "insert into support_messages(id, ticket_id, author_id, role, body) values ($1, $2, $3, 'user', $4)",
      [randomUUID(), id, req.auth.sub, body],
    );

    const origin = webOrigin(env);
    void postEmbed(
      env,
      embed({
        title: "New support ticket",
        description: body,
        url: origin ? `${origin}/#/support` : undefined,
        fields: [
          { name: "Subject", value: subject },
          { name: "Account", value: `@${user?.alias || user?.username || "unknown"}` },
          { name: "Email", value: user?.email || "—" },
          { name: "Ticket", value: id, inline: true },
        ],
      }),
    );

    const ticket = await openTicketFor(req.auth.sub);
    res.json({ ticket: ticketOf(ticket), messages: await thread(id) });
  }));

  app.post("/api/support/tickets/:id/messages", limiter, requireAuth, route(async (req, res) => {
    const body = clip(req.body?.body, 4000);
    if (body.length < 1) throw fail(400, "Write a message first.");
    const { rows } = await pool.query(
      "select * from support_tickets where id = $1 and user_id = $2",
      [req.params.id, req.auth.sub],
    );
    const ticket = rows[0];
    if (!ticket) throw fail(404, "That ticket was not found.");
    if (ticket.status !== "open") throw fail(409, "That ticket is closed. Open a new one.");

    await pool.query(
      "insert into support_messages(id, ticket_id, author_id, role, body) values ($1, $2, $3, 'user', $4)",
      [randomUUID(), ticket.id, req.auth.sub, body],
    );
    await pool.query("update support_tickets set updated_at = now() where id = $1", [ticket.id]);

    const origin = webOrigin(env);
    void postEmbed(
      env,
      embed({
        title: "Support · new message from the account",
        description: body,
        url: origin ? `${origin}/#/support` : undefined,
        fields: [
          { name: "Subject", value: ticket.subject },
          { name: "Account", value: `@${await display(req.auth.sub)}` },
          { name: "Ticket", value: ticket.id, inline: true },
        ],
      }),
    );

    res.json({ messages: await thread(ticket.id) });
  }));

  app.post("/api/support/tickets/:id/close", limiter, requireAuth, route(async (req, res) => {
    const { rows } = await pool.query(
      "update support_tickets set status = 'closed', updated_at = now() where id = $1 and user_id = $2 and status = 'open' returning *",
      [req.params.id, req.auth.sub],
    );
    if (!rows[0]) throw fail(404, "That ticket is not open.");
    void postEmbed(
      env,
      embed({
        title: "Support ticket closed by the account",
        fields: [
          { name: "Subject", value: rows[0].subject },
          { name: "Ticket", value: rows[0].id, inline: true },
        ],
      }),
    );
    res.json({ ok: true });
  }));

  /* ---- the team's inbox -------------------------------------------------- */

  app.get("/api/support/inbox", limiter, requireAdmin, route(async (_req, res) => {
    const { rows } = await pool.query(
      `select t.id, t.subject, t.status, t.created_at, t.updated_at,
              u.username, u.alias,
              (select body from support_messages m where m.ticket_id = t.id order by m.created_at desc limit 1) as last_body,
              (select count(*) from support_messages m where m.ticket_id = t.id and m.role = 'user') as user_messages
         from support_tickets t
         join users u on u.id = t.user_id
        where t.status = 'open'
        order by t.updated_at desc
        limit 100`,
    );
    res.set("Cache-Control", "no-store").json({
      tickets: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        account: row.alias || row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastMessage: row.last_body,
        userMessages: Number(row.user_messages),
      })),
    });
  }));

  app.get("/api/support/inbox/:id", limiter, requireAdmin, route(async (req, res) => {
    const { rows } = await pool.query(
      `select t.*, u.username, u.alias, u.email from support_tickets t join users u on u.id = t.user_id where t.id = $1`,
      [req.params.id],
    );
    const ticket = rows[0];
    if (!ticket) throw fail(404, "That ticket was not found.");
    res.set("Cache-Control", "no-store").json({
      ticket: { ...ticketOf(ticket), account: ticket.alias || ticket.username, email: ticket.email },
      messages: await thread(ticket.id),
    });
  }));

  app.post("/api/support/inbox/:id/reply", limiter, requireAdmin, route(async (req, res) => {
    const body = clip(req.body?.body, 4000);
    if (body.length < 1) throw fail(400, "Write a reply first.");
    const { rows } = await pool.query("select * from support_tickets where id = $1", [req.params.id]);
    const ticket = rows[0];
    if (!ticket) throw fail(404, "That ticket was not found.");
    if (ticket.status !== "open") throw fail(409, "That ticket is closed.");

    await pool.query(
      "insert into support_messages(id, ticket_id, author_id, role, body) values ($1, $2, $3, 'admin', $4)",
      [randomUUID(), ticket.id, req.auth.sub, body],
    );
    await pool.query("update support_tickets set updated_at = now() where id = $1", [ticket.id]);

    void postEmbed(
      env,
      embed({
        title: "Support replied from the dashboard",
        description: body,
        fields: [
          { name: "Subject", value: ticket.subject },
          { name: "Ticket", value: ticket.id, inline: true },
        ],
      }),
    );

    res.json({ messages: await thread(ticket.id) });
  }));

  app.post("/api/support/inbox/:id/close", limiter, requireAdmin, route(async (req, res) => {
    const { rows } = await pool.query(
      "update support_tickets set status = 'closed', updated_at = now() where id = $1 and status = 'open' returning *",
      [req.params.id],
    );
    if (!rows[0]) throw fail(404, "That ticket is not open.");
    void postEmbed(
      env,
      embed({
        title: "Support ticket closed by the team",
        fields: [
          { name: "Subject", value: rows[0].subject },
          { name: "Ticket", value: rows[0].id, inline: true },
        ],
      }),
    );
    res.json({ ok: true });
  }));
}
