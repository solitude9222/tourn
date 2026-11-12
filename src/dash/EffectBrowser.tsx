import { useState, type CSSProperties } from "react";
import { BackgroundEffectLayer, OverlayEffectLayer, EffectText } from "../components/ProfileEffects";
import { DEFAULT_PROFILE_ASSETS, DEFAULT_TEXT_EFFECT, BACKGROUND_EFFECT_PARAM, OVERLAY_EFFECT_PARAM, TEXT_EFFECT_PARAM, defaultParamsFor, type OverlayEffectId } from "../lib/profileAssets";
import { TextInput } from "./ui";

type Option = { id: string; name: string; hint: string };
export type EffectKind = "background" | "overlay" | "text" | "card" | "cursor" | "trail";
const groupFor = (kind: EffectKind, id: string) => {
  if (id === "none" || id === "default") return "Basics";
  if (kind === "text") return ["rgb", "glow", "shimmer", "sparkle", "neon"].includes(id) ? "Light & colour" : "Motion";
  if (kind === "card") return "Light & borders";
  if (kind === "cursor" || kind === "trail") return "Pointer";
  if (["rain", "snow", "snowstorm", "leaf", "dust", "stars", "night"].includes(id)) return "Atmosphere";
  if (["dotted", "grain", "scanlines", "tv", "dither", "fuzzy", "chromatic"].includes(id)) return "Texture";
  return "Light & depth";
};

function TilePreview({ option, kind }: { option: Option; kind: EffectKind }) {
  const [active, setActive] = useState(false);
  const events = { onPointerEnter: () => setActive(true), onPointerLeave: () => setActive(false), onFocus: () => setActive(true), onBlur: () => setActive(false) };
  const base = { ...DEFAULT_PROFILE_ASSETS.effects.background, id: option.id as typeof DEFAULT_PROFILE_ASSETS.effects.background.id, color: "#ffffff", intensity: 45, params: defaultParamsFor(BACKGROUND_EFFECT_PARAM[option.id as keyof typeof BACKGROUND_EFFECT_PARAM] || null) };
  return <span className={`fx-tile-preview fx-preview-${option.id}`} {...events}>
    {kind === "background" && option.id !== "none" && !active ? <img className="fx-effect-poster" src={`/effect-previews/${option.id}.png`} alt="" loading="lazy" /> : null}
    {kind === "overlay" ? <span className="fx-preview-scene" aria-hidden="true">
      <span className="fx-preview-scene-card">
        <span className="fx-preview-scene-avatar" />
        <span className="fx-preview-scene-line fx-preview-scene-line--name" />
        <span className="fx-preview-scene-line" />
      </span>
    </span> : null}
    {kind === "overlay" && option.id === "custom" ? <span className="fx-upload-symbol" aria-hidden="true">+</span> : null}
    {(kind === "background" || kind === "overlay") && (active || kind === "overlay") ? kind === "overlay" ? <OverlayEffectLayer settings={{ ...DEFAULT_PROFILE_ASSETS.effects.overlay, ...base, id: option.id as OverlayEffectId, params: defaultParamsFor(OVERLAY_EFFECT_PARAM[option.id as OverlayEffectId]), opacity: .7 }} /> : <BackgroundEffectLayer settings={base} compact /> : null}
    {kind === "text" ? <EffectText text="Your name" settings={{ ...DEFAULT_TEXT_EFFECT, effect: option.id as typeof DEFAULT_TEXT_EFFECT.effect, colorA: "#fff", colorB: "#ffffff", params: defaultParamsFor(TEXT_EFFECT_PARAM[option.id as keyof typeof TEXT_EFFECT_PARAM]) }} /> : kind === "card" ? <span className="fx-mini-card"><span className={`pv-card-fx pv-card-fx--${option.id}`} /><b>Your name</b><small>@username</small></span> : (kind === "cursor" || kind === "trail") ? <span className={`fx-mini-cursor fx-mini-cursor--${option.id}`} /> : null}
  </span>;
}

export function EffectBrowser({ kind, options, value, onApply }: { kind: EffectKind; options: Option[]; value: string; onApply: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const groups = ["All", ...new Set(options.map((option) => groupFor(kind, option.id)))];
  return <div className="fx-gallery" aria-label={`${kind} effects`}>
    <TextInput value={query} placeholder="Search effects" onChange={(event) => setQuery(event.target.value)} />
    <div className="fx-categories">{groups.map((item) => <button key={item} type="button" aria-pressed={item === group} onClick={() => setGroup(item)}>{item}</button>)}</div>
    <div className="fx-browser-grid">{options.filter((option) => (group === "All" || groupFor(kind, option.id) === group) && `${option.name} ${option.hint}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const first = groupFor(kind, a.id), second = groupFor(kind, b.id); if (first === "Basics" && second !== "Basics") return -1; if (second === "Basics" && first !== "Basics") return 1; return first.localeCompare(second) || a.name.localeCompare(b.name); }).map((option) => <button className={`fx-choice${value === option.id ? " is-selected" : ""}`} key={option.id} type="button" aria-pressed={value === option.id} aria-label={option.name} onClick={() => onApply(option.id)} style={{ "--pv-card-fx-color": "#ffffff", "--pv-card-fx-strength": .7, "--pv-card-fx-speed": "4s" } as CSSProperties}>
      <TilePreview kind={kind} option={option} /><b>{option.name}</b><small>{option.hint}</small>
    </button>)}</div>
  </div>;
}
