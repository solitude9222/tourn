import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LinkerPreview } from "../components/LinkerPreview";
import { useDash } from "./context";
import { Button, Card, CardHead, Icon } from "./ui";

type Piece = "views" | "likes" | "location" | "joined" | "audio" | "widgets";
const PIECES: { id: Piece; label: string }[] = [
  { id: "views", label: "Views" }, { id: "likes", label: "Reactions" },
  { id: "location", label: "Location" }, { id: "joined", label: "Join date" },
  { id: "audio", label: "Audio" }, { id: "widgets", label: "Widgets" },
];
const CORNERS = [
  { id: "page-tr", label: "Page · top right" }, { id: "card-tr", label: "Card · top right" },
  { id: "card-bl", label: "Card · bottom left" }, { id: "card-br", label: "Card · bottom right" },
  { id: "page-bl", label: "Page · bottom left" }, { id: "page-br", label: "Page · bottom right" },
];
const AUDIO = [
  { id: "page-top", label: "Page · top" }, { id: "card-bottom", label: "Inside card" },
  { id: "below-card", label: "Below card" }, { id: "page-bottom", label: "Page · bottom" },
];
const WIDTH = 1120, HEIGHT = 900;

export function LayoutPreview() {
  const { user, about, widgets, badges, links, setAbout } = useDash();
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selected, setSelected] = useState<Piece>("views");
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Piece | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const design = about.design;
  const widgetZones = design.layout === "stacked" ? [{ id: "below", label: "Below card" }] : [{ id: "inside", label: "Inside card" }, { id: "below", label: "Below card" }];
  const zones = selected === "audio" ? AUDIO : selected === "widgets" ? widgetZones : CORNERS;
  const field = (piece: Piece) => ({ views: "viewSlot", likes: "likeSlot", location: "locationSlot", joined: "joinedSlot", audio: "audioSlot", widgets: "widgetsPosition" } as const)[piece];
  const currentSlot = selected === "widgets" && design.layout === "stacked" ? "below" : design[field(selected)];

  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    const resize = () => setScale(Math.min(1, host.clientWidth / WIDTH, Math.max(280, window.innerHeight - 260) / HEIGHT));
    const observer = new ResizeObserver(resize); observer.observe(host); window.addEventListener("resize", resize); resize();
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, []);

  const measure = () => {
    const host = stage.current, card = host?.querySelector(".profile-preview");
    if (!host || !card) return;
    const a = host.getBoundingClientRect(), b = card.getBoundingClientRect();
    setBox({ x: b.left - a.left, y: b.top - a.top, width: b.width, height: b.height });
  };
  const stop = () => { drag.current = null; setDragging(false); setHover(null); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") stop(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const place = (piece: Piece, slot: string) => {
    setAbout(current => ({ ...current, design: { ...current.design, [field(piece)]: slot } }));
    stop();
  };
  const targetAt = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-layout-slot]");
    return target && stage.current?.contains(target) ? target.dataset.layoutSlot || null : null;
  };
  const position = (id: string): CSSProperties => {
    const right = box.x + box.width, bottom = box.y + box.height;
    const center = Math.max(60, box.x + box.width / 2);
    switch (id) {
      case "page-tr": return { top: 12, right: 12 };
      case "page-bl": return { bottom: 12, left: 12 };
      case "page-br": return { bottom: 12, right: 12 };
      case "card-tr": return { top: box.y + 4, left: Math.max(8, right - 130) };
      case "card-bl": return { top: bottom - 30, left: box.x + 4 };
      case "card-br": return { top: bottom - 30, left: Math.max(8, right - 130) };
      case "page-top": return { top: 12, left: "50%", transform: "translateX(-50%)" };
      case "page-bottom": return { bottom: 12, left: "50%", transform: "translateX(-50%)" };
      case "inside": case "card-bottom": return { top: Math.max(12, bottom - 32), left: center, transform: "translateX(-50%)" };
      default: return { top: Math.min(HEIGHT * scale - 42, bottom + 14), left: center, transform: "translateX(-50%)" };
    }
  };

  return <Card className="tw-placement-card">
    <CardHead icon="layout" title="Arrange your profile" subtitle="Choose an element and its position, or drag it on the preview. Moving elements keeps their size." />
    <div className="tw-placement-editor">
      <div className="tw-placement-inspector">
        <span className="tw-section-label">Element</span>
        <div className="tw-placement-pieces">{PIECES.map(piece => <button type="button" aria-pressed={selected === piece.id} key={piece.id} onClick={() => { stop(); setSelected(piece.id); }}>{piece.label}</button>)}</div>
        <span className="tw-section-label">Position</span>
        <div className="tw-placement-options">{zones.map(zone => <button type="button" aria-pressed={currentSlot === zone.id} key={zone.id} onClick={() => place(selected, zone.id)}><Icon name={currentSlot === zone.id ? "check" : "move"} size={14} />{zone.label}</button>)}</div>
        <p className="tw-foot-note">The whole preview scales to fit this panel. Widget and player sizes stay the same within the page.</p>
        {selected === "widgets" && design.layout === "stacked" ? <p className="tw-foot-note">Stacked keeps widgets below the profile card.</p> : null}
        {dragging ? <Button onClick={stop}>Cancel move</Button> : null}
      </div>
      <div className={`tw-placement-stage${dragging ? " is-dragging" : ""}`} ref={stage} style={{ height: HEIGHT * scale, "--placement-scale": scale } as CSSProperties}
        onPointerDown={event => {
          if (event.button !== 0 || (event.target as Element).closest("[data-layout-slot]")) return;
          const piece = (event.target as Element).closest<HTMLElement>("[data-detail]")?.dataset.detail as Piece;
          if (!PIECES.some(item => item.id === piece)) return;
          event.preventDefault(); measure(); setSelected(piece); drag.current = piece; setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => { if (drag.current) setHover(targetAt(event.clientX, event.clientY)); }}
        onPointerUp={event => {
          const piece = drag.current, slot = targetAt(event.clientX, event.clientY);
          if (piece && slot) place(piece, slot); else stop();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={stop} onLostPointerCapture={stop}>
        <div className="tw-placement-canvas" style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})` }}>
          <LinkerPreview user={user} about={{ ...about, design: { ...design, slideshow: false, slideshowLinks: false, slideshowBadges: false, slideshowAbout: false, cardStyle: design.cardStyle === "slide" ? "default" : design.cardStyle, tilt: 0, stackTilt: false } }} widgets={widgets} badges={badges} links={links} interactive={false} showEntry={false} showMetadata={false} />
        </div>
        {dragging ? <div className="tw-placement-targets">{zones.map(zone => <button type="button" key={zone.id} data-layout-slot={zone.id} className={hover === zone.id ? "is-hot" : ""} style={position(zone.id)} onClick={() => place(selected, zone.id)}>{zone.label}</button>)}</div> : null}
      </div>
    </div>
  </Card>;
}
