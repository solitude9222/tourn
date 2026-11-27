import {StudioSettings} from "../StudioSettings";
import { LayoutPreview } from "../LayoutPreview";
import { contrastRatio } from "../appearance";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
/* ---------------------------------------------------------------------------
   Customize > Card — the card layout, the widget positions and the card's
   colours in one place. The layout only decides how much room the card and
   its widgets take; colour, background and blur stay where they were.
   --------------------------------------------------------------------------- */

import { createProfileSection, DEFAULT_ABOUT_DESIGN, type AboutLayout, type ProfileSection, type ProfileSectionKind } from "../../lib/about";
import { SectionEditor } from "../SectionEditor";
import { fileToDataUrl } from "../files";
import { SkillPicker } from "../SkillPicker";
import { LinkerPreview } from "../../components/LinkerPreview";
import { useDash } from "../context";
import { FileUpload, Button, Card, CardHead, ColorField, Field, Icon, Select, Slider, Toggle, TextInput, Textarea } from "../ui";

const SECTION_KINDS: { id: ProfileSectionKind; label: string; hint: string }[] = [
  { id: "project", label: "Projects", hint: "Artwork, stack and links" },
  { id: "interest", label: "Interests", hint: "Anime, games, music and films" },
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
      "A compact identity row, centered bio and fixed-size widgets inside your card.",
  },
  {
    id: "left",
    name: "Left aligned",
    description:
      "A left-aligned identity inside a centered card, with a full-width bio below.",
  },
  {
    id: "centered",
    name: "Centered",
    description: "Picture and name centred, with the widget and link blocks below.",
  },
];

export function LayoutPage({
  section = "layout",
  filterKind,
}: {
  /** Which slice of the card editor this route is. The sidebar owns the switch. */
  section?: "layout" | "style" | "sections";
  filterKind?: ProfileSectionKind;
} = {}) {
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<{ from: number; over: number } | null>(null);
  const [drag, setDragState] = useState<{ from: number; over: number } | null>(null);
  const setDrag = (next: { from: number; over: number } | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const { about, setAbout, notify, user, badges, links, go } = useDash();
  const design = about.design;

  const updateDesign = (patch: Partial<typeof design>) =>
    setAbout((current) => ({ ...current, design: { ...current.design, ...patch } }));

  const updateColors = (patch: Partial<typeof design.colors>) =>
    updateDesign({ colors: { ...design.colors, ...patch } });

  /* Older releases saved their own default sizes (800px and 648px cards,
     32px padding, bigger badges). One button puts a card back on the
     reference measurements without touching its colours or content. */
  const resetSizing = () => {
    updateDesign({
      version: DEFAULT_ABOUT_DESIGN.version,
      scatteredSize: DEFAULT_ABOUT_DESIGN.scatteredSize,
      cardWidth: DEFAULT_ABOUT_DESIGN.cardWidth,
      cardPadding: DEFAULT_ABOUT_DESIGN.cardPadding,
      cardRadius: DEFAULT_ABOUT_DESIGN.cardRadius,
      borderWidth: DEFAULT_ABOUT_DESIGN.borderWidth,
      avatarSize: DEFAULT_ABOUT_DESIGN.avatarSize,
      nameSize: DEFAULT_ABOUT_DESIGN.nameSize,
      bioSize: DEFAULT_ABOUT_DESIGN.bioSize,
      widgetGap: DEFAULT_ABOUT_DESIGN.widgetGap,
      advancedLayout: false,
      pfpPosition: DEFAULT_ABOUT_DESIGN.pfpPosition,
      namePosition: DEFAULT_ABOUT_DESIGN.namePosition,
      bioPosition: DEFAULT_ABOUT_DESIGN.bioPosition,
      badgePosition: DEFAULT_ABOUT_DESIGN.badgePosition,
    });
    notify("Card sizing", "Reset to the reference measurements.");
  };

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
{section==='layout'?<Card><CardHead title="Size presets" subtitle="Change proportions without replacing content or colours."/><div className="tw-recovery-actions">{[{label:'Compact',width:648,avatar:96,name:34},{label:'Comfortable',width:760,avatar:105,name:38},{label:'Wide',width:900,avatar:116,name:42}].map(preset=><Button key={preset.label} onClick={()=>updateDesign({cardWidth:preset.width,avatarSize:preset.avatar,nameSize:preset.name})}>{preset.label} · {preset.width}px</Button>)}</div><Button onClick={()=>updateDesign({colors:{...design.colors,card:"#111111",text:"#ffffff",accent:"#b9c2d0"}})}>Use neutral monochrome colors</Button><p className="tw-foot-note">Preview the card at each width before you pick one.</p></Card>:null}
      <div className="tw-card-main" key={section}>
      {section === "layout" ? <Card>
        <CardHead
          icon="layout"
          title="Page layout"
          subtitle="Choose a balanced starting point, then adjust the composition."
          actions={<Button onClick={resetSizing}>Reset sizing</Button>}
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
                  cardWidth: DEFAULT_ABOUT_DESIGN.cardWidth,
                  widgetsPosition: preset.id === "stacked" ? "below" : "inside",
                  audioSlot: "below-card",
                  pfpPosition: preset.id === "left" ? "left" : "above",
                  namePosition: preset.id === "left" ? "left" : "center",
                  bioPosition: preset.id === "left" ? "left" : "center",
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
          <Field label="Badge placement"><Select value={design.badgePosition} options={["default", "above-name", "top-right", "bottom", "beside-avatar"].map((value) => ({ value, label: value }))} onChange={(badgePosition) => updateDesign({ badgePosition: badgePosition as typeof design.badgePosition })} /></Field>
          <Field label="Name alignment"><Select value={design.namePosition} options={["default", "left", "center", "right"].map((value) => ({ value, label: value }))} onChange={(namePosition) => updateDesign({ namePosition: namePosition as typeof design.namePosition })} /></Field>
          <Field label="Bio alignment"><Select value={design.bioPosition} options={["default", "left", "center", "right"].map((value) => ({ value, label: value }))} onChange={(bioPosition) => updateDesign({ bioPosition: bioPosition as typeof design.bioPosition })} /></Field>
          <Field label="Avatar shape"><Select value={design.avatarShape} options={["circle", "rounded", "square", "hexagon"].map((value) => ({ value, label: value }))} onChange={(avatarShape) => updateDesign({ avatarShape: avatarShape as typeof design.avatarShape })} /></Field>
          <Slider label="Avatar size" value={design.avatarSize} min={40} max={180} suffix="px" onChange={(avatarSize) => updateDesign({ avatarSize })} />
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
        <p className="tw-foot-note">Text/card contrast: {contrastRatio(design.colors.text, design.colors.card).toFixed(1)}:1. {contrastRatio(design.colors.text, design.colors.card) < 4.5 ? "Increase contrast for small text." : "Good contrast on an opaque card."} Transparent cards also depend on the background image; increase opacity or dim the background for readability.</p>

        <div className="tw-split" style={{ marginTop: 20 }}>
          <div className="tw-split-col">
            <span className="tw-split-label">Colours</span>
            <ColorField
              label="Card colour"
              value={design.colors.card}
              onChange={(value) => updateColors({ card: value })}
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
            <ColorField
              label="Accent"
              value={design.colors.accent}
              onChange={(value) => updateColors({ accent: value })}
            />
            <ColorField
              label="Border colour"
              value={design.colors.border}
              onChange={(value) => updateColors({ border: value })}
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

      {section === "sections" ? <Card><CardHead icon="layers" title={filterKind === "project" ? "Projects" : filterKind === "interest" ? "Interests" : "Sections"} subtitle="Everything below your card: projects, interests, music and films. Drag the handle to set the order." actions={<span className="tw-active-count">{design.sections.length} / 24</span>} />
        <p className="tw-foot-note">Project cards show your real tech stack and links. Interest cards pull real artwork from the anime, game, music and film libraries.</p>
        {!filterKind ? <div className="tw-row"><Button onClick={()=>go("portfolio-general")}>Portfolio settings</Button></div> : null}
        {!filterKind && design.slideshowAbout === true ? (
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

            <div className="tw-tag-drawer tw-tag-drawer--open">
              <div className="tw-tag-drawer-head">
                <b>Speciality tags</b>
                <small>{design.aboutSlide.tags.length ? `${design.aboutSlide.tags.length} selected` : "Pick the skills this is about"}</small>
              </div>
            <SkillPicker
              value={design.aboutSlide.tags}
              onChange={(tags) => updateDesign({ aboutSlide: { ...design.aboutSlide, tags: tags.slice(0, 150) } })}
            />
            </div>
          </details>
        ) : null}

        {filterKind === "interest" ? (
          <div className="tw-interest-mode">
            <div className="tw-interest-mode-head">
              <b>Interest layout</b>
              <small>Keep the rail to four posters at a time, or show the whole collection.</small>
            </div>
            <div className="tw-gallery-layouts tw-interest-modes">
              {(["carousel", "catalog"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={(design.interestMode ?? "carousel") === mode}
                  onClick={() => updateDesign({ interestMode: mode })}
                >
                  <span
                    className="tw-gallery-layout-thumb"
                    data-layout={mode === "carousel" ? "carousel" : "catalog"}
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="tw-gallery-layout-copy">
                    <b>{mode === "carousel" ? "Carousel" : "Catalog"}</b>
                    <small>
                      {mode === "carousel"
                        ? "Four at a time, with arrows and soft edge fades."
                        : "The full grid, all posters visible at once."}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={`tw-section-list${drag ? " is-sorting" : ""}`}>
          {design.sections.map((section, index) => !filterKind || section.kind === filterKind ? (
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
          ) : null)}
        </div>
        {!design.sections.length ? <p className="tw-empty-note">No sections yet — add a project, a game list, or something you love.</p> : null}
        <div className="tw-section-add">
          <span className="tw-section-add-label">Add a section</span>
          <div className="tw-section-add-row">
            {SECTION_KINDS.filter(kind => !filterKind || kind.id === filterKind).map((kind) => (
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
