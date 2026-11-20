import { ADDITIONAL_DISCORD_BADGES, isDiscordUserId } from "../../lib/discord";
import { useAuth } from "../../lib/auth";
import "../widgetBadges.css";
import "../widgetIcons.css";
/* ---------------------------------------------------------------------------
   Widgets — the widget workspace.

   One screen: a stack you can drag, open and configure in place, a searchable
   platform list, and one shared appearance panel with a live preview beside it.
   Every preview is a real widget-card render.
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
import { PageActions } from "../PageActions";
import { usePointerSort } from "../Sortable";
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
function DiscordBadgeChoices({ value, content, onChange }: { value: boolean | string | undefined; content: string; onChange: (value: string) => void }) {
  const { user } = useAuth();
  const { go } = useDash();
  const selected: string[] = [];
  const details: Record<string, { stage: number; count: string }> = {};
  try {
    const parsed = JSON.parse(String(value || "[]"));
    if (Array.isArray(parsed)) for (const item of parsed) {
      if (typeof item !== "string") continue;
      const [id, stage, count] = item.split("~");
      selected.push(id);
      details[id] = { stage: Math.max(1, Number(stage) || 1), count: count || "" };
    }
  } catch { /* malformed saved option */ }
  const encode = (ids: string[], next = details) => JSON.stringify(ids.map((id) => `${id}~${next[id]?.stage || 1}~${next[id]?.count || ""}`));
  const setStage = (id: string, stage: number) => onChange(encode(selected, { ...details, [id]: { stage, count: details[id]?.count || "" } }));
  const setCount = (id: string, count: string) => onChange(encode(selected, { ...details, [id]: { stage: details[id]?.stage || 1, count } }));

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

  if (!isDiscordUserId(content)) {
    return (
      <div className="tw-discord-badges-locked">
        <span className="tw-discord-badges-lock" aria-hidden="true">✦</span>
        <span className="tw-discord-badges-lock-copy">
          <b>Discord user IDs only</b>
          <small>Enter a Discord user ID (or a discord.com/users/… link) to choose extra badges. Server invites and bots do not have user profile badges.</small>
        </span>
      </div>
    );
  }

  return <details className="tw-extra-discord-badges">
    <summary><span>Additional Discord badges</span><span className="tw-extra-count">{selected.length} selected</span></summary>
    <p className="tw-foot-note">Only Discord-linked accounts can use these. They are display choices, not verified Discord flags. Stages follow Discord's real badge progression.</p>
    <div className="tw-extra-badge-groups">{EXTRA_BADGE_GROUPS.map((group) => {
      const badges = ADDITIONAL_DISCORD_BADGES.filter((badge) => group.ids.includes(badge.id));
      if (!badges.length) return null;
      const active = badges.filter((badge) => selected.includes(badge.id)).length;
      return <details className="tw-extra-badge-group" key={group.label} open>
        <summary><span><b>{group.label}</b><small>{group.hint}</small></span><span className="tw-extra-count">{active}/{badges.length}</span></summary>
        <div className="tw-extra-badge-grid">{badges.map((badge) => <button key={badge.id} type="button" aria-pressed={selected.includes(badge.id)} onClick={() => onChange(encode(selected.includes(badge.id) ? selected.filter((id) => id !== badge.id) : [...selected, badge.id]))}><img src={badge.art} alt="" loading="lazy" decoding="async" /><span>{badge.label}</span><i aria-hidden="true" /></button>)}</div>
      </details>;
    })}</div>
    <div className="tw-badge-stages">{selected.map((id) => {
      const badge = ADDITIONAL_DISCORD_BADGES.find((item) => item.id === id);
      if (!badge) return null;
      const stages = badge.stages;
      const current = stages.find((stage) => stage.level === details[id]?.stage) ?? stages[0];
      if (!current) return null;
      return <div className="tw-badge-stage" key={id}>
        <b>{badge.label}</b>
        {stages.length > 1
          ? <Field label="Stage"><Select ariaLabel={`${badge.label} stage`} value={String(current.level)} options={stages.map((stage) => ({ value: String(stage.level), label: `${stage.name} · ${stage.requirement}` }))} onChange={(stage) => setStage(id, Number(stage))} /></Field>
          : <Field label="Tier"><span className="tw-badge-stage-single">{current.name}</span></Field>}
        {badge.countLabel ? <Field label={badge.countLabel} hint={badge.countHint}><TextInput inputMode="numeric" value={details[id]?.count || ""} maxLength={12} placeholder={badge.countPlaceholder} onChange={(event) => setCount(id, event.target.value.replace(/[^0-9.,+]/g, ""))} /></Field> : null}
        {stages.length <= 1 && !badge.countLabel ? <small className="tw-badge-stage-note">{current.requirement}. No evolution tiers.</small> : null}
      </div>;
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
  const { widgets, setWidgets, about, notify } = useDash();
  const [configuring, setConfiguring] = useState<WidgetPlatform | null>(null);
  const [content, setContent] = useState("");
  const [addOptions, setAddOptions] = useState<Record<string, boolean | string>>({});
  const [inspecting, setInspecting] = useState<WidgetInstance | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const design = widgets.design;
  const active = widgets.widgets.filter((widget) => widget.visible !== false);
  const used = new Map<string, number>();
  for (const widget of widgets.widgets) used.set(widget.platform, (used.get(widget.platform) ?? 0) + 1);

  const search = query.trim().toLowerCase();
  const platforms = WIDGET_PLATFORMS.filter(
    (platform) =>
      !search ||
      platform.name.toLowerCase().includes(search) ||
      platform.description.toLowerCase().includes(search),
  );

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

  const commitAdd = () => {
    if (!configuring) return;
    if (!content.trim()) {
      notify("Widget", `Add your ${configuring.name} handle first.`);
      return;
    }
    const instance = createWidgetInstance(configuring);
    instance.content = content.trim();
    instance.options = { ...instance.options, ...addOptions };
    setWidgets((current) => ({ ...current, widgets: [...current.widgets, instance] }));
    setConfiguring(null);
    setOpenId(instance.id);
    notify("Widget added", `${configuring.name} added. Save to publish it.`);
  };

  const patchWidget = (id: string, patch: Partial<WidgetInstance>) =>
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));

  const updateOption = (id: string, key: string, value: boolean | string) =>
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.map((entry) =>
        entry.id === id ? { ...entry, options: { ...entry.options, [key]: value } } : entry,
      ),
    }));

  const remove = (instance: WidgetInstance) => {
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.filter((entry) => entry.id !== instance.id),
    }));
    if (openId === instance.id) setOpenId(null);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    setWidgets((current) => {
      const next = [...current.widgets];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, widgets: next };
    });
  };

  const sortable = usePointerSort(widgets.widgets, move);

  const widgetTitle = (instance: WidgetInstance) => {
    const platform = platformFor(instance);
    if (instance.platform === "discord") {
      const value = instance.content.trim();
      if (/discord\.(gg|com\/invite)\//i.test(value)) return "Discord (server)";
      if (/^\d{17,20}$/.test(value)) return "Discord Presence";
    }
    return platform?.name ?? instance.platform;
  };

  const widgetSubtitle = (instance: WidgetInstance) => {
    if (instance.platform === "discord" && /^\d{17,20}$/.test(instance.content.trim())) return "Active on profile";
    return instance.content || "Not configured yet";
  };

  const slotLimit = about.design.layout === "left" ? 4 : 1;
  const overSlotLimit = active.length > slotLimit;

  const setDesign = (patch: Partial<typeof design>) =>
    setWidgets((current) => ({ ...current, design: { ...current.design, ...patch } }));

  return (
    <>
      <PageActions>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => document.getElementById("dash-widget-add")?.scrollIntoView({ block: "start" })}
        >
          Add widget
        </Button>
      </PageActions>

      <div className="tw-manage-page tw-widgets-page">
        <div className="tw-manage-bar">
          <span>Manage your active profile widgets</span>
          <span className={`tw-manage-count${overSlotLimit ? " is-warning" : ""}`}>
            {active.length} of {slotLimit} used
          </span>
        </div>

        {overSlotLimit ? (
          <div className="tw-manage-notice">
            <Icon name="help" size={17} />
            <span>
              Your card layout shows {slotLimit} widget{slotLimit === 1 ? "" : "s"}. Remove{" "}
              {active.length - slotLimit === 1 ? "it" : `${active.length - slotLimit}`} or switch to the left layout for four.
            </span>
          </div>
        ) : null}

        {widgets.widgets.length ? (
          <div className="tw-manage-list">
            {widgets.widgets.map((instance, index) => {
              const platform = platformFor(instance);
              const open = openId === instance.id;
              const visible = instance.visible !== false;
              return (
                <div
                  key={instance.id}
                  ref={sortable.register(instance.id)}
                  className={[
                    "tw-manage-row tw-widget-manage-row",
                    open ? "is-open" : "",
                    visible ? "" : "is-hidden",
                    sortable.drag?.from === index ? "is-dragging" : "",
                    sortable.drag && sortable.drag.over === index && sortable.drag.from !== index ? "is-drop-target" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <button
                    type="button"
                    className="tw-row-grip"
                    aria-label={`Reorder ${widgetTitle(instance)}`}
                    title="Drag to reorder · arrow keys also move this row"
                    aria-grabbed={sortable.drag?.from === index}
                    onPointerDown={(event) => sortable.begin(event, index)}
                    onKeyDown={(event) => sortable.keyDown(event, index)}
                  >
                    <Icon name="drag" size={16} />
                  </button>

                  <div className="tw-manage-content">
                    <div className="tw-manage-head">
                      <span className="tw-manage-icon tw-manage-icon--widget" style={{ ["--widget-color" as string]: platform?.color }}>
                        <WidgetPlatformIcon id={instance.platform} size={22} />
                      </span>
                      <span className="tw-manage-copy">
                        <b>
                          {widgetTitle(instance)}
                          {visible ? null : <em className="tw-manage-badge">Hidden</em>}
                        </b>
                        <small>{widgetSubtitle(instance)}</small>
                      </span>
                      <span className="tw-manage-actions">
                        <Toggle
                          checked={visible}
                          onChange={(checked) => patchWidget(instance.id, { visible: checked })}
                          label={`Show ${widgetTitle(instance)}`}
                        />
                        <IconButton
                          label={open ? "Close settings" : `Edit ${widgetTitle(instance)}`}
                          icon={open ? "chevron-down" : "edit"}
                          onClick={() => setOpenId(open ? null : instance.id)}
                        />
                        <IconButton
                          label={`Delete ${widgetTitle(instance)}`}
                          icon="trash"
                          variant="danger"
                          onClick={() => remove(instance)}
                        />
                      </span>
                    </div>

                    {open ? (
                      <div className="tw-wstack-body">
                        <div className="tw-wstack-body-grid">
                          <div className="tw-stack">
                            <Field label={platform?.contentLabel ?? "Content"}>
                              <TextInput
                                icon="at"
                                value={instance.content}
                                placeholder={platform?.contentPlaceholder}
                                onChange={(event) => patchWidget(instance.id, { content: event.target.value })}
                              />
                            </Field>

                            {instance.platform === "discord" ? (
                              <DiscordBadgeChoices
                                value={instance.options.profile_badges}
                                content={instance.content}
                                onChange={(profile_badges) => updateOption(instance.id, "profile_badges", profile_badges)}
                              />
                            ) : null}

                            <div className="tw-option-grid">
                              {(platform?.options ?? []).map((option) =>
                                option.type === "toggle" ? (
                                  <div className="tw-inline-toggle" key={option.key}>
                                    <span>
                                      <b>{option.label}</b>
                                      <small>{option.hint}</small>
                                    </span>
                                    <Toggle
                                      checked={instance.options[option.key] === true}
                                      onChange={(checked) => updateOption(instance.id, option.key, checked)}
                                      label={option.label}
                                    />
                                  </div>
                                ) : (
                                  <Field key={option.key} label={option.label}>
                                    <Select
                                      value={String(instance.options[option.key] ?? option.default ?? "")}
                                      options={(option.choices ?? []).map((choice) => ({
                                        value: choice.value,
                                        label: choice.label,
                                      }))}
                                      onChange={(value) => updateOption(instance.id, option.key, value)}
                                    />
                                  </Field>
                                ),
                              )}
                            </div>
                          </div>

                          <aside className="tw-wstack-side">
                            <small className="tw-wstack-side-label">Preview</small>
                            <WidgetCard widget={instance} design={design} />
                            <Button icon="external" onClick={() => setInspecting(instance)}>
                              Open live data
                            </Button>
                          </aside>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="grid"
            title="Nothing in the stack"
            message="Pick a platform from the list below to build the stack visitors see."
          />
        )}
      </div>

      <Card className="tw-widget-customization">
        <CardHead
          plain
          title="Widget Card Customization"
          subtitle="Adjust the shared design of your profile widgets. Background color is only visible on widgets without their own image background."
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

        <div className="tw-widget-custom-grid">
          <div className="tw-widget-tune-grid">
            <div className="tw-widget-tune">
              <Slider
                label="Border Width"
                value={design.borderWidth}
                min={0}
                max={6}
                suffix="px"
                onChange={(value) => setDesign({ borderWidth: value })}
              />
            </div>
            <div className="tw-widget-tune">
              <Slider
                label="Border Opacity"
                value={design.borderOpacity}
                min={0}
                max={1}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(value) => setDesign({ borderOpacity: value })}
              />
            </div>
            <div className="tw-widget-tune">
              <ColorField
                label="Border Color"
                value={design.borderColor}
                onChange={(value) => setDesign({ borderColor: value })}
              />
            </div>
            <div className="tw-widget-tune">
              <ColorField
                label="Background Color"
                value={design.backgroundColor}
                onChange={(value) => setDesign({ backgroundColor: value })}
              />
            </div>
            <div className="tw-widget-tune">
              <Slider
                label="Background Opacity"
                value={design.backgroundOpacity}
                min={0}
                max={1}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(value) => setDesign({ backgroundOpacity: value })}
              />
            </div>
            <div className="tw-widget-tune">
              <Slider
                label="Background Blur"
                value={design.backgroundBlur}
                min={0}
                max={24}
                suffix="px"
                onChange={(value) => setDesign({ backgroundBlur: value })}
              />
            </div>
          </div>

          <div className="tw-widget-avatar-controls">
            <div className="tw-widget-avatar-controls-head">
              <b>Widget avatars</b>
              <small>Choose the shape and framing of every platform picture.</small>
            </div>
            <div className="tw-form-grid">
              <Field label="Avatar shape">
                <Select
                  value={design.avatarShape}
                  options={[
                    { value: "circle", label: "Circle" },
                    { value: "rounded", label: "Rounded" },
                    { value: "squircle", label: "Squircle" },
                    { value: "square", label: "Square" },
                    { value: "hexagon", label: "Hexagon" },
                  ]}
                  onChange={(avatarShape) => setDesign({ avatarShape: avatarShape as WidgetDesign["avatarShape"] })}
                />
              </Field>
              <Slider label="Avatar size" value={design.avatarSize} min={28} max={112} suffix="px" onChange={(avatarSize) => setDesign({ avatarSize })} />
              <Slider label="Avatar border" value={design.avatarBorderWidth} min={0} max={6} suffix="px" onChange={(avatarBorderWidth) => setDesign({ avatarBorderWidth })} />
              <ColorField label="Avatar border colour" value={design.avatarBorderColor} onChange={(avatarBorderColor) => setDesign({ avatarBorderColor })} />
              <div className="tw-inline-toggle">
                <span>
                  <b>Avatar shadow</b>
                  <small>A soft drop shadow under each picture.</small>
                </span>
                <Toggle checked={design.avatarShadow} onChange={(avatarShadow) => setDesign({ avatarShadow })} label="Avatar shadow" />
              </div>
            </div>
          </div>

          <aside className="tw-widget-preview tw-widget-preview--panel" aria-label="Widget preview">
            <div className="tw-widget-preview-head">
              <div>
                <small>Preview</small>
                <span className="tw-widget-preview-note">Normal widget card without an image background.</span>
              </div>
            </div>
            <div className="tw-widget-design-preview-card">
              <WidgetCardPreview design={design} platformId={active[0]?.platform ?? "discord"} />
            </div>
          </aside>
        </div>

        <details className="tw-advanced tw-widget-more">
          <summary>
            More card controls
            <small>background style, radius, artwork, edge animation, spacing and content</small>
          </summary>

          <div className="tw-form-grid">
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
                onChange={(value) => setDesign({ backgroundStyle: value as typeof design.backgroundStyle })}
              />
            </Field>
            <Field label="Corner radius">
              <Slider
                label="Corner radius"
                value={design.radius}
                min={0}
                max={28}
                suffix="px"
                onChange={(value) => setDesign({ radius: value })}
              />
            </Field>
            <Slider
              label="Artwork opacity"
              value={Math.round(design.artOpacity * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => setDesign({ artOpacity: value / 100 })}
            />
            <Slider
              label="Shading opacity"
              value={Math.round(design.scrimOpacity * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => setDesign({ scrimOpacity: value / 100 })}
            />
            <Field label="Edge effect">
              <Select
                value={design.outlineEffect}
                options={[
                  { value: "none", label: "None" },
                  { value: "trace", label: "Trace · a line runs the border" },
                  { value: "march", label: "March · dashes chase each other" },
                  { value: "pulse", label: "Pulse · the ring breathes" },
                  { value: "glow", label: "Glow · halo around the card" },
                ]}
                onChange={(value) => setDesign({ outlineEffect: value as WidgetDesign["outlineEffect"] })}
              />
            </Field>
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
            <Slider
              label="Spacing"
              value={design.gap}
              min={0}
              max={28}
              suffix="px"
              onChange={(value) => setDesign({ gap: value })}
            />
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
                <small>Public flags only: Staff, Partner, HypeSquad, Bug Hunter, Early Supporter and Active Developer.</small>
              </span>
              <Toggle
                checked={design.showBadges}
                onChange={(checked) => setDesign({ showBadges: checked })}
                label="Show badges"
              />
            </div>
          </div>
        </details>
      </Card>

      <Card id="dash-widget-add">
        <CardHead
          icon="plus"
          title="Add a widget"
          subtitle={
            search
              ? `${platforms.length} match${platforms.length === 1 ? "" : "es"} for “${query.trim()}”`
              : `${WIDGET_PLATFORMS.length} platforms · ${widgets.widgets.length} in your stack`
          }
          actions={
            <label className="tw-mini-search">
              <Icon name="search" size={14} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter platforms"
                aria-label="Filter widget platforms"
              />
            </label>
          }
        />

        <div className="tw-wpick-grid">
          {platforms.map((platform) => {
            const count = used.get(platform.id) ?? 0;
            return (
              <button
                key={platform.id}
                type="button"
                className={`tw-wpick${count ? " is-added" : ""}`}
                style={{ ["--widget-color" as string]: platform.color }}
                onClick={() => openAdd(platform)}
              >
                <span className="tw-wpick-icon" aria-hidden="true">
                  <WidgetPlatformIcon id={platform.id} size={20} />
                </span>
                <span className="tw-wpick-copy">
                  <b>
                    {platform.name}
                    {count ? <em>{count}</em> : null}
                  </b>
                  <small>{platform.description}</small>
                </span>
                <span className="tw-wpick-action">
                  <Icon name="plus" size={13} />
                  Add
                </span>
              </button>
            );
          })}
          {!platforms.length ? <p className="tw-foot-note">Nothing matches that search.</p> : null}
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

            {configuring.id === "discord" ? (
              <DiscordBadgeChoices
                value={addOptions.profile_badges}
                content={content}
                onChange={(profile_badges) => setAddOptions((current) => ({ ...current, profile_badges }))}
              />
            ) : null}

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
                      onChange={(checked) => setAddOptions((current) => ({ ...current, [option.key]: checked }))}
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
                      onChange={(value) => setAddOptions((current) => ({ ...current, [option.key]: value }))}
                    />
                  </Field>
                ),
              )}
            </div>
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
            setOpenId(target.id);
            document.getElementById("dash-widget-stack")?.scrollIntoView({ block: "start" });
          }}
        />
      ) : null}
    </>
  );
}
