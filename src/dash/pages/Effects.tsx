import { useState } from "react";
import { BACKGROUND_EFFECTS, OVERLAY_EFFECTS, TEXT_EFFECTS, CARD_EFFECTS, BACKGROUND_EFFECT_PARAM, OVERLAY_EFFECT_PARAM, TEXT_EFFECT_PARAM, defaultParamsFor, type BackgroundEffectSettings, type OverlayEffectSettings, type TextEffectSettings, type TextEffectTarget, type EffectParamSpec } from "../../lib/profileAssets";
import { EffectBrowser, type EffectKind } from "../EffectBrowser";
import { FontPicker } from "../../components/FontPicker";
import { playInteractionSound } from "../../components/ProfileInteractions";
import { fileToDataUrl, imageToDataUrl } from "../files";
import { useDash } from "../context";
import { Button, Card, CardHead, ColorField, Field, Select, Slider, TextInput, Toggle } from "../ui";

const CURSORS = [
  { id: "default", name: "System pointer", hint: "Keep the normal pointer" }, { id: "dot", name: "Dot", hint: "A clean coloured point" },
  { id: "ring", name: "Ring", hint: "A hollow ring" }, { id: "crosshair", name: "Crosshair", hint: "Precise crosshair" },
  { id: "glow", name: "Glow", hint: "A soft light around the pointer" }, { id: "custom", name: "Custom image", hint: "Use your own pointer image" },
];
function Parameter({ spec, value, onChange }: { spec: EffectParamSpec | null; value: { amount: number; flag: boolean }; onChange: (value: { amount: number; flag: boolean }) => void }) {
  if (!spec) return null;
  return spec.kind === "slider" ? <Slider label={spec.label} value={value.amount} min={spec.min} max={spec.max} step={spec.step} suffix={spec.unit} onChange={(amount) => onChange({ ...value, amount })} /> : <div className="tw-inline-toggle"><b>{spec.label}</b><Toggle label={spec.label} checked={value.flag} onChange={(flag) => onChange({ ...value, flag })} /></div>;
}
export function EffectsPage() {
  const { about, setAbout, notify } = useDash();
  const assets = about.assets, effects = assets.effects;
  const [browser, setBrowser] = useState<EffectKind | null>(null);
  const [target, setTarget] = useState<TextEffectTarget>("name");
  const text = effects.text[target];
  const setBackground = (patch: Partial<BackgroundEffectSettings>) => setAbout((current) => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, background: { ...current.assets.effects.background, ...patch } } } }));
  const setOverlay = (patch: Partial<OverlayEffectSettings>) => setAbout((current) => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, overlay: { ...current.assets.effects.overlay, ...patch } } } }));
  const setText = (patch: Partial<TextEffectSettings>) => setAbout((current) => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, text: { ...current.assets.effects.text, [target]: { ...current.assets.effects.text[target], ...patch } } } } }));
  const setCard = (patch: Partial<typeof assets.card>) => setAbout((current) => ({ ...current, assets: { ...current.assets, card: { ...current.assets.card, ...patch } } }));
  const setCursor = (patch: Partial<typeof assets.cursor>) => setAbout((current) => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, ...patch } } }));
  const setInteraction = (patch: Partial<typeof assets.interactions>) => setAbout((current) => ({ ...current, assets: { ...current.assets, interactions: { ...current.assets.interactions, ...patch } } }));
  const catalogs = { trail: ["dots", "line", "glow", "comet"].map((id) => ({ id, name: id, hint: `${id} pointer trail` })), background: BACKGROUND_EFFECTS, overlay: OVERLAY_EFFECTS, text: TEXT_EFFECTS, card: CARD_EFFECTS, cursor: CURSORS };
  const values = { trail: assets.cursor.trailType, background: effects.background.id, overlay: effects.overlay.id, text: text.effect, card: assets.card.id, cursor: assets.cursor.style };
  const chooser = (kind: EffectKind) => <div className="fx-current"><span><b>{catalogs[kind].find((option) => option.id === values[kind])?.name || values[kind]}</b><small>Open the gallery to compare previews.</small></span><Button onClick={() => setBrowser(kind)}>Browse {kind} effects</Button></div>;
  const apply = (id: string) => {
    if (browser === "background") { const effect = id as BackgroundEffectSettings["id"]; setBackground({ id: effect, params: defaultParamsFor(BACKGROUND_EFFECT_PARAM[effect]) }); }
    if (browser === "overlay") { const effect = id as OverlayEffectSettings["id"]; setOverlay({ id: effect, opacity: .25, intensity: 50, params: defaultParamsFor(OVERLAY_EFFECT_PARAM[effect]) }); }
    if (browser === "text") { const effect = id as TextEffectSettings["effect"]; setText({ effect, ...(effect === "sparkle" ? { colorA: "#ffffff", colorB: "#ffffff" } : {}), params: defaultParamsFor(TEXT_EFFECT_PARAM[effect]) }); }
    if (browser === "card") setCard({ id: id as typeof assets.card.id });
    if (browser === "trail") setCursor({ trailType: id as typeof assets.cursor.trailType, trail: true });
    if (browser === "cursor") setCursor({ style: id as typeof assets.cursor.style });
  };
  return <>
    <Card><CardHead icon="sparkles" title="Background effects" subtitle="Motion behind your profile. Browse the gallery instead of running a full-page preview." />{chooser("background")}
      {effects.background.id !== "none" ? <div className="tw-form-grid"><ColorField label="Particle colour" value={effects.background.color} onChange={(color) => setBackground({ color })} /><Slider label="Intensity" value={effects.background.intensity} min={0} max={100} suffix="%" onChange={(intensity) => setBackground({ intensity })} /><Slider label="Motion duration" value={effects.background.speed} min={2} max={24} suffix="s" onChange={(speed) => setBackground({ speed })} /><Parameter spec={BACKGROUND_EFFECT_PARAM[effects.background.id]} value={effects.background.params} onChange={(params) => setBackground({ params })} /></div> : null}
    </Card>
    <Card><CardHead icon="layers" title="Overlays" subtitle="Film textures, haze and lighting above the background. Separate from particles." />{chooser("overlay")}
      {effects.overlay.id === "custom" ? <div className="tw-form-grid"><Field label="Overlay image URL"><TextInput value={effects.overlay.imageUrl} placeholder="https://.../overlay.png" onChange={(event) => setOverlay({ imageUrl: event.target.value })} /></Field><Field label="Overlay image upload" hint="Transparent PNG, SVG or animated GIF under 700 KB."><input aria-label="Overlay image upload" type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 700_000) { notify("Overlay", "Choose an image or GIF under 700 KB."); return; } setOverlay({ imageUrl: await fileToDataUrl(file) }); }} /></Field></div> : null}
      {effects.overlay.id !== "none" ? <div className="tw-form-grid"><ColorField label="Overlay tint" value={effects.overlay.color} onChange={(color) => setOverlay({ color })} /><Slider label="Opacity" value={Math.round(effects.overlay.opacity * 100)} min={0} max={90} suffix="%" onChange={(opacity) => setOverlay({ opacity: opacity / 100 })} /><Slider label="Intensity" value={effects.overlay.intensity} min={0} max={100} suffix="%" onChange={(intensity) => setOverlay({ intensity })} /><Slider label="Motion duration" value={effects.overlay.speed} min={2} max={24} suffix="s" onChange={(speed) => setOverlay({ speed })} /><Parameter spec={OVERLAY_EFFECT_PARAM[effects.overlay.id]} value={effects.overlay.params} onChange={(params) => setOverlay({ params })} /></div> : null}
    </Card>
    <Card><CardHead icon="edit" title="Text effects" subtitle="Choose a target, then browse animated lettering. Sparkle adds glitter inside the letters." />
      <div className="fx-categories">{[["name", "Display name"], ["alias", "Username"], ["bio", "Bio"]].map(([id, label]) => <button key={id} type="button" aria-pressed={target === id} onClick={() => setTarget(id as TextEffectTarget)}>{label}</button>)}</div>
      {chooser("text")}
      <div className="tw-form-grid"><FontPicker value={text.font} onChange={(font) => setText({ font })} /><ColorField label="Primary colour" value={text.colorA} onChange={(colorA) => setText({ colorA })} /><ColorField label="Secondary colour" value={text.colorB} onChange={(colorB) => setText({ colorB })} /><Slider label="Animation duration" value={text.speed} min={.5} max={12} step={.5} suffix="s" onChange={(speed) => setText({ speed })} /><Slider label="Strength" value={text.strength} min={0} max={100} suffix="%" onChange={(strength) => setText({ strength })} /><Parameter spec={TEXT_EFFECT_PARAM[text.effect]} value={text.params} onChange={(params) => setText({ params })} /></div>
    </Card>
    <Card><CardHead icon="layout" title="Card lighting" subtitle="Border beams, glow, shimmer and surface treatments." />{chooser("card")}
      {assets.card.id !== "none" ? <div className="tw-form-grid"><ColorField label="Light colour" value={assets.card.color} onChange={(color) => setCard({ color })} /><Slider label="Light intensity" value={assets.card.intensity} min={0} max={100} suffix="%" onChange={(intensity) => setCard({ intensity })} /><Slider label="Sweep duration" value={assets.card.speed} min={1.5} max={20} step={.5} suffix="s" onChange={(speed) => setCard({ speed })} /></div> : null}
    </Card>
    <Card><CardHead icon="move" title="Cursor and trails" subtitle="Keep a system pointer or add a custom pointer and a fading trail." />{chooser("cursor")}
      <div className="tw-form-grid"><ColorField label="Cursor colour" value={assets.cursor.color} onChange={(color) => setCursor({ color })} /><Slider label="Cursor size" value={assets.cursor.size} min={4} max={32} suffix="px" onChange={(size) => setCursor({ size })} /><Field label="Trail style">{chooser("trail")}</Field><Slider label="Trail length" value={assets.cursor.trailLength} min={1} max={24} onChange={(trailLength) => setCursor({ trailLength })} /><div className="tw-inline-toggle"><b>Show trail</b><Toggle label="Show cursor trail" checked={assets.cursor.trail} onChange={(trail) => setCursor({ trail })} /></div>
      <Field label="Custom pointer image"><input aria-label="Custom pointer image" type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setCursor({ imageUrl: await imageToDataUrl(file, 64, 64), style: "custom" }); } catch { notify("Cursor", "That image could not be read."); } }} /></Field></div>
    </Card>
    <Card><CardHead icon="music" title="Click sounds and feedback" subtitle="Optional sounds play only after a visitor clicks. Dashboard previews stay silent." />
      <div className="tw-form-grid"><Field label="Click sound"><Select value={assets.interactions.sound} options={["none", "soft", "tick", "pop", "custom"].map((value) => ({ value, label: value === "none" ? "Off" : value }))} onChange={(sound) => setInteraction({ sound: sound as typeof assets.interactions.sound })} /></Field><Slider label="Click volume" value={Math.round(assets.interactions.volume * 100)} min={0} max={100} suffix="%" onChange={(volume) => setInteraction({ volume: volume / 100 })} /><div className="tw-inline-toggle"><b>Click ripple</b><Toggle label="Click ripple" checked={assets.interactions.ripple} onChange={(ripple) => setInteraction({ ripple })} /></div><ColorField label="Ripple colour" value={assets.interactions.color} onChange={(color) => setInteraction({ color })} />
      {assets.interactions.sound === "custom" ? <Field label="Custom click audio" hint="A short audio clip, up to 500 KB."><input aria-label="Custom click audio" type="file" accept="audio/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("audio/") || file.size > 500_000) { notify("Click sound", "Choose an audio clip under 500 KB."); return; } setInteraction({ fileUrl: await fileToDataUrl(file) }); }} /></Field> : null}
      <div className="tw-inline-toggle"><b>Sound on every page click</b><Toggle label="Sound on every page click" checked={assets.interactions.allClicks} onChange={(allClicks) => setInteraction({ allClicks })} /></div></div><Button onClick={() => playInteractionSound(assets.interactions)}>Test click sound</Button>
    </Card>
    {browser ? <EffectBrowser key={`${browser}-${target}`} kind={browser} options={catalogs[browser]} value={values[browser]} onApply={apply} onClose={() => setBrowser(null)} /> : null}
  </>;
}
