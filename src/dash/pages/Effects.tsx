import { useRef, useState } from "react";
import {
  BACKGROUND_EFFECTS,
  TEXT_EFFECTS,
  type BackgroundEffectSettings,
  type CursorSettings,
  type OverlayEffectSettings,
  type TextEffectSettings,
  type TextEffectTarget,
} from "../../lib/profileAssets";
import { BackgroundEffectLayer, OverlayEffectLayer } from "../../components/ProfileEffects";
import { useDash } from "../context";
import { imageToDataUrl } from "../files";
import { Button, Card, CardHead, ColorField, Field, Select, Slider, Toggle } from "../ui";

const CURSOR_TRAILS: { value: CursorSettings["trailType"]; label: string }[] = [
  { value: "dots", label: "Dots" },
  { value: "line", label: "Line" },
  { value: "glow", label: "Glow" },
  { value: "comet", label: "Comet" },
];

const TEXT_TARGETS: { id: TextEffectTarget; label: string }[] = [
  { id: "name", label: "Display name" },
  { id: "alias", label: "Username" },
  { id: "bio", label: "Bio" },
];

/** The production effect layers on a card-sized stage, so the dashboard shows
 *  exactly what the profile will render. */
function EffectStage({
  background,
  overlay,
}: {
  background: BackgroundEffectSettings;
  overlay: OverlayEffectSettings;
}) {
  return (
    <div className="tw-effect-stage">
      <BackgroundEffectLayer settings={background} compact />
      <div className="tw-effect-stage-card">
        <span className="tw-effect-stage-avatar" />
        <span className="tw-effect-stage-lines">
          <b>Your name</b>
          <small>Your handle</small>
        </span>
      </div>
      <OverlayEffectLayer settings={overlay} />
    </div>
  );
}

export function EffectsPage() {
  const { about, setAbout } = useDash();
  const effects = about.assets.effects;

  const setBackground = (patch: Partial<BackgroundEffectSettings>) =>
    setAbout((current) => ({
      ...current,
      assets: {
        ...current.assets,
        effects: {
          ...current.assets.effects,
          background: { ...current.assets.effects.background, ...patch },
        },
      },
    }));

  const setOverlay = (patch: Partial<OverlayEffectSettings>) =>
    setAbout((current) => ({
      ...current,
      assets: {
        ...current.assets,
        effects: {
          ...current.assets.effects,
          overlay: { ...current.assets.effects.overlay, ...patch },
        },
      },
    }));

  const setText = (target: TextEffectTarget, patch: Partial<TextEffectSettings>) =>
    setAbout((current) => ({
      ...current,
      assets: {
        ...current.assets,
        effects: {
          ...current.assets.effects,
          text: {
            ...current.assets.effects.text,
            [target]: { ...current.assets.effects.text[target], ...patch },
          },
        },
      },
    }));

  const setCursor = (patch: Partial<CursorSettings>) =>
    setAbout((current) => ({
      ...current,
      assets: { ...current.assets, cursor: { ...current.assets.cursor, ...patch } },
    }));

  const background = effects.background;
  const overlay = effects.overlay;
  const cursor = about.assets.cursor;
  const cursorInput = useRef<HTMLInputElement>(null);
  const [cursorError, setCursorError] = useState("");

  // A real upload, not a list of presets: whatever image is picked becomes the
  // pointer on the public page.
  const uploadCursor = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCursorError("Choose an image file.");
      return;
    }
    try {
      const url = await imageToDataUrl(file, 128, 128);
      setCursor({ imageUrl: url, style: "custom" });
      setCursorError("");
    } catch {
      setCursorError("That image could not be read.");
    }
  };

  return (
    <>
      <Card>
        <CardHead
          icon="sparkles"
          title="Background effect"
          subtitle="Animated layer behind your card."
        />
        <EffectStage background={background} overlay={overlay} />
        <div className="tw-form-grid">
          <Field label="Effect">
            <Select
              value={background.id}
              options={BACKGROUND_EFFECTS.map((entry) => ({ value: entry.id, label: entry.name }))}
              onChange={(value) => setBackground({ id: value as BackgroundEffectSettings["id"] })}
            />
          </Field>
          <ColorField
            label="Colour"
            value={background.color}
            onChange={(value) => setBackground({ color: value })}
          />
          <Slider
            label="Intensity"
            value={background.intensity}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => setBackground({ intensity: value })}
          />
          <Slider
            label="Speed"
            value={background.speed}
            min={0.2}
            max={4}
            step={0.1}
            suffix="x"
            onChange={(value) => setBackground({ speed: value })}
          />
          <Slider
            label="Density"
            value={background.params.amount}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) =>
              setBackground({ params: { ...background.params, amount: value } })
            }
          />
          <div className="tw-inline-toggle">
            <span>
              <b>Extra variation</b>
              <small>Effect-specific secondary motion.</small>
            </span>
            <Toggle
              checked={background.params.flag}
              onChange={(checked) =>
                setBackground({ params: { ...background.params, flag: checked } })
              }
              label="Background variation"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="layers"
          title="Overlay effect"
          subtitle="A lighter effect drawn over the whole page."
        />
        <div className="tw-form-grid">
          <Field label="Effect">
            <Select
              value={overlay.id}
              options={BACKGROUND_EFFECTS.map((entry) => ({ value: entry.id, label: entry.name }))}
              onChange={(value) => setOverlay({ id: value as OverlayEffectSettings["id"] })}
            />
          </Field>
          <ColorField
            label="Colour"
            value={overlay.color}
            onChange={(value) => setOverlay({ color: value })}
          />
          <Slider
            label="Opacity"
            value={Math.round(overlay.opacity * 100)}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => setOverlay({ opacity: value / 100 })}
          />
          <Slider
            label="Intensity"
            value={overlay.intensity}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => setOverlay({ intensity: value })}
          />
          <Slider
            label="Speed"
            value={overlay.speed}
            min={0.2}
            max={4}
            step={0.1}
            suffix="x"
            onChange={(value) => setOverlay({ speed: value })}
          />
        </div>
      </Card>

      <Card>
        <CardHead icon="edit" title="Text effects" subtitle="Applies to the chosen text on your card." />
        <div className="tw-stack">
          {TEXT_TARGETS.map((target) => {
            const settings = effects.text[target.id];
            return (
              <div key={target.id} className="tw-effect-block">
                <div className="tw-subhead">{target.label}</div>
                <div className="tw-form-grid">
                  <Field label="Effect">
                    <Select
                      value={settings.effect}
                      options={TEXT_EFFECTS.map((entry) => ({ value: entry.id, label: entry.name }))}
                      onChange={(value) =>
                        setText(target.id, { effect: value as TextEffectSettings["effect"] })
                      }
                    />
                  </Field>
                  <div className="tw-color-row">
                    <ColorField
                      label="Colour A"
                      value={settings.colorA}
                      onChange={(value) => setText(target.id, { colorA: value })}
                    />
                    <ColorField
                      label="Colour B"
                      value={settings.colorB}
                      onChange={(value) => setText(target.id, { colorB: value })}
                    />
                  </div>
                  <Slider
                    label="Speed"
                    value={settings.speed}
                    min={0.5}
                    max={12}
                    step={0.5}
                    suffix="s"
                    onChange={(value) => setText(target.id, { speed: value })}
                  />
                  <Slider
                    label="Strength"
                    value={settings.strength}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(value) => setText(target.id, { strength: value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHead icon="move" title="Cursor" subtitle="Replace the pointer and let it leave a trail." />

        <input
          ref={cursorInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void uploadCursor(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />

        <div className="tw-form-grid">
          <Field
            label="Cursor image"
            hint="PNG, GIF or SVG. Leave it empty to keep the normal pointer."
            className="tw-span-2"
          >
            <div className="tw-row">
              <Button icon="upload" onClick={() => cursorInput.current?.click()}>
                {cursor.imageUrl ? "Replace cursor" : "Upload cursor"}
              </Button>
              {cursor.imageUrl ? (
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => setCursor({ imageUrl: "", style: "default" })}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </Field>
          {cursorError ? <p className="tw-foot-note">{cursorError}</p> : null}

          <ColorField
            label="Trail colour"
            value={cursor.color}
            onChange={(value) => setCursor({ color: value })}
          />
          <Slider
            label="Size"
            value={cursor.size}
            min={4}
            max={48}
            suffix="px"
            onChange={(value) => setCursor({ size: value })}
          />
        </div>

        <div className="tw-subhead">Trail</div>
        <div className="tw-inline-toggle">
          <span>
            <b>Show a trail</b>
            <small>The shapes that follow your pointer.</small>
          </span>
          <Toggle
            checked={cursor.trail}
            onChange={(checked) => setCursor({ trail: checked })}
            label="Cursor trail"
          />
        </div>

        {cursor.trail ? (
          <div className="tw-form-grid" style={{ marginTop: 12 }}>
            <Field label="Trail style">
              <Select
                value={cursor.trailType}
                options={CURSOR_TRAILS}
                onChange={(value) => setCursor({ trailType: value as CursorSettings["trailType"] })}
              />
            </Field>
            <Field label="Trail length">
              <Slider
                label="Shapes"
                value={cursor.trailLength}
                min={2}
                max={24}
                onChange={(value) => setCursor({ trailLength: value })}
              />
            </Field>
          </div>
        ) : null}
      </Card>
    </>
  );
}
