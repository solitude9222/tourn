import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LinkerPreview } from "../components/LinkerPreview";
import { LocationGlyph, ViewsGlyph } from "../components/ProfilePreview";
import { ThumbIcon } from "../components/Reactions";
import { useDash } from "./context";
import { Card, CardHead, Icon } from "./ui";
const StablePreview = memo(LinkerPreview);

type DragKind = "views" | "likes" | "location" | "joined" | "audio";

const DETAIL_ZONES: { id: string; label: string }[] = [
  { id: "page-tr", label: "Page top right" },
  { id: "card-tr", label: "Card top right" },
  { id: "card-bl", label: "Card bottom left" },
  { id: "card-br", label: "Card bottom right" },
  { id: "page-bl", label: "Page bottom left" },
  { id: "page-br", label: "Page bottom right" },
];

const AUDIO_ZONES: { id: string; label: string }[] = [
  { id: "page-top", label: "Page top" },
  { id: "card-bottom", label: "Card bottom" },
  { id: "below-card", label: "Below card" },
  { id: "page-bottom", label: "Page bottom" },
];

export function LayoutPreview() {
  const { user, about, widgets, badges, links, setAbout, notify } = useDash();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragKind | null>(null);
  const hoverRef = useRef<string | null>(null);
  const frameRef = useRef(0);
  const pointRef = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState<DragKind | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const stop = () => { dragRef.current = null; hoverRef.current = null; setDragging(null); setHover(null); if (frameRef.current) cancelAnimationFrame(frameRef.current); frameRef.current = 0; };
  useEffect(() => {
    const host = stageRef.current;
    if (!host) return;
    const resize = () => setScale(Math.min(1, host.clientWidth / 1120, Math.max(320, innerHeight - 220) / 900));
    const observer = new ResizeObserver(resize); observer.observe(host); window.addEventListener("resize", resize); resize();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") stop(); };
    window.addEventListener("keydown", escape);
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); window.removeEventListener("keydown", escape); if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);
  const previewAbout = useMemo(() => ({ ...about, design: { ...about.design, slideshow: false, slideshowLinks: false, slideshowBadges: false, slideshowAbout: false, cardStyle: about.design.cardStyle === "slide" ? "default" as const : about.design.cardStyle, tilt: 0, stackTilt: false } }), [about]);
  const targetAt = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-slot]");
    return target && stageRef.current?.contains(target) ? target.dataset.slot ?? null : null;
  };
  // The zone buttons are drawn over the real card, so measure where it landed
  // in the stage instead of guessing from the layout name.
  const measure = () => {
    const stage = stageRef.current;
    const card = stage?.querySelector(".profile-preview") as HTMLElement | null;
    if (!stage || !card) return;
    const s = stage.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    setBox({ x: c.left - s.left, y: c.top - s.top, w: c.width, h: c.height });
  };

  const fieldFor = (kind: DragKind) =>
    kind === "views"
      ? "viewSlot"
      : kind === "likes"
        ? "likeSlot"
        : kind === "location"
          ? "locationSlot"
          : kind === "joined"
            ? "joinedSlot"
            : "audioSlot";

  const place = (kind: DragKind, slot: string) => {
    setAbout((current) => ({ ...current, design: { ...current.design, [fieldFor(kind)]: slot } }));
    const label =
      kind === "audio"
        ? "Audio player"
        : kind === "likes"
          ? "Likes"
          : kind === "views"
            ? "Views"
            : kind === "location"
              ? "Location"
              : "Account date";
    notify("Placed", `${label} moved. Changes publish automatically.`);
    stop();
  };

  const zones = dragging === "audio" ? AUDIO_ZONES : DETAIL_ZONES;

  const zoneStyle = (id: string): CSSProperties => {
    const card = box;
    const ghostWidth = Math.min(152, Math.max(72, (card?.w ?? 320) / 2 - 10));
    switch (id) {
      case "page-tr": return { top: 10, right: 10 };
      case "page-bl": return { bottom: 10, left: 10 };
      case "page-br": return { bottom: 10, right: 10 };
      case "page-top": return { top: 10, left: "50%", transform: "translateX(-50%)" };
      case "page-bottom": return { bottom: 10, left: "50%", transform: "translateX(-50%)" };
      case "card-tr": return card ? { top: card.y + 8, left: card.x + card.w - ghostWidth, width: ghostWidth, minWidth: 0 } : { top: "36%", left: "52%" };
      case "card-bl": return card ? { top: card.y + card.h - 46, left: card.x + 8, width: ghostWidth, minWidth: 0 } : { top: "56%", left: "36%" };
      case "card-br": return card ? { top: card.y + card.h - 46, left: card.x + card.w - 152 } : { top: "56%", left: "52%" };
      case "card-bottom": return card ? { top: card.y + card.h - 46, left: card.x + card.w / 2 - 76 } : { top: "56%", left: "45%" };
      case "below-card": return card ? { top: card.y + card.h + 8, left: card.x + card.w / 2 - 76 } : { top: "64%", left: "45%" };
      default: return {};
    }
  };

  return (
    <Card>
      <CardHead
        icon="move"
        title="Layout preview"
        subtitle="Drag a detail or the audio player onto a ghost position. Press Escape to cancel."
      />

      <div
        className={`tw-layout-stage${dragging ? " is-dragging" : ""}`}
        ref={stageRef}
        style={{ height: 900 * scale, minHeight: 0 }}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onPointerDown={(event) => {
          // Grab the widget that is actually on the card, so dragging feels
          // like moving the real thing instead of its label chip.
          const target = (event.target as HTMLElement).closest("[data-detail]") as HTMLElement | null;
          const kind = target?.dataset.detail as DragKind | undefined;
          if (!kind || !["views", "likes", "location", "joined", "audio"].includes(kind) || event.button !== 0) return;
          event.preventDefault();
          measure();
          dragRef.current = kind; setDragging(kind);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          pointRef.current = { x: event.clientX, y: event.clientY };
          if (frameRef.current) return;
          frameRef.current = requestAnimationFrame(() => { frameRef.current = 0; const next = targetAt(pointRef.current.x, pointRef.current.y); if (next !== hoverRef.current) { hoverRef.current = next; setHover(next); } });
        }}
        onPointerUp={(event) => {
          const kind = dragRef.current;
          if (!kind) return;
          const slot = targetAt(event.clientX, event.clientY);
          if (slot) place(kind, slot); else stop();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <div className="tw-layout-stage-scaler" style={{ width: 1120, height: 900, left: "50%", marginLeft: -560 * scale, transform: `scale(${scale})`, transformOrigin: "top left", right: "auto", bottom: "auto" }}>
          <StablePreview
            user={user}
            about={previewAbout}
            widgets={widgets}
            badges={badges}
            links={links}
            interactive={false}
            showEntry={false}
            showMetadata={false}
          />
        </div>
        {dragging ? (
          <div className="tw-drop-layer" role="group" aria-label="Drop positions">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                data-slot={zone.id}
                className={`tw-drop-zone${hover === zone.id ? " is-hot" : ""}`}
                style={zoneStyle(zone.id)}
                onFocus={() => setHover(zone.id)}
                onBlur={() => setHover(null)}
                onClick={() => place(dragging, zone.id)}
                aria-label={zone.label}
              >
                <span className={`tw-ghost tw-ghost--${dragging}`}>
                  {dragging === "audio" ? (
                    <>
                      <span className="tw-ghost-cover" />
                      <span className="tw-ghost-lines"><i /><i /></span>
                      <span className="tw-ghost-play" />
                    </>
                  ) : (
                    <>
                      {dragging === "views" ? (
                        <ViewsGlyph size={22} />
                      ) : dragging === "location" ? (
                        <LocationGlyph size={21} />
                      ) : dragging === "likes" ? (
                        <ThumbIcon size={22} />
                      ) : (
                        <Icon name="calendar" size={21} />
                      )}
                      {dragging === "likes" ? (
                        <><b>19</b><b>5</b></>
                      ) : dragging === "views" ? (
                        <b>1</b>
                      ) : (
                        <i className="tw-ghost-word" />
                      )}
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="tw-foot-note">
        Audio: below the card, the card's bottom edge, or the top / bottom of the page (offset from
        the screen edge). Everything else: any of the six corners, on the card or the page.
      </p>
    </Card>
  );
}
