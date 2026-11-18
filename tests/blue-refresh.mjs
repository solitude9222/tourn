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




await page.setViewportSize({width:1920,height:1080});
await page.goto('http://127.0.0.1:5180/#/dashboard/home');
await page.locator('.tw-welcome').waitFor();await page.locator('.tw-home-leaders a').first().waitFor();
assert.equal(await page.locator('.tw-home-metric').count(),4);assert.equal(await page.locator('.tw-home-leaders a').count(),5);
assert.equal(await page.locator('.tw-dash').evaluate(el=>getComputedStyle(el).getPropertyValue('--accent').trim()),'#4a6cf7');
const nav=await page.evaluate(async()=>{const {NAV}=await import('/src/dash/nav.ts');return NAV.map(item=>({label:item.label,group:item.group,pages:item.tabs.map(tab=>tab.page)}));});
assert.equal(new Set(nav.map(item=>item.label)).size,nav.length);const routes=nav.flatMap(item=>item.pages);assert.equal(new Set(routes).size,routes.length);
assert.deepEqual([...new Set(nav.map(item=>item.group))],['OVERVIEW','PROFILE','CONTENT','LIBRARY','ACCOUNT']);
await page.getByRole('button',{name:'Arrange your layout',exact:false}).click();await page.getByRole('heading',{name:'Layout preview',exact:true}).waitFor();
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.getByRole('heading',{name:'Media',exact:true}).waitFor();assert.equal(await page.locator('.tw-decorations-panel').count(),0);
await page.goto('http://127.0.0.1:5180/#/dashboard/effects');await page.getByRole('tab',{name:'Overlays',exact:true}).click();assert.equal(await page.locator('.tw-profile-media').count(),0);
await page.goto('http://127.0.0.1:5180/#/dashboard/profile-main');await page.getByRole('textbox',{name:'Custom tab title',exact:true}).fill('Blue QA');await page.getByRole('button',{name:'Title animation',exact:true}).click();await page.getByRole('option',{name:'Typewriter',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).metadata.animation==='typewriter');
await page.goto('http://127.0.0.1:5180/#/dashboard/leaderboard');await page.getByRole('link',{name:'Rank 1, Member 0',exact:true}).waitFor();
await page.getByRole('textbox',{name:'Search loaded rankings'}).fill('member5');assert.equal(await page.locator('.tw-lb-row').count(),1);assert.equal(await page.locator('.tw-lb-rank').innerText(),'6');
await page.getByRole('textbox',{name:'Search loaded rankings'}).fill('nothing-matches');await page.getByRole('status').filter({hasText:'No loaded profiles'}).waitFor();
await page.getByRole('textbox',{name:'Search loaded rankings'}).fill('');await page.getByRole('button',{name:'Rank profiles by',exact:true}).click();const response=page.waitForRequest(request=>request.url().includes('/api/leaderboard?')&&request.url().includes('sort=likes'));await page.getByRole('option',{name:'Most likes',exact:true}).click();await response;
await page.locator('.tw-lb-podium-card').first().waitFor();await page.getByRole('button',{name:'Refresh rankings',exact:true}).click();await page.locator('.tw-lb-podium-card').first().waitFor();
await page.goto('http://127.0.0.1:5180/#/leaderboard');await page.getByRole('heading',{name:'Meet the community.',exact:true}).waitFor();const publicSort=page.waitForRequest(request=>request.url().includes('/api/leaderboard?')&&request.url().includes('sort=likes'));await page.getByRole('tab',{name:'Most liked',exact:true}).click();await publicSort;await page.locator('.board-podium-card').first().waitFor();await page.screenshot({path:'.tmp/blue-public-leaderboard.png'});
await page.goto('http://127.0.0.1:5180/#/');await page.locator('.hm-hero-title').waitFor();assert.equal(await page.locator('.hm-hero-title span').evaluate(el=>getComputedStyle(el).webkitTextFillColor),'rgb(96, 165, 250)');await page.screenshot({path:'.tmp/blue-public-home.png'});
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');
 const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout}=await import('/src/lib/about.ts');const {normalizeWidgetStore,createWidgetInstance,WIDGET_PLATFORM_BY_ID}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');
 const host=document.createElement('div');host.id='reference-profile';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#000';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.refRoot=root;
 const about=normalizeAbout({displayName:'charlie',bio:'Building things I care about.',location:'Berlin',design:{layout:'stacked',widgetsPosition:'auto',colors:{background:'#000000',card:'#000000',text:'#ffffff'},cardWidth:720,cardPadding:32,slideshow:false,showJoined:true},assets:{avatarUrl:'/favicon-rounded.png',background:{color:'#000000'},card:{id:'none'}}});
 const widgets=normalizeWidgetStore({widgets:['github','github'].map((platform,i)=>({...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get(platform)),id:'reference-'+i,content:'octocat'}))});
 root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',username:'charlie',alias:'charlie',joinedAt:'2026-01-01'},about,widgets,links:normalizeLinkStore({}),badges:normalizeBadgeStore({}),interactive:false,showEntry:false,showMetadata:false}));
});
await page.locator('#reference-profile .widget-card').first().waitFor();
const geometry=await page.locator('#reference-profile').evaluate(host=>{const rect=selector=>{const r=host.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {card:rect('.profile-preview'),avatar:rect('.pv-avatar'),name:rect('.pv-id'),bio:rect('.pv-bio'),widgets:[...host.querySelectorAll('.widget-card')].map(el=>({width:el.offsetWidth,height:el.offsetHeight})),inside:host.querySelectorAll('.profile-preview .widget-card').length};});
assert.equal(geometry.card.width,720);assert(Math.abs(geometry.card.x+geometry.card.width/2-960)<5,JSON.stringify(geometry));assert(geometry.avatar.x<geometry.name.x);assert.equal(geometry.inside,2);assert(geometry.widgets.every(w=>w.width===320&&w.height===88));assert(geometry.bio.y>geometry.avatar.y+geometry.avatar.height-1);assert(Math.abs(geometry.bio.x+geometry.bio.width/2-960)<5);
await page.screenshot({path:'.tmp/blue-reference-profile.png'});
const {writeFile}=await import('node:fs/promises');await writeFile('docs/profile-sizing.json',JSON.stringify({viewport:{width:1920,height:1080},units:'CSS pixels',fixture:'720px card, 32px configured padding, two widgets, default text sizes',geometry},null,2));
await page.setViewportSize({width:390,height:900});await page.waitForTimeout(150);assert.equal(await page.locator('#reference-profile').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:'.tmp/blue-reference-profile-mobile.png'});
await page.evaluate(()=>{window.refRoot.unmount();document.getElementById('reference-profile').remove();});
await page.route('**/api/leaderboard?*',route=>route.fulfill({json:{profiles:[{username:'Same',views:-5,likes:'invalid'},{username:'same',views:20,likes:5},{username:'other',views:42,likes:3}],total:-5}}));
const clean=await page.evaluate(async()=>{const {fetchLeaderboard}=await import('/src/lib/leaderboard.ts');return fetchLeaderboard();});assert.equal(clean.entries.length,2);assert.equal(clean.entries[0].views,0);assert.equal(clean.entries[0].likes,0);assert.equal(clean.entries[0].handle,'Same');assert.equal(clean.total,2);
assert.deepEqual(errors,[]);console.log('PASS unique navigation, blue theme, redesigned home, editor shortcuts, isolated media/effects, original search ranks, server likes sort/refresh on both boards, reference card geometry and mobile containment');
} finally {await browser.close();}
