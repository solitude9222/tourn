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





await page.addInitScript(()=>{window.qaVideoEvents=[];HTMLMediaElement.prototype.play=function(){window.qaVideoEvents.push({kind:'play',className:this.className,at:performance.now(),currentTime:this.currentTime});return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){window.qaVideoEvents.push({kind:'pause',className:this.className,at:performance.now()});};});
await page.goto('http://127.0.0.1:5180/#/dashboard/badges');await page.getByRole('tab',{name:'Design',exact:true}).click();const animated=page.getByRole('switch',{name:'Animated badges',exact:true});await animated.waitFor();await animated.click();await waitForSaves();await page.reload();await page.getByRole('tab',{name:'Design',exact:true}).click();assert.equal(await page.getByRole('switch',{name:'Animated badges',exact:true}).getAttribute('aria-checked'),'false');
assert.equal(await page.locator('.tw-nav-group button,.tw-nav-collapse').count(),0);assert.ok(await page.locator('.tw-nav-item').count()>15);
await page.locator('.tw-user-row').click();await page.getByRole('menu',{name:'Account menu',exact:true}).waitFor();assert.equal(await page.locator('.tw-user-pop').evaluate(el=>getComputedStyle(el).animationName),'uiMenuIn');await page.screenshot({path:'.tmp/account-menu-polish.png'});await page.keyboard.press('Escape');
// Seed only the intercepted test backend with a saved video background.
document=await page.evaluate(async()=>{const {normalizeDocument}=await import('/src/lib/serverProfile.ts');return normalizeDocument({about:{assets:{background:{style:'video',videoUrl:'/qa-video.webm',videoDelay:2,videoStartAt:5,videoFade:400,videoWaitForEntry:true}}}});});revision++;
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.reload();await page.getByRole('button',{name:'Edit background',exact:true}).click();const background=page.getByRole('dialog',{name:'Background',exact:true});await background.getByText('Video entrance',{exact:true}).waitFor();for(const label of ['Playback delay','Start at','Fade in'])await background.getByRole('slider',{name:label,exact:true}).waitFor();await background.getByRole('switch',{name:'Wait for entry screen',exact:true}).waitFor();await page.screenshot({path:'.tmp/background-entrance-controls.png'});await page.keyboard.press('Escape');
await page.goto('http://127.0.0.1:5180/#/');await page.getByRole('button',{name:'Account menu',exact:true}).click();const headerMenu=page.locator('.site-head .menu');await headerMenu.waitFor();assert.equal(await headerMenu.evaluate(el=>getComputedStyle(el).animationName),'uiMenuIn');await page.keyboard.press('Escape');
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');const {TECH_STACK}=await import('/src/lib/techStack.ts');
 const host=document.createElement('div');host.id='motion-review';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#09090b;overflow:auto';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.motionRoot=root;
 const about=normalizeAbout({displayName:'All dotted text',bio:'Dotted description',location:'Berlin',design:{scattered:true,skills:TECH_STACK.map(t=>t.id),slideshow:true,sectionsEnabled:true,entry:{enabled:true,title:'Welcome',oncePerSession:false,animation:'blur',animationDuration:300}},assets:{background:{style:'video',videoUrl:'/qa-video.webm',videoDelay:.3,videoStartAt:5,videoFade:400,videoWaitForEntry:true}}});window.motionAbout=about;
 root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'reviewer'},about,widgets:normalizeWidgetStore({}),links:normalizeLinkStore({}),badges:normalizeBadgeStore({equipped:[{id:'owner',visible:true}],style:{animated:false}}),interactive:true,showEntry:true,showMetadata:false}));
});
const entry=page.locator('#motion-review .lkr-entry');await entry.waitFor();const video=page.locator('#motion-review .lkr-bg-video');await video.evaluate(el=>{Object.defineProperty(el,'duration',{configurable:true,value:60});Object.defineProperty(el,'readyState',{configurable:true,value:1});el.dispatchEvent(new Event('loadedmetadata'));});await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>window.qaVideoEvents.filter(e=>e.kind==='play'&&e.className.includes('lkr-bg-video')).length),0);await entry.click();await entry.waitFor({state:'detached'});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.qaVideoEvents.filter(e=>e.kind==='play'&&e.className.includes('lkr-bg-video')).length),0);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.qaVideoEvents.filter(e=>e.kind==='play'&&e.className.includes('lkr-bg-video')).length),1);assert.equal(await video.evaluate(el=>el.currentTime),5);await page.waitForTimeout(450);assert.equal(await video.evaluate(el=>getComputedStyle(el).opacity),'1');
assert.match(await page.locator('#motion-review .pv-bio').evaluate(el=>getComputedStyle(el).fontFamily),/Tourn Doto/);assert.match(await page.locator('#motion-review .lkr-skills-section h2').evaluate(el=>getComputedStyle(el).fontFamily),/Tourn Doto/);assert.ok((await page.locator('#motion-review .badge-chip-art').getAttribute('src')).includes('/still/'));
for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);const bounds=await page.locator('#motion-review .lkr-skills-section').evaluate(el=>{const r=el.getBoundingClientRect();return {last:el.querySelector('.lkr-tech:last-child').getBoundingClientRect().bottom,bottom:r.bottom,right:r.right,viewport:innerWidth,count:el.querySelectorAll('.lkr-tech').length};});assert.ok(bounds.count>20);assert.ok(bounds.last<=bounds.bottom+1);assert.ok(bounds.right<=bounds.viewport+1);}
const alpha=await page.evaluate(async()=>{const image=new Image();image.src='/favicon-32.png?v=4';await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,1,1).data[3];});assert.equal(alpha,0);
assert.deepEqual(errors,[]);console.log('PASS persistent badge animation toggle, permanent categories, animated account menus, video start/delay/fade/entry gate, all-text dotted font, unclipped skills and transparent favicon');
}finally{await browser.close();}
