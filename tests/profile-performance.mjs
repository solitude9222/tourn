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
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const account={id:'qa-user',username:'reviewer',email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:true,discordLinked:true,discordId:'1546745348020772915'};
let authDelay=0, envDelay=0, authSettled=false, envSettled=false; const publicRequests=new Map();
let audioUploadBytes=0, audioUploadExpected=0, failAudioUpload=false;
let document=null, revision=0; const writes=[]; let failWrites=false; let failReads=false; let readDelay=0; let failAnalytics=false; const analyticsRequests=[]; let failViewWrite=false; let viewWrites=0; let presenceMonitored=false;
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/env.js') { await new Promise(resolve=>setTimeout(resolve,envDelay)); envSettled=true; return route.fulfill({contentType:'text/javascript',body:'window.__ENV__={VITE_API_BASE_URL:""};'}); }
 if(url.pathname.startsWith('/api/')) {
  if(url.pathname.startsWith('/api/profile/')) { publicRequests.set(url.pathname,(publicRequests.get(url.pathname)||0)+1); return route.fulfill({json:{account:{...account,username:decodeURIComponent(url.pathname.split('/').pop())},profile:document,earned:[],revision}}); }
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
  if(url.pathname==='/api/auth/me') { await new Promise(resolve=>setTimeout(resolve,authDelay)); authSettled=true; return route.fulfill({json:{account}}); }
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


await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');
await page.locator('.tw-dash').waitFor();
document=await page.evaluate(async()=>{const {normalizeDocument}=await import('/src/lib/serverProfile.ts');return normalizeDocument({about:{displayName:'Instant profile fixture',bio:'Ready without account checks',design:{entry:{enabled:false},showViews:true}}});});
authDelay=1600;envDelay=2400;authSettled=false;envSettled=false;
await page.goto('http://127.0.0.1:5180/reviewer',{waitUntil:'domcontentloaded'});
await page.locator('.profile-page .profile-preview').waitFor();
assert.equal(authSettled,false,'Profile waited for account check');
assert.equal(envSettled,false,'Profile waited for env.js');
assert.equal(publicRequests.get('/api/profile/reviewer'),1,'Cold load duplicated bootstrap request');
await page.evaluate(()=>{window.blankAfterPaint=false;window.loadingObserver=new MutationObserver(()=>{if(document.querySelector('.profile-page--loading'))window.blankAfterPaint=true;});window.loadingObserver.observe(document.body,{subtree:true,childList:true});});
await page.waitForTimeout(2800);
assert.equal(await page.evaluate(()=>window.blankAfterPaint),false,'Owner hydration blanked a ready public page');
// Both hash and path links warm the same cache. Cached navigation paints in its first render.
await page.evaluate(()=>{const link=document.createElement('a');link.href='#/profile/warmed';link.textContent='Warm profile';link.id='warm-link';document.body.append(link);link.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));});
await page.waitForFunction(async()=>{const {peekPublicProfile}=await import('/src/lib/serverProfile.ts');return Boolean(peekPublicProfile('warmed'));});
await page.evaluate(()=>location.hash='#/profile/warmed');
await page.waitForFunction(()=>document.querySelector('.profile-page .profile-preview'));
assert.equal(await page.evaluate(()=>window.blankAfterPaint),false,'Cached profile inserted a loading frame');
assert.equal(publicRequests.get('/api/profile/warmed'),1,'Hash link prefetch requested the wrong profile or fetched twice');
assert.equal(publicRequests.has('/api/profile/profile'),false);
assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(entry=>entry.name.includes('/src/dash/DashboardApp'))),false,'Public profile preloaded the dashboard');
const changed=JSON.parse(JSON.stringify(document));changed.about.displayName='Fresh published fixture';document=changed;
const fresh=await page.evaluate(async()=>{const {fetchPublicProfile}=await import('/src/lib/serverProfile.ts');const result=await fetchPublicProfile('reviewer',{force:true});return result.ok?result.data.profile.about.displayName:null;});
assert.equal(fresh,'Fresh published fixture','Force refresh reused the initial HTML response');
console.log('PASS public profile paints before delayed auth/env, single bootstrap read, no hydration blank, cached hash navigation and fresh retry');
const schedule=await page.evaluate(async()=>{
 const {mountBgEffect}=await import('/src/lib/bgEffects.ts');
 const original={raf:window.requestAnimationFrame,cancel:window.cancelAnimationFrame,ro:window.ResizeObserver,io:window.IntersectionObserver};
 let callbacks=new Map(),id=0;
 window.requestAnimationFrame=cb=>{callbacks.set(++id,cb);return id;};window.cancelAnimationFrame=id=>callbacks.delete(id);
 window.ResizeObserver=class{observe(){}disconnect(){}};window.IntersectionObserver=class{observe(){}disconnect(){}};
 const output=[];
 try {
  for(const effect of ['snowstorm','stars','blur','night','tv','dither','fuzzy','flash','snow','rain','dust','leaf'])for(const refresh of [60,120]) {
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:320px;height:180px';document.body.append(host);
   const fx=mountBgEffect(host,{effect,intensity:50,speed:9,color:'#ffffff',amount:50,flag:false});
   const context=host.querySelector('canvas').getContext('2d'),clear=context.clearRect;let frames=0;context.clearRect=function(...args){frames++;return clear.apply(this,args);};
   const base=performance.now();for(let frame=1;frame<=refresh;frame++){const current=[...callbacks.values()];callbacks.clear();for(const callback of current)callback(base+frame*1000/refresh);}
   output.push({effect,refresh,frames});fx.destroy();host.remove();
  }
 } finally {window.requestAnimationFrame=original.raf;window.cancelAnimationFrame=original.cancel;window.ResizeObserver=original.ro;window.IntersectionObserver=original.io;}
 return output;
});
for(const row of schedule){if(row.effect==='blur')assert(row.frames<=1);else assert.equal(row.frames,row.refresh,JSON.stringify(row));}
console.log('PASS all 11 animated canvas effects follow 60/120 Hz scheduling without hidden FPS caps; blur remains static');
// Measure real scheduling as a smoke check, separate from deterministic refresh tests.
const real=await page.evaluate(async()=>{
 const {mountBgEffect}=await import('/src/lib/bgEffects.ts');const results=[];
 for(const effect of ['snowstorm','stars','night','tv','dither','fuzzy','flash','snow','rain','dust','leaf']) {
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.append(host);
  const fx=mountBgEffect(host,{effect,intensity:50,speed:9,color:'#ffffff',amount:50,flag:false});const ctx=host.querySelector('canvas').getContext('2d'),clear=ctx.clearRect;let frames=0;ctx.clearRect=function(...args){frames++;return clear.apply(this,args);};
  const start=performance.now();await new Promise(resolve=>setTimeout(resolve,450));const fps=frames*1000/(performance.now()-start);fx.destroy();host.remove();results.push({effect,fps:Number(fps.toFixed(1))});
 }
 return results;
});
for(const row of real)assert(row.fps>30,'Low frame rate: '+JSON.stringify(row));console.log('Measured full-viewport effects: '+JSON.stringify(real));
assert.deepEqual(errors,[]);
} finally { await browser.close(); }
