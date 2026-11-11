import { uploadAudioFile } from "../../lib/audioUpload";
import { useState } from "react";
import { BACKGROUND_EFFECTS, OVERLAY_EFFECTS, TEXT_EFFECTS, CARD_EFFECTS, BACKGROUND_EFFECT_PARAM, OVERLAY_EFFECT_PARAM, TEXT_EFFECT_PARAM, defaultParamsFor, type BackgroundEffectSettings, type OverlayEffectSettings, type TextEffectSettings, type TextEffectTarget, type EffectParamSpec } from "../../lib/profileAssets";
import { EffectBrowser, type EffectKind } from "../EffectBrowser";
import { FontPicker } from "../../components/FontPicker";
import { playInteractionSound } from "../../components/ProfileInteractions";
import { imageToDataUrl } from "../files";
import { useDash } from "../context";
import { FileUpload, Button, Card, CardHead, ColorField, Field, Icon, Select, Slider, Toggle } from "../ui";

const TRAILS = [
  { id: "dots", name: "Dots", hint: "Soft fading beads" },
  { id: "line", name: "Line", hint: "A clean directional streak" },
  { id: "glow", name: "Glow", hint: "A blurred light wake" },
  { id: "comet", name: "Comet", hint: "A tapered comet tail" },
  { id: "sparkle", name: "Sparkle", hint: "Tiny four-point stars" },
  { id: "ribbon", name: "Ribbon", hint: "A smooth silk ribbon" },
  { id: "stars", name: "Stardust", hint: "Tiny glowing stars" },
  { id: "smoke", name: "Smoke", hint: "A soft drifting haze" },
];

type ChooserKind = Exclude<EffectKind, "cursor">;

function Parameter({ spec, value, onChange }: { spec: EffectParamSpec | null; value: { amount: number; flag: boolean }; onChange: (value: { amount: number; flag: boolean }) => void }) {
  if (!spec) return null;
  return spec.kind === "slider" ? <Slider label={spec.label} value={value.amount} min={spec.min} max={spec.max} step={spec.step} suffix={spec.unit} onChange={(amount) => onChange({ ...value, amount })} /> : <div className="tw-inline-toggle"><b>{spec.label}</b><Toggle label={spec.label} checked={value.flag} onChange={(flag) => onChange({ ...value, flag })} /></div>;
}

export function EffectsPage() {
  const { about, setAbout, notify } = useDash();
  const assets = about.assets, effects = assets.effects;
  const [browser, setBrowser] = useState<EffectKind>("background");
  const [clickUploading, setClickUploading] = useState(false);
  const [clickProgress, setClickProgress] = useState(0);
  const [target, setTarget] = useState<TextEffectTarget>("name");
  const text = effects.text[target];
  const setBackground = (patch: Partial<BackgroundEffectSettings>) => setAbout((current) => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, background: { ...current.assets.effects.background, ...patch } } } }));
  const setOverlay = (patch: Partial<OverlayEffectSettings>) => setAbout((current) => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, overlay: { ...current.assets.effects.overlay, ...patch } } } }));
  const setText = (patch: Partial<TextEffectSettings>) => setAbout((current) => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, text: { ...current.assets.effects.text, [target]: { ...current.assets.effects.text[target], ...patch } } } } }));
  const setCard = (patch: Partial<typeof assets.card>) => setAbout((current) => ({ ...current, assets: { ...current.assets, card: { ...current.assets.card, ...patch } } }));
  const setCursor = (patch: Partial<typeof assets.cursor>) => setAbout((current) => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, ...patch } } }));
  const setInteraction = (patch: Partial<typeof assets.interactions>) => setAbout((current) => ({ ...current, assets: { ...current.assets, interactions: { ...current.assets.interactions, ...patch } } }));
  const catalogs = { trail: TRAILS, background: BACKGROUND_EFFECTS, overlay: OVERLAY_EFFECTS, text: TEXT_EFFECTS, card: CARD_EFFECTS };
  const values = { trail: assets.cursor.trailType, background: effects.background.id, overlay: effects.overlay.id, text: text.effect, card: assets.card.id };
  const chooser = (kind: ChooserKind) => <EffectBrowser key={`${kind}-${target}`} kind={kind} options={catalogs[kind]} value={values[kind]} onApply={(id) => apply(id, kind)} />;
  const apply = (id: string, kind: ChooserKind) => {
    if (kind === "background") { const effect = id as BackgroundEffectSettings["id"]; setBackground({ id: effect, params: defaultParamsFor(BACKGROUND_EFFECT_PARAM[effect]) }); }
    if (kind === "overlay") { const effect = id as OverlayEffectSettings["id"]; setOverlay({ id: effect, opacity: .25, intensity: 50, params: defaultParamsFor(OVERLAY_EFFECT_PARAM[effect]) }); }
    if (kind === "text") { const effect = id as TextEffectSettings["effect"]; setText({ effect, ...(effect === "sparkle" ? { colorA: "#ffffff", colorB: "#ffffff" } : {}), params: defaultParamsFor(TEXT_EFFECT_PARAM[effect]) }); }
    if (kind === "card") setCard({ id: id as typeof assets.card.id });
    if (kind === "trail") setCursor({ trailType: id as typeof assets.cursor.trailType, trail: true });
  };
  return <div className="fx-workspace">
    <nav className="tw-workspace-tabs" aria-label="Effect categories">{(["background", "overlay", "text", "card", "cursor"] as EffectKind[]).map((kind) => <button type="button" aria-pressed={browser === kind} onClick={() => setBrowser(kind)} key={kind}>{({ background: "Background", overlay: "Overlays", text: "Text", card: "Card", cursor: "Pointer & sound", trail: "Trails" })[kind]}</button>)}</nav>
    {browser === "background" ? <Card><CardHead icon="sparkles" title="Background effects" subtitle="Choose an atmosphere. Hover a tile to see its motion." />{chooser("background")}
      {effects.background.id !== "none" ? <div className="tw-form-grid"><ColorField label="Particle colour" value={effects.background.color} onChange={(color) => setBackground({ color })} /><Slider label="Intensity" value={effects.background.intensity} min={0} max={100} suffix="%" onChange={(intensity) => setBackground({ intensity })} /><Slider label="Motion duration" value={effects.background.speed} min={2} max={24} suffix="s" onChange={(speed) => setBackground({ speed })} /><Parameter spec={BACKGROUND_EFFECT_PARAM[effects.background.id]} value={effects.background.params} onChange={(params) => setBackground({ params })} /></div> : null}
    </Card> : null}
    {browser === "overlay" ? <Card><CardHead icon="layers" title="Overlays" subtitle="Textures and edge treatments layered over your page." />{chooser("overlay")}
      {effects.overlay.id !== "none" ? <div className="tw-form-grid">
        <Slider label="Opacity" value={Math.round(effects.overlay.opacity * 100)} min={0} max={90} suffix="%" onChange={(opacity) => setOverlay({ opacity: opacity / 100 })} />
        {effects.overlay.id === "bloom" ? <ColorField label="Light tint" value={effects.overlay.color} onChange={(color) => setOverlay({ color })} /> : null}
        {effects.overlay.id === "fog" ? <Slider label="Drift duration" value={effects.overlay.speed} min={2} max={24} suffix="s" onChange={(speed) => setOverlay({ speed })} /> : null}
      </div> : null}
    </Card> : null}
    {browser === "text" ? <Card><CardHead icon="edit" title="Text effects" subtitle="Choose a target, then browse animated lettering. Sparkle adds twinkling stars around the letters." />
      <div className="fx-categories">{["name", "alias", "bio"].map((id) => <button key={id} type="button" aria-pressed={target === id} onClick={() => setTarget(id as TextEffectTarget)}>{({ name: "Display name", alias: "Username", bio: "Bio" })[id as TextEffectTarget]}</button>)}</div>
      {chooser("text")}
      <div className="tw-form-grid"><FontPicker value={text.font} onChange={(font) => setText({ font })} /><ColorField label={text.effect === "sparkle" ? "Text colour" : "Primary colour"} value={text.colorA} onChange={(colorA) => setText({ colorA })} /><ColorField label={text.effect === "sparkle" ? "Sparkle colour" : "Secondary colour"} value={text.colorB} onChange={(colorB) => setText({ colorB })} /><Slider label="Animation duration" value={text.speed} min={.5} max={12} step={.5} suffix="s" onChange={(speed) => setText({ speed })} /><Slider label="Strength" value={Math.round(text.strength * 100)} min={20} max={300} suffix="%" onChange={(strength) => setText({ strength: strength / 100 })} /><Parameter spec={TEXT_EFFECT_PARAM[text.effect]} value={text.params} onChange={(params) => setText({ params })} /></div>
    </Card> : null}
    {browser === "card" ? <Card><CardHead icon="layout" title="Card lighting" subtitle="Border beams, glow, shimmer and surface treatments." />{chooser("card")}
      {assets.card.id !== "none" ? <div className="tw-form-grid"><ColorField label="Light colour" value={assets.card.color} onChange={(color) => setCard({ color })} /><Slider label="Light intensity" value={assets.card.intensity} min={0} max={100} suffix="%" onChange={(intensity) => setCard({ intensity })} /><Slider label="Sweep duration" value={assets.card.speed} min={1.5} max={20} step={.5} suffix="s" onChange={(speed) => setCard({ speed })} /></div> : null}
    </Card> : null}
    {browser === "cursor" ? <Card><CardHead icon="move" title="Cursor and trails" subtitle="Upload a pointer on the left, then choose its trail on the right." />
      <div className="fx-cursor-grid">
        <div className="fx-pointer-column">
          <span className="fx-subheading">Pointer</span>
          <label className={`fx-pointer-drop${assets.cursor.imageUrl ? " has-image" : ""}`}>
            <span className="fx-pointer-preview">{assets.cursor.imageUrl ? <img src={assets.cursor.imageUrl} alt="Your pointer" /> : <Icon name="upload" size={24} />}</span>
            <span className="fx-pointer-copy"><b>{assets.cursor.imageUrl ? "Replace pointer" : "Upload pointer"}</b><small>PNG, WebP or GIF · resized to 64 px</small></span>
            <input aria-label="Custom pointer image" type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setCursor({ imageUrl: await imageToDataUrl(file, 64, 64), style: "custom" }); } catch { notify("Cursor", "That image could not be read."); } }} />
          </label>
          {assets.cursor.imageUrl ? <Button onClick={() => setCursor({ imageUrl: "", style: "default" })}>Remove pointer</Button> : null}
          <small className="fx-pointer-note">No image uses your normal cursor. Trails still follow it.</small>
        </div>
        <div className="fx-trail-column">
          <div className="fx-trail-head"><span className="fx-subheading">Pointer trail</span><Toggle label="Show cursor trail" checked={assets.cursor.trail} onChange={(trail) => setCursor({ trail })} /></div>
          {chooser("trail")}
          <div className="tw-form-grid"><ColorField label="Trail colour" value={assets.cursor.color} onChange={(color) => setCursor({ color })} /><Slider label="Trail size" value={assets.cursor.size} min={4} max={32} suffix="px" onChange={(size) => setCursor({ size })} /><Slider label="Trail length" value={assets.cursor.trailLength} min={1} max={24} onChange={(trailLength) => setCursor({ trailLength })} /></div>
        </div>
      </div>
    </Card> : null}
    {browser === "cursor" ? <Card><CardHead icon="music" title="Click sounds and feedback" subtitle="Optional sounds play only after a visitor clicks. Dashboard previews stay silent." />
      <div className="tw-form-grid"><Field label="Click sound"><Select value={assets.interactions.sound} options={["none", "soft", "tick", "pop", "custom"].map((value) => ({ value, label: value === "none" ? "Off" : value }))} onChange={(sound) => setInteraction({ sound: sound as typeof assets.interactions.sound })} /></Field><Slider label="Click volume" value={Math.round(assets.interactions.volume * 100)} min={0} max={100} suffix="%" onChange={(volume) => setInteraction({ volume: volume / 100 })} /><div className="tw-inline-toggle"><b>Click ripple</b><Toggle label="Click ripple" checked={assets.interactions.ripple} onChange={(ripple) => setInteraction({ ripple })} /></div><ColorField label="Ripple colour" value={assets.interactions.color} onChange={(color) => setInteraction({ color })} />
      {assets.interactions.sound === "custom" ? <Field label="Custom click audio" hint={clickUploading ? `Uploading ${clickProgress}%` : "Choose an audio file for your click sound."}><FileUpload disabled={clickUploading} aria-label="Custom click audio" accept="audio/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setClickUploading(true); try { setInteraction({ fileUrl: await uploadAudioFile(file, setClickProgress) }); } catch (error) { notify("Click sound", error instanceof Error ? error.message : "That audio file could not be uploaded."); } finally { setClickUploading(false); } }} /></Field> : null}
      <div className="tw-inline-toggle"><b>Sound on every page click</b><Toggle label="Sound on every page click" checked={assets.interactions.allClicks} onChange={(allClicks) => setInteraction({ allClicks })} /></div></div><Button onClick={() => playInteractionSound(assets.interactions)}>Test click sound</Button>
    </Card> : null}
  </div>;
}
