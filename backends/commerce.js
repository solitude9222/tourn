import crypto from 'node:crypto';

export const COMMERCE_SCHEMA = `
alter table users add column if not exists premium_lifetime boolean not null default false;
update users set premium_lifetime=true where premium=true and premium_lifetime=false;
create table if not exists commerce_codes(
 digest text primary key, encrypted text not null, kind text not null check(kind in ('premium','username')),
 handle text, redeemed_by uuid references users(id) on delete set null, redeemed_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index if not exists commerce_unique_handle on commerce_codes(handle) where handle is not null;
create table if not exists commerce_deliveries(
 shop_id text not null, invoice_id text not null, item_id text not null, digests jsonb not null,
 primary key(shop_id,item_id)
);`;
const digest = code => crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
const fail = (status,message) => Object.assign(new Error(message),{status});
export function verifySellAuthSignature(raw,signature,secret){
 if(!secret || !Buffer.isBuffer(raw) || !/^[a-f0-9]{64}$/i.test(signature||''))return false;
 const expected=crypto.createHmac('sha256',secret).update(raw).digest();
 return crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
const secretKey=secret=>crypto.createHash('sha256').update('tourn-commerce:'+secret).digest();
function seal(value,secret){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',secretKey(secret),iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');}
function unseal(value,secret){const data=Buffer.from(value,'base64'),cipher=crypto.createDecipheriv('aes-256-gcm',secretKey(secret),data.subarray(0,12));cipher.setAuthTag(data.subarray(12,28));return Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString('utf8');}
export function commerceConfig(env=process.env){
 const id=value=>/^\d+$/.test(value||'') && Number.isSafeInteger(Number(value)) && Number(value)>0 ? Number(value) : null;
 let shopUrl='';try{const url=new URL(env.SELLAUTH_SHOP_URL);if(url.protocol==='https:'&&!url.username&&!url.password)shopUrl=url.origin;}catch{}
 return {shopId:id(env.SELLAUTH_SHOP_ID),shopUrl,products:{premium:id(env.SELLAUTH_PREMIUM_PRODUCT_ID),oneCharacter:id(env.SELLAUTH_1C_PRODUCT_ID),special:id(env.SELLAUTH_SPECIAL_PRODUCT_ID)}};
}
export async function issueCommerceCode(db,kind,handle,secret){
 const code='TOURN-'+crypto.randomBytes(16).toString('hex').toUpperCase(),hash=digest(code);
 await db.query('insert into commerce_codes(digest,encrypted,kind,handle) values($1,$2,$3,$4)',[hash,seal(code,secret),kind,handle||null]);return {code,digest:hash};
}
export async function redeemCommerceCode(db,code,userId){
 const item=(await db.query('select * from commerce_codes where digest=$1 for update',[digest(code)])).rows[0];
 if(!item)throw fail(404,'This code was not found.');
 if(item.redeemed_at){if(item.redeemed_by===userId)return {kind:item.kind,handle:item.handle};throw fail(409,'This code has already been redeemed.');}
 const user=(await db.query('select id from users where id=$1 for update',[userId])).rows[0];if(!user)throw fail(401,'Sign in again.');
 if(item.kind==='premium')await db.query('update users set premium=true,premium_lifetime=true where id=$1',[userId]);
 else {
  const taken=(await db.query('select id from users where (username=$1 or alias=$1 or alias2=$1) and id<>$2 limit 1',[item.handle,userId])).rows;
  if(taken.length)throw fail(409,'This username is already claimed. Contact support with your receipt.');
  await db.query('insert into username_inventory(handle) values($1) on conflict do nothing',[item.handle]);
  const owned=(await db.query('select owner_id from username_inventory where handle=$1 for update',[item.handle])).rows[0];
  if(owned.owner_id && owned.owner_id!==userId)throw fail(409,'This username is already owned. Contact support with your receipt.');
  await db.query('update username_inventory set owner_id=$2,acquired_at=coalesce(acquired_at,now()),listed=false where handle=$1',[item.handle,userId]);
  await db.query('update users set alias=$1 where id=$2',[item.handle,userId]);
 }
 await db.query('update commerce_codes set redeemed_by=$2,redeemed_at=now() where digest=$1',[item.digest,userId]);return {kind:item.kind,handle:item.handle};
}
const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){console.error('[commerce]',error.message);res.status(error.status||503).json({error:error.status?error.message:'Purchase fulfillment is temporarily unavailable. Please try again.'});}};
export function registerSellAuthDelivery(app,{pool,rawParser,jwt,secret,env=process.env,invalidate=()=>{}}){
 app.post('/api/commerce/sellauth/delivery',rawParser,wrap(async(req,res)=>{
  if(!verifySellAuthSignature(req.body,req.get('x-signature'),env.SELLAUTH_WEBHOOK_SECRET))throw fail(401,'Invalid signature.');
  const payload=JSON.parse(req.body.toString('utf8')),config=commerceConfig(env);
  if(payload.event!=='INVOICE.ITEM.DELIVER-DYNAMIC'||String(payload.shop_id)!==String(config.shopId)||!['partially_completed','completed'].includes(payload.status))throw fail(400,'Unsupported delivery.');
  const item=payload.item;const quantity=Number(item?.quantity);
  if(!item?.id||!payload.id||!Number.isInteger(quantity)||quantity<1||quantity>20)throw fail(400,'Invalid invoice item.');
  let kind,handle=null;
  if(config.products.premium && Number(item.product_id)===config.products.premium)kind='premium';
  else{let variants={};try{variants=JSON.parse(env.SELLAUTH_USERNAME_VARIANTS||'{}');}catch{}const mapping=variants[String(item.variant_id)];
   if(![config.products.oneCharacter,config.products.special].filter(Boolean).includes(Number(item.product_id))||!mapping||mapping.productId!==Number(item.product_id)||typeof mapping.handle!=='string'||[...mapping.handle].length!==1||!/^([a-z0-9]|\p{S})$/u.test(mapping.handle)||/[<>]/.test(mapping.handle))throw fail(400,'Unmapped product variant.');
   if(quantity!==1)throw fail(400,'Unique usernames must be purchased individually.');kind='username';handle=mapping.handle;
  }
  const db=await pool.connect();try{
   await db.query('begin');await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))",['sellauth:'+payload.shop_id+':'+item.id]);
   const previous=(await db.query('select invoice_id,digests from commerce_deliveries where shop_id=$1 and item_id=$2',[String(payload.shop_id),String(item.id)])).rows[0];
   if(previous){if(previous.invoice_id!==String(payload.id))throw fail(409,'Invoice mismatch.');const codes=[];for(const hash of previous.digests){const row=(await db.query('select encrypted from commerce_codes where digest=$1',[hash])).rows[0];codes.push(unseal(row.encrypted,secret));}await db.query('commit');return res.type('text/plain').send(codes.join('\n'));}
   const codes=[];for(let n=0;n<quantity;n++)codes.push(await issueCommerceCode(db,kind,handle,secret));
   // Metadata is signed by Tourn, not an email typed at checkout. If a provider
   // omits metadata, the delivered one-use code remains a complete fallback.
   let userId=null;try{const ticket=jwt.verify(payload.metadata?.tourn_checkout||'',secret,{algorithms:['HS256']});if(ticket.kind==='commerce'){const user=(await db.query('select id,token_version from users where id=$1',[ticket.sub])).rows[0];if(user?.token_version===ticket.v)userId=user.id;}}catch{}
   if(userId && quantity===1)await redeemCommerceCode(db,codes[0].code,userId);
   await db.query('insert into commerce_deliveries(shop_id,invoice_id,item_id,digests) values($1,$2,$3,$4::jsonb)',[String(payload.shop_id),String(payload.id),String(item.id),JSON.stringify(codes.map(x=>x.digest))]);
   await db.query('commit');invalidate();res.type('text/plain').send(codes.map(x=>x.code).join('\n'));
  }catch(error){await db.query('rollback');throw error;}finally{db.release();}
 }));
}
export function registerSellAuthRoutes(app,{pool,requireAuth,requireAdmin,limiter,jwt,secret,env=process.env,invalidate=()=>{}}){
 app.get('/api/commerce/config',(_req,res)=>res.set('Cache-Control','no-store').json(commerceConfig(env)));
 app.post('/api/commerce/checkout',limiter,requireAuth,wrap(async(req,res)=>{
  const config=commerceConfig(env);const kind=req.body?.kind;
  if(!['premium','oneCharacter','special'].includes(kind))throw fail(400,'Choose a product.');
  if(!config.shopId||!config.shopUrl||!config.products[kind])throw fail(503,'The store is not open yet.');
  const ticket=jwt.sign({sub:req.auth.sub,v:req.auth.v,kind:'commerce'},secret,{algorithm:'HS256',expiresIn:'2h'});
  res.json({shopId:config.shopId,shopUrl:config.shopUrl,cart:[{productId:config.products[kind],quantity:1}],metadata:{tourn_checkout:ticket},theme:'dark',returnUrl:config.shopUrl?String(env.FRONTEND_URL||'https://tourn.lol').split(',')[0]+'/#/dashboard/billing':undefined});
 }));
 app.post('/api/commerce/redeem',limiter,requireAuth,wrap(async(req,res)=>{
  const code=typeof req.body?.code==='string'?req.body.code.trim().toUpperCase():'';if(!/^TOURN-[A-F0-9]{32}$/.test(code))throw fail(400,'Enter the complete TOURN code from your purchase.');
  const db=await pool.connect();try{await db.query('begin');const reward=await redeemCommerceCode(db,code,req.auth.sub);await db.query('commit');invalidate();res.json({ok:true,reward});}catch(error){await db.query('rollback');throw error;}finally{db.release();}
 }));
 app.get('/api/commerce/purchases',requireAuth,wrap(async(req,res)=>{const {rows}=await pool.query('select kind,handle,redeemed_at from commerce_codes where redeemed_by=$1 order by redeemed_at desc',[req.auth.sub]);res.json({purchases:rows});}));
 app.post('/api/admin/commerce/codes',limiter,requireAdmin,wrap(async(req,res)=>{
  const {kind,handle}=req.body||{};const count=Number(req.body?.count||1);
  if(!['premium','username'].includes(kind)||!Number.isInteger(count)||count<1||count>50)throw fail(400,'Choose a reward and a count from 1 to 50.');
  if(kind==='username'&&(count!==1||typeof handle!=='string'||[...handle].length!==1||!/^([a-z0-9]|\p{S})$/u.test(handle)||/[<>]/.test(handle)))throw fail(400,'Use one letter, number or symbol per username code.');
  const db=await pool.connect();try{await db.query('begin');if(kind==='username'){const taken=(await db.query('select id from users where username=$1 or alias=$1 or alias2=$1 limit 1',[handle])).rows;if(taken.length)throw fail(409,'This username is already claimed.');const owned=(await db.query('select owner_id from username_inventory where handle=$1',[handle])).rows[0];if(owned?.owner_id)throw fail(409,'This username is already owned.');const existing=(await db.query('select digest from commerce_codes where handle=$1',[handle])).rows;if(existing.length)throw fail(409,'A code already exists for this username.');}const codes=[];for(let n=0;n<count;n++)codes.push((await issueCommerceCode(db,kind,kind==='username'?handle:null,secret)).code);await db.query('commit');res.json({codes});}catch(error){await db.query('rollback');throw error;}finally{db.release();}
 }));
}
