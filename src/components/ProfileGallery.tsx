import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { GallerySettings } from "../lib/gallery";
import "../profileGallery.css";

export function ProfileGallery({ settings }: { settings: GallerySettings }) {
  const [selected,setSelected]=useState<number|null>(null);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const track=useRef<HTMLDivElement>(null);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(selected!==null && dialog.current && !dialog.current.open)dialog.current.showModal();},[selected]);
  if(!settings.enabled||!settings.items.length)return null;
  const current=selected===null?null:settings.items[selected];
  const move=(delta:number)=>setSelected(index=>index===null?null:(index+delta+settings.items.length)%settings.items.length);
  return <section className="lkr-gallery" style={{"--gallery-columns":settings.columns,"--gallery-gap":`${settings.gap}px`,"--gallery-radius":`${settings.radius}px`} as CSSProperties}>
    <header><h2>{settings.title||"Gallery"}</h2>{settings.subtitle?<p>{settings.subtitle}</p>:null}</header>
    {(settings.layout==='carousel'||settings.layout==='filmstrip')?<nav className="profile-gallery-navigation" aria-label="Gallery navigation"><button type="button" aria-label="Previous gallery page" onClick={()=>track.current?.scrollBy({left:-track.current.clientWidth,behavior:reduced?'instant':'smooth'})}>←</button><button type="button" aria-label="Next gallery page" onClick={()=>track.current?.scrollBy({left:track.current.clientWidth,behavior:reduced?'instant':'smooth'})}>→</button></nav>:null}
    <div ref={track} className={`lkr-gallery-grid is-${settings.layout} is-${settings.shape} captions-${settings.captions}${settings.zoom?" has-zoom":""}`}>{settings.items.map((item,index)=><button type="button" className="lkr-gallery-tile" key={item.id} aria-label={item.caption||`Open gallery item ${index+1}`} onClick={()=>{if(settings.lightbox)setSelected(index);}}>
      {item.kind==="video"?<video src={item.url} muted loop playsInline autoPlay={settings.autoplay&&!reduced} controls={!settings.lightbox} preload="metadata"/>:<img src={item.url} alt={item.caption} loading="lazy" decoding="async"/>}{item.caption?<span>{item.caption}</span>:null}
    </button>)}</div>
    <dialog ref={dialog} className="lkr-gallery-dialog" onClose={()=>setSelected(null)} onCancel={()=>setSelected(null)} onClick={event=>{if(event.target===event.currentTarget){dialog.current?.close();}}} onKeyDown={event=>{if(event.key==="ArrowLeft")move(-1);if(event.key==="ArrowRight")move(1);}}>
      <button className="lkr-gallery-close" type="button" aria-label="Close gallery" onClick={()=>dialog.current?.close()}>×</button>
      {current?<div className="lkr-gallery-full">{current.kind==="video"?<video key={current.id} src={current.url} controls autoPlay={!reduced} playsInline/>:<img src={current.url} alt={current.caption}/>}<p>{current.caption}</p><div><button type="button" aria-label="Previous gallery item" onClick={()=>move(-1)}>←</button><span>{(selected??0)+1} / {settings.items.length}</span><button type="button" aria-label="Next gallery item" onClick={()=>move(1)}>→</button></div></div>:null}
    </dialog>
  </section>;
}
