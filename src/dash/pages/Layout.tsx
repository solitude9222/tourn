import { useState } from "react";
/* ---------------------------------------------------------------------------
   Customize > Card — the card layout, the widget positions and the card's
   colours in one place. The layout only decides how much room the card and
   its widgets take; colour, background and blur stay where they were.
   --------------------------------------------------------------------------- */

import { type AboutLayout, type JoinPosition, type ViewPosition } from "../../lib/about";
import { fileToDataUrl } from "../files";
import { FontPicker } from "../../components/FontPicker";
import { LinkerPreview } from "../../components/LinkerPreview";
import { useDash } from "../context";
import { FileUpload, Button, Card, CardHead, ColorField, Field, Select, Slider, Toggle, TextInput, Textarea } from "../ui";

const VIEW_OPTIONS = [
  { value: "top-right", label: "Top right of the card" },
  { value: "footer", label: "Card footer" },
  { value: "hidden", label: "Hidden" },
];

const LOCATION_OPTIONS = [
  { value: "under-name", label: "Under your name" },
  { value: "top", label: "Top right" },
  { value: "footer", label: "Card footer" },
  { value: "hidden", label: "Hidden" },
];

const JOIN_OPTIONS = [
  { value: "under-name", label: "Under your name" },
  { value: "hidden", label: "Hidden" },
];

const AUDIO_OPTIONS = [{ value: "bottom", label: "Screen bottom (fixed)" }];

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
      "Avatar, text and links aligned left inside the centred card.",
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
  const { about, setAbout, widgets, badges, links, profileViews, user, notify, go } = useDash();
  const design = about.design;
  const [tab, setTab] = useState("layout");
  const [showPreview, setShowPreview] = useState(true);

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

  // The card preview sits beside the settings so every slider, colour and
  // effect shows its result immediately — but it never plays audio: the
  // preview is silent, and the player is left to the real profile page.
  const preview = (
    <aside className="tw-card-preview" aria-label="Card preview">
      <div className="tw-card-preview-inner">
        <LinkerPreview
          user={{
            id: user.id,
            username: user.username,
            avatarUrl: about.assets.avatarUrl || user.avatarUrl,
          }}
          about={about}
          widgets={widgets}
          badges={badges}
          links={links}
          views={profileViews}
          showEntry={false}
          showMetadata={false}
          interactive={false}
          hideAudio
        />
      </div>
    </aside>
  );

  return (
    <div className="tw-card-page">
      <div className="tw-layout-toolbar"><nav className="tw-workspace-tabs" aria-label="Card settings">{[["layout", "Layout"], ["style", "Appearance"], ["sections", "Sections"]].map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav><Button onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Hide preview" : "Show preview"}</Button></div>
      {showPreview ? preview : null}
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

      {tab === "layout" ? <Card><CardHead icon="user" title="Card composition" subtitle="Make the same layout compact, transparent, centred or portrait-led." />
        <div className="tw-form-grid">
          <Field label="Card style"><Select value={design.cardStyle} options={[{ value: "default", label: "Full card" }, { value: "compact", label: "Compact" }, { value: "minimal", label: "Minimal / transparent" }]} onChange={(cardStyle) => updateDesign({ cardStyle: cardStyle as typeof design.cardStyle, cardWidth: cardStyle === "compact" ? 480 : design.layout === "centered" ? 540 : 720 })} /></Field>
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

        <div className="tw-form-grid">
          <Field label="Profile views">
            <Select
              icon="eye"
              value={design.viewPosition}
              options={VIEW_OPTIONS}
              onChange={(value) => updateDesign({ viewPosition: value as typeof design.viewPosition })}
            />
          </Field>

          <Field label="Location">
            <Select
              icon="pin"
              value={design.locationPosition}
              options={LOCATION_OPTIONS}
              onChange={(value) =>
                updateDesign({ locationPosition: value as typeof design.locationPosition })
              }
            />
          </Field>

          <Field label="Join date">
            <Select
              icon="calendar"
              value={design.joinPosition}
              options={JOIN_OPTIONS}
              onChange={(value) => updateDesign({ joinPosition: value as typeof design.joinPosition })}
            />
          </Field>

          <Field label="Audio player" hint="Manage the track and player under Music.">
            <Select value={design.audioPosition} options={[{ value: "auto", label: "Follow layout" }, { value: "inside", label: "Inside card" }, { value: "below", label: "Below card" }, { value: "popup", label: "Popup · top left" }, { value: "fixed-bottom", label: "Fixed at screen bottom" }, { value: "hidden", label: "Hidden" }]} onChange={(audioPosition) => updateDesign({ audioPosition: audioPosition as typeof design.audioPosition })} />
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
      {tab === "sections" ? <Card><CardHead icon="layers" title="Profile sections" subtitle="Add About text, project artwork and links below your profile card." />
        {(design.sections || []).map((section, index) => <div className="tw-profile-section-editor" key={section.id}>
          <div className="tw-row"><b>Section {index + 1}</b><Button onClick={() => updateDesign({ sections: design.sections.filter((item) => item.id !== section.id) })}>Remove section</Button>{index > 0 ? <Button onClick={() => { const sections = [...design.sections]; [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]]; updateDesign({ sections }); }}>Move up</Button> : null}</div>
          <div className="tw-form-grid">
            <Field label="Section title"><TextInput value={section.title} onChange={(event) => updateDesign({ sections: design.sections.map((item) => item.id === section.id ? { ...item, title: event.target.value } : item) })} /></Field>
            <Field label="Section style"><Select value={section.kind} options={[{ value: "text", label: "Text section" }, { value: "project", label: "Project card" }]} onChange={(kind) => updateDesign({ sections: design.sections.map((item) => item.id === section.id ? { ...item, kind: kind as "text" | "project" } : item) })} /></Field>
            <Field label="Section text"><Textarea rows={4} value={section.text} onChange={(event) => updateDesign({ sections: design.sections.map((item) => item.id === section.id ? { ...item, text: event.target.value } : item) })} /></Field>
            <Field label="Artwork URL"><TextInput value={section.image} onChange={(event) => updateDesign({ sections: design.sections.map((item) => item.id === section.id ? { ...item, image: event.target.value } : item) })} /></Field>
            <Field label="Section artwork upload" hint="Upload an image or animated GIF under 500 KB."><FileUpload aria-label={`Section ${index + 1} artwork upload`} accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 500_000) { notify("Artwork", "Choose an image or GIF under 500 KB."); return; } const image = await fileToDataUrl(file); setAbout((current) => ({ ...current, design: { ...current.design, sections: current.design.sections.map((item) => item.id === section.id ? { ...item, image } : item) } })); }} /></Field>
            <Field label="Section link"><TextInput value={section.url} placeholder="https://..." onChange={(event) => updateDesign({ sections: design.sections.map((item) => item.id === section.id ? { ...item, url: event.target.value } : item) })} /></Field>
          </div>
        </div>)}
        <Button disabled={design.sections.length >= 12} onClick={() => updateDesign({ sections: [...design.sections, { id: crypto.randomUUID(), title: "", text: "", image: "", url: "", kind: "text" }] })}>Add profile section</Button>
      </Card> : null}
      </div>
    </div>
  );
}
