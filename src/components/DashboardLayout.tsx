import { type CSSProperties } from "react";
import type { Account } from "../lib/auth";
import { CARD_STYLES, type About, type AboutDesign, type CardStyle } from "../lib/about";
import type { WidgetStore } from "../lib/widgets";
import { CheckIcon } from "./Icons";
import { Select } from "./Select";
import "../layoutPages.css";

/* ── reusable controls ─────────────────────────────────────── */

function LayoutSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value.toString();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="lp-slider">
      <span className="lp-slider-head">
        <span>{label}</span>
        <b>
          {display}
          {unit}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--slider-fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function LayoutSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="lp-select">
      <span>{label}</span>
      <Select value={value} options={options} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

/* ── position presets ──────────────────────────────────────── */

const PFP_POSITIONS = [
  { value: "above", label: "Stacked on top (default)" },
  { value: "default", label: "Inline — left" },
  { value: "center", label: "Inline — centered" },
  { value: "top-right", label: "Inline — right" },
];

const AVATAR_SHAPES = [
  { value: "circle", label: "Circle" },
  { value: "rounded", label: "Rounded square" },
  { value: "square", label: "Square" },
  { value: "hexagon", label: "Hexagon" },
];

const BADGE_POSITIONS = [
  { value: "default", label: "Default (below name)" },
  { value: "above-name", label: "Above name" },
  { value: "top-right", label: "Top-right corner" },
  { value: "bottom", label: "Card bottom" },
  { value: "beside-avatar", label: "Beside avatar" },
  { value: "hidden", label: "Hidden" },
];

const NAME_POSITIONS = [
  { value: "default", label: "Default" },
  { value: "center", label: "Centered" },
  { value: "left", label: "Left-aligned" },
  { value: "right", label: "Right-aligned" },
];

const BIO_POSITIONS = [
  { value: "default", label: "Default" },
  { value: "center", label: "Centered" },
  { value: "left", label: "Left-aligned" },
  { value: "right", label: "Right-aligned" },
];

const LOCATION_POSITIONS = [
  { value: "under-name", label: "Under the username" },
  { value: "top", label: "Beside the avatar" },
  { value: "footer", label: "Card footer" },
  { value: "hidden", label: "Hidden" },
];

const VIEW_POSITIONS = [
  { value: "top-right", label: "Top-right corner" },
  { value: "footer", label: "Bottom-right" },
  { value: "hidden", label: "Hidden" },
];

const JOIN_POSITIONS = [
  { value: "footer", label: "Bottom-left" },
  { value: "under-name", label: "Under the username" },
  { value: "hidden", label: "Hidden" },
];

/* ── component ─────────────────────────────────────────────── */

export function DashboardLayout({
  user,
  about,
  widgets,
  onChange,
}: {
  user: Account;
  about: About;
  widgets: WidgetStore;
  onChange: (about: About) => void;
}) {
  const design = about.design;
  const selected = design.cardStyle;

  const choose = (cardStyle: CardStyle) => {
    onChange({ ...about, design: { ...design, cardStyle } });
  };

  const update = (patch: Partial<AboutDesign>) => {
    onChange({ ...about, design: { ...design, ...patch } });
  };

  return (
    <div className="lp-page lp-page--full">
      <div className="lp-settings-col">
        {/* Card style picker */}
        <section className="dash-panel lp-panel" data-reveal>
          <header className="lp-section-head">
            <h2>Card layout</h2>
            <p>Choose the overall structure. Backgrounds and effects are managed separately.</p>
          </header>

          <div className="lp-grid">
            {CARD_STYLES.map((style) => (
              <button
                type="button"
                key={style.id}
                className={`lp-option${selected === style.id ? " is-active" : ""}`}
                onClick={() => choose(style.id)}
                aria-pressed={selected === style.id}
              >
                <span className={`lp-thumb lp-thumb--${style.id}`} aria-hidden="true">
                  <span className="lp-thumb-card">
                    <i />
                    <b />
                    <em />
                    <em />
                  </span>
                </span>
                <span className="lp-option-copy">
                  <b>{style.name}</b>
                  <small>{style.description}</small>
                </span>
                {selected === style.id ? (
                  <span className="lp-option-check">
                    <CheckIcon size={11} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {selected === "slideshow" ? (
            <p className="lp-hint">Slideshow settings are in Extra → Slideshow.</p>
          ) : null}
        </section>

        {/* Card design settings */}
        <section className="dash-panel lp-panel" data-reveal data-reveal-delay="60">
          <header className="lp-section-head">
            <h2>Card settings</h2>
            <p>Rounding, spacing, borders and sizing for the profile card.</p>
          </header>

          <div className="lp-slider-grid">
            <LayoutSlider
              label="Card width"
              value={design.cardWidth}
              min={320}
              max={900}
              step={1}
              unit="px"
              onChange={(v) => update({ cardWidth: v })}
            />
            <LayoutSlider
              label="Corner radius"
              value={design.cardRadius}
              min={0}
              max={36}
              step={1}
              unit="px"
              onChange={(v) => update({ cardRadius: v })}
            />
            <LayoutSlider
              label="Card padding"
              value={design.cardPadding}
              min={12}
              max={40}
              step={1}
              unit="px"
              onChange={(v) => update({ cardPadding: v })}
            />
            <LayoutSlider
              label="Border width"
              value={design.borderWidth}
              min={0}
              max={6}
              step={1}
              unit="px"
              onChange={(v) => update({ borderWidth: v })}
            />
            <LayoutSlider
              label="Border opacity"
              value={design.borderOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update({ borderOpacity: v })}
            />
            <LayoutSlider
              label="Background opacity"
              value={design.backgroundOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update({ backgroundOpacity: v })}
            />
            <LayoutSlider
              label="Background blur"
              value={design.backgroundBlur}
              min={0}
              max={30}
              step={1}
              unit="px"
              onChange={(v) => update({ backgroundBlur: v })}
            />
            <LayoutSlider
              label="Widget gap"
              value={design.widgetGap}
              min={4}
              max={28}
              step={1}
              unit="px"
              onChange={(v) => update({ widgetGap: v })}
            />
            <LayoutSlider
              label="Card tilt"
              value={design.tilt}
              min={0}
              max={16}
              step={1}
              unit="°"
              onChange={(v) => update({ tilt: v })}
            />
          </div>

          <p className="lp-hint">Tilt follows the pointer when you set it above 0°.</p>
        </section>

        {/* Typography & avatar */}
        <section className="dash-panel lp-panel" data-reveal data-reveal-delay="80">
          <header className="lp-section-head">
            <h2>Typography &amp; avatar</h2>
            <p>Size of the avatar, display name and bio text.</p>
          </header>

          <div className="lp-dropdown-grid" style={{ marginBottom: 12 }}>
            <LayoutSelect
              label="Avatar shape"
              value={design.avatarShape}
              options={AVATAR_SHAPES}
              onChange={(v) => update({ avatarShape: v as typeof design.avatarShape })}
            />
          </div>

          <div className="lp-slider-grid">
            <LayoutSlider
              label="Avatar size"
              value={design.avatarSize}
              min={44}
              max={132}
              step={1}
              unit="px"
              onChange={(v) => update({ avatarSize: v })}
            />
            <LayoutSlider
              label="Name size"
              value={design.nameSize}
              min={16}
              max={34}
              step={1}
              unit="px"
              onChange={(v) => update({ nameSize: v })}
            />
            <LayoutSlider
              label="Bio size"
              value={design.bioSize}
              min={9}
              max={16}
              step={0.5}
              unit="px"
              onChange={(v) => update({ bioSize: v })}
            />
          </div>
        </section>

        {/* Element positioning — dropdowns */}
        <section className="dash-panel lp-panel" data-reveal data-reveal-delay="100">
          <header className="lp-section-head">
            <h2>Element positioning</h2>
            <p>Control where the profile picture, badges, name and bio sit on the card.</p>
          </header>

          <div className="lp-dropdown-grid">
            <LayoutSelect
              label="Profile picture"
              value={design.pfpPosition}
              options={PFP_POSITIONS}
              onChange={(v) => update({ pfpPosition: v as typeof design.pfpPosition })}
            />
            <LayoutSelect
              label="Badges"
              value={design.badgePosition}
              options={BADGE_POSITIONS}
              onChange={(v) => update({ badgePosition: v as typeof design.badgePosition })}
            />
            <LayoutSelect
              label="Display name"
              value={design.namePosition}
              options={NAME_POSITIONS}
              onChange={(v) => update({ namePosition: v as typeof design.namePosition })}
            />
            <LayoutSelect
              label="Bio text"
              value={design.bioPosition}
              options={BIO_POSITIONS}
              onChange={(v) => update({ bioPosition: v as typeof design.bioPosition })}
            />
            <LayoutSelect
              label="Location"
              value={design.locationPosition}
              options={LOCATION_POSITIONS}
              onChange={(v) => update({ locationPosition: v as typeof design.locationPosition })}
            />
            <LayoutSelect
              label="View count"
              value={design.viewPosition}
              options={VIEW_POSITIONS}
              onChange={(v) => update({ viewPosition: v as typeof design.viewPosition })}
            />
            <LayoutSelect
              label="Join date"
              value={design.joinPosition}
              options={JOIN_POSITIONS}
              onChange={(v) => update({ joinPosition: v as typeof design.joinPosition })}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
