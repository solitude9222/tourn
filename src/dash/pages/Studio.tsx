import { useDash } from "../context";
import { ProfileMedia } from "../ProfileMedia";
import { DecorationsPanel } from "../DecorationsPanel";
import { AccountProfilePage } from "./Account";
import { Button, Card, CardHead, ColorField, Field, FileUpload, Select, Slider, TextInput, Textarea, Toggle } from "../ui";
import { ONEKO_CATS } from "../../lib/oneko";
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
    <details className="tw-advanced tw-media-advanced"><summary>Background, banner and image settings</summary><AccountProfilePage section="artwork" /></details>
    <DecorationsPanel />
    <Card><CardHead icon="palette" title="Font" subtitle="Choose the profile typeface, or upload your own font file." /><div className="tw-form-grid"><FontPicker label="Profile font" value={about.design.font} onChange={(font) => setAbout(current => ({ ...current, design: { ...current.design, font } }))} /><div className="tw-inline-toggle"><span><b>Scattered</b><small>Dot-matrix name with a glowing shimmer; bio and supporting text stay readable.</small></span><Toggle label="Scattered text" checked={Boolean(about.design.scattered)} onChange={(scattered) => setAbout(current => ({ ...current, design: { ...current.design, scattered } }))} /></div><Field label="Custom font file" hint="Upload your own WOFF, WOFF2, TTF or OTF file under 500 KB."><FileUpload aria-label="Custom profile font" accept=".woff,.woff2,.ttf,.otf" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 500_000 || !/\.(woff2?|ttf|otf)$/i.test(file.name)) { notify("Font", "Choose a font file under 500 KB."); return; } const customFontUrl = await fileToDataUrl(file); setAbout(current => ({ ...current, design: { ...current.design, customFontUrl } })); notify("Font", "Custom font added. Save to publish it."); }} />{about.design.customFontUrl ? <Button onClick={() => setAbout(current => ({ ...current, design: { ...current.design, customFontUrl: "" } }))}>Remove custom font</Button> : null}</Field></div><ScatteredPreview active={Boolean(about.design.scattered)} text="shatter" color="#ffffff" size={about.design.scatteredSize ?? 86} cell={about.design.scatteredCell ?? 3} glow={about.design.scatteredGlow ?? 6} shimmer={about.design.scatteredShimmer !== false} onToggle={() => setAbout(current => ({ ...current, design: { ...current.design, scattered: !current.design.scattered } }))} /><div className="tw-scattered-controls"><Slider label="Dot size" value={about.design.scatteredSize ?? 86} min={64} max={140} suffix="px" onChange={scatteredSize => setAbout(current => ({ ...current, design: { ...current.design, scatteredSize } }))} /><Slider label="Dot grid" value={about.design.scatteredCell ?? 3} min={2} max={8} suffix="px" onChange={scatteredCell => setAbout(current => ({ ...current, design: { ...current.design, scatteredCell } }))} /><Slider label="Glow" value={about.design.scatteredGlow ?? 6} min={0} max={24} suffix="px" onChange={scatteredGlow => setAbout(current => ({ ...current, design: { ...current.design, scatteredGlow } }))} /><div className="tw-inline-toggle"><span><b>Shimmer</b><small>Move a soft highlight across the dots.</small></span><Toggle label="Scattered shimmer" checked={about.design.scatteredShimmer !== false} onChange={scatteredShimmer => setAbout(current => ({ ...current, design: { ...current.design, scatteredShimmer } }))} /></div></div></Card>
    <Card><CardHead icon="sparkles" title="Oneko" subtitle="A small companion that follows your pointer on the public page." /><div className="tw-form-grid"><div className="tw-inline-toggle"><span><b>Enable Oneko</b><small>Respects reduced-motion preferences.</small></span><Toggle label="Enable Oneko" checked={Boolean(about.design.oneko)} onChange={oneko => setAbout(current => ({ ...current, design: { ...current.design, oneko } }))} /></div><Field label="Companion color"><Select value={about.design.onekoCat || "classic"} options={ONEKO_CATS.map(cat => ({ value: cat.id, label: cat.label }))} onChange={onekoCat => setAbout(current => ({ ...current, design: { ...current.design, onekoCat: onekoCat as typeof current.design.onekoCat } }))} /></Field></div></Card>
  </div>;
}

export function ProfileGeneralPage() {
  const { about, user, setAbout, go } = useDash();
  const updateColors = (patch: Partial<typeof about.design.colors>) => setAbout(current => ({ ...current, design: { ...current.design, colors: { ...current.design.colors, ...patch } } }));
  return <div className="tw-studio-page"><Card><CardHead icon="sliders" title="General Customization" subtitle="Profile details and visual styling" /><div className="tw-form-grid">
    <Field label="Display name"><TextInput icon="user" value={about.displayName} maxLength={32} placeholder={user.username} onChange={event => setAbout(current => ({ ...current, displayName: event.target.value }))} /></Field>
    <Field label="Location"><TextInput icon="pin" value={about.location} maxLength={64} placeholder="Your location" onChange={event => setAbout(current => ({ ...current, location: event.target.value }))} /></Field>
    <Field label="Description" hint={`${about.bio.length}/800`}><Textarea value={about.bio} rows={3} maxLength={800} onChange={event => setAbout(current => ({ ...current, bio: event.target.value }))} /></Field>
    <div className="tw-inline-colors"><ColorField label="Text color" value={about.design.colors.text} onChange={text => updateColors({ text })} /><ColorField label="Secondary text" value={about.design.colors.muted} onChange={muted => updateColors({ muted })} /><ColorField label="Background" value={about.design.colors.background} onChange={background => updateColors({ background })} /></div>
    <Field label="Enter text"><TextInput value={about.design.entry.title} maxLength={48} placeholder="Click to enter" onChange={event => setAbout(current => ({ ...current, design: { ...current.design, entry: { ...current.design.entry, title: event.target.value } } }))} /></Field>
    <Field label="Join date format"><Select value={about.metadata.joinFormat || "relative"} options={[{value:"relative",label:"Relative"},{value:"us",label:"US (12/23/2026)"},{value:"eu",label:"EU (23/12/2026)"}]} onChange={joinFormat => setAbout(current => ({ ...current, metadata: { ...current.metadata, joinFormat: joinFormat as typeof current.metadata.joinFormat } }))} /></Field>
    <Field label="Date format"><Select value={about.metadata.dateFormat || "us"} options={[{value:"us",label:"US (12/23/2026)"},{value:"eu",label:"EU (23/12/2026)"}]} onChange={dateFormat => setAbout(current => ({ ...current, metadata: { ...current.metadata, dateFormat: dateFormat as "us" | "eu" } }))} /></Field>
    <div className="tw-profile-address"><small>Your profile address</small><b>tourn.lol/{user.alias || user.username}</b><Button onClick={() => go("settings")}>Manage addresses</Button></div>
  </div></Card></div>;
}
