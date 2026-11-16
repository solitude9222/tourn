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


await page.setViewportSize({width:1600,height:1100});
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');
await page.getByRole('heading',{name:'Media',exact:true}).waitFor();
assert.equal(await page.locator('.tw-profile-media-grid > div').count(),4);
const media=await page.locator('.tw-profile-media-grid > div').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));assert(media.every(top=>Math.abs(top-media[0])<2),'Media controls are not alongside each other');
assert.equal(await page.getByRole('dialog').count(),0);
await page.getByRole('tab',{name:/Name Effects/}).waitFor();
assert.equal(await page.locator('.tw-decorations-panel .fx-choice').count(),8);
await page.getByRole('button',{name:'Green Sparkles',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.effects.text.name.colorB==='#4ade80');
assert.equal(await page.getByRole('dialog').count(),0);
await page.getByRole('tab',{name:/Avatar Effects/}).click();
assert.equal(await page.locator('.tw-decorations-panel .fx-choice').count(),8);
const decoration=page.locator('.tw-decorations-panel .fx-choice').nth(1),label=await decoration.getAttribute('aria-label');await decoration.click();
await page.waitForFunction(()=>Boolean(JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.decoration.discordUrl));
await page.getByRole('button',{name:'Favorite '+label,exact:true}).click();
await page.getByRole('button',{name:/^Favorites \(/}).click();assert.equal(await page.locator('.tw-decorations-panel .fx-choice').count(),1);
await page.getByRole('button',{name:'Remove avatar decoration',exact:true}).click();
await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.decoration.discordUrl);
await page.getByRole('tab',{name:/Name Effects/}).click();
await page.getByRole('button',{name:'Next effects page'}).click();assert.equal(await page.locator('.tw-decorations-panel .fx-choice').count(),8);
await page.locator('.tw-profile-media input[type=file]').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('invalid image')});
await page.getByText('Choose a PNG, JPG, WebP or GIF image.',{exact:true}).waitFor();
await page.locator('.tw-profile-media input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jlpQAAAAASUVORK5CYII=','base64')});
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.avatarUrl.startsWith('data:image/'));
await page.screenshot({path:'.tmp/profile-media-inline.png',fullPage:false});
await page.getByRole('tab',{name:'Background Effects',exact:true}).click();
await page.getByPlaceholder('Search effects…').fill('Aurora');
await page.getByRole('button',{name:'Aurora Ribbons',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.effects.background.id==='aurora');
await page.getByRole('tab',{name:'Overlays',exact:true}).click();
await page.getByPlaceholder('Search effects…').fill('Film Grain');
await page.getByRole('button',{name:'Film Grain',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.effects.overlay.id==='grain');
await page.getByRole('tab',{name:'Pointer Effects',exact:true}).click();
await page.getByPlaceholder('Search effects…').fill('Floating Hearts');
await page.getByRole('button',{name:'Floating Hearts',exact:true}).click();
await page.getByRole('button',{name:'Pointer shape',exact:true}).click();await page.getByRole('option',{name:'Ring',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).assets.cursor.style==='ring');
const playground=page.locator('.fx-pointer-playground'),box=await playground.boundingBox();
await playground.scrollIntoViewIfNeeded();const rect=await playground.boundingBox();
await page.mouse.move(rect.x+20,rect.y+40);await page.mouse.move(rect.x+rect.width-30,rect.y+150,{steps:20});
await page.waitForFunction(()=>document.querySelector('.fx-pointer-playground .fx-cursor-particle--hearts'));
assert(await playground.locator('.fx-cursor-particle').count()<=160,'Trail exceeded particle budget');
await page.mouse.move(5,5);assert.equal(await playground.locator('.fx-cursor-particle').count(),0,'Pointer leave leaked particles');
await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(rect.x+60,rect.y+60);await page.waitForTimeout(100);assert.equal(await playground.locator('.fx-cursor-particle').count(),0);
await page.emulateMedia({reducedMotion:'no-preference'});
const normalized=await page.evaluate(async()=>{const {normalizeAbout}=await import('/src/lib/about.ts');const about=normalizeAbout({assets:{cursor:{style:'ring',trail:true,trailType:'ribbon'},effects:{background:{id:'gridwave',intensity:0},overlay:{id:'vignette',intensity:95}}}});return {style:about.assets.cursor.style,trail:about.assets.cursor.trailType,bg:about.assets.effects.background.id,intensity:about.assets.effects.background.intensity,overlay:about.assets.effects.overlay.id};});
assert.deepEqual(normalized,{style:'ring',trail:'ribbon',bg:'gridwave',intensity:0,overlay:'vignette'});
await page.screenshot({path:'.tmp/pointer-effects-inline.png',fullPage:false});
await page.setViewportSize({width:390,height:900});await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile effects overflow');
assert.equal(await page.getByRole('dialog').count(),0);
assert.deepEqual(errors,[]);
console.log('PASS side-by-side media, inline paginated decorations, favorites, uploads, new backgrounds/overlays, pointer shape persistence, bounded trails and reduced motion');
} finally { await browser.close(); }
