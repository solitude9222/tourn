import { EffectsPage } from "./pages/Effects";
import { useState } from "react";
import decorations from "../lib/decorations.json";
import { TEXT_EFFECTS, TEXT_EFFECT_PARAM, defaultParamsFor, type TextEffectId } from "../lib/profileAssets";
import { useDash } from "./context";
import { EffectBrowser, type EffectOption } from "./EffectBrowser";
import { usePreference } from "./preferences";
import { Card, CardHead, Icon, TextInput } from "./ui";

const SPARKLE_COLORS = [
  ["blue", "Blue", "#60a5fa"], ["white", "White", "#ffffff"], ["black", "Black", "#252525"],
  ["green", "Green", "#4ade80"], ["pink", "Pink", "#f472b6"], ["yellow", "Yellow", "#fde047"],
];
const NAME_EFFECTS: EffectOption[] = [
  { id: "none", name: "None", hint: "Your name without decoration" },
  ...SPARKLE_COLORS.map(([id, name, color]) => ({ id: `sparkle-${id}`, name: `${name} Sparkles`, hint: "Twinkling particles around your name", effect: "sparkle", colorA: "#ffffff", colorB: color })),
  ...TEXT_EFFECTS.filter(effect => effect.id !== "none" && effect.id !== "sparkle" && effect.id !== "typewriter"),
];

export function DecorationsPanel({ avatarOnly = false }: {avatarOnly?:boolean} = {}) {
  const { user, about, setAbout } = useDash();
  const [tab, setTab] = useState(() => { const section = new URLSearchParams(location.hash.split("?")[1]).get("section") || "name"; return avatarOnly ? "avatar" : ["name","background","overlay","card","cursor"].includes(section) ? section : "name"; });
  const [textTarget, setTextTarget] = useState<"name" | "alias" | "bio">("name");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = usePreference<string[]>(`avatar-favorites/${user.id}`, []);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const name = about.assets.effects.text[textTarget];
  const decoration = about.assets.decoration.discordUrl;
  const avatar = about.assets.avatarUrl || user.avatarUrl;
  const active = decorations.find(item => item.url === decoration);
  const nameValue = name.effect === "sparkle" ? NAME_EFFECTS.find(item => item.effect === "sparkle" && item.colorB?.toLowerCase() === name.colorB.toLowerCase())?.id || "sparkle-white" : name.effect;
  const avatarOptions = [{ id: "none", label: "None", url: "" }, ...decorations].filter(item => (!onlyFavorites || favorites.includes(item.id)) && `${item.label} ${"category" in item ? item.category : ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(avatarOptions.length / 8)), currentPage = Math.min(page, pages);
  const chooseAvatar = (url: string) => setAbout(current => ({ ...current, assets: { ...current.assets, decoration: { ...current.assets.decoration, discordUrl: url } } }));
  return <Card className="tw-decorations-panel"><CardHead icon="sparkles" title="Decorations" subtitle="Text, backgrounds, overlays, card lighting and pointer effects." />
    {!avatarOnly ? <div className="tw-decoration-tabs" role="tablist" aria-label="Decoration types">
      {[["name",`Name Effects (${NAME_EFFECTS.length})`],["avatar",`Avatar Effects (${decorations.length})`],["background","Background Effects"],["overlay","Overlays"],["card","Card Effects"],["cursor","Pointer Effects"]].filter(([id])=>id!=="avatar").map(([id,label])=><button type="button" role="tab" key={id} aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}

    </div> : null}
    {tab === "name" ? <><div className="fx-categories">{(["name","alias","bio"] as const).map(id=><button type="button" key={id} aria-pressed={id===textTarget} onClick={()=>setTextTarget(id)}>{({name:"Display name",alias:"Username",bio:"Bio"})[id]}</button>)}</div><EffectBrowser key={textTarget} kind="text" options={NAME_EFFECTS} value={nameValue} previewText={textTarget === "name" ? about.displayName || user.username : textTarget === "alias" ? `@${user.alias || user.username}` : about.bio.slice(0,32) || "Your bio"} onApply={id => {
      const option = NAME_EFFECTS.find(item => item.id === id);
      const effect = (option?.effect || id) as TextEffectId;
      setAbout(current => ({ ...current, assets: { ...current.assets, effects: { ...current.assets.effects, text: { ...current.assets.effects.text, [textTarget]: { ...current.assets.effects.text[textTarget], effect, effects: [], ...(option?.colorA ? { colorA: option.colorA, colorB: option.colorB! } : {}), params: defaultParamsFor(TEXT_EFFECT_PARAM[effect]) } } } } }));
    }} /></> : tab === "avatar" ? <div className="fx-gallery fx-gallery--inline">
      <div className="fx-active-effect"><span>Active effect</span><b>{active?.label || "None"}<button type="button" aria-label="Remove avatar decoration" onClick={() => chooseAvatar("")}>×</button></b></div>
      <div className="fx-toolbar"><TextInput icon="search" aria-label="Search avatar effects" placeholder="Search avatar effects…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /><button className="tw-btn" type="button" aria-pressed={onlyFavorites} onClick={() => { setOnlyFavorites(value => !value); setPage(1); }}>Favorites ({favorites.length})</button><div className="fx-pagination"><button type="button" aria-label="Previous avatar page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button><span>{currentPage} / {pages}</span><button type="button" aria-label="Next avatar page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>›</button></div></div>
      <div className="fx-browser-grid">{avatarOptions.slice((currentPage - 1) * 8, currentPage * 8).map(item => <div className="fx-choice-wrap" key={item.id}><button type="button" className={`fx-choice${decoration === item.url ? " is-selected" : ""}`} aria-label={item.label} aria-pressed={decoration === item.url} onClick={() => chooseAvatar(item.url)}>
        {decoration === item.url ? <span className="fx-selected-dot" /> : null}<span className="fx-avatar-stage"><span className="fx-avatar-identity">{avatar ? <img src={avatar} alt="" /> : (about.displayName || user.username).slice(0, 1)}</span>{item.url ? <img className="fx-avatar-decoration" src={item.url.replace(/size=\d+/, "size=160")} loading="lazy" decoding="async" alt="" /> : null}</span><b>{item.label}</b>
      </button><button type="button" className="tw-favorite fx-favorite" aria-label={`Favorite ${item.label}`} aria-pressed={favorites.includes(item.id)} onClick={() => setFavorites(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>☆</button></div>)}</div>
      {!avatarOptions.length ? <p className="tw-foot-note" role="status">No avatar effects match. Try another search or turn off Favorites.</p> : null}
    </div> : <EffectsPage key={tab} category={tab as "background" | "overlay" | "card" | "cursor"} embedded />}
  </Card>;
}
