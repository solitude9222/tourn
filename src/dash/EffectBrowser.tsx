import { useState, type CSSProperties } from "react";
import { BackgroundEffectLayer, OverlayEffectLayer, EffectText } from "../components/ProfileEffects";
import { DEFAULT_PROFILE_ASSETS, DEFAULT_TEXT_EFFECT, BACKGROUND_EFFECT_PARAM, OVERLAY_EFFECT_PARAM, TEXT_EFFECT_PARAM, defaultParamsFor, type OverlayEffectId } from "../lib/profileAssets";
import { Button, Modal, TextInput } from "./ui";

type Option = { id: string; name: string; hint: string };
export type EffectKind = "background" | "overlay" | "text" | "card" | "cursor" | "trail";
const groupFor = (kind: EffectKind, id: string) => {
  if (id === "none" || id === "default") return "Basics";
  if (kind === "text") return ["rgb", "glow", "shimmer", "sparkle", "neon"].includes(id) ? "Light & colour" : "Motion";
  if (kind === "card") return "Light & borders";
  if (kind === "cursor" || kind === "trail") return "Pointer";
  if (["rain", "snow", "snowstorm", "leaf", "dust", "stars", "night"].includes(id)) return "Atmosphere";
  if (["grain", "scanlines", "tv", "dither", "fuzzy", "chromatic"].includes(id)) return "Texture";
  return "Light & depth";
};

function TilePreview({ option, kind }: { option: Option; kind: EffectKind }) {
  const [active, setActive] = useState(false);
  const events = { onPointerEnter: () => setActive(true), onPointerLeave: () => setActive(false) };
  const base = { ...DEFAULT_PROFILE_ASSETS.effects.background, id: option.id as typeof DEFAULT_PROFILE_ASSETS.effects.background.id, color: "#ffffff", intensity: 45, params: defaultParamsFor(BACKGROUND_EFFECT_PARAM[option.id as keyof typeof BACKGROUND_EFFECT_PARAM] || null) };
  return <span className={`fx-tile-preview fx-preview-${option.id}`} {...events}>
    <span className="fx-tile-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
    {(kind === "background" || kind === "overlay") && active ? kind === "overlay" ? <OverlayEffectLayer settings={{ ...DEFAULT_PROFILE_ASSETS.effects.overlay, ...base, id: option.id as OverlayEffectId, params: defaultParamsFor(OVERLAY_EFFECT_PARAM[option.id as OverlayEffectId]), opacity: .5 }} /> : <BackgroundEffectLayer settings={base} compact /> : null}
    {kind === "text" ? <EffectText text="Your name" settings={{ ...DEFAULT_TEXT_EFFECT, effect: option.id as typeof DEFAULT_TEXT_EFFECT.effect, colorA: "#fff", colorB: "#79b8ff", params: defaultParamsFor(TEXT_EFFECT_PARAM[option.id as keyof typeof TEXT_EFFECT_PARAM]) }} /> : kind === "card" ? <span className="fx-mini-card"><span className={`pv-card-fx pv-card-fx--${option.id}`} /><b>Your name</b><small>@username</small></span> : (kind === "cursor" || kind === "trail") ? <span className={`fx-mini-cursor fx-mini-cursor--${option.id}`} /> : <span className="fx-mini-identity"><b>Your name</b><small>@username</small></span>}
  </span>;
}

export function EffectBrowser({ kind, options, value, onApply, onClose }: { kind: EffectKind; options: Option[]; value: string; onApply: (id: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const groups = ["All", ...new Set(options.map((option) => groupFor(kind, option.id)))];
  return <Modal open title={`Choose ${kind} effect`} subtitle="Browse every effect. Hover a tile to see its motion; apply when ready." onClose={onClose} width={900} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { onApply(selected); onClose(); }}>Apply effect</Button></>}>
    <TextInput value={query} placeholder="Search effects" onChange={(event) => setQuery(event.target.value)} />
    <div className="fx-categories">{groups.map((item) => <button key={item} type="button" aria-pressed={item === group} onClick={() => setGroup(item)}>{item}</button>)}</div>
    <div className="fx-browser-grid">{options.filter((option) => (group === "All" || groupFor(kind, option.id) === group) && `${option.name} ${option.hint}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const first = groupFor(kind, a.id), second = groupFor(kind, b.id); if (first === "Basics" && second !== "Basics") return -1; if (second === "Basics" && first !== "Basics") return 1; return first.localeCompare(second) || a.name.localeCompare(b.name); }).map((option) => <button className={`fx-choice${selected === option.id ? " is-selected" : ""}`} key={option.id} type="button" aria-pressed={selected === option.id} aria-label={option.name} onClick={() => setSelected(option.id)} style={{ "--pv-card-fx-color": "#9fcfff", "--pv-card-fx-strength": .7, "--pv-card-fx-speed": "4s" } as CSSProperties}>
      <TilePreview kind={kind} option={option} /><b>{option.name}</b><small>{option.hint}</small>
    </button>)}</div>
  </Modal>;
}
