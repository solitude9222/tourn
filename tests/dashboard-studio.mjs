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



const measurements=[];
const routes=['home','appearance','profile-main','profile-appearance','profile-experience','profile-integrations','profile-switches','layout','portfolio-general','portfolio-about','portfolio-projects','portfolio-gallery','portfolio-audio','portfolio-interests','portfolio-design','assets','links','widgets','templates','badges','aliases','settings','theme','billing','support'];
for(const viewport of [{width:1920,height:1080},{width:1440,height:1000},{width:390,height:900}]){
 await page.setViewportSize(viewport);
 for(const route of routes){console.log(viewport.width,route);
  await page.goto('http://127.0.0.1:5180/#/dashboard/'+route);
  await page.locator('.tw-page-swap').waitFor().catch(async e=>{console.log('ERRORS',errors,await page.locator('body').innerText());throw e});
  await page.waitForFunction(()=>!document.querySelector('.tw-page-loading'));
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflows at '+viewport.width);
  const result=await page.evaluate(()=>Array.from(document.querySelectorAll('.tw-rail,.tw-main,.tw-topline,.tw-page-head,.tw-page-copy h1,.tw-tabs,.tw-tab,.tw-card,.tw-card-head,.tw-control,.tw-textarea,.tw-label,.tw-btn,.tw-toggle,.tw-toggle-tile,.tw-profile-media-tile,.tw-decoration-tabs,.fx-choice,.fx-tile-preview,.fx-toolbar,.tw-gallery-layouts,.tw-gallery-item,.tw-layout-preview')).filter(e=>e.getClientRects().length).map((e,index)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {index,element:e.tagName.toLowerCase(),class:e.className,label:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,80),width:r.width,height:r.height,x:r.x,y:r.y,font:s.fontSize,lineHeight:s.lineHeight,padding:s.padding,gap:s.gap,border:s.borderWidth,radius:s.borderRadius};}));
  measurements.push({viewport,route,elements:result});
  if(viewport.width===1920&&['home','appearance','profile-main','portfolio-gallery','layout'].includes(route))await page.screenshot({path:'.tmp/dashboard-'+route+'.png'});
  if(viewport.width===390&&['appearance','profile-main','portfolio-gallery','home'].includes(route))await page.screenshot({path:'.tmp/dashboard-mobile-'+route+'.png'});
 }
}
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://127.0.0.1:5180/#/dashboard/portfolio-general');
await page.locator('.tw-page-swap').waitFor();
const portfolioTabs=await page.locator('.tw-tabs .tw-tab').allTextContents();
assert(!portfolioTabs.includes('Audio player')&&!portfolioTabs.includes('Design'),JSON.stringify(portfolioTabs));
await page.goto('http://127.0.0.1:5180/#/dashboard/profile-appearance');
await page.getByRole('heading',{name:'Card style',exact:true}).waitFor();
await page.getByRole('heading',{name:'About section',exact:true}).waitFor();
assert.deepEqual(errors,[]);
const {writeFile}=await import('node:fs/promises');await mkdir('docs',{recursive:true});await writeFile('docs/dashboard-sizing.json',JSON.stringify({units:'CSS pixels',note:'Measured with a premium fixture account, default Tourn theme, Chromium. Content-dependent heights vary with profile content. x/y are viewport coordinates, potentially outside the scrolled viewport.',measurements},null,2));
console.log('PASS 25 dashboard routes at 1920, 1440 and 390 widths; no horizontal overflow or runtime errors; exact dimensions recorded');
} finally {await browser.close();}
