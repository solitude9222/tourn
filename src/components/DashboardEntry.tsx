import { useState, type CSSProperties } from "react";
import type { Account } from "../lib/auth";
import { ENTRY_ANIMATIONS, type About, type EntrySettings } from "../lib/about";
import type { WidgetStore } from "../lib/widgets";
import { ColorField } from "./ColorPicker";
import { ImageUpload } from "./ImageUpload";
import { LinkerPreview } from "./LinkerPreview";
import { Select } from "./Select";
import { EyeIcon, ExpandIcon } from "./Icons";
import "../layoutPages.css";

const ALIGNMENTS = [
  { value: "center", label: "Centered" },
  { value: "top", label: "Top of the screen" },
  { value: "bottom", label: "Bottom of the screen" },
];

const IMAGE_FITS = [
  { value: "cover", label: "Fill the frame" },
  { value: "contain", label: "Fit inside" },
];

/**
 * Entry screen settings.
 *
 * The screen itself is rendered through the real LinkerPreview, so what you see
 * here is exactly what a visitor gets — including the click-to-enter animation.
 * It used to be settings with no preview, which made a broken screen impossible
 * to spot.
 */
export function DashboardEntry({
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
  const entry = about.design.entry;
  const [playToken, setPlayToken] = useState(0);

  const update = (patch: Partial<EntrySettings>) => {
    onChange({ ...about, design: { ...about.design, entry: { ...entry, ...patch } } });
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    apply: (v: number) => void,
  ) => (
    <label className="lp-slider">
      <span className="lp-slider-head">
        <span>{label}</span>
        <b>
          {value}
          {unit}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--slider-fill": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(event) => apply(Number(event.target.value))}
      />
    </label>
  );

  return (
    <div className="lp-page">
      <section className="dash-panel lp-panel" data-reveal>
        <header className="lp-section-head">
          <h2>
            <ExpandIcon size={15} /> Entry screen preview
          </h2>
          <p>
            A visitor sees this before your page. Click the preview to enter — the same click
            animation your visitors get.
          </p>
        </header>

        <div className="entry-stage">
          <LinkerPreview
            user={user}
            about={about}
            widgets={widgets}
            showEntry
            entryPlayToken={playToken}
            joined="Preview"
          />
        </div>

        <div className="entry-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPlayToken((n) => n + 1)}>
            <ExpandIcon size={13} /> Replay entry
          </button>
          <a className="btn btn-ghost btn-sm" href={`/${encodeURIComponent(user.username)}`}>
            <EyeIcon size={13} /> Open public page
          </a>
          <span className="lp-hint">
            {entry.enabled ? "Live on your public page." : "Turn it on below to publish it."}
          </span>
        </div>
      </section>

      <section className="dash-panel lp-panel" data-reveal data-reveal-delay="60">
        <div className="lp-settings">
          <div className="lp-toggle">
            <div>
              <b>Show entry screen</b>
              <p>Visitors see this once before your profile.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={entry.enabled}
              aria-label="Show entry screen"
              className={`switch${entry.enabled ? " is-on" : ""}`}
              onClick={() => update({ enabled: !entry.enabled })}
            >
              <span />
            </button>
          </div>

          <div className="lp-toggle">
            <div>
              <b>Only once per visit</b>
              <p>Skip the screen on later page views in the same browser session.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={entry.oncePerSession}
              aria-label="Only once per visit"
              className={`switch${entry.oncePerSession ? " is-on" : ""}`}
              onClick={() => update({ oncePerSession: !entry.oncePerSession })}
            >
              <span />
            </button>
          </div>

          <label className="lp-field">
            <span className="lp-label">Text</span>
            <input
              value={entry.title}
              onChange={(event) => update({ title: event.target.value.slice(0, 48) })}
              placeholder={about.displayName.trim() || user.username}
              maxLength={48}
            />
          </label>

          <label className="lp-field">
            <span className="lp-label">Subtitle</span>
            <input
              value={entry.subtitle}
              onChange={(event) => update({ subtitle: event.target.value.slice(0, 96) })}
              placeholder="Optional line under the title"
              maxLength={96}
            />
          </label>

          <label className="lp-field">
            <span className="lp-label">Hint</span>
            <input
              value={entry.hint}
              onChange={(event) => update({ hint: event.target.value.slice(0, 60) })}
              placeholder="e.g. click anywhere to enter"
              maxLength={60}
            />
          </label>

          <div className="lp-dropdown-grid">
            <div className="lp-select">
              <span>Animation</span>
              <Select
                value={entry.animation}
                ariaLabel="Entry animation"
                options={ENTRY_ANIMATIONS.map((animation) => ({
                  value: animation.id,
                  label: animation.name,
                }))}
                onChange={(value) => update({ animation: value as EntrySettings["animation"] })}
              />
            </div>
            <div className="lp-select">
              <span>Content position</span>
              <Select
                value={entry.align}
                ariaLabel="Entry content position"
                options={ALIGNMENTS}
                onChange={(value) => update({ align: value as EntrySettings["align"] })}
              />
            </div>
          </div>

          <div className="lp-field">
            <span className="lp-label">Image</span>
            <ImageUpload
              label="entry image"
              value={entry.imageUrl}
              onChange={(value) => update({ imageUrl: value })}
              hint="Shown above the entry text. Large images are compressed automatically."
              recommended="Square image · 1200 × 1200 recommended"
              variant="wide"
              maxWidth={1200}
              maxHeight={1200}
            />
          </div>

          <div className="lp-dropdown-grid">
            <div className="lp-select">
              <span>Image fit</span>
              <Select
                value={entry.imageFit}
                ariaLabel="Entry image fit"
                options={IMAGE_FITS}
                onChange={(value) => update({ imageFit: value as EntrySettings["imageFit"] })}
              />
            </div>
            <ColorField
              label="Background"
              value={entry.background}
              onChange={(value) => update({ background: value })}
              compact
            />
          </div>

          <h3 className="lp-subhead">Typography</h3>
          <div className="lp-slider-grid">
            {slider("Title size", entry.titleSize, 12, 96, 1, "px", (v) => update({ titleSize: v }))}
            {slider("Title spacing", entry.letterSpacing, -0.12, 0.32, 0.01, "em", (v) =>
              update({ letterSpacing: v }),
            )}
            {slider("Subtitle size", entry.subtitleSize, 8, 32, 0.5, "px", (v) =>
              update({ subtitleSize: v }),
            )}
            {slider("Hint size", entry.hintSize, 8, 24, 0.5, "px", (v) => update({ hintSize: v }))}
          </div>

          <div className="lp-dropdown-grid">
            <ColorField
              label="Title colour"
              value={entry.titleColor}
              onChange={(value) => update({ titleColor: value })}
              compact
            />
            <ColorField
              label="Subtitle colour"
              value={entry.subtitleColor}
              onChange={(value) => update({ subtitleColor: value })}
              compact
            />
            <ColorField
              label="Hint colour"
              value={entry.hintColor}
              onChange={(value) => update({ hintColor: value })}
              compact
            />
          </div>

          <h3 className="lp-subhead">Background photo</h3>
          <ImageUpload
            label="entry background"
            value={entry.backgroundImageUrl}
            onChange={(value) => update({ backgroundImageUrl: value })}
            hint="Painted behind the entry text, over the solid background colour."
            recommended="Wide image · 1920 × 1080 recommended"
            variant="wide"
            maxWidth={1920}
            maxHeight={1920}
          />

          <h3 className="lp-subhead">Image</h3>
          <div className="lp-slider-grid">
            {slider("Image size", entry.imageSize, 32, 400, 2, "px", (v) => update({ imageSize: v }))}
            {slider("Image corner radius", entry.imageRadius, 0, 120, 2, "px", (v) =>
              update({ imageRadius: v }),
            )}
            {slider("Image shadow", entry.imageShadow, 0, 100, 1, "%", (v) =>
              update({ imageShadow: v }),
            )}
          </div>

          <h3 className="lp-subhead">Layout</h3>
          <div className="lp-slider-grid">
            {slider("Element gap", entry.contentGap, 0, 48, 1, "px", (v) => update({ contentGap: v }))}
            {slider("Content width", entry.contentWidth, 40, 100, 1, "%", (v) =>
              update({ contentWidth: v }),
            )}
            {slider("Backdrop dim", entry.dim, 0, 100, 1, "%", (v) => update({ dim: v }))}
            {slider("Background blur", entry.blur, 0, 40, 1, "px", (v) => update({ blur: v }))}
            {slider("Corner vignette", entry.vignette, 0, 100, 1, "%", (v) =>
              update({ vignette: v }),
            )}
          </div>

          <h3 className="lp-subhead">Glass panel</h3>
          <div className="lp-toggle">
            <div>
              <b>Wrap the entry text in a panel</b>
              <p>A soft glass card behind your title, subtitle and hint.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={entry.panel}
              aria-label="Glass panel"
              className={`switch${entry.panel ? " is-on" : ""}`}
              onClick={() => update({ panel: !entry.panel })}
            >
              <span />
            </button>
          </div>

          {entry.panel ? (
            <div className="lp-slider-grid">
              {slider("Panel opacity", entry.panelOpacity, 0, 100, 1, "%", (v) =>
                update({ panelOpacity: v }),
              )}
              {slider("Panel blur", entry.panelBlur, 0, 40, 1, "px", (v) =>
                update({ panelBlur: v }),
              )}
              {slider("Panel radius", entry.panelRadius, 0, 48, 1, "px", (v) =>
                update({ panelRadius: v }),
              )}
            </div>
          ) : null}

          <h3 className="lp-subhead">Enter animation</h3>
          <div className="lp-slider-grid">
            {slider("Duration", entry.animationDuration, 200, 2000, 20, "ms", (v) =>
              update({ animationDuration: v }),
            )}
          </div>

          <p className="lp-hint">
            Nothing is invented for you: no default greeting, no automatic button. Whatever you type
            here is the whole screen, and a click starts the animation.
          </p>
        </div>
      </section>
    </div>
  );
}
