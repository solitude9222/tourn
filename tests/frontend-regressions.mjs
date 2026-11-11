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
await page.goto('http://127.0.0.1:5180/');
await page.getByRole('heading',{name:'tourn.lol',exact:true}).waitFor();
await page.locator('.home-real-widgets .widget-card.has-art').first().waitFor();
await page.waitForFunction(()=>document.querySelectorAll('.home-real-widgets .widget-card-art').length===3);
assert.equal(await page.locator('.home-real-widgets .widget-card').count(),3);
assert.equal(await page.evaluate(()=>window.qaLoadingFallback),false,'Home flashed a route loading fallback');
console.log('PASS artwork-backed production widgets and cold home without loading flash');
const cryptoMarks=await page.evaluate(async()=>{
 const {PlatformIcon}=await import('/src/components/PlatformIcons.tsx');const {PLATFORMS}=await import('/src/lib/linkPlatforms.ts');const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default||ReactModule;const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const host=document.createElement('div');host.id='crypto-icon-test';document.body.append(host);window.cryptoIconRoot=(dom.createRoot||dom.default.createRoot)(host);window.cryptoIconRoot.render(React.createElement('div',{},...PLATFORMS.filter(item=>item.isCrypto).map(item=>React.createElement(PlatformIcon,{key:item.id,id:item.id,size:24}))));return true;
});assert(cryptoMarks);await page.locator('#crypto-icon-test svg').first().waitFor();
const cryptoGlyphs=await page.locator('#crypto-icon-test svg').evaluateAll(nodes=>nodes.map(node=>node.innerHTML));assert.equal(cryptoGlyphs.length,6);assert.equal(new Set(cryptoGlyphs).size,6,'Crypto icons repeat the generic fallback');
assert.equal(await page.locator('#crypto-icon-test svg[data-platform-icon]').count(),6,'Crypto directory is not rendering the real brand icons');
await page.evaluate(()=>{window.cryptoIconRoot.unmount();document.getElementById('crypto-icon-test').remove();});
console.log('PASS six distinct real crypto brand icons in shared link controls');

await page.screenshot({path:'.tmp/home-desktop.png',fullPage:true});
await page.evaluate(()=>location.hash='#/dashboard');
await page.locator('.tw-dash').waitFor();
await page.locator('.tw-widget-showcase').getByText('The Octocat',{exact:true}).waitFor();
assert.equal(await page.locator('.tw-widget-showcase .widget-card').count(),3,'Missing live examples');
await page.locator('.tw-widget-showcase').getByText('Spotify track',{exact:true}).waitFor();
// Each setup action must reach the actual editor, including its scroll position.
await page.getByRole('button',{name:'Add a background',exact:true}).click();
await page.locator('#dash-section-background').waitFor();
await page.waitForTimeout(100);
assert(await page.locator('#dash-section-background').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0 && r.top<innerHeight;}),'Background editor did not scroll into view');
await page.locator('#dash-section-background + .tw-form-grid .tw-select-btn').first().click();
await page.getByRole('option',{name:'Gradient',exact:true}).click();
await page.reload();await page.locator('.tw-dash').waitFor();
assert(page.url().includes('account-profile'),'Dashboard deep link did not survive refresh');
await page.getByRole('button',{name:'Home',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Add a background',exact:true}).locator('.is-done').count(),1,'Saved background did not complete setup');
await page.getByRole('button',{name:'Add Discord widget',exact:true}).click();
await page.getByText('Available widgets',{exact:true}).waitFor();
assert(page.url().includes('/widgets'),'Discord setup should open Widgets');
await page.locator('.tw-widget-pick').filter({has:page.getByText('Discord',{exact:true})}).click();
const discordDialog=page.getByRole('dialog',{name:'Add Discord',exact:true});
await discordDialog.locator('input').first().fill('https://discord.gg/tourn');
await discordDialog.getByText('Discord user IDs only',{exact:true}).waitFor();
await discordDialog.locator('input').first().fill('1546745348020772915');
await discordDialog.locator('summary').filter({hasText:'Additional Discord badges'}).click();
await discordDialog.getByRole('button',{name:'Orbs',exact:true}).click();
await discordDialog.getByRole('button',{name:'Account Age',exact:true}).click();
const ageStage=discordDialog.locator('.tw-badge-stage').filter({hasText:'Account Age'});
await ageStage.locator('.tw-select-btn').click();
await page.getByRole('option',{name:/Primordial/}).click();
await page.screenshot({path:'.tmp/discord-badge-stages.png',fullPage:false});
await discordDialog.getByRole('button',{name:'Add widget',exact:true}).click();
await waitForSaves();
assert(document.widgets.widgets.some(w=>w.platform==='discord'),'Discord widget was not published');
const discordWidget=document.widgets.widgets.find(w=>w.platform==='discord');
assert(discordWidget.options.profile_badges.includes('orbs'),'Additional widget badge was not saved');
assert(discordWidget.options.profile_badges.includes('account-age~10~'),'Real Account Age stage was not saved');
const badgeTiers=await page.evaluate(async()=>{const {ADDITIONAL_DISCORD_BADGES,isDiscordUserId}=await import('/src/lib/discord.ts');const byId=Object.fromEntries(ADDITIONAL_DISCORD_BADGES.map(badge=>[badge.id,badge]));return {accountAge:byId['account-age'].stages.length,nitro:byId.nitro.stages.length,booster:byId.booster.stages.length,orbs:byId.orbs.stages.length,user:isDiscordUserId('1546745348020772915'),invite:isDiscordUserId('https://discord.gg/tourn')};});
assert.deepEqual(badgeTiers,{accountAge:10,nitro:8,booster:9,orbs:1,user:true,invite:false});
presenceMonitored=true;
await page.evaluate(()=>location.hash='#/dashboard/customize-profile/integrations');
await page.getByText('Player accent',{exact:true}).waitFor();
assert.equal(await page.getByRole('tablist',{name:'Music settings'}).count(),0,'Audio subtabs remain');
await page.getByRole('button',{name:'Music',exact:true}).click();
assert(page.url().includes('/dashboard/music'),'Music is not a Customize destination');
await page.getByText('Default volume',{exact:true}).waitFor();await page.getByText('Player opacity',{exact:true}).waitFor();await page.getByText('Accent opacity',{exact:true}).waitFor();

assert.equal(await page.getByText('Discord Presence',{exact:true}).count(),0,'Duplicate Discord presence editor remains');
await page.getByText('Player accent',{exact:true}).waitFor();
const accentOpacity=page.getByRole('slider',{name:'Accent opacity',exact:true});
await accentOpacity.press('Home');await accentOpacity.press('ArrowRight');
const playerStyle=page.locator('.tw-field').filter({has:page.getByText('Player style',{exact:true})});
await playerStyle.locator('.tw-select-btn').click();await page.getByRole('option',{name:'Popup',exact:true}).click();
await waitForSaves();assert.equal(document.about.assets.audio.style,'popup','Popup style was not saved');
await page.getByRole('slider',{name:'Default volume',exact:true}).press('Home');await page.getByRole('slider',{name:'Default volume',exact:true}).press('ArrowRight');
await page.getByRole('slider',{name:'Player opacity',exact:true}).press('End');
await page.getByRole('slider',{name:'Playback speed',exact:true}).press('Home');
await page.getByRole('switch',{name:'Loop track',exact:true}).click();
await waitForSaves();
assert.equal(document.about.assets.audio.volume,.01);assert.equal(document.about.assets.audio.cardOpacity,1);assert.equal(document.about.assets.audio.accentOpacity,.01);assert.equal(document.about.assets.audio.playbackRate,.5);assert.equal(document.about.assets.audio.loop,false);
await page.screenshot({path:'.tmp/music-settings.png',fullPage:true});
await page.reload();await playerStyle.getByText('Popup',{exact:true}).waitFor();
assert.equal(await page.getByRole('slider',{name:'Default volume',exact:true}).inputValue(),'1');
assert.equal(await page.getByRole('slider',{name:'Accent opacity',exact:true}).inputValue(),'1');
assert.equal(await page.getByRole('switch',{name:'Loop track',exact:true}).getAttribute('aria-checked'),'false');

assert(await page.getByText('Track title',{exact:true}).isVisible(),'Audio settings are not on one page');
await page.getByText('Auto-fetch lyrics',{exact:true}).first().waitFor();
const largeAudio=Buffer.alloc(6*1024*1024+44);
await page.locator('input[type=file][accept="audio/*"]').setInputFiles({name:'full-track.wav',mimeType:'audio/wav',buffer:largeAudio});
await page.getByText('Track added. Changes save automatically.',{exact:true}).waitFor();
await waitForSaves();
assert.equal(audioUploadExpected,largeAudio.length);assert.equal(audioUploadBytes,largeAudio.length);
assert(document.about.assets.audio.fileUrl.endsWith('/api/media/audio/00000000-0000-4000-8000-000000000099'));
const savedAudioUrl=document.about.assets.audio.fileUrl;
const accentStyle=await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default;const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const {AudioPlayer}=await import('/src/components/AudioPlayer.tsx');const {loadProfileAssets}=await import('/src/lib/profileAssets.ts');const host=document.createElement('div');host.id='accent-opacity-test';document.body.append(host);const root=(dom.createRoot||dom.default.createRoot)(host);const audio=loadProfileAssets({audio:{fileUrl:'/api/media/audio/test',style:'compact',accentColor:'#f2c9dd',accentOpacity:.01}}).audio;root.render(React.createElement(AudioPlayer,{settings:audio,enabled:false}));await new Promise(requestAnimationFrame);let player=host.querySelector('.ap');for(let i=0;i<40&&!player;i++){await new Promise(r=>setTimeout(r,25));player=host.querySelector('.ap');}if(!player){root.unmount();host.remove();throw new Error('AudioPlayer did not render');}const value=getComputedStyle(player).getPropertyValue('--ap-accent').trim();root.unmount();host.remove();return value;});
assert(accentStyle.includes('0.01'),'Accent opacity did not reach the audio player: '+accentStyle);
assert(JSON.stringify(document).length<100000,'Audio bytes were embedded in the profile document');
await page.reload();await page.getByText('Player accent',{exact:true}).waitFor();
assert.equal(await page.locator('.tw-field').filter({has:page.getByText('Hosted audio URL',{exact:true})}).locator('input').inputValue(),savedAudioUrl);
failAudioUpload=true;
await page.locator('input[type=file][accept="audio/*"]').setInputFiles({name:'replacement.wav',mimeType:'audio/wav',buffer:Buffer.alloc(100)});
await page.getByText('Audio upload interrupted',{exact:true}).waitFor();
assert.equal(document.about.assets.audio.fileUrl,savedAudioUrl,'Failed upload replaced the published track');
failAudioUpload=false;

await page.evaluate(()=>location.hash='#/dashboard/customize-profile/profile');
await page.getByText('Profile appearance',{exact:true}).waitFor();
assert.equal(await page.getByText('Enter Text',{exact:true}).count(),0,'Entry settings are duplicated in Profile');
await page.evaluate(()=>location.hash='#/dashboard/customize-profile/experience');
await page.getByText('Entry animation',{exact:true}).waitFor();
await page.locator('.tw-field').filter({has:page.getByText('Entry animation',{exact:true})}).locator('.tw-select-btn').click();
await page.getByRole('option',{name:'Fade in',exact:true}).click();
await page.locator('.tw-enter-stage .lkr-entry--fade').waitFor();
await page.evaluate(()=>location.hash='#/dashboard/customize-profile/integrations');
console.log('PASS Discord status recovery, widget badge persistence, music organization and entry setting ownership');

await page.getByRole('button',{name:'Home',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Add Discord widget',exact:true}).locator('.is-done').count(),1,'Saved Discord presence did not complete setup');
await page.evaluate(()=>location.hash='#/dashboard/widgets');
await page.getByRole('button',{name:'Delete Discord',exact:true}).click();
await waitForSaves();
assert.equal(document.widgets.widgets.length,0);

await page.getByRole('button',{name:'Home',exact:true}).click();
await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.qaCopied=text;}}}));
await page.getByRole('button',{name:'Copy your profile link',exact:true}).click();
await page.waitForFunction(()=>localStorage.getItem('tourn.lol/setup-shared/v1/qa-user')==='yes');
assert.equal(await page.evaluate(()=>window.qaCopied),'http://127.0.0.1:5180/reviewer');
await page.getByRole('button',{name:'View analytics',exact:true}).click();
await page.getByText('Traffic Sources',{exact:true}).waitFor();
await page.getByText('github.com',{exact:true}).waitFor();
const chart=page.locator('.tw-chart polyline');
const points=await chart.getAttribute('points');assert(new Set(points.trim().split(/\s+/).map(p=>p.split(',')[1])).size>1,'Analytics chart is a flat placeholder');
await page.getByRole('button',{name:'Today',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.tw-chart')?.getAttribute('aria-label')?.split(',').length===1);
assert(analyticsRequests.includes('24h'),'Date filter did not fetch analytics');
failAnalytics=true;
await page.getByRole('button',{name:'30 days',exact:true}).click();
await page.getByRole('alert').filter({hasText:'Analytics temporarily unavailable'}).waitFor();
failAnalytics=false;
await page.getByRole('button',{name:'Retry analytics',exact:true}).click();
await page.getByText('github.com',{exact:true}).waitFor();
await page.reload();await page.getByText('Traffic Sources',{exact:true}).waitFor();
assert(page.url().includes('/analytics'),'Analytics route did not survive refresh');
await page.getByRole('button',{name:'Home',exact:true}).click();
console.log('PASS live widget examples, setup destinations, share action, analytics data, filters, error recovery and deep links');
await page.screenshot({path:'.tmp/dashboard-desktop.png',fullPage:true});
const nav = async (name) => {
 const group = page.getByRole('button',{name:'Links',exact:true});
 if (['Social Links','Widgets'].includes(name) && await group.getAttribute('aria-expanded')==='false') await group.click();
 await page.getByRole('button',{name,exact:true}).click();
};
// Failed writes retain the latest complete draft across a reload.
failWrites=true;
await nav('Social Links');
await page.getByRole('button',{name:'Add link',exact:true}).first().click();
await page.getByRole('dialog',{name:'Add a link'}).getByRole('button',{name:'Add link',exact:true}).click();
const editor=page.getByRole('dialog',{name:'Edit link'});
await editor.locator('input').nth(0).fill('My community');
await editor.locator('input').nth(1).fill('https://discord.gg/test');
await editor.getByRole('button',{name:'Done',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/pending-profile/v1/qa-user')||'null')?.document.links.links[0]?.label==='My community');
await page.waitForTimeout(1000);
assert(writes.some(w=>w.data.links?.links[0]?.label==='My community'),'Link was not sent');
await page.reload();await page.locator('.tw-dash').waitFor();
await nav('Social Links');
await page.getByText('My community',{exact:true}).first().waitFor();
failWrites=false;
await page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'),null,{timeout:15000});
assert.equal(document.links.links[0].label,'My community');
console.log('PASS failed publish recovery and refresh');
// Add an actual widget through the editor.
await nav('Widgets');
await page.locator('.tw-widget-pick').filter({hasText:'GitHub'}).click();
await page.getByRole('dialog',{name:'Add GitHub'}).locator('input').first().fill('octocat');
await page.getByRole('dialog',{name:'Add GitHub'}).getByRole('button',{name:'Add widget',exact:true}).click();
await page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'),null,{timeout:15000});
await waitForSaves();
assert.equal(document.widgets.widgets.length,1);
await page.reload();await page.locator('.tw-dash').waitFor();
await nav('Widgets');
assert.equal(await page.locator('.tw-widget-row').count(),1);
await page.screenshot({path:'.tmp/widget-gallery.png',fullPage:true});
console.log('PASS widget add and refresh');
// Close and refresh without pressing Save: preserve the latest widget keystroke.
failWrites=true;
await page.getByRole('button',{name:'Edit GitHub',exact:true}).click();
await page.getByRole('dialog',{name:'Edit GitHub',exact:true}).locator('input').first().fill('torvalds');
const durableWidget=await page.evaluate(()=>JSON.parse(localStorage.getItem('tourn.lol/pending-profile/v1/qa-user')));
assert.equal(durableWidget.document.widgets.widgets[0].content,'torvalds','The edit was not durable at input time');
assert(durableWidget.baseDocument,'Pending save has no merge baseline');
// Another device updates the same widget options and adds a link before refresh.
document.widgets.widgets[0].options.remote_flag='retained';
document.links.links.push({id:'remote-link',platform:'github',label:'Remote addition',url:'https://github.com/example',visible:true,iconUrl:''});revision++;
await page.reload();await page.locator('.tw-dash').waitFor();
failWrites=false;await page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'),null,{timeout:15000});
assert.equal(document.widgets.widgets[0].content,'torvalds');assert.equal(document.widgets.widgets[0].options.remote_flag,'retained');assert(document.links.links.some(link=>link.id==='remote-link'),'Rebasing erased another device’s link');
await nav('Social Links');await page.getByRole('button',{name:'Delete Remote addition',exact:true}).click();await waitForSaves();
console.log('PASS immediate widget durability and stale-draft three-way merge');

// Explicitly deleting the last link must not resurrect an old local section.
await nav('Social Links');
await page.getByRole('button',{name:'Delete My community',exact:true}).click();
await waitForSaves();
assert.equal(document.links.links.length,0);
await page.reload();await page.locator('.tw-dash').waitFor();
await nav('Social Links');
await page.getByText('No links yet',{exact:true}).waitFor();
assert.equal(document.widgets.widgets.length,1,'Deleting links removed widgets');
console.log('PASS final link deletion and independent widget preservation');
// A delayed hydration must not upload the initially empty React stores.
readDelay=1200; const before=writes.length;
await page.reload();await page.locator('.tw-dash').waitFor();
assert.equal(writes.length,before,'Hydration uploaded an empty baseline');
readDelay=0;
failReads=true;const beforeReadFailure=writes.length;
await page.reload();
await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
assert.equal(writes.length,beforeReadFailure,'Failed hydration published local defaults');
failReads=false;
await page.getByRole('button',{name:'Try again',exact:true}).click();
await page.locator('.tw-dash').waitFor();
console.log('PASS failed hydration blocks uploads and allows recovery');
await page.getByRole('button',{name:'Home',exact:true}).click();
await page.screenshot({path:'.tmp/dashboard-desktop.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log('PASS hydration guard and runtime errors');
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>location.hash='#/');
await page.getByRole('heading',{name:'tourn.lol',exact:true}).waitFor();
await page.screenshot({path:'.tmp/home-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile overflow');
console.log('visual smoke passed',writes.length);
// Failed view recording must remain retryable instead of marking the day seen.
failViewWrite=true;
await page.evaluate(async()=>{const {recordView}=await import('/src/lib/views.ts');await recordView('visit-retry');});
assert.equal(await page.evaluate(()=>localStorage.getItem('tourn.lol/views-seen/v1/visit-retry')),null);
const failedViews=viewWrites;failViewWrite=false;
await page.evaluate(async()=>{const {recordView}=await import('/src/lib/views.ts');await recordView('visit-retry');await recordView('visit-retry');});
assert.equal(viewWrites,failedViews+1,'Failed view was not retried or was counted repeatedly');
console.log('PASS failed visit retry and daily browser deduplication');
// Tooltips disappear when their anchor is removed without pointerleave.
await page.evaluate(async()=>{
 const ReactModule=await import('/node_modules/.vite/deps/react.js'); const React=ReactModule.default || ReactModule;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js'); const createRoot=dom.createRoot || dom.default.createRoot;
 const {Tooltip}=await import('/src/components/Tooltip.tsx');
 const host=document.createElement('div');host.id='tooltip-test';host.style.cssText='position:fixed;top:100px;left:30px;z-index:999999;background:#333;padding:20px';document.body.append(host);
 window.qaRoot=createRoot(host);window.qaRoot.render(React.createElement(Tooltip,{text:'Regression bubble'},React.createElement('button',{id:'qa-anchor'},'Tooltip anchor')));
});
await page.getByRole('button',{name:'Tooltip anchor',exact:true}).hover();
await page.getByRole('tooltip').waitFor({state:'visible'});
await page.evaluate(()=>document.getElementById('qa-anchor').style.display='none');
await page.getByRole('tooltip').waitFor({state:'detached',timeout:2000});
await page.evaluate(()=>{window.qaRoot.unmount();document.getElementById('tooltip-test').remove();});
console.log('PASS tooltip detached anchor cleanup');
// Draw work remains bounded and paused canvases preserve their identity.
const effects=await page.evaluate(async()=>{
 const {mountBgEffect}=await import('/src/lib/bgEffects.ts');
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:1920px;height:1080px;pointer-events:none';document.body.append(host);
 let draws=0,maxPixels=0;const clear=CanvasRenderingContext2D.prototype.clearRect;
 const create=CanvasRenderingContext2D.prototype.createImageData;
 CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.parentElement===host)draws++;return clear.apply(this,args);};
 CanvasRenderingContext2D.prototype.createImageData=function(w,h,...rest){maxPixels=Math.max(maxPixels,w*h);return create.call(this,w,h,...rest);};
 const api=mountBgEffect(host,{effect:'tv',intensity:50,speed:9,color:'#a5cfff',amount:50,flag:false,maxFps:30});
 const canvas=host.querySelector('canvas');
 await new Promise(r=>setTimeout(r,1100));const active=draws;
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
 await new Promise(r=>setTimeout(r,150));const paused=draws;
 delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
 await new Promise(r=>setTimeout(r,150));const resumed=draws;
 const sameCanvas=canvas===host.querySelector('canvas');
 api.destroy();host.remove();CanvasRenderingContext2D.prototype.clearRect=clear;CanvasRenderingContext2D.prototype.createImageData=create;
 return {active,paused,resumed,sameCanvas,maxPixels};
});
assert(effects.active>=10 && effects.active<=20,JSON.stringify(effects));
assert.equal(effects.active,effects.paused);assert(effects.resumed>effects.paused);assert(effects.sameCanvas);assert(effects.maxPixels<=320*180);
console.log('PASS effect frame budget, pause/resume, canvas identity, pixel work cap',effects);
await page.emulateMedia({reducedMotion:'reduce'});
const stillDraws=await page.evaluate(async()=>{
 const {mountBgEffect}=await import('/src/lib/bgEffects.ts');const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);
 let count=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){count++;return clear.apply(this,args);};
 const api=mountBgEffect(host,{effect:'snow',intensity:50,speed:9,color:'#fff',amount:50,flag:false,maxFps:30});
 await new Promise(r=>setTimeout(r,400));const first=count;await new Promise(r=>setTimeout(r,400));const last=count;
 api.destroy();host.remove();CanvasRenderingContext2D.prototype.clearRect=clear;return {first,last};
});
assert(stillDraws.first>0);assert(stillDraws.last>stillDraws.first,'Selected effects froze under reduced motion');
console.log('PASS selected effects remain animated with reduced motion');
assert.deepEqual(errors,[],'Runtime errors after effect and tooltip checks');
// Exercise the actual React background wrapper under the OS setting that
// previously froze rain, and sample the first drop across drawn frames.
const rain=await page.evaluate(async()=>{
 const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default || ReactModule;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=dom.createRoot || dom.default.createRoot;
 const {BackgroundEffectLayer}=await import('/src/components/ProfileEffects.tsx');
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:400px;height:600px;pointer-events:none';document.body.append(host);
 const samples=[];const clear=CanvasRenderingContext2D.prototype.clearRect;const move=CanvasRenderingContext2D.prototype.moveTo;let first=false;
 CanvasRenderingContext2D.prototype.clearRect=function(...args){if(host.contains(this.canvas))first=true;return clear.apply(this,args);};
 CanvasRenderingContext2D.prototype.moveTo=function(x,y){if(host.contains(this.canvas)&&first){samples.push([x,y]);first=false;}return move.call(this,x,y);};
 const root=createRoot(host);root.render(React.createElement(BackgroundEffectLayer,{settings:{id:'rain',intensity:70,speed:9,color:'#a5cfff',params:{amount:50,flag:true}}}));
 await new Promise(r=>setTimeout(r,700));
 root.unmount();host.remove();CanvasRenderingContext2D.prototype.clearRect=clear;CanvasRenderingContext2D.prototype.moveTo=move;
 return {frames:samples.length,moved:samples.some(([x,y])=>x!==samples[0][0] || y!==samples[0][1])};
});
assert(rain.frames>10 && rain.moved,JSON.stringify(rain));
console.log('PASS rain drop movement through React wrapper',rain);
await page.emulateMedia({reducedMotion:'no-preference'});
await page.evaluate(()=>location.hash='#/dashboard');await page.locator('.tw-dash').waitFor();
// Main dashboard destinations and profile tabs render without a blank page.
for(const destination of ['badges','affiliates','customize-profile/profile','customize-profile/experience','customize-profile/integrations','customize-profile/switches','layout','effects','premium','assets','templates','leaderboard','billing','settings']) {
 await page.evaluate(destination=>location.hash=`#/dashboard/${destination}`,destination);
 await page.locator('.tw-dash').waitFor();
 await page.waitForTimeout(100);
 assert((await page.locator('.tw-main').innerText()).trim().length>30,`Blank dashboard destination: ${destination}`);
}
assert.deepEqual(errors,[],'Errors while opening dashboard pages');
console.log('PASS dashboard destinations and profile tabs');
await page.evaluate(()=>location.hash='#/dashboard/customize-profile/experience');
await page.locator('.tw-dash').waitFor();
await page.waitForTimeout(250);
const layersField=page.locator('.tw-field').filter({has:page.getByText('Animation layers',{exact:true})});
await layersField.scrollIntoViewIfNeeded();
await layersField.screenshot({path:'.tmp/entry-layers.png'});
// Reference capabilities are configurable, rather than copied profiles.
await page.setViewportSize({width:1440,height:1000});
await page.evaluate(()=>location.hash='#/dashboard/effects');
await page.getByRole('navigation',{name:'Effect categories'}).waitFor();
assert.equal(await page.locator('.tw-effect-stage').count(),0,'Old full realtime stage remains');
const chooseEffect=async(kind,name)=>{
 const labels={background:'Background',overlay:'Overlays',text:'Text',card:'Card',cursor:'Pointer & sound'};
 await page.getByRole('navigation',{name:'Effect categories'}).getByRole('button',{name:labels[kind],exact:true}).click();
 const gallery=page.getByLabel(`${kind} effects`,{exact:true});
 assert(await gallery.locator('.fx-tile-preview').count()>1,'Effects are not shown together');
 if(kind==='overlay') { assert.equal(await gallery.locator('.fx-choice').count(),8,'Distinct texture overlays should be available'); assert.equal(await gallery.getByRole('button',{name:'Rain',exact:true}).count(),0,'Particle backgrounds duplicated in overlays'); assert.equal(await gallery.locator('.fx-overlay-subject').count(),0,'Overlay previews still draw decorative circles'); assert.equal(await gallery.locator('.fx-preview-scene').count(),8,'Overlay previews have no content scene'); const dotted=await gallery.getByRole('button',{name:'Dotted'}).locator('.profile-overlay').evaluate(el=>getComputedStyle(el).backgroundImage); assert(dotted.includes('radial-gradient'),'Dotted overlay preview is empty'); await page.screenshot({path:'.tmp/overlays-gallery.png',fullPage:true}); }
 const background=await gallery.locator('.fx-tile-preview').first().evaluate(el=>getComputedStyle(el).backgroundColor);
 assert.equal(background,'rgb(0, 0, 0)','Effect tiles are not black');
 await gallery.getByRole('button',{name,exact:true}).click();
 if(kind==='background') await page.screenshot({path:'.tmp/effects-gallery.png',fullPage:true});
};
await chooseEffect('background','Rain');
await chooseEffect('overlay','Dotted');
await chooseEffect('text','Sparkle');
await page.screenshot({path:'.tmp/effects-text-sparkle.png',fullPage:false});
const sparkleColour=page.locator('.tw-color-field').filter({hasText:'Sparkle colour'}).first();
await sparkleColour.scrollIntoViewIfNeeded();
await sparkleColour.locator('.tw-swatch').click();
const colourBefore=await sparkleColour.locator('.tw-color-hex').inputValue();
assert.equal(await sparkleColour.locator('.tw-color-wheel').count(),0,'Old circular hue wheel remains');
const spectrum=sparkleColour.locator('.tw-color-square');
const spectrumBox=await spectrum.boundingBox();
assert(spectrumBox,'Colour spectrum did not render');
assert.equal(Math.round(spectrumBox.width),Math.round(spectrumBox.height),'Colour spectrum is not square');
assert((await spectrum.evaluate(el=>parseFloat(getComputedStyle(el).borderRadius)))>0,'Colour spectrum is not rounded');
await page.mouse.click(spectrumBox.x+spectrumBox.width*.8,spectrumBox.y+spectrumBox.height*.2);
assert.notEqual(await sparkleColour.locator('.tw-color-hex').inputValue(),colourBefore,'Colour spectrum did not change a neutral colour');
await page.screenshot({path:'.tmp/color-picker.png',fullPage:false});
await sparkleColour.locator('.tw-swatch').click();
await chooseEffect('card','Beam ring');
await page.getByRole('navigation',{name:'Effect categories'}).getByRole('button',{name:'Pointer & sound',exact:true}).click();
const trailGallery=page.getByLabel('trail effects',{exact:true});
assert(await trailGallery.locator('.fx-tile-preview').count()>5,'More trail styles should be available');
assert.equal(await page.getByLabel('Custom pointer image',{exact:true}).count(),0,'Effects should not duplicate the Account cursor upload');
assert.equal(await page.locator('.fx-pointer-drop').count(),0,'Effects still renders a pointer upload');
await trailGallery.getByRole('button',{name:'Sparkle',exact:true}).click();
await page.screenshot({path:'.tmp/effects-cursor.png',fullPage:false});
const clickField=page.locator('.tw-field').filter({has:page.getByText('Click sound',{exact:true})});
await clickField.locator('.tw-select-btn').click();await page.getByRole('option',{name:'custom',exact:true}).click();
const clickCompleted=page.waitForResponse(response=>response.url().includes('/api/media/audio/') && response.url().endsWith('/complete'));
await page.getByLabel('Custom click audio',{exact:true}).setInputFiles({name:'click.wav',mimeType:'audio/wav',buffer:Buffer.alloc(2*1024*1024)});
await clickCompleted;
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/pending-profile/v1/qa-user')||'null')?.document?.about?.assets?.interactions?.fileUrl?.includes('/api/media/audio/'));
await page.waitForFunction(()=>!localStorage.getItem('tourn.lol/pending-profile/v1/qa-user'),null,{timeout:15000});
assert(document.about.assets.interactions.fileUrl.endsWith('/api/media/audio/00000000-0000-4000-8000-000000000099'),'Large click sound did not persist');
await clickField.locator('.tw-select-btn').click();await page.getByRole('option',{name:'tick',exact:true}).click();
await page.getByRole('switch',{name:'Click ripple',exact:true}).click();
await waitForSaves();
assert.equal(document.about.assets.effects.overlay.id,'dotted');assert.equal(document.about.assets.effects.text.name.effect,'sparkle');
assert.equal(document.about.assets.card.id,'beam');assert.equal(document.about.assets.cursor.trailType,'sparkle');assert.equal(document.about.assets.interactions.sound,'tick');assert(document.about.assets.interactions.ripple);
await page.evaluate(()=>location.hash='#/dashboard/layout');
await page.getByText('Page layout',{exact:true}).waitFor();
assert.equal(await page.getByText('Card width',{exact:true}).count(),0,'Card width was not removed');
await page.locator('.tw-layout-card').filter({hasText:'Left aligned'}).click();
await page.waitForTimeout(150);
assert.equal(await page.locator('.tw-card-preview').count(),0,'Live card preview remains');
await page.getByRole('switch',{name:'Tilt stacked cards together',exact:true}).click();
await waitForSaves();assert(document.about.design.stackTilt,'Shared tilt was not saved');
await page.locator('.tw-layout-card').filter({hasText:'Centered'}).click();
await page.getByRole('navigation',{name:'Card settings'}).getByRole('button',{name:'Sections',exact:true}).click();
await page.locator('.tw-section-add-btn--text').click();
await page.locator('.tw-field').filter({has:page.getByText('Section title',{exact:true})}).locator('input').fill('My own section');
await page.locator('.tw-field').filter({has:page.getByText('Description',{exact:true})}).locator('textarea').fill('My own content goes here.');
await page.locator('.tw-field').filter({has:page.getByText('Main link',{exact:true})}).locator('input').fill('https://example.com/project');
await page.getByText('Sections scroll normally below your profile. Projects, anime and games become real showcase cards with artwork, icons and links.',{exact:true}).waitFor();
assert.equal(await page.locator('.tw-section-add-btn').count(),4,'Section kinds are missing');
assert.equal(await page.locator('.tw-section-kind-row').first().locator('.tw-section-kind').count(),4,'Section editor lost its kind switch');
await page.evaluate(()=>location.hash='#/dashboard/account-profile?section=background');
await page.locator('#dash-section-background + .tw-form-grid .tw-select-btn').first().click();
await page.getByRole('option',{name:'Video',exact:true}).click();
await page.locator('.tw-field').filter({has:page.getByText('Background video URL',{exact:true})}).locator('input').fill('https://example.com/owner-video.webm');
await waitForSaves();
assert.equal(document.about.assets.background.style,'video');assert.equal(document.about.assets.background.videoUrl,'https://example.com/owner-video.webm');
assert.equal(document.about.design.sections[0].title,'My own section');
await page.reload();await page.locator('.tw-dash').waitFor();
assert.equal(await page.locator('.tw-field').filter({has:page.getByText('Background video URL',{exact:true})}).locator('input').inputValue(),'https://example.com/owner-video.webm');
const runtime=await page.evaluate(async profile=>{
 const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default || ReactModule;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=dom.createRoot || dom.default.createRoot;
 const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');
 const host=document.createElement('div');host.id='reference-capability-test';host.style.cssText='position:fixed;inset:0;z-index:100000;background:#111;overflow:auto';document.body.append(host);
 const root=createRoot(host);root.render(React.createElement(LinkerPreview,{user:{id:'test',username:'my-profile',avatarUrl:null},about:profile.about,widgets:profile.widgets,links:profile.links,badges:profile.badges,interactive:true,showEntry:false,showMetadata:false}));window.referenceRoot=root;window.renderReference=(design,audio={},patch={})=>root.render(React.createElement(LinkerPreview,{user:{id:'test',username:'a-long-profile-handle-to-check-wrap',avatarUrl:null},about:{...profile.about,...patch,displayName:patch.displayName||'A long display name to check wrapping',assets:{...profile.about.assets,...patch.assets,audio:{...profile.about.assets.audio,...audio},effects:{...profile.about.assets.effects,...patch.assets?.effects,text:{...profile.about.assets.effects.text,...patch.assets?.effects?.text}}},design:{...profile.about.design,...design}},widgets:profile.widgets,links:profile.links,badges:profile.badges,interactive:true,showEntry:false,showMetadata:false}));
 return true;
},document);
assert(runtime);
await page.locator('#reference-capability-test .profile-overlay--dotted').waitFor();
await page.locator('#reference-capability-test .pv-card-fx--beam').waitFor();
await page.locator('#reference-capability-test video').waitFor({state:'attached'});
assert((await page.locator('#reference-capability-test .fx-sparkles i').count())>0,'Sparkle is missing outside stars');
assert.equal(await page.locator('#reference-capability-test .fx-text--sparkle').evaluate(el=>getComputedStyle(el).backgroundImage),'none','Sparkle is still clipped glitter');
const sparkleTexture=await page.locator('#reference-capability-test .fx-sparkles').evaluate(el=>{const style=getComputedStyle(el,'::before');return {image:style.maskImage||style.webkitMaskImage,mode:style.maskMode,size:style.maskSize};});
assert(sparkleTexture.image.includes('/effects/sparkle_black.gif'),'Sparkle texture does not use the transparent asset: '+sparkleTexture.image);
assert.equal(sparkleTexture.mode,'alpha','Sparkle texture is not using its alpha channel');
assert.equal(sparkleTexture.size,'90px 68px','Sparkle texture is not using the reference tile size');
// New metadata slots and stacked text effects are real rendered placements.
await page.evaluate(async()=>{
 const {DEFAULT_TEXT_EFFECT}=await import('/src/lib/profileAssets.ts');
 window.renderReference({layout:'stacked',locationPosition:'outside-top-left'},{},{location:'Auckland',displayName:'Paradox',assets:{effects:{text:{name:{...DEFAULT_TEXT_EFFECT,effect:'glow',effects:['liner']}}}}});
});
await page.locator('#reference-capability-test .pv-pin--outside-top-left .pv-location').waitFor();
assert((await page.locator('#reference-capability-test .pv-id .fx-text-wrap--liner').count())>0,'Stacked liner effect is not rendered');
assert((await page.locator('#reference-capability-test .pv-id .fx-text-wrap--glow').count())>0,'Stacked glow effect is not rendered');
const outsideGeometry=await page.locator('#reference-capability-test .profile-preview').evaluate(card=>{const bounds=card.getBoundingClientRect(),pin=card.querySelector('.pv-pin--outside-top-left').getBoundingClientRect();return {cardTop:bounds.top,pinTop:pin.top};});
assert(outsideGeometry.pinTop<outsideGeometry.cardTop,'Outside-corner metadata did not escape the card');
await page.evaluate(()=>window.renderReference({layout:'stacked',locationPosition:'inside-top-right'},{},{location:'Auckland',displayName:'Paradox'}));
await page.locator('#reference-capability-test .pv-pin--inside-top-right .pv-location').waitFor();
const insideGeometry=await page.locator('#reference-capability-test .profile-preview').evaluate(card=>{const bounds=card.getBoundingClientRect(),pin=card.querySelector('.pv-pin--inside-top-right').getBoundingClientRect();return {inside:pin.left>=bounds.left-1&&pin.right<=bounds.right+1&&pin.top>=bounds.top-1&&pin.bottom<=bounds.bottom+1};});
assert(insideGeometry.inside,'Inside-corner metadata sits outside the card');
await page.evaluate(()=>window.renderReference({layout:'stacked',locationPosition:'next-to-name'},{},{location:'Auckland',displayName:'Paradox'}));
await page.locator('#reference-capability-test .pv-id .pv-pin--location').waitFor();
await page.locator('#reference-capability-test .lkr-custom-section a').dispatchEvent('pointerdown',{button:0,clientX:120,clientY:120});
await page.locator('#reference-capability-test .profile-click-ring').waitFor({state:'attached'});
await page.screenshot({path:'.tmp/reference-capabilities.png',fullPage:false});
// Every preset must contain its children at both phone and desktop widths.
for (const width of [1440,390]) {
 await page.setViewportSize({width,height:1000});
 for (const layout of ['stacked','left','centered']) {
  for (const pfpPosition of ['left','above','right']) {
   await page.evaluate(({layout,pfpPosition})=>window.renderReference({layout,pfpPosition,viewPosition:'top-right',badgePosition:'top-right',locationPosition:'top',avatarSize:150,nameSize:48}),{layout,pfpPosition});
   await page.waitForTimeout(80);
   const geometry=await page.locator('#reference-capability-test .profile-preview').evaluate(card=>{
    const bounds=card.getBoundingClientRect(), head=card.querySelector('.pv-head-text').getBoundingClientRect(), avatar=card.querySelector('.pv-avatar-wrap').getBoundingClientRect();
    const overlap=Math.min(head.right,avatar.right)-Math.max(head.left,avatar.left)>1 && Math.min(head.bottom,avatar.bottom)-Math.max(head.top,avatar.top)>1;
    return {overflow:card.scrollWidth>card.clientWidth+2,overlap,inside:head.right<=bounds.right+1 && head.left>=bounds.left-1};
   });
   assert(!geometry.overflow && !geometry.overlap && geometry.inside,JSON.stringify({width,layout,pfpPosition,...geometry}));
  }
  await page.screenshot({path:`.tmp/layout-${layout}-${width}.png`,fullPage:false});
 }
}
await page.setViewportSize({width:1440,height:1000});
await page.evaluate(()=>window.renderReference({layout:'stacked',audioPosition:'auto'},{style:'compact',fileUrl:'https://example.com/track.mp3',autoplay:false}));
await page.locator('#reference-capability-test .lkr-stacked-widgets .widget-card').first().waitFor();
await page.locator('#reference-capability-test .lkr-stack .ap').waitFor();
assert.equal(await page.locator('#reference-capability-test .profile-preview .widget-card').count(),0,'Stacked widgets stayed inside identity card');
assert.equal(await page.locator('#reference-capability-test .profile-preview .ap').count(),0,'Stacked audio stayed inside identity card');
await page.evaluate(()=>window.renderReference({layout:'left',audioPosition:'auto'},{style:'popup',fileUrl:'https://example.com/track.mp3',autoplay:false,popupSide:'left',volume:.7}));
const popup=page.getByRole('complementary',{name:'Popup audio player'});
await popup.waitFor();
const popupBox=await popup.boundingBox();assert(popupBox.x<=24 && popupBox.y<=24,JSON.stringify(popupBox));
assert.equal(await popup.locator('.ap:not(.ap-popup)').count(),0,'Popup still renders a full track panel');
const rail=popup.locator('.ap-popup-reveal');
await page.mouse.move(1200,900);await page.waitForTimeout(350);
assert((await rail.boundingBox()).width<2,'Volume rail remains open without hover');
await popup.locator('.ap-popup-icon').hover();await page.waitForTimeout(350);
assert((await rail.boundingBox()).width>60,'Volume rail did not reveal');
const volumeControl=popup.getByRole('slider',{name:'Music volume',exact:true});
await volumeControl.focus();await volumeControl.press('Home');await volumeControl.press('ArrowRight');
assert(Math.abs(await popup.locator('audio').evaluate(el=>el.volume)-.01)<.001,'Volume drag does not control native audio');
await page.mouse.move(1200,900);await page.locator('#reference-capability-test .lkr-custom-section a').focus();await page.waitForTimeout(350);
assert((await rail.boundingBox()).width<2,'Volume rail does not close smoothly');
await popup.locator('.ap-popup-icon').hover();await page.waitForTimeout(350);
await page.screenshot({path:'.tmp/popup-audio.png',fullPage:false});
await page.evaluate(()=>window.renderReference({layout:'left',audioPosition:'auto'},{style:'popup',fileUrl:'https://example.com/track.mp3',autoplay:false,popupSide:'right',loop:false,playbackRate:1.25}));
await page.locator('#reference-capability-test .lkr-popup-audio--right').waitFor();
const rightPopup=await popup.boundingBox();assert(Math.abs(1440-rightPopup.x-rightPopup.width-20)<2,JSON.stringify(rightPopup));
assert.deepEqual(await popup.locator('audio').evaluate(el=>({loop:el.loop,rate:el.playbackRate})),{loop:false,rate:1.25});

await page.evaluate(()=>window.renderReference({layout:'stacked',stackTilt:true,tilt:8,audioPosition:'auto'},{style:'compact',fileUrl:'https://example.com/track.mp3',autoplay:false}));
const tiltGroup=page.locator('#reference-capability-test .lkr-stacked-group--tilt');await tiltGroup.waitFor();
assert.equal(await tiltGroup.locator('.profile-preview--tilt').count(),0,'Shared stack tilts the identity twice');
const tiltBounds=await tiltGroup.boundingBox();await page.mouse.move(tiltBounds.x+20,tiltBounds.y+20);await page.waitForTimeout(250);
assert.notEqual(await tiltGroup.evaluate(el=>el.style.getPropertyValue('--tilt-y')),'0deg','Shared tilt is not responding');
await page.screenshot({path:'.tmp/shared-stack-tilt.png',fullPage:false});
await page.evaluate(()=>{window.referenceRoot.unmount();document.getElementById('reference-capability-test').remove();});
assert.deepEqual(errors,[],'Reference capability runtime errors');
const fuzzyVisible=await page.evaluate(async()=>{
 const {mountBgEffect}=await import('/src/lib/bgEffects.ts');
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:240px;height:130px;z-index:200000;background:#000';document.body.append(host);
 const effect=mountBgEffect(host,{effect:'fuzzy',intensity:60,speed:10,color:'#ffffff',amount:50,flag:false,maxFps:15});
 await new Promise(resolve=>setTimeout(resolve,700));
 const canvas=host.querySelector('canvas');const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 const visible=pixels.some(value=>value>0);effect.destroy();host.remove();return visible;
});assert(fuzzyVisible,'Fuzzy effect renders an empty canvas');
console.log('PASS preview galleries, real layouts, removed width, click feedback, outside sparkles, video and custom sections persisted');
await page.setViewportSize({width:390,height:900});
await page.evaluate(()=>location.hash='#/dashboard/effects');
await page.getByRole('navigation',{name:'Effect categories'}).waitFor();
for(const category of ['Background','Overlays','Text','Card','Pointer & sound']) {
 await page.getByRole('navigation',{name:'Effect categories'}).getByRole('button',{name:category,exact:true}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${category} mobile overflow`);
}
await page.screenshot({path:'.tmp/pointer-mobile.png',fullPage:true});
await page.evaluate(()=>location.hash='#/dashboard/home');await page.locator('.tw-dash').waitFor();
await page.screenshot({path:'.tmp/dashboard-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Dashboard mobile overflow');
// The dashboard must apply the hydrated server document over an old local copy.
document = {
 ...(document || {}),
 about: {
  ...(document?.about || {}),
  displayName: 'Server newest',
  design: { ...(document?.about?.design || {}), avatarSize: 144 },
 },
};
await page.setViewportSize({width:1440,height:1000});
await page.evaluate(()=>localStorage.setItem('tourn.lol/about/v1/qa-user',JSON.stringify({displayName:'Old local',design:{avatarSize:40}})));
await page.evaluate(()=>location.hash='#/dashboard/layout');
await page.reload();
await page.locator('.tw-dash').waitFor();
const avatarSize=page.getByRole('slider',{name:'Avatar size',exact:true});
await avatarSize.waitFor();
assert.equal(await avatarSize.inputValue(),'144','Dashboard kept the old local card size instead of the hydrated server size');
console.log('PASS dashboard applies hydrated server profile over old local draft');
} finally { await browser.close(); }
