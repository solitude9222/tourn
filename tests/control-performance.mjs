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




await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.getByRole('heading',{name:'Media',exact:true}).waitFor();
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {ColorField,Slider}=await import('/src/dash/ui.tsx');const {mountBgEffect}=await import('/src/lib/bgEffects.ts');
 const host=document.createElement('div');host.id='performance-controls';host.className='tw-dash';host.style.cssText='position:fixed;inset:0;z-index:999;display:block;background:#101014;padding:80px';document.body.append(host);
 const near=document.createElement('div');near.style.cssText='position:absolute;inset:0;pointer-events:none';host.append(near);window.benchFx=mountBgEffect(near,{effect:'tv',intensity:75,speed:9,color:'#8aa6ff',amount:50,flag:false});
 const control=document.createElement('div');control.style.cssText='position:relative;width:500px;padding:24px;border:1px solid #363640;background:#141418';host.append(control);const root=(dom.createRoot||dom.default.createRoot)(control);window.benchRoot=root;
 window.controlCommits=0;window.controlCost=[];const payload={avatar:'x'.repeat(8_000_000)};
 function Harness(){const [color,setColor]=React.useState('#3b82f6'),[value,setValue]=React.useState(30);const persist=()=>{const start=performance.now();JSON.stringify(payload);window.controlCost.push(performance.now()-start);window.controlCommits++;};return React.createElement(React.Fragment,null,React.createElement(ColorField,{label:'Stress color',value:color,onChange:next=>{persist();setColor(next)}}),React.createElement(Slider,{label:'Stress slider',value,min:0,max:100,onChange:next=>{persist();setValue(next)}}));}
 root.render(React.createElement(Harness));window.frameGaps=[];let last=performance.now();const tick=now=>{window.frameGaps.push(now-last);last=now;window.benchRaf=requestAnimationFrame(tick)};window.benchRaf=requestAnimationFrame(tick);
});
const range=page.getByRole('slider',{name:'Stress slider',exact:true});await range.waitFor();const rect=await range.boundingBox();await page.mouse.move(rect.x+20,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width-20,rect.y+rect.height/2,{steps:90});assert.equal(await page.evaluate(()=>window.controlCommits),0);await page.mouse.up();await page.waitForFunction(()=>window.controlCommits===1);
await page.getByRole('button',{name:'Stress color picker',exact:true}).click();const square=page.getByRole('slider',{name:'Saturation and brightness',exact:true});const box=await square.boundingBox();await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x+box.width-10,box.y+box.height*.75,{steps:90});assert.equal(await page.evaluate(()=>window.controlCommits),1,'Color drag persisted intermediate values');await page.mouse.up();await page.waitForFunction(()=>window.controlCommits===2);await page.keyboard.press('Escape');
const report=await page.evaluate(()=>{cancelAnimationFrame(window.benchRaf);const gaps=window.frameGaps.slice(2).sort((a,b)=>a-b);return {events:180,commits:window.controlCommits,simulatedProfileBytes:8_000_000,frameSamples:gaps.length,medianFrameMs:gaps[Math.floor(gaps.length*.5)],p95FrameMs:gaps[Math.floor(gaps.length*.95)],persistMs:window.controlCost};});
console.log('Measured picker/slider stress:',JSON.stringify(report));
await page.evaluate(()=>{window.benchRoot.unmount();window.benchFx.destroy();document.getElementById('performance-controls').remove();});
assert.equal(await page.locator('html').getAttribute('data-editor-gesture'),null);
const {writeFile}=await import('node:fs/promises');await writeFile('docs/editor-performance.json',JSON.stringify({environment:'Headless Chromium, local fixture. Timing depends on hardware and concurrent load.',report},null,2));
assert.deepEqual(errors,[]);console.log('PASS 180 drag samples beside an animated canvas with 8MB persistence work: exactly two final commits, no intermediate serialization, no leaked gesture state');
} finally {await browser.close();}
