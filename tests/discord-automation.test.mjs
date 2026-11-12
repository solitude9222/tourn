import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {PGlite} from '@electric-sql/pglite';
import {createDiscordAutomation,matchedRoleBadges,normalizeAutomation,DISCORD_AUTOMATION_SCHEMA,registerDiscordAutomation} from '../backends/discordAutomation.js';
const guild='111111111111111111',role='222222222222222222',discord='333333333333333333',userId='00000000-0000-4000-8000-000000000001';
let db,pool,config,roles,failure,service,requested;
before(async()=>{db=new PGlite();await db.exec(`create table users(id uuid primary key,discord_id text,badges jsonb);${DISCORD_AUTOMATION_SCHEMA}`);pool={query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}})};});
beforeEach(async()=>{
 await db.exec('truncate discord_badge_awards,users');await db.query('insert into users values($1,$2,$3)',[userId,discord,JSON.stringify(['verified'])]);
 config={enabled:true,guildId:guild,rules:[{id:'booster-role',roleId:role,badgeId:'booster',enabled:true,autoEquip:true}]};roles=[role];failure=null;requested=[];
 service=createDiscordAutomation({pool,readSetting:async()=>JSON.stringify(config),writeSetting:async(_key,value)=>{config=JSON.parse(value);},token:'fixture-token',defaultGuildId:guild,request:async path=>{
  requested.push(path);if(path==='/users/@me')return{id:'444444444444444444',username:'fixture-bot',avatar:null};if(path===`/guilds/${guild}`)return{id:guild,name:'Actual test server',icon:null};if(path.endsWith('/roles'))return[{id:guild,name:'@everyone',position:0,color:0},{id:role,name:'Real Booster role',position:4,color:16711935,managed:false,icon:null}];if(path.includes('/members/')){if(failure){const error=new Error('Discord fixture failure');error.status=failure;error.discordCode=failure===404?10007:0;throw error;}return{roles};}throw new Error('Unexpected request '+path);
 }});
});
after(async()=>{service.stop();await db.close();});
test('actual linked Discord roles award badges and auto-equip without changing account privileges',async()=>{
 const awarded=await service.syncUser({id:userId,discord_id:discord},true);assert.deepEqual(awarded,{eligible:['booster'],equip:['booster']});
 assert.equal((await db.query('select * from discord_badge_awards')).rows[0].badge_id,'booster');assert(requested.includes(`/guilds/${guild}/members/${discord}`));assert.deepEqual((await db.query('select badges from users')).rows[0].badges,['verified']);
});
test('role loss removes only managed awards; outages preserve previously verified awards',async()=>{
 await service.syncUser({id:userId,discord_id:discord},true);failure=503;assert.deepEqual((await service.syncUser({id:userId,discord_id:discord},true)).eligible,['booster']);
 failure=null;roles=[];assert.deepEqual((await service.syncUser({id:userId,discord_id:discord},true)).eligible,[]);assert.equal((await db.query('select * from discord_badge_awards')).rows.length,0);assert.deepEqual((await db.query('select badges from users')).rows[0].badges,['verified']);
});
test('leaving the server revokes awards and disabling automation stops grants',async()=>{
 await service.syncUser({id:userId,discord_id:discord},true);failure=404;assert.deepEqual((await service.syncUser({id:userId,discord_id:discord},true)).eligible,[]);
 failure=null;await service.save({...config,enabled:false},true);assert.deepEqual(await service.syncUser({id:userId,discord_id:discord},true),{eligible:[],equip:[]});
});
test('rule validation uses server role IDs and protects owner/staff badge mapping',async()=>{
 await assert.rejects(service.save({...config,rules:[{...config.rules[0],roleId:'999999999999999999'}]},true),/no longer exists/);
 await assert.rejects(service.save({...config,rules:[{...config.rules[0],badgeId:'not-real'}]},true),/listed badge/);
 await assert.rejects(service.save({...config,rules:[{...config.rules[0],badgeId:'owner'}]},false),/site owner/);
 const saved=await service.save({...config,rules:[{...config.rules[0],autoEquip:false}]},true);assert.equal(saved.rules[0].autoEquip,false);assert.deepEqual(await service.syncUser({id:userId,discord_id:discord},true),{eligible:['booster'],equip:[]});
});
test('role list and connection checks use Discord responses rather than placeholder names',async()=>{
 const status=await service.inspect();assert.equal(status.guild.name,'Actual test server');assert.equal(status.roles[0].name,'Real Booster role');assert.equal(status.roles[0].color,16711935);assert.equal(status.serverConnected,true);assert.equal(status.gatewayConnected,false);assert(status.inviteUrl.includes('client_id=444444444444444444'));
});
test('matching deduplicates badges and includes the real everyone role',()=>{
 const rules=normalizeAutomation({enabled:true,rules:[{roleId:role,badgeId:'booster'},{roleId:role,badgeId:'booster'},{roleId:guild,badgeId:'dc_indiscord',autoEquip:false}]});assert.deepEqual(matchedRoleBadges(rules,{present:true,roles:[role]},guild),{eligible:['booster','dc_indiscord'],equip:['booster']});
});
test('a persistent Gateway login reports the bot online in its configured server',async()=>{
 const gateway=new EventEmitter();let ready=false,loginToken=null;const cache=new Map([[guild,{id:guild,name:'Actual test server'}]]);cache.first=()=>cache.values().next().value;cache.map=fn=>[...cache.values()].map(fn);
 Object.assign(gateway,{guilds:{cache},isReady:()=>ready,login:async token=>{loginToken=token;ready=true;},destroy:()=>{ready=false;}});
 const connected=createDiscordAutomation({pool,readSetting:async()=>JSON.stringify(config),writeSetting:async()=>{},token:'fixture-token',defaultGuildId:guild,gatewayFactory:()=>gateway,request:async()=>({})});
 connected.start();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(loginToken,'fixture-token');assert.deepEqual(connected.connection(),{configured:true,gatewayConnected:true,serverConnected:true});connected.stop();assert.equal(connected.connection().gatewayConnected,false);
});

test('admin API protects real role lists and persists configured rules',async()=>{
 const require=createRequire(new URL('../backends/package.json',import.meta.url)),express=require('express'),app=express();app.use(express.json());registerDiscordAutomation(app,service,(req,res,next)=>{if(!req.get('x-admin'))return res.status(403).json({error:'Admins only'});req.user={is_owner:req.get('x-admin')==='owner'};next();});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{assert.equal((await fetch(base+'/api/admin/bot/automation')).status,403);const read=await fetch(base+'/api/admin/bot/automation',{headers:{'x-admin':'staff'}});const body=await read.json();assert.equal(body.roles[0].name,'Real Booster role');
 const next={...config,rules:[{...config.rules[0],autoEquip:false}]};const saved=await fetch(base+'/api/admin/bot/automation',{method:'PATCH',headers:{'x-admin':'owner','Content-Type':'application/json'},body:JSON.stringify(next)});assert.equal(saved.status,200);assert.equal((await saved.json()).config.rules[0].autoEquip,false);assert.equal(config.rules[0].autoEquip,false);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('relinking a different Discord account bypasses cached awards',async()=>{
 await service.syncUser({id:userId,discord_id:discord});roles=[];const other='555555555555555555';const result=await service.syncUser({id:userId,discord_id:other});assert.deepEqual(result.eligible,[]);assert(requested.includes(`/guilds/${guild}/members/${other}`));
});
