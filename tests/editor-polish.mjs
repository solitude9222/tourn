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
let audioUploadBytes=0, audioUploadExpected=0, failAudioUpload=false;
let document=null, revision=0; const writes=[]; let failWrites=false; let failReads=false; let readDelay=0; let failAnalytics=false; const analyticsRequests=[]; let failViewWrite=false; let viewWrites=0; let presenceMonitored=false;
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.startsWith('/api/')) {
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

await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');
await page.locator('.tw-dash').waitFor();
assert.equal(await page.locator('.tw-editor-tools').count(),0);
const search=page.getByRole('searchbox',{name:'Search dashboard'});
await page.keyboard.press('Control+k');
assert.equal(await search.evaluate(el=>el===document.activeElement),true);
await search.fill('Audio');
await page.locator('.tw-nav-search-result').getByText('Audio',{exact:true}).click();
await page.getByRole('heading',{name:'Music',exact:true}).waitFor();
assert.equal(await search.inputValue(),'');
await page.evaluate(()=>location.hash='#/dashboard/profile-main');
const name=page.getByPlaceholder('Your display name');
const nameInputs=page.locator('input[maxlength="32"]');
const input=await name.count() ? name : nameInputs.first();
await input.waitFor();
const old=await input.inputValue();
await input.fill('Undo polish');
await input.evaluate(el=>el.blur());
await page.keyboard.press('Control+z');
assert.equal(await input.inputValue(),old);
await page.keyboard.press('Control+Shift+z');
assert.equal(await input.inputValue(),'Undo polish');
await page.evaluate(()=>location.hash='#/dashboard/portfolio-gallery');
await page.getByRole('button',{name:'Upload',exact:true}).waitFor();
await page.getByRole('button',{name:'Upload',exact:true}).click();
await page.locator('input[type=file]').setInputFiles({name:'one.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jlpQAAAAASUVORK5CYII=','base64')});
await page.locator('.tw-asset-card').waitFor();
await page.getByRole('button',{name:'Favorite one',exact:true}).click();
await page.getByRole('button',{name:'Select filtered (1)',exact:true}).click();
await page.getByRole('button',{name:'Delete selected (1)',exact:true}).click();
await page.getByRole('button',{name:'Cancel',exact:true}).click();
assert.equal(await page.locator('.tw-asset-card').count(),1);
await page.getByRole('button',{name:'Review duplicates',exact:true}).click();
await page.getByText('No duplicates found',{exact:true}).waitFor();
await page.setViewportSize({width:390,height:900});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:'.tmp/editor-polish-mobile.png',fullPage:false});
await page.keyboard.press('Escape');
await page.setViewportSize({width:1440,height:1000});
await page.evaluate(()=>location.hash='#/dashboard/effects');
await page.getByRole('navigation',{name:'Effect categories'}).waitFor();
await page.getByRole('button',{name:'Favorite Snow',exact:true}).click();
await page.getByRole('button',{name:'Favorites',exact:true}).click();
assert.equal(await page.locator('.fx-choice').count(),1);
await page.screenshot({path:'.tmp/editor-polish-desktop.png',fullPage:false});
const helpers=await page.evaluate(async()=>{
 const {normalizeAbout}=await import('/src/lib/about.ts');
 const {styleFrom}=await import('/src/dash/appearance.ts');
 const {saveLibrary}=await import('/src/dash/files.ts');
 const about=normalizeAbout({design:{skills:['react'],sections:[],aboutSlide:{text:'Private story'}},assets:{background:{positionX:200,positionY:-20,fit:'contain'}}});
 const picked=styleFrom(about.design);
 const original=Storage.prototype.setItem;
 let persisted;
 try { Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');}; persisted=saveLibrary('quota-fixture',[]); } finally { Storage.prototype.setItem=original; }
 return {x:about.assets.background.positionX,y:about.assets.background.positionY,fit:about.assets.background.fit,content:'aboutSlide' in picked,skills:'skills' in picked,persisted};
});
assert.deepEqual(helpers,{x:100,y:0,fit:'contain',content:false,skills:false,persisted:false});
await page.emulateMedia({reducedMotion:'reduce'});
const calm=await page.evaluate(async()=>{
 const {mountBgEffect}=await import('/src/lib/bgEffects.ts');
 const host=document.createElement('div');host.style.cssText='width:200px;height:100px;position:fixed;inset:0';document.body.append(host);
 const fx=mountBgEffect(host,{effect:'snow',intensity:60,speed:10,color:'#ffffff',amount:50,flag:false,maxFps:45});
 await new Promise(resolve=>setTimeout(resolve,150));const before=host.querySelector('canvas').toDataURL();
 await new Promise(resolve=>setTimeout(resolve,150));const after=host.querySelector('canvas').toDataURL();fx.destroy();host.remove();return before===after;
});
assert(calm,'Reduced motion canvas should remain still');
assert.deepEqual(errors,[]);
console.log('PASS editor search, keyboard undo/redo, toolbar removal, assets, bulk review and effect favorites');
} finally { await browser.close(); }
