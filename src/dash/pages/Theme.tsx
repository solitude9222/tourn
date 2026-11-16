/* ---------------------------------------------------------------------------
   Settings > Theme — the console's own palette.

   These presets only restyle the dashboard. The public profile keeps its own
   colours under Appearance, so changing how the console looks never touches
   what visitors see.
   --------------------------------------------------------------------------- */

import { Button, ColorField, Card, CardHead, Icon } from "../ui";
import { useDash } from "../context";
import { DASH_THEMES, useDashTheme, useDashAccent } from "../theme";

const TONES = [
  { name: "Surface", token: "card" },
  { name: "Text", token: "title" },
  { name: "Muted", token: "sub" },
  { name: "Accent", token: "accent" },
] as const;

export function ThemePage() {
  const [theme, setTheme] = useDashTheme();
  const [accent, setAccent] = useDashAccent();
  const { go } = useDash();

  return (
    <>
      <Card>
        <CardHead
          icon="palette"
          title="Console theme"
          subtitle="How the dashboard looks while you work. It applies instantly and is remembered on this browser."
        />

        <div className="tw-theme-grid" role="radiogroup" aria-label="Dashboard theme">
          {DASH_THEMES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={theme === preset.id}
              className={`tw-theme-option${theme === preset.id ? " is-active" : ""}`}
              onClick={() => setTheme(preset.id)}
            >
              <span
                className="tw-theme-preview"
                style={{
                  background: preset.swatch[0],
                  borderColor: preset.swatch[1] === preset.swatch[0] ? "#232326" : preset.swatch[1],
                }}
              >
                <span className="tw-theme-preview-card" style={{ background: preset.swatch[1] }}>
                  <span className="tw-theme-preview-dot" style={{ background: preset.swatch[2] }} />
                  <span className="tw-theme-preview-line" />
                  <span className="tw-theme-preview-line is-short" />
                </span>
                <span className="tw-theme-preview-pill" style={{ background: preset.swatch[2] }} />
              </span>

              <span className="tw-theme-copy">
                <b>{preset.label}</b>
                <small>{preset.description}</small>
              </span>

              <span className="tw-theme-check" aria-hidden="true">
                {theme === preset.id ? <Icon name="check" size={14} /> : null}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card><CardHead icon="palette" title="Custom accent" subtitle="Preview an accent instantly across buttons, selected tabs and focus rings." /><ColorField label="Accent color" value={accent || DASH_THEMES.find(item => item.id === theme)!.swatch[2]} onChange={setAccent} /><Button disabled={!accent} onClick={() => setAccent("")}>Use theme accent</Button></Card>
      <Card>
        <CardHead
          icon="sliders"
          title="Tokens in this theme"
          subtitle="Every card, field and menu on the console reads from these four values."
        />
        <div className="tw-theme-tones">
          {TONES.map((tone) => (
            <div className="tw-theme-tone" key={tone.token}>
              <span className={`tw-theme-tone-chip is-${tone.token}`} aria-hidden="true" />
              <span>
                <b>{tone.name}</b>
                <small>var(--{tone.token})</small>
              </span>
            </div>
          ))}
        </div>
        <p className="tw-foot-note">
          Looking for the colours visitors see? Those live under{" "}
          <button type="button" className="tw-inline-link" onClick={() => go("profile-appearance")}>
            Appearance
          </button>{" "}
          and are published with your profile.
        </p>
      </Card>
    </>
  );
}
