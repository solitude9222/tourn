import {
  BACKGROUND_EFFECTS,
  TEXT_EFFECTS,
  type BackgroundEffectSettings,
  type CursorSettings,
  type OverlayEffectSettings,
  type TextEffectSettings,
  type TextEffectTarget,
} from "../../lib/profileAssets";
import { useDash } from "../context";
import { Card, CardHead, ColorField, Field, Select, Slider, TextInput, Toggle } from "../ui";

const CURSORS: { value: CursorSettings["style"]; label: string }[] = [
  { value: "default", label: "System cursor" },
  { value: "dot", label: "Dot" },
  { value: "ring", label: "Ring" },
  { value: "crosshair", label: "Crosshair" },
  { value: "glow", label: "Glow" },
  { value: "custom", label: "Custom image" },
];

const TEXT_TARGETS: { id: TextEffectTarget; label: string }[] = [
  { id: "name", label: "Display name" },
  { id: "alias", label: "Username" },
  { id: "bio", label: "Bio" },
];

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

  return (
    <>
      <Card>
        <CardHead
          icon="sparkles"
          title="Background effect"
          subtitle="Animated layer behind your card."
        />
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
            value={overlay.opacity}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => setOverlay({ opacity: value })}
          />
          <Slider
            label="Intensity"
            value={overlay.intensity}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => setOverlay({ intensity: value })}
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
        <CardHead icon="move" title="Cursor" subtitle="Replace the pointer on your public page." />
        <div className="tw-form-grid">
          <Field label="Style">
            <Select
              value={cursor.style}
              options={CURSORS}
              onChange={(value) => setCursor({ style: value as CursorSettings["style"] })}
            />
          </Field>
          <ColorField
            label="Colour"
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
          <div className="tw-inline-toggle">
            <span>
              <b>Trail</b>
              <small>Dots following the pointer.</small>
            </span>
            <Toggle
              checked={cursor.trail}
              onChange={(checked) => setCursor({ trail: checked })}
              label="Cursor trail"
            />
          </div>
          <Field label="Custom cursor image" className="tw-span-2">
            <TextInput
              icon="image"
              value={cursor.imageUrl}
              placeholder="https://… or a data URL"
              onChange={(event) => setCursor({ imageUrl: event.target.value })}
            />
          </Field>
        </div>
      </Card>
    </>
  );
}
