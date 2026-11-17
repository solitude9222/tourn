import { useDash } from "../context";
import { ProfileMedia } from "../ProfileMedia";
import { DecorationsPanel } from "../DecorationsPanel";
import { AccountProfilePage } from "./Account";
import { Button, Card, CardHead, ColorField, Field, FileUpload, Select, Slider, TextInput, Textarea, Toggle } from "../ui";
import { copyText, imageToDataUrl } from "../files";
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

export function PageMetadataSettings() {
  const { about, user, setAbout, notify } = useDash();
  const metadata = about.metadata;
  const update = (patch: Partial<typeof metadata>) => setAbout(current => ({ ...current, metadata: { ...current.metadata, ...patch } }));
  const handle = user.alias?.trim() || user.username;
  const pageUrl = `${window.location.origin}/${handle}`;
  const displayName = about.displayName.trim() || user.alias?.trim() || user.username;
  const previewTitle = metadata.shareTitle.trim() || displayName;
  const previewDescription = metadata.shareDescription.trim() || about.bio.trim() || `Check out ${displayName} on tourn.lol.`;
  const previewImage = metadata.shareImageUrl.trim() || about.assets.avatarUrl.trim() || user.avatarUrl || "/logo.png";
  const favicon = metadata.faviconUrl.trim() || about.assets.avatarUrl.trim() || user.avatarUrl || "/logo.png";
  const uploadImage = async (file: File | undefined, width: number, height: number, apply: (url: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      notify("Image not added", "Choose a PNG, JPG, WebP or GIF under 2 MB.");
      return;
    }
    try {
      apply(await imageToDataUrl(file, width, height, 0.9));
    } catch {
      notify("Image not added", "That file could not be read. Try another image.");
    }
  };
  const copyLink = () => void copyText(pageUrl).then(ok => notify(ok ? "Page link copied" : "Couldn't copy the link", ok ? "Paste it wherever you want the embed to appear." : "Select the address shown beside the preview instead."));

  return <Card className="tw-meta-card">
    <CardHead icon="share" title="Page metadata & sharing" subtitle="Choose the favicon, tab title and the title, description and image people see when your link is sent." actions={<Button icon="copy" onClick={copyLink}>Copy page link</Button>} />
    <div className="tw-meta-layout">
      <div className="tw-meta-form">
        <section className="tw-meta-section">
          <div className="tw-meta-section-head"><b>Link preview</b><small>What Discord, Slack, X and search results show for your page.</small></div>
          <div className="tw-form-grid">
            <Field label="Preview title" hint={`${metadata.shareTitle.length}/80`}><TextInput value={metadata.shareTitle} maxLength={80} placeholder={displayName} onChange={event => update({ shareTitle: event.target.value })} /></Field>
            <Field label="Preview image URL" hint="Paste a public HTTPS image URL for crawlers, or upload one below for the in-dashboard preview."><TextInput value={metadata.shareImageUrl.startsWith("data:") ? "" : metadata.shareImageUrl} placeholder="https://…/preview.png" onChange={event => update({ shareImageUrl: event.target.value })} /></Field>
            <Field label="Preview description" hint={`${metadata.shareDescription.length}/220`} className="tw-span-2"><Textarea rows={3} value={metadata.shareDescription} maxLength={220} placeholder={about.bio || "A short line about you and what you make."} onChange={event => update({ shareDescription: event.target.value })} /></Field>
            <Field label="Upload preview image" hint="Resized to a 1200×630 share card. Uploaded images may not be readable by external crawlers — use a public URL above for those."><FileUpload accept="image/*" onChange={event => { void uploadImage(event.target.files?.[0], 1200, 630, shareImageUrl => update({ shareImageUrl })); event.target.value = ""; }} /></Field>
            <Field label="Browser accent color" hint="Tints browser chrome around your page on supported devices."><ColorField value={metadata.themeColor} onChange={themeColor => update({ themeColor })} /></Field>
          </div>
        </section>

        <section className="tw-meta-section">
          <div className="tw-meta-section-head"><b>Favicon</b><small>The icon in the browser tab, bookmarks and history.</small></div>
          <div className="tw-favicon-row">
            <span className="tw-favicon-preview"><img src={favicon} alt="Current favicon preview" /></span>
            <div className="tw-favicon-copy"><b>{metadata.faviconUrl ? "Custom favicon" : "Profile picture"}</b><small>{metadata.faviconUrl ? "Your uploaded icon is used on the public page." : "The avatar is used until you choose something else."}</small></div>
            <div className="tw-row">
              <FileUpload accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={event => { void uploadImage(event.target.files?.[0], 128, 128, faviconUrl => update({ faviconUrl })); event.target.value = ""; }} />
              <Button disabled={!metadata.faviconUrl} onClick={() => update({ faviconUrl: "" })}>Use avatar</Button>
            </div>
          </div>
          <Field label="Favicon URL" hint="Optional. A square PNG, ICO, SVG or WebP works best."><TextInput value={metadata.faviconUrl.startsWith("data:") ? "" : metadata.faviconUrl} placeholder="https://…/icon.png" onChange={event => update({ faviconUrl: event.target.value })} /></Field>
        </section>

        <section className="tw-meta-section">
          <div className="tw-meta-section-head"><b>Browser tab</b><small>The title and animation, separate from your visible name.</small></div>
          <div className="tw-form-grid">
            <Field label="Custom tab title"><TextInput icon="at" value={metadata.title} maxLength={60} placeholder={`${displayName} · tourn.lol`} onChange={event => update({ title: event.target.value })} /></Field>
            <Field label="Animation"><Select ariaLabel="Tab title animation" value={metadata.animation} options={[{value:"none",label:"None"},{value:"cycle",label:"Cycle titles"},{value:"typewriter",label:"Typewriter"},{value:"marquee",label:"Marquee"}]} onChange={animation => update({ animation: animation as TabAnimation })} /></Field>
            {metadata.animation !== "none" ? <><Field label="Additional tab titles" hint="One per line, up to 8. Leave empty to animate your main title."><Textarea rows={3} value={metadata.messages.join("\n")} onChange={event => update({ messages: event.target.value.split("\n").slice(0,8).map(value => value.slice(0,60)) })} /></Field><Slider label="Pause between titles" value={metadata.interval} min={2} max={30} suffix="s" onChange={interval => update({ interval })} /></> : null}
          </div>
        </section>

        <section className="tw-meta-section tw-meta-section--inline">
          <div className="tw-inline-toggle"><span><b>Keep out of search engines</b><small>Adds a noindex directive. Your page still opens normally for anyone with the link.</small></span><Toggle label="Keep page out of search engines" checked={metadata.noIndex} onChange={noIndex => update({ noIndex })} /></div>
        </section>
      </div>

      <aside className="tw-meta-preview" aria-label="Shared link preview">
        <div className="tw-meta-preview-head"><b>Share preview</b><small>Live preview of your embed</small></div>
        <div className="tw-embed-card">
          <div className="tw-embed-app"><span className="tw-embed-favicon"><img src={favicon} alt="" /></span><span><b>{previewTitle}</b><small>tourn.lol</small></span></div>
          <div className="tw-embed-image">{previewImage ? <img src={previewImage} alt="" /> : <span>No preview image</span>}</div>
          <div className="tw-embed-copy"><b>{previewTitle}</b><p>{previewDescription}</p><small>{pageUrl.replace(/^https?:\/\//, "")}</small></div>
        </div>
        <div className="tw-meta-identity">
          <span><small>Public link</small><code>{pageUrl.replace(/^https?:\/\//, "")}</code></span>
          <span><small>Account ID</small><code>{user.id.slice(0, 8)}</code></span>
        </div>
        <p className="tw-foot-note">These tags are applied while someone is on your page. Discord and other crawlers need the public image URL to render a preview remotely.</p>
      </aside>
    </div>
  </Card>;
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
  </div></Card><PageMetadataSettings /></div>;
}
