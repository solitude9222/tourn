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
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore,createWidgetInstance,WIDGET_PLATFORM_BY_ID}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');
 const host=document.createElement('div');host.id='compact-reference';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#09090b';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.compactRoot=root;
 window.baseCompact=normalizeAbout({displayName:'koni',bio:'tourn.lol owner :c',assets:{avatarUrl:'/favicon-rounded.png'},design:{version:5,cardWidth:570,nameSize:64,scattered:true,scatteredSize:90,backgroundOpacity:0,borderOpacity:0}});
 window.compactRoundTrip=normalizeAbout({...window.baseCompact,design:{...window.baseCompact.design,cardWidth:710,nameSize:40}}).design;
 const widgets=normalizeWidgetStore({widgets:['github','discord','github','discord'].map((id,i)=>({...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get(id)),id:'compact-'+i,content:id==='discord'?'1546745348020772915':'octocat',options:{}}))});
 window.renderCompact=(patch={})=>root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'reviewer'},about:{...window.baseCompact,design:{...window.baseCompact.design,...patch}},widgets,links:normalizeLinkStore({}),badges:normalizeBadgeStore({}),interactive:false,showEntry:false,showMetadata:false}));window.renderCompact();
});
await page.locator('#compact-reference .widget-card').first().waitFor();
assert.equal(await page.evaluate(()=>window.compactRoundTrip.cardWidth),710);assert.equal(await page.evaluate(()=>window.compactRoundTrip.nameSize),40);
const report=[];
for(const width of [1440,1920,390]) {
 await page.setViewportSize({width,height:1000});
 for(const layout of ['stacked','left','centered'])for(const scattered of [false,true])for(const slideshow of [false,true]) {
  await page.evaluate(p=>window.renderCompact(p),{layout,scattered,slideshow});await page.waitForTimeout(650);
  const metrics=await page.locator('#compact-reference').evaluate(host=>{const box=el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}};return {card:box(host.querySelector('.profile-preview')),name:box(host.querySelector('.pv-id h3')),avatar:box(host.querySelector('.pv-avatar')),widgets:[...host.querySelectorAll('.widget-card')].map(box),gap:getComputedStyle(host.querySelector('.lkr-widgets')).gap,bodyWidth:document.documentElement.scrollWidth};});
  if(width>640){assert.ok(Math.abs(metrics.card.width-648)<1,JSON.stringify({layout,scattered,slideshow,metrics}));assert.ok(Math.abs(metrics.avatar.width-105)<1);}
  assert.ok(metrics.name.height<64,'oversized name '+JSON.stringify({width,layout,scattered,slideshow,metrics}));
  for(const card of metrics.widgets){assert.ok(width>640 ? Math.abs(card.width-285)<1 : card.width<=285 && card.width>=260,'widget width '+card.width);assert.ok(Math.abs(card.height-70)<1,'widget height '+card.height);}
  assert.equal(metrics.gap,'12px');assert.ok(metrics.bodyWidth<=width+1);report.push({viewport:width,layout,scattered,slideshow,...metrics});
 }
}
await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.renderCompact({layout:'stacked',scattered:true,slideshow:false}));await page.waitForTimeout(150);await page.screenshot({path:'.tmp/compact-reference-v6.png'});
const {writeFile}=await import('node:fs/promises');await writeFile('docs/compact-reference-sizing.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log('PASS 36 desktop/mobile layout/effect/slideshow cases; 648px profile, 105px avatar, compact plain/dot names, 285x70 cards, 12px gaps and saved-profile migration');
}finally{await browser.close();}


