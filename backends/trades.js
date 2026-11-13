import crypto from 'node:crypto';

/* ---------------------------------------------------------------------------
   Trades.

   Two members agree on a swap: each side puts up usernames and/or badges, the
   recipient accepts, and everything moves in one transaction. The account name
   (users.username) can never be offered, so nobody can trade away their last
   identity. Chat messages are stored as ciphertext only — the participants'
   browsers hold the keys, so the server cannot read them.
   --------------------------------------------------------------------------- */

export const TRADE_SCHEMA = `
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists trades_sender on trades(sender_id, created_at desc);
create index if not exists trades_recipient on trades(recipient_id, created_at desc);
create table if not exists trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  from_user uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('username','badge')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (trade_id, kind, ref)
);
create table if not exists trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  cipher text not null,
  iv text not null,
  public_key jsonb,
  created_at timestamptz not null default now()
);
create index if not exists trade_messages_trade on trade_messages(trade_id, created_at);
create table if not exists trade_keys (
  trade_id uuid not null references trades(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  public_key jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (trade_id, user_id)
);
`;

const fail = (status, message) => Object.assign(new Error(message), { status });

export function registerTradeRoutes(app, { pool, requireAuth, limiter }) {
  const route = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error('[trades]', error.message);
      res.status(error.status || 503).json({ error: error.status ? error.message : 'Trades are temporarily unavailable. Please try again.' });
    }
  };

  const participant = async (db, tradeId, userId) => {
    const { rows } = await db.query('select * from trades where id=$1', [tradeId]);
    const trade = rows[0];
    if (!trade) throw fail(404, 'That trade no longer exists.');
    if (trade.sender_id !== userId && trade.recipient_id !== userId) throw fail(403, 'This trade is not yours.');
    return trade;
  };

  const owns = async (db, userId, kind, ref) => {
    if (kind === 'username') {
      const { rows } = await db.query('select 1 from username_inventory where handle=$1 and owner_id=$2', [ref, userId]);
      return rows.length > 0;
    }
    const { rows } = await db.query("select 1 from users where id=$1 and coalesce(badges,'[]'::jsonb) ? $2::text", [userId, ref]);
    return rows.length > 0;
  };

  // Search members for the trade picker.
  app.get('/api/trades/people', limiter, requireAuth, route(async (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase().replace(/^@/, '');
    const { rows } = await pool.query(
      `select username, avatar_url from users
       where id <> $1 and ($2 = '' or lower(username) like $2 || '%' or lower(alias) like $2 || '%')
       order by (lower(username) = $2) desc, username asc limit 24`,
      [req.auth.sub, q],
    );
    res.set('Cache-Control', 'no-store').json({ people: rows });
  }));

  // What this member can put up: owned usernames and tradable badges.
  app.get('/api/trades/assets', requireAuth, route(async (req, res) => {
    const names = (await pool.query('select handle, acquired_at from username_inventory where owner_id=$1 order by acquired_at desc', [req.auth.sub])).rows;
    const badges = (await pool.query("select coalesce(badges,'[]'::jsonb) as badges from users where id=$1", [req.auth.sub])).rows[0]?.badges || [];
    res.set('Cache-Control', 'no-store').json({ usernames: names, badges: Array.isArray(badges) ? badges : [] });
  }));

  app.get('/api/trades', requireAuth, route(async (req, res) => {
    const { rows } = await pool.query(
      `select t.*,
         s.username as sender_username, r.username as recipient_username,
         (select count(*)::int from trade_items i where i.trade_id=t.id) as item_count,
         (select count(*)::int from trade_messages m where m.trade_id=t.id and m.sender_id <> $1) as message_count
       from trades t
       join users s on s.id=t.sender_id
       join users r on r.id=t.recipient_id
       where t.sender_id=$1 or t.recipient_id=$1
       order by t.created_at desc limit 50`,
      [req.auth.sub],
    );
    res.set('Cache-Control', 'no-store').json({ trades: rows });
  }));

  app.get('/api/trades/:id', requireAuth, route(async (req, res) => {
    const trade = await participant(pool, req.params.id, req.auth.sub);
    const items = (await pool.query(
      `select i.*, u.username as from_username from trade_items i join users u on u.id=i.from_user where i.trade_id=$1 order by i.created_at`,
      [trade.id],
    )).rows;
    res.set('Cache-Control', 'no-store').json({
      trade,
      items,
      sender: (await pool.query('select username, avatar_url from users where id=$1', [trade.sender_id])).rows[0],
      recipient: (await pool.query('select username, avatar_url from users where id=$1', [trade.recipient_id])).rows[0],
    });
  }));

  app.post('/api/trades', limiter, requireAuth, route(async (req, res) => {
    const handle = String(req.body?.recipient || '').trim().toLowerCase().replace(/^@/, '');
    if (!handle) throw fail(400, 'Choose who you want to trade with.');
    const target = (await pool.query('select id, username from users where lower(username)=$1 limit 1', [handle])).rows[0];
    if (!target) throw fail(404, 'No member with that username.');
    if (target.id === req.auth.sub) throw fail(400, 'You cannot trade with yourself.');
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
    if (!items.length) throw fail(400, 'Add at least one username or badge to the trade.');
    const message = typeof req.body?.message === 'string' ? req.body.message.slice(0, 500) : null;
    const db = await pool.connect();
    try {
      await db.query('begin');
      const trade = (await db.query(
        'insert into trades(sender_id,recipient_id,message) values($1,$2,$3) returning *',
        [req.auth.sub, target.id, message],
      )).rows[0];
      for (const item of items) {
        const kind = item?.kind === 'badge' ? 'badge' : 'username';
        const ref = String(item?.ref || '').trim();
        if (!ref) continue;
        if (!(await owns(db, req.auth.sub, kind, ref))) throw fail(403, `You no longer own ${kind === 'username' ? `@${ref}` : ref}.`);
        await db.query('insert into trade_items(trade_id,from_user,kind,ref) values($1,$2,$3,$4) on conflict do nothing', [trade.id, req.auth.sub, kind, ref]);
      }
      if (!(await db.query('select 1 from trade_items where trade_id=$1 limit 1', [trade.id])).rows.length) throw fail(400, 'Add at least one username or badge to the trade.');
      await db.query('commit');
      res.status(201).json({ ok: true, id: trade.id });
    } catch (error) {
      await db.query('rollback');
      throw error;
    } finally {
      db.release();
    }
  }));

  // Either side can add to an offer while it is still pending.
  app.post('/api/trades/:id/items', limiter, requireAuth, route(async (req, res) => {
    const db = await pool.connect();
    try {
      await db.query('begin');
      const trade = await participant(db, req.params.id, req.auth.sub);
      if (trade.status !== 'pending') throw fail(409, 'This trade is already closed.');
      const kind = req.body?.kind === 'badge' ? 'badge' : 'username';
      const ref = String(req.body?.ref || '').trim();
      if (!ref) throw fail(400, 'Choose something to add.');
      if (!(await owns(db, req.auth.sub, kind, ref))) throw fail(403, 'You no longer own that.');
      await db.query('insert into trade_items(trade_id,from_user,kind,ref) values($1,$2,$3,$4) on conflict do nothing', [trade.id, req.auth.sub, kind, ref]);
      await db.query('commit');
      res.json({ ok: true });
    } catch (error) {
      await db.query('rollback');
      throw error;
    } finally {
      db.release();
    }
  }));

  app.post('/api/trades/:id/respond', limiter, requireAuth, route(async (req, res) => {
    const accept = req.body?.accept === true;
    const db = await pool.connect();
    try {
      await db.query('begin');
      await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))', ['trade:' + req.params.id]);
      const trade = await participant(db, req.params.id, req.auth.sub);
      if (trade.recipient_id !== req.auth.sub) throw fail(403, 'Only the member who received the offer can answer it.');
      if (trade.status !== 'pending') throw fail(409, 'This trade is already closed.');
      if (!accept) {
        await db.query("update trades set status='declined',responded_at=now() where id=$1", [trade.id]);
        await db.query('commit');
        return res.json({ ok: true, status: 'declined' });
      }
      const items = (await db.query('select * from trade_items where trade_id=$1', [trade.id])).rows;
      if (!items.length) throw fail(400, 'This trade has nothing in it.');
      const sender = trade.sender_id;
      const recipient = trade.recipient_id;
      for (const item of items) {
        if (item.from_user !== sender && item.from_user !== recipient) throw fail(409, 'This trade has an invalid item.');
        if (!(await owns(db, item.from_user, item.kind, item.ref))) {
          throw fail(409, `The other member no longer owns ${item.kind === 'username' ? `@${item.ref}` : item.ref}. Ask them to send a new trade.`);
        }
      }
      for (const item of items) {
        const to = item.from_user === sender ? recipient : sender;
        if (item.kind === 'username') {
          const moved = await db.query('update username_inventory set owner_id=$3 where handle=$1 and owner_id=$2', [item.ref, item.from_user, to]);
          if (!moved.rowCount) throw fail(409, `@${item.ref} is no longer available.`);
          await db.query('update users set alias=case when alias=$1 then null else alias end, alias2=case when alias2=$1 then null else alias2 end where id=$2', [item.ref, item.from_user]);
          await db.query('insert into username_transfers(handle,sender_id,recipient_id) values($1,$2,$3)', [item.ref, item.from_user, to]);
        } else {
          const removed = await db.query("update users set badges = coalesce(badges,'[]'::jsonb) - $2::text where id=$1 and coalesce(badges,'[]'::jsonb) ? $2::text", [item.from_user, item.ref]);
          if (!removed.rowCount) throw fail(409, 'A badge in this trade is no longer owned.');
          await db.query("update users set badges = case when coalesce(badges,'[]'::jsonb) ? $2::text then badges else coalesce(badges,'[]'::jsonb) || to_jsonb($2::text) end where id=$1", [to, item.ref]);
        }
      }
      await db.query("update trades set status='accepted',responded_at=now() where id=$1", [trade.id]);
      await db.query('commit');
      res.json({ ok: true, status: 'accepted' });
    } catch (error) {
      await db.query('rollback');
      throw error;
    } finally {
      db.release();
    }
  }));

  app.post('/api/trades/:id/cancel', limiter, requireAuth, route(async (req, res) => {
    const trade = await participant(pool, req.params.id, req.auth.sub);
    if (trade.status !== 'pending') throw fail(409, 'This trade is already closed.');
    await pool.query("update trades set status='cancelled',responded_at=now() where id=$1", [trade.id]);
    res.json({ ok: true });
  }));

  app.get('/api/trades/:id/messages', requireAuth, route(async (req, res) => {
    const trade = await participant(pool, req.params.id, req.auth.sub);
    const { rows } = await pool.query(
      'select id,sender_id,cipher,iv,public_key,created_at from trade_messages where trade_id=$1 order by created_at limit 500',
      [trade.id],
    );
    res.set('Cache-Control', 'no-store').json({ messages: rows });
  }));

  // Public keys only — these are safe to share, and both sides need the other's
  // before either can encrypt the first message.
  app.post('/api/trades/:id/key', limiter, requireAuth, route(async (req, res) => {
    const trade = await participant(pool, req.params.id, req.auth.sub);
    const key = req.body?.publicKey;
    if (!key || typeof key !== 'object' || key.kty !== 'EC' || key.crv !== 'P-256' || !key.x || !key.y) {
      throw fail(400, 'That key is not usable.');
    }
    await pool.query(
      'insert into trade_keys(trade_id,user_id,public_key) values($1,$2,$3::jsonb) on conflict (trade_id,user_id) do update set public_key=excluded.public_key, updated_at=now()',
      [trade.id, req.auth.sub, JSON.stringify({ kty: key.kty, crv: key.crv, x: key.x, y: key.y })],
    );
    res.json({ ok: true });
  }));

  app.get('/api/trades/:id/key', requireAuth, route(async (req, res) => {
    const trade = await participant(pool, req.params.id, req.auth.sub);
    const peer = trade.sender_id === req.auth.sub ? trade.recipient_id : trade.sender_id;
    const { rows } = await pool.query('select user_id, public_key from trade_keys where trade_id=$1 and user_id=$2', [trade.id, peer]);
    res.set('Cache-Control', 'no-store').json({ peerKey: rows[0]?.public_key ?? null });
  }));

  app.post('/api/trades/:id/messages', limiter, requireAuth, route(async (req, res) => {
    const trade = await participant(pool, req.params.id, req.auth.sub);
    const cipher = typeof req.body?.cipher === 'string' ? req.body.cipher : '';
    const iv = typeof req.body?.iv === 'string' ? req.body.iv : '';
    if (!cipher || !iv || cipher.length > 12000) throw fail(400, 'Message could not be sent.');
    const { rows } = await pool.query(
      'insert into trade_messages(trade_id,sender_id,cipher,iv,public_key) values($1,$2,$3,$4,$5) returning id,created_at',
      [trade.id, req.auth.sub, cipher, iv, req.body?.publicKey ? JSON.stringify(req.body.publicKey) : null],
    );
    res.status(201).json({ ok: true, message: rows[0] });
  }));

  // Made-up ids should look like a missing trade, not crash the route.
  app.use('/api/trades', (req, res) => res.status(404).json({ error: 'Trade not found.' }));
}

export const tradeId = () => crypto.randomUUID();
