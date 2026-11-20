import {useEffect,useState} from 'react';

export function useEffectsVisible(host:HTMLElement|null,enabled=true){const[visible,setVisible]=useState(true);useEffect(()=>{if(!enabled||!host){setVisible(true);return;}let intersecting=true;const sync=()=>setVisible(intersecting&&!document.hidden);const observer=new IntersectionObserver(entries=>{intersecting=entries[0]?.isIntersecting??true;sync();});observer.observe(host);document.addEventListener('visibilitychange',sync);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);};},[host,enabled]);return visible;}

