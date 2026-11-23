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
const account={id:'qa-user',username:'reviewer',email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:true,discordLinked:true,discordId:'1546745348020772915'};
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




await page.goto('http://127.0.0.1:5180/#/contact');const trigger=page.getByRole('button',{name:'Account menu',exact:true});await trigger.waitFor();assert.equal(await page.getByRole('menu',{name:'Your account'}).count(),0);await trigger.focus();await trigger.press('ArrowDown');const menu=page.getByRole('menu',{name:'Your account'});await menu.waitFor();assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Dashboard');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'View profile');assert.equal(await menu.getByRole('menuitem',{name:'Account settings'}).getAttribute('href'),'#/dashboard/settings');await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Sign out');await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');await page.waitForTimeout(200);assert.equal(await page.getByRole('menu').count(),0);assert(await trigger.evaluate(e=>e===document.activeElement));
for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await trigger.click();await page.waitForTimeout(220);const bounds=await menu.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'header overflow at '+width);await page.screenshot({path:'.tmp/account-menu-'+width+'.png'});await page.mouse.click(5,700);await page.waitForTimeout(220);}
await page.setViewportSize({width:1280,height:900});await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');const {normalizeCursorArt}=await import('/src/lib/cursorImage.ts');const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#71bbff';ctx.beginPath();ctx.moveTo(32,24);ctx.lineTo(32,90);ctx.lineTo(90,65);ctx.closePath();ctx.fill();window.mouseNormal=canvas.toDataURL();ctx.clearRect(0,0,128,128);ctx.fillStyle='#72e0ba';ctx.fillRect(12,12,90,90);window.mousePointer=canvas.toDataURL();window.preparedNormal=await normalizeCursorArt(window.mouseNormal);window.preparedPointer=await normalizeCursorArt(window.mousePointer);const host=document.createElement('div');host.id='cursor-qa';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#101014';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.cursorRoot=root;window.renderCursor=(url=window.mouseNormal)=>root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'cursor-test'},about:normalizeAbout({bio:'Testing uploaded cursors.',assets:{cursor:{style:'custom',imageUrl:url,pointerImageUrl:window.mousePointer}}}),widgets:normalizeWidgetStore({}),links:normalizeLinkStore({links:[{id:'test',platform:'website',url:'https://example.com',visible:true,label:'Test link'}]}),badges:normalizeBadgeStore({}),interactive:true,showEntry:false,showMetadata:false}));window.renderCursor();});
await page.locator('#cursor-qa .lkr-page').waitFor();await page.waitForTimeout(150);await page.mouse.move(80,160);const cursor=page.locator('.profile-uploaded-cursor');await cursor.waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.profile-uploaded-cursor')).visibility==='visible');assert.equal(await cursor.getAttribute('src'),await page.evaluate(()=>window.preparedNormal.url));const rect=await cursor.boundingBox(),hotspot=await page.evaluate(()=>window.preparedNormal.hotspot);assert.equal(rect.width,32);assert.equal(Math.round(rect.x),80-hotspot.x);assert.equal(Math.round(rect.y),160-hotspot.y);await page.locator('#cursor-qa .pv-link-icon').first().hover();await page.waitForFunction(()=>document.querySelector('.profile-uploaded-cursor')?.getAttribute('src')===window.preparedPointer.url);await page.screenshot({path:'.tmp/custom-cursor-working.png'});
const gif=await page.evaluate(async()=>{const {normalizeCursorArt}=await import('/src/lib/cursorImage.ts');return normalizeCursorArt('/oneko.gif');});assert.equal(gif.url,'/oneko.gif');assert(gif.hotspot.x<32&&gif.hotspot.y<32);await page.evaluate(()=>window.renderCursor('/oneko.gif'));await page.mouse.move(82,162);await page.waitForFunction(()=>document.querySelector('.profile-uploaded-cursor')?.getAttribute('src')==='/oneko.gif');assert.equal((await cursor.boundingBox()).width,32);
await context.route('**/broken-cursor.png',route=>route.fulfill({status:404,body:''}));await page.evaluate(()=>window.renderCursor('/broken-cursor.png'));await page.mouse.move(81,161);await page.waitForTimeout(400);assert.equal(await page.locator('#cursor-qa .profile-uploaded-cursor-active').count(),0,'broken art must preserve the native cursor');await page.evaluate(()=>{window.cursorRoot.unmount();document.getElementById('cursor-qa').remove();});assert.equal(await page.locator('.profile-uploaded-cursor').count(),0);assert.deepEqual(errors,[]);console.log('PASS keyboard/outside/Escape account menu, 320/390/1440 layout bounds, custom cursor image and hotspot, separate link pointer, broken-image fallback and cleanup');
}finally{await browser.close();}
