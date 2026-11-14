/* ---------------------------------------------------------------------------
   Portfolio > Design — the shapes and colours of the two big surfaces on a
   profile: the About block and the project cards. Each one has a container
   (the card itself) and a pill (the small tags inside it).
   --------------------------------------------------------------------------- */

import { useDash } from "../context";
import { Button, Card, CardHead, ColorField, IconButton, SectionLabel, Slider } from "../ui";
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

export function DesignPage() {
  const { about, setAbout, notify } = useDash();
  const surfaces = about.design.surfaces;

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
        </Card>
      ))}

      <Card>
        <CardHead
          icon="palette"
          title="Preview"
          subtitle="Your surfaces, painted with the values above."
        />
        <div className="tw-design-preview">
          {(["about", "project"] as SurfaceKey[]).map((key) => {
            const { container, pill } = surfaces[key];
            return (
              <div
                key={key}
                className="tw-design-preview-card"
                style={{
                  background: withAlpha(container.background, container.backgroundOpacity),
                  borderColor: withAlpha(container.border, container.borderOpacity),
                  borderWidth: container.borderWidth,
                  borderRadius: container.radius,
                  backdropFilter: `blur(${container.blur}px)`,
                }}
              >
                <b>{key === "about" ? "About" : "Project card"}</b>
                <p>{key === "about" ? "Designer, builder, night owl." : "A showcase entry with its stack."}</p>
                <div className="tw-design-preview-pills">
                  {(key === "about" ? ["TypeScript", "React", "Node"] : ["Next.js", "Postgres"]).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: withAlpha(pill.background, pill.backgroundOpacity),
                        borderColor: withAlpha(pill.border, pill.borderOpacity),
                        borderWidth: pill.borderWidth,
                        borderRadius: pill.radius,
                        color: pill.text,
                        backdropFilter: `blur(${pill.blur}px)`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
