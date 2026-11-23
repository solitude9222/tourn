// Run with the Vite dev server on port 5180. Set BROWSER_PATH to a Chromium executable.
// All API and third-party requests are intercepted; no real accounts are modified.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('.tmp',{recursive:true});
const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || (process.platform==='win32' ? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' : chromium.executablePath()),headless:true});
try {
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
await page.addInitScript(() => { window.qaLoadingFallback = false; new MutationObserver(() => { if (document.querySelector(".route-loading")) window.qaLoadingFallback = true; }).observe(document, {childList:true,subtree:true}); });
const waitForSaves=()=>page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'),null,{timeout:15000});
const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const account={id:'qa-user',username:'reviewer',email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:true,isAdmin:true,isOwner:true,discordLinked:true,discordId:'1546745348020772915'};
let audioUploadBytes=0, audioUploadExpected=0, failAudioUpload=false;
let document=null, revision=0; const writes=[]; let failWrites=false; let failReads=false; let readDelay=0; let failAnalytics=false; const analyticsRequests=[]; let failViewWrite=false; let viewWrites=0; let presenceMonitored=false;
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.startsWith('/api/')) {
  if(url.pathname==='/api/account/aliases')return route.fulfill({json:{items:[],primary:'reviewer',username:'reviewer',alias2:null}});
  if(url.pathname==='/api/leaderboard')return route.fulfill({json:{profiles:Array.from({length:8},(_,i)=>({username:'member'+i,handle:'member'+i,displayName:'Member '+i,avatarUrl:'/favicon-rounded.png',views:1000-i*100,likes:80-i*5})),total:8}});
  if(url.pathname==='/api/templates')return route.fulfill({json:{templates:[]}});
  if(url.pathname==='/api/trades')return route.fulfill({json:{trades:[]}});
  if(url.pathname==='/api/media/audio' && route.request().method()==='POST') {audioUploadBytes=0;audioUploadExpected=route.request().postDataJSON().bytes;return route.fulfill({status:201,json:{id:'00000000-0000-4000-8000-000000000099',chunkBytes:1048576}});}
  if(url.pathname.includes('/api/media/audio/') && url.pathname.includes('/chunks/')) {if(failAudioUpload)return route.fulfill({status:503,json:{error:'Audio upload interrupted'}});audioUploadBytes+=route.request().postDataBuffer().length;return route.fulfill({json:{received:audioUploadBytes}});}
  if(url.pathname.endsWith('/complete') && url.pathname.startsWith('/api/media/audio/'))return route.fulfill({json:{url:'/api/media/audio/00000000-0000-4000-8000-000000000099'}});
  if(url.pathname.startsWith('/api/media/audio/'))return route.fulfill({contentType:'audio/wav',body:Buffer.alloc(44)});

  if(url.pathname.startsWith('/api/discord/'))return route.fulfill({json:{user:{id:url.pathname.split('/').pop(),username:'presence-user',global_name:'Presence Test',avatar:'avatar-hash',public_flags:64},avatar_url:'http://127.0.0.1:5180/favicon-rounded.png',banner_url:'http://127.0.0.1:5180/favicon-rounded.png'}});
  if(url.pathname==='/api/analytics') {
   analyticsRequests.push(url.searchParams.get('period'));
   if(failAnalytics)return route.fulfill({status:503,json:{error:'Analytics temporarily unavailable'}});
   const today=new Date();today.setUTCHours(0,0,0,0);
   const day=(offset)=>new Date(today.getTime()-offset*86400000).toISOString().slice(0,10);
   const daily=url.searchParams.get('period')==='24h'?[{date:day(0),views:5}]:[{date:day(2),views:4},{date:day(1),views:3},{date:day(0),views:5}];
   return route.fulfill({json:{total:42,periodViews:daily.reduce((n,p)=>n+p.views,0),daily,devices:[{label:'Mobile',views:8},{label:'Desktop',views:4}],sources:[{label:'github.com',views:8},{label:'Direct',views:4}],historySince:day(10)}});
  }
  if(url.pathname.startsWith('/api/views/')) {
   if(route.request().method()==='POST'){viewWrites++;if(failViewWrite)return route.fulfill({status:503,json:{error:'Visit test unavailable'}});}
   return route.fulfill({json:{views:42}});
  }
  if(url.pathname==='/api/auth/me') return route.fulfill({json:{account}});
  if(url.pathname==='/api/profile' && route.request().method()==='PUT') {
   const body=route.request().postDataJSON(); writes.push(body);
   if(failWrites) return route.fulfill({status:503,json:{error:'Offline test'}});
   if(document && body.baseRevision!==revision)return route.fulfill({status:409,json:{error:'Newer profile revision',revision,profile:document}});
   // Mirror the backend: merge only the submitted sections, then bump revision.
   if(Array.isArray(body.sections)) {
    const merged={...(document||{})};
    for(const section of body.sections) if(body.data&&Object.hasOwn(body.data,section)) merged[section]=body.data[section];
    document=merged;
   } else document=body.data;
   revision+=1;
   return route.fulfill({json:{ok:true,revision}});
  }
  if(url.pathname==='/api/profile') {if(failReads) return route.fulfill({status:503,json:{error:'Read unavailable'}}); if(readDelay) await new Promise(r=>setTimeout(r,readDelay)); return route.fulfill({json:{account,profile:document,earned:[],revision}});}
  if(url.pathname==='/api/profiles/owner')return route.fulfill({json:{owner:null}});
  return route.fulfill({json:{users:0,views:0,count:0,accounts:[]}});
 }
 if(url.hostname==='api.lanyard.rest') {
  if(!presenceMonitored)return route.fulfill({status:404,json:{success:false,error:{code:'user_not_monitored'}}});
  return route.fulfill({json:{success:true,data:{discord_user:{id:url.pathname.split('/').pop(),username:'presence-user',global_name:'Presence Test',avatar:'avatar-hash',public_flags:64},discord_status:'online',activities:[{name:'Minecraft',type:0}],spotify:null,listening_to_spotify:false,active_on_discord_desktop:true,active_on_discord_mobile:false,active_on_discord_web:false}}});
 }
 if(url.hostname==='open.spotify.com' && url.pathname==='/oembed')return route.fulfill({json:{title:'Example track',thumbnail_url:'http://127.0.0.1:5180/favicon-rounded.png'}});
 if(url.hostname==='api.github.com')return route.fulfill({json:{login:'octocat',name:'The Octocat',avatar_url:'http://127.0.0.1:5180/favicon-rounded.png',bio:'GitHub mascot',followers:1234,public_repos:8}});
 if(url.hostname==='geocoding-api.open-meteo.com')return route.fulfill({json:{results:[{name:'Auckland',country_code:'NZ',latitude:-36.85,longitude:174.76}]}});
 if(url.hostname==='api.open-meteo.com')return route.fulfill({json:{current:{temperature_2m:19,weather_code:2}}});
 if(url.origin!=='http://127.0.0.1:5180')return route.abort();
 return route.continue();
});




await context.route('**/api/admin/**',async route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/summary'))return route.fulfill({json:{users:2,views:42,premium:1,admins:1,activeInvites:1}});if(path.endsWith('/profiles'))return route.fulfill({json:{profiles:[{id:'qa-user',username:'reviewer',alias:null,alias2:null,avatar_url:null,premium:true,is_admin:true,is_owner:true,badges:[],created_at:'2026-01-01',views:42}]}});if(path.endsWith('/invites'))return route.fulfill({json:{invites:[{code:'test-invite',premium:false,maxUses:1,uses:1,note:'Testing',revoked:true,expiresAt:null,createdAt:'2026-01-01',creator:'reviewer'}]}});if(path.endsWith('/settings'))return route.fulfill({json:{settings:{registration:'open',homePreview:'random',premiumRain:false}}});if(path.endsWith('/bot'))return route.fulfill({json:{configured:false,tokenValid:false,bot:null,guildId:null,guild:null,pendingCodes:0,inviteUrl:null}});return route.fulfill({status:503,json:{error:'Fixture unavailable state'}});});
let release;const gate=new Promise(resolve=>release=resolve);await context.route(/\/src\/components\/Pages\.tsx(?:\?.*)?$/,async route=>{await gate;await route.continue().catch(()=>{});});
await page.goto('http://127.0.0.1:5180/#/');await page.getByRole('heading',{name:/Your world/}).waitFor();await page.locator('.head-links').getByRole('link',{name:'Leaderboard',exact:true}).click();await page.getByRole('status').filter({hasText:'Loading leaderboard'}).waitFor();assert.equal(await page.locator('.public-page-loading').evaluate(e=>getComputedStyle(e).opacity),'1');await page.getByRole('contentinfo',{name:'Site footer'}).waitFor();const screenshot=await page.screenshot({path:'.tmp/public-page-loading.png'});const pixel=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return Array.from(ctx.getImageData(40,400,1,1).data);},screenshot.toString('base64'));assert(pixel[2]>pixel[0]&&pixel[2]>8,'loading surface must actually paint above black backdrop: '+pixel);await page.getByRole('button',{name:'Retry page',exact:true}).waitFor({timeout:10000});release();
for(const route of ['leaderboard','premium','shop','legal','contact']){await page.goto('http://127.0.0.1:5180/#/'+route);await page.locator('main.page-enter').waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('.site-backdrop').evaluate(e=>getComputedStyle(e).zIndex),'-1');const dim=await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-reveal]'))el.classList.remove('is-revealed');const main=document.querySelector('main.page-enter');main.style.animationPlayState='paused';return Array.from(document.querySelectorAll('main.page-enter,main [data-reveal]')).map(e=>({label:e.textContent.slice(0,50),opacity:getComputedStyle(e).opacity})).filter(e=>Number(e.opacity)<1);});assert.deepEqual(dim,[],route+' must paint without reveal classes');await page.screenshot({path:'.tmp/public-readable-'+route+'.png'});}
await page.addInitScript(()=>localStorage.setItem('tourn.dashAccent','#d40410'));await page.goto('http://127.0.0.1:5180/?adminpaletteaudit=1#/dashboard/admin');await page.locator('.adm-tabs').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('tourn.dashAccent')),'#3b82f6');const failures=[];for(const name of ['Overview','Members','Invites','Username serials','Site settings','Data transfer','Discord bot']){await page.locator('.adm-tabs').getByRole('button',{name,exact:true}).click();await page.waitForTimeout(400);if(name==='Members'){await page.locator('.adm-mini--edit').first().click();await page.locator('.adm-modal').waitFor();}const warm=await page.evaluate(()=>{const bad=[];const warm=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return false;const [r,g,b,a]=m[1].split(/[,\s/]+/).filter(Boolean).map(Number);return (a===undefined||a>.05)&&r>g+3&&r>b+3&&Math.abs(g-b)<55;};for(const e of document.querySelectorAll('.adm *')){if(!e.getClientRects().length||getComputedStyle(e).visibility==='hidden')continue;const style=getComputedStyle(e);for(const key of ['color','backgroundColor','borderTopColor'])if(warm(style[key]))bad.push({cls:e.className,key,value:style[key],text:e.textContent.slice(0,45)});}return bad.slice(0,20);});if(warm.length)failures.push({name,warm});await page.screenshot({path:'.tmp/admin-blue-'+name.replaceAll(' ','-')+'.png'});if(name==='Members')await page.keyboard.press('Escape');}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log('PASS slow public-page loading shows status and footer; five pages paint without reveal classes; seven Admin sections have no warm/red computed text, fills or borders');
}finally{await browser.close();}
