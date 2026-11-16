import { useRef, useState } from "react";
import { useDash } from "../context";
import { DEFAULT_GALLERY, type GalleryItem, type GallerySettings } from "../../lib/gallery";
import { imageToDataUrl } from "../files";
import { uploadVideoFile } from "../../lib/videoUpload";
import { Button, Card, CardHead, Field, Select, Slider, TextInput, Toggle } from "../ui";

export function GalleryPage() {
  const { about, setAbout, notify } = useDash();
  const gallery = about.design.gallery || DEFAULT_GALLERY;
  const input = useRef<HTMLInputElement>(null);
  const galleryRef = useRef(gallery); galleryRef.current = gallery;
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [url, setUrl] = useState("");
  const update = (patch: Partial<GallerySettings>) => setAbout(current => ({ ...current, design: { ...current.design, ...(patch.enabled ? {slideshow:true,sectionsEnabled:true} : {}), gallery: { ...DEFAULT_GALLERY, ...current.design.gallery, ...patch } } }));
  const add = (item: GalleryItem) => {
    const current = galleryRef.current;
    if (current.items.length >= 24) { notify("Gallery full", "Remove an item before adding another. Maximum 24 items."); return; }
    if (current.items.some(entry => entry.url === item.url)) { notify("Already in the gallery", "This media is already added."); return; }
    if (current.items.reduce((total, entry) => total + entry.url.length, 0) + item.url.length > 5_000_000) { notify("Gallery storage limit", "Use smaller images or direct media URLs for this gallery."); return; }
    const next = { ...current, enabled: true, items: [...current.items, item] }; galleryRef.current = next;
    update(next);
  };
  const upload = async (files: File[]) => {
    setBusy(true);
    try { for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw new Error("Choose image or video files.");
      const kind = file.type.startsWith("video/") ? "video" : "image";
      const mediaUrl = kind === "video" ? await uploadVideoFile(file, setProgress) : await imageToDataUrl(file,1600,1600,.8);
      if (mediaUrl.length > 2_000_000) throw new Error("Resize this animation or use a direct URL. Each embedded image must be under 2 MB.");
      add({ id: crypto.randomUUID(), url: mediaUrl, caption: file.name.replace(/\.[^.]+$/, ""), kind });
    } } catch (error) { notify("Gallery upload", error instanceof Error ? error.message : "Try another file."); }
    finally { setBusy(false); }
  };
  const move = (index: number, direction: number) => { const items = [...gallery.items], next = index + direction; if (next < 0 || next >= items.length) return; [items[index],items[next]]=[items[next],items[index]]; update({ items }); };
  return <div className="tw-studio-page"><Card><CardHead icon="image" title="Gallery" subtitle="Images and videos from uploads or direct media URLs." /><div className="tw-form-grid">
    <Field label="Section title"><TextInput value={gallery.title} maxLength={100} onChange={event => update({title:event.target.value})} /></Field><Field label="Subtitle"><TextInput value={gallery.subtitle} maxLength={180} onChange={event => update({subtitle:event.target.value})} /></Field>
  </div><Field label="Layout"><div className="tw-gallery-layouts">{(["grid","masonry","carousel","filmstrip"] as const).map(layout => <button type="button" key={layout} aria-pressed={layout===gallery.layout} onClick={()=>update({layout})}><b>{layout.charAt(0).toUpperCase()+layout.slice(1)}</b><small>{{grid:"Even tiles in rows",masonry:"Natural image heights",carousel:"Swipe through one row",filmstrip:"A compact horizontal strip"}[layout]}</small></button>)}</div></Field>
  <div className="tw-form-grid tw-form-grid--three"><Slider label="Columns" value={gallery.columns} min={1} max={6} onChange={columns=>update({columns})} /><Slider label="Spacing" value={gallery.gap} min={0} max={32} suffix="px" onChange={gap=>update({gap})} /><Slider label="Roundness" value={gallery.radius} min={0} max={40} suffix="px" onChange={radius=>update({radius})} /><Field label="Tile shape"><Select value={gallery.shape} options={[{value:"original",label:"Original"},{value:"square",label:"Square"},{value:"portrait",label:"Portrait"}]} onChange={shape=>update({shape:shape as GallerySettings["shape"]})}/></Field><Field label="Hover effect"><Select value={gallery.zoom?"zoom":"none"} options={[{value:"zoom",label:"Zoom"},{value:"none",label:"None"}]} onChange={value=>update({zoom:value==="zoom"})}/></Field><Field label="Captions"><Select value={gallery.captions} options={[{value:"hover",label:"On hover"},{value:"always",label:"Always"},{value:"none",label:"Hidden"}]} onChange={captions=>update({captions:captions as GallerySettings["captions"]})}/></Field></div>
  <div className="tw-toggle-grid"><div className="tw-inline-toggle"><span><b>Enable gallery</b><small>Include the gallery in your portfolio.</small></span><Toggle label="Enable gallery" checked={gallery.enabled} onChange={enabled=>update({enabled})}/></div><div className="tw-inline-toggle"><span><b>Open in lightbox</b><small>Full-size media with previous/next controls.</small></span><Toggle label="Gallery lightbox" checked={gallery.lightbox} onChange={lightbox=>update({lightbox})}/></div><div className="tw-inline-toggle"><span><b>Autoplay videos</b><small>Muted and looping inside the gallery.</small></span><Toggle label="Gallery autoplay" checked={gallery.autoplay} onChange={autoplay=>update({autoplay})}/></div></div></Card>
  <Card><CardHead title="Media" subtitle={`${gallery.items.length}/24 items. Reorder with the arrow controls.`} actions={<Button variant="primary" icon="upload" disabled={busy} onClick={()=>input.current?.click()}>{busy?`Processing ${progress}%…`:"Upload"}</Button>}/><div className="tw-row"><TextInput aria-label="Direct gallery media URL" placeholder="https://… direct image or video URL" value={url} onChange={event=>setUrl(event.target.value)}/><Button disabled={busy||!url.trim()} onClick={()=>{if(!/^https?:\/\//i.test(url.trim())){notify("Invalid URL","Use an https:// or http:// media URL.");return;}add({id:crypto.randomUUID(),url:url.trim(),caption:"",kind:/\.(mp4|webm|mov)(\?|$)/i.test(url)?"video":"image"});setUrl("");}}>Import URL</Button></div>
  <div className="tw-gallery-items">{gallery.items.map((item,index)=><article className="tw-gallery-item" key={item.id}>{item.kind==="video"?<video src={item.url} muted controls preload="metadata"/>:<img src={item.url} alt={item.caption} loading="lazy"/>}<TextInput aria-label={`Caption ${index+1}`} value={item.caption} maxLength={300} placeholder="Caption" onChange={event=>update({items:gallery.items.map(entry=>entry.id===item.id?{...entry,caption:event.target.value}:entry)})}/><div className="tw-row"><Button disabled={index===0} onClick={()=>move(index,-1)}>Move up</Button><Button disabled={index===gallery.items.length-1} onClick={()=>move(index,1)}>Move down</Button><Button variant="danger" onClick={()=>update({items:gallery.items.filter(entry=>entry.id!==item.id)})}>Remove</Button></div></article>)}</div>
  {!gallery.items.length?<p className="tw-empty-note">Upload media or import a direct URL to build your gallery.</p>:null}<input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={event=>{void upload(Array.from(event.target.files||[]));event.target.value="";}}/></Card></div>;
}
