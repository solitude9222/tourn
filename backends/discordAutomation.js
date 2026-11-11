import { Client, Events, GatewayIntentBits } from 'discord.js';
export const DISCORD_AUTOMATION_SCHEMA=`create table if not exists discord_badge_awards (
 user_id uuid not null references users(id) on delete cascade,
 badge_id text not null,auto_equip boolean not null default true,verified_at timestamptz not null default now(),primary key(user_id,badge_id)
);`;
export const ROLE_BADGE_IDS=['owner','staff','verified','partner','donator','coder','bughunter','newbie','user','premium','booster','halloween_2026','christmas_2026','dc_indiscord'];
const snowflake=id=>typeof id==='string' && /^\d{16,20}$/.test(id);
export function normalizeAutomation(raw={}){
 return {enabled:raw.enabled!==false,guildId:snowflake(raw.guildId)?raw.guildId:'',rules:Array.isArray(raw.rules)?raw.rules.slice(0,50).map((rule,index)=>({id:String(rule.id||`rule-${index}`).slice(0,80),roleId:String(rule.roleId||''),badgeId:String(rule.badgeId||''),enabled:rule.enabled!==false,autoEquip:rule.autoEquip!==false})):[]};
}
export function matchedRoleBadges(config,member,guildId){
 if(!config.enabled || !member?.present)return {eligible:[],equip:[]};
 const roles=new Set([...member.roles,guildId]);const eligible=new Set(),equip=new Set();
 for(const rule of config.rules)if(rule.enabled && roles.has(rule.roleId)){eligible.add(rule.badgeId);if(rule.autoEquip)equip.add(rule.badgeId);}
 return {eligible:[...eligible],equip:[...equip]};
}
export function createDiscordAutomation({pool,readSetting,writeSetting,token,defaultGuildId='',applicationId='',request:injectedRequest,gatewayFactory,onChange=()=>{}}){
 token=String(token || '').trim();defaultGuildId=String(defaultGuildId || '').trim();
 let client=null,lastError=null,configCache=null,configAt=0,syncing=false,lastSync=null,lastSyncCount=0,timer=null,reconnect=null;
 const members=new Map(),awards=new Map();
 const request=injectedRequest || (async path=>{
  if(!token){const error=new Error('DISCORD_BOT_TOKEN is not configured.');error.status=503;throw error;}
  // discord.js handles Discord route buckets and Retry-After for every REST call.
  if(!client)throw new Error('Discord connection is starting.');
  try{return await client.rest.get(path);}catch(error){const failure=new Error(error.status===401?'Discord rejected the bot token.':error.status===403?'The bot does not have access to this server.':error.status===404?'The server or member was not found.':'Discord is temporarily unavailable.');failure.status=error.status;failure.discordCode=error.code;throw failure;}
 });
 async function config(){if(configCache && Date.now()-configAt<15000)return configCache;let raw={};try{raw=JSON.parse(await readSetting('discord_automation','{}'));}catch{}configCache=normalizeAutomation(raw);configAt=Date.now();return configCache;}
 async function guildId(){const saved=await config();return saved.guildId || defaultGuildId || (client?.guilds.cache.size===1?client.guilds.cache.first().id:'');}
 async function member(discordId,force=false){
  const guild=await guildId();if(!token || !guild || !snowflake(discordId))return null;
  const key=guild+':'+discordId,cached=members.get(key);if(!force && cached && Date.now()-cached.at<30000)return cached.value;
  try{const data=await request(`/guilds/${guild}/members/${discordId}`);const value={present:true,roles:Array.isArray(data.roles)?data.roles:[]};members.set(key,{at:Date.now(),value});return value;}
  catch(error){if(error.status===404 && error.discordCode===10007){const value={present:false,roles:[]};members.set(key,{at:Date.now(),value});return value;}lastError=error.message;members.set(key,{at:Date.now(),value:null});return null;}
 }
 async function syncUser(user,force=false){
  const saved=await config();if(!user?.discord_id || !saved.enabled)return {eligible:[],equip:[]};
  const cached=awards.get(user.id);if(!force && cached && cached.discordId===user.discord_id && Date.now()-cached.at<30000)return cached.value;
  const guild=await guildId(),details=await member(user.discord_id,force);
  const active=new Set(saved.rules.filter(rule=>rule.enabled).map(rule=>rule.badgeId));
  if(details===null){const {rows}=await pool.query('select badge_id,auto_equip from discord_badge_awards where user_id=$1',[user.id]);return {eligible:rows.filter(row=>active.has(row.badge_id)).map(row=>row.badge_id),equip:rows.filter(row=>active.has(row.badge_id)&&row.auto_equip&&saved.rules.some(rule=>rule.enabled&&rule.badgeId===row.badge_id&&rule.autoEquip)).map(row=>row.badge_id)};}
  const result=matchedRoleBadges(saved,details,guild),connection=await pool.connect();
  try{await connection.query('begin');await connection.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`discord-awards:${user.id}`]);await connection.query('delete from discord_badge_awards where user_id=$1 and not (badge_id=any($2::text[]))',[user.id,result.eligible]);for(const badge of result.eligible)await connection.query('insert into discord_badge_awards(user_id,badge_id,auto_equip) values($1,$2,$3) on conflict(user_id,badge_id) do update set auto_equip=excluded.auto_equip,verified_at=now()',[user.id,badge,result.equip.includes(badge)]);await connection.query('commit');}
  catch(error){await connection.query('rollback');throw error;}finally{connection.release();}
  awards.set(user.id,{at:Date.now(),discordId:user.discord_id,value:result});if(awards.size>10000)awards.clear();return result;
 }
 async function inspect(override){
  if(override && !snowflake(override))throw new Error("Choose a valid server.");
  const guild=override || await guildId();let bot=null,server=null,roles=[],error=null;
  try{const data=await request('/users/@me');bot={id:String(data.id),username:data.username,avatar:data.avatar?`https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=64`:null};if(guild){const [data,roleData]=await Promise.all([request(`/guilds/${guild}`),request(`/guilds/${guild}/roles`)]);server={id:String(data.id),name:data.name,icon:data.icon?`https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png?size=64`:null};roles=roleData.map(role=>({id:String(role.id),name:role.name,color:role.color,position:role.position,managed:Boolean(role.managed),icon:role.icon?`https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png`:null})).sort((a,b)=>b.position-a.position);}}
  catch(failure){error=failure.message;lastError=error;}
  const guilds=client?.guilds.cache.map(item=>({id:item.id,name:item.name})) || [];
  const appId=bot?.id;
  return {configured:Boolean(token),tokenValid:Boolean(bot),gatewayConnected:Boolean(client?.isReady()),serverConnected:Boolean(server),bot,guildId:guild || null,guild:server,guilds,roles,error:error || (!token?'Set DISCORD_BOT_TOKEN on the backend.':!guild?'Choose a server the bot has joined.':!client?.isReady()?lastError || 'Discord Gateway is connecting.':null),inviteUrl:appId?`https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot&permissions=0${guild?`&guild_id=${guild}&disable_guild_select=true`:''}`:null,lastSync,lastSyncCount,syncing};
 }
 async function save(raw,isOwner){
  const next=normalizeAutomation(raw);if(next.rules.some(rule=>!snowflake(rule.roleId)||!ROLE_BADGE_IDS.includes(rule.badgeId)))throw new Error('Choose an actual Discord role and a listed badge for every rule.');
  if(next.rules.length && !next.guildId && !await guildId())throw new Error('Choose a Discord server first.');
  if(!isOwner){const previous=await config();for(const rule of [...previous.rules,...next.rules]){if(!['owner','staff'].includes(rule.badgeId))continue;const before=previous.rules.find(item=>item.id===rule.id),after=next.rules.find(item=>item.id===rule.id);if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Only the site owner can change Owner or Staff badge rules.');}}
  const guild=next.guildId || await guildId();if(guild){const roles=await request(`/guilds/${guild}/roles`);if(next.rules.some(rule=>!roles.some(role=>String(role.id)===rule.roleId)))throw new Error('A selected Discord role no longer exists. Refresh the role list.');}
  await writeSetting('discord_automation',JSON.stringify(next));configCache=next;configAt=Date.now();members.clear();awards.clear();onChange();return next;
 }
 async function syncAll(){
  if(syncing)return {running:true,count:lastSyncCount};if(!(await config()).enabled || !await guildId())return {running:false,count:0};syncing=true;lastSyncCount=0;
  try{const {rows}=await pool.query('select id,discord_id from users where discord_id is not null');for(const user of rows){if(!(await config()).enabled)break;await syncUser(user,true);lastSyncCount++;await new Promise(resolve=>setTimeout(resolve,150));}lastSync=new Date().toISOString();onChange();return {running:false,count:lastSyncCount};}
  finally{syncing=false;}
 }
 function start(){
  if(!token)return;
  client=gatewayFactory?gatewayFactory():new Client({intents:[GatewayIntentBits.Guilds],rest:{timeout:15000},presence:{status:'online'}});
  client.once(Events.ClientReady,()=>{lastError=null;void syncAll().catch(error=>{lastError=error.message;});});
  client.on(Events.Error,error=>{lastError=String(error.message).replaceAll(token,'[redacted]');});
  for(const event of [Events.GuildRoleCreate,Events.GuildRoleDelete,Events.GuildRoleUpdate])client.on(event,()=>{members.clear();awards.clear();onChange();});
  client.on(Events.ShardDisconnect,()=>{lastError='Discord Gateway disconnected; reconnecting.';});
  const login=()=>void client.login(token).catch(error=>{lastError=String(error.message).replaceAll(token,'[redacted]');reconnect=setTimeout(login,60000);reconnect.unref?.();});login();
  timer=setInterval(()=>{void syncAll().catch(error=>{lastError=error.message;});},60000);timer.unref?.();
 }
 function stop(){if(timer)clearInterval(timer);if(reconnect)clearTimeout(reconnect);client?.destroy();}
 function connection(){return {configured:Boolean(token),gatewayConnected:Boolean(client?.isReady()),serverConnected:Boolean(client?.isReady() && (defaultGuildId || configCache?.guildId ? client.guilds.cache.has(configCache?.guildId || defaultGuildId):client.guilds.cache.size===1))};}
 return {config,guildId,member,syncUser,inspect,save,syncAll,start,stop,connection};
}
export function registerDiscordAutomation(app,service,requireAdmin){
 app.get('/api/admin/bot/automation',requireAdmin,async(req,res)=>{try{res.json({...(await service.inspect(req.query.guildId)),config:await service.config()});}catch(error){res.status(503).json({error:error.message});}});
 app.patch('/api/admin/bot/automation',requireAdmin,async(req,res)=>{try{const config=await service.save(req.body,Boolean(req.user.is_owner));res.json({config});}catch(error){res.status(400).json({error:error.message});}});
 app.post('/api/admin/bot/sync',requireAdmin,async(_req,res)=>{res.json({started:true});void service.syncAll().catch(()=>{});});
 app.post('/api/admin/bot/recheck',requireAdmin,async(_req,res)=>{try{res.json(await service.inspect());}catch(error){res.status(503).json({error:error.message});}});
}
