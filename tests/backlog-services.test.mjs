import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {aliasAvailability} from '../backends/aliasAvailability.js';
import {leaderboard} from '../backends/leaderboard.js';
import {readProviderProduct} from '../backends/marketplaceProvider.js';
let db;
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
before(async()=>{db=new PGlite();await db.exec(`create table users(id uuid primary key,username text,alias text,avatar_url text,created_at timestamptz default now());create table username_inventory(handle text,owner_id uuid);create table profile_views(username text,views int);create table profile_reactions(username text,kind text);create table profile_view_events(username text,created_at timestamptz);`);await db.query("insert into users(id,username,alias,created_at) values($1,'alpha','first',now()-interval '100 days'),($2,'beta','taken',now()-interval '90 days')",[id,other]);await db.exec("insert into username_inventory values('owned','00000000-0000-4000-8000-000000000002');insert into profile_views values('alpha',100),('beta',200);insert into profile_reactions values('alpha','like');insert into profile_view_events values('alpha',now()-interval '1 day'),('alpha',now()-interval '2 days'),('beta',now()-interval '3 days'),('beta',now()-interval '8 days'),('beta',now()-interval '9 days'),('beta',now()-interval '15 days');");});
after(()=>db.close());
test('availability honors names, reserved words, Discord identity and owned inventory',async()=>{
 const user={id,discord_username:'discordname',alias_updated_at:'2026-11-24T00:00:00Z'},reserved=new Set(['admin']);
 for(const value of ['ab','a_b','admin','discordname','beta','owned'])assert.equal((await aliasAvailability(db,user,value,reserved)).available,false,value);
 assert.equal((await aliasAvailability(db,user,'first',reserved)).available,true);
 assert.equal((await aliasAvailability(db,user,'available',reserved)).available,true);
 const result=await aliasAvailability(db,user,'taken',reserved);assert(result.suggestions.length>0);assert(result.suggestions.every(name=>/^[a-z0-9]{3,24}$/.test(name)));assert.equal(result.nextChangeAt,'2026-11-26T00:00:00.000Z');
});
test('period leaderboard uses actual visits and computes changes only with sufficient history',async()=>{
 const lifetime=await leaderboard(db,{});assert.equal(lifetime.profiles[0].username,'beta');assert.equal(lifetime.profiles[0].views,200);assert.equal(lifetime.profiles[0].rankChange,null);
 const week=await leaderboard(db,{period:'7d'});assert.equal(week.profiles[0].username,'alpha');assert.equal(week.profiles[0].views,2);assert.equal(week.profiles[1].rankChange,-1);assert.equal(week.profiles[0].rankChange,null,'no previous visits is not an invented previous rank');
 const month=await leaderboard(db,{period:'30d'});assert.equal(month.profiles[0].username,'beta');assert.equal(month.profiles[0].rankChange,null,'not enough recorded history to compare 30-day periods');
 const likes=await leaderboard(db,{sort:'likes',period:'7d'});assert.equal(likes.period,'all');assert.equal(likes.profiles[0].username,'alpha');
 assert.equal((await leaderboard(db,{period:'7d',offset:99})).total,2);
});
test('empty period leaderboard returns an honest empty result',async()=>{await db.exec("update profile_view_events set created_at=now()-interval '100 days'");const result=await leaderboard(db,{period:'7d'});assert.deepEqual(result.profiles,[]);assert.equal(result.total,0);});
test('provider checks use a fixed official host and never return API secrets or deliverables',async()=>{
 const env={SELLAUTH_API_KEY:'fixture-secret',SELLAUTH_SHOP_ID:'123'};
 let request;
 const fetcher=async(url,options)=>{request={url,options};return {ok:true,json:async()=>({id:10,currency:'USD',visibility:'public',deliverables:'never return this',variants:[{id:20,price:'4.99',stock:3,visibility:'public'}]})};};
 const result=await readProviderProduct({productId:10,variantId:20},env,fetcher);assert.equal(result.price_cents,499);assert.equal(result.stock,3);assert.equal(result.visible,true);assert.equal(request.url,'https://api.sellauth.com/v1/shops/123/products/10');assert.equal(request.options.headers.Authorization,'Bearer fixture-secret');assert(!JSON.stringify(result).includes('fixture-secret'));assert(!JSON.stringify(result).includes('deliverables'));
 await assert.rejects(readProviderProduct({productId:10,variantId:20},{},fetcher),/SELLAUTH_API_KEY/);
 await assert.rejects(readProviderProduct({productId:10,variantId:21},env,fetcher),/no longer exists/);
 const unknown=await readProviderProduct({productId:10,variantId:20},env,async()=>({ok:true,json:async()=>({id:10,currency:'USD',variants:[{id:20,price:'4.99',stock:null}]})}));assert.equal(unknown.stock,undefined,'unknown stock is never invented as unlimited');
});
