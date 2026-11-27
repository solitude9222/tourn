import {useLayoutEffect} from 'react';
import type {Page,ProfileTab} from './context';
import {matchesSetting} from './search';

export function rememberSettingQuery(query:string){try{sessionStorage.setItem('tourn/setting-query',query);}catch{/* optional */}}
/** Restore each editor's reading position without fighting an intentional scroll. */
export function useWorkspaceScroll(page:Page,tab:ProfileTab,userId?:string){
 useLayoutEffect(()=>{
  if(!userId)return;
  const main=document.querySelector<HTMLElement>('.tw-main');if(!main)return;
  const key=`tourn/scroll/${userId}/${page}/${tab}`;
  let offset=0,query='';try{offset=Math.max(0,Number(sessionStorage.getItem(key))||0);query=sessionStorage.getItem('tourn/setting-query')||'';sessionStorage.removeItem('tourn/setting-query');}catch{/* optional */}
  let frame=0,stopped=false,highlight:HTMLElement|null=null;
  const section=new URLSearchParams(location.hash.split('?')[1]).get('section');
  const restore=()=>{if(stopped)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   if(section){document.getElementById(`dash-section-${section}`)?.scrollIntoView({block:'start'});return;}
   if(query){const candidates=Array.from(main.querySelectorAll<HTMLElement>('.tw-field,.tw-slider,.tw-inline-toggle,.tw-card'));const match=candidates.find(node=>matchesSetting(node.querySelector('.tw-label,.tw-slider-head,b,h2')?.textContent||'',query));if(match){highlight=match;match.classList.add('workspace-search-highlight');match.scrollIntoView({block:'center',behavior:'instant'});stopped=true;}return;}
   main.scrollTop=offset;
  });};
  const stop=()=>{stopped=true;};
  const observer=new MutationObserver(restore);observer.observe(main,{childList:true,subtree:true});
  main.addEventListener('wheel',stop,{passive:true});main.addEventListener('touchstart',stop,{passive:true});
  restore();const timer=setTimeout(()=>{observer.disconnect();highlight?.classList.remove('workspace-search-highlight');},3000);
  return()=>{try{sessionStorage.setItem(key,String(main.scrollTop));}catch{/* optional */}stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();highlight?.classList.remove('workspace-search-highlight');main.removeEventListener('wheel',stop);main.removeEventListener('touchstart',stop);};
 },[page,tab,userId]);
}
