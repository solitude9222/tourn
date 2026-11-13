import crypto from 'node:crypto';

export const MARKET_SCHEMA = `
create table if not exists username_inventory (
  handle text primary key,
  owner_id uuid references users(id) on delete set null,
  checkout_id text unique,
  buyer_id uuid references users(id) on delete set null,
  order_id uuid,
  price_cents integer,
  listed boolean not null default false,
  checkout_payload jsonb,
  reservation_at timestamptz,
  acquired_at timestamptz
);
alter table username_inventory add column if not exists price_cents integer;
alter table username_inventory add column if not exists listed boolean not null default false;
alter table username_inventory add column if not exists checkout_payload jsonb;
alter table username_inventory add column if not exists reservation_at timestamptz;
create unique index if not exists username_unique_order on username_inventory(order_id) where order_id is not null;
create index if not exists username_pending_buyer on username_inventory(buyer_id) where owner_id is null and order_id is not null;
create table if not exists username_transfers (
  id uuid primary key default gen_random_uuid(), handle text not null,
  sender_id uuid not null references users(id) on delete cascade, recipient_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);`;
export const stockHandleValid = value => typeof value === "string" && [...value].length === 1 && !/[<>]/.test(value) && /^[a-z0-9]$|^\p{S}$/u.test(value);
export const freeHandleValid = value => /^[a-z0-9]{3,24}$/.test(value);
export const priceValid = value => Number.isSafeInteger(value) && value >= 50 && value <= 99999999;
const fail = (status, message) => Object.assign(new Error(message), { status });

export async function fulfillUsername(pool, session) {
  if (session.metadata?.kind !== 'username' || session.payment_status !== 'paid') return;
  const db = await pool.connect();
  try {
    await db.query('begin');
    const { rows } = await db.query('select * from username_inventory where checkout_id=$1 or order_id=$2 for update', [session.id, session.metadata.orderId]);
    const item = rows[0];
    if (!item) throw new Error('Username order not found; retry webhook.');
    if (session.amount_total !== item.price_cents || session.currency !== 'usd') throw new Error('Username payment amount mismatch.');
    if (item.buyer_id !== session.metadata.userId || item.handle !== session.metadata.handle || item.order_id !== session.metadata.orderId) throw new Error('Username order mismatch.');
    if (item.checkout_id && item.checkout_id !== session.id) throw new Error('Username checkout mismatch.');
    if (item.owner_id) { await db.query('commit'); return; }
    await db.query('update username_inventory set owner_id=buyer_id, checkout_id=$2, acquired_at=now() where handle=$1', [item.handle,session.id]);
    await db.query('update users set alias=$1 where id=$2', [item.handle, item.buyer_id]);
    await db.query('commit');
  } catch (error) { await db.query('rollback'); throw error; }
  finally { db.release(); }
}

export async function recoverCheckout(pool,stripe,item) {
  let session;
  try {
    session=item.checkout_id
      ? await stripe.checkout.sessions.retrieve(item.checkout_id,{},{timeout:8000,maxNetworkRetries:0})
      : await stripe.checkout.sessions.create(item.checkout_payload,{idempotencyKey:item.order_id,timeout:8000,maxNetworkRetries:0});
  } catch(error) {
    // Stripe validates a new request's expired timestamp only when there is no
    // previously successful response for this idempotency key. Ambiguous network
    // failures always retain the durable order so retries cannot charge twice.
    if(!item.checkout_id && error.type==='StripeInvalidRequestError' && error.param==='expires_at') {
      await pool.query('update username_inventory set buyer_id=null,order_id=null,checkout_payload=null,reservation_at=null where handle=$1 and order_id=$2 and checkout_id is null and owner_id is null',[item.handle,item.order_id]);
    }
    throw error;
  }
  await pool.query('update username_inventory set checkout_id=$2 where handle=$1 and order_id=$3',[item.handle,session.id,item.order_id]);
  return session;
}

export async function releaseExpired(pool, session) {
  if(session.status!=='expired')return;
  await pool.query('update username_inventory set checkout_id=null,buyer_id=null,order_id=null,checkout_payload=null,reservation_at=null where checkout_id=$1 and owner_id is null',[session.id]);
}
export function startUsernameReconciliation(pool,stripe) {
  if(!stripe)return ()=>{};
  let running=false;
  const tick=async()=>{
    if(running)return;
    running=true;
    try{
      const {rows}=await pool.query("select * from username_inventory where owner_id is null and order_id is not null and ((checkout_id is null and checkout_payload is not null) or reservation_at is null or reservation_at < now()-interval '30 minutes') order by reservation_at nulls first limit 10");
      for(const item of rows){
        try{const session=await recoverCheckout(pool,stripe,item);await releaseExpired(pool,session);}catch(error){console.error('[username reconciliation]',error.message);}
      }
    }catch(error){console.error('[username reconciliation]',error.message);}finally{running=false;}
  };
  const timer=setInterval(tick,60000);timer.unref?.();return ()=>clearInterval(timer);
}

export function registerUsernameMarket(app, { pool, stripe, requireAuth, requireAdmin, limiter, origin, invalidate }) {
  const route = fn => async (req, res) => { try { await fn(req,res); } catch(error) { console.error('[usernames]', error.message); res.status(error.status || 503).json({ error: error.status ? error.message : 'Username service is temporarily unavailable. Please try again.' }); } };
  app.get('/api/market/usernames', route(async (_req,res) => {
    const { rows } = await pool.query(`select handle,price_cents,owner_id is not null as owned,order_id is not null as held from username_inventory where listed=true order by handle`);
    const claimed = (await pool.query('select username,alias,alias2 from users where username=any($1::text[]) or alias=any($1::text[]) or alias2=any($1::text[])',[rows.map(row=>row.handle)])).rows;
    const taken = new Set(claimed.flatMap(row => [row.username,row.alias,row.alias2]).filter(Boolean));
    const items = rows.map(row => ({handle:row.handle,category:/^[a-z0-9]$/.test(row.handle)?'1c':'symbol',priceCents:row.price_cents,available:!row.owned && !row.held && !taken.has(row.handle)}));
    res.set?.('Cache-Control','no-store');
    res.json({ items, currency: 'usd' });
  }));
  app.post('/api/market/checkout', limiter, requireAuth, route(async (req,res) => {
    const handle = typeof req.body?.handle === 'string' ? req.body.handle.trim().toLowerCase() : '';
    if (!stockHandleValid(handle)) throw fail(400,'Choose a username from the marketplace.');
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) throw fail(503,'Username checkout is not configured yet.');
    const db = await pool.connect();
    let item;
    try {
      await db.query('begin');
      // Serialize by buyer as well as by stock, across all server instances.
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", ['username-buyer:'+req.auth.sub]);
      const pending=(await db.query('select handle from username_inventory where buyer_id=$1 and owner_id is null and order_id is not null limit 1',[req.auth.sub])).rows[0];
      if(pending && pending.handle!==handle) throw fail(409,`Finish your pending @${pending.handle} checkout before reserving another name.`);
      item = (await db.query('select * from username_inventory where handle=$1 for update',[handle])).rows[0];
      if (!item || !item.listed || !priceValid(item.price_cents)) throw fail(404,'This username is not listed for sale.');
      if (item.owner_id) throw fail(409,'This username is already owned.');
      if ((await db.query('select id from users where username=$1 or alias=$1 or alias2=$1 limit 1',[handle])).rows.length) throw fail(409,'This username is already claimed.');
      if (item.order_id && item.buyer_id!==req.auth.sub) throw fail(409,'This username is reserved by another checkout.');
      if (!item.order_id) {
        const orderId=crypto.randomUUID();
        const payload={
          mode:'payment',client_reference_id:req.auth.sub,payment_method_types:['card'],
          line_items:[{price_data:{currency:'usd',unit_amount:item.price_cents,product_data:{name:`tourn.lol username @${handle}`}},quantity:1}],
          metadata:{kind:'username',userId:req.auth.sub,handle,orderId},
          expires_at:Math.floor(Date.now()/1000)+1860,
          success_url:`${origin}/?username_checkout=success#/dashboard/aliases`,
          cancel_url:`${origin}/?username_checkout=cancelled#/shop`,
        };
        item=(await db.query('update username_inventory set buyer_id=$2,order_id=$3,checkout_payload=$4::jsonb,reservation_at=now() where handle=$1 returning *',[handle,req.auth.sub,orderId,JSON.stringify(payload)])).rows[0];
      }
      await db.query('commit');
    } catch(error) { await db.query('rollback'); throw error; } finally { db.release(); }
    // The order and identical Stripe payload survive crashes and network timeouts.
    // Stripe calls never hold an open database transaction.
    const session=await recoverCheckout(pool,stripe,item);
    if(session.status==='expired') {
      await releaseExpired(pool,session);
      throw fail(409,'Your previous checkout expired. Please choose the username again.');
    }
    if(session.status==='complete') throw fail(409,'Payment is being confirmed. Check your aliases shortly.');
    if(!session.url) throw fail(502,'Checkout did not return a link. Please retry.');
    res.json({url:session.url});
  }));
  app.get('/api/market/pending', requireAuth, route(async(req,res)=>{
    const {rows}=await pool.query('select handle,price_cents from username_inventory where buyer_id=$1 and owner_id is null and order_id is not null limit 1',[req.auth.sub]);
    res.json({pending:rows[0] ? {handle:rows[0].handle,priceCents:rows[0].price_cents} : null});
  }));
  app.post('/api/market/cancel', limiter, requireAuth, route(async(req,res)=>{
    const item=(await pool.query('select * from username_inventory where buyer_id=$1 and owner_id is null and order_id is not null limit 1',[req.auth.sub])).rows[0];
    if(!item)return res.json({ok:true});
    if(!stripe)throw fail(503,'Payments are temporarily unavailable.');
    const session=await recoverCheckout(pool,stripe,item);
    if(session.status==='complete')throw fail(409,'Payment is already being confirmed. Check your aliases.');
    const expired=session.status==='expired'?session:await stripe.checkout.sessions.expire(session.id,{},{timeout:8000,maxNetworkRetries:0});
    await releaseExpired(pool,expired);res.json({ok:true});
  }));
  app.get('/api/admin/usernames', requireAdmin, route(async (_req,res) => {
    const {rows}=await pool.query('select i.*,u.username as owner_username from username_inventory i left join users u on u.id=i.owner_id order by i.handle');
    res.json({items:rows});
  }));

  // Admins take a character out of stock for free. If it was never stocked, the
  // row is created already owned, so it lands straight in their inventory.
  app.post('/api/admin/usernames/claim', requireAdmin, route(async (req,res) => {
    const handle=String(req.body?.handle || '').trim().toLowerCase();
    if (!stockHandleValid(handle)) throw fail(400,'Enter one letter, number or safe symbol.');
    const db=await pool.connect();
    try {
      await db.query('begin');
      const item=(await db.query('select * from username_inventory where handle=$1 for update',[handle])).rows[0];
      if (item?.owner_id && item.owner_id!==req.auth.sub) throw fail(409,'This username is already owned.');
      const other=(await db.query('select id from users where (username=$1 or alias=$1 or alias2=$1) and id<>$2 limit 1',[handle,req.auth.sub])).rows[0];
      if (other) throw fail(409,'This username belongs to another account.');
      if (item) {
        await db.query('update username_inventory set owner_id=$2,listed=false,checkout_id=null,buyer_id=null,order_id=null,checkout_payload=null,reservation_at=null,acquired_at=coalesce(acquired_at,now()) where handle=$1',[handle,req.auth.sub]);
      } else {
        await db.query('insert into username_inventory(handle,owner_id,listed,acquired_at) values($1,$2,false,now())',[handle,req.auth.sub]);
      }
      await db.query('commit'); invalidate();
      res.json({ok:true,handle});
    } catch(error) { await db.query('rollback'); throw error; } finally { db.release(); }
  }));
  app.post('/api/admin/usernames', requireAdmin, route(async (req,res) => {
    const handle=String(req.body?.handle || '').trim().toLowerCase();
    const price=req.body?.priceCents;
    if (!stockHandleValid(handle)) throw fail(400,'Stock must be one letter, number or safe symbol.');
    if (!priceValid(price)) throw fail(400,'Enter a USD price between $0.50 and $999,999.99.');
    if (typeof req.body?.listed !== 'boolean') throw fail(400,'Choose whether this stock is listed.');
    const db=await pool.connect();
    try {
      await db.query('begin');
      await db.query('insert into username_inventory(handle) values($1) on conflict do nothing',[handle]);
      const item=(await db.query('select * from username_inventory where handle=$1 for update',[handle])).rows[0];
      if (item.owner_id || item.order_id) throw fail(409,'Owned or reserved stock cannot be edited.');
      if ((await db.query('select id from users where username=$1 or alias=$1 or alias2=$1 limit 1',[handle])).rows.length) throw fail(409,'This username already belongs to an account.');
      await db.query('update username_inventory set price_cents=$2,listed=$3 where handle=$1',[handle,price,req.body.listed]);
      await db.query('commit');res.json({ok:true});
    }catch(error){await db.query('rollback');throw error;}finally{db.release();}
  }));
  app.get('/api/account/aliases', requireAuth, route(async (req,res) => {
    const items = (await pool.query('select handle,acquired_at from username_inventory where owner_id=$1 order by acquired_at desc',[req.auth.sub])).rows;
    const user = (await pool.query('select username,alias,alias2 from users where id=$1',[req.auth.sub])).rows[0];
    res.json({items, primary:user.alias || user.username, username:user.username, alias2:user.alias2});
  }));
  app.post('/api/account/aliases/activate', requireAuth, route(async (req,res) => {
    const db = await pool.connect();
    try {
      await db.query('begin');
      const item = (await db.query('select * from username_inventory where handle=$1 for update',[req.body?.handle])).rows[0];
      if (!item || item.owner_id !== req.auth.sub) throw fail(403,'You do not own this username.');
      await db.query('update users set alias=$1 where id=$2',[item.handle,req.auth.sub]);
      await db.query('commit'); invalidate(); res.json({ok:true});
    } catch(error){await db.query('rollback');throw error;} finally{db.release();}
  }));
  app.post('/api/account/aliases/gift', limiter, requireAuth, route(async (req,res) => {
    const db = await pool.connect();
    try {
      await db.query('begin');
      const item = (await db.query('select * from username_inventory where handle=$1 for update',[req.body?.handle])).rows[0];
      if (!item || item.owner_id !== req.auth.sub) throw fail(403,'You do not own this username.');
      const recipient = String(req.body?.recipient || '').trim().toLowerCase().replace(/^@/,'');
      const target = (await db.query('select id,username from users where lower(username)=$1 or lower(alias)=$1 limit 1',[recipient])).rows[0];
      if (!target) throw fail(404,'Recipient account not found.');
      if (target.id === req.auth.sub) throw fail(400,'Choose another account.');
      if (req.body?.confirmRecipient !== target.username) throw fail(400,'Confirm the recipient’s account username.');
      await db.query('update users set alias=case when alias=$1 then null else alias end,alias2=case when alias2=$1 then null else alias2 end where id=$2',[item.handle,req.auth.sub]);
      await db.query('update username_inventory set owner_id=$2 where handle=$1',[item.handle,target.id]);
      await db.query('insert into username_transfers(handle,sender_id,recipient_id) values($1,$2,$3)',[item.handle,req.auth.sub,target.id]);
      await db.query('commit'); invalidate(); res.json({ok:true,recipient:target.username});
    } catch(error){await db.query('rollback');throw error;} finally{db.release();}
  }));
}
