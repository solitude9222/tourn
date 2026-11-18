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





await page.goto('http://127.0.0.1:5180/#/dashboard/badges');await page.getByRole('tab',{name:'Design',exact:true}).click();await page.getByRole('switch',{name:'Badge glow',exact:true}).click();await page.getByRole('slider',{name:'Badge glow strength',exact:true}).press('End');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/badges/v1/qa-user'))?.style?.glow===true);await page.waitForTimeout(500);await waitForSaves();await page.reload();await page.getByRole('tab',{name:'Design',exact:true}).click();assert.equal(await page.getByRole('switch',{name:'Badge glow',exact:true}).getAttribute('aria-checked'),'true');await page.getByRole('button',{name:'Shelf shape',exact:true}).click();await page.getByRole('option',{name:'Rounded',exact:true}).click();for(const label of ['Shelf corner radius','Shelf blur','Shelf border width','Shelf shadow opacity','Shelf shadow blur'])await page.getByRole('slider',{name:label,exact:true}).waitFor();
assert.equal(await page.locator('.tw-nav-item').filter({hasText:'Audio player'}).count(),0);await page.locator('.tw-user-row').click();await page.getByText('Your accounts',{exact:true}).waitFor();await page.getByRole('menuitem',{name:'Share profile',exact:true}).waitFor();await page.getByRole('menuitem',{name:'Discord server',exact:true}).waitFor();assert.equal(await page.getByRole('menuitem',{name:/Language|Reports/}).count(),0);await page.waitForTimeout(250);await page.screenshot({path:'.tmp/accounts-reference-menu.png'});await page.keyboard.press('Escape');assert.equal(await page.locator('.tw-user-pop.is-closing').count(),1);assert.equal(await page.locator('.tw-user-pop.is-closing').evaluate(el=>getComputedStyle(el).animationName),'accountMenuOut');await page.waitForTimeout(250);assert.equal(await page.locator('.tw-user-pop').count(),0);
await page.goto('http://127.0.0.1:5180/#/dashboard/appearance');await page.getByRole('button',{name:'Open audio manager'}).click();let audio=page.getByRole('dialog',{name:'Audio player',exact:true});await audio.getByRole('tab',{name:'Playback',exact:true}).click();if(await audio.getByRole('switch',{name:'Mute button',exact:true}).getAttribute('aria-checked')!=='true')await audio.getByRole('switch',{name:'Mute button',exact:true}).click();for(const label of ['Button opacity','Volume rail opacity','Speaker opacity','Mute glow strength','Mute glow radius'])await audio.getByRole('slider',{name:label,exact:true}).waitFor();await audio.getByRole('switch',{name:'Mute button glow',exact:true}).click();await page.keyboard.press('Escape');
await page.goto('http://127.0.0.1:5180/#/dashboard/profile-switches');await page.getByRole('heading',{name:'Glow settings',exact:true}).waitFor();await page.getByRole('switch',{name:'Profile glow',exact:true}).click();await page.waitForTimeout(500);await waitForSaves();
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default,dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout,createProfileSection}=await import('/src/lib/about.ts');const {normalizeWidgetStore}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');
 const host=document.createElement('div');host.id='wide-polish';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#09090b';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);window.wideRoot=root;
 const interest={...createProfileSection('interest'),title:'Interests',items:Array.from({length:8},(_,i)=>({id:'anime-'+i,title:'Anime '+i,image:'/favicon-rounded.png',subtitle:'Adventure',meta:'2026',url:''}))};
 const about=normalizeAbout({displayName:'Compact identity',design:{profileGlow:true,profileGlowStrength:.5,profileGlowRadius:24,slideshow:true,sectionsEnabled:true,sections:[interest],aboutSlide:{title:'About me',text:'A wide page with readable, left-aligned content.',tags:[]},entry:{enabled:true,title:'Welcome',oncePerSession:false,animationDuration:300}},assets:{audio:{muteButton:true,popupGlow:true,popupGlowBlur:24,popupGlowStrength:75,fileUrl:'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',style:'none'}}});
 const badges=normalizeBadgeStore({equipped:[{id:'donator',visible:true}],style:{glow:true,glowColor:'#77bbff',glowIntensity:100,animated:true,animation:'bounce',rowBackground:'#112244',rowOpacity:.8,rowPadding:11,rowRadius:9}});
 root.render(React.createElement(LinkerPreview,{user:{id:'qa-user',uid:1,username:'reviewer'},about,widgets:normalizeWidgetStore({}),links:normalizeLinkStore({}),badges,interactive:true,showEntry:true,showMetadata:false}));
});
await page.locator('#wide-polish').getByRole('button',{name:'Enter profile',exact:true}).click();await page.locator('#wide-polish .lkr-entry').waitFor({state:'detached'});await page.waitForTimeout(700);
assert.equal(await page.locator('#wide-polish .badge-donation-total').count(),0);await page.locator('#wide-polish .badge-chip').hover({force:true});await page.getByRole('tooltip').filter({hasText:/donated/}).waitFor();const shelf=await page.locator('#wide-polish .badge-row').evaluate(el=>({fill:getComputedStyle(el).backgroundColor,pad:getComputedStyle(el).padding,radius:getComputedStyle(el).borderRadius}));assert.equal(shelf.fill,'rgba(17, 34, 68, 0.8)');assert.equal(shelf.pad,'11px');assert.equal(shelf.radius,'9px');assert.notEqual(await page.locator('#wide-polish .badge-chip').evaluate(el=>getComputedStyle(el).filter),'none');assert.notEqual(await page.locator('#wide-polish .badge-chip').evaluate(el=>getComputedStyle(el).animationName),'none');
const wide=await page.locator('#wide-polish .lkr-interest-set').evaluate(el=>({width:el.getBoundingClientRect().width,card:el.closest('.lkr-page').querySelector('.profile-preview').getBoundingClientRect().width,poster:el.querySelector('.lkr-interest-tile').getBoundingClientRect().height}));assert.ok(wide.width>1000,JSON.stringify(wide));assert.ok(Math.abs(wide.card-648)<1);assert.notEqual(await page.locator('#wide-polish .profile-preview').evaluate(el=>getComputedStyle(el).filter),'none');assert.ok(wide.poster>280,JSON.stringify(wide));
await page.mouse.move(700,30);const mute=page.locator('#wide-polish .ap-popup--mute');const anchor=await mute.boundingBox();await mute.locator('.ap-popup-icon').hover();await page.waitForTimeout(90);const mid=await mute.locator('.ap-popup-reveal').evaluate(el=>({clip:getComputedStyle(el).clipPath,opacity:Number(getComputedStyle(el).opacity)}));assert.ok(mid.opacity>0&&mid.opacity<1);await page.waitForTimeout(650);const after=await mute.boundingBox();assert.equal(anchor.width,after.width);assert.notEqual(mid.clip,await mute.locator('.ap-popup-reveal').evaluate(el=>getComputedStyle(el).clipPath));assert.equal(await mute.locator('.ap-popup-reveal').evaluate(el=>getComputedStyle(el).opacity),'1');assert.notEqual(await mute.locator('.ap-popup-icon').evaluate(el=>getComputedStyle(el).filter),'none');
await page.locator('#wide-polish .lkr-interest-set').scrollIntoViewIfNeeded();await page.screenshot({path:'.tmp/wide-interests.png'});
await page.setViewportSize({width:390,height:900});await page.waitForTimeout(150);assert.ok(await page.locator('#wide-polish').evaluate(el=>el.scrollWidth<=innerWidth+1));
assert.deepEqual(errors,[]);console.log('PASS wide interests/slides, compact identity, tooltip-only donations, real entry button, working badge glow/motion/shelf, account in/out, removed Audio nav, mute opacity/glow and fixed-anchor reveal');
}finally{await browser.close();}
