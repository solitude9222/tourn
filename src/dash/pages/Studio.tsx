import { useDash } from "../context";
import { ProfileMedia } from "../ProfileMedia";
import { DecorationsPanel } from "../DecorationsPanel";
import { AccountProfilePage } from "./Account";
import { Button, Card, CardHead, ColorField, Field, Select, Slider, TextInput, Textarea, Toggle } from "../ui";
import { ONEKO_CATS } from "../../lib/oneko";
import type { TabAnimation } from "../../lib/about";

export function AppearanceStudioPage() {
  const { about, setAbout } = useDash();
  return <div className="tw-studio-page">
    <ProfileMedia />
    <details className="tw-advanced tw-media-advanced"><summary>Background, banner and image settings</summary><AccountProfilePage section="artwork" /></details>
    <DecorationsPanel />
    <Card><CardHead icon="sparkles" title="Oneko" subtitle="A small companion that follows your pointer on the public page." /><div className="tw-form-grid"><div className="tw-inline-toggle"><span><b>Enable Oneko</b><small>Respects reduced-motion preferences.</small></span><Toggle label="Enable Oneko" checked={Boolean(about.design.oneko)} onChange={oneko => setAbout(current => ({ ...current, design: { ...current.design, oneko } }))} /></div><Field label="Companion color"><Select value={about.design.onekoCat || "classic"} options={ONEKO_CATS.map(cat => ({ value: cat.id, label: cat.label }))} onChange={onekoCat => setAbout(current => ({ ...current, design: { ...current.design, onekoCat: onekoCat as typeof current.design.onekoCat } }))} /></Field></div></Card>
  </div>;
}

export function PageTitleSettings() {
  const { about, setAbout } = useDash();
  const metadata = about.metadata;
  const update = (patch: Partial<typeof metadata>) => setAbout(current => ({ ...current, metadata: { ...current.metadata, ...patch } }));
  return <Card><CardHead icon="code" title="Page Title" subtitle="The browser tab title, separate from your visible name and bio." /><div className="tw-form-grid">
    <Field label="Custom title text"><TextInput icon="at" value={metadata.title} maxLength={60} placeholder="Your name · tourn.lol" onChange={event => update({ title: event.target.value })} /></Field>
    <Field label="Animation type"><Select ariaLabel="Tab title animation" value={metadata.animation} options={[{value:"none",label:"None"},{value:"cycle",label:"Cycle titles"},{value:"typewriter",label:"Typewriter"},{value:"marquee",label:"Marquee"}]} onChange={animation => update({ animation: animation as TabAnimation })} /></Field>
    {metadata.animation !== "none" ? <><Field label="Additional tab titles" hint="One per line, up to 8. Leave empty to animate your main title."><Textarea rows={3} value={metadata.messages.join("\n")} onChange={event => update({ messages: event.target.value.split("\n").slice(0,8).map(value => value.slice(0,60)) })} /></Field><Slider label="Pause between titles" value={metadata.interval} min={2} max={30} suffix="s" onChange={interval => update({ interval })} /></> : null}
  </div></Card>;
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
  </div></Card><PageTitleSettings /></div>;
}
