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





let checks=0;
await context.route('**/api/profile/alias-availability?*',route=>{checks++;const alias=new URL(route.request().url()).searchParams.get('alias');return route.fulfill({json:{alias,available:alias!=='taken',message:alias==='taken'?'This alias is already claimed.':'This alias is available.',suggestions:alias==='taken'?['takenlol']:[],nextChangeAt:null}});});
await page.goto('http://127.0.0.1:5180/#/dashboard/settings');await page.getByRole('textbox',{name:'Public alias',exact:true}).fill('taken');await page.getByRole('button',{name:'takenlol',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'Public alias',exact:true}).inputValue(),'takenlol');assert(checks>0);
await page.goto('http://127.0.0.1:5180/#/dashboard/getting-started');await page.getByRole('button',{name:'Next step',exact:true}).click();await page.reload();await page.locator('.journey-detail h2').filter({hasText:'Make the card yours'}).waitFor();await page.getByRole('button',{name:'Restart guide',exact:true}).click();await page.getByRole('button',{name:'Use privacy-first defaults',exact:true}).click();await page.locator('.journey-publish').getByRole('button',{name:'Save now',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).metadata.noIndex===true);
await page.goto('http://127.0.0.1:5180/#/dashboard/workspace');await page.getByRole('heading',{name:'Arrange your workspace',exact:true}).waitFor();await page.getByRole('button',{name:'Move Home down',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn/preferences/category-order'))[0]),'customize');await page.getByRole('button',{name:'Reset this order',exact:true}).click();const grip=page.locator('.tw-arrange-list .tw-row-grip').first();await grip.focus();await grip.press('ArrowDown');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn/preferences/category-order'))[0]),'customize');await page.getByRole('button',{name:'Reset this order',exact:true}).click();const before=await page.evaluate(()=>localStorage.getItem('tourn/preferences/category-order'));const box=await grip.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+120,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.evaluate(()=>localStorage.getItem('tourn/preferences/category-order')),before);await page.getByRole('status').filter({hasText:'Reorder cancelled.'}).waitFor();
await page.getByRole('textbox',{name:'Checkpoint name',exact:true}).fill('Before polish');await page.getByRole('button',{name:'Create checkpoint',exact:true}).click();await page.getByRole('button',{name:'Review checkpoint',exact:true}).waitFor();await page.locator('.tw-recovery input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({profile:{about:{bio:'Restored example'},links:{links:[]},widgets:{widgets:[]},badges:{equipped:[{id:'owner'}]}}}))});await page.getByRole('button',{name:'Restore selected sections',exact:true}).click();await page.getByRole('button',{name:'Undo last restore',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).bio!=='Restored example');
await page.getByRole('button',{name:'Find settings, compare and view history',exact:true}).click();const tools=page.getByRole('dialog',{name:'Studio tools',exact:true});await tools.getByRole('button',{name:'Pin Profile · Details',exact:true}).click();await tools.getByRole('button',{name:'Close',exact:true}).click();assert(await page.locator('.workspace-pins').getByRole('button',{name:'Details',exact:true}).isVisible());
await page.goto('http://127.0.0.1:5180/#/dashboard/theme');await page.getByRole('radio',{name:/High contrast blue/}).click();assert.equal(await page.locator('html').getAttribute('data-dash-theme'),'contrast');await page.getByRole('button',{name:'Compact',exact:true}).click();assert.equal(await page.locator('.tw-dash').first().getAttribute('data-density'),'compact');
await page.goto('http://127.0.0.1:5180/#/dashboard/widgets');await page.locator('.tw-swatch').first().click();const picker=page.getByRole('dialog',{name:'Color picker',exact:true});await picker.getByText('Colour tools',{exact:true}).click();await picker.getByRole('textbox',{name:'Palette JSON',exact:true}).fill('[{"name":"Ocean","colors":["#4477FF","#001122"]}]');await picker.getByRole('button',{name:'Import palettes',exact:true}).click();await picker.getByRole('button',{name:'Delete palette Ocean',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn/preferences/colour-palettes-qa-user'))[0].name),'Ocean');await page.keyboard.press('Escape');
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.getByRole('button',{name:'Edit profile picture',exact:true}).click();const avatar=page.getByRole('dialog',{name:'Profile picture',exact:true});await avatar.getByRole('button',{name:'Upload profile picture',exact:true}).click();const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#4477ff';ctx.fillRect(0,0,256,128);return canvas.toDataURL().split(',')[1];});await page.locator('.tw-profile-media input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});const review=page.getByRole('dialog',{name:'Review media',exact:true});await review.getByText(/256 × 128px/).waitFor();await review.getByRole('spinbutton',{name:'Avatar horizontal focus value',exact:true}).fill('75');await review.getByRole('spinbutton',{name:'Avatar horizontal focus value',exact:true}).press('Enter');await page.screenshot({path:'.tmp/backlog-media-review.png'});await review.getByRole('button',{name:'Use media',exact:true}).click();await review.waitFor({state:'detached'});await avatar.getByRole('button',{name:'Upload profile picture',exact:true}).waitFor();await page.keyboard.press('Control+s');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/about/v1/qa-user')).studio.avatarX===75);await avatar.getByRole('button',{name:'Close',exact:true}).click();
await page.goto('http://127.0.0.1:5180/#/dashboard/workspace');await page.getByRole('button',{name:'Check profile images',exact:true}).click();await page.getByRole('status').filter({hasText:'0 references need review'}).waitFor();await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{message:'private profile secret',error:new Error('private profile secret')})));assert.equal(await page.evaluate(()=>sessionStorage.getItem('tourn/runtime-diagnostics').includes('private profile secret')),false);await page.getByRole('button',{name:'Clear session diagnostics',exact:true}).click();assert.equal(await page.evaluate(()=>sessionStorage.getItem('tourn/runtime-diagnostics')),null);
const issues=[];for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});for(const route of ['workspace','theme','appearance','layout']){await page.goto('http://127.0.0.1:5180/#/dashboard/'+route);await page.locator('.tw-page-swap').waitFor();await page.locator('.tw-page-swap .tw-card').first().waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.tw-page-swap .tw-card')).filter(node=>{const box=node.getBoundingClientRect();return box.height>0&&box.top<innerHeight&&box.bottom>0;}).every(node=>Number(getComputedStyle(node).opacity)>.99));if(width<=600){const menu=await page.getByRole('button',{name:'Open navigation',exact:true}).boundingBox(),crumb=await page.getByRole('navigation',{name:'Breadcrumb',exact:true}).boundingBox();assert(menu&&crumb&&crumb.x>=menu.x+menu.width,'mobile breadcrumb clears the menu button '+JSON.stringify({width,route,menu,crumb}));}if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))issues.push({width,route});}await page.screenshot({path:'.tmp/backlog-workspace-'+width+'.png'});}assert.deepEqual(issues,[]);
assert.deepEqual(errors,[]);console.log('PASS alias suggestions, saved onboarding/privacy, sorting keyboard/Escape, checkpoints/undo, pins, contrast/density, account palettes, media inspection/focus and mobile bounds');
}finally{await browser.close();}
