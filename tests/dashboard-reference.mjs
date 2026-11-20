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
const account={id:'qa-user',username:'koni',uid:624,email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:false,discordLinked:true,discordId:'1546745348020772915'};
let audioUploadBytes=0, audioUploadExpected=0, failAudioUpload=false;
let document=null, revision=0; const writes=[]; let failWrites=false; let failReads=false; let readDelay=0; let failAnalytics=false; const analyticsRequests=[]; let failViewWrite=false; let viewWrites=0; let presenceMonitored=false;
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.startsWith('/api/')) {
  if(url.pathname==='/api/templates')return route.fulfill({json:{templates:[]}});
  if(url.pathname==='/api/leaderboard')return route.fulfill({json:{profiles:Array.from({length:5},(_,i)=>({username:'member'+i,handle:'member'+i,displayName:'Member '+i,avatarUrl:null,views:500-i*50,likes:20-i})),total:5}});
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
   return route.fulfill({json:{views:6}});
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






document={about:{displayName:'Koni',bio:'A finished profile biography.',assets:{avatarUrl:'/favicon-32.png',background:{style:'image',imageUrl:'/favicon-32.png'}}},links:{links:[{id:'discord-link',platform:'discord',url:'https://discord.com/users/123',visible:true,label:'Discord'}]},widgets:{widgets:[]},badges:{equipped:[]}};
await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:5180/#/dashboard/home');await page.getByRole('heading',{name:'Account Overview',exact:true}).waitFor();
const nav=page.getByRole('navigation',{name:'Dashboard',exact:true});
assert.deepEqual(await nav.locator('.tw-nav-item').allTextContents(),['Home','Customize','Premium','Assets','Image Host','Account']);
assert.equal(await page.locator('.tw-overview-stat').count(),4);assert.deepEqual(await page.locator('.tw-overview-stat>b').allTextContents(),['koni','None yet','624','6']);assert.equal(await page.getByRole('progressbar',{name:'Profile setup'}).getAttribute('value'),'5');assert.equal(await page.getByRole('progressbar',{name:'Profile setup'}).getAttribute('max'),'6');await page.getByText('83% complete',{exact:true}).waitFor();await page.waitForTimeout(250);await page.screenshot({path:'.tmp/dashboard-reference-home.png'});
await page.getByRole('button',{name:'Tourn Setup Guide',exact:true}).click();await page.getByRole('dialog',{name:'Tourn Setup Guide',exact:true}).waitFor();await page.keyboard.press('Escape');
await nav.getByRole('button',{name:'Customize',exact:true}).click();assert.deepEqual(await nav.locator('.tw-nav-item').allTextContents(),['Appearance','Profile','Layout','Portfolio','Importer','Social Links','Widgets','Decorations']);assert.equal(await page.getByRole('heading',{name:'Account Overview',exact:true}).count(),1);await page.waitForTimeout(200);await page.screenshot({path:'.tmp/dashboard-reference-customize.png'});
await nav.getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('heading',{name:'Name settings',exact:true}).waitFor();await page.getByRole('tab',{name:'Card',exact:true}).waitFor();await page.getByRole('tab',{name:'Visibility',exact:true}).waitFor();
await nav.getByRole('button',{name:'Back to main menu',exact:true}).click();assert.equal(await nav.locator('.tw-nav-item').count(),6);
for(const [root,leaf]of [['Premium','Plan & billing'],['Assets','Templates'],['Image Host','Gallery'],['Account','Badges']]){await nav.getByRole('button',{name:root,exact:true}).click();await nav.getByRole('button',{name:leaf,exact:true}).click();await page.waitForTimeout(150);await nav.getByRole('button',{name:'Back to main menu',exact:true}).click();}
await page.getByRole('searchbox',{name:'Search dashboard'}).fill('badge');await nav.getByRole('button',{name:'Badges',exact:true}).click();await page.getByRole('heading',{name:'Badges',exact:true}).waitFor();await nav.getByRole('button',{name:'Back to main menu',exact:true}).waitFor();
for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5180/#/dashboard/home');await page.getByRole('heading',{name:'Account Overview',exact:true}).waitFor();await page.waitForTimeout(150);const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('.tw-main').getBoundingClientRect().bottom,height:innerHeight}));assert.ok(geometry.width<=geometry.viewport+1,JSON.stringify(geometry));assert.ok(geometry.main<=geometry.height+1);if(width===390){await page.screenshot({path:'.tmp/dashboard-reference-mobile.png'});await page.getByRole('button',{name:'Open navigation',exact:true}).click();await nav.getByRole('button',{name:'Customize',exact:true}).click();await nav.getByRole('button',{name:'Social Links',exact:true}).click();await page.getByRole('heading',{name:'Social Links',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Open navigation',exact:true}).count(),1);}}
assert.deepEqual(errors,[]);console.log('PASS six-item root, category drill-down/back, preserved page tabs/search, real account metrics, 83% setup, guide, all categories and responsive desktop/tablet/mobile bounds');
}finally{await browser.close();}
