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
        <div className="tw-extra-badge-grid">{badges.map((badge) => <button key={badge.id} type="button" aria-pressed={selected.includes(badge.id)} onClick={() => onChange(encode(selected.includes(badge.id) ? selected.filter((id) => id !== badge.id) : [...selected, badge.id]))}><img src={badge.art} alt="" /><span>{badge.label}</span><i aria-hidden="true" /></button>)}</div>
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
  const { widgets, setWidgets, save, notify } = useDash();
  const [configuring, setConfiguring] = useState<WidgetPlatform | null>(null);
  const [content, setContent] = useState("");
  const [addOptions, setAddOptions] = useState<Record<string, boolean | string>>({});
  const [inspecting, setInspecting] = useState<WidgetInstance | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  const setDesign = (patch: Partial<typeof design>) =>
    setWidgets((current) => ({ ...current, design: { ...current.design, ...patch } }));

  return (
    <>
      <Card className="tw-wstudio-hero">
        <div className="tw-wstudio-summary">
          <div>
            <span className="tw-wstudio-eyebrow">Widget stack</span>
            <h2>
              {widgets.widgets.length
                ? `${active.length} live widget${active.length === 1 ? "" : "s"}`
                : "No widgets yet"}
            </h2>
            <p>
              {widgets.widgets.length
                ? `${widgets.widgets.length - active.length} hidden · drag a row to change the order they appear in.`
                : "Add a platform below and it shows on your profile as soon as you save."}
            </p>
          </div>
          <div className="tw-row">
            <Button
              icon="plus"
              onClick={() => document.getElementById("dash-widget-add")?.scrollIntoView({ block: "start" })}
            >
              Add widget
            </Button>
            <Button variant="primary" icon="save" onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      </Card>

      <Card id="dash-widget-stack">
        <CardHead
          icon="layers"
          title="Your stack"
          subtitle="Open a row to change its handle and options. The toggle hides it without deleting it."
        />

        {widgets.widgets.length ? (
          <div className="tw-wstack" style={{ gap: design.gap }}>
            {widgets.widgets.map((instance, index) => {
              const platform = platformFor(instance);
              const open = openId === instance.id;
              const visible = instance.visible !== false;
              return (
                <div
                  key={instance.id}
                  className={`tw-wstack-row${open ? " is-open" : ""}${visible ? "" : " is-hidden"}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) move(dragIndex, index);
                    setDragIndex(null);
                  }}
                >
                  <div className="tw-wstack-head">
                    <span className="tw-drag" aria-hidden="true">
                      <Icon name="drag" size={15} />
                    </span>
                    <span className="tw-wstack-icon" style={{ ["--widget-color" as string]: platform?.color }}>
                      <WidgetPlatformIcon id={instance.platform} size={17} />
                    </span>
                    <button
                      type="button"
                      className="tw-wstack-title"
                      onClick={() => setOpenId(open ? null : instance.id)}
                      aria-expanded={open}
                    >
                      <b>{platform?.name ?? instance.platform}</b>
                      <small>{instance.content || "Not configured yet"}</small>
                    </button>
                    <span className="tw-wstack-chips">
                      <span className={`tw-wstack-chip${visible ? " is-live" : ""}`}>
                        {visible ? "Live" : "Hidden"}
                      </span>
                      <span className="tw-wstack-index">#{index + 1}</span>
                    </span>
                    <span className="tw-wstack-actions" onClick={(event) => event.stopPropagation()}>
                      <Toggle
                        checked={visible}
                        onChange={(checked) => patchWidget(instance.id, { visible: checked })}
                        label={`Show ${platform?.name ?? "widget"}`}
                      />
                      <IconButton
                        label={`Preview ${platform?.name ?? "widget"}`}
                        icon="eye"
                        onClick={() => setInspecting(instance)}
                      />
                      <IconButton
                        label={open ? "Close settings" : "Edit widget"}
                        icon={open ? "chevron-down" : "edit"}
                        variant={open ? "primary" : undefined}
                        onClick={() => setOpenId(open ? null : instance.id)}
                      />
                      <IconButton
                        label={`Delete ${platform?.name ?? "widget"}`}
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

      <Card>
        <CardHead
          icon="palette"
          title="Stack appearance"
          subtitle="One shared look for every widget on your profile."
          actions={
            <Button
              icon="refresh"
              onClick={() => {
                setWidgets((current) => ({ ...current, design: { ...DEFAULT_WIDGET_DESIGN } }));
                notify("Widget design", "Defaults restored — save to publish.");
              }}
            >
              Reset
            </Button>
          }
        />

        <div className="tw-widget-design">
          <div className="tw-stack">
            <div className="tw-subhead">Surface</div>
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

            <div className="tw-form-grid">
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
                onChange={(value) => setDesign({ outlineEffect: value as WidgetDesign["outlineEffect"] })}
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
            <Slider
              label="Spacing"
              value={design.gap}
              min={0}
              max={28}
              suffix="px"
              onChange={(value) => setDesign({ gap: value })}
            />

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
                <small>Public flags only: Staff, Partner, HypeSquad, Bug Hunter, Early Supporter and Active Developer.</small>
              </span>
              <Toggle
                checked={design.showBadges}
                onChange={(checked) => setDesign({ showBadges: checked })}
                label="Show badges"
              />
            </div>
          </div>

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
                  <div className="tw-widget-scroll-pass" key={pass} aria-hidden={pass === 1 ? "true" : undefined}>
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
