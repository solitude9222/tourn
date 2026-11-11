import { ADDITIONAL_DISCORD_BADGES } from "../../lib/discord";
import { useAuth } from "../../lib/auth";
import "../widgetBadges.css";
import "../widgetIcons.css";
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
  type WidgetDesign,
  type WidgetInstance,
  type WidgetPlatform,
} from "../../lib/widgets";
import { useWidgetLive } from "../../lib/widgetLive";
import { WidgetPlatformIcon } from "../../components/WidgetPlatformIcon";
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

const EXTRA_BADGE_GROUPS: { label: string; hint: string; ids: string[] }[] = [
  { label: "Profile & account", hint: "Account age, Nitro and profile collection", ids: ["account-age", "nitro", "gifting", "orbs", "legacy-username"] },
  { label: "Activity", hint: "Playtime, quests and live activity", ids: ["game-time", "game-variety", "quests", "streaming", "last-meadow"] },
  { label: "Server", hint: "Boosting the tourn.lol server", ids: ["booster"] },
];

/* Extra display badges are a Discord-account feature only. The chooser stays
   locked (with a direct link to connect) for email-only accounts, and the
   widget still renders every native badge it can verify. */
function DiscordBadgeChoices({ value, onChange }: { value: boolean | string | undefined; onChange: (value: string) => void }) {
  const { user } = useAuth();
  const { go } = useDash();
  let selected: string[] = [];
  try { const parsed = JSON.parse(String(value || "[]")); if (Array.isArray(parsed)) selected = parsed.filter((item) => typeof item === "string"); } catch { /* No additional badges selected. */ }

  if (!user?.discordLinked) {
    return (
      <div className="tw-discord-badges-locked">
        <span className="tw-discord-badges-lock" aria-hidden="true">✦</span>
        <span className="tw-discord-badges-lock-copy">
          <b>Discord badges are Discord-only</b>
          <small>Connect Discord to your account to choose extra profile badges. Native Discord badges still show automatically.</small>
        </span>
        <Button variant="primary" icon="discord" onClick={() => go("settings")}>Connect Discord</Button>
      </div>
    );
  }

  return <details className="tw-extra-discord-badges">
    <summary><span>Additional Discord badges</span><span className="tw-extra-count">{selected.length} selected</span></summary>
    <p className="tw-foot-note">Only Discord-linked accounts can use these. They are display choices, not verified Discord flags.</p>
    <div className="tw-extra-badge-groups">{EXTRA_BADGE_GROUPS.map((group) => {
      const badges = ADDITIONAL_DISCORD_BADGES.filter((badge) => group.ids.includes(badge.id));
      if (!badges.length) return null;
      const active = badges.filter((badge) => selected.includes(badge.id)).length;
      return <details className="tw-extra-badge-group" key={group.label} open>
        <summary><span><b>{group.label}</b><small>{group.hint}</small></span><span className="tw-extra-count">{active}/{badges.length}</span></summary>
        <div className="tw-extra-badge-grid">{badges.map((badge) => <button key={badge.id} type="button" aria-pressed={selected.includes(badge.id)} onClick={() => onChange(JSON.stringify(selected.includes(badge.id) ? selected.filter((id) => id !== badge.id) : [...selected, badge.id]))}><img src={badge.art} alt="" /><span>{badge.label}</span><i aria-hidden="true" /></button>)}</div>
      </details>;
    })}</div>
  </details>;
}

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
  const { widgets, setWidgets, save, notify } = useDash();
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
    notify("Widget added", `${configuring.name} added. Changes save automatically.`);
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
                <WidgetPlatformIcon id={platform.id} size={19} />
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
          actions={
            <Button icon="save" onClick={save}>
              Save changes
            </Button>
          }
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
                    <WidgetPlatformIcon id={instance.platform} size={16} />
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
            <div className="tw-subhead">Surface</div>
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
              <Slider
                label="Background alpha"
                value={design.backgroundOpacity}
                min={0}
                max={1}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(value) => setDesign({ backgroundOpacity: value })}
              />
            </div>

            <div className="tw-form-grid">
              <Slider
                label="Blur"
                value={design.backgroundBlur}
                min={0}
                max={24}
                suffix="px"
                onChange={(value) => setDesign({ backgroundBlur: value })}
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

            <div className="tw-subhead">Border</div>
            <div className="tw-form-grid">
              <ColorField
                label="Border"
                value={design.borderColor}
                onChange={(value) => setDesign({ borderColor: value })}
              />
              <Slider
                label="Border width"
                value={design.borderWidth}
                min={0}
                max={6}
                suffix="px"
                onChange={(value) => setDesign({ borderWidth: value })}
              />
            </div>

            <Slider
              label="Border alpha"
              value={design.borderOpacity}
              min={0}
              max={1}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(value) => setDesign({ borderOpacity: value })}
            />

            <div className="tw-subhead">Edge animation</div>
            <Field label="Effect">
              <Select
                value={design.outlineEffect}
                options={[
                  { value: "none", label: "None" },
                  { value: "trace", label: "Trace · a line runs the border" },
                  { value: "march", label: "March · dashes chase each other" },
                  { value: "pulse", label: "Pulse · the ring breathes" },
                  { value: "glow", label: "Glow · halo around the card" },
                ]}
                onChange={(value) =>
                  setDesign({ outlineEffect: value as WidgetDesign["outlineEffect"] })
                }
              />
            </Field>

            <div className="tw-form-grid">
              <ColorField
                label="Edge colour"
                value={design.outlineColor}
                onChange={(value) => setDesign({ outlineColor: value })}
              />
              <Slider
                label="Edge speed"
                value={design.outlineSpeed}
                min={1}
                max={12}
                step={0.5}
                suffix="s"
                onChange={(value) => setDesign({ outlineSpeed: value })}
              />
            </div>

            <div className="tw-inline-toggle">
              <span>
                <b>Lift on hover</b>
                <small>Nudge the card up a pixel when the pointer is on it.</small>
              </span>
              <Toggle
                checked={design.hoverLift !== false}
                onChange={(checked) => setDesign({ hoverLift: checked })}
                label="Lift on hover"
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

            <div className="tw-subhead">Content</div>
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
                <small>Public flags only: Staff, Partner, HypeSquad, Bug Hunter, Early Supporter and Active Developer. Game Time, Variety, Nitro, Booster and Quests aren't exposed by Discord's API.</small>
              </span>
              <Toggle
                checked={design.showBadges}
                onChange={(checked) => setDesign({ showBadges: checked })}
                label="Show badges"
              />
            </div>
          </div>

          {/* Live reel: the cards exactly as they will render, scrolling
              past so every change above is visible while you make it. */}
          <aside className="tw-widget-preview" aria-label="Widget preview">
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
          </aside>
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
            {configuring.id === "discord" ? <DiscordBadgeChoices value={addOptions.profile_badges} onChange={(profile_badges) => setAddOptions((current) => ({ ...current, profile_badges }))} /> : null}
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
                onChange={(event) => {const value=event.target.value;setContent(value);setWidgets(current=>({...current,widgets:current.widgets.map(item=>item.id===editing.id?{...item,content:value}:item)}));}}
              />
            </Field>

            {editing.platform === "discord" ? <DiscordBadgeChoices value={editing.options.profile_badges} onChange={(profile_badges) => { updateOption(editing.id, "profile_badges", profile_badges); setEditing({ ...editing, options: { ...editing.options, profile_badges } }); }} /> : null}
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
