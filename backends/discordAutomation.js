import { Client, Events, GatewayIntentBits } from 'discord.js';
export const DISCORD_AUTOMATION_SCHEMA=`create table if not exists discord_badge_awards (
 user_id uuid not null references users(id) on delete cascade,
 badge_id text not null,auto_equip boolean not null default true,verified_at timestamptz not null default now(),primary key(user_id,badge_id)
);`;
/* The bot only ever works in the tourn.lol server. Every guild selector is gone:
   other servers the bot happens to be in are ignored entirely. */
export const TOURN_GUILD_ID = '1557276191050698782';
export const ROLE_BADGE_IDS=['owner','staff','verified','partner','donator','coder','bughunter','newbie','user','premium','booster','halloween_2026','christmas_2026','dc_indiscord'];
const snowflake=id=>typeof id==='string' && /^\d{16,20}$/.test(id);
export function normalizeAutomation(raw={}){
 const board=raw.leaderboard && typeof raw.leaderboard==='object'?raw.leaderboard:{};
 return {enabled:raw.enabled!==false,guildId:snowflake(raw.guildId)?raw.guildId:'',rules:Array.isArray(raw.rules)?raw.rules.slice(0,50).map((rule,index)=>({id:String(rule.id||`rule-${index}`).slice(0,80),roleId:String(rule.roleId||''),badgeId:String(rule.badgeId||''),enabled:rule.enabled!==false,autoEquip:rule.autoEquip!==false})):[],leaderboard:{enabled:board.enabled===true,channelId:snowflake(board.channelId)?board.channelId:'',intervalMinutes:Math.min(1440,Math.max(15,Number(board.intervalMinutes)||60))}};
}
export function matchedRoleBadges(config,member,guildId){
 if(!config.enabled || !member?.present)return {eligible:[],equip:[]};
 const roles=new Set([...member.roles,guildId]);const eligible=new Set(),equip=new Set();
 for(const rule of config.rules)if(rule.enabled && roles.has(rule.roleId)){eligible.add(rule.badgeId);if(rule.autoEquip)equip.add(rule.badgeId);}
 return {eligible:[...eligible],equip:[...equip]};
}
export function createDiscordAutomation({pool,readSetting,writeSetting,token,defaultGuildId='',applicationId='',request:injectedRequest,gatewayFactory,onChange=()=>{}}){
 token=String(token || '').trim();defaultGuildId=String(defaultGuildId || '').trim();
 let client=null,lastError=null,configCache=null,configAt=0,syncing=false,lastSync=null,lastSyncCount=0,timer=null,reconnect=null,leaderTimer=null,lastLeaderboardAt=0;
 const members=new Map(),awards=new Map();
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
 async function postLeaderboard(force=false,channelOverride=''){
  const saved=await config();
  if(!saved.leaderboard.enabled && !force) return {posted:false,reason:'Leaderboard posting is off.'};
  // "Post now" can carry the channel the admin just picked, before saving.
  const channelId=snowflake(String(channelOverride||''))?String(channelOverride):saved.leaderboard.channelId;
  if(!snowflake(channelId)) return {posted:false,reason:'Choose a channel for the leaderboard first.'};
  if(!token) return {posted:false,reason:'DISCORD_BOT_TOKEN is not set on the backend.'};
  let rows=[];
  try{({rows}=await pool.query(`select u.username,u.alias,coalesce(v.views,0)::int as views from users u left join profile_views v on v.username=u.username order by views desc, u.created_at asc limit 10`));}
  catch(error){throw new Error(`Leaderboard query failed: ${error.message}`);}
  if(!rows.length) return {posted:false,reason:'There is nobody on the leaderboard yet.'};
  const medals=['🥇','🥈','🥉'];
  const description=rows.map((row,index)=>`${medals[index] || `\`${String(index+1).padStart(2,'0')}\``}  [${row.alias || row.username}](https://tourn.lol/${encodeURIComponent(row.username)})  ·  **${Number(row.views).toLocaleString('en-US')}** views`).join('\n');
  const embed={title:'🏆 tourn.lol leaderboard',description,url:'https://tourn.lol/leaderboard',color:0x7d9bf5,thumbnail:{url:'https://tourn.lol/logo.png'},footer:{text:'Ranked by profile views'},timestamp:new Date().toISOString()};
  try{
    // Post over REST directly: this works whether or not the gateway socket is
    // currently up, which is the usual reason a scheduled post looked dead.
    await rawRest('POST',`/channels/${channelId}/messages`,{embeds:[embed]});
  }catch(error){
    console.error('[discord] leaderboard post failed',error?.status,error?.message);
    try{
      if(!client?.isReady())throw error;
      const channel=await client.channels.fetch(channelId);
      if(!channel?.isTextBased())throw error;
      await channel.send({embeds:[embed]});
    }catch(fallbackError){
      const status=error?.status ?? fallbackError?.status;
      if(status===403||status===401||status===50001)throw new Error('The bot cannot post in that channel. Give it Send Messages and Embed Links, and make sure it can see the channel.');
      if(status===404)throw new Error('That channel no longer exists — pick another leaderboard channel.');
      throw new Error(`Discord rejected the leaderboard: ${fallbackError?.message || error?.message || 'unknown error'}`);
    }
  }
  lastLeaderboardAt=Date.now();
  return {posted:true,count:rows.length};
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
  client=gatewayFactory?gatewayFactory():new Client({intents:[GatewayIntentBits.Guilds],rest:{timeout:15000},presence:{status:'online'}});
  client.once(Events.ClientReady,()=>{lastError=null;void syncAll().catch(error=>{lastError=error.message;});});
  client.on(Events.Error,error=>{lastError=String(error.message).replaceAll(token,'[redacted]');});
  for(const event of [Events.GuildRoleCreate,Events.GuildRoleDelete,Events.GuildRoleUpdate])client.on(event,()=>{members.clear();awards.clear();onChange();});
  client.on(Events.ShardDisconnect,()=>{lastError='Discord Gateway disconnected; reconnecting.';});
  const login=()=>void client.login(token).catch(error=>{lastError=String(error.message).replaceAll(token,'[redacted]');reconnect=setTimeout(login,60000);reconnect.unref?.();});login();
  timer=setInterval(()=>{void syncAll().catch(error=>{lastError=error.message;});},60000);timer.unref?.();
  leaderTimer=setInterval(()=>{void (async()=>{const saved=await config();if(!saved.leaderboard.enabled||!saved.leaderboard.channelId)return;if(Date.now()-lastLeaderboardAt<saved.leaderboard.intervalMinutes*60000)return;await postLeaderboard();})().catch(error=>{lastError=error.message;});},60000);leaderTimer.unref?.();
 }
 function stop(){if(timer)clearInterval(timer);if(leaderTimer)clearInterval(leaderTimer);if(reconnect)clearTimeout(reconnect);client?.destroy();}
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
 async function discordUser(id){
  if(!snowflake(String(id||'')))return null;
  const data=await rawRest('GET',`/users/${id}`);
  return data?{id:String(data.id),username:data.username,globalName:data.global_name||null}:null;
 }
 return {config,guildId,member,syncUser,inspect,save,syncAll,start,stop,connection,postLeaderboard,diagnose,discordUser};
}
export function registerDiscordAutomation(app,service,requireAdmin){
 app.get('/api/admin/bot/automation',requireAdmin,async(req,res)=>{try{res.json({...(await service.inspect(req.query.guildId)),config:await service.config()});}catch(error){res.status(503).json({error:error.message});}});
 app.patch('/api/admin/bot/automation',requireAdmin,async(req,res)=>{try{const config=await service.save(req.body,Boolean(req.user.is_owner));res.json({config});}catch(error){res.status(400).json({error:error.message});}});
 app.post('/api/admin/bot/sync',requireAdmin,async(_req,res)=>{res.json({started:true});void service.syncAll().catch(()=>{});});
 app.post('/api/admin/bot/recheck',requireAdmin,async(_req,res)=>{try{res.json(await service.inspect());}catch(error){res.status(503).json({error:error.message});}});
 app.post('/api/admin/bot/leaderboard',requireAdmin,async(req,res)=>{try{res.json(await service.postLeaderboard(true,String(req.body?.channelId||'')));}catch(error){res.status(503).json({error:error.message});}});
 app.post('/api/admin/bot/diagnose',requireAdmin,async(req,res)=>{try{res.json(await service.diagnose({channelId:req.body?.channelId,discordId:req.body?.discordId}));}catch(error){res.status(503).json({error:error.message});}});
}
