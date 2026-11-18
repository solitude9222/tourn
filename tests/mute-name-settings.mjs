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




await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');await page.getByRole('heading',{name:'Name settings',exact:true}).waitFor();await page.getByRole('textbox',{name:'Display name',exact:true}).fill('My chosen name');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user'))?.displayName==='My chosen name');await waitForSaves();await page.reload();await page.getByRole('textbox',{name:'Display name',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Display name',exact:true}).inputValue(),'My chosen name');
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.getByRole('button',{name:'Open audio manager'}).click();const dialog=page.getByRole('dialog',{name:'Audio player',exact:true});await dialog.getByRole('tab',{name:'Playback',exact:true}).click();await dialog.getByRole('switch',{name:'Mute button',exact:true}).click();
for(const [name,id] of [['Minimal circle','minimal'],['Glass','glass'],['Rounded square','rounded'],['Glossy circle','glossy']]){await dialog.getByRole('button',{name:'Mute button style',exact:true}).click();await page.getByRole('option',{name,exact:true}).click();await page.waitForFunction(id=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.audio.popupStyle===id,id);await dialog.locator('.ap-popup-style--'+id).waitFor();}
await page.screenshot({path:'.tmp/mute-style-settings.png'});await page.keyboard.press('Escape');
await page.setViewportSize({width:1280,height:900});await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {ProfilePreview}=await import('/src/components/ProfilePreview.tsx');const {MuteButton}=await import('/src/components/MuteButton.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {setAudioBus}=await import('/src/lib/audioBus.ts');
 const about=normalizeAbout(JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')));const host=document.createElement('div');host.id='mute-name-preview';host.style.cssText='position:fixed;inset:0;background:#101010;z-index:99999;display:grid;place-items:center';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.muteNameRoot=root;setAudioBus({muted:false,volume:.7});
 window.renderMuteName=(name='My chosen name',style='glossy')=>root.render(React.createElement(React.Fragment,null,React.createElement('aside',{style:{position:'absolute',left:12,top:12}},React.createElement(MuteButton,{settings:{...about.assets.audio,popupSize:60,popupStyle:style}})),React.createElement(ProfilePreview,{user:{id:'qa-user',username:'reviewer',alias:'old-handle'},about:{...about,displayName:name},badges:[],links:[],hideAudio:true,hideDetails:true,disableTilt:true})));window.renderMuteName();
});
await page.locator('#mute-name-preview .pv-id h3').waitFor();assert.equal(await page.locator('#mute-name-preview .pv-id h3').innerText(),'old-handle');assert.equal(await page.locator('#mute-name-preview .pv-display-name').innerText(),'My chosen name');const mute=page.locator('#mute-name-preview').getByRole('button',{name:'Mute music',exact:true});await mute.click();await page.locator('#mute-name-preview').getByRole('button',{name:'Unmute music',exact:true}).click();await mute.waitFor();assert.equal(await page.locator('#mute-name-preview audio').count(),0);const bounds=await mute.boundingBox();assert.equal(bounds.width,60);assert.equal(bounds.height,60);await page.screenshot({path:'.tmp/mute-reference-glossy.png'});
await page.evaluate(()=>window.renderMuteName('','rounded'));await page.locator('#mute-name-preview .ap-popup-style--rounded').waitFor();assert.equal(await page.locator('#mute-name-preview .pv-id h3').innerText(),'old-handle');assert.equal(await page.locator('#mute-name-preview .ap-popup-icon').evaluate(el=>getComputedStyle(el).borderRadius),'14px');
const legacy=await page.evaluate(async()=>{const {normalizeAbout}=await import('/src/lib/about.ts');return normalizeAbout({assets:{audio:{popupSize:42}}}).assets.audio;});assert.equal(legacy.popupStyle,'glossy');assert.equal(legacy.popupSize,60);
await page.evaluate(()=>{window.muteNameRoot.unmount();document.getElementById('mute-name-preview').remove();});assert.deepEqual(errors,[]);console.log('PASS display-name save/reload underneath username, alias fallback, four saved mute styles, 60px glossy reference, mute/unmute bus and no duplicate audio');
} finally {await browser.close();}
