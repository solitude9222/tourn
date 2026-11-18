// Badge art derived from Lucide (ISC). Rebuild with: node scripts/build-badge-icons.mjs
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source=await readFile('src/lib/badges.ts','utf8');
const entries=[...source.matchAll(/\{ id: "([^"]+)", name: "([^"]+)"[^\n]*group: "([^"]+)"[^\n]*color: "(#[a-fA-F0-9]+)"/g)];
const map={owner:'crown',staff:'wrench',helper:'life-buoy',premium:'star',verified:'badge-check',donator:'heart',gifter:'gift',og:'sprout',booster:'rocket',bughunter:'bug',user:'flame',partner:'handshake',coder:'terminal',newbie:'smile',developer:'code-xml',administrator:'shield-check','event-winner':'trophy','event-second':'medal','event-third':'award','beta-tester':'flask-conical',inviter:'users','server-tag':'tag',innovator:'lightbulb',orion:'orbit','the-million':'gem',halloween_2026:'ghost','christmas-2025':'snowflake',christmas_2026:'tree-pine','easter-2025':'egg',easter:'rabbit',autumn:'leaf',summer:'sun',dc_indiscord:'messages-square'};
const filled={
developer:'m7 4-7 8 7 8 3-3-5-5 5-5z M17 4l-3 3 5 5-5 5 3 3 7-8z',
staff:'M15 2a7 7 0 0 0-8 9L1 17a4 4 0 0 0 6 6l6-6a7 7 0 0 0 9-8l-5 5-4-4 5-5z M4 18a1.5 1.5 0 1 1 0 3 1.5 1.5 0 1 1 0-3',
booster:'M13 3c3-2 7-2 10-2 0 4 0 7-2 10l-7 7-8-8z M15 6a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0 M6 5l5-1-6 7-4 1z M19 14l-1 5-7 4 1-5z M5 14l5 5-8 3z',
bughunter:'M9 2h6l2 4 4-3 2 2-5 4v2h5v3h-5v2l5 4-2 2-4-3c-2 4-8 4-10 0l-4 3-2-2 5-4v-2H1v-3h5V9L1 5l2-2 4 3z M10 10v8h2v-8z',
owner:'M3 19 2 6l6 5 4-9 4 9 6-5-1 13z M3 21h18v2H3z',
premium:'m12 1 3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.5L5.2 22l1.3-7.5L1 9.1 8.6 8z',
administrator:'m12 1 10 4v7c0 5-5 9-10 11C7 21 2 17 2 12V5z M12 5v14c4-2 6-5 6-8V8z',
verified:'m12 1 3 2 4 .5.5 4L22 11l-2 3-.5 4-4 .5-3 2-3-2-4-.5-.5-4L2 11l2.5-3.5.5-4 4-.5z M6 11l4 4 8-8-2-2-6 6-2-2z',
donator:'M12 22 2 12C-4 3 6-3 12 5c6-8 16-2 10 7z',
'event-winner':'M6 2h12v4h5v4c0 4-3 6-7 6l-2 2v3h5v2H5v-2h5v-3l-2-2c-4 0-7-2-7-6V6h5z M3 8v2c0 2 1 3 4 4L6 8z M18 8l-1 6c3-1 4-2 4-4V8z',
'server-tag':'M2 2h11l10 10-11 11L2 13z M5 7a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
inviter:'M9 2a4 4 0 1 0 0 8 4 4 0 1 0 0-8 M19 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6 M1 21v-5c0-6 16-6 16 0v5z M19 13c5 0 5 5 5 8h-5z'
};
const base='https://raw.githubusercontent.com/lucide-icons/lucide/0.468.0/';
await mkdir('public/badges/v2/still',{recursive:true});
const license=await fetch(base+'LICENSE');if(!license.ok)throw Error('License download failed');await writeFile('public/badges/v2/LICENSE',await license.text());
const cache=new Map();
await Promise.all([...new Set(Object.values(map))].map(async name=>{const response=await fetch(base+'icons/'+name+'.svg');if(!response.ok)throw Error(name+': '+response.status);cache.set(name,await response.text());}));
for(const [,id,label,,color] of entries){
 const icon=map[id];if(!icon)throw Error('No badge icon mapping for '+id);
 let svg=cache.get(icon).replace(/width="24"/,'width="32"').replace(/height="24"/,'height="32"').replace('stroke="currentColor"','stroke="'+color+'"').replace('stroke-width="2"','stroke-width="2.2"');
 if(filled[id])svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="'+color+'" fill-rule="evenodd" d="'+filled[id]+'"/></svg>';
 const notice=filled[id]?'<!-- Original filled geometry and animation by Tourn. -->':'<!-- Derived from Lucide '+icon+'; ISC license: ./LICENSE. Motion by Tourn. -->';
 svg=svg.replace(/<svg([^>]*)>/,'<svg$1 role="img" aria-label="'+label+'"><title>'+label+'</title>');
 await writeFile('public/badges/v2/still/'+id+'.svg',notice+svg);
 let n=0;let animated=svg.replace(/<(path|line|polyline|polygon|circle|rect|ellipse)([^>]*?)\s*\/>/g,(_,tag,attrs)=>{const begin=((n++%5)*.1).toFixed(1);return '<'+tag+attrs+' pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" values="0;0;1;0;0" keyTimes="0;0.12;0.28;0.58;1" dur="3.8s" begin="'+begin+'s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.55;1;1" keyTimes="0;0.28;1" dur="3.8s" begin="'+begin+'s" repeatCount="indefinite"/></'+tag+'>';});
 if(filled[id])animated=animated.replace('</path>','<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.7;0 0" keyTimes="0;0.5;1" dur="3.2s" repeatCount="indefinite"/></path>');
 await writeFile('public/badges/v2/'+id+'.svg',notice+animated);
}
await writeFile('public/badges/v2/SOURCES.md','# Badge artwork\n\nFilled code, tools, rocket, bug, crown, star, shield, verification, heart, trophy, tag and community geometry: Tourn. Other static geometry: [Lucide](https://github.com/lucide-icons/lucide/tree/0.468.0), ISC license (included). Each icon source is named in its SVG comment. Animated variants add staggered SVG stroke drawing and opacity animation; they are not GIFs or a whole-icon CSS rotation. Reduced-motion users receive the still variants.\n');
console.log('Built '+entries.length+' animated badges and '+entries.length+' still variants.');
