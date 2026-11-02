import { type CSSProperties } from "react";
import type { Account } from "../lib/auth";
import { CARD_STYLES, type About, type AboutDesign, type CardStyle } from "../lib/about";
import type { WidgetStore } from "../lib/widgets";
import { CheckIcon } from "./Icons";
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
    <label className="lp-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ── position presets ──────────────────────────────────────── */

const PFP_POSITIONS = [
  { value: "default", label: "Default (top-left)" },
  { value: "center", label: "Centered" },
  { value: "top-right", label: "Top-right" },
  { value: "left", label: "Far left" },
  { value: "right", label: "Far right" },
  { value: "above", label: "Above card" },
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
              min={300}
              max={680}
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
              min={0.2}
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

          <div className="lp-toggle" style={{ marginTop: 12 }}>
            <div>
              <b>Tilt glare</b>
              <p>A soft light glare follows the pointer while the card tilts.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={design.tiltGlare}
              aria-label="Tilt glare"
              className={`switch${design.tiltGlare ? " is-on" : ""}`}
              disabled={design.tilt <= 0}
              onClick={() => update({ tiltGlare: !design.tiltGlare })}
            >
              <span />
            </button>
          </div>
          <p className="lp-hint">Set Card tilt above 0° to enable the pointer tilt.</p>
        </section>

        {/* Typography & avatar */}
        <section className="dash-panel lp-panel" data-reveal data-reveal-delay="80">
          <header className="lp-section-head">
            <h2>Typography &amp; avatar</h2>
            <p>Size of the avatar, display name and bio text.</p>
          </header>

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
              value={(design as Record<string, unknown>).pfpPosition as string ?? "default"}
              options={PFP_POSITIONS}
              onChange={(v) => update({ avatarX: 0, avatarY: 0, ...({pfpPosition: v} as Partial<AboutDesign>) })}
            />
            <LayoutSelect
              label="Badges"
              value={(design as Record<string, unknown>).badgePosition as string ?? "default"}
              options={BADGE_POSITIONS}
              onChange={(v) => update({ badgeX: 0, badgeY: 0, ...({badgePosition: v} as Partial<AboutDesign>) })}
            />
            <LayoutSelect
              label="Display name"
              value={(design as Record<string, unknown>).namePosition as string ?? "default"}
              options={NAME_POSITIONS}
              onChange={(v) => update({...({namePosition: v} as Partial<AboutDesign>)})}
            />
            <LayoutSelect
              label="Bio text"
              value={(design as Record<string, unknown>).bioPosition as string ?? "default"}
              options={BIO_POSITIONS}
              onChange={(v) => update({...({bioPosition: v} as Partial<AboutDesign>)})}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
