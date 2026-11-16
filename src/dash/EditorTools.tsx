import { useState } from "react";
import { LinkerPreview } from "../components/LinkerPreview";
import { DEFAULT_ABOUT_DESIGN } from "../lib/about";
import { DEFAULT_LINK_DESIGN } from "../lib/links";
import { DEFAULT_WIDGET_DESIGN } from "../lib/widgets";
import { DEFAULT_BADGE_STYLE } from "../lib/badges";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import { snapshotFrom, type TemplateSnapshot } from "../lib/templates";
import { useDash, type Page } from "./context";
import { styleFrom } from "./appearance";
import { PreviewFrame } from "./PreviewFrame";
import { usePreference } from "./preferences";
import { Button, Field, Modal, Segmented, TextInput } from "./ui";

type SavedLook = { id: string; name: string; snapshot: TemplateSnapshot };

export function EditorTools({ page }: { page: Page }) {
  const dash = useDash();
  const { user, about, links, widgets, badges, setAbout, setLinks, setWidgets, setBadges, notify } = dash;
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = usePreference("preview-device", "desktop");
  const [presets, setPresets] = useState(false);
  const [name, setName] = useState("");
  const [looks, setLooks] = useState<SavedLook[]>(() => {
    try { const value = JSON.parse(localStorage.getItem(`tourn/looks/${user.id}`) || "[]"); return Array.isArray(value) ? value.filter(v => v?.id && v?.name && v?.snapshot?.assets?.card && v?.snapshot?.assets?.effects && v?.snapshot?.design && v?.snapshot?.links?.design && v?.snapshot?.widgets?.design && v?.snapshot?.badges?.style).slice(0, 12) : []; }
    catch { return []; }
  });
  const [reset, setReset] = useState(false);
  const remember = (next: SavedLook[]) => {
    try { localStorage.setItem(`tourn/looks/${user.id}`, JSON.stringify(next)); setLooks(next); return true; }
    catch { notify("Preset not saved", "Browser storage is full or unavailable. Remove an older preset and try again."); return false; }
  };
  const apply = (snapshot: TemplateSnapshot) => {
    setAbout(current => ({ ...current, design: { ...current.design, ...styleFrom(snapshot.design) }, assets: { ...current.assets, card: snapshot.assets.card, effects: snapshot.assets.effects } }));
    setLinks(current => ({ ...current, design: snapshot.links.design }));
    setWidgets(current => ({ ...current, design: snapshot.widgets.design }));
    setBadges(current => ({ ...current, style: snapshot.badges.style }));
    notify("Preset applied", "Your look is publishing automatically. Preview it or undo the change.");
  };
  const resetLabel = page === "music" ? "audio styling" : page === "effects" ? "effects" : page === "links" ? "link styling" : page === "widgets" ? "widget styling" : page === "badges" ? "badge styling" : "card styling";
  const resetStyles = () => {
    if (page === "links") setLinks(current => ({ ...current, design: DEFAULT_LINK_DESIGN }));
    else if (page === "widgets") setWidgets(current => ({ ...current, design: DEFAULT_WIDGET_DESIGN }));
    else if (page === "badges") setBadges(current => ({ ...current, style: DEFAULT_BADGE_STYLE }));
    else setAbout(current => ({ ...current,
      ...(page !== "music" && page !== "effects" ? { design: { ...current.design, ...styleFrom(DEFAULT_ABOUT_DESIGN) } } : {}),
      assets: { ...current.assets,
        ...(page === "effects" ? { effects: DEFAULT_PROFILE_ASSETS.effects, card: DEFAULT_PROFILE_ASSETS.card, cursor: { ...DEFAULT_PROFILE_ASSETS.cursor, imageUrl: current.assets.cursor.imageUrl } } : {}),
        ...(page === "music" ? { audio: { ...current.assets.audio, style: DEFAULT_PROFILE_ASSETS.audio.style, cardOpacity: DEFAULT_PROFILE_ASSETS.audio.cardOpacity, accentColor: DEFAULT_PROFILE_ASSETS.audio.accentColor, playerColor: DEFAULT_PROFILE_ASSETS.audio.playerColor, borderColor: DEFAULT_PROFILE_ASSETS.audio.borderColor, titleColor: DEFAULT_PROFILE_ASSETS.audio.titleColor, artistColor: DEFAULT_PROFILE_ASSETS.audio.artistColor, progressColor: DEFAULT_PROFILE_ASSETS.audio.progressColor, trackColor: DEFAULT_PROFILE_ASSETS.audio.trackColor } } : {}),
      },
    }));
    setReset(false); notify("Style reset", "You can undo this change from the toolbar.");
  };
  return <>
    <div className="tw-editor-tools" role="toolbar" aria-label="Editor tools">
      <Button disabled={!dash.canUndo} onClick={dash.undo} title="Undo (Ctrl/Cmd+Z)">Undo</Button>
      <Button disabled={!dash.canRedo} onClick={dash.redo} title="Redo (Ctrl/Cmd+Shift+Z)">Redo</Button>
      <Button icon="eye" onClick={() => setPreview(true)}>Preview draft</Button>
      <Button icon="save" onClick={() => setPresets(true)}>My presets</Button>
      {["music", "effects", "layout", "profile-appearance", "links", "widgets", "badges"].includes(page) ? <Button onClick={() => setReset(true)}>Reset {resetLabel}</Button> : null}
      <span className="tw-publish-status" role="status">{dash.publishStatus === "saving" ? "Publishing…" : dash.publishStatus === "retrying" ? "Saved locally · retrying publish" : "All changes published"}</span>
      <Button variant="primary" onClick={dash.save}>Save changes</Button>
    </div>
    <Modal open={preview} title="Draft preview" subtitle="Your current edits. Preview audio stays silent." width={1060} onClose={() => setPreview(false)} footer={<Button onClick={() => setPreview(false)}>Back to editing</Button>}>
      <Segmented value={device} onChange={setDevice} options={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile · 375px" }]} />
      <div className={`tw-draft-preview is-${device}`}><PreviewFrame><LinkerPreview user={user} about={about} links={links} widgets={widgets} badges={badges} interactive={false} showEntry={false} /></PreviewFrame></div>
    </Modal>
    <Modal open={presets} title="My appearance presets" subtitle="Saved on this browser for this account. Card, effect, link, widget and badge styling." onClose={() => setPresets(false)}>
      <Field label="Preset name"><TextInput value={name} maxLength={40} placeholder="e.g. Midnight blue" onChange={e => setName(e.target.value)} /></Field>
      <Button disabled={!name.trim() || looks.length >= 12} onClick={() => {
        const snapshot = snapshotFrom(about, links, widgets, badges);
        // Presets contain styling only; avoid saving private section content or links.
        snapshot.design = { ...DEFAULT_ABOUT_DESIGN, ...styleFrom(snapshot.design), sections: [] };
        snapshot.links = { ...snapshot.links, links: [] }; snapshot.widgets = { ...snapshot.widgets, widgets: [] }; snapshot.badges = { ...snapshot.badges, equipped: [] };
        if (looks.some(look => look.name.toLowerCase() === name.trim().toLowerCase() || JSON.stringify(look.snapshot) === JSON.stringify(snapshot))) { notify("Preset already saved", "Use a different name or change the look before saving another preset."); return; }
        if (remember([{ id: crypto.randomUUID(), name: name.trim(), snapshot }, ...looks])) { setName(""); notify("Preset saved", "Your look is available on this browser."); }
      }}>Save current look ({looks.length}/12)</Button>
      <div className="tw-stack">{looks.map(look => <div className="tw-preset-row" key={look.id}><b>{look.name}</b><Button onClick={() => apply(look.snapshot)}>Apply</Button><Button variant="danger" onClick={() => remember(looks.filter(item => item.id !== look.id))}>Delete</Button></div>)}</div>
      {!looks.length ? <p className="tw-foot-note">Save your first look above to reuse it later.</p> : null}
    </Modal>
    <Modal open={reset} title={`Reset ${resetLabel}?`} subtitle="Uploaded files and profile section content will be kept. You can undo this reset." onClose={() => setReset(false)} footer={<><Button onClick={() => setReset(false)}>Cancel</Button><Button variant="danger" onClick={resetStyles}>Reset {resetLabel}</Button></>}><p>Restore the default {resetLabel} for this profile.</p></Modal>
  </>;
}
