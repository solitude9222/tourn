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





await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');
await page.getByRole('button',{name:'Edit banner',exact:true}).waitFor();
assert.equal(await page.title(),'tourn | Media & fonts');
assert.equal(await page.locator('.tw-view-profile,.tw-eye-btn').count(),0);
assert.equal(await page.locator('.tw-search input').getAttribute('placeholder'),'Search');
assert.match(await page.locator('.tw-user-meta small').innerText(),/^ID /);
await page.getByRole('button',{name:'Edit banner',exact:true}).click();
const banner=page.getByRole('dialog',{name:'Banner',exact:true});await banner.waitFor();
await banner.getByRole('button',{name:'Upload banner',exact:true}).waitFor();
await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Edit background',exact:true}).click();
assert.equal(await page.getByRole('dialog',{name:'Background',exact:true}).getByText('Banner',{exact:true}).count(),0);
await page.keyboard.press('Escape');
await page.screenshot({path:'.tmp/sidebar-media-refresh.png',fullPage:true});
for(const width of [1440,390]) {
 await page.setViewportSize({width,height:900});
 for(const route of ['appearance','badges','profile-main','widgets','portfolio-audio','settings']) {
  await page.goto('http://127.0.0.1:5180/#/dashboard/'+route);await page.locator('.tw-page-head h1').waitFor();await page.waitForTimeout(150);
  const geometry=await page.evaluate(()=>{const main=document.querySelector('.tw-main');main.scrollTop=main.scrollHeight;const r=main.getBoundingClientRect();return {right:document.documentElement.scrollWidth,viewport:innerWidth,bottom:r.bottom,height:innerHeight,remaining:main.scrollHeight-main.scrollTop-main.clientHeight};});
  assert.ok(geometry.right<=geometry.viewport+1,route+' horizontal overflow');assert.ok(geometry.bottom<=geometry.height,route+' main bottom');assert.ok(geometry.remaining<2,route+' bottom reachable');
 }
}
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5180/#/dashboard/badges');await page.getByRole('heading',{name:'Badge overview',exact:true}).waitFor();
assert.deepEqual(await page.locator('.tw-badge-catalog-v2 article b').allTextContents().then(a=>a.slice(0,6)),['Owner','Developer','Administrator','Staff','Verified','Premium']);
await page.screenshot({path:'.tmp/sidebar-badges-refresh.png',fullPage:true});

await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {Modal}=await import('/src/dash/ui.tsx');const {MediaLibrary}=await import('/src/dash/MediaLibrary.tsx');const {ProfilePreview}=await import('/src/components/ProfilePreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');
 const host=document.createElement('div');host.id='portal-check';host.style.cssText='position:fixed;inset:0;background:#101010;z-index:1000';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.refreshRoot=root;
 window.showNested=()=>root.render(React.createElement('div',{style:{transform:'translateX(0)',overflow:'hidden',height:20}},React.createElement(Modal,{open:true,title:'Parent editor',onClose:()=>{}},React.createElement(MediaLibrary,{open:true,kind:'anime',onClose:()=>{},onPick:()=>{}}))));
 window.showPublic=()=>{const about=normalizeAbout({displayName:'Larger profile',location:'Berlin'});window.refreshDesign=about.design;root.render(React.createElement(ProfilePreview,{about,user:{id:'qa-user',username:'reviewer'},badges:[],links:[],views:1234,hideAudio:true,disableTilt:true}));};window.showNested();
});
const library=page.getByRole('dialog',{name:'Anime library',exact:true});await library.waitFor();
assert.equal(await library.evaluate(el=>el.closest('.tw-dialog-portal').parentElement===document.body),true);
const libbox=await library.boundingBox();assert.ok(libbox.height>200&&libbox.y>=0&&libbox.y+libbox.height<=1000);
await page.evaluate(()=>window.showPublic());await page.locator('#portal-check .pv-id h3').waitFor();
assert.equal(await page.evaluate(()=>window.refreshDesign.cardWidth),800);assert.equal(await page.evaluate(()=>window.refreshDesign.nameSize),42);
await page.locator('#portal-check .pv-location').hover();await page.getByRole('tooltip').filter({hasText:'Location: Berlin'}).waitFor();
await page.locator('#portal-check .pv-views').hover();await page.getByRole('tooltip').filter({hasText:'1,234 profile views'}).waitFor();
await page.evaluate(()=>{window.refreshRoot.unmount();document.getElementById('portal-check').remove();});
await page.goto('http://127.0.0.1:5180/#/dashboard/portfolio-interests');await page.locator('.tw-page-head h1').waitFor();
await page.locator('.tw-section-add-btn--interest').first().click();
await page.locator('.tw-section-editor').first().evaluate(el=>{el.open=true});
assert.deepEqual(await page.locator('.tw-section-library button').allTextContents(),['Add anime','Add game','Add artist','Add song','Add film']);
assert.deepEqual(errors,[]);console.log('PASS sidebar, titles, separate banner editor, removed preview links, badge order, desktop/mobile scroll and bounds, interest libraries');
}finally{await browser.close();}

