/* ---------------------------------------------------------------------------
   Portfolio > Design — the shapes and colours of the two big surfaces on a
   profile: the About block and the project cards. Each one has a container
   (the card itself) and a pill (the small tags inside it).
   --------------------------------------------------------------------------- */

import { useDash } from "../context";
import { Button, Card, CardHead, ColorField, Icon, IconButton, SectionLabel, Slider } from "../ui";
import {
  DEFAULT_SURFACES,
  type ContainerStyle,
  type SurfacePill,
  type SurfaceStyles,
} from "../../lib/about";

type SurfaceKey = keyof SurfaceStyles;

/** #rrggbb + opacity → a colour the browser accepts. */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  const red = Number.parseInt(full.slice(0, 2), 16) || 0;
  const green = Number.parseInt(full.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha))})`;
}

function ContainerControls({
  value,
  onChange,
}: {
  value: ContainerStyle;
  onChange: (patch: Partial<ContainerStyle>) => void;
}) {
  return (
    <>
      <div className="tw-form-grid">
        <ColorField
          label="Background color"
          value={value.background}
          onChange={(background) => onChange({ background })}
        />
        <ColorField
          label="Border color"
          value={value.border}
          onChange={(border) => onChange({ border })}
        />
      </div>
      <div className="tw-form-grid">
        <Slider
          label="Background opacity"
          value={Math.round(value.backgroundOpacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(next) => onChange({ backgroundOpacity: next / 100 })}
        />
        <Slider
          label="Border opacity"
          value={Math.round(value.borderOpacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(next) => onChange({ borderOpacity: next / 100 })}
        />
        <Slider
          label="Border width"
          value={value.borderWidth}
          min={0}
          max={12}
          suffix="px"
          onChange={(borderWidth) => onChange({ borderWidth })}
        />
        <Slider
          label="Blur"
          value={value.blur}
          min={0}
          max={40}
          suffix="px"
          onChange={(blur) => onChange({ blur })}
        />
        <Slider
          label="Roundness"
          value={value.radius}
          min={0}
          max={999}
          suffix="px"
          onChange={(radius) => onChange({ radius })}
        />
        <Slider
          label="Card width (0 = full)"
          value={value.width}
          min={0}
          max={1400}
          step={20}
          suffix="px"
          onChange={(width) => onChange({ width })}
        />
      </div>
    </>
  );
}

function PillControls({
  value,
  onChange,
}: {
  value: SurfacePill;
  onChange: (patch: Partial<SurfacePill>) => void;
}) {
  return (
    <>
      <div className="tw-form-grid">
        <ColorField
          label="Background color"
          value={value.background}
          onChange={(background) => onChange({ background })}
        />
        <ColorField
          label="Border color"
          value={value.border}
          onChange={(border) => onChange({ border })}
        />
        <ColorField
          label="Text color"
          value={value.text}
          onChange={(text) => onChange({ text })}
        />
      </div>
      <div className="tw-form-grid">
        <Slider
          label="Background opacity"
          value={Math.round(value.backgroundOpacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(next) => onChange({ backgroundOpacity: next / 100 })}
        />
        <Slider
          label="Border opacity"
          value={Math.round(value.borderOpacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(next) => onChange({ borderOpacity: next / 100 })}
        />
        <Slider
          label="Border width"
          value={value.borderWidth}
          min={0}
          max={12}
          suffix="px"
          onChange={(borderWidth) => onChange({ borderWidth })}
        />
        <Slider
          label="Blur"
          value={value.blur}
          min={0}
          max={40}
          suffix="px"
          onChange={(blur) => onChange({ blur })}
        />
        <Slider
          label="Roundness"
          value={value.radius}
          min={0}
          max={999}
          suffix="px"
          onChange={(radius) => onChange({ radius })}
        />
      </div>
    </>
  );
}

const SURFACES: { key: SurfaceKey; title: string; subtitle: string; icon: "layers" | "grid" }[] = [
  {
    key: "about",
    title: "About section",
    subtitle: "The writing block: its surface, border and the tags inside it.",
    icon: "layers",
  },
  {
    key: "project",
    title: "Project cards",
    subtitle: "The showcase cards: their surface and the stack pills on them.",
    icon: "grid",
  },
];

const META_STYLES = [
  { id: "plain", label: "Plain", hint: "Icon and text, split by a divider." },
  { id: "pill", label: "Pills", hint: "Each detail in its own chip." },
  { id: "icons", label: "Icons only", hint: "Glyphs in small circles." },
] as const;

const VIEW_STYLES = [
  { id: "icon", label: "Icon + number", hint: "An eye, then the count." },
  { id: "text", label: "Reads as text", hint: "1,234 views." },
  { id: "number", label: "Number only", hint: "Bare count, no glyph." },
] as const;

export function DesignPage() {
  const { about, setAbout, notify } = useDash();
  const surfaces = about.design.surfaces;

  const patchDesign = (next: Partial<typeof about.design>) =>
    setAbout((current) => ({ ...current, design: { ...current.design, ...next } }));

  const metaStyle = about.design.metaStyle ?? "plain";
  const viewStyle = about.design.viewStyle ?? "icon";
  const viewCount = "12,480";

  /** Inline style for one surface container. */
  /** One surface, painted exactly as the public profile paints it. */
  const surfacePreview = (key: SurfaceKey) => {
    const { container } = surfaces[key];
    const tags = key === "about" ? ["TypeScript", "React", "Node"] : ["Next.js", "Postgres"];
    return (
      <div className="tw-design-preview" key={key}>
        <div
          className="tw-design-preview-card"
          style={{
            ...containerStyle(key),
            width: "100%",
            maxWidth: container.width ? `${container.width}px` : "none",
          }}
        >
          <b>{key === "about" ? "Your name" : "Project card"}</b>
          <p>{key === "about" ? "Designer, builder, night owl." : "A showcase entry with its stack."}</p>
          <div className="tw-design-preview-pills">
            {tags.map((tag) => (
              <span key={tag} style={pillStyle(key)}>{tag}</span>
            ))}
          </div>
          {key === "about" ? (
            <div className={`tw-design-live-meta is-${metaStyle}`} style={{ fontSize: `${about.design.metaSize}px` }}>
              <span><Icon name="pin" size={12} />Berlin</span>
              {viewStyle === "text" ? (
                <span>{viewCount} views</span>
              ) : viewStyle === "number" ? (
                <span>{viewCount}</span>
              ) : (
                <span><Icon name="eye" size={12} />{viewCount}</span>
              )}
              <span><Icon name="calendar" size={12} />Sep 2026</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const containerStyle = (key: SurfaceKey) => {
    const { container } = surfaces[key];
    return {
      background: withAlpha(container.background, container.backgroundOpacity),
      borderColor: withAlpha(container.border, container.borderOpacity),
      borderWidth: container.borderWidth,
      borderRadius: container.radius,
      backdropFilter: `blur(${container.blur}px)`,
    } as const;
  };

  /** Inline style for one surface pill. */
  const pillStyle = (key: SurfaceKey) => {
    const { pill } = surfaces[key];
    return {
      background: withAlpha(pill.background, pill.backgroundOpacity),
      borderColor: withAlpha(pill.border, pill.borderOpacity),
      borderWidth: pill.borderWidth,
      borderRadius: pill.radius,
      color: pill.text,
      backdropFilter: `blur(${pill.blur}px)`,
    } as const;
  };

  const patch = (key: SurfaceKey, part: "container" | "pill", next: Record<string, number | string>) =>
    setAbout((current) => ({
      ...current,
      design: {
        ...current.design,
        surfaces: {
          ...current.design.surfaces,
          [key]: {
            ...current.design.surfaces[key],
            [part]: { ...current.design.surfaces[key][part], ...next },
          },
        },
      },
    }));

  return (
    <>
      {SURFACES.map((surface) => (
        <Card key={surface.key}>
          <CardHead
            icon={surface.icon}
            title={surface.title}
            subtitle={surface.subtitle}
            actions={
              <IconButton
                label={`Reset ${surface.title.toLowerCase()}`}
                icon="refresh"
                onClick={() => {
                  setAbout((current) => ({
                    ...current,
                    design: {
                      ...current.design,
                      surfaces: { ...current.design.surfaces, [surface.key]: DEFAULT_SURFACES[surface.key] },
                    },
                  }));
                  notify(`${surface.title} reset`, "Container and pill styles are back to the defaults.");
                }}
              />
            }
          />

          <SectionLabel hint="The card itself: background, border and roundness of the container.">
            Container style
          </SectionLabel>
          <ContainerControls
            value={surfaces[surface.key].container}
            onChange={(next) => patch(surface.key, "container", next)}
          />

          <div className="tw-design-divider" role="presentation" />

          <SectionLabel hint="The small rounded tags inside the section.">Pill style</SectionLabel>
          <PillControls
            value={surfaces[surface.key].pill}
            onChange={(next) => patch(surface.key, "pill", next)}
          />

          <SectionLabel hint="Exactly how this surface appears on your profile.">
            Live preview
          </SectionLabel>
          {surfacePreview(surface.key)}
        </Card>
      ))}

      <Card>
        <CardHead
          icon="user"
          title="Details & counter"
          subtitle="How location, views and the join date read under your name."
        />

        <SectionLabel hint="Quiet text, boxed chips, or glyphs alone.">Detail style</SectionLabel>
        <div className="tw-style-grid">
          {META_STYLES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`tw-style-option${(about.design.metaStyle ?? "plain") === option.id ? " is-active" : ""}`}
              aria-pressed={(about.design.metaStyle ?? "plain") === option.id}
              onClick={() => patchDesign({ metaStyle: option.id })}
            >
              <span className={`tw-meta-demo tw-meta-demo--${option.id}`} aria-hidden="true">
                <span>Berlin</span>
                <span>12,480</span>
                <span>Joined Sep 2026</span>
              </span>
              <b>{option.label}</b>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>

        <SectionLabel hint="How large location, views and the join date read.">Size</SectionLabel>
        <Slider
          label="Detail text size"
          value={about.design.metaSize}
          min={9}
          max={22}
          suffix="px"
          onChange={(metaSize) => patchDesign({ metaSize })}
        />

        <SectionLabel hint="The number beside the eye icon.">View counter</SectionLabel>
        <div className="tw-style-grid">
          {VIEW_STYLES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`tw-style-option${(about.design.viewStyle ?? "icon") === option.id ? " is-active" : ""}`}
              aria-pressed={(about.design.viewStyle ?? "icon") === option.id}
              onClick={() => patchDesign({ viewStyle: option.id })}
            >
              <span className="tw-meta-demo tw-meta-demo--views" aria-hidden="true">
                {option.id === "icon" ? "◉ 12,480" : option.id === "text" ? "12,480 views" : "12,480"}
              </span>
              <b>{option.label}</b>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead
          icon="palette"
          title="Publish"
          subtitle="Each surface above shows the change as you make it."
        />
        <p className="tw-foot-note">
          The public profile uses these values as soon as the change is saved with the button in the
          top bar.
        </p>
        <Button variant="primary" icon="save" onClick={() => notify("Save", "Use Save in the top bar to publish this look.")}>
          Save publishes it
        </Button>
      </Card>
    </>
  );
}
