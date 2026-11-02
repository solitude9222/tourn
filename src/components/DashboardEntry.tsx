import { type CSSProperties } from "react";
import type { Account } from "../lib/auth";
import { ENTRY_ANIMATIONS, type About, type EntrySettings } from "../lib/about";
import type { WidgetStore } from "../lib/widgets";
import { ImageUpload } from "./ImageUpload";
import { Select } from "./Select";
import "../layoutPages.css";

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

  const update = (patch: Partial<EntrySettings>) => {
    onChange({ ...about, design: { ...about.design, entry: { ...entry, ...patch } } });
  };

  return (
    <div className="lp-page lp-page--full">
      <section className="dash-panel lp-panel">
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

          <label className="lp-field">
            <span className="lp-label">Text</span>
            <input
              value={entry.title}
              onChange={(event) => update({ title: event.target.value.slice(0, 48) })}
              placeholder={about.displayName.trim() || user.username}
              maxLength={48}
            />
          </label>

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

          <p className="entry-hint">
            Use text, an image, or nothing at all. The screen stays plain black until whatever you
            set here appears; a click starts the animation.
          </p>

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
            <span className="lp-label">Animation</span>
            <Select
              value={entry.animation}
              ariaLabel="Entry animation"
              options={ENTRY_ANIMATIONS.map((animation) => ({
                value: animation.id,
                label: animation.name,
              }))}
              onChange={(value) => update({ animation: value as EntrySettings["animation"] })}
            />
          </label>

          <div className="lp-slider-grid">
            <label className="lp-slider">
              <span className="lp-slider-head">
                <span>Background blur</span>
                <b>{entry.blur}px</b>
              </span>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={entry.blur}
                style={{ "--slider-fill": `${(entry.blur / 24) * 100}%` } as CSSProperties}
                onChange={(event) => update({ blur: Number(event.target.value) })}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
