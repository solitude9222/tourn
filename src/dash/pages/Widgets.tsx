/* ---------------------------------------------------------------------------
   Links > Widgets — the real widget stack: add, configure, reorder, hide and
   the shared widget-card design. Every preview on this page is a real
   widget-card render; connected widgets read their live data.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import {
  DEFAULT_WIDGET_DESIGN,
  WIDGET_PLATFORMS,
  WIDGET_PLATFORM_BY_ID,
  createWidgetInstance,
  type WidgetInstance,
  type WidgetPlatform,
} from "../../lib/widgets";
import { useWidgetLive } from "../../lib/widgetLive";
import { PlatformIcon } from "../../components/PlatformIcons";
import { WidgetCard, WidgetCardPreview } from "../../components/WidgetCard";
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

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  offline: "Offline",
};

/** The click-through preview box: the real card plus everything the widget
 *  knows about the account behind it. */
function WidgetInspector({
  widget,
  onClose,
  onEdit,
}: {
  widget: WidgetInstance;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { widgets } = useDash();
  const result = useWidgetLive(widget);
  const live = result.data;
  const platform = WIDGET_PLATFORM_BY_ID.get(widget.platform);

  const rows: { label: string; value: string }[] = [
    { label: "Platform", value: platform?.name ?? widget.platform },
    { label: "Source", value: widget.content || "Not configured" },
    {
      label: "Status",
      value: live?.status ? STATUS_LABEL[live.status] ?? live.status : result.loading ? "Loading…" : "Unknown",
    },
    ...(live?.tag ? [{ label: "Tag", value: live.tag }] : []),
    ...(live?.badges.length
      ? [{ label: "Badges", value: live.badges.map((badge) => badge.label).join(", ") }]
      : []),
    ...(live?.meta.map((item) => ({ label: "Live data", value: item })) ?? []),
    ...(result.error ? [{ label: "Error", value: result.error.message }] : []),
  ];

  return (
    <Modal
      open
      title={platform?.name ?? "Widget"}
      subtitle={result.loading ? "Reading live data…" : "Live preview and data"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon="edit" onClick={onEdit}>
            Edit widget
          </Button>
        </>
      }
    >
      <div className="tw-stack">
        <div className="tw-widget-inspect">
          <WidgetCard widget={widget} design={widgets.design} />
        </div>
        <div className="tw-widget-data">
          {rows.map((row, index) => (
            <div className="tw-widget-data-row" key={`${row.label}-${index}`}>
              <span>{row.label}</span>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
        <p className="tw-foot-note">
          Data comes from the platform's public API and refreshes while this box is open.
        </p>
      </div>
    </Modal>
  );
}

export function WidgetsPage() {
  const { widgets, setWidgets, notify } = useDash();
  const [configuring, setConfiguring] = useState<WidgetPlatform | null>(null);
  const [editing, setEditing] = useState<WidgetInstance | null>(null);
  const [inspecting, setInspecting] = useState<WidgetInstance | null>(null);
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
  // "Real preview" scrolls the widgets that are actually on the profile, with
  // their live data — the samples are only a stand-in for a brand-new account.
  const active = widgets.widgets.filter((widget) => widget.visible !== false);

  const setDesign = (patch: Partial<typeof design>) =>
    setWidgets((current) => ({ ...current, design: { ...current.design, ...patch } }));

  return (
    <>
      <Card>
        <CardHead
          icon="grid"
          title="Available widgets"
          subtitle="Pick a platform to add it to your stack."
        />

        <div className="tw-widget-gallery">
          {WIDGET_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className="tw-widget-pick"
              style={{ ["--widget-color" as string]: platform.color }}
              onClick={() => openAdd(platform)}
            >
              <span className="tw-widget-pick-icon" aria-hidden="true">
                <PlatformIcon id={platform.id} size={19} />
              </span>
              <span className="tw-widget-pick-copy">
                <b>{platform.name}</b>
                <small>{platform.description}</small>
              </span>
              <span className="tw-widget-pick-add">
                <Icon name="plus" size={13} />
                Add
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead
          icon="layers"
          title="Connected widgets"
          subtitle="Click a widget to preview it and its live data."
        />

        {widgets.widgets.length ? (
          <div className="tw-widget-list" style={{ gap: design.gap }}>
            {widgets.widgets.map((instance, index) => {
              const platform = platformFor(instance);
              return (
                <div
                  key={instance.id}
                  className="tw-widget-row"
                  draggable
                  onClick={() => setInspecting(instance)}
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
                  <span className="tw-widget-icon">
                    <PlatformIcon id={instance.platform} size={16} />
                  </span>
                  <span className="tw-widget-row-copy">
                    <b>{platform?.name ?? instance.platform}</b>
                    <small>{instance.content || "Not configured"}</small>
                  </span>
                  <span
                    className="tw-widget-row-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
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
                  </span>
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
          title="Widget appearance"
          subtitle="Applies to every widget on your profile."
          actions={
            <Button
              icon="refresh"
              onClick={() => {
                setWidgets((current) => ({ ...current, design: { ...DEFAULT_WIDGET_DESIGN } }));
                notify("Widget design", "Defaults restored — save to publish.");
              }}
            >
              Reset to defaults
            </Button>
          }
        />

        <div className="tw-widget-design">
          <div className="tw-stack">
            <Field label="Background">
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
                label="Border width"
                value={design.borderWidth}
                min={0}
                max={6}
                suffix="px"
                onChange={(value) => setDesign({ borderWidth: value })}
              />
              <Slider
                label="Border alpha"
                value={design.borderOpacity}
                min={0}
                max={1}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(value) => setDesign({ borderOpacity: value })}
              />
            </div>

            <div className="tw-form-grid">
              <Slider
                label="Background alpha"
                value={design.backgroundOpacity}
                min={0}
                max={1}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(value) => setDesign({ backgroundOpacity: value })}
              />
              <Slider
                label="Corner radius"
                value={design.radius}
                min={0}
                max={28}
                suffix="px"
                onChange={(value) => setDesign({ radius: value })}
              />
            </div>

            <div className="tw-subhead">Stack</div>
            <div className="tw-form-grid">
              <Slider
                label="Card size"
                value={Math.round(design.scale * 100)}
                min={85}
                max={115}
                suffix="%"
                onChange={(value) => setDesign({ scale: value / 100 })}
              />
              <Slider
                label="Spacing"
                value={design.gap}
                min={0}
                max={28}
                suffix="px"
                onChange={(value) => setDesign({ gap: value })}
              />
            </div>

            <div className="tw-inline-toggle">
              <span>
                <b>Show live details</b>
                <small>The member, follower or stat chips under each name.</small>
              </span>
              <Toggle
                checked={design.showMeta}
                onChange={(checked) => setDesign({ showMeta: checked })}
                label="Show live details"
              />
            </div>

            <div className="tw-inline-toggle">
              <span>
                <b>Show badges</b>
                <small>Every Discord badge the account carries, next to the name.</small>
              </span>
              <Toggle
                checked={design.showBadges}
                onChange={(checked) => setDesign({ showBadges: checked })}
                label="Show badges"
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
            <div className="tw-widget-preview-head">
              <small>Real preview</small>
              <span className="tw-widget-preview-note">
                {active.length
                  ? `${active.length} active widget${active.length === 1 ? "" : "s"}`
                  : "sample cards"}
              </span>
            </div>
            <div className="tw-widget-scroll">
              <div className="tw-widget-scroll-track">
                {[0, 1].map((pass) => (
                  <div
                    className="tw-widget-scroll-pass"
                    key={pass}
                    aria-hidden={pass === 1 ? "true" : undefined}
                  >
                    {active.length
                      ? active.map((widget) => (
                          <WidgetCard
                            key={`${pass}-${widget.id}`}
                            widget={widget}
                            design={design}
                            className="widget-card--reel"
                          />
                        ))
                      : ["discord", "discordbot", "spotify", "roblox"].map((id) => (
                          <WidgetCardPreview
                            key={`${pass}-${id}`}
                            design={design}
                            platformId={id}
                            className="widget-card--reel"
                          />
                        ))}
                  </div>
                ))}
              </div>
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
            <div className="tw-widget-inspect">
              <WidgetCardPreview
                design={design}
                platformId={configuring.id}
                content={content.trim() || undefined}
              />
            </div>

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
            <div className="tw-widget-inspect">
              {/* The sample render keeps typing from firing a live request per
                  keystroke; the click-through inspector has the real data. */}
              <WidgetCardPreview
                design={design}
                platformId={editing.platform}
                content={content.trim() || undefined}
              />
            </div>
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

      {inspecting ? (
        <WidgetInspector
          widget={inspecting}
          onClose={() => setInspecting(null)}
          onEdit={() => {
            const target = inspecting;
            setInspecting(null);
            openEdit(target);
          }}
        />
      ) : null}
    </>
  );
}
