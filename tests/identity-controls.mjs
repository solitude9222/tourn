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




await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');await page.getByRole('textbox',{name:'Display name',exact:true}).fill('My display name');await waitForSaves();await page.reload();assert.equal(await page.getByRole('textbox',{name:'Display name',exact:true}).inputValue(),'My display name');
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {MuteButton}=await import('/src/components/MuteButton.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');
 const host=document.createElement('div');host.id='identity-controls';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#09090b';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.identityRoot=root;
 const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="100"><rect width="1000" height="100" fill="white"/></svg>');
 const about=normalizeAbout({displayName:'My display name',bio:'Profile fixture'});window.identityAbout=about;
 const links=normalizeLinkStore({links:[{id:'wide',platform:'discord',url:'https://discord.com',label:'Wide custom',iconUrl:image,visible:true},{id:'normal',platform:'github',url:'https://github.com',label:'Standard',visible:true},{id:'portrait',platform:'discord',url:'https://discord.com',label:'Portrait custom',iconUrl:image.replace(encodeURIComponent('width="1000" height="100"'),encodeURIComponent('width="100" height="1000"')),visible:true}]});
 window.renderIdentity=(displayName='My display name',badgePosition='default')=>root.render(React.createElement(React.Fragment,null,React.createElement(LinkerPreview,{user:{id:'qa-user',username:'reviewer',alias:'username'},about:{...about,displayName,design:{...about.design,badgePosition}},widgets:normalizeWidgetStore({}),links,badges:normalizeBadgeStore({equipped:[{id:'owner',visible:true},{id:'premium',visible:true}]}),interactive:false,showEntry:false,showMetadata:false}),React.createElement('aside',{className:'lkr-popup-audio lkr-popup-audio--left',style:{zIndex:99999}},React.createElement(MuteButton,{settings:{...about.assets.audio,popupDuration:300}}))));window.renderIdentity();
});
await page.locator('#identity-controls .pv-display-name').waitFor();await page.waitForTimeout(700);
assert.equal(await page.locator('#identity-controls .pv-id h3').innerText(),'username');assert.equal(await page.locator('#identity-controls .pv-display-name').innerText(),'My display name');assert.equal(await page.locator('#identity-controls .pv-id .badge-row').count(),1);assert.equal(await page.locator('#identity-controls .pv-body > .pv-badges--default').count(),0);
const name=await page.locator('#identity-controls .pv-id h3').boundingBox(),badges=await page.locator('#identity-controls .pv-id .badge-row').boundingBox(),secondary=await page.locator('#identity-controls .pv-display-name').boundingBox();assert.ok(badges.x>=name.x+name.width);assert.ok(secondary.y>=name.y+name.height);
for(const width of [1440,390]) {await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);const geometry=await page.locator('#identity-controls .pv-link-icons').evaluate(row=>[...row.querySelectorAll('.pv-link-icon')].map(el=>{const r=el.getBoundingClientRect(),g=el.querySelector('.pv-link-glyph').getBoundingClientRect(),img=el.querySelector('img');return {x:r.x,y:r.y,width:r.width,height:r.height,cx:g.x+g.width/2,cy:g.y+g.height/2,inside:g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom,loaded:!img||img.complete&&img.naturalWidth>0};}));assert.equal(geometry.length,3);geometry.forEach((g,i)=>{assert.ok(g.inside);assert.ok(g.loaded);assert.ok(Math.abs(g.cx-g.x-g.width/2)<.5);assert.ok(Math.abs(g.cy-g.y-g.height/2)<.5);if(i)assert.ok(g.x>=geometry[i-1].x+geometry[i-1].width);});}
await page.setViewportSize({width:1440,height:1000});await page.mouse.move(700,50);const pill=page.locator('#identity-controls .ap-popup-volume');assert.equal(await pill.evaluate(el=>getComputedStyle(el).opacity),'0');await page.locator('#identity-controls .ap-popup-icon').hover();await page.waitForTimeout(80);const opening=await pill.evaluate(el=>Number(getComputedStyle(el).opacity));assert.ok(opening>0&&opening<1,'reveal should animate');await page.waitForTimeout(650);assert.equal(await pill.evaluate(el=>getComputedStyle(el).opacity),'1');await page.screenshot({path:'.tmp/identity-controls.png'});
await page.mouse.move(700,50);await page.waitForTimeout(650);assert.equal(await pill.evaluate(el=>getComputedStyle(el).opacity),'0');await page.evaluate(()=>window.renderIdentity(''));assert.equal(await page.locator('#identity-controls .pv-display-name').count(),0);
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await pill.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
assert.deepEqual(errors,[]);console.log('PASS display-name save/reload under username, inline default badges, custom wide/portrait icon containment and centering, animated volume reveal/close and reduced motion');
}finally{await browser.close();}
