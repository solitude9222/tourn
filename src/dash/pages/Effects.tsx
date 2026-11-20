import { uploadAudioFile } from "../../lib/audioUpload";
import { useState } from "react";
import { CURSOR_TRAILS, CURSOR_SKINS, CLICK_EFFECTS, BACKGROUND_EFFECTS, PICKABLE_OVERLAYS, TEXT_EFFECTS, CARD_EFFECTS, TEXT_EFFECT_PARAM, DEFAULT_CURSOR_MOTION, defaultParamsFor, type BackgroundEffectSettings, type ClickEffectId, type CursorMotionSettings, type CursorStyle, type CursorTrailType, type OverlayEffectSettings, type TextEffectId, type TextEffectSettings, type TextEffectTarget, type EffectParamSpec } from "../../lib/profileAssets";
import { EffectBrowser, type EffectKind } from "../EffectBrowser";
import { FontPicker } from "../../components/FontPicker";
import { playInteractionSound } from "../../components/ProfileInteractions";
import { useDash } from "../context";
import { FileUpload, Button, Card, CardHead, ColorField, Field, MultiSelect, Select, Slider, TextInput, Toggle } from "../ui";

const TRAILS = CURSOR_TRAILS;
const CONTINUOUS_TRAILS = new Set<CursorTrailType>(["trailingCursor", "ghost", "tracer", "orbit"]);

type ChooserKind = Exclude<EffectKind, "cursor">;

function MotionSettings({
  value,
  onChange,
  label,
  showAmount = true,
}: {
  value: CursorMotionSettings;
  onChange: (patch: Partial<CursorMotionSettings>) => void;
  label: string;
  showAmount?: boolean;
}) {
  const customColor = Boolean(value.color);
  return <div className="tw-form-grid">
    <Slider label={`${label} size`} value={value.size} min={0.4} max={2} step={0.1} suffix="×" onChange={(size) => onChange({ size })} />
    {showAmount ? <Slider label={`${label} amount`} value={value.amount} min={0.2} max={3} step={0.1} suffix="×" onChange={(amount) => onChange({ amount })} /> : null}
    <Slider label={`${label} lifetime`} value={value.life} min={0.25} max={2.5} step={0.05} suffix="×" onChange={(life) => onChange({ life })} />
    <div className="tw-inline-toggle"><b>Rainbow {label.toLowerCase()}</b><Toggle label={`Rainbow ${label.toLowerCase()}`} checked={value.rainbow} onChange={(rainbow) => onChange({ rainbow })} /></div>
    <div className="tw-inline-toggle"><b>Custom colour</b><Toggle label={`${label} custom colour`} checked={customColor} onChange={(enabled) => onChange({ color: enabled ? "#ffffff" : "" })} /></div>
    {customColor && !value.rainbow ? <ColorField label={`${label} colour`} value={value.color} onChange={(color) => onChange({ color })} /> : null}
  </div>;
}

function Parameter({ spec, value, onChange }: { spec: EffectParamSpec | null; value: { amount: number; flag: boolean }; onChange: (value: { amount: number; flag: boolean }) => void }) {
  if (!spec) return null;
  return spec.kind === "slider" ? <Slider label={spec.label} value={value.amount} min={spec.min} max={spec.max} step={spec.step} suffix={spec.unit} onChange={(amount) => onChange({ ...value, amount })} /> : <div className="tw-inline-toggle"><b>{spec.label}</b><Toggle label={spec.label} checked={value.flag} onChange={(flag) => onChange({ ...value, flag })} /></div>;
}

export function EffectsPage({ category = "background", embedded = false }: { category?: EffectKind; embedded?: boolean } = {}) {
  const { about, setAbout, notify } = useDash();
  const assets = about.assets, effects = assets.effects;
  const [browser, setBrowser] = useState<EffectKind>(category);
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
  const catalogs = { trail: TRAILS, click: CLICK_EFFECTS, background: BACKGROUND_EFFECTS, overlay: PICKABLE_OVERLAYS, text: TEXT_EFFECTS, card: CARD_EFFECTS };
  const values = { trail: assets.cursor.trailType, click: assets.cursor.click, background: effects.background.id, overlay: effects.overlay.id, text: text.effect, card: assets.card.id };
  const trailType = assets.cursor.trailType;
  const trailMotion = assets.cursor.trailSettings[trailType] ?? DEFAULT_CURSOR_MOTION;
  const clickMotion = assets.cursor.clickSettings[assets.cursor.click] ?? DEFAULT_CURSOR_MOTION;
  const updateTrailMotion = (patch: Partial<CursorMotionSettings>) => setCursor({ trailSettings: { ...assets.cursor.trailSettings, [trailType]: { ...trailMotion, ...patch } } });
  const updateClickMotion = (patch: Partial<CursorMotionSettings>) => setCursor({ clickSettings: { ...assets.cursor.clickSettings, [assets.cursor.click]: { ...clickMotion, ...patch } } });
  const chooser = (kind: ChooserKind) => <EffectBrowser key={`${kind}-${target}`} kind={kind} options={catalogs[kind]} previewText={about.displayName || "Your name"} value={values[kind]} onApply={(id) => apply(id, kind)} />;
  const apply = (id: string, kind: ChooserKind) => {
    if (kind === "background") { const effect = id as BackgroundEffectSettings["id"]; setBackground({ id: effect }); }
    if (kind === "overlay") { const effect = id as OverlayEffectSettings["id"]; setOverlay({ id: effect, opacity: .9 }); }
    if (kind === "text") { const effect = id as TextEffectSettings["effect"]; setText({ effect, effects: (text.effects ?? []).filter((entry) => entry !== effect), ...(effect === "sparkle" ? { colorA: "#ffffff", colorB: "#ffffff" } : {}), params: defaultParamsFor(TEXT_EFFECT_PARAM[effect]) }); }
    if (kind === "card") setCard({ id: id as typeof assets.card.id });
    if (kind === "trail") setCursor({ trailType: id as CursorTrailType, trail: id !== "none" });
    if (kind === "click") setCursor({ click: id as ClickEffectId });
  };
  const skinOptions: { value: CursorStyle; label: string }[] = [
    ...CURSOR_SKINS.map((skin) => ({ value: skin.id as CursorStyle, label: skin.name })),
    ...(assets.cursor.imageUrl ? [{ value: "custom" as CursorStyle, label: "Uploaded cursor" }] : []),
  ];
  return <div className="fx-workspace">
    {!embedded ? <nav className="tw-workspace-tabs" aria-label="Effect categories">{(["background", "overlay", "text", "card", "cursor"] as EffectKind[]).map((kind) => <button type="button" aria-pressed={browser === kind} onClick={() => setBrowser(kind)} key={kind}>{({ background: "Background", overlay: "Overlays", text: "Text", card: "Card", cursor: "Pointer & sound", trail: "Trails", click: "Clicks" })[kind]}</button>)}</nav> : null}
    {browser === "background" ? <Card><CardHead icon="sparkles" title="Background effects" subtitle="Choose an atmosphere. Hover a tile to see its motion." />{chooser("background")}
    </Card> : null}
    {browser === "overlay" ? <Card><CardHead icon="layers" title="Overlay effects" subtitle="Quiet full-page finishes: film grain, fine lines, a dot texture, blur or falling snow." />{chooser("overlay")}
    </Card> : null}
    {browser === "text" ? <Card><CardHead icon="edit" title="Text effects" subtitle="Choose a target, then browse animated lettering. Sparkle adds twinkling stars around the letters." />
      <div className="fx-categories">{["name", "alias", "bio"].map((id) => <button key={id} type="button" aria-pressed={target === id} onClick={() => setTarget(id as TextEffectTarget)}>{({ name: "Display name", alias: "Username", bio: "Bio" })[id as TextEffectTarget]}</button>)}</div>
      {chooser("text")}
      <div className="tw-form-grid"><FontPicker value={text.font} onChange={(font) => setText({ font })} /><ColorField label={text.effect === "sparkle" ? "Text colour" : "Primary colour"} value={text.colorA} onChange={(colorA) => setText({ colorA })} /><ColorField label={text.effect === "sparkle" ? "Sparkle colour" : "Secondary colour"} value={text.colorB} onChange={(colorB) => setText({ colorB })} /><Slider label="Animation duration" value={text.speed} min={.5} max={12} step={.5} suffix="s" onChange={(speed) => setText({ speed })} /><Slider label="Strength" value={Math.round(text.strength * 100)} min={20} max={300} suffix="%" onChange={(strength) => setText({ strength: strength / 100 })} /><Parameter spec={TEXT_EFFECT_PARAM[text.effect]} value={text.params} onChange={(params) => setText({ params })} /><Field label="Stack more effects" hint="Layer a second or third effect on top of the main one."><MultiSelect ariaLabel="Stack text effects" value={text.effects ?? []} options={TEXT_EFFECTS.filter((option) => option.id !== "none" && option.id !== text.effect).map((option) => ({ value: option.id, label: option.name }))} placeholder="No extra layers" onChange={(effects) => setText({ effects: effects as TextEffectId[] })} /></Field></div>
    </Card> : null}
    {browser === "card" ? <Card><CardHead icon="layout" title="Card lighting" subtitle="Border beams, glow, shimmer and surface treatments." />{chooser("card")}
      {assets.card.id !== "none" ? <div className="tw-form-grid"><ColorField label="Light colour" value={assets.card.color} onChange={(color) => setCard({ color })} /><Slider label="Light intensity" value={assets.card.intensity} min={0} max={100} suffix="%" onChange={(intensity) => setCard({ intensity })} /><Slider label="Sweep duration" value={assets.card.speed} min={1.5} max={20} step={.5} suffix="s" onChange={(speed) => setCard({ speed })} /></div> : null}
    </Card> : null}
    {browser === "cursor" ? <Card><CardHead icon="move" title="Cursor and trails" subtitle="Pick a pointer skin, trail and click effect; hover a tile to preview it." />
      <div className="tw-form-grid"><Field label="Pointer skin"><Select ariaLabel="Pointer skin" value={assets.cursor.style} options={skinOptions} onChange={(style) => setCursor({ style: style as CursorStyle })} /></Field>{assets.cursor.style !== "system" && assets.cursor.style !== "custom" ? <><Slider label="Pointer size" value={assets.cursor.size} min={4} max={32} suffix="px" onChange={(size) => setCursor({ size })} /><ColorField label="Pointer colour" value={assets.cursor.color} onChange={(color) => setCursor({ color })} /></> : null}</div>
      <div className="fx-cursor-grid fx-cursor-grid--single">
        <div className="fx-trail-column">
          <div className="fx-trail-head"><span className="fx-subheading">Pointer trail</span><Toggle label="Show cursor trail" checked={assets.cursor.trail} onChange={(trail) => setCursor({ trail })} /></div>
          {chooser("trail")}
          {trailType !== "none" ? <><div className="fx-subheading">Settings for {CURSOR_TRAILS.find((trail) => trail.id === trailType)?.name}</div><MotionSettings label="Trail" value={trailMotion} showAmount={!CONTINUOUS_TRAILS.has(trailType)} onChange={updateTrailMotion} /></> : null}
          <div className="fx-trail-head"><span className="fx-subheading">Click effect</span></div>
          {chooser("click")}
          {assets.cursor.click !== "none" ? <><div className="fx-subheading">Settings for {CLICK_EFFECTS.find((effect) => effect.id === assets.cursor.click)?.name}</div><MotionSettings label="Click" value={clickMotion} onChange={updateClickMotion} /></> : null}
        </div>
      </div>
    </Card> : null}
    {browser === "cursor" ? <Card><CardHead icon="music" title="Click sounds" subtitle="Optional sounds play only after a visitor clicks. Dashboard previews stay silent." />
      <div className="tw-form-grid"><Field label="Click sound"><Select value={assets.interactions.sound} options={["none", "soft", "tick", "pop", "custom"].map((value) => ({ value, label: value === "none" ? "Off" : value }))} onChange={(sound) => setInteraction({ sound: sound as typeof assets.interactions.sound })} /></Field><Slider label="Click volume" value={Math.round(assets.interactions.volume * 100)} min={0} max={100} suffix="%" onChange={(volume) => setInteraction({ volume: volume / 100 })} />
      {assets.interactions.sound === "custom" ? <Field label="Custom click audio" hint={clickUploading ? `Uploading ${clickProgress}%` : "Choose an audio file for your click sound."}><FileUpload disabled={clickUploading} aria-label="Custom click audio" accept="audio/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setClickUploading(true); try { setInteraction({ fileUrl: await uploadAudioFile(file, setClickProgress) }); } catch (error) { notify("Click sound", error instanceof Error ? error.message : "That audio file could not be uploaded."); } finally { setClickUploading(false); } }} /></Field> : null}
      <div className="tw-inline-toggle"><b>Sound on every page click</b><Toggle label="Sound on every page click" checked={assets.interactions.allClicks} onChange={(allClicks) => setInteraction({ allClicks })} /></div></div><Button onClick={() => playInteractionSound(assets.interactions)}>Test click sound</Button>
    </Card> : null}
  </div>;
}
