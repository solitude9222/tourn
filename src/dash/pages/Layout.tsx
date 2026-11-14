import {ProfileHistory} from "../ProfileHistory";
import { useRef, useState } from "react";
/* ---------------------------------------------------------------------------
   Customize > Card — the card layout, the widget positions and the card's
   colours in one place. The layout only decides how much room the card and
   its widgets take; colour, background and blur stay where they were.
   --------------------------------------------------------------------------- */

import { createProfileSection, defaultMetadata, type AboutLayout, type JoinPosition, type ProfileSection, type ProfileSectionKind, type ViewPosition } from "../../lib/about";
import { SectionEditor } from "../SectionEditor";
import { fileToDataUrl } from "../files";
import { FontPicker } from "../../components/FontPicker";
import { TECH_STACK, techCategory, techIconUrl } from "../../lib/techStack";
import { PositionStudio } from "../PositionStudio";
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
  viewPosition: ViewPosition;
  joinPosition: JoinPosition;
}[] = [
  {
    id: "stacked",
    name: "Stacked",
    description:
      "Your profile first, then separate widget cards and music below.",
    viewPosition: "footer",
    joinPosition: "under-name",
  },
  {
    id: "left",
    name: "Left aligned",
    description:
      "Avatar, text and links aligned left inside the centred card, with widgets kept inside.",
    viewPosition: "footer",
    joinPosition: "under-name",
  },
  {
    id: "centered",
    name: "Centered",
    description: "Picture and name centred, with the widget and link blocks below.",
    viewPosition: "footer",
    joinPosition: "under-name",
  },
];

/* One draggable detail. Dropping it on a corner of the preview writes the
   matching design position, so the preview and the saved page never drift. */
type DropId = "views" | "location" | "join" | "audio" | "likes";

const DROPPABLE: { id: DropId; label: string; hint: string }[] = [
  { id: "views", label: "Profile Views", hint: "where the eye count sits" },
  { id: "location", label: "Location", hint: "your place on the card" },
  { id: "join", label: "Join Date", hint: "when the account started" },
  { id: "audio", label: "Audio Player", hint: "inside or under the card" },
  { id: "likes", label: "Likes", hint: "fixed reaction dock" },
];

const ZONES: { id: string; position: "inside-top-left" | "inside-top-right" | "inside-bottom-left" | "inside-bottom-right" | "footer" }[] = [
  { id: "top-left", position: "inside-top-left" },
  { id: "top-right", position: "inside-top-right" },
  { id: "bottom-left", position: "inside-bottom-left" },
  { id: "bottom-right", position: "inside-bottom-right" },
  { id: "footer", position: "footer" },
];

function LayoutPreview() {
  const { user, about, widgets, badges, links, setAbout, notify } = useDash();
  const [dragging, setDragging] = useState<DropId | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const stageZone = (event: { clientX: number; clientY: number }) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (y > 0.8) return "footer";
    return `${y < 0.5 ? "top" : "bottom"}-${x < 0.5 ? "left" : "right"}`;
  };

  const drop = (zone: string | null) => {
    const widget = dragging;
    setDragging(null);
    setHovered(null);
    if (!widget || !zone) return;
    const target = ZONES.find((entry) => entry.id === zone);
    if (!target) return;
    if (widget === "likes") {
      notify("Likes", "The reaction dock always sits at the screen bottom, so it stays reachable.");
      return;
    }
    if (widget === "audio") {
      const audioPosition = zone === "footer" ? "below" : "inside";
      setAbout((current) => ({ ...current, design: { ...current.design, audioPosition } }));
      notify("Audio player", `Moved ${audioPosition === "below" ? "under the card" : "inside the card"}.`);
      return;
    }
    const field = widget === "views" ? "viewPosition" : widget === "location" ? "locationPosition" : "joinPosition";
    setAbout((current) => ({
      ...current,
      design: { ...current.design, advancedLayout: true, [field]: target.position },
    }));
    notify("Position updated", `${widget === "views" ? "Views" : widget === "location" ? "Location" : "Join date"} now sits ${zone.replace("-", " ")}.`);
  };

  return (
    <Card>
      <CardHead
        icon="move"
        title="Layout Preview"
        subtitle="Drag the profile widgets inside the preview. This is your real card, not a mock."
      />

      <div className="tw-drag-row">
        {DROPPABLE.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tw-drag-chip${dragging === item.id ? " is-dragging" : ""}`}
            title={item.hint}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(item.id);
            }}
            onPointerMove={(event) => {
              if (dragging !== item.id) return;
              setHovered(stageZone(event));
            }}
            onPointerUp={(event) => {
              if (dragging !== item.id) return;
              drop(stageZone(event));
            }}
            onPointerCancel={() => {
              setDragging(null);
              setHovered(null);
            }}
          >
            <Icon name="drag" size={13} />
            {item.label}
          </button>
        ))}
      </div>

      <div className={`tw-layout-stage${dragging ? " is-dragging" : ""}`} ref={stageRef}>
        <div className="tw-layout-stage-scaler">
          <LinkerPreview
            user={user}
            about={about}
            widgets={widgets}
            badges={badges}
            links={links}
            interactive={false}
          />
        </div>
        <div className="tw-layout-zones" aria-hidden={dragging ? undefined : true}>
          {ZONES.map((zone) => (
            <span
              key={zone.id}
              className={`tw-layout-zone tw-layout-zone--${zone.id}${hovered === zone.id ? " is-hot" : ""}`}
            >
              {hovered === zone.id ? "drop here" : ""}
            </span>
          ))}
        </div>
      </div>

      <p className="tw-foot-note">
        Visible widget means it is on. Anything switched off in Profile → Switches keeps its place but
        stops drawing on the page.
      </p>
    </Card>
  );
}

export function LayoutPage() {
  const [dragSection,setDragSection]=useState<number|null>(null);
  const { about, setAbout, notify, user, badges, links } = useDash();
  const design = about.design;
  const [tab, setTab] = useState("layout");

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

  return (
    <div className="tw-card-page">
      <div className="tw-layout-toolbar"><nav className="tw-workspace-tabs" aria-label="Card settings">{[["layout", "Layout"], ["style", "Appearance"], ["sections", "Sections"]].map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav></div>
      <div className="tw-card-main" key={tab}>
      {tab === "layout" ? <Card>
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
                  ...defaultMetadata(preset.id),
                  badgePosition: "default",
                  cardPadding: 32,
                  cardWidth: 720,
                  widgetsPosition: preset.id === "stacked" ? "below" : "inside",
                  audioPosition: "auto",
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

      {tab === "layout" ? <LayoutPreview /> : null}
      {tab === "layout" ? <Card><CardHead icon="move" title="Card motion" subtitle="Tilt the profile by itself or move the entire stacked group together." /><div className="tw-form-grid"><Slider label="Card tilt" value={design.tilt} min={0} max={24} suffix="°" onChange={(tilt) => updateDesign({ tilt })} /><div className="tw-inline-toggle"><span><b>Tilt stacked cards together</b><small>Applies to the profile, widget cards and audio in Stacked layout.</small></span><Toggle label="Tilt stacked cards together" checked={design.stackTilt} onChange={(stackTilt) => updateDesign({ stackTilt, ...(stackTilt && design.tilt === 0 ? { tilt: 8 } : {}) })} /></div></div></Card> : null}
      {tab === "layout" ? <Card>
        <div className="tw-inline-toggle">
          <span>
            <b>Advanced positioning</b>
            <small>Off keeps the defaults: details under the card, or in the card's corners when centred.</small>
          </span>
          <Toggle
            label="Advanced positioning"
            checked={design.advancedLayout === true}
            onChange={(advancedLayout) =>
              updateDesign(advancedLayout ? { advancedLayout } : { advancedLayout, ...defaultMetadata(design.layout) })
            }
          />
        </div>
      </Card> : null}
      {tab === "layout" && design.advancedLayout === true ? <Card><CardHead icon="user" title="Card composition" subtitle="Make the same layout centred or portrait-led." />
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
      {tab === "layout" && design.advancedLayout === true ? <Card>
        <CardHead
          icon="grid"
          title="Details & music"
          subtitle="Place your profile details and audio player."
        />

        <PositionStudio
          viewPosition={design.viewPosition}
          locationPosition={design.locationPosition}
          joinPosition={design.joinPosition}
          layout={design.layout}
          onChange={updateDesign}
        />

        <div className="tw-form-grid" style={{ marginTop: 16 }}>
          <Field label="Views" hint="How the view count reads next to the icon.">
            <Select
              value={design.viewStyle ?? "icon"}
              options={[
                { value: "icon", label: "Icon: number" },
                { value: "text", label: "Text: 1,234 views" },
                { value: "number", label: "Number only" },
              ]}
              onChange={(viewStyle) => updateDesign({ viewStyle: viewStyle as typeof design.viewStyle })}
            />
          </Field>
          <Field label="Detail style" hint="Plain is quiet text with a divider. Pills put each detail in its own chip.">
            <Select
              value={design.metaStyle ?? "plain"}
              options={[
                { value: "plain", label: "Plain (icon + text, divider)" },
                { value: "pill", label: "Pills (boxed chips)" },
              ]}
              onChange={(metaStyle) => updateDesign({ metaStyle: metaStyle as typeof design.metaStyle })}
            />
          </Field>
          <Field label="Detail glow" hint="Glow behind the location, view and join icons.">
            <ColorField
              value={design.metaGlowColor ?? "#b4bffa"}
              onChange={(metaGlowColor) => updateDesign({ metaGlowColor })}
            />
          </Field>
          <Slider
            label="Glow strength"
            value={Math.round((design.metaGlowStrength ?? 0) * 100)}
            min={0}
            max={100}
            step={5}
            suffix="%"
            onChange={(value) => updateDesign({ metaGlowStrength: value / 100 })}
          />
        </div>

        <div className="tw-form-grid" style={{ marginTop: 16 }}>
          <Field label="Audio player" hint="Manage the track and player under Music.">
            <Select value={design.audioPosition} options={[{ value: "auto", label: "Follow layout" }, { value: "inside", label: "Inside card" }, { value: "below", label: "Below card" }, { value: "side", label: "Beside card" }, { value: "popup", label: "Popup · top left" }, { value: "fixed-bottom", label: "Fixed at screen bottom" }, { value: "hidden", label: "Hidden" }]} onChange={(audioPosition) => updateDesign({ audioPosition: audioPosition as typeof design.audioPosition })} />
          </Field>

          <Field label="Widgets" hint="Keep widget cards inside the profile card or below it.">
            <Select value={design.widgetsPosition} options={[{ value: "auto", label: "Follow layout" }, { value: "inside", label: "Inside card" }, { value: "below", label: "Below card" }]} onChange={(widgetsPosition) => updateDesign({ widgetsPosition: widgetsPosition as typeof design.widgetsPosition })} />
          </Field>
        </div>

        <div className="tw-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <Button
            icon="refresh"
            onClick={() => {
              updateDesign({
                ...defaultMetadata(design.layout),
                widgetsPosition: "auto",
                audioPosition: "auto",
              });
              notify("Widget positions", "Reset to the defaults — save to publish it.");
            }}
          >
            Reset positions
          </Button>
        </div>
      </Card> : null}

      {tab === "style" ? <Card>
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

      {tab === "style" ? <Card>
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
      {tab === "sections" ? <Card><CardHead icon="layers" title="Profile sections" subtitle="Two kinds only: the projects you built, and the animes you like. Both render as real showcase cards with artwork, icons and links." actions={<span className="tw-active-count">{design.sections.length} / 24</span>} />
        <p className="tw-foot-note">Project cards show your real tech stack and links. Interest cards pull real artwork and metadata from the anime library.</p>
        <div className="tw-toggle-grid">
          <div className="tw-inline-toggle"><b>Enable sections</b><Toggle label="Enable sections" checked={design.sectionsEnabled===true} onChange={sectionsEnabled=>updateDesign({sectionsEnabled})}/></div>
          <div className="tw-inline-toggle"><b>Vertical slideshow</b><Toggle label="Vertical slideshow" checked={design.slideshow===true} onChange={slideshow=>updateDesign({slideshow})}/></div>
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

        <div className="tw-section-list">
          {design.sections.map((section, index) => (
            <div key={section.id} draggable onDragStart={event=>{if((event.target as HTMLElement).closest('input,textarea,select,button')){event.preventDefault();return;}setDragSection(index);}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(dragSection===null)return;const sections=[...design.sections];const [moved]=sections.splice(dragSection,1);sections.splice(index,0,moved);updateDesign({sections});setDragSection(null);}}><div className="tw-section-drag" title="Drag to reorder">⠿ Drag to reorder</div><SectionEditor
              key={section.id}
              section={section}
              index={index}
              onChange={(patch) => patchSection(section.id, patch)}
              onRemove={() => updateDesign({ sections: design.sections.filter((item) => item.id !== section.id) })}
              onMoveUp={() => {
                const sections = [...design.sections];
                [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
                updateDesign({ sections });
              }}
            /></div>
          ))}
        </div>
        {!design.sections.length ? <p className="tw-empty-note">No sections yet — add a project you built, or an anime you like.</p> : null}
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
          </div>
        </div>
      </Card> : null}
      <ProfileHistory/>
      </div>
    </div>
  );
}
