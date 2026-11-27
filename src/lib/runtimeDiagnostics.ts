/** Session-only diagnostics: no messages, stacks, aliases, URLs or profile content. */
export type RuntimeEvent={kind:'error'|'rejection'|'route';route:string;release:string;at:string;milliseconds?:number};
const key='tourn/runtime-diagnostics';
export function diagnostics():RuntimeEvent[]{try{const value=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(item=>item&&['error','rejection','route'].includes(item.kind)&&typeof item.route==='string'&&typeof item.release==='string'&&typeof item.at==='string').slice(-100):[];}catch{return [];}}
export function clearDiagnostics(){try{sessionStorage.removeItem(key);}catch{}}
function routeName(){const hash=location.hash.split('?')[0];if(hash.startsWith('#/dashboard/'))return '/dashboard';return ['#/home','#/leaderboard','#/contact','#/marketplace','#/privacy','#/terms'].includes(hash)?hash.slice(1):'public-profile';}
function record(kind:RuntimeEvent['kind'],milliseconds?:number){try{const entry:RuntimeEvent={kind,route:routeName(),release:import.meta.env.VITE_RELEASE||'development',at:new Date().toISOString(),...(milliseconds===undefined?{}:{milliseconds:Math.round(milliseconds)})};sessionStorage.setItem(key,JSON.stringify([...diagnostics(),entry].slice(-100)));window.dispatchEvent(new Event('tourn:diagnostics'));}catch{}}
if(typeof window!=='undefined'){
 window.addEventListener('error',()=>record('error'));
 window.addEventListener('unhandledrejection',()=>record('rejection'));
 window.addEventListener('hashchange',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>record('route',performance.now()-start)));});
}
