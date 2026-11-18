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
  if(url.pathname==='/api/profile') {if(failReads) return route.fulfill({status:503,json:{error:'Read unavailable'}}); if(readDelay) await new Promise(r=>setTimeout(r,readDelay)); return route.fulfill({json:{account,profile:document,earned:['owner','premium','verified'],revision}});}
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




const modalSizes={};
await page.setViewportSize({width:1600,height:1000});
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.getByRole('heading',{name:'Media',exact:true}).waitFor();
await page.getByRole('button',{name:'Edit profile picture',exact:true}).click();const avatar=page.getByRole('dialog',{name:'Profile picture',exact:true});await avatar.waitFor();modalSizes.avatar=await avatar.boundingBox();
await avatar.getByRole('tab',{name:'Decorations',exact:true}).click();assert.equal(await avatar.locator('.fx-choice').count(),8);await avatar.locator('.fx-choice').nth(1).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.decoration.discordUrl);
await avatar.getByRole('tab',{name:'Profile',exact:true}).click();const zoom=avatar.getByRole('slider',{name:'Picture zoom',exact:true});const zoomBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.decoration.zoom);const zr=await zoom.boundingBox();await page.mouse.move(zr.x+zr.width*.4,zr.y+zr.height/2);await page.mouse.down();await page.mouse.move(zr.x+zr.width*.8,zr.y+zr.height/2,{steps:35});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.decoration.zoom),zoomBefore,'Slider updated the global profile while dragging');assert.equal(await page.locator('html').getAttribute('data-editor-gesture'),'true');await page.mouse.up();await page.waitForFunction(before=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.decoration.zoom!==before,zoomBefore);assert.equal(await page.locator('html').getAttribute('data-editor-gesture'),null);
await page.keyboard.press('Escape');await avatar.waitFor({state:'hidden'});
await page.getByRole('button',{name:'Edit background',exact:true}).click();const background=page.getByRole('dialog',{name:'Background',exact:true});await background.getByRole('tab',{name:'Color',exact:true}).click();await background.getByRole('button',{name:'Solid',exact:true}).click();await background.getByRole('button',{name:'Background color picker',exact:true}).click();
await page.locator('.tw-color-pop').waitFor();modalSizes.background=await background.boundingBox();modalSizes.colorPicker=await page.locator('.tw-color-pop').boundingBox();assert.equal(await page.locator('.tw-color-pop').evaluate(el=>Boolean(el.closest('.tw-modal'))),false,'Picker is trapped in an animated modal');
const hex=page.getByRole('textbox',{name:'Hex colour'});await hex.fill('#234567');await hex.press('Tab');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.background.color==='#234567');
const square=page.getByRole('slider',{name:'Saturation and brightness',exact:true});const squareRect=await square.boundingBox();await page.mouse.move(squareRect.x+20,squareRect.y+20);await page.mouse.down();await page.mouse.move(squareRect.x+squareRect.width-15,squareRect.y+squareRect.height*.55,{steps:45});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.background.color),'#234567','Picker serialized the profile during the drag');await page.mouse.up();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.background.color!=='#234567');
await page.screenshot({path:'.tmp/studio-background-picker.png'});await page.keyboard.press('Escape');assert.equal(await background.count(),1,'Escape closed the background editor instead of just its picker');assert.equal(await page.locator('.tw-color-pop').count(),0);await background.getByRole('tab',{name:'Media',exact:true}).click();await background.getByRole('button',{name:'Upload background',exact:true}).waitFor();await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Open audio manager',exact:true}).click();const audio=page.getByRole('dialog',{name:'Audio player',exact:true});await audio.waitFor();modalSizes.audio=await audio.boundingBox();assert.equal(await audio.getByRole('tab').count(),4);
const wav=Buffer.alloc(16044);wav.write('RIFF');wav.writeUInt32LE(16036,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);await audio.locator('input[type=file][accept="audio/*"]').first().setInputFiles({name:'Studio.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.audio.fileUrl.includes('/api/media/audio/'));assert.equal(audioUploadBytes,wav.length);assert.equal(audioUploadExpected,wav.length);
await audio.getByRole('tab',{name:'Appearance',exact:true}).click();assert.equal(await audio.getByRole('slider',{name:'Start at',exact:true}).count(),0);await audio.getByRole('button',{name:'Player background picker'}).waitFor();await audio.getByRole('tab',{name:'Playback',exact:true}).click();await audio.getByRole('slider',{name:'Start at',exact:true}).waitFor();await page.screenshot({path:'.tmp/studio-audio-manager.png'});await page.keyboard.press('Escape');
await page.goto('http://127.0.0.1:5180/#/dashboard/effects');await page.getByRole('tab',{name:'Card Effects',exact:true}).click();await page.getByRole('button',{name:'Frost',exact:true}).waitFor();
const cardSelectionMs=await page.evaluate(()=>new Promise(resolve=>{const button=document.querySelector('.fx-choice[aria-label="Frost"]');const start=performance.now();const observer=new MutationObserver(()=>{if(button.getAttribute('aria-pressed')==='true'){observer.disconnect();resolve(performance.now()-start);}});observer.observe(button,{attributes:true});button.click();}));assert(cardSelectionMs<250,'Card selection blocked for '+cardSelectionMs+'ms');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.card.id==='frost');console.log('Card selection feedback:',cardSelectionMs.toFixed(1)+'ms');
await page.goto('http://127.0.0.1:5180/#/dashboard/effects?section=cursor');await page.getByRole('tab',{name:'Pointer Effects',exact:true}).waitFor();await page.getByRole('textbox',{name:'Search effects',exact:true}).first().fill('rain');assert.equal(await page.getByRole('button',{name:'Emoji Rain',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Character Rain',exact:true}).count(),0);
await page.goto('http://127.0.0.1:5180/#/dashboard/badges');await page.getByRole('tab',{name:'All badges',exact:true}).waitFor();assert.equal(await page.locator('.tw-badge-catalog-v2 article').count(),33);await page.getByRole('button',{name:'Equip Owner',exact:true}).click();await page.getByRole('button',{name:'Equip Premium',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/badges/v1/qa-user')).equipped.length===2);await page.getByRole('tab',{name:'Your badges',exact:true}).click();await page.getByRole('button',{name:'Move Premium earlier'}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/badges/v1/qa-user')).equipped[0].id==='premium');await page.getByRole('tab',{name:'Design',exact:true}).click();assert.equal(await page.getByRole('slider',{name:'Badge size',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:/minimize|collapse/i}).count(),0);await page.locator('.tw-badge-live-row .badge-chip-art').first().waitFor();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.tw-badge-live-row .badge-chip-art').getAttribute('src').includes('/still/'));await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('tab',{name:'All badges',exact:true}).click();await page.screenshot({path:'.tmp/studio-badges.png'});
const normalized=await page.evaluate(async()=>{const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');return {emoji:normalizeAbout({assets:{cursor:{trail:true,trailType:'emojiRain'}}}).assets.cursor.trailType,characters:normalizeAbout({assets:{cursor:{trail:true,trailType:'characterRain'}}}).assets.cursor.trailType,hidden:normalizeAbout({design:{badgePosition:'hidden'}}).design.badgePosition,size:normalizeBadgeStore({style:{size:2}}).style.size};});assert.deepEqual(normalized,{emoji:'none',characters:'none',hidden:'default',size:24});
await page.setViewportSize({width:390,height:900});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'.tmp/studio-badges-mobile.png'});
const svgMotion=await page.evaluate(async()=>{const source=await(await fetch('/badges/v2/owner.svg')).text();const host=document.createElement('div');host.innerHTML=source;document.body.append(host);const svg=host.querySelector('svg'),path=host.querySelector('path');svg.pauseAnimations();svg.setCurrentTime(.05);const first=getComputedStyle(path).strokeDashoffset;svg.setCurrentTime(1.3);const next=getComputedStyle(path).strokeDashoffset;host.remove();return {first,next};});assert.notEqual(svgMotion.first,svgMotion.next,'Badge artwork has no real SVG stroke animation');
const {readFile,writeFile}=await import('node:fs/promises');const performanceReport=JSON.parse(await readFile('docs/editor-performance.json','utf8'));performanceReport.cardStyleSelectionMs=cardSelectionMs;await writeFile('docs/editor-performance.json',JSON.stringify(performanceReport,null,2));await writeFile('docs/studio-modal-sizing.json',JSON.stringify({viewport:{width:1600,height:1000},units:'CSS pixels',modalSizes},null,2));
assert.deepEqual(errors,[]);console.log('PASS avatar profile/decorations modal, background media/color modal, portaled color picker, local-only slider/color gestures with release commit, organized audio tabs, removed rain effects, badge equip/reorder/ownership/size, reduced motion and mobile containment');
} finally {await browser.close();}
