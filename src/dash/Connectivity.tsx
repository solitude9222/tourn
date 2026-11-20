import {useEffect,useState} from 'react';
import {useDash} from './context';
import {Button} from './ui';
export function Connectivity(){const [online,setOnline]=useState(navigator.onLine),{save,publishStatus}=useDash();useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);if(online&&publishStatus!=='retrying')return null;return <aside className="tw-connectivity" role="status"><span>{online?'Changes are waiting to sync.':'You are offline. Your local draft is retained.'}</span><Button disabled={!online} onClick={save}>Retry save</Button></aside>;}
