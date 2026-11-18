import { useDash } from "../context";
import { ProfileMedia } from "../ProfileMedia";
import { DecorationsPanel } from "../DecorationsPanel";
import { AccountProfilePage } from "./Account";
import { Button, Card, CardHead, Field, FileUpload, Select, Slider, TextInput, Textarea, Toggle } from "../ui";
import { FontPicker } from "../../components/FontPicker";
import { DotMatrixText } from "../../components/DotMatrixText";
import { fileToDataUrl } from "../files";

function ScatteredPreview({ active, text, color, size, cell, glow, shimmer, onToggle }: { active: boolean; text: string; color: string; size: number; cell: number; glow: number; shimmer: boolean; onToggle: () => void }) {
  return <button
    type="button"
    className={`tw-scattered-preview${active ? " is-active" : ""}`}
    onClick={onToggle}
    aria-pressed={active}
    aria-label="Toggle scattered dot-matrix text"
  >
    <span className="tw-scattered-preview-head">
      <span><b>Shatter preview</b><small>Dot matrix with a soft glow</small></span>
      <span className="tw-scattered-state">{active ? "On" : "Off"}</span>
    </span>
    <span className="tw-scattered-stage">
      <DotMatrixText text={text} fontSize={Math.min(110, size)} cell={cell} glow={glow} shimmer={shimmer} color={color} />
    </span>
  </button>;
}

export function AppearanceStudioPage() {
  const { about, setAbout, notify } = useDash();
  return <div className="tw-studio-page">
    <ProfileMedia />
    <Card><CardHead icon="palette" title="Font" subtitle="Choose the profile typeface, or upload your own font file." /><div className="tw-form-grid"><FontPicker label="Profile font" value={about.design.font} onChange={(font) => setAbout(current => ({ ...current, design: { ...current.design, font } }))} /><div className="tw-inline-toggle"><span><b>Scattered</b><small>Dot-matrix name with a glowing shimmer; bio and supporting text stay readable.</small></span><Toggle label="Scattered text" checked={Boolean(about.design.scattered)} onChange={(scattered) => setAbout(current => ({ ...current, design: { ...current.design, scattered } }))} /></div><Field label="Custom font file" hint="Upload your own WOFF, WOFF2, TTF or OTF file under 500 KB."><FileUpload aria-label="Custom profile font" accept=".woff,.woff2,.ttf,.otf" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 500_000 || !/\.(woff2?|ttf|otf)$/i.test(file.name)) { notify("Font", "Choose a font file under 500 KB."); return; } const customFontUrl = await fileToDataUrl(file); setAbout(current => ({ ...current, design: { ...current.design, customFontUrl } })); notify("Font", "Custom font added. Save to publish it."); }} />{about.design.customFontUrl ? <Button onClick={() => setAbout(current => ({ ...current, design: { ...current.design, customFontUrl: "" } }))}>Remove custom font</Button> : null}</Field></div><ScatteredPreview active={Boolean(about.design.scattered)} text="shatter" color="#ffffff" size={about.design.scatteredSize ?? 86} cell={about.design.scatteredCell ?? 3} glow={about.design.scatteredGlow ?? 6} shimmer={about.design.scatteredShimmer !== false} onToggle={() => setAbout(current => ({ ...current, design: { ...current.design, scattered: !current.design.scattered } }))} /><div className="tw-scattered-controls"><Slider label="Dot size" value={about.design.scatteredSize ?? 86} min={64} max={140} suffix="px" onChange={scatteredSize => setAbout(current => ({ ...current, design: { ...current.design, scatteredSize } }))} /><Slider label="Dot grid" value={about.design.scatteredCell ?? 3} min={2} max={8} suffix="px" onChange={scatteredCell => setAbout(current => ({ ...current, design: { ...current.design, scatteredCell } }))} /><Slider label="Glow" value={about.design.scatteredGlow ?? 6} min={0} max={24} suffix="px" onChange={scatteredGlow => setAbout(current => ({ ...current, design: { ...current.design, scatteredGlow } }))} /><div className="tw-inline-toggle"><span><b>Shimmer</b><small>Move a soft highlight across the dots.</small></span><Toggle label="Scattered shimmer" checked={about.design.scatteredShimmer !== false} onChange={scatteredShimmer => setAbout(current => ({ ...current, design: { ...current.design, scatteredShimmer } }))} /></div></div></Card>
  </div>;
}

export function ProfileGeneralPage() {
  const { about, user, setAbout, go } = useDash();
  return <div className="tw-studio-page"><NameSettings/><Card><CardHead icon="sliders" title="General Customization" subtitle="Profile details and visual styling" /><div className="tw-form-grid">
    <Field label="Location"><TextInput icon="pin" value={about.location} maxLength={64} placeholder="Your location" onChange={event => setAbout(current => ({ ...current, location: event.target.value }))} /></Field>
    <Field label="Description" hint={`${about.bio.length}/800`}><Textarea value={about.bio} rows={3} maxLength={800} onChange={event => setAbout(current => ({ ...current, bio: event.target.value }))} /></Field>
    <Field label="Join date format"><Select value={about.metadata.joinFormat || "relative"} options={[{value:"relative",label:"Relative"},{value:"us",label:"US (12/23/2026)"},{value:"eu",label:"EU (23/12/2026)"}]} onChange={joinFormat => setAbout(current => ({ ...current, metadata: { ...current.metadata, joinFormat: joinFormat as typeof current.metadata.joinFormat } }))} /></Field>
    <Field label="Date format"><Select value={about.metadata.dateFormat || "us"} options={[{value:"us",label:"US (12/23/2026)"},{value:"eu",label:"EU (23/12/2026)"}]} onChange={dateFormat => setAbout(current => ({ ...current, metadata: { ...current.metadata, dateFormat: dateFormat as "us" | "eu" } }))} /></Field>
    <div className="tw-profile-address"><small>Your profile address</small><b>tourn.lol/{user.alias || user.username}</b><Button onClick={() => go("settings")}>Manage addresses</Button></div>
  </div></Card><BrowserTitleSettings /></div>;
}

export function DecorationsStudioPage() { return <div className="tw-studio-page"><DecorationsPanel /></div>; }

function BrowserTitleSettings() {
  const {about,setAbout}=useDash(),meta=about.metadata;
  const update=(patch:Partial<typeof meta>)=>setAbout(current=>({...current,metadata:{...current.metadata,...patch}}));
  return <Card><CardHead icon="code" title="Browser tab title" subtitle="Animate the tab name without changing your visible profile text."/><div className="tw-form-grid">
    <Field label="Custom tab title"><TextInput aria-label="Custom tab title" value={meta.title} maxLength={60} placeholder="Your name · tourn.lol" onChange={event=>update({title:event.target.value})}/></Field>
    <Field label="Title animation"><Select ariaLabel="Title animation" value={meta.animation} options={[{value:"none",label:"None"},{value:"cycle",label:"Cycle titles"},{value:"typewriter",label:"Typewriter"},{value:"marquee",label:"Marquee"}]} onChange={value=>update({animation:value as typeof meta.animation})}/></Field>
    {meta.animation!=="none"?<><Field label="Additional titles" hint="One per line, up to eight."><Textarea value={meta.messages.join("\n")} rows={3} onChange={event=>update({messages:event.target.value.split("\n").slice(0,8).map(value=>value.slice(0,60))})}/></Field><Slider label="Pause between titles" min={2} max={30} suffix="s" value={meta.interval} onChange={interval=>update({interval})}/></>:null}
  </div></Card>;
}

function NameSettings(){
 const {about,user,setAbout,go}=useDash();
 return <Card><CardHead icon="user" title="Name settings" subtitle="Change the name visitors see. Your profile address stays the same."/><div className="tw-form-grid"><Field label="Display name" hint="Leave blank to use your alias."><TextInput aria-label="Display name" icon="user" value={about.displayName} maxLength={32} placeholder={user.alias||user.username} onChange={event=>setAbout(current=>({...current,displayName:event.target.value}))}/></Field><Slider label="Name size" value={about.design.nameSize} min={16} max={64} suffix="px" onChange={nameSize=>setAbout(current=>({...current,design:{...current.design,nameSize}}))}/></div><div className="tw-row" style={{marginTop:18}}><Button icon="sparkles" onClick={()=>go("effects",undefined,"name")}>Name effects</Button><Button onClick={()=>go("settings")}>Manage alias</Button></div></Card>;
}
