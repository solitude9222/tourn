/* ---------------------------------------------------------------------------
   Customize > Card — the card layout, the widget positions and the card's
   colours in one place. The layout only decides how much room the card and
   its widgets take; colour, background and blur stay where they were.
   --------------------------------------------------------------------------- */

import { type AboutLayout, type JoinPosition, type ViewPosition } from "../../lib/about";
import { FontPicker } from "../../components/FontPicker";
import { useDash } from "../context";
import { Button, Card, CardHead, ColorField, Field, Select, Slider, Toggle } from "../ui";

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
  { value: "footer", label: "Card footer" },
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
    description: "Card, then Discord presence, then the rest of the widgets, audio at the bottom.",
    viewPosition: "top-right",
    joinPosition: "footer",
  },
  {
    id: "left",
    name: "Left side",
    description: "Info on the left, widgets beside it, links under the info.",
    viewPosition: "top-right",
    joinPosition: "under-name",
  },
  {
    id: "centered",
    name: "Centered",
    description: "One narrow column, everything centred.",
    viewPosition: "top-right",
    joinPosition: "footer",
  },
];

/** Colour pairs that set the accent, card and border together. */
const PALETTES: { name: string; accent: string; card: string; border: string }[] = [
  { name: "Ice", accent: "#b4bffa", card: "#12141a", border: "#ffffff" },
  { name: "Violet", accent: "#a78bfa", card: "#15121f", border: "#b79cff" },
  { name: "Ocean", accent: "#60c8ff", card: "#0d1620", border: "#8fdcff" },
  { name: "Mint", accent: "#6ee7b7", card: "#0f1a16", border: "#9ff5d2" },
  { name: "Ember", accent: "#ff9d6e", card: "#1d1210", border: "#ffc09a" },
  { name: "Rose", accent: "#ff8fc7", card: "#1e1016", border: "#ffb3d8" },
  { name: "Gold", accent: "#ffd479", card: "#1a1509", border: "#ffe6a8" },
  { name: "Cyan", accent: "#67e8f9", card: "#08181c", border: "#a5f3fc" },
  { name: "Lime", accent: "#c4f16b", card: "#12170b", border: "#dcff9c" },
  { name: "Slate", accent: "#cbd5e1", card: "#14171c", border: "#e2e8f0" },
];

export function LayoutPage() {
  const { about, setAbout, notify } = useDash();
  const design = about.design;

  const updateDesign = (patch: Partial<typeof design>) =>
    setAbout((current) => ({ ...current, design: { ...current.design, ...patch } }));

  const updateColors = (patch: Partial<typeof design.colors>) =>
    updateDesign({ colors: { ...design.colors, ...patch } });

  const gradientOn = about.assets.card.id === "aurora";
  const updateCard = (patch: Partial<typeof about.assets.card>) =>
    setAbout((current) => ({
      ...current,
      assets: { ...current.assets, card: { ...current.assets.card, ...patch } },
    }));

  return (
    <>
      <Card>
        <CardHead
          icon="layout"
          title="Page layout"
          subtitle="Where the card, the widgets and your links sit. Colours, background and blur stay exactly as they are."
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
                })
              }
            >
              <div className={`tw-layout-thumb tw-layout-thumb--page-${preset.id}`}>
                <div className={`tw-layout-wire tw-layout-wire--page-${preset.id}`}>
                  <i />
                  <i style={{ width: 52 }} />
                  <i style={{ width: 38 }} />
                </div>
              </div>
              <b>{preset.name}</b>
              <small>{preset.description}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead
          icon="grid"
          title="Widget positions"
          subtitle="Pick where each widget sits. Uncheck a widget on Links → Widgets to hide it completely."
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

          <Field label="Audio player" hint="The player always sits at the bottom of the page.">
            <Select icon="music" value="bottom" options={AUDIO_OPTIONS} onChange={() => undefined} />
          </Field>
        </div>

        <div className="tw-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <Button
            icon="refresh"
            onClick={() => {
              updateDesign({
                viewPosition: "top-right",
                locationPosition: "under-name",
                joinPosition: "footer",
              });
              notify("Widget positions", "Reset to the defaults — save to publish it.");
            }}
          >
            Reset positions
          </Button>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="palette"
          title="Card style"
          subtitle="Colours, surface and size of the card itself."
        />

        <div className="tw-subhead">Colour presets</div>
        <div className="tw-palettes">
          {PALETTES.map((palette) => {
            const active =
              palette.accent.toLowerCase() === design.colors.accent.toLowerCase() &&
              palette.card.toLowerCase() === design.colors.card.toLowerCase();
            return (
              <button
                key={palette.name}
                type="button"
                className={`tw-palette${active ? " is-active" : ""}`}
                onClick={() => updateColors({ accent: palette.accent, card: palette.card, border: palette.border })}
              >
                <span className="tw-palette-dots">
                  <i style={{ background: palette.accent }} />
                  <i style={{ background: palette.card }} />
                  <i style={{ background: palette.border }} />
                </span>
                {palette.name}
              </button>
            );
          })}
        </div>

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
              label="Card width"
              value={design.cardWidth}
              min={360}
              max={900}
              step={2}
              suffix="px"
              onChange={(value) => updateDesign({ cardWidth: value })}
            />
            <Slider
              label="Opacity"
              value={design.backgroundOpacity}
              min={0}
              max={1}
              step={0.01}
              format={(value) => value.toFixed(2)}
              ticks={["25%", "50%", "75%"]}
              onChange={(value) => updateDesign({ backgroundOpacity: value })}
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
      </Card>

      <Card>
        <CardHead
          icon="edit"
          title="Font"
          subtitle="Pick the typeface for your name, bio and card text."
        />

        <div className="tw-field">
          <FontPicker
            value={design.font}
            onChange={(family) => updateDesign({ font: family })}
            label="Card font"
          />
          <span className="tw-field-hint">
            Theme font is the default. Every family here loads on its own, so a
            chosen font still shows for visitors on first paint.
          </span>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="sparkles"
          title="Card Gradient"
          subtitle="Colour and motion of the gradient that travels around your card."
        />
        <Button
          variant={gradientOn ? "ghost" : "primary"}
          wide
          icon="sparkles"
          onClick={() => {
            updateCard({ id: gradientOn ? "none" : "aurora" });
            notify("Card Gradient", gradientOn ? "Gradient turned off." : "Gradient activated.");
          }}
        >
          {gradientOn ? "Disable Card Gradient" : "Activate Card Gradient"}
        </Button>

        {/* The gradient controls only mean anything while it is on. */}
        {gradientOn ? (
          <div className="tw-split" style={{ marginTop: 18 }}>
            <div className="tw-split-col">
              <span className="tw-split-label">Colours</span>
              <ColorField
                label="Gradient colour"
                value={about.assets.card.color}
                onChange={(value) => updateCard({ color: value })}
              />
            </div>
            <div className="tw-split-col">
              <span className="tw-split-label">Sizes &amp; sliders</span>
              <Slider
                label="Intensity"
                value={about.assets.card.intensity}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => updateCard({ intensity: value })}
              />
              <Slider
                label="Speed"
                value={about.assets.card.speed}
                min={1.5}
                max={20}
                step={0.5}
                suffix="s"
                onChange={(value) => updateCard({ speed: value })}
              />
            </div>
          </div>
        ) : (
          <p className="tw-foot-note">Turn the gradient on to choose its colour and motion.</p>
        )}
      </Card>
    </>
  );
}
