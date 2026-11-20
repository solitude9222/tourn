import {useEffect,useState} from 'react';
import {usePreference} from './preferences';
import {contrast} from '../lib/studioOptions';

type Palette={name:string;colors:string[]};
const valid=(value:string)=>/^#[0-9a-f]{6}$/i.test(value);
export function ColorTools({value,initial,onChoose}:{value:string;initial:string;onChoose:(value:string)=>void}){
 const [recent,setRecent]=usePreference<string[]>('recent-colours',[]);
 const [palettes,setPalettes]=usePreference<Palette[]>('colour-palettes',[]);
 const [name,setName]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>{if(valid(value))setRecent(old=>[value.toUpperCase(),...old.filter(c=>c.toLowerCase()!==value.toLowerCase())].slice(0,12));},450);return()=>clearTimeout(timer);},[value]);
 const pick=(color:string)=>{if(valid(color)){onChoose(color);setMessage('Colour applied.');}};
 const swatches=(colors:string[])=>colors.filter(valid).map(color=><button key={color} type="button" className="tw-palette-swatch" style={{background:color}} aria-label={`Use ${color}`} title={color} onClick={()=>pick(color)}/>);
 return <details className="tw-colour-tools"><summary>Colour tools</summary><div className="tw-colour-tools-body">
 <div className="tw-colour-compare"><span style={{background:initial,color:contrast(initial,"#ffffff")<4.5?"#101014":"#ffffff",textShadow:"none"}}>Before</span><span style={{background:value,color:contrast(value,"#ffffff")<4.5?"#101014":"#ffffff",textShadow:"none"}}>Current</span></div>
 <small>Contrast on #101014: {contrast(value,'#101014').toFixed(2)}:1. Small text needs 4.5:1.</small>
 <div className="tw-colour-actions"><button type="button" onClick={()=>void navigator.clipboard.writeText(value).then(()=>setMessage('Hex copied.')).catch(()=>setMessage('Copy unavailable. Select the hex text instead.'))}>Copy hex</button><button type="button" onClick={()=>void navigator.clipboard.readText().then(text=>{if(valid(text.trim()))pick(text.trim());else setMessage('Paste a six-digit hex colour, for example #4477FF.');}).catch(()=>setMessage('Clipboard access unavailable. Paste into the hex field.'))}>Paste hex</button><button type="button" onClick={()=>pick(initial)}>Revert colour</button></div>
 <b>Recent colours</b><div className="tw-palette-swatches">{swatches(recent)}</div>
 <label>Palette name<input value={name} maxLength={40} onChange={e=>setName(e.target.value)} placeholder="My palette"/></label><button type="button" disabled={!name.trim()||!recent.length} onClick={()=>{setPalettes(old=>[{name:name.trim(),colors:recent},...old.filter(p=>p.name!==name.trim())].slice(0,12));setName('');setMessage('Palette saved in this browser.');}}>Save recent colours as palette</button>
 {palettes.filter(p=>p&&typeof p.name==='string'&&Array.isArray(p.colors)).map(p=><div key={p.name}><div className="tw-colour-actions"><b>{p.name}</b><button type="button" aria-label={`Delete palette ${p.name}`} onClick={()=>setPalettes(old=>old.filter(x=>x.name!==p.name))}>Delete</button></div><div className="tw-palette-swatches">{swatches(p.colors)}</div></div>)}
 <small role="status">{message}</small></div></details>;
}
