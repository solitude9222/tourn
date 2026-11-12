import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { MARKET_SCHEMA, fulfillUsername, registerUsernameMarket, freeHandleValid, priceValid, stockHandleValid, recoverCheckout, releaseExpired } from '../backends/usernames.js';
let db, pool, routes;
const owner='00000000-0000-4000-8000-000000000001', recipient='00000000-0000-4000-8000-000000000002', order='00000000-0000-4000-8000-000000000003';
before(async()=>{
 db=new PGlite();pool={query:(...a)=>db.query(...a),connect:async()=>({query:(...a)=>db.query(...a),release(){}})};
 await db.exec('create table users(id uuid primary key,username text unique,alias text unique,alias2 text unique);'+MARKET_SCHEMA);
 routes=new Map();const app={get:(path,...handlers)=>routes.set('GET '+path,handlers),post:(path,...handlers)=>routes.set('POST '+path,handlers)};
 registerUsernameMarket(app,{pool,stripe:null,requireAuth:()=>{},requireAdmin:()=>{},limiter:()=>{},origin:'https://tourn.lol',invalidate(){}});
});
beforeEach(async()=>{
 await db.exec('truncate username_transfers,username_inventory,users cascade');
 await db.query("insert into users(id,username) values($1,'sender'),($2,'receiver')",[owner,recipient]);
 await db.query("insert into username_inventory(handle,checkout_id,buyer_id,order_id,price_cents) values('a','cs_paid',$1,$2,500)",[owner,order]);
});
after(()=>db.close());
const paid=(extra={})=>({id:'cs_paid',payment_status:'paid',amount_total:500,currency:'usd',metadata:{kind:'username',userId:owner,handle:'a',orderId:order},...extra});
const call=async(path,body={},sub=owner)=>{let status=200,payload;const res={status(n){status=n;return this;},json(value){payload=value;return this;}};await routes.get('POST '+path).at(-1)({auth:{sub},body},res);return {status,payload};};
test('free claims exclude single characters, punctuation, unicode and overlong names',()=>{
 for(const handle of ['a','ab','♥','a.b','a_b','a-b','abc!','x'.repeat(25)])assert.equal(freeHandleValid(handle),false,handle);
 assert.equal(freeHandleValid('player123'),true);
});
test('stock prices require whole cents and stock handles must be one safe character',()=>{
 for(const price of [0,49,50.5,NaN,'500',100000000])assert.equal(priceValid(price),false);
 assert.equal(priceValid(500),true);assert.equal(stockHandleValid('♥'),true);assert.equal(stockHandleValid('a'),true);
 for(const handle of ['abc','/','?','<',' ','\n'])assert.equal(stockHandleValid(handle),false);
});
test('only verified paid orders grant ownership and activate account address',async()=>{
 await fulfillUsername(pool,paid({payment_status:'unpaid'}));assert.equal((await db.query('select owner_id from username_inventory')).rows[0].owner_id,null);
 await fulfillUsername(pool,paid());assert.equal((await db.query('select owner_id from username_inventory')).rows[0].owner_id,owner);
 assert.equal((await db.query('select alias from users where id=$1',[owner])).rows[0].alias,'a');
 await fulfillUsername(pool,paid());assert.equal((await db.query('select count(*)::int as n from username_inventory')).rows[0].n,1);
});
test('mismatched price or buyer rolls back ownership',async()=>{
 await assert.rejects(fulfillUsername(pool,paid({amount_total:1})),/amount/);
 await assert.rejects(fulfillUsername(pool,paid({metadata:{kind:'username',handle:'a',orderId:order,userId:recipient}})),/mismatch/);
 assert.equal((await db.query('select owner_id from username_inventory')).rows[0].owner_id,null);
});
test('unowned activation and gifting are rejected',async()=>{
 assert.equal((await call('/api/account/aliases/activate',{handle:'a'},recipient)).status,403);
 assert.equal((await call('/api/account/aliases/gift',{handle:'a',recipient:'receiver',confirmRecipient:'receiver'},recipient)).status,403);
});
test('gift requires confirmation, transfers ownership and removes sender address; webhook replay cannot reclaim it',async()=>{
 await fulfillUsername(pool,paid());
 assert.equal((await call('/api/account/aliases/gift',{handle:'a',recipient:'receiver',confirmRecipient:'wrong'})).status,400);
 assert.equal((await call('/api/account/aliases/gift',{handle:'a',recipient:'receiver',confirmRecipient:'receiver'})).status,200);
 assert.equal((await db.query('select alias from users where id=$1',[owner])).rows[0].alias,null);
 assert.equal((await db.query('select owner_id from username_inventory')).rows[0].owner_id,recipient);
 await fulfillUsername(pool,paid());assert.equal((await db.query('select owner_id from username_inventory')).rows[0].owner_id,recipient);
 assert.equal((await call('/api/account/aliases/activate',{handle:'a'},recipient)).status,200);
 assert.equal((await db.query('select alias from users where id=$1',[recipient])).rows[0].alias,'a');
 assert.equal((await db.query('select count(*)::int as n from username_transfers')).rows[0].n,1);
});
test('checkout refuses purchases while provider configuration is missing',async()=>{
 assert.equal((await call('/api/market/checkout',{handle:'a'})).status,503);
 assert.equal((await call('/api/market/checkout',{handle:'not-for-sale'})).status,400);
});

test('admin controls real stock and prices; unpublished stock stays hidden and held stock cannot be edited',async()=>{
 assert.equal((await call('/api/admin/usernames',{handle:'♥',priceCents:1250,listed:false})).status,200);
 assert.equal((await db.query("select price_cents from username_inventory where handle='♥'")).rows[0].price_cents,1250);
 let payload;await routes.get('GET /api/market/usernames').at(-1)({}, {json(value){payload=value;}});
 assert.equal(payload.items.length,0);
 assert.equal((await call('/api/admin/usernames',{handle:'♥',priceCents:1500,listed:true})).status,200);
 await routes.get('GET /api/market/usernames').at(-1)({}, {json(value){payload=value;}});
 assert.equal(payload.items.length,1);assert.equal(payload.items[0].handle,'♥');assert.equal(payload.items[0].priceCents,1500);assert.equal(payload.items[0].available,true);
 assert.equal((await call('/api/admin/usernames',{handle:'a',priceCents:50,listed:true})).status,409);
 await fulfillUsername(pool,paid());assert.equal((await call('/api/admin/usernames',{handle:'a',priceCents:50,listed:true})).status,409);
});
test('checkout uses admin price, reserves unique stock and reuses buyer checkout',async()=>{
 await fulfillUsername(pool,paid());
 const previous=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET='test-only';
 let checkoutInput,creates=0;
 const stripe={checkout:{sessions:{create:async input=>{checkoutInput=input;creates++;return {id:'cs_new',url:'https://checkout.stripe.com/test'};},retrieve:async()=>({id:'cs_new',status:'open',url:'https://checkout.stripe.com/test'})}}};
 const local=new Map();const app={get:(p,...h)=>local.set('GET '+p,h),post:(p,...h)=>local.set('POST '+p,h)};
 const auth=()=>{},admin=()=>{};registerUsernameMarket(app,{pool,stripe,requireAuth:auth,requireAdmin:admin,limiter:()=>{},origin:'https://tourn.lol',invalidate(){}});
 assert.equal(local.get('POST /api/market/checkout').includes(auth),true);assert.equal(local.get('POST /api/admin/usernames').includes(admin),true);
 const checkout=async(sub,handle)=>{let status=200,payload;await local.get('POST /api/market/checkout').at(-1)({auth:{sub},body:{handle,priceCents:1}},{status(n){status=n;return this;},json(x){payload=x;}});return {status,payload};};
 try{
   await call('/api/admin/usernames',{handle:'b',priceCents:2500,listed:true});
   assert.equal((await checkout(owner,'b')).status,200);assert.equal(checkoutInput.line_items[0].price_data.unit_amount,2500);
   assert.equal((await checkout(owner,'b')).status,200);assert.equal(creates,1);
   assert.equal((await checkout(recipient,'b')).status,409);
   assert.equal((await checkout(recipient,'c')).status,404);
   assert.equal((await db.query("select owner_id from username_inventory where handle='b'")).rows[0].owner_id,null);
 }finally{if(previous===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=previous;}
});

test('public stock reads do not call Stripe or expose order and buyer identifiers',async()=>{
 let calls=0,payload;const local=new Map();const app={get:(p,...h)=>local.set('GET '+p,h),post:(p,...h)=>local.set('POST '+p,h)};
 registerUsernameMarket(app,{pool,stripe:{checkout:{sessions:{retrieve:async()=>{calls++;throw Error('unexpected');}}}},requireAuth(){},requireAdmin(){},limiter(){},origin:'https://tourn.lol',invalidate(){}});
 await db.query("update username_inventory set listed=true where handle='a'");
 await local.get('GET /api/market/usernames').at(-1)({}, {set(){},json(x){payload=x;}});
 assert.equal(calls,0);assert.equal(payload.items[0].available,false);
 for(const key of ['owner_id','buyer_id','order_id','checkout_id','checkout_payload'])assert.equal(Object.hasOwn(payload.items[0],key),false);
});
test('one buyer cannot reserve a second username while an order is pending',async()=>{
 const before=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET='test';
 try{
 await call('/api/admin/usernames',{handle:'b',priceCents:500,listed:true});
 const local=new Map();const app={get:(p,...h)=>local.set(p,h),post:(p,...h)=>local.set(p,h)};
 registerUsernameMarket(app,{pool,stripe:{},requireAuth(){},requireAdmin(){},limiter(){},origin:'https://tourn.lol',invalidate(){}});
 let status=200;await local.get('/api/market/checkout').at(-1)({auth:{sub:owner},body:{handle:'b'}},{status(n){status=n;return this;},json(){}});
 assert.equal(status,409);assert.equal((await db.query("select order_id from username_inventory where handle='b'")).rows[0].order_id,null);
 }finally{if(before===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=before;}
});
test('a verified payment arriving before checkout persistence still grants the correct account exactly once',async()=>{
 await db.query("update username_inventory set checkout_id=null where handle='a'");
 await fulfillUsername(pool,paid());assert.equal((await db.query("select owner_id,checkout_id from username_inventory where handle='a'")).rows[0].owner_id,owner);
 assert.equal((await db.query("select checkout_id from username_inventory where handle='a'")).rows[0].checkout_id,'cs_paid');
});
test('ambiguous Stripe timeouts retain the durable order and retries reuse its exact idempotency key and payload',async()=>{
 await db.query("update username_inventory set checkout_id=null,checkout_payload=$1::jsonb where handle='a'",[JSON.stringify({metadata:{orderId:order},expires_at:2000000000})]);
 const item=(await db.query("select * from username_inventory where handle='a'")).rows[0];let calls=0;
 const stripe={checkout:{sessions:{create:async(payload,options)=>{calls++;assert.equal(options.idempotencyKey,order);assert.deepEqual(payload,item.checkout_payload);if(calls===1)throw new Error('Network timeout');return {id:'cs_recovered',status:'open',url:'https://checkout.stripe.com/test'};}}}};
 await assert.rejects(recoverCheckout(pool,stripe,item),/timeout/);
 assert.equal((await db.query("select order_id from username_inventory where handle='a'")).rows[0].order_id,order);
 await recoverCheckout(pool,stripe,item);assert.equal((await db.query("select checkout_id from username_inventory where handle='a'")).rows[0].checkout_id,'cs_recovered');
});
test('only a provider-confirmed expired session releases reserved inventory',async()=>{
 await releaseExpired(pool,{id:'cs_paid',status:'open'});assert.equal((await db.query("select order_id from username_inventory where handle='a'")).rows[0].order_id,order);
 await releaseExpired(pool,{id:'cs_paid',status:'expired'});assert.equal((await db.query("select order_id from username_inventory where handle='a'")).rows[0].order_id,null);
});

test('pending checkout reads and cancellation are scoped to the signed-in buyer',async()=>{
 const local=new Map();const app={get:(p,...h)=>local.set('GET '+p,h),post:(p,...h)=>local.set('POST '+p,h)};let expired=0;
 registerUsernameMarket(app,{pool,stripe:{checkout:{sessions:{retrieve:async()=>({id:'cs_paid',status:'open'}),expire:async id=>{expired++;return {id,status:'expired'};}}}},requireAuth(){},requireAdmin(){},limiter(req,res,next){next();},origin:'https://tourn.lol',invalidate(){}});
 let payload;const response={json(x){payload=x;},status(){return this;}};
 await local.get('GET /api/market/pending').at(-1)({auth:{sub:recipient}},response);assert.equal(payload.pending,null);
 await local.get('POST /api/market/cancel').at(-1)({auth:{sub:recipient},body:{handle:'a',buyerId:owner}},response);assert.equal(expired,0);
 assert.equal((await db.query("select order_id from username_inventory where handle='a'")).rows[0].order_id,order);
 await local.get('POST /api/market/cancel').at(-1)({auth:{sub:owner}},response);assert.equal(expired,1);
 assert.equal((await db.query("select order_id from username_inventory where handle='a'")).rows[0].order_id,null);
});
