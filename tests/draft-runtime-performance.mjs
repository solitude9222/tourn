// Run with the Vite dev server on port 5180. Set BROWSER_PATH to a Chromium executable.
// All API and third-party requests are intercepted; no real accounts are modified.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('.tmp',{recursive:true});
const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || (process.platform==='win32' ? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' : chromium.executablePath()),headless:true});
try {
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();page.setDefaultTimeout(15000);page.setDefaultTimeout(15000);
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






page.on('dialog',dialog=>void dialog.accept());
await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');const description=page.locator('textarea').first();await description.fill('A browser-only recovery draft.');await page.waitForFunction(async()=>{const {readDurableDraft}=await import('/src/lib/draftStorage.ts');return (await readDurableDraft('editor:qa-user'))?.document.about.bio==='A browser-only recovery draft.';});assert.equal(writes.length,0,'local recovery never publishes');await page.reload();await page.getByRole('button',{name:'Review recovered draft',exact:true}).click();const recovery=page.getByRole('dialog',{name:'Review recovered draft',exact:true});await recovery.getByRole('heading',{name:'Recovered browser draft',exact:true}).waitFor();await page.screenshot({path:'.tmp/browser-draft-comparison.png'});await recovery.getByRole('button',{name:'Use recovered draft',exact:true}).click();assert.equal(await page.locator('textarea').first().inputValue(),'A browser-only recovery draft.');assert.equal(writes.length,0,'restoring still does not publish');await page.keyboard.press('Control+s');await page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'));await page.waitForTimeout(300);assert(writes.length>0);await page.reload();assert.equal(await page.getByRole('button',{name:'Review recovered draft',exact:true}).count(),0,'matching saved content needs no recovery prompt');
await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {Slider}=await import('/src/dash/ui.tsx');const host=document.createElement('div');host.id='gesture-qa';host.className='tw-dash';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#101722;padding:80px';document.body.append(host);window.gestureCommits=0;const root=(dom.createRoot||dom.default.createRoot)(host);root.render(React.createElement(Slider,{label:'Gesture audit',value:10,min:0,max:100,onChange:()=>window.gestureCommits++}));window.gestureRoot=root;});const range=page.getByRole('slider',{name:'Gesture audit',exact:true});await range.waitFor();const box=await range.boundingBox();await page.mouse.move(box.x+box.width*.1,box.y+box.height/2);await page.mouse.down();const elapsed=await page.evaluate(()=>{const input=document.querySelector('#gesture-qa input[type=range]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;const start=performance.now();for(let i=0;i<1000;i++){setter.call(input,String(i%101));input.dispatchEvent(new Event('input',{bubbles:true}));}return performance.now()-start;});await page.mouse.up();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.gestureCommits),1,'1000 updates commit once at release');console.log('1000 slider input events:',Math.round(elapsed),'ms, one committed profile change');await page.evaluate(()=>{window.gestureRoot.unmount();document.querySelector('#gesture-qa').remove();});
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const host=document.createElement('div');host.id='runtime-qa';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#080808';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.runtimeRoot=root;root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'chosen',alias:'chosen'},about:normalizeAbout({bio:'Long profile biography '.repeat(30),studio:{bioLines:2,avatarX:75,posterRatio:'square'},assets:{avatarUrl:'/favicon-rounded.png',effects:{background:{id:'snow'}}}}),widgets:normalizeWidgetStore({}),links:normalizeLinkStore({}),interactive:true,showEntry:false,showMetadata:false}));});const bio=page.locator('#runtime-qa .pv-bio');await bio.waitFor();assert.equal(await bio.evaluate(e=>getComputedStyle(e).webkitLineClamp),'2');await page.getByRole('button',{name:'Read full bio',exact:true}).click();assert.equal(await bio.getAttribute('data-collapsed'),null);assert.equal(await page.locator('#runtime-qa .pv-avatar img').evaluate(e=>getComputedStyle(e).objectPosition),'75% 50%');await page.screenshot({path:'.tmp/profile-bio-expanded.png'});await page.evaluate(()=>{window.runtimeRoot.unmount();document.querySelector('#runtime-qa').remove();});
assert.deepEqual(errors,[]);console.log('PASS separate unpublished browser recovery, comparison/restore, explicit save, gesture commit budget, expanded bio and avatar focus');
}finally{await browser.close();}
