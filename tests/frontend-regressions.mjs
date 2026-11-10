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
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const account={id:'qa-user',username:'reviewer',email:null,avatarUrl:null,joinedAt:'2026-01-01',premium:true};
let document=null; const writes=[]; let failWrites=false; let failReads=false; let readDelay=0;
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.startsWith('/api/')) {
  if(url.pathname==='/api/auth/me') return route.fulfill({json:{account}});
  if(url.pathname==='/api/profile' && route.request().method()==='PUT') {
   const body=route.request().postDataJSON(); writes.push(body);
   if(failWrites) return route.fulfill({status:503,json:{error:'Offline test'}});
   document=body.data;return route.fulfill({json:{ok:true}});
  }
  if(url.pathname==='/api/profile') {if(failReads) return route.fulfill({status:503,json:{error:'Read unavailable'}}); if(readDelay) await new Promise(r=>setTimeout(r,readDelay)); return route.fulfill({json:{account,profile:document,earned:[]}});}
  if(url.pathname==='/api/profiles/owner')return route.fulfill({json:{owner:null}});
  return route.fulfill({json:{users:0,views:0,count:0,accounts:[]}});
 }
 if(url.origin!=='http://127.0.0.1:5180')return route.abort();
 return route.continue();
});
await page.goto('http://127.0.0.1:5180/');
await page.getByRole('heading',{name:'tourn.lol',exact:true}).waitFor();
await page.screenshot({path:'.tmp/home-desktop.png',fullPage:true});
await page.evaluate(()=>location.hash='#/dashboard');
await page.locator('.tw-dash').waitFor();
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
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tourn.lol/pending-profile/v1/qa-user')||'null')?.links.links[0]?.label==='My community');
await page.waitForTimeout(1000);
assert(writes.some(w=>w.data.links.links[0]?.label==='My community'),'Link was not sent');
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
await page.waitForTimeout(1000);
assert.equal(document.widgets.widgets.length,1);
await page.reload();await page.locator('.tw-dash').waitFor();
await nav('Widgets');
assert.equal(await page.locator('.tw-widget-row').count(),1);
console.log('PASS widget add and refresh');
// Explicitly deleting the last link must not resurrect an old local section.
await nav('Social Links');
await page.getByRole('button',{name:'Delete My community',exact:true}).click();
await page.waitForTimeout(1200);
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
await page.screenshot({path:'.tmp/dashboard-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Dashboard mobile overflow');
} finally { await browser.close(); }
