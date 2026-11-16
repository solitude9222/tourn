import "./effectsStudio.css";
import { usePreference } from "./preferences";
import { useState, type CSSProperties } from "react";
import { BackgroundEffectLayer, OverlayEffectLayer, EffectText } from "../components/ProfileEffects";
import { CursorTrailLayer } from "../components/CursorTrailLayer";
import { DEFAULT_PROFILE_ASSETS, DEFAULT_TEXT_EFFECT, BACKGROUND_EFFECT_PARAM, OVERLAY_EFFECT_PARAM, TEXT_EFFECT_PARAM, defaultParamsFor, type OverlayEffectId } from "../lib/profileAssets";
import { naturalCompare, sorted, chain } from "../lib/sort";
import { SortSelect, TextInput } from "./ui";

export type EffectOption = { id: string; name: string; hint: string; effect?: string; colorA?: string; colorB?: string };
type Option = EffectOption;
export type EffectKind = "background" | "overlay" | "text" | "card" | "cursor" | "trail" | "click";
const groupFor = (kind: EffectKind, id: string) => {
  if (id === "none" || id === "default" || id === "system") return "Basics";
  if (kind === "text") return ["rgb", "glow", "shimmer", "sparkle", "neon"].includes(id) ? "Light & colour" : "Motion";
  if (kind === "card") return "Light & borders";
  if (kind === "cursor" || kind === "trail" || kind === "click") return "Pointer";
  if (["rain", "snow", "night", "storm", "warp", "shootingStars", "blurred", "snowFall"].includes(id)) return "Atmosphere";
  if (["oldTv", "dotPattern", "lines", "gridLines", "crt", "grain"].includes(id)) return "Texture";
  return "Light & depth";
};

function TilePreview({ option, kind, active, previewText }: { option: Option; kind: EffectKind; active: boolean; previewText: string }) {
  const base = { ...DEFAULT_PROFILE_ASSETS.effects.background, id: option.id as typeof DEFAULT_PROFILE_ASSETS.effects.background.id, color: "#ffffff", intensity: 45, params: defaultParamsFor(BACKGROUND_EFFECT_PARAM[option.id as keyof typeof BACKGROUND_EFFECT_PARAM] || null) };
  return <span className={`fx-tile-preview fx-preview-${option.id}`}>
    {kind === "background" && option.id !== "none" && !active ? <span className={`fx-preview-poster fx-preview-poster--${option.id}`} /> : null}
    {kind === "overlay" ? <span className="fx-preview-scene" aria-hidden="true">
      <span className="fx-preview-scene-card">
        <span className="fx-preview-scene-avatar" />
        <span className="fx-preview-scene-line fx-preview-scene-line--name" />
        <span className="fx-preview-scene-line" />
      </span>
    </span> : null}
    {kind === "overlay" && option.id === "custom" ? <span className="fx-upload-symbol" aria-hidden="true">+</span> : null}
    {(kind === "background" || kind === "overlay") && active ? kind === "overlay" ? <OverlayEffectLayer compact settings={{ ...DEFAULT_PROFILE_ASSETS.effects.overlay, ...base, id: option.id as OverlayEffectId, params: defaultParamsFor(OVERLAY_EFFECT_PARAM[option.id as OverlayEffectId]), opacity: .7 }} /> : <BackgroundEffectLayer settings={base} compact /> : null}
    {kind === "text" ? <EffectText text={previewText} settings={{ ...DEFAULT_TEXT_EFFECT, effect: (option.effect || option.id) as typeof DEFAULT_TEXT_EFFECT.effect, colorA: option.colorA || "#fff", colorB: option.colorB || "#ffffff", params: defaultParamsFor(TEXT_EFFECT_PARAM[(option.effect || option.id) as keyof typeof TEXT_EFFECT_PARAM]) }} /> : kind === "card" ? <span className="fx-mini-card"><span className={`pv-card-fx pv-card-fx--${option.id}`} /><b>Your name</b><small>@username</small></span> : kind === "click" && option.id !== "none" ? <span className={`fx-click-demo fx-click-demo--${option.id}`} /> : (kind === "cursor" || kind === "trail") ? <span className="fx-pointer-demo"><span className={`fx-mini-cursor fx-mini-cursor--${option.id}`} />{active ? <CursorTrailLayer settings={{ ...DEFAULT_PROFILE_ASSETS.cursor, style: "dot", trail: option.id !== "none", trailType: option.id as typeof DEFAULT_PROFILE_ASSETS.cursor.trailType, color: "#91a7ff", size: 14 }} /> : null}</span> : null}
  </span>;
}

export function EffectBrowser({ kind, options, value, onApply, previewText = "Your name" }: { kind: EffectKind; options: Option[]; value: string; onApply: (id: string) => void; previewText?: string }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [order, setOrder] = usePreference(`effect-sort/${kind}`, "featured");
  const [favorites, setFavorites] = usePreference<string[]>(`effect-favorites/${kind}`, []);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [page, setPage] = useState(1);
  const groups = ["All", ...new Set(options.map(option => groupFor(kind, option.effect || option.id)))];
  const filtered = sorted(options.filter(option => (!onlyFavorites || favorites.includes(option.id)) && (group === "All" || groupFor(kind, option.effect || option.id) === group) && `${option.name} ${option.hint}`.toLowerCase().includes(query.trim().toLowerCase())), order === "az" ? (a,b) => naturalCompare(a.name,b.name) : order === "za" ? (a,b) => naturalCompare(b.name,a.name) : chain((a:Option,b:Option) => Number(b.id === "none") - Number(a.id === "none"), (a:Option,b:Option) => options.indexOf(a) - options.indexOf(b)));
  const pages = Math.max(1, Math.ceil(filtered.length / 8)), currentPage = Math.min(page, pages);
  const selected = options.find(option => option.id === value);
  return <div className="fx-gallery fx-gallery--inline" aria-label={`${kind} effects`}>
    <div className="fx-active-effect"><span>Active effect</span><b>{selected?.name || "Custom"}<button type="button" aria-label="Remove active effect" onClick={() => onApply("none")}>×</button></b></div>
    <div className="fx-categories"><button type="button" aria-pressed={onlyFavorites} onClick={() => { setOnlyFavorites(v=>!v);setPage(1); }}>Favorites ({favorites.length})</button>{groups.map(item => <button key={item} type="button" aria-pressed={item===group} onClick={()=>{setGroup(item);setPage(1);}}>{item}</button>)}</div>
    <div className="fx-toolbar"><TextInput icon="search" aria-label="Search effects" value={query} placeholder="Search effects…" onChange={event=>{setQuery(event.target.value);setPage(1);}} /><SortSelect value={order} onChange={value=>{setOrder(value);setPage(1);}} options={[{value:"featured",label:"Featured"},{value:"az",label:"Name A–Z"},{value:"za",label:"Name Z–A"}]} /><div className="fx-pagination"><button type="button" aria-label="Previous effects page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>‹</button><span>{currentPage} / {pages}</span><button type="button" aria-label="Next effects page" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>›</button></div></div>
    <div className="fx-browser-grid">{filtered.slice((currentPage-1)*8,currentPage*8).map(option=><div className="fx-choice-wrap" key={option.id}>
      <button className={`fx-choice${value===option.id?" is-selected":""}`} type="button" aria-pressed={value===option.id} aria-label={option.name} title={option.hint} onPointerEnter={()=>setPreviewId(option.id)} onPointerLeave={()=>setPreviewId(null)} onFocus={()=>setPreviewId(option.id)} onBlur={()=>setPreviewId(null)} onClick={()=>onApply(option.id)} style={{"--pv-card-fx-color":"#ffffff","--pv-card-fx-strength":.7,"--pv-card-fx-speed":"4s"} as CSSProperties}>
        {value===option.id?<span className="fx-selected-dot" aria-hidden="true"/>:null}<TilePreview kind={kind} option={option} active={previewId===option.id} previewText={previewText}/><b>{option.name}</b><small>{option.hint}</small>
      </button><button type="button" className="tw-favorite fx-favorite" aria-label={`Favorite ${option.name}`} aria-pressed={favorites.includes(option.id)} onClick={()=>setFavorites(current=>current.includes(option.id)?current.filter(id=>id!==option.id):[...current,option.id])}>☆</button>
    </div>)}</div>
    {!filtered.length?<p className="tw-foot-note" role="status">No matching effects. Try another category or add a favorite using the star.</p>:null}
  </div>;
}
