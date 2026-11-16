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




await page.goto('http://127.0.0.1:5180/#/dashboard/portfolio-gallery');
await page.locator('.tw-gallery-layouts').waitFor();
const galleryLayouts=await page.locator('.tw-gallery-layouts > button').evaluateAll(buttons=>buttons.map(button=>{const style=getComputedStyle(button);return{pressed:button.getAttribute('aria-pressed')==='true',background:style.backgroundColor,border:style.borderTopWidth,thumbnail:Boolean(button.querySelector('.tw-gallery-layout-thumb'))};}));
assert.equal(galleryLayouts.length,4);
assert.equal(galleryLayouts.filter(item=>item.pressed).length,1);
assert(galleryLayouts.every(item=>item.thumbnail&&item.border==='2px'&&item.background!=='rgba(0, 0, 0, 0)'),JSON.stringify(galleryLayouts));
await page.getByRole('textbox',{name:'Direct gallery media URL'}).fill('http://127.0.0.1:5180/favicon-rounded.png');
await page.getByRole('button',{name:'Import URL',exact:true}).click();
await page.getByRole('textbox',{name:'Caption 1'}).fill('First image');
await page.getByRole('textbox',{name:'Direct gallery media URL'}).fill('http://127.0.0.1:5180/logo.png');
await page.getByRole('button',{name:'Import URL',exact:true}).click();
await page.getByRole('textbox',{name:'Caption 2'}).fill('Second image');
await page.getByRole('button',{name:'Move up',exact:true}).last().click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).design.gallery.items[0].caption==='Second image');
await page.getByRole('button',{name:'Masonry Natural image heights',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).design.gallery.layout==='masonry');
await waitForSaves();
await page.reload();await page.getByRole('textbox',{name:'Caption 1'}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Caption 1'}).inputValue(),'Second image');
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js'),createRoot=dom.createRoot||dom.default.createRoot;
 const {ProfileGallery}=await import('/src/components/ProfileGallery.tsx');const {ProfileMetadata}=await import('/src/components/ProfileMetadata.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');
 const about=normalizeAbout(JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')));window.publicAbout=about;
 const host=document.createElement('div');host.id='public-gallery-qa';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#0b0b0c;overflow:auto;padding:40px';document.body.append(host);const root=createRoot(host);window.galleryRoot=root;
 window.renderGallery=(layout)=>root.render(React.createElement(ProfileGallery,{settings:{...about.design.gallery,layout}}));window.renderGallery('masonry');
 const meta=document.createElement('div');document.body.append(meta);const titleRoot=createRoot(meta);window.titleRoot=titleRoot;window.oldTitle=document.title;window.animateTitle=animation=>titleRoot.render(React.createElement(ProfileMetadata,{about:{...about,metadata:{...about.metadata,title:'Gallery QA',animation,messages:['Second QA'],interval:2}},user:{username:'reviewer'}}));
});
await page.locator('#public-gallery-qa .lkr-gallery-grid.is-masonry').waitFor();
await page.getByRole('button',{name:'Second image',exact:true}).click();
await page.locator('.lkr-gallery-dialog[open]').waitFor();
await page.getByRole('button',{name:'Next gallery item'}).click();await page.locator('.lkr-gallery-full img[alt="First image"]').waitFor();
await page.keyboard.press('Escape');await page.locator('.lkr-gallery-dialog[open]').waitFor({state:'hidden'});
for(const layout of ['grid','carousel','filmstrip']){await page.evaluate(layout=>window.renderGallery(layout),layout);await page.locator('#public-gallery-qa .is-'+layout).waitFor();}
await page.evaluate(()=>window.animateTitle('typewriter'));await page.waitForTimeout(250);assert.notEqual(await page.title(),'Gallery QA');await page.waitForFunction(()=>document.title==='Gallery QA');
await page.evaluate(()=>window.animateTitle('marquee'));await page.waitForTimeout(250);assert.match(await page.title(),/QA/);
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.title==='Gallery QA');
await page.evaluate(()=>window.titleRoot.unmount());assert.equal(await page.title(),await page.evaluate(()=>window.oldTitle));
await page.evaluate(()=>window.galleryRoot.unmount());
assert.deepEqual(errors,[]);console.log('PASS gallery import/caption/reorder/save/reload, four public layouts, lightbox arrows/Escape, browser tab typewriter/marquee, reduced motion and cleanup');
} finally {await browser.close();}
