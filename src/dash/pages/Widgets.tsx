/* ---------------------------------------------------------------------------
   Links > Widgets — the real widget stack: add, configure, reorder, hide and
   the shared widget-card design.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import {
  DEFAULT_WIDGET_DESIGN,
  WIDGET_PLATFORMS,
  WIDGET_PLATFORM_BY_ID,
  createWidgetInstance,
  type WidgetInstance,
  type WidgetPlatform,
} from "../../lib/widgets";
import { useDash } from "../context";
import {
  Button,
  Card,
  CardHead,
  ColorField,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Modal,
  Select,
  Slider,
  TextInput,
  Toggle,
} from "../ui";

export function WidgetsPage() {
  const { widgets, setWidgets, notify } = useDash();
  const [configuring, setConfiguring] = useState<WidgetPlatform | null>(null);
  const [editing, setEditing] = useState<WidgetInstance | null>(null);
  const [content, setContent] = useState("");
  const [addOptions, setAddOptions] = useState<Record<string, boolean | string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const platformFor = (instance: WidgetInstance) => WIDGET_PLATFORM_BY_ID.get(instance.platform);

  const openAdd = (platform: WidgetPlatform) => {
    setConfiguring(platform);
    setContent("");
    const defaults: Record<string, boolean | string> = {};
    platform.options.forEach((option) => {
      defaults[option.key] =
        option.type === "toggle" ? option.default === true : String(option.default ?? "");
    });
    setAddOptions(defaults);
  };

  const openEdit = (instance: WidgetInstance) => {
    setEditing(instance);
    setContent(instance.content);
  };

  const commitAdd = () => {
    if (!configuring) return;
    const instance = createWidgetInstance(configuring);
    instance.content = content.trim();
    instance.options = { ...instance.options, ...addOptions };
    if (!instance.content) {
      notify("Widget", `Add your ${configuring.name} handle first.`);
      return;
    }
    setWidgets((current) => ({ ...current, widgets: [...current.widgets, instance] }));
    setConfiguring(null);
    notify("Widget added", `${configuring.name} is on your profile once you save.`);
  };

  const commitEdit = () => {
    if (!editing) return;
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.map((entry) =>
        entry.id === editing.id ? { ...entry, content: content.trim() } : entry,
      ),
    }));
    setEditing(null);
  };

  const updateOption = (id: string, key: string, value: boolean | string) =>
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.map((entry) =>
        entry.id === id ? { ...entry, options: { ...entry.options, [key]: value } } : entry,
      ),
    }));

  const design = widgets.design;

  const setDesign = (patch: Partial<typeof design>) =>
    setWidgets((current) => ({ ...current, design: { ...current.design, ...patch } }));

  const previewStyle = useMemo(
    () => ({
      background:
        design.backgroundStyle === "gradient"
          ? `linear-gradient(135deg, ${design.gradientFrom}, ${design.gradientTo})`
          : design.backgroundColor,
      opacity: design.backgroundOpacity,
      borderRadius: design.radius,
      borderWidth: design.borderWidth,
      borderColor: design.borderColor,
      borderStyle: "solid" as const,
      filter: design.backgroundBlur > 0 ? `blur(${design.backgroundBlur / 2}px)` : undefined,
    }),
    [design],
  );

  return (
    <>
      <Card>
        <CardHead
          icon="grid"
          title="Available Widgets"
          subtitle="Select a widget to configure it"
        />

        <div className="tw-grid tw-grid--3">
          {WIDGET_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className="tw-widget-tile"
              style={{ ["--widget-color" as string]: platform.color }}
              onClick={() => openAdd(platform)}
            >
              <span className="tw-widget-icon" style={{ background: platform.color }}>
                {platform.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="tw-widget-copy">
                <b>{platform.name}</b>
                <small>{platform.description}</small>
              </span>
              <span className="tw-widget-mark" aria-hidden="true">
                {platform.name.slice(0, 1)}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead
          icon="layers"
          title="Connected Widgets"
          subtitle="Manage your active profile widgets"
        />

        {widgets.widgets.length ? (
          <div>
            {widgets.widgets.map((instance, index) => {
              const platform = platformFor(instance);
              return (
                <div
                  key={instance.id}
                  className="tw-widget-row"
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) {
                      setWidgets((current) => {
                        const next = [...current.widgets];
                        const [moved] = next.splice(dragIndex, 1);
                        next.splice(index, 0, moved);
                        return { ...current, widgets: next };
                      });
                    }
                    setDragIndex(null);
                  }}
                >
                  <span className="tw-drag">
                    <Icon name="drag" size={14} />
                  </span>
                  <span
                    className="tw-widget-icon"
                    style={{ background: platform?.color ?? "#333", width: 30, height: 30 }}
                  >
                    {platform?.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="tw-widget-row-copy">
                    <b>{platform?.name ?? instance.platform}</b>
                    <small>{instance.content || "Not configured"}</small>
                  </span>
                  <Toggle
                    checked={instance.visible !== false}
                    onChange={(checked) =>
                      setWidgets((current) => ({
                        ...current,
                        widgets: current.widgets.map((entry) =>
                          entry.id === instance.id ? { ...entry, visible: checked } : entry,
                        ),
                      }))
                    }
                    label={`Show ${platform?.name ?? "widget"}`}
                  />
                  <IconButton
                    label={`Edit ${platform?.name ?? "widget"}`}
                    icon="edit"
                    variant="primary"
                    onClick={() => openEdit(instance)}
                  />
                  <IconButton
                    label={`Delete ${platform?.name ?? "widget"}`}
                    icon="trash"
                    variant="danger"
                    onClick={() =>
                      setWidgets((current) => ({
                        ...current,
                        widgets: current.widgets.filter((entry) => entry.id !== instance.id),
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="grid"
            title="No widgets connected"
            message="Pick a platform above to build the stack visitors see."
          />
        )}
      </Card>

      <Card>
        <CardHead
          icon="palette"
          title="Widget Card Customization"
          subtitle="Adjust the shared design of your profile widgets. Background colour is only visible on widgets without their own image background."
          actions={
            <Button
              icon="refresh"
              onClick={() => {
                setWidgets((current) => ({ ...current, design: { ...DEFAULT_WIDGET_DESIGN } }));
                notify("Widget design", "Defaults restored — save to publish.");
              }}
            >
              Reset to Defaults
            </Button>
          }
        />

        <div className="tw-widget-design">
          <div className="tw-stack">
            <Field label="Background style">
              <Select
                value={design.backgroundStyle}
                options={[
                  { value: "solid", label: "Solid" },
                  { value: "frosted", label: "Frosted" },
                  { value: "gradient", label: "Gradient" },
                  { value: "rgb", label: "RGB" },
                  { value: "art", label: "Artwork" },
                ]}
                onChange={(value) =>
                  setDesign({ backgroundStyle: value as typeof design.backgroundStyle })
                }
              />
            </Field>

            <div className="tw-form-grid">
              <ColorField
                label="Background"
                value={design.backgroundColor}
                onChange={(value) => setDesign({ backgroundColor: value })}
              />
              <ColorField
                label="Border"
                value={design.borderColor}
                onChange={(value) => setDesign({ borderColor: value })}
              />
            </div>

            <div className="tw-form-grid">
              <Slider
                label="Border Width"
                value={design.borderWidth}
                min={0}
                max={6}
                suffix="px"
                onChange={(value) => setDesign({ borderWidth: value })}
              />
              <Slider
                label="Radius"
                value={design.radius}
                min={0}
                max={28}
                suffix="px"
                onChange={(value) => setDesign({ radius: value })}
              />
            </div>

            <div className="tw-form-grid">
              <Slider
                label="Opacity"
                value={design.backgroundOpacity}
                min={0}
                max={1}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(value) => setDesign({ backgroundOpacity: value })}
              />
              <Slider
                label="Blur"
                value={design.backgroundBlur}
                min={0}
                max={24}
                suffix="px"
                onChange={(value) => setDesign({ backgroundBlur: value })}
              />
            </div>
          </div>

          <div className="tw-widget-preview">
            <small>Preview</small>
            <div className="tw-widget-preview-note">Normal widget card without an image background.</div>
            <div className="tw-widget-preview-frame">
              <div className="tw-widget-preview-card" style={previewStyle}>
                <span className="tw-widget-preview-icon">
                  <Icon name="discord" size={14} />
                </span>
                <span>
                  <b>Your widget</b>
                  <small>Live preview</small>
                </span>
              </div>
              <div className="tw-widget-preview-brand">tourn.lol</div>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(configuring)}
        title={configuring ? `Add ${configuring.name}` : "Add widget"}
        subtitle={configuring?.didYouKnow}
        onClose={() => setConfiguring(null)}
        footer={
          <>
            <Button onClick={() => setConfiguring(null)}>Cancel</Button>
            <Button variant="primary" icon="plus" onClick={commitAdd}>
              Add widget
            </Button>
          </>
        }
      >
        {configuring ? (
          <div className="tw-stack">
            <Field label={configuring.contentLabel}>
              <TextInput
                icon="at"
                value={content}
                placeholder={configuring.contentPlaceholder}
                onChange={(event) => setContent(event.target.value)}
              />
            </Field>
            <div className="tw-option-grid">
              {configuring.options.map((option) =>
                option.type === "toggle" ? (
                  <div className="tw-inline-toggle" key={option.key}>
                    <span>
                      <b>{option.label}</b>
                      <small>{option.hint}</small>
                    </span>
                    <Toggle
                      checked={addOptions[option.key] === true}
                      onChange={(checked) =>
                        setAddOptions((current) => ({ ...current, [option.key]: checked }))
                      }
                      label={option.label}
                    />
                  </div>
                ) : (
                  <Field key={option.key} label={option.label}>
                    <Select
                      value={String(addOptions[option.key] ?? option.default ?? "")}
                      options={(option.choices ?? []).map((choice) => ({
                        value: choice.value,
                        label: choice.label,
                      }))}
                      onChange={(value) =>
                        setAddOptions((current) => ({ ...current, [option.key]: value }))
                      }
                    />
                  </Field>
                ),
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        title={`Edit ${editing ? WIDGET_PLATFORM_BY_ID.get(editing.platform)?.name ?? "widget" : "widget"}`}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={commitEdit}>
              Save widget
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="tw-stack">
            <Field
              label={WIDGET_PLATFORM_BY_ID.get(editing.platform)?.contentLabel ?? "Content"}
            >
              <TextInput
                icon="at"
                value={content}
                placeholder={WIDGET_PLATFORM_BY_ID.get(editing.platform)?.contentPlaceholder}
                onChange={(event) => setContent(event.target.value)}
              />
            </Field>

            {(WIDGET_PLATFORM_BY_ID.get(editing.platform)?.options ?? []).map((option) =>
              option.type === "toggle" ? (
                <div className="tw-inline-toggle" key={option.key}>
                  <span>
                    <b>{option.label}</b>
                    <small>{option.hint}</small>
                  </span>
                  <Toggle
                    checked={editing.options[option.key] === true}
                    onChange={(checked) => {
                      updateOption(editing.id, option.key, checked);
                      setEditing({
                        ...editing,
                        options: { ...editing.options, [option.key]: checked },
                      });
                    }}
                    label={option.label}
                  />
                </div>
              ) : (
                <Field key={option.key} label={option.label}>
                  <Select
                    value={String(editing.options[option.key] ?? option.default)}
                    options={(option.choices ?? []).map((choice) => ({
                      value: choice.value,
                      label: choice.label,
                    }))}
                    onChange={(value) => {
                      updateOption(editing.id, option.key, value);
                      setEditing({
                        ...editing,
                        options: { ...editing.options, [option.key]: value },
                      });
                    }}
                  />
                </Field>
              ),
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
