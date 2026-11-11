import {chromium} from 'playwright-core';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',route=>route.fulfill({status:401,json:{error:'Local fixture'}}));await page.goto('http://127.0.0.1:5180/');
await page.evaluate(async()=>{const React=(await import('/node_modules/.vite/deps/react.js')).default;const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=dom.createRoot||dom.default.createRoot;const {LinkerPreview}=await import('/src/components/LinkerPreview.tsx');const {normalizeAbout,createProfileSection}=await import('/src/lib/about.ts');const {normalizeWidgetStore,createWidgetInstance,WIDGET_PLATFORM_BY_ID}=await import('/src/lib/widgets.ts');const {normalizeLinkStore}=await import('/src/lib/links.ts');const {normalizeBadgeStore}=await import('/src/lib/badges.ts');const host=document.createElement('div');host.id='upgrade-qa';host.style.cssText='position:fixed;inset:0;z-index:999999;background:#000;overflow:auto';document.body.append(host);const root=createRoot(host);let about=normalizeAbout({displayName:'Layout preview',bio:'Compact cards, centred links and clear surfaces.',design:{version:2,layout:'stacked',sectionsEnabled:true,slideshow:true,skills:['lua','typescript','react'],sections:[{...createProfileSection(),title:'About me',text:'A vertical slideshow with smooth scrolling.'},{...createProfileSection('project'),title:'Example project',stack:['lua','react']},{...createProfileSection('anime'),title:'Anime'}]},assets:{card:{id:'edgeGlow',color:'#00ff44',intensity:80,speed:4}}});let widgets=normalizeWidgetStore({widgets:[{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('github')),id:'one',content:'one',options:{}},{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('discord')),id:'two',content:'two',options:{}},{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('github')),id:'three',content:'three',options:{}}],design:{backgroundOpacity:0,artOpacity:0,scrimOpacity:0}});const links=normalizeLinkStore({links:[{id:'x',platform:'github',url:'https://github.com',visible:true},{id:'site',platform:'website',url:'https://example.com',visible:true}],design:{glow:true,glowColor:'#ff00aa',glowIntensity:90}});window.renderUpgrade=patch=>{about={...about,design:{...about.design,...patch}};root.render(React.createElement(LinkerPreview,{user:{id:'qa',username:'preview',avatarUrl:null},about,widgets,links,badges:normalizeBadgeStore({}),interactive:true,showEntry:false,showMetadata:false}));};window.renderTwoUpPlain=()=>{const plain=normalizeWidgetStore({widgets:[{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('github')),id:'plain-one',content:'one',options:{}},{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('discord')),id:'plain-two',content:'two',options:{}},{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('github')),id:'plain-three',content:'three',options:{}}],design:{backgroundOpacity:0,artOpacity:0,scrimOpacity:0}});root.render(React.createElement(LinkerPreview,{user:{id:'qa',username:'preview',avatarUrl:null},about:{...about,design:{...about.design,layout:'left',cardStyle:'compact',cardWidth:480}},widgets:plain,links,badges:normalizeBadgeStore({}),interactive:true,showEntry:false,showMetadata:false}));};window.renderUpgrade({});});
await page.locator('#upgrade-qa .widget-card').first().waitFor();
for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);const geometry=await page.locator('#upgrade-qa .lkr-widgets').evaluate(el=>{const [a,b,c]=[...el.children].map(item=>item.getBoundingClientRect());return {sameRow:Math.abs(a.top-b.top)<2,half:Math.abs(a.width-b.width)<2,sameWidth:Math.abs(a.width-c.width)<2,overflow:el.scrollWidth>el.clientWidth+1};});assert(geometry.sameRow&&geometry.half&&geometry.sameWidth&&!geometry.overflow,JSON.stringify({width,...geometry}));}
assert.equal(await page.locator('#upgrade-qa .lkr-skills-section .lkr-tech').count(),3);
assert.equal(await page.locator('#upgrade-qa .widget-card').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
assert.equal(await page.locator('#upgrade-qa .widget-card-art').count(),0);
assert.equal(await page.locator('#upgrade-qa .pv-link-icons').evaluate(el=>getComputedStyle(el).justifyContent),'center');
const slideshow=page.locator('#upgrade-qa .lkr-slideshow');assert.equal(await slideshow.count(),1);await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(160);
const slideshowGeometry=await slideshow.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,scrollbar:getComputedStyle(el).scrollbarWidth}));assert(slideshowGeometry.width>1200&&slideshowGeometry.height>900&&slideshowGeometry.scrollbar==='none',JSON.stringify(slideshowGeometry));
const firstSlide=await page.evaluate(()=>{const flow=document.querySelector('#upgrade-qa .lkr-slideshow');const first=flow?.firstElementChild;const card=first?.querySelector('.profile-preview');if(!flow||!first||!card)return null;flow.scrollTop=0;const f=flow.getBoundingClientRect();const c=card.getBoundingClientRect();return {cardTop:Math.round(c.top-f.top),cardBottom:Math.round(c.bottom-f.top),flowHeight:Math.round(f.height),slideHeight:Math.round(first.getBoundingClientRect().height)};});assert(firstSlide&&firstSlide.cardTop>=0&&firstSlide.cardTop<firstSlide.flowHeight&&firstSlide.cardBottom>0,'First slideshow slide does not show the profile card: '+JSON.stringify(firstSlide));assert(firstSlide.slideHeight<=firstSlide.flowHeight+2,'Slides are taller than the slideshow viewport: '+JSON.stringify(firstSlide));
await page.setViewportSize({width:900,height:420});await page.waitForTimeout(160);const shortSlide=await page.evaluate(()=>{const flow=document.querySelector('#upgrade-qa .lkr-slideshow');const first=flow?.firstElementChild;const card=first?.querySelector('.profile-preview');if(!flow||!first||!card)return null;const f=flow.getBoundingClientRect();const c=card.getBoundingClientRect();return {cardTop:Math.round(c.top-f.top),flowHeight:Math.round(f.height),slideHeight:Math.round(first.getBoundingClientRect().height)};});assert(shortSlide&&shortSlide.cardTop>=0&&shortSlide.cardTop<shortSlide.flowHeight,'Short slideshow clips the first card out of view: '+JSON.stringify(shortSlide));await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(160);
await slideshow.evaluate(el=>el.scrollTop=600);assert((await slideshow.evaluate(el=>el.scrollTop))>0);
const slideDots=page.locator('#upgrade-qa .lkr-slide-dots .lkr-slide-dot');assert.equal(await slideDots.count(),4);
const dotGeometry=await page.locator('#upgrade-qa .lkr-slide-dots').evaluate(el=>{const r=el.getBoundingClientRect();return {centerRight:r.left>innerWidth/2,vertical:Math.abs(r.top+r.height/2-innerHeight/2)<40};});assert(dotGeometry.centerRight&&dotGeometry.vertical,JSON.stringify(dotGeometry));
await slideshow.evaluate(el=>{el.scrollTop=0;el.style.scrollBehavior='auto';});await slideDots.nth(1).click();await page.waitForTimeout(700);assert((await slideshow.evaluate(el=>el.scrollTop))>200,'Slideshow dot did not scroll to its slide');await slideshow.evaluate(el=>{el.style.scrollBehavior='';});
const glow=await page.locator('#upgrade-qa .pv-link-icons').evaluate(el=>{const icon=el.querySelector('.pv-link-icon');const glyph=icon.querySelector('svg, img');return {color:getComputedStyle(el).getPropertyValue('--lnk-glow').trim(),plate:getComputedStyle(icon,'::before').backgroundImage,glyphFilter:glyph?getComputedStyle(glyph).filter:'',iconFilter:getComputedStyle(icon).filter};});assert.equal(glow.color,'#ff00aa');assert(glow.glyphFilter.includes('170'),'Glow does not follow the glyph silhouette: '+JSON.stringify(glow));assert.equal(glow.plate,'none','A circular glow plate is still painted behind the icon');assert.equal(glow.iconFilter,'none','Link glow is still filtering the brand glyph');
assert((await page.locator('#upgrade-qa .pv-link-icon img').getAttribute('src')).includes('favicons'),'Website link did not resolve a favicon');
await page.setViewportSize({width:1440,height:1000});
for(const layout of ['left','centered']){await page.evaluate(value=>window.renderUpgrade({layout:value}),layout);await page.waitForTimeout(180);const compactLayout=await page.locator('#upgrade-qa .lkr-widgets').evaluate(el=>{const [a,b,c]=[...el.children].map(item=>item.getBoundingClientRect());const title=el.querySelector('.widget-card .widget-card-name b');return{sameRow:Math.abs(a.top-b.top)<2,half:Math.abs(a.width-b.width)<2,sameWidth:Math.abs(a.width-c.width)<2,titleSize:title?parseFloat(getComputedStyle(title).fontSize):0,overflow:el.scrollWidth>el.clientWidth+1};});assert(compactLayout.sameRow&&compactLayout.half&&compactLayout.sameWidth&&!compactLayout.overflow,JSON.stringify({layout,...compactLayout}));assert(compactLayout.titleSize>=15,JSON.stringify({layout,...compactLayout}));assert.equal(await page.locator('#upgrade-qa .profile-preview .lkr-widgets').count(),1,`${layout} widgets render inside the profile card`);assert.equal(await page.locator('#upgrade-qa .lkr-side .lkr-widgets').count(),0,`${layout} widgets do not render in the side rail`);}
await page.evaluate(()=>window.renderTwoUpPlain());await page.waitForTimeout(180);
for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);const compactPlain=await page.locator('#upgrade-qa .lkr-widgets').evaluate(el=>{const [a,b,c]=[...el.children].map(item=>item.getBoundingClientRect());return{sameRow:Math.abs(a.top-b.top)<2,half:Math.abs(a.width-b.width)<2,sameWidth:Math.abs(a.width-c.width)<2,columns:getComputedStyle(el).gridTemplateColumns,overflow:el.scrollWidth>el.clientWidth+1};});assert(compactPlain.sameRow&&compactPlain.half&&compactPlain.sameWidth&&!compactPlain.overflow,JSON.stringify({width,...compactPlain}));}
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'.tmp/compact-left.png'});
await page.evaluate(()=>window.renderUpgrade({sectionsEnabled:false,slideshow:false}));await page.waitForTimeout(100);assert.equal(await page.locator('#upgrade-qa .lkr-skills-section').count(),1,'Skills disappear when sections are off');assert.equal(await page.locator('#upgrade-qa .lkr-custom-section').count(),0);assert.equal(await page.locator('#upgrade-qa .lkr-slideshow').count(),0);
await page.evaluate(()=>window.renderUpgrade({sectionsEnabled:false,slideshow:true}));await page.waitForTimeout(160);assert.equal(await page.locator('#upgrade-qa .lkr-skills-section').count(),1);assert.equal(await page.locator('#upgrade-qa .lkr-slideshow').count(),1);assert.equal(await page.locator('#upgrade-qa .lkr-slide').count(),2);
await page.evaluate(()=>window.renderUpgrade({sectionsEnabled:true,slideshow:false,layout:'stacked'}));await page.waitForTimeout(120);assert.equal(await page.locator('#upgrade-qa .lkr-skills-section').count(),1,'Skills disappear when the slideshow is off');assert.equal(await page.locator('#upgrade-qa .lkr-slideshow').count(),0);await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'.tmp/compact-widget-upgrade.png'});
const migration=await page.evaluate(async()=>{const {normalizeAbout}=await import('/src/lib/about.ts');return normalizeAbout({design:{version:1,backgroundOpacity:0,backgroundBlur:17,avatarSize:92,cardPadding:14,nameSize:25,pfpPosition:'right',colors:{accent:'#ff00ff',card:'#123456'}}}).design;});assert.equal(migration.backgroundOpacity,0);assert.equal(migration.backgroundBlur,17);assert.equal(migration.avatarSize,92);assert.equal(migration.cardPadding,14);assert.equal(migration.nameSize,25);assert.equal(migration.pfpPosition,'right');assert.equal(migration.colors.card,'#123456');console.log('PASS older saved customisation values survive release migration');
await page.evaluate(async()=>{const {normalizeDocument,savePendingDocument,loadPendingDocumentDurable}=await import('/src/lib/serverProfile.ts');const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.includes('pending-profile'))throw new DOMException('Quota exceeded','QuotaExceededError');return original.call(this,key,value);};const doc=normalizeDocument({about:{displayName:'Durable upload',assets:{background:{style:'image',imageUrl:'data:image/png;base64,'+'a'.repeat(700000)}}},widgets:{widgets:[{id:'saved-widget',platform:'discord',content:'keep-me',options:{}}]}});savePendingDocument('quota-test',doc,9,doc);await loadPendingDocumentDurable('quota-test');Storage.prototype.setItem=original;});
await page.reload();const recovered=await page.evaluate(async()=>{const {loadPendingDocumentDurable,clearPendingDocument}=await import('/src/lib/serverProfile.ts');const result=await loadPendingDocumentDurable('quota-test');clearPendingDocument('quota-test');return {name:result?.document.about.displayName,image:result?.document.about.assets.background.imageUrl.length,widget:result?.document.widgets.widgets[0]?.content,revision:result?.baseRevision};});assert.equal(recovered.name,'Durable upload');assert(recovered.image>700000);assert.equal(recovered.widget,'keep-me');assert.equal(recovered.revision,9);console.log('PASS uploaded-artwork draft survives reload when localStorage quota is exhausted');
// Entry images can fill the entry screen, and the new exit styles render.
const entryCheck=await page.evaluate(async()=>{
 const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default||ReactModule;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=dom.createRoot||dom.default.createRoot;
 const {EntryOverlay}=await import('/src/components/LinkerPreview.tsx');
 const {normalizeAbout}=await import('/src/lib/about.ts');
 const host=document.createElement('div');host.id='entry-check';host.style.cssText='position:fixed;inset:0;z-index:999999;background:#000';document.body.append(host);
 const root=createRoot(host);
 const about=normalizeAbout({displayName:'Entry',design:{entry:{enabled:true,title:'Welcome',imageUrl:'https://example.com/entry.jpg',imageMode:'background',animation:'blur'}}});
 root.render(React.createElement(EntryOverlay,{about,onEnter:()=>undefined,preview:true}));
 await new Promise(r=>setTimeout(r,80));
 const bg=host.querySelector('.lkr-entry-bg-image');
 const result={visual:host.querySelectorAll('.lkr-entry-visual').length,background:bg?getComputedStyle(bg).backgroundImage:'',animation:host.querySelector('.lkr-entry')?.className||''};
 root.unmount();host.remove();return result;
});
assert.equal(entryCheck.visual,0,'Entry image still renders as a small framed image');
assert(entryCheck.background.includes('entry.jpg'),JSON.stringify(entryCheck));
assert(entryCheck.animation.includes('lkr-entry--blur'),JSON.stringify(entryCheck));
// Discord invite widgets resolve a pop-out URL instead of a dead card.
const widgetPopout=await page.evaluate(async()=>{
 const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default||ReactModule;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=dom.createRoot||dom.default.createRoot;
 const {WidgetCard}=await import('/src/components/WidgetCard.tsx');
 const {normalizeWidgetStore,createWidgetInstance,WIDGET_PLATFORM_BY_ID}=await import('/src/lib/widgets.ts');
 const host=document.createElement('div');host.id='popout-check';host.style.cssText='position:fixed;inset:0;z-index:999999;background:#000';document.body.append(host);
 const root=createRoot(host);
 const store=normalizeWidgetStore({widgets:[{...createWidgetInstance(WIDGET_PLATFORM_BY_ID.get('discord')),id:'pop',content:'https://discord.gg/opia',options:{}}]});
 root.render(React.createElement(WidgetCard,{widget:store.widgets[0],design:store.design}));
 await new Promise(r=>setTimeout(r,120));
 const link=host.querySelector('.widget-card-popout');
 const result={href:link?.getAttribute('href')||'',target:link?.getAttribute('target')||'',label:link?.getAttribute('aria-label')||''};
 root.unmount();host.remove();return result;
});
assert.equal(widgetPopout.href,'https://discord.gg/opia');
assert.equal(widgetPopout.target,'_blank');
assert(widgetPopout.label.includes('Discord'),JSON.stringify(widgetPopout));
// The position studio has presets, a Preview/Dropdowns switch and drag placement.
const positionStudio=await page.evaluate(async()=>{
 const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default||ReactModule;
 const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=dom.createRoot||dom.default.createRoot;
 const {PositionStudio}=await import('/src/dash/PositionStudio.tsx');
 const host=document.createElement('div');host.id='position-studio-check';host.style.cssText='position:fixed;inset:0;z-index:999999;background:#000';document.body.append(host);
 const root=createRoot(host);
 let latest={viewPosition:'footer',locationPosition:'under-name',joinPosition:'under-name'};
 function Harness(){
  const [positions,setPositions]=React.useState(latest);
  latest=positions;
  return React.createElement(PositionStudio,{...positions,onChange:(patch)=>setPositions(current=>{latest={...current,...patch};return latest;})});
 }
 root.render(React.createElement(Harness));
 await new Promise(r=>setTimeout(r,100));
 const modeButtons=[...host.querySelectorAll('.pos-studio-modes button')];
 const previewVisible=Boolean(host.querySelector('.pos-studio-canvas'));
 modeButtons[1].click();
 await new Promise(r=>setTimeout(r,60));
 const dropdownsVisible=Boolean(host.querySelector('.pos-studio .tw-form-grid'));
 modeButtons[0].click();
 await new Promise(r=>setTimeout(r,60));
 const corners=[...host.querySelectorAll('.pos-studio-presets button')].find((button)=>button.textContent==='Corners');
 corners.click();
 await new Promise(r=>setTimeout(r,60));
 const afterPreset={...latest};
 const chip=[...host.querySelectorAll('.pos-chip')].find((element)=>element.textContent?.startsWith('Views'));
 const zone=host.querySelector('[data-position="inside-top-right"]');
 const transfer=new DataTransfer();
 chip.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 await new Promise(r=>setTimeout(r,80));
 const afterDrag={...latest};
 const scaffoldVisible=Boolean(host.querySelector('.pos-studio-card .pos-scaffold'));
 const outsideCount=host.querySelectorAll('.pos-outside-layer .pos-zone').length;
 const cornerCount=host.querySelectorAll('.pos-corner-layer .pos-zone').length;
 const slotCount=host.querySelectorAll('.pos-slot-grid .pos-zone').length;
 const binCount=host.querySelectorAll('.pos-bin .pos-zone').length;
 const result={previewVisible,dropdownsVisible,afterPreset,afterDrag,scaffoldVisible,outsideCount,cornerCount,slotCount,binCount};
 root.unmount();host.remove();return result;
});
assert(positionStudio.previewVisible,'Position preview is missing');
assert(positionStudio.dropdownsVisible,'Position dropdown mode is missing');
assert(positionStudio.scaffoldVisible,'Position preview is missing the scaffolded card');
assert.equal(positionStudio.outsideCount,8,'Outside slots are missing from the position preview');
assert.equal(positionStudio.cornerCount,4,'Inside corner slots are missing from the position preview');
assert.equal(positionStudio.slotCount,10,'Card slots are missing from the position preview');
assert.equal(positionStudio.binCount,1,'Hidden bin is missing from the position preview');
assert.equal(positionStudio.afterPreset.viewPosition,'inside-bottom-right');
assert.equal(positionStudio.afterPreset.locationPosition,'inside-top-left');
assert.equal(positionStudio.afterPreset.joinPosition,'inside-bottom-left');
assert.equal(positionStudio.afterDrag.viewPosition,'inside-top-right','Dragging a detail did not change its position');
console.log('PASS entry background, widget pop-out and position studio');
assert.deepEqual(errors,[]);console.log('PASS desktop/mobile two-column widget sizing, left/centered widget sizing, equal-width widgets, truly transparent surface, centred links, section skill visibility and vertical slideshow');
}finally{await browser.close();}
