// Badge art derived from Lucide (ISC). Rebuild with: node scripts/build-badge-icons.mjs
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source=await readFile('src/lib/badges.ts','utf8');
const entries=[...source.matchAll(/\{ id: "([^"]+)", name: "([^"]+)"[^\n]*group: "([^"]+)"[^\n]*color: "(#[a-fA-F0-9]+)"/g)];
const map={owner:'crown',staff:'wrench',helper:'life-buoy',premium:'star',verified:'badge-check',donator:'heart',gifter:'gift',og:'sprout',booster:'rocket',bughunter:'bug',user:'flame',partner:'handshake',coder:'terminal',newbie:'smile',developer:'code-xml',administrator:'shield-check','event-winner':'trophy','event-second':'medal','event-third':'award','beta-tester':'flask-conical',inviter:'users','server-tag':'tag',innovator:'lightbulb',orion:'orbit','the-million':'gem',halloween_2026:'ghost','christmas-2025':'snowflake',christmas_2026:'tree-pine','easter-2025':'egg',easter:'rabbit',autumn:'leaf',summer:'sun',dc_indiscord:'messages-square'};
const base='https://raw.githubusercontent.com/lucide-icons/lucide/0.468.0/';
await mkdir('public/badges/v2/still',{recursive:true});
const license=await fetch(base+'LICENSE');if(!license.ok)throw Error('License download failed');await writeFile('public/badges/v2/LICENSE',await license.text());
const cache=new Map();
await Promise.all([...new Set(Object.values(map))].map(async name=>{const response=await fetch(base+'icons/'+name+'.svg');if(!response.ok)throw Error(name+': '+response.status);cache.set(name,await response.text());}));
for(const [,id,label,,color] of entries){
 const icon=map[id];if(!icon)throw Error('No badge icon mapping for '+id);
 let svg=cache.get(icon).replace(/width="24"/,'width="32"').replace(/height="24"/,'height="32"').replace('stroke="currentColor"','stroke="'+color+'"').replace('stroke-width="2"','stroke-width="2.2"');
 const notice='<!-- Derived from Lucide '+icon+'; ISC license: ./LICENSE. Motion by Tourn. -->';
 svg=svg.replace(/<svg([^>]*)>/,'<svg$1 role="img" aria-label="'+label+'"><title>'+label+'</title>');
 await writeFile('public/badges/v2/still/'+id+'.svg',notice+svg);
 let n=0;const animated=svg.replace(/<(path|line|polyline|polygon|circle|rect|ellipse)([^>]*?)\s*\/>/g,(_,tag,attrs)=>{const begin=((n++%5)*.1).toFixed(1);return '<'+tag+attrs+' pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" values="0;0;1;0;0" keyTimes="0;0.12;0.28;0.58;1" dur="3.8s" begin="'+begin+'s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.55;1;1" keyTimes="0;0.28;1" dur="3.8s" begin="'+begin+'s" repeatCount="indefinite"/></'+tag+'>';});
 await writeFile('public/badges/v2/'+id+'.svg',notice+animated);
}
await writeFile('public/badges/v2/SOURCES.md','# Badge artwork\n\nStatic geometry: [Lucide](https://github.com/lucide-icons/lucide/tree/0.468.0), ISC license (included). Each icon source is named in its SVG comment. Animated variants add staggered SVG stroke drawing and opacity animation; they are not GIFs or a whole-icon CSS rotation. Reduced-motion users receive the still variants.\n');
console.log('Built '+entries.length+' animated badges and '+entries.length+' still variants.');
