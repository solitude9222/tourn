import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
/* ---------------------------------------------------------------------------
   Customize > Card — the card layout, the widget positions and the card's
   colours in one place. The layout only decides how much room the card and
   its widgets take; colour, background and blur stay where they were.
   --------------------------------------------------------------------------- */

import { createProfileSection, type AboutLayout, type ProfileSection, type ProfileSectionKind } from "../../lib/about";
import { SectionEditor } from "../SectionEditor";
import { fileToDataUrl } from "../files";
import { FontPicker } from "../../components/FontPicker";
import { LocationGlyph, ViewsGlyph } from "../../components/ProfilePreview";
import { ThumbIcon } from "../../components/Reactions";
import { TECH_STACK, techCategory, techIconUrl } from "../../lib/techStack";
import { LinkerPreview } from "../../components/LinkerPreview";
import { useDash } from "../context";
import { FileUpload, Button, Card, CardHead, ColorField, Field, Icon, Select, Slider, Toggle, TextInput, Textarea } from "../ui";

const SECTION_KINDS: { id: ProfileSectionKind; label: string; hint: string }[] = [
  { id: "project", label: "Projects", hint: "Artwork, stack and links" },
  { id: "interest", label: "Interests", hint: "Pick animes from the library" },
];

/** The three page layouts and the positions each one starts with. */
const PAGE_LAYOUTS: {
  id: AboutLayout;
  name: string;
  description: string;
}[] = [
  {
    id: "stacked",
    name: "Stacked",
    description:
      "Your profile first, then separate widget cards and music below.",
  },
  {
    id: "left",
    name: "Left aligned",
    description:
      "Avatar, text and links aligned left inside the centred card, with widgets kept inside.",
  },
  {
    id: "centered",
    name: "Centered",
    description: "Picture and name centred, with the widget and link blocks below.",
  },
];

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

function LayoutPreview() {
  const { user, about, widgets, badges, links, setAbout, notify } = useDash();
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragKind | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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
    notify("Placed", `${label} moved. Save to publish it.`);
    setDragging(null);
    setHover(null);
  };

  const zones = dragging === "audio" ? AUDIO_ZONES : DETAIL_ZONES;

  const zoneStyle = (id: string): CSSProperties => {
    const card = box;
    switch (id) {
      case "page-tr": return { top: 10, right: 10 };
      case "page-bl": return { bottom: 10, left: 10 };
      case "page-br": return { bottom: 10, right: 10 };
      case "page-top": return { top: 10, left: "50%", transform: "translateX(-50%)" };
      case "page-bottom": return { bottom: 10, left: "50%", transform: "translateX(-50%)" };
      case "card-tr": return card ? { top: card.y + 8, left: card.x + card.w - 152 } : { top: "36%", left: "52%" };
      case "card-bl": return card ? { top: card.y + card.h - 46, left: card.x + 8 } : { top: "56%", left: "36%" };
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
        subtitle="Press and hold a detail on the card, then drop it on one of the ghost copies."
      />

      <div
        className={`tw-layout-stage${dragging ? " is-dragging" : ""}`}
        ref={stageRef}
        onPointerDown={(event) => {
          // Grab the widget that is actually on the card, so dragging feels
          // like moving the real thing instead of its label chip.
          const target = (event.target as HTMLElement).closest("[data-detail]") as HTMLElement | null;
          const kind = target?.dataset.detail as DragKind | undefined;
          if (!kind) return;
          event.preventDefault();
          measure();
          setDragging(kind);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-slot]") as HTMLElement | null;
          setHover(target?.dataset.slot ?? null);
        }}
        onPointerUp={(event) => {
          if (!dragging) return;
          // A press that starts on a widget ends somewhere over the overlay,
          // so the drop has to be read from the point rather than the target.
          const slot = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest("[data-slot]")
            ?.getAttribute("data-slot");
          if (slot) place(dragging, slot);
          else { setDragging(null); setHover(null); }
        }}
      >
        <div className="tw-layout-stage-scaler">
          <LinkerPreview
            user={user}
            about={about}
            widgets={widgets}
            badges={badges}
            links={links}
            interactive={false}
            showEntry={false}
          />
        </div>
        {dragging ? (
          <div className="tw-drop-layer">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                data-slot={zone.id}
                className={`tw-drop-zone${hover === zone.id ? " is-hot" : ""}`}
                style={zoneStyle(zone.id)}
                onPointerEnter={() => setHover(zone.id)}
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
export function LayoutPage({
  section = "layout",
}: {
  /** Which slice of the card editor this route is. The sidebar owns the switch. */
  section?: "layout" | "style" | "sections";
} = {}) {
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<{ from: number; over: number } | null>(null);
  const [drag, setDragState] = useState<{ from: number; over: number } | null>(null);
  const setDrag = (next: { from: number; over: number } | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const { about, setAbout, notify, user, badges, links } = useDash();
  const design = about.design;

  const updateDesign = (patch: Partial<typeof design>) =>
    setAbout((current) => ({ ...current, design: { ...current.design, ...patch } }));

  const updateColors = (patch: Partial<typeof design.colors>) =>
    updateDesign({ colors: { ...design.colors, ...patch } });

  const updateDecoration = (patch: Partial<typeof about.assets.decoration>) =>
    setAbout((current) => ({
      ...current,
      assets: {
        ...current.assets,
        decoration: { ...current.assets.decoration, ...patch },
      },
    }));

  const patchSection = (id: string, patch: Partial<ProfileSection>) =>
    updateDesign({ sections: design.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)) });

  const addSection = (kind: ProfileSectionKind) => {
    if (design.sections.length >= 24) return;
    updateDesign({ sectionsEnabled:true, sections: [...design.sections, createProfileSection(kind)] });
  };

  /** Games are one more section, not a page of their own. */
  const addGamesSection = () => {
    if (design.sections.length >= 24) return;
    const section = { ...createProfileSection("interest"), title: "Games", subtitle: "What I play" };
    updateDesign({ sectionsEnabled: true, sections: [...design.sections, section] });
  };

  const moveSection = (from: number, to: number) => {
    if (from === to || to < 0 || to >= design.sections.length) return;
    const sections = [...design.sections];
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    updateDesign({ sections });
  };

  /*
     Reorder with a plain pointer: the card never leaves the list, so no drag
     ghost of its artwork floats around, and nothing re-renders mid-drag.
     A hairline marks where the card will land.
  */
  const beginSectionDrag = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    const ids = design.sections.map((item) => item.id);
    setDrag({ from: index, over: index });

    const targetIndex = (clientY: number) => {
      for (let i = 0; i < ids.length; i += 1) {
        const node = sectionRefs.current.get(ids[i]);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return ids.length - 1;
    };

    // Pointer events fire faster than the page paints; one update per frame
    // keeps a long section list from re-rendering on every pixel.
    let frame = 0;
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const over = targetIndex(moveEvent.clientY);
        if (dragRef.current?.over === over) return;
        setDrag({ from: dragRef.current?.from ?? index, over });
      });
    };

    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.classList.remove("tw-sorting");
      const state = dragRef.current;
      setDrag(null);
      if (state) moveSection(state.from, state.over);
    };

    document.body.classList.add("tw-sorting");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  return (
    <div className="tw-card-page">
      <div className="tw-card-main" key={section}>
      {section === "layout" ? <Card>
        <CardHead
          icon="layout"
          title="Page layout"
          subtitle="Choose a balanced starting point, then adjust the composition."
        />

        <div className="tw-layout-cards">
          {PAGE_LAYOUTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`tw-layout-card${design.layout === preset.id ? " is-active" : ""}`}
              onClick={() =>
                updateDesign({
                  layout: preset.id,
                  badgePosition: "default",
                  cardPadding: 32,
                  cardWidth: 720,
                  widgetsPosition: preset.id === "stacked" ? "below" : "inside",
                  audioSlot: "below-card",
                  pfpPosition: preset.id === "centered" ? "above" : "left",
                  namePosition: preset.id === "centered" ? "center" : "left",
                  bioPosition: preset.id === "centered" ? "center" : "left",
                })
              }
            >
              <div className={`tw-layout-thumb tw-layout-thumb--page-${preset.id}`}>
                <span className="tw-layout-mini">
                  <span className="tw-layout-mini-head">
                    <span className="tw-layout-mini-avatar" />
                    <span className="tw-layout-mini-lines">
                      <i />
                      <i />
                    </span>
                  </span>
                  <span className="tw-layout-mini-grid">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="tw-layout-mini-foot" />
                </span>
              </div>
              <b>{preset.name}</b>
              <small>{preset.description}</small>
            </button>
          ))}
        </div>
      </Card> : null}

      {section === "layout" ? <LayoutPreview /> : null}
      {section === "layout" ? <details className="tw-advanced">
        <summary>Card motion<small>tilt, and moving the whole stack together</small></summary>
        <Card><CardHead icon="move" title="Card motion" subtitle="Tilt the profile by itself or move the entire stacked group together." /><div className="tw-form-grid"><Slider label="Card tilt" value={design.tilt} min={0} max={24} suffix="°" onChange={(tilt) => updateDesign({ tilt })} /><div className="tw-inline-toggle"><span><b>Tilt stacked cards together</b><small>Applies to the profile, widget cards and audio in Stacked layout.</small></span><Toggle label="Tilt stacked cards together" checked={design.stackTilt} onChange={(stackTilt) => updateDesign({ stackTilt, ...(stackTilt && design.tilt === 0 ? { tilt: 8 } : {}) })} /></div></div></Card>
      </details> : null}
      {section === "layout" ? <Card>
        <div className="tw-inline-toggle">
          <span>
            <b>Custom composition</b>
            <small>Move the avatar, name and bio away from the layout default.</small>
          </span>
          <Toggle
            label="Custom composition"
            checked={design.advancedLayout === true}
            onChange={(advancedLayout) => updateDesign({ advancedLayout })}
          />
        </div>
      </Card> : null}
      {section === "layout" && design.advancedLayout === true ? <Card><CardHead icon="user" title="Card composition" subtitle="Make the same layout centred or portrait-led." />
        <div className="tw-form-grid">            
          <Field label="Avatar placement"><Select value={design.pfpPosition} options={["default", "left", "right", "above", "center", "top-right"].map((value) => ({ value, label: value }))} onChange={(pfpPosition) => updateDesign({ pfpPosition: pfpPosition as typeof design.pfpPosition })} /></Field>
          <Field label="Badge placement"><Select value={design.badgePosition} options={["default", "above-name", "top-right", "bottom", "beside-avatar", "hidden"].map((value) => ({ value, label: value }))} onChange={(badgePosition) => updateDesign({ badgePosition: badgePosition as typeof design.badgePosition })} /></Field>
          <Field label="Name alignment"><Select value={design.namePosition} options={["default", "left", "center", "right"].map((value) => ({ value, label: value }))} onChange={(namePosition) => updateDesign({ namePosition: namePosition as typeof design.namePosition })} /></Field>
          <Field label="Bio alignment"><Select value={design.bioPosition} options={["default", "left", "center", "right"].map((value) => ({ value, label: value }))} onChange={(bioPosition) => updateDesign({ bioPosition: bioPosition as typeof design.bioPosition })} /></Field>
          <Field label="Avatar shape"><Select value={design.avatarShape} options={["circle", "rounded", "square", "hexagon"].map((value) => ({ value, label: value }))} onChange={(avatarShape) => updateDesign({ avatarShape: avatarShape as typeof design.avatarShape })} /></Field>
          <FontPicker label="Profile font" value={design.font} onChange={(font) => updateDesign({ font })} />
          <Field label="Custom profile font" hint="Upload your own WOFF, WOFF2 or TTF file under 500 KB."><FileUpload aria-label="Custom profile font" accept=".woff,.woff2,.ttf,.otf" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 500_000 || !/\.(woff2?|ttf|otf)$/i.test(file.name)) { notify("Font", "Choose a font file under 500 KB."); return; } const customFontUrl = await fileToDataUrl(file); updateDesign({ customFontUrl }); }} />{design.customFontUrl ? <Button onClick={() => updateDesign({ customFontUrl: "" })}>Remove custom font</Button> : null}</Field>
          <Slider label="Avatar size" value={design.avatarSize} min={40} max={180} suffix="px" onChange={(avatarSize) => updateDesign({ avatarSize })} />
          <Slider label="Name size" value={design.nameSize} min={16} max={64} suffix="px" onChange={(nameSize) => updateDesign({ nameSize })} />
          <Slider label="Bio size" value={design.bioSize} min={12} max={30} suffix="px" onChange={(bioSize) => updateDesign({ bioSize })} />
          <Slider label="Card padding" value={design.cardPadding} min={0} max={64} suffix="px" onChange={(cardPadding) => updateDesign({ cardPadding })} />
        </div>
      </Card> : null}
      {section === "style" ? <Card>
        <CardHead
          icon="palette"
          title="Card style"
          subtitle="Colours, surface and size of the card itself."
        />

        <div className="tw-split" style={{ marginTop: 20 }}>
          <div className="tw-split-col">
            <span className="tw-split-label">Colours</span>
            <ColorField
              label="Accent"
              value={design.colors.accent}
              onChange={(value) => updateColors({ accent: value })}
            />
            <ColorField
              label="Card colour"
              value={design.colors.card}
              onChange={(value) => updateColors({ card: value })}
            />
            <ColorField
              label="Border colour"
              value={design.colors.border}
              onChange={(value) => updateColors({ border: value })}
            />
            <ColorField
              label="Text colour"
              value={design.colors.text}
              onChange={(value) => updateColors({ text: value })}
            />
            <ColorField
              label="Muted text"
              value={design.colors.muted}
              onChange={(value) => updateColors({ muted: value })}
            />
          </div>

          <div className="tw-split-col">
            <span className="tw-split-label">Sizes &amp; sliders</span>
            <Slider
              label="Opacity"
              value={Math.round(design.backgroundOpacity * 100)}
              min={0}
              max={100}
              format={(value) => `${value}%`}
              ticks={["0%", "50%", "100%"]}
              onChange={(value) => updateDesign({ backgroundOpacity: value / 100 })}
            />
            <Slider
              label="Blur"
              value={design.backgroundBlur}
              min={0}
              max={24}
              onChange={(value) => updateDesign({ backgroundBlur: value })}
            />
            <Slider
              label="Border width"
              value={design.borderWidth}
              min={0}
              max={12}
              suffix="px"
              onChange={(value) => updateDesign({ borderWidth: value })}
            />
            <Slider
              label="Border radius"
              value={design.cardRadius}
              min={0}
              max={72}
              suffix="px"
              onChange={(value) => updateDesign({ cardRadius: value })}
            />
            <Slider
              label="Border opacity"
              value={Math.round(design.borderOpacity * 100)}
              min={0}
              max={100}
              suffix="%"
              ticks={["0%", "50%", "100%"]}
              onChange={(value) => updateDesign({ borderOpacity: value / 100 })}
            />
            <div className="tw-inline-toggle">
              <span>
                <b>Make card transparent</b>
                <small>Remove all card styling</small>
              </span>
              <Toggle
                checked={design.backgroundOpacity === 0}
                onChange={(checked) => updateDesign({ backgroundOpacity: checked ? 0 : 0.08 })}
                label="Make card transparent"
              />
            </div>
          </div>
        </div>
      </Card> : null}

      {section === "style" ? <Card>
        <CardHead
          icon="user"
          title="Profile picture"
          subtitle="Discord avatar decorations, plus how your picture sits inside the frame."
        />

        <div className="tw-form-grid" style={{ marginTop: 16 }}>
          <Field label="Picture zoom">
            <Slider
              label="Zoom"
              value={Math.round((about.assets.decoration.zoom ?? 1) * 100)}
              min={60}
              max={200}
              suffix="%"
              onChange={(value) => updateDecoration({ zoom: value / 100 })}
            />
          </Field>
          <Field label="Picture rotation">
            <Slider
              label="Rotation"
              value={about.assets.decoration.rotate ?? 0}
              min={-180}
              max={180}
              suffix="°"
              onChange={(value) => updateDecoration({ rotate: value })}
            />
          </Field>
        </div>
      </Card> : null}
      {section === "sections" ? <Card><CardHead icon="layers" title="Sections" subtitle="Everything below your card: projects, games and the animes you like. Drag the handle to set the order." actions={<span className="tw-active-count">{design.sections.length} / 24</span>} />
        <p className="tw-foot-note">Project cards show your real tech stack and links. Interest cards pull real artwork and metadata from the anime and game libraries.</p>
        <div className="tw-toggle-grid">
          <div className="tw-inline-toggle"><b>Enable sections</b><Toggle label="Enable sections" checked={design.sectionsEnabled===true} onChange={sectionsEnabled=>updateDesign({sectionsEnabled})}/></div>
          <div className="tw-inline-toggle"><b>Vertical slideshow</b><Toggle label="Vertical slideshow" checked={design.slideshow===true} onChange={slideshow=>updateDesign({slideshow})}/></div>
          <div className="tw-inline-toggle"><b>One Interests list</b><small>Animes and games share a single section kind.</small><Toggle label="Group games with interests" checked={design.groupInterests===true} onChange={groupInterests=>updateDesign({groupInterests})}/></div>
          {design.slideshow === true ? <>
            <div className="tw-inline-toggle"><b>About slide</b><Toggle label="About me slide" checked={design.slideshowAbout===true} onChange={slideshowAbout=>updateDesign({slideshowAbout})}/></div>
            <div className="tw-inline-toggle"><b>Links slide</b><Toggle label="Links slide" checked={design.slideshowLinks===true} onChange={slideshowLinks=>updateDesign({slideshowLinks})}/></div>
            <div className="tw-inline-toggle"><b>Badges slide</b><Toggle label="Badges slide" checked={design.slideshowBadges===true} onChange={slideshowBadges=>updateDesign({slideshowBadges})}/></div>
          </> : null}
        </div>
        {design.slideshowAbout === true ? (
          <details className="tw-about-editor">
            <summary className="tw-about-editor-head">
              <span>
                <b>About slide</b>
                <small>{design.aboutSlide.title.trim() || "Untitled"} · {design.aboutSlide.tags.length} tag{design.aboutSlide.tags.length === 1 ? "" : "s"}</small>
              </span>
              <span className="tw-details-hint">Edit</span>
            </summary>
            <div className="tw-form-grid">
              <Field label="Title">
                <TextInput
                  value={design.aboutSlide.title}
                  maxLength={100}
                  placeholder="About me"
                  onChange={(event) => updateDesign({ aboutSlide: { ...design.aboutSlide, title: event.target.value } })}
                />
              </Field>
              <Field label="Subtitle" hint="One line under the title.">
                <TextInput
                  value={design.aboutSlide.subtitle}
                  maxLength={180}
                  placeholder="Designer, builder, night owl"
                  onChange={(event) => updateDesign({ aboutSlide: { ...design.aboutSlide, subtitle: event.target.value } })}
                />
              </Field>
              <Field label="Writing" className="tw-span-2">
                <Textarea
                  rows={4}
                  value={design.aboutSlide.text}
                  maxLength={4000}
                  placeholder="What you do, what you are into…"
                  onChange={(event) => updateDesign({ aboutSlide: { ...design.aboutSlide, text: event.target.value } })}
                />
              </Field>
            </div>

            <div className="tw-inline-toggle tw-about-projects-toggle"><span><b>Show projects on this page</b><small>Repeat your project cards under the writing.</small></span><Toggle label="Show projects on the About slide" checked={design.aboutSlide.showProjects === true} onChange={showProjects => updateDesign({ aboutSlide: { ...design.aboutSlide, showProjects } })} /></div>

            <details className="tw-tag-drawer">
              <summary>
                <b>Speciality tags</b>
                <small>{design.aboutSlide.tags.length ? `${design.aboutSlide.tags.length} selected` : "Pick the skills this is about"}</small>
              </summary>
            <div className="tw-about-tag-groups">
              {["Languages", "Frontend", "Backend & data", "Tools & platforms"].map((group) => {
                const items = TECH_STACK.filter((tech) => (techCategory(tech.id) === group ? true : group === "Tools & platforms" && !["Languages", "Frontend", "Backend & data"].includes(techCategory(tech.id))));
                if (!items.length) return null;
                return (
                  <div className="tw-tag-group" key={group}>
                    <span className="tw-tag-group-label">{group === "Tools & platforms" ? "Apps & tools" : group}</span>
                    <div className="tw-tag-row">
                      {items.map((tech) => {
                        const on = design.aboutSlide.tags.includes(tech.id);
                        return (
                          <button
                            key={tech.id}
                            type="button"
                            className={`tw-tag-pill${on ? " is-on" : ""}`}
                            aria-pressed={on}
                            onClick={() =>
                              updateDesign({
                                aboutSlide: {
                                  ...design.aboutSlide,
                                  tags: on
                                    ? design.aboutSlide.tags.filter((id) => id !== tech.id)
                                    : [...design.aboutSlide.tags, tech.id].slice(0, 40),
                                },
                              })
                            }
                          >
                            <img src={techIconUrl(tech)} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                            {tech.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </details>
          </details>
        ) : null}

        <div className={`tw-section-list${drag ? " is-sorting" : ""}`}>
          {design.sections.map((section, index) => (
            <div
              key={section.id}
              className={`tw-section-card${drag?.from === index ? " is-dragging" : ""}`}
              ref={(node) => {
                if (node) sectionRefs.current.set(section.id, node);
                else sectionRefs.current.delete(section.id);
              }}
            >
              {drag && drag.from !== index && drag.over === index ? (
                <span className={`tw-section-drop${drag.from < index ? " is-below" : ""}`} aria-hidden="true" />
              ) : null}
              <SectionEditor
                section={section}
                index={index}
                onMoveDown={index < design.sections.length - 1 ? () => moveSection(index, index + 1) : undefined}
                handle={
                  <button
                    type="button"
                    className="tw-section-grip"
                    aria-label={`Reorder ${section.title || "section"}`}
                    title="Drag to reorder"
                    onPointerDown={(event) => beginSectionDrag(event, index)}
                  >
                    ⠿
                  </button>
                }
                onChange={(patch) => patchSection(section.id, patch)}
                onRemove={() => updateDesign({ sections: design.sections.filter((item) => item.id !== section.id) })}
                onMoveUp={() => moveSection(index, index - 1)}
              />
            </div>
          ))}
        </div>
        {!design.sections.length ? <p className="tw-empty-note">No sections yet — add a project, a game list, or an anime you like.</p> : null}
        <div className="tw-section-add">
          <span className="tw-section-add-label">Add a section</span>
          <div className="tw-section-add-row">
            {SECTION_KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                className={`tw-section-add-btn tw-section-add-btn--${kind.id}`}
                disabled={design.sections.length >= 24}
                onClick={() => addSection(kind.id)}
              >
                <span className="tw-section-kind-dot" aria-hidden="true" />
                <b>{kind.label}</b>
                <small>{kind.hint}</small>
              </button>
            ))}
            {design.groupInterests === true ? null : (
              <button
                type="button"
                className="tw-section-add-btn tw-section-add-btn--interest"
                disabled={design.sections.length >= 24}
                onClick={addGamesSection}
              >
                <span className="tw-section-kind-dot" aria-hidden="true" />
                <b>Games</b>
                <small>Pick games from the library</small>
              </button>
            )}
          </div>
        </div>
      </Card> : null}
      </div>
    </div>
  );
}
