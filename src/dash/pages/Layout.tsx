import {ProfileHistory} from "../ProfileHistory";
import { useState } from "react";
/* ---------------------------------------------------------------------------
   Customize > Card — the card layout, the widget positions and the card's
   colours in one place. The layout only decides how much room the card and
   its widgets take; colour, background and blur stay where they were.
   --------------------------------------------------------------------------- */

import { createProfileSection, type AboutLayout, type JoinPosition, type ProfileSection, type ProfileSectionKind, type ViewPosition } from "../../lib/about";
import { SectionEditor } from "../SectionEditor";
import { fileToDataUrl } from "../files";
import { FontPicker } from "../../components/FontPicker";
import { PositionStudio } from "../PositionStudio";
import { useDash } from "../context";
import { FileUpload, Button, Card, CardHead, ColorField, Field, Select, Slider, Toggle, TextInput, Textarea } from "../ui";

const SECTION_KINDS: { id: ProfileSectionKind; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "Title and paragraph" },
  { id: "project", label: "Project", hint: "Stack, links, artwork" },
  { id: "anime", label: "Anime", hint: "500+ real titles" },
  { id: "game", label: "Game", hint: "400+ real games" },
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
      <div className="tw-card-main">
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
                  viewPosition: preset.viewPosition,
                  joinPosition: preset.joinPosition,
                  badgePosition: "default",
                  locationPosition: "footer",
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

      {tab === "layout" ? <Card><CardHead icon="move" title="Card motion" subtitle="Tilt the profile by itself or move the entire stacked group together." /><div className="tw-form-grid"><Slider label="Card tilt" value={design.tilt} min={0} max={24} suffix="°" onChange={(tilt) => updateDesign({ tilt })} /><div className="tw-inline-toggle"><span><b>Tilt stacked cards together</b><small>Applies to the profile, widget cards and audio in Stacked layout.</small></span><Toggle label="Tilt stacked cards together" checked={design.stackTilt} onChange={(stackTilt) => updateDesign({ stackTilt, ...(stackTilt && design.tilt === 0 ? { tilt: 8 } : {}) })} /></div></div></Card> : null}
      {tab === "layout" ? <Card><CardHead icon="user" title="Card composition" subtitle="Make the same layout compact, transparent, centred or portrait-led." />
        <div className="tw-form-grid">            <Field label="Card style" hint="Compact halves the card; widgets always stay two across."><Select value={design.cardStyle} options={[{ value: "default", label: "Full card" }, { value: "compact", label: "Compact · half width, widgets side by side" }, { value: "minimal", label: "Minimal / transparent" }, { value: "slide", label: "Slideshow · card, then one screen per section" }]} onChange={(cardStyle) => updateDesign({ cardStyle: cardStyle as typeof design.cardStyle, cardWidth: cardStyle === "compact" ? 480 : design.layout === "centered" ? 540 : 720, ...(cardStyle === "slide" ? { slideshow: true, sectionsEnabled: true } : {}) })} /></Field>
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
      {tab === "layout" ? <Card>
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
                viewPosition: "footer",
                locationPosition: "under-name",
                joinPosition: "under-name",
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
      {tab === "sections" ? <Card><CardHead icon="layers" title="Profile sections" subtitle="Sections scroll normally below your profile. Projects, anime and games become real showcase cards with artwork, icons and links." actions={<span className="tw-active-count">{design.sections.length} / 24</span>} />
        <p className="tw-foot-note">Text sections span the page. Project cards show your real tech stack; anime and game cards pull real artwork and metadata from public catalogues.</p>
        <div className="tw-stack"><div className="tw-inline-toggle"><b>Enable sections</b><Toggle label="Enable sections" checked={design.sectionsEnabled===true} onChange={sectionsEnabled=>updateDesign({sectionsEnabled})}/></div><div className="tw-inline-toggle"><span><b>Vertical slideshow</b><small>Scroll, swipe or drag down from your card through your sections.</small></span><Toggle label="Vertical slideshow" checked={design.slideshow===true} onChange={slideshow=>updateDesign({slideshow})}/></div></div>
        {design.slideshow === true ? <div className="tw-stack" style={{ marginTop: 12 }}>
          <div className="tw-inline-toggle"><span><b>About me slide</b><small>Your bio gets its own screen after the card.</small></span><Toggle label="About me slide" checked={design.slideshowAbout===true} onChange={slideshowAbout=>updateDesign({slideshowAbout})}/></div>
          <div className="tw-inline-toggle"><span><b>Links slide</b><small>Move your links onto their own screen.</small></span><Toggle label="Links slide" checked={design.slideshowLinks===true} onChange={slideshowLinks=>updateDesign({slideshowLinks})}/></div>
          <div className="tw-inline-toggle"><span><b>Badges slide</b><small>Move your badge rail onto its own screen.</small></span><Toggle label="Badges slide" checked={design.slideshowBadges===true} onChange={slideshowBadges=>updateDesign({slideshowBadges})}/></div>
        </div> : null}
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
        {!design.sections.length ? <p className="tw-empty-note">No sections yet — add a text block, a project, or a title from the anime and game libraries.</p> : null}
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
