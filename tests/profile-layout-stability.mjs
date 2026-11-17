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
 const React=(await import('/node_modules/.vite/deps/react.js')).default;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js');
 const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');
 const {normalizeAbout,createProfileSection}=await import('/src/lib/about.ts');
 const {normalizeWidgetStore,createWidgetInstance,WIDGET_PLATFORM_BY_ID}=await import('/src/lib/widgets.ts');
 const {normalizeLinkStore}=await import('/src/lib/links.ts');
 const {normalizeBadgeStore}=await import('/src/lib/badges.ts');
 const host=document.createElement('div');host.id='stable-preview';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#09090b';document.body.append(host);
 const root=(dom.createRoot||dom.default.createRoot)(host); window.stableRoot=root;
 const interest={...createProfileSection('interest'),title:'Interests',items:Array.from({length:4},(_,i)=>({id:'pick-'+i,title:'Example anime '+i,image:'/favicon-rounded.png',subtitle:'Adventure',meta:'2026',url:''}))};
 let about=normalizeAbout({displayName:'Sizing fixture',design:{version:2,layout:'stacked',cardWidth:480,showViews:true,slideshow:false,sectionsEnabled:true,slideshowAbout:true,aboutSlide:{title:'About me',text:'Left aligned writing in a centered content block.',tags:['react']},sections:[interest]},assets:{audio:{style:'compact',fileUrl:'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',title:'Fixed player'}}});
 const widgets=normalizeWidgetStore({widgets:['github','discord','github'].map((id,i)=>({...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get(id)),id:'stable-'+i,content:id==='discord'?'1546745348020772915':'octocat',options:{}}))});
 window.renderStable=(patch={})=>{about={...about,design:{...about.design,...patch}};root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'reviewer'},about,widgets,links:normalizeLinkStore({}),badges:normalizeBadgeStore({}),interactive:false,showEntry:false,showMetadata:false}));};
 window.renderStable();
});
await page.locator('#stable-preview .widget-card').first().waitFor();
const dimensions=()=>page.locator('#stable-preview').evaluate(host=>({widgets:[...host.querySelectorAll('.lkr-widgets>.widget-card')].map(el=>({width:el.offsetWidth,height:el.offsetHeight})),audio:host.querySelector('[data-detail="audio"]').offsetWidth,player:{width:host.querySelector('[data-detail="audio"] .ap').offsetWidth,height:host.querySelector('[data-detail="audio"] .ap').offsetHeight}}));
const baseline=await dimensions();
assert(baseline.widgets.every(card=>card.width===320&&card.height===88),JSON.stringify(baseline));assert.equal(baseline.audio,360);
for(const layout of ['left','centered','stacked'])for(const cardStyle of ['compact','default'])for(const cardWidth of [480,720])for(const audioSlot of ['below-card','card-bottom','page-top','page-bottom'])for(const widgetsPosition of ['below','inside']) {
 await page.evaluate(patch=>window.renderStable(patch),{layout,cardStyle,cardWidth,audioSlot,widgetsPosition});
 await page.waitForTimeout(25);
 assert.deepEqual(await dimensions(),baseline,JSON.stringify({layout,cardStyle,cardWidth,audioSlot}));
}
await page.evaluate(()=>window.renderStable({layout:'stacked',cardStyle:'default',slideshow:true,slideshowAbout:true,audioSlot:'below-card'}));
await page.setViewportSize({width:1920,height:1080});
await page.locator('#stable-preview .lkr-about-slide').waitFor();
const about=await page.locator('#stable-preview .lkr-about-slide').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,width:r.width,align:getComputedStyle(el).textAlign,textAlign:getComputedStyle(el.querySelector('.lkr-about-text')).textAlign};});
assert.equal(about.align,'left');assert.equal(about.textAlign,'left');assert(Math.abs(about.left+about.width/2-960)<5,JSON.stringify(about));
const posters=await page.locator('#stable-preview .lkr-interest-tile').evaluateAll(items=>items.map(el=>({width:el.offsetWidth,height:el.offsetHeight})));assert.equal(posters.length,4,JSON.stringify(posters));assert(posters.every(poster=>poster.width>=250&&poster.height>=330),JSON.stringify(posters));
await page.locator('#stable-preview .lkr-about-slide').evaluate(el=>el.scrollIntoView());
await page.screenshot({path:'.tmp/about-left-centered.png'});
await page.locator('#stable-preview .lkr-interest-set').evaluate(el=>el.scrollIntoView());
await page.screenshot({path:'.tmp/interests-large.png'});
await page.setViewportSize({width:390,height:900});
await page.waitForTimeout(100);
assert.equal(await page.locator('#stable-preview').evaluate(el=>el.scrollWidth>el.clientWidth),false);
await page.evaluate(()=>{window.stableRoot.unmount();document.getElementById('stable-preview').remove();});
await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');
await page.locator('.tw-dash').waitFor();
assert.equal(await page.locator('.tw-editor-tools').count(),0);
const input=page.locator('.tw-control input').first();await input.waitFor();
assert.equal(await input.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
assert.equal(await page.locator('.tw-card').first().evaluate(el=>getComputedStyle(el).backgroundImage),'none');
await page.setViewportSize({width:1440,height:1000});
await page.screenshot({path:'.tmp/dashboard-flat-fields.png'});
await page.evaluate(()=>location.hash='#/dashboard/layout');
await page.getByRole('heading',{name:'Layout preview'}).waitFor();
assert.equal(await page.locator('.tw-placement-inspector').count(),0);
const joinedPin=page.locator('.tw-layout-stage [data-detail="joined"]').first();
assert.equal(await joinedPin.count(),1,'Account creation detail is missing from the layout preview');
assert.match((await joinedPin.innerText()).trim(),/Joined/,'Account creation detail has no date');
await page.locator('.tw-layout-stage').scrollIntoViewIfNeeded();
await page.locator('.tw-layout-stage').evaluate(el=>el.scrollIntoView({block:'center'}));
const pin=page.locator('.tw-layout-stage [data-detail="views"]').first();
const box=await pin.boundingBox();assert(box);
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
await page.locator('[data-slot="page-tr"]').waitFor();
const target=await page.locator('[data-slot="page-tr"]').boundingBox();
await page.mouse.move(target.x+target.width/2,target.y+target.height/2);await page.mouse.up();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).design.viewSlot==='page-tr');
assert.equal(await page.locator('.tw-drop-layer').count(),0);
const cancelPin=await pin.boundingBox();await page.mouse.move(cancelPin.x+cancelPin.width/2,cancelPin.y+cancelPin.height/2);await page.mouse.down();await page.locator('.tw-drop-layer').waitFor();await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('.tw-drop-layer').count(),0);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).design.viewSlot),'page-tr');
await page.screenshot({path:'.tmp/placement-editor.png'});
await page.setViewportSize({width:390,height:900});await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);
console.log('PASS stable widget/audio dimensions across 96 placement/layout combinations, centered-left About, large posters, flat dashboard and captured drag/drop');
} finally { await browser.close(); }
