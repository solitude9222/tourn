import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {MARKETPLACE_SCHEMA,validateProduct,providerMapping,registerMarketplaceRoutes} from '../backends/marketplace.js';
import {COMMERCE_SCHEMA,registerSellAuthDelivery,registerSellAuthRoutes} from '../backends/commerce.js';
import {SINGLE_ALIAS_SCHEMA,needsPrimaryAlias} from '../backends/singleAlias.js';
const require=createRequire(new URL('../backends/package.json',import.meta.url)),express=require('express'),jwt=require('jsonwebtoken');
const id='00000000-0000-4000-8000-000000000001',second='00000000-0000-4000-8000-000000000002',secret='test-only-signing-secret';
let db,pool,server,base;
const env={SELLAUTH_SHOP_ID:'123',SELLAUTH_SHOP_URL:'https://shop.example',SELLAUTH_WEBHOOK_SECRET:'test-webhook',SELLAUTH_PREMIUM_PRODUCT_ID:'99',TOURN_PRODUCT_SUMMER:'121:232'};
const product=(extra={})=>({id:'summer',title:'Summer badge',description:'A seasonal profile badge',image_url:'',price_cents:399,currency:'USD',reward:'badge',badge_id:'summer',checkout_env:'TOURN_PRODUCT_SUMMER',stock:3,enabled:true,...extra});
const call=async(path,{body,method=body?'POST':'GET',admin=false,auth=true,raw=false,headers={}}={})=>{
 const response=await fetch(base+path,{method,headers:{...(raw?{}:{'Content-Type':'application/json'}),...(auth?{'x-user':id}:{}),...(admin?{'x-admin':'yes'}:{}),...headers},body:body===undefined?undefined:raw?body:JSON.stringify(body)});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:response.status,data};
};
before(async()=>{
 db=new PGlite();pool={query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}})};
 await db.exec(`create table users(id uuid primary key,username text unique,alias text unique,alias2 text unique,alias_required boolean default false,alias2_updated_at timestamptz,premium boolean default false,badges jsonb default '[]',token_version integer default 0);create table username_inventory(handle text primary key,owner_id uuid,acquired_at timestamptz,listed boolean default false);`+COMMERCE_SCHEMA+MARKETPLACE_SCHEMA);
 const app=express(),requireAuth=(req,res,next)=>{if(!req.get('x-user'))return res.status(401).json({error:'Sign in.'});req.auth={sub:req.get('x-user'),v:0};next();},requireAdmin=(req,res,next)=>req.get('x-admin')==='yes'?next():res.status(403).json({error:'Admins only.'}),limiter=(_req,_res,next)=>next();
 registerSellAuthDelivery(app,{pool,rawParser:express.raw({type:'application/json'}),jwt,secret,env});
 app.use(express.json());registerMarketplaceRoutes(app,{pool,requireAuth,requireAdmin,limiter,jwt,secret,env});registerSellAuthRoutes(app,{pool,requireAuth,requireAdmin,limiter,jwt,secret,env});
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;
});
beforeEach(async()=>{
 await db.exec('truncate marketplace_audit,commerce_deliveries,commerce_codes,marketplace_products,username_inventory,users cascade');
 await db.query("insert into users(id,username,alias) values($1,'first','chosen'),($2,'second','chosen2')",[id,second]);
 delete env.TOURN_PRODUCT_DUPLICATE;env.TOURN_PRODUCT_SUMMER='121:232';
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
test('single alias migration clears secondary values, marks missing primary aliases, and preserves inventory',async()=>{
 await db.query("update users set alias=null,alias2='old-secondary',alias2_updated_at=now() where id=$1",[id]);
 await db.query("insert into username_inventory(handle,owner_id) values('a',$1)",[id]);
 await db.exec(SINGLE_ALIAS_SCHEMA);await db.exec(SINGLE_ALIAS_SCHEMA);
 const user=(await db.query('select * from users where id=$1',[id])).rows[0];assert.equal(user.alias2,null);assert.equal(user.alias2_updated_at,null);assert.equal(user.alias_required,true);
 assert.equal((await db.query('select owner_id from username_inventory')).rows[0].owner_id,id);
});
test('only product-prefixed keys and positive safe provider IDs can be resolved',()=>{
 assert.deepEqual(providerMapping('TOURN_PRODUCT_SUMMER',env),{productId:121,variantId:232});
 for(const value of ['0:2','1:0','1:2:3','Infinity:2','9007199254740992:2','{"productId":1}',' 1:2'])assert.equal(providerMapping('TOURN_PRODUCT_TEST',{TOURN_PRODUCT_TEST:value}),null);
 assert.equal(providerMapping('SELLAUTH_WEBHOOK_SECRET',env),null);
});
test('validation rejects role badges, hostile images, fractional prices, invalid stock and env names',()=>{
 for(const patch of [{badge_id:'owner'},{badge_id:'administrator'},{image_url:'javascript:alert(1)'},{image_url:'https://a:b@example.com/x'},{price_cents:1.5},{stock:-1},{checkout_env:'DATABASE_URL'},{enabled:'true'}])assert.throws(()=>validateProduct(product(patch)));
 assert.equal(validateProduct(product({checkout_env:'',stock:null})).checkout_env,'TOURN_PRODUCT_SUMMER');
});
test('Admin permissions protect catalog writes and unpublished products are private',async()=>{
 assert.equal((await call('/api/admin/marketplace/products',{body:product()})).status,403);
 const created=await call('/api/admin/marketplace/products',{body:product({enabled:false}),admin:true});assert.equal(created.status,201);
 assert.equal((await call('/api/marketplace/products',{auth:false})).data.products.length,0);
 assert.equal((await call('/api/admin/marketplace/products',{admin:true})).data.products[0].checkout_env,'TOURN_PRODUCT_SUMMER');
});
test('public products omit backend keys and checkout ignores client price/provider fields',async()=>{
 await call('/api/admin/marketplace/products',{body:product(),admin:true});
 const listed=(await call('/api/marketplace/products',{auth:false})).data.products[0];assert.equal(listed.ready,true);assert.equal(listed.checkout_env,undefined);
 const checkout=await call('/api/marketplace/checkout',{body:{productId:'summer',price_cents:1,variantId:999}});assert.equal(checkout.status,200);assert.deepEqual(checkout.data.cart,[{productId:121,variantId:232,quantity:1}]);
 const ticket=jwt.verify(checkout.data.metadata.tourn_checkout,secret);assert.equal(ticket.catalogId,'summer');assert.equal(ticket.sub,id);
 assert.equal((await db.query('select badges from users where id=$1',[id])).rows[0].badges.length,0,'checkout never grants a reward');
});
test('unconfigured, sold out, unpublished and alias-less accounts cannot check out',async()=>{
 await call('/api/admin/marketplace/products',{body:product(),admin:true});
 delete env.TOURN_PRODUCT_SUMMER;assert.equal((await call('/api/marketplace/checkout',{body:{productId:'summer'}})).status,503);env.TOURN_PRODUCT_SUMMER='121:232';
 await db.query("update marketplace_products set stock=0 where id='summer'");assert.equal((await call('/api/marketplace/checkout',{body:{productId:'summer'}})).status,409);
 await db.query("update marketplace_products set stock=2,enabled=false where id='summer'");assert.equal((await call('/api/marketplace/checkout',{body:{productId:'summer'}})).status,404);
 await db.query("update marketplace_products set enabled=true where id='summer'");await db.query('update users set alias_required=true where id=$1',[id]);assert.equal((await call('/api/marketplace/checkout',{body:{productId:'summer'}})).status,409);
 assert.equal((await call('/api/marketplace/checkout',{body:{productId:'summer'},auth:false})).status,401);
});
test('duplicate provider mappings and changes to delivery semantics are rejected',async()=>{
 await call('/api/admin/marketplace/products',{body:product(),admin:true});env.TOURN_PRODUCT_DUPLICATE='121:232';
 assert.equal((await call('/api/admin/marketplace/products',{body:product({id:'duplicate',checkout_env:'TOURN_PRODUCT_DUPLICATE'}),admin:true})).status,409);
 assert.equal((await call('/api/admin/marketplace/products/summer',{method:'PATCH',body:product({badge_id:'easter'}),admin:true})).status,409);
 assert.equal((await call('/api/admin/marketplace/products/summer',{method:'PATCH',body:product({title:'New title',stock:8}),admin:true})).status,200);
});
test('retired character and old-cart checkout routes reject purchases',async()=>{
 for(const body of [{kind:'oneCharacter',handle:'a'},{kind:'special',handle:'1'},{kind:'badge',badge:'summer'},{items:[{type:'letter',handle:'a'}]}])assert.equal((await call('/api/commerce/checkout',{body})).status,410);
 assert.equal((await call('/api/commerce/checkout',{body:{kind:'premium'}})).status,200);
});
const deliver=async(payload,valid=true)=>{const raw=JSON.stringify(payload),signature=crypto.createHmac('sha256',env.SELLAUTH_WEBHOOK_SECRET).update(raw).digest('hex');return call('/api/commerce/sellauth/delivery',{body:raw,raw:true,headers:{'Content-Type':'application/json','x-signature':valid?signature:'0'.repeat(64)}});};
test('signed paid delivery grants the catalog badge once, updates stock once and supports different buyers',async()=>{
 await call('/api/admin/marketplace/products',{body:product(),admin:true});
 const checkout=await call('/api/marketplace/checkout',{body:{productId:'summer'}});
 const payload={event:'INVOICE.ITEM.DELIVER-DYNAMIC',shop_id:123,id:'invoice-1',status:'completed',item:{id:'item-1',quantity:1,product_id:121,variant_id:232},metadata:checkout.data.metadata};
 assert.equal((await deliver(payload,false)).status,401);
 assert.equal((await deliver({...payload,status:'pending'})).status,400);
 assert.equal((await db.query('select badges from users where id=$1',[id])).rows[0].badges.length,0);
 const paid=await deliver(payload);assert.equal(paid.status,200);assert.match(paid.data,/^TOURN-/);
 assert.deepEqual((await db.query('select badges from users where id=$1',[id])).rows[0].badges,['summer']);
 assert.equal((await deliver(payload)).data,paid.data);assert.equal((await db.query('select stock from marketplace_products')).rows[0].stock,2);
 const secondTicket=jwt.sign({sub:second,v:0,kind:'commerce',catalogId:'summer'},secret);
 assert.equal((await deliver({...payload,id:'invoice-2',item:{...payload.item,id:'item-2'},metadata:{tourn_checkout:secondTicket}})).status,200);
 assert.deepEqual((await db.query('select badges from users where id=$1',[second])).rows[0].badges,['summer']);
 assert.equal((await db.query('select stock from marketplace_products')).rows[0].stock,1);
});
test('delivery fallback yields a redeemable code without attaching a wrong catalog ticket',async()=>{
 await call('/api/admin/marketplace/products',{body:product(),admin:true});
 const payload={event:'INVOICE.ITEM.DELIVER-DYNAMIC',shop_id:123,id:'invoice-3',status:'completed',item:{id:'item-3',quantity:1,product_id:121,variant_id:232},metadata:{tourn_checkout:jwt.sign({sub:id,v:0,kind:'commerce',catalogId:'wrong'},secret)}};
 const result=await deliver(payload);assert.equal(result.status,200);assert.deepEqual((await db.query('select badges from users where id=$1',[id])).rows[0].badges,[]);
 assert.equal((await call('/api/commerce/redeem',{body:{code:result.data}})).status,200);
 assert.deepEqual((await db.query('select badges from users where id=$1',[id])).rows[0].badges,['summer']);
});

test('pending primary-alias choices block writes even when a temporary alias exists',()=>{
 for(const user of [null,{alias:null},{alias:' '},{alias:'temporary',alias_required:true}])assert.equal(needsPrimaryAlias(user),true);
 assert.equal(needsPrimaryAlias({alias:'chosen',alias_required:false}),false);
});
test('legacy paid character orders still fulfill after storefront retirement',async()=>{
 const ticket=jwt.sign({sub:id,v:0,kind:'commerce',handle:'☿'},secret);
 const result=await deliver({event:'INVOICE.ITEM.DELIVER-DYNAMIC',shop_id:123,id:'old-invoice',status:'completed',item:{id:'old-item',quantity:1,product_id:994091,variant_id:2079173},metadata:{tourn_checkout:ticket}});
 assert.equal(result.status,200);assert.equal((await db.query('select owner_id from username_inventory where handle=$1',['☿'])).rows[0].owner_id,id);
 assert.equal((await db.query('select alias from users where id=$1',[id])).rows[0].alias,'☿');
});

test('scheduled products stay private until their publication time and catalog edits are audited',async()=>{
 const future=new Date(Date.now()+86400000).toISOString();
 assert.equal((await call('/api/admin/marketplace/products',{body:product({publish_at:future,sort_order:5}),admin:true})).status,201);
 assert.equal((await call('/api/marketplace/products',{auth:false})).data.products.length,0);
 assert.equal((await call('/api/marketplace/checkout',{body:{productId:'summer'}})).status,404);
 assert.equal((await call('/api/admin/marketplace/audit',{admin:false})).status,403);
 const events=(await call('/api/admin/marketplace/audit',{admin:true})).data.events;assert.equal(events.length,1);assert.equal(events[0].action,'created');assert.equal(events[0].product_id,'summer');
 await db.query("update marketplace_products set publish_at=now()-interval '1 hour'");assert.equal((await call('/api/marketplace/products',{auth:false})).data.products[0].sort_order,5);
 assert.equal((await call('/api/admin/marketplace/health',{admin:true})).data.providerChecksConfigured,false);
 assert.equal((await call('/api/admin/marketplace/products/summer/provider-check',{body:{},admin:true})).status,503);
});
