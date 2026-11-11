import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
const source=await readFile(new URL('../backends/index.js',import.meta.url),'utf8');
test('profile updates archive raw documents transactionally; conflicts cannot erase history; restores retain current version',async()=>{
 const db=new PGlite();await db.exec('create table users(id uuid primary key);create table profiles(user_id uuid primary key references users(id),data jsonb,revision bigint,updated_at timestamptz);');
 const history=source.slice(source.indexOf('create table if not exists profile_history ('),source.indexOf('create table if not exists profiles ('));
 await db.exec(history);const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';await db.query('insert into users values($1),($2)',[id,other]);
 const routes=new Map();const pool={query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}})};
 const sandbox={pool,app:{put:(path,...handlers)=>routes.set('PUT '+path,handlers.at(-1)),get:(path,...handlers)=>routes.set('GET '+path,handlers.at(-1))},express:{json:()=>()=>{}},requireAuth:()=>{},profilePageCache:new Map(),PROFILE_WRITE_SECTIONS:new Set(['about','widgets','badges','links']),PROFILE_JSON_LIMIT:'36mb',PROFILE_DOCUMENT_LIMIT:32_000_000,PROFILE_HISTORY_LIMIT:5};vm.createContext(sandbox);
 const start=source.indexOf('app.put("/api/profile",');const end=source.indexOf('\n});',start)+5;vm.runInContext(source.slice(start,end),sandbox);
 const hs=source.indexOf("app.get('/api/profile/history'");const he=source.indexOf('app.get("/api/profile/:handle"',hs);vm.runInContext(source.slice(hs,he),sandbox);
 async function request(route,body={},user=id,params={}){let status=200,value;const res={status(code){status=code;return this},set(){return this},json(data){value=data;return this}};await routes.get(route)({auth:{sub:user},body,params},res);return {status,value};}
 const initial={about:{displayName:'Keep my art',assets:{card:{color:'#12ab34'},background:{imageUrl:'data:image/png;base64,original'}}},widgets:{widgets:[{id:'widget1',platform:'discord',options:{compact:true}}]},links:{links:[{id:'link1',url:'https://example.com'}]},badges:{equipped:[]},futureField:{preserve:true}};
 let result=await request('PUT /api/profile',{data:initial,baseRevision:0});assert.equal(result.status,200);assert.equal(result.value.revision,1);
 result=await request('PUT /api/profile',{data:{widgets:{widgets:[]}},baseRevision:1,sections:['widgets']});assert.equal(result.value.revision,2);
 let historyRows=await request('GET /api/profile/history');assert.equal(historyRows.value.history.length,1);assert.equal(historyRows.value.history[0].widgets,1);
 const old=await request('GET /api/profile/history/:revision',{},id,{revision:'1'});assert.deepEqual(old.value.data,initial);
 result=await request('PUT /api/profile',{data:{about:{}},baseRevision:1,sections:['about']});assert.equal(result.status,409);assert.equal(result.value.profile.about.displayName,'Keep my art');
 assert.equal((await request('GET /api/profile/history',{},other)).value.history.length,0);assert.equal((await request('GET /api/profile/history/:revision',{},other,{revision:'1'})).status,404);
 result=await request('PUT /api/profile',{data:old.value.data,baseRevision:2,sections:['about','widgets','links','badges']});assert.equal(result.value.revision,3);
 const current=await db.query('select data from profiles where user_id=$1',[id]);assert.deepEqual(current.rows[0].data,initial);
 const savedBeforeRestore=await request('GET /api/profile/history/:revision',{},id,{revision:'2'});assert.deepEqual(savedBeforeRestore.value.data.widgets.widgets,[]);assert.equal(savedBeforeRestore.value.data.links.links.length,1);
 // A realistic page with embedded art can exceed the old 7.5 MB cap after
 // base64 encoding. Those saves must still persist.
 const largeBio='x'.repeat(9_000_000);
 result=await request('PUT /api/profile',{data:{about:{bio:largeBio}},baseRevision:3,sections:['about']});assert.equal(result.status,200);assert.equal(result.value.revision,4);
 let large=await db.query('select data from profiles where user_id=$1',[id]);assert.equal(large.rows[0].data.about.bio.length,largeBio.length);
 // History is useful but must never block publishing the live document.
 await db.exec('drop table profile_history');
 result=await request('PUT /api/profile',{data:{links:{links:[{id:'new',url:'https://example.org'}]}},baseRevision:4,sections:['links']});assert.equal(result.status,200);assert.equal(result.value.revision,5);
 large=await db.query('select data from profiles where user_id=$1',[id]);assert.equal(large.rows[0].data.links.links[0].url,'https://example.org');assert.equal(large.rows[0].data.about.bio.length,largeBio.length);
 // A full-document write without a sections list must still preserve the
 // sections the client omitted. This is the fallback older clients use.
 result=await request('PUT /api/profile',{data:{about:{bio:'replacement'}},baseRevision:5});assert.equal(result.status,200);assert.equal(result.value.revision,6);
 const full=await db.query('select data from profiles where user_id=$1',[id]);assert.equal(full.rows[0].data.about.bio,'replacement');assert.equal(full.rows[0].data.links.links[0].url,'https://example.org');
 // History keeps only the newest five undo points for each account.
 await db.exec(history);
 const cappedId='00000000-0000-4000-8000-000000000003';await db.query('insert into users values($1)',[cappedId]);
 for(let revision=1;revision<=7;revision++){result=await request('PUT /api/profile',{data:{about:{bio:`version ${revision}`}},baseRevision:revision-1,sections:['about']},cappedId);assert.equal(result.status,200);assert.equal(result.value.revision,revision);}
 const capped=await request('GET /api/profile/history',{},cappedId);assert.equal(capped.value.history.length,5);assert.deepEqual(capped.value.history.map((row)=>Number(row.revision)),[6,5,4,3,2]);
 await db.close();
});
