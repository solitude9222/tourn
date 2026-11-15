import { ActivityType, Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { buildDmPanel, buildLeaderboardMessage, buildWelcomeMessage, discordAvatar, LEADERBOARD_CHANNEL_ID, SITE_URL, WELCOME_CHANNEL_ID } from "./discordCommunity.js";

const PRESENCE={status:"online",activities:[{name:"working on tourn...",state:"working on tourn...",type:ActivityType.Custom}]};
export const DISCORD_AUTOMATION_SCHEMA=`create table if not exists discord_badge_awards (
 user_id uuid not null references users(id) on delete cascade,
 badge_id text not null,auto_equip boolean not null default true,verified_at timestamptz not null default now(),primary key(user_id,badge_id)
);
create table if not exists discord_dm_intros (
 discord_id text primary key,replied_at timestamptz not null default now()
);`;
/* The bot only ever works in the tourn.lol server. Every guild selector is gone:
   other servers the bot happens to be in are ignored entirely. */
export const TOURN_GUILD_ID = '1557276191050698782';
export const ROLE_BADGE_IDS=['owner','staff','verified','partner','donator','coder','bughunter','newbie','user','premium','booster','halloween_2026','christmas_2026','dc_indiscord'];
const snowflake=id=>typeof id==='string' && /^\d{16,20}$/.test(id);
export function normalizeAutomation(raw={}){
 const board=raw.leaderboard && typeof raw.leaderboard==='object'?raw.leaderboard:{};
   return {enabled:raw.enabled!==false,guildId:snowflake(raw.guildId)?raw.guildId:'',rules:Array.isArray(raw.rules)?raw.rules.slice(0,50).map((rule,index)=>({id:String(rule.id||`rule-${index}`).slice(0,80),roleId:String(rule.roleId||''),badgeId:String(rule.badgeId||''),enabled:rule.enabled!==false,autoEquip:rule.autoEquip!==false})):[],leaderboard:{enabled:board.enabled!==false,channelId:snowflake(board.channelId)?board.channelId:LEADERBOARD_CHANNEL_ID,messageId:snowflake(board.messageId)?board.messageId:'',intervalMinutes:Math.min(1440,Math.max(15,Number(board.intervalMinutes)||60))}};
}
export function matchedRoleBadges(config,member,guildId){
 if(!config.enabled || !member?.present)return {eligible:[],equip:[]};
 const roles=new Set([...member.roles,guildId]);const eligible=new Set(),equip=new Set();
 for(const rule of config.rules)if(rule.enabled && roles.has(rule.roleId)){eligible.add(rule.badgeId);if(rule.autoEquip)equip.add(rule.badgeId);}
 return {eligible:[...eligible],equip:[...equip]};
}
export function createDiscordAutomation({pool,readSetting,writeSetting,token,defaultGuildId='',applicationId='',request:injectedRequest,gatewayFactory,onChange=()=>{}}){
 token=String(token || '').trim();defaultGuildId=String(defaultGuildId || '').trim();
 let client=null,lastError=null,configCache=null,configAt=0,syncing=false,lastSync=null,lastSyncCount=0,timer=null,reconnect=null,leaderTimer=null,bioTimer=null,lastLeaderboardAt=0;
 const members=new Map(),awards=new Map(),identities=new Map();
 /* Plain REST over fetch. The gateway is a websocket, so it can be down (or
     still logging in) while the token itself is perfectly good — everything
     that only reads or posts should still work in that state. */
 const rawRest=async(method,path,body)=>{
  if(!token){const error=new Error('DISCORD_BOT_TOKEN is not configured.');error.status=503;throw error;}
  const response=await fetch(`https://discord.com/api/v10${path}`,{method,headers:{Authorization:`Bot ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch{data=null;}
  if(!response.ok){
   const failure=new Error(response.status===401?'Discord rejected the bot token.':response.status===403?'The bot lacks permission for that action.':response.status===404?'Not found in Discord.':`Discord answered ${response.status}${data?.message?`: ${data.message}`:''}.`);
   failure.status=response.status;failure.discordCode=data?.code;failure.discordMessage=data?.message;throw failure;
  }
  return data;
 };
 const request=injectedRequest || (async path=>{
  if(!token){const error=new Error('DISCORD_BOT_TOKEN is not configured.');error.status=503;throw error;}
  // discord.js handles Discord route buckets and Retry-After once the gateway
  // is up; before that, go straight to REST so a connection problem cannot
  // masquerade as a broken token.
  if(!client || !client.isReady())return rawRest('GET',path);
  try{return await client.rest.get(path);}catch(error){const failure=new Error(error.status===401?'Discord rejected the bot token.':error.status===403?'The bot does not have access to this server.':error.status===404?'The server or member was not found.':error.message || 'Discord is temporarily unavailable.');failure.status=error.status;failure.discordCode=error.code;throw failure;}
 });
 async function sendToChannel(channelId,payload){
  try{return await rawRest("POST","/channels/"+channelId+"/messages",payload);}
  catch(error){
   if(!client?.isReady())throw error;
   const channel=await client.channels.fetch(channelId).catch(()=>null);
   if(!channel || typeof channel.isTextBased!=="function" || !channel.isTextBased())throw error;
   return channel.send(payload);
  }
 }
 async function identityFor(discordId){
  const id=String(discordId||"");
  if(!snowflake(id))return null;
  const cached=identities.get(id);
  if(cached && Date.now()-cached.at<3600000)return cached.value;
  try{
   const data=await rawRest("GET","/users/"+id);
   const value={id:String(data.id),username:String(data.username||""),avatar:discordAvatar(data)};
   identities.set(id,{at:Date.now(),value});
   if(identities.size>500)identities.clear();
   return value;
  }catch{return null;}
 }
 async function welcomeMember(member){
  const user=member?.user || {};
  const avatar=typeof user.displayAvatarURL==="function"?user.displayAvatarURL({size:128}):discordAvatar(user);
  try{await sendToChannel(WELCOME_CHANNEL_ID,buildWelcomeMessage({id:String(member?.id||""),avatar}));}
  catch(error){lastError="Welcome message: "+error.message;console.warn("[discord] welcome failed",error?.status,error?.message);}
 }
 async function replyOnce(message){
  const id=String(message?.author?.id||"");
  if(!snowflake(id))return;
  // Claim the sender first: the primary key is what makes this once ever,
  // even across restarts or two messages arriving together.
  const claim=await pool.query("insert into discord_dm_intros(discord_id) values($1) on conflict (discord_id) do nothing",[id]).catch(()=>null);
  if(!claim || claim.rowCount!==1)return;
  try{await sendToChannel(String(message.channelId || message.channel?.id || ""),buildDmPanel());}
  catch(error){
   await pool.query("delete from discord_dm_intros where discord_id=$1",[id]).catch(()=>{});
   lastError="DM panel: "+error.message;
  }
 }
 async function updateBotBio(){
  try{
   const {rows}=await pool.query("select u.username, coalesce(u.alias,u.username) as alias from users u left join profile_views v on v.username=u.username order by coalesce(v.views,0) desc, u.created_at asc limit 3");
   if(!rows.length)return null;
   const lines=rows.map((row,index)=>(index+1)+". "+row.alias+" — "+SITE_URL+"/"+encodeURIComponent(row.username));
   const description=("top 3 on "+SITE_URL+":\n"+lines.join("\n")).slice(0,400);
   await rawRest("PATCH","/applications/@me",{description});
   return description;
  }catch(error){lastError="Bot bio: "+error.message;return null;}
 }
 async function postLeaderboard(force=false,channelOverride=""){
  const saved=await config();
  if(!saved.leaderboard.enabled && !force)return {posted:false,reason:"Leaderboard posting is off."};
  const channelId=snowflake(String(channelOverride||""))?String(channelOverride):(saved.leaderboard.channelId || LEADERBOARD_CHANNEL_ID);
  if(!snowflake(channelId))return {posted:false,reason:"Choose a channel for the leaderboard first."};
  if(!token)return {posted:false,reason:"DISCORD_BOT_TOKEN is not set on the backend."};
  let rows=[];
  try{
   ({rows}=await pool.query("select u.username,u.alias,u.avatar_url,u.discord_id,coalesce(v.views,0)::int as views,coalesce(r.likes,0)::int as likes from users u left join profile_views v on v.username=u.username left join (select username,count(*) filter (where kind='like')::int as likes from profile_reactions group by username) r on r.username=u.username order by views desc, likes desc, u.created_at asc limit 10"));
  }catch(error){throw new Error("Leaderboard query failed: "+error.message);}
  if(!rows.length)return {posted:false,reason:"There is nobody on the leaderboard yet."};
  const identitiesForBoard={};
  await Promise.all(rows.map(async row=>{
   if(!row.discord_id)return;
   const identity=await identityFor(row.discord_id);
   if(identity)identitiesForBoard[row.discord_id]=identity;
  }));
  const payload=buildLeaderboardMessage(rows,identitiesForBoard);
  if(!payload)return {posted:false,reason:"There is nobody on the leaderboard yet."};
  // A leaderboard is only useful when it is the current one.
  if(snowflake(saved.leaderboard.messageId)){
   try{await rawRest("DELETE","/channels/"+channelId+"/messages/"+saved.leaderboard.messageId);}
   catch(error){if(error?.status!==404)console.warn("[discord] could not delete the old leaderboard",error?.status,error?.message);}
  }
  let messageId="";
  try{
   const created=await sendToChannel(channelId,payload);
   messageId=created?.id?String(created.id):"";
  }catch(error){
   const status=error?.status;
   if(status===403||status===401||status===50001)throw new Error("The bot cannot post in that channel. Give it Send Messages and Embed Links, and make sure it can see the channel.");
   if(status===404)throw new Error("That channel no longer exists — pick another leaderboard channel.");
   throw new Error("Discord rejected the leaderboard: "+(error?.message||"unknown error"));
  }
  lastLeaderboardAt=Date.now();
  if(messageId){
   const next={...saved,leaderboard:{...saved.leaderboard,messageId}};
   await writeSetting("discord_automation",JSON.stringify(next));configCache=next;configAt=Date.now();
  }
  return {posted:true,count:Math.min(rows.length,10),messageId};
 }
 async function config(){if(configCache && Date.now()-configAt<15000)return configCache;let raw={};try{raw=JSON.parse(await readSetting('discord_automation','{}'));}catch{}configCache=normalizeAutomation(raw);configAt=Date.now();return configCache;}
 async function guildId(){return TOURN_GUILD_ID;}
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
 async function inspect(){
  const guild=await guildId();let bot=null,server=null,roles=[],channels=[],error=null;
  try{const data=await request('/users/@me');bot={id:String(data.id),username:data.username,avatar:data.avatar?`https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=64`:null};  if(guild){const [data,roleData,channelData]=await Promise.all([request(`/guilds/${guild}`).catch(()=>null),request(`/guilds/${guild}/roles`).catch(()=>[]),request(`/guilds/${guild}/channels`).catch(()=>[])]);if(!data)throw new Error(`The bot cannot see server ${guild} — re-invite it and check its permissions.`);channels=(Array.isArray(channelData)?channelData:[]).filter(channel=>channel.type===0||channel.type===5).map(channel=>({id:String(channel.id),name:String(channel.name),type:channel.type===5?'announcement':'text'})).sort((a,b)=>a.name.localeCompare(b.name));server={id:String(data.id),name:data.name,icon:data.icon?`https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png?size=64`:null};roles=roleData.map(role=>({id:String(role.id),name:role.name,color:role.color,position:role.position,managed:Boolean(role.managed),icon:role.icon?`https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png`:null})).sort((a,b)=>b.position-a.position);}}
  catch(failure){error=failure.message;lastError=error;}
  const guilds=client?.guilds.cache.map(item=>({id:item.id,name:item.name})) || [];
  const appId=bot?.id;
  return {configured:Boolean(token),tokenValid:Boolean(bot),gatewayConnected:Boolean(client?.isReady()),serverConnected:Boolean(server),bot,guildId:guild || null,guild:server,guilds,roles,channels,error:error || (!token?'Set DISCORD_BOT_TOKEN on the backend.':!guild?'Choose a server the bot has joined.':!client?.isReady()?lastError || 'Discord Gateway is connecting.':null),inviteUrl:appId?`https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot&permissions=0${guild?`&guild_id=${guild}&disable_guild_select=true`:''}`:null,lastSync,lastSyncCount,syncing};
 }
 async function save(raw,isOwner){
  const next=normalizeAutomation(raw);next.guildId=TOURN_GUILD_ID;if(next.rules.some(rule=>!snowflake(rule.roleId)||!ROLE_BADGE_IDS.includes(rule.badgeId)))throw new Error('Choose an actual Discord role and a listed badge for every rule.');
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
  const base=[GatewayIntentBits.Guilds,GatewayIntentBits.DirectMessages];
  const withMembers=[...base,GatewayIntentBits.GuildMembers];
  const attach=instance=>{
   instance.once(Events.ClientReady,()=>{lastError=null;void syncAll().catch(error=>{lastError=error.message;});void updateBotBio();void (async()=>{const saved=await config();if(saved.leaderboard.enabled&&saved.leaderboard.channelId)await postLeaderboard();})().catch(error=>{lastError=error.message;});});
   instance.on(Events.Error,error=>{lastError=String(error.message).replaceAll(token,"[redacted]");});
   instance.on(Events.GuildMemberAdd,member=>{if(String(member?.guild?.id||"")!==TOURN_GUILD_ID)return;void welcomeMember(member);});
   instance.on(Events.MessageCreate,message=>{if(!message || message.guild || message.author?.bot)return;void replyOnce(message);});
   for(const event of [Events.GuildRoleCreate,Events.GuildRoleDelete,Events.GuildRoleUpdate])instance.on(event,()=>{members.clear();awards.clear();onChange();});
   instance.on(Events.ShardDisconnect,()=>{lastError="Discord Gateway disconnected; reconnecting.";});
   return instance;
  };
  const connect=(intents,allowFallback)=>{
   client=attach(gatewayFactory?gatewayFactory():new Client({intents,partials:[Partials.Channel],rest:{timeout:15000},presence:PRESENCE}));
   void client.login(token).catch(error=>{
    const reason=String(error?.message||error).replaceAll(token,"[redacted]");
    lastError=reason;
    // GuildMembers is privileged. If it is not enabled the bot must still
    // post the leaderboard and answer DMs, so reconnect without welcomes.
    if(allowFallback && /disallowed intent/i.test(reason)){
     lastError="Server Members intent is off in the Discord developer portal; welcomes are paused.";
     connect(base,false);
     return;
    }
    reconnect=setTimeout(()=>connect(intents,allowFallback),60000);reconnect.unref?.();
   });
  };
  connect(withMembers,true);
  timer=setInterval(()=>{void syncAll().catch(error=>{lastError=error.message;});},60000);timer.unref?.();
  leaderTimer=setInterval(()=>{void (async()=>{const saved=await config();if(!saved.leaderboard.enabled||!saved.leaderboard.channelId)return;if(Date.now()-lastLeaderboardAt<saved.leaderboard.intervalMinutes*60000)return;await postLeaderboard();})().catch(error=>{lastError=error.message;});},60000);leaderTimer.unref?.();
  bioTimer=setInterval(()=>{void updateBotBio();},21600000);bioTimer.unref?.();
 }
 function stop(){if(timer)clearInterval(timer);if(leaderTimer)clearInterval(leaderTimer);if(bioTimer)clearInterval(bioTimer);if(reconnect)clearTimeout(reconnect);client?.destroy();}
 function connection(){return {configured:Boolean(token),gatewayConnected:Boolean(client?.isReady()),serverConnected:Boolean(client?.isReady() && (defaultGuildId || configCache?.guildId ? client.guilds.cache.has(configCache?.guildId || defaultGuildId):client.guilds.cache.size===1))};}
 /* Effective permissions in one channel: @everyone, the bot's roles, then the
     channel overwrites in Discord's own order. ADMINISTRATOR wins outright. */
 function channelPermissions(member,roles,channel,guild){
  const find=id=>roles.find(role=>String(role.id)===String(id));
  let perms=BigInt(find(guild)?.permissions||0);
  for(const id of member.roles||[]){const role=find(id);if(role)perms|=BigInt(role.permissions||0);}
  if((perms&(1n<<3n))!==0n)return ~0n;
  const overwrites=Array.isArray(channel.permission_overwrites)?channel.permission_overwrites:[];
  const apply=overwrite=>{if(!overwrite)return;perms=(perms&~BigInt(overwrite.deny||0))|BigInt(overwrite.allow||0);};
  apply(overwrites.find(item=>String(item.id)===String(guild)));
  for(const id of member.roles||[])apply(overwrites.find(item=>String(item.id)===String(id)));
  apply(overwrites.find(item=>item.type===1 && String(item.id)===String(member.user?.id)));
  return perms;
 }

 /* Live self-test the admin panel can run. Every line is a real Discord call
     made with the deployment's own token, so it reports the actual failure
     instead of guessing from the UI. */
 async function diagnose(options={}){
  const report=[];
  const add=(id,label,ok,detail,optional=false)=>report.push({id,label,ok,detail,optional});
  const tokenSet=Boolean(token);
  add('token','Bot token configured',tokenSet,tokenSet?'DISCORD_BOT_TOKEN is present on the backend.':'No DISCORD_BOT_TOKEN on the backend — nothing can post or DM.');
  if(!tokenSet)return {ok:false,report};
  let me=null;
  try{const data=await rawRest('GET','/users/@me');me={id:String(data.id),username:data.username};add('identity','Token accepted by Discord',true,`Signed in as ${data.username} (${data.id}).`);}
  catch(error){add('identity','Token accepted by Discord',false,error.message);return {ok:false,report};}
  const guild=await guildId();
  let channels=[];
  try{
   const [guildData,channelData]=await Promise.all([rawRest('GET',`/guilds/${guild}`),rawRest('GET',`/guilds/${guild}/channels`)]);
   channels=(Array.isArray(channelData)?channelData:[]).filter(channel=>channel.type===0||channel.type===5);
   add('guild',`Bot is in ${guildData.name}`,true,`${channels.length} text channel(s) visible.`);
  }catch(error){add('guild','Bot can see the tourn.lol server',false,`${error.message} Re-invite the bot and give it View Channels.`);return {ok:false,report};}
  const channelId=String(options?.channelId||'').trim();
  if(snowflake(channelId)){
   const channel=channels.find(item=>String(item.id)===channelId);
   if(!channel)add('channel','Leaderboard channel reachable',false,`Channel ${channelId} is not a text channel the bot can see. Pick another.`);
   else{
    add('channel','Leaderboard channel reachable',true,`#${channel.name}.`);
    try{
     const [member,roles]=await Promise.all([rawRest('GET',`/guilds/${guild}/members/${me.id}`),rawRest('GET',`/guilds/${guild}/roles`)]);
     const perms=channelPermissions(member,roles,channel,guild);
     const missing=[];if((perms&(1n<<11n))===0n)missing.push('Send Messages');if((perms&(1n<<14n))===0n)missing.push('Embed Links');
     add('permissions','Bot can post embeds there',missing.length===0,missing.length?`Missing ${missing.join(' + ')} in #${channel.name}.`:`Send Messages and Embed Links granted in #${channel.name}.`);
    }catch(error){add('permissions','Bot permissions in that channel',false,error.message);}
   }
  }else add('channel','Leaderboard channel chosen',false,'Pick a leaderboard channel to test it.','optional');
  const dmId=String(options?.discordId||'').trim();
  if(snowflake(dmId)){
   try{const dm=await rawRest('POST','/users/@me/channels',{recipient_id:dmId});add('dm','Bot can DM that account',true,`DM channel ${dm.id} opened.`);}
   catch(error){add('dm','Bot can DM that account',false,error.status===403?'Discord refused the DM — that account has "direct messages from server members" off, or shares no server with the bot.':error.message);}
  }else add('dm','DM delivery',false,'Enter a Discord user ID to test a DM.','optional');
  add('gateway','Gateway socket connected',Boolean(client?.isReady()),client?.isReady()?'Connected.':'Not connected — posts and DMs still go over REST, but role sync waits for it.',true);
  return {ok:report.every(item=>item.ok||item.optional),report};
 }
 /* Who a snowflake actually is, so a reset can say the exact handle it sent to
     (or that the ID is not linked to anything). */
 const detailCache=new Map();
 async function memberInfo(discordId){
  const guild=await guildId();if(!token || !guild || !snowflake(discordId))return null;
  const key=guild+':'+discordId,cached=detailCache.get(key);if(cached && Date.now()-cached.at<60000)return cached.value;
  try{
   const [data,roles,server]=await Promise.all([request(`/guilds/${guild}/members/${discordId}`),request(`/guilds/${guild}/roles`).catch(()=>[]),request(`/guilds/${guild}?with_counts=true`).catch(()=>null)]);
   const byId=new Map((Array.isArray(roles)?roles:[]).map(role=>[String(role.id),role]));
   const memberRoles=(Array.isArray(data.roles)?data.roles:[]).map(id=>byId.get(String(id))).filter(Boolean).sort((a,b)=>b.position-a.position).map(role=>({id:String(role.id),name:role.name,color:role.color||0}));
   const value={present:true,id:String(data.user.id),username:data.user.username,globalName:data.user.global_name||null,nick:data.nick||null,avatar:data.user.avatar?`https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png?size=256`:null,joinedAt:data.joined_at||null,createdAt:data.user.id?new Date(Number((BigInt(data.user.id)>>22n)+1420070400000n)).toISOString():null,premiumSince:data.premium_since||null,bot:Boolean(data.user.bot),roles:memberRoles,guild:server?{id:String(server.id),name:server.name,icon:server.icon?`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=128`:null,description:server.description||null,memberCount:server.approximate_member_count||null,onlineCount:server.approximate_presence_count||null,createdAt:new Date(Number((BigInt(server.id)>>22n)+1420070400000n)).toISOString()}:null};
   if(detailCache.size>4000)detailCache.clear();detailCache.set(key,{at:Date.now(),value});return value;
  }catch(error){if(error?.status===404)return {present:false};lastError=error?.message||lastError;return null;}
 }
 async function guildInfo(){
  const guild=await guildId();if(!token || !guild)return null;
  try{const data=await request(`/guilds/${guild}?with_counts=true`);return {id:String(data.id),name:data.name,icon:data.icon?`https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png?size=128`:null,description:data.description||null,memberCount:data.approximate_member_count||null,onlineCount:data.approximate_presence_count||null,createdAt:new Date(Number((BigInt(data.id)>>22n)+1420070400000n)).toISOString()};}catch{return null;}
 }
 async function discordUser(id){
  if(!snowflake(String(id||'')))return null;
  const data=await rawRest('GET',`/users/${id}`);
  return data?{id:String(data.id),username:data.username,globalName:data.global_name||null}:null;
 }
 return {config,guildId,member,memberInfo,guildInfo,syncUser,inspect,save,syncAll,start,stop,connection,postLeaderboard,diagnose,discordUser,updateBotBio};
}
export function registerDiscordAutomation(app,service,requireAdmin){
 app.get('/api/admin/bot/automation',requireAdmin,async(req,res)=>{try{res.json({...(await service.inspect(req.query.guildId)),config:await service.config()});}catch(error){res.status(503).json({error:error.message});}});
 app.patch('/api/admin/bot/automation',requireAdmin,async(req,res)=>{try{const config=await service.save(req.body,Boolean(req.user.is_owner));res.json({config});}catch(error){res.status(400).json({error:error.message});}});
 app.post('/api/admin/bot/sync',requireAdmin,async(_req,res)=>{res.json({started:true});void service.syncAll().catch(()=>{});});
 app.post('/api/admin/bot/recheck',requireAdmin,async(_req,res)=>{try{res.json(await service.inspect());}catch(error){res.status(503).json({error:error.message});}});
 app.post('/api/admin/bot/leaderboard',requireAdmin,async(req,res)=>{try{res.json(await service.postLeaderboard(true,String(req.body?.channelId||'')));}catch(error){res.status(503).json({error:error.message});}});
 app.post('/api/admin/bot/diagnose',requireAdmin,async(req,res)=>{try{res.json(await service.diagnose({channelId:req.body?.channelId,discordId:req.body?.discordId}));}catch(error){res.status(503).json({error:error.message});}});
}
