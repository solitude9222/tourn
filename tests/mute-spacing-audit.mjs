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
const account={id:'qa-user',username:'reviewer',alias:'old-handle',email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:true,discordLinked:true,discordId:'1546745348020772915'};
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





await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');await page.locator('.tw-page-swap').waitFor();
await page.evaluate(async()=>{
const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {MuteButton}=await import('/src/components/MuteButton.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {setAudioBus}=await import('/src/lib/audioBus.ts');const host=document.createElement('div');host.id='mute-audit';host.style.cssText='position:fixed;inset:0;background:#101014;z-index:99999';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.auditRoot=root;const about=normalizeAbout({});window.auditDesign=about.design;window.customDesign=normalizeAbout({design:{version:6,cardWidth:900}}).design;window.oldDesign=normalizeAbout({design:{version:6,cardWidth:648}}).design;setAudioBus({muted:false,volume:.7});window.renderAudit=(right=false)=>root.render(React.createElement('aside',{className:'lkr-popup-audio '+(right?'lkr-popup-audio--right':'lkr-popup-audio--left'),style:{position:'absolute',top:20}},React.createElement(MuteButton,{settings:{...about.assets.audio,popupSize:60,popupBarWidth:180,popupDuration:600}})));window.renderAudit();
});
assert.equal(await page.evaluate(()=>window.auditDesign.cardWidth),760);assert.equal(await page.evaluate(()=>window.oldDesign.cardWidth),760);assert.equal(await page.evaluate(()=>window.customDesign.cardWidth),900);
const popup=page.locator('#mute-audit .ap-popup'),rail=popup.locator('.ap-popup-reveal');await popup.waitFor();await page.mouse.move(400,400);await page.waitForTimeout(200);assert.equal(await rail.evaluate(e=>getComputedStyle(e).opacity),'0');
await popup.locator('button').hover();await page.waitForTimeout(120);let mid=await rail.evaluate(e=>Number(getComputedStyle(e).opacity));assert(mid>0&&mid<1,'opening must have intermediate frames: '+mid);await page.waitForTimeout(650);assert.equal(await rail.evaluate(e=>getComputedStyle(e).opacity),'1');await page.screenshot({path:'.tmp/mute-audit-open.png'});
const range=popup.getByRole('slider');const r=await range.boundingBox();await page.mouse.move(r.x+r.width*.7,r.y+r.height/2);await page.mouse.down();await page.mouse.move(600,200);await page.waitForTimeout(250);assert(await popup.evaluate(e=>e.classList.contains('is-open')),'drag must hold rail open');await page.mouse.up();await page.waitForTimeout(230);mid=await rail.evaluate(e=>Number(getComputedStyle(e).opacity));assert(mid>0&&mid<1,'closing must have intermediate frames: '+mid);await page.waitForTimeout(650);assert.equal(await rail.evaluate(e=>getComputedStyle(e).visibility),'hidden');
await popup.locator('button').focus();await page.waitForTimeout(650);assert(await popup.evaluate(e=>e.classList.contains('is-open')));await page.keyboard.press('Escape');await page.waitForTimeout(650);assert.equal(await rail.evaluate(e=>getComputedStyle(e).visibility),'hidden');
await page.evaluate(()=>window.renderAudit(true));await popup.locator('button').hover();await page.waitForTimeout(650);const a=await popup.boundingBox(),b=await rail.boundingBox();assert(b.x+b.width<=a.x,'right-corner rail must open inward');await page.screenshot({path:'.tmp/mute-audit-right.png'});
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await rail.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await page.setViewportSize({width:1440,height:1000});await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default;const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');window.auditRoot.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'reviewer',alias:'tourn-profile'},about:normalizeAbout({bio:'A wider profile, with comfortable spacing and your own style.'}),widgets:normalizeWidgetStore({}),links:normalizeLinkStore({}),badges:normalizeBadgeStore({}),interactive:true,showEntry:false,showMetadata:false}));});await page.locator('#mute-audit .profile-preview').waitFor();await page.waitForTimeout(200);const profile=page.locator('#mute-audit .profile-preview');assert.equal(Math.round((await profile.boundingBox()).width),760);await page.screenshot({path:'.tmp/profile-audit-wide.png'});await page.setViewportSize({width:390,height:900});await page.waitForTimeout(250);assert((await profile.boundingBox()).width<=390);await page.screenshot({path:'.tmp/profile-audit-mobile.png'});assert.deepEqual(errors,[]);console.log('PASS 760px defaults and legacy migration, custom widths preserved, visible open/close frames, drag capture, keyboard/Escape, inward rail and reduced motion');
}finally{await browser.close();}
