import {useEffect,useRef,useState} from 'react';
const prefix='tourn/preferences/';
function read<T>(key:string,initial:T):T{try{const saved=JSON.parse(localStorage.getItem(prefix+key)||'null');return saved!==null&&typeof saved===typeof initial&&Array.isArray(saved)===Array.isArray(initial)?saved as T:initial;}catch{return initial;}}
/** Account-scoped callers supply their account ID in the key. Updates synchronize every open control. */
export function usePreference<T>(key:string,initial:T){
 const initialRef=useRef(initial);initialRef.current=initial;
 const [state,setState]=useState(()=>({key,value:read(key,initial)}));
 const current=state.key===key?state.value:read(key,initial);
 const ref=useRef({key,value:current});ref.current={key,value:current};
 useEffect(()=>{const sync=(event?:Event)=>{if(event instanceof CustomEvent&&event.detail!==key)return;if(event instanceof StorageEvent&&event.key&&event.key!==prefix+key)return;const value=read(key,initialRef.current);ref.current={key,value};setState({key,value});};sync();window.addEventListener('storage',sync);window.addEventListener('tourn:preference',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('tourn:preference',sync);};},[key]);
 const update=(next:T|((current:T)=>T))=>{const previous=ref.current.key===key?ref.current.value:read(key,initialRef.current);const value=typeof next==='function'?(next as (current:T)=>T)(previous):next;ref.current={key,value};setState({key,value});try{localStorage.setItem(prefix+key,JSON.stringify(value));window.dispatchEvent(new CustomEvent('tourn:preference',{detail:key}));}catch{/* Optional browser preferences never block editing. */}};
 return [current,update] as const;
}
