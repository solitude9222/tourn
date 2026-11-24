// Run with the Vite dev server on port 5180. Set BROWSER_PATH to a Chromium executable.
// All API and third-party requests are intercepted; no real accounts are modified.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('.tmp',{recursive:true});
const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || (process.platform==='win32' ? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' : chromium.executablePath()),headless:true});
try {
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();page.setDefaultTimeout(15000);
await page.addInitScript(() => { window.qaLoadingFallback = false; new MutationObserver(() => { if (document.querySelector(".route-loading")) window.qaLoadingFallback = true; }).observe(document, {childList:true,subtree:true}); });
const waitForSaves=()=>page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'),null,{timeout:15000});
const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const account={id:'qa-user',username:'reviewer',alias:'chosen',aliasRequired:false,isAdmin:true,isOwner:true,email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:true,discordLinked:true,discordId:'1546745348020772915'};
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




let products=[];let createRequests=0;
await context.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 if(path==='/api/admin/marketplace/products'){
  if(route.request().method()==='POST'){createRequests++;const body=route.request().postDataJSON();const product={...body,checkout_env:body.checkout_env||'TOURN_PRODUCT_'+body.id.replaceAll('-','_').toUpperCase(),ready:false};products.push(product);return route.fulfill({status:201,json:{product}});}
  return route.fulfill({json:{products}});
 }
 if(path==='/api/marketplace/products')return route.fulfill({json:{products:products.filter(p=>p.enabled).map(({checkout_env,...p})=>p)}});
 if(path==='/api/profile/alias'){account.alias=route.request().postDataJSON().alias;account.aliasRequired=false;return route.fulfill({json:{account}});}
 if(path==='/api/admin/settings')return route.fulfill({json:{settings:{registration:'open',homePreview:'off',premiumRain:false}}});
 if(path==='/api/admin/summary')return route.fulfill({json:{users:2,views:42,premium:1,admins:1,activeInvites:0}});
 if(path==='/api/admin/profiles')return route.fulfill({json:{profiles:[]}});
 return route.fallback();
});
await page.goto('http://127.0.0.1:5180/#/dashboard/home');await page.getByRole('button',{name:'Tourn Setup Guide',exact:true}).click();await page.locator('.setup-journey').waitFor();assert(page.url().includes('getting-started'));assert.equal(await page.locator('.tw-modal').count(),0);
for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'guide overflow '+width);await page.screenshot({path:'.tmp/setup-journey-'+width+'.png',fullPage:true});}
await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Desktop',exact:true}).click();assert(await page.locator('.journey-stage').evaluate(e=>e.classList.contains('is-phone')));await page.getByRole('button',{name:'3D preview',exact:true}).click();assert.equal(await page.getByRole('button',{name:'3D preview',exact:true}).getAttribute('aria-pressed'),'false');await page.getByRole('button',{name:'Next step',exact:true}).click();await page.locator('.journey-detail h2').filter({hasText:'Make the card yours'}).waitFor();
await page.goto('http://127.0.0.1:5180/#/dashboard/settings');await page.locator('.tw-set').waitFor();assert.equal(await page.getByText('Second claim',{exact:true}).count(),0);
await page.goto('http://127.0.0.1:5180/#/dashboard/admin');await page.locator('.adm-tabs').getByRole('button',{name:'Marketplace',exact:true}).click();await page.locator('.market-admin').waitFor();await page.getByLabel('Product ID',{exact:true}).fill('summer-badge');await page.getByLabel('Title',{exact:true}).fill('Summer badge');await page.getByLabel('Description',{exact:true}).fill('Our seasonal badge.');await page.getByLabel('Delivery',{exact:true}).selectOption('badge');await page.getByLabel('Publish in marketplace',{exact:true}).check();await page.getByRole('button',{name:'Save product',exact:true}).click();await page.locator('.market-env code').waitFor();assert.equal(createRequests,1);assert.equal(await page.locator('.market-env code').textContent(),'TOURN_PRODUCT_SUMMER_BADGE=PRODUCT_ID:VARIANT_ID');
for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Admin overflow '+width);await page.screenshot({path:'.tmp/marketplace-admin-'+width+'.png',fullPage:true});}
await page.goto('http://127.0.0.1:5180/#/shop');await page.getByRole('heading',{name:'Made for your profile.',exact:true}).waitFor();await page.getByRole('heading',{name:'Summer badge',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Coming soon',exact:true}).isDisabled());assert.equal(await page.getByText('Single letters',{exact:true}).count(),0);assert.equal(await page.getByText('Special characters',{exact:true}).count(),0);await page.screenshot({path:'.tmp/marketplace-mobile.png',fullPage:true});
const footer=page.locator('.hm-footer');assert.equal(await footer.evaluate(e=>getComputedStyle(e).backgroundImage),'none');assert((await footer.locator('img').count())>=2);
await page.setViewportSize({width:1280,height:900});await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const host=document.createElement('div');host.id='minimal-qa';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#080808';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.renderMinimal=(width=640)=>root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'chosen',alias:'chosen',avatarUrl:'/favicon-rounded.png'},about:normalizeAbout({design:{minimalStart:true,cardWidth:width}}),widgets:normalizeWidgetStore({}),interactive:false,showEntry:false,showMetadata:false,views:0}));window.renderMinimal();});
const card=page.locator('#minimal-qa .profile-preview');await card.waitFor();await page.waitForTimeout(250);const box=await card.boundingBox();assert(Math.abs(box.width-640)<2,'minimal width '+box.width);assert(box.height<=160,'minimal height '+box.height);assert.equal(await card.getAttribute('data-bare'),'true');assert.equal(await card.locator('.pv-avatar-wrap').evaluate(e=>getComputedStyle(e).display),'none');assert.equal(await page.getByText('A bio is on the way.',{exact:true}).count(),0);assert.equal(await page.getByText('No widgets yet.',{exact:true}).count(),0);const titleBox=await card.locator('h3').boundingBox();assert(Math.abs((titleBox.x+titleBox.width/2)-(box.x+box.width/2))<3,'empty name is centered');assert.equal(await card.locator('.pv-card-fx').count(),0);await page.screenshot({path:'.tmp/minimal-profile.png'});await page.evaluate(()=>window.renderMinimal(800));await page.waitForTimeout(200);assert((await card.boundingBox()).width>790,'card width control stays usable');
await page.evaluate(()=>document.querySelector('#minimal-qa')?.remove());account.alias=null;account.aliasRequired=true;await page.goto('http://127.0.0.1:5180/#/dashboard/home');await page.reload();const gate=page.getByRole('dialog',{name:'Set your alias',exact:true});await gate.waitFor();await gate.getByRole('textbox',{name:'Your new alias',exact:true}).fill('newchosen');const confirm=gate.getByRole('button',{name:'Set alias',exact:true});await confirm.focus();await page.keyboard.press('Tab');assert(await gate.getByRole('textbox').evaluate(e=>e===document.activeElement));await page.keyboard.press('Shift+Tab');assert(await confirm.evaluate(e=>e===document.activeElement));await page.keyboard.press('Escape');assert(await gate.isVisible());await confirm.click();await gate.waitFor({state:'detached'});assert.equal(account.alias,'newchosen');
assert.deepEqual(errors,[]);console.log('PASS full-page guide, desktop/phone preview, Admin product creation/env guidance, mobile layouts, dark branded footer and minimal profile sizing');
}finally{await browser.close();}
