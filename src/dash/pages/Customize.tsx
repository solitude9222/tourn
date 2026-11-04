/* ---------------------------------------------------------------------------
   Customize > Profile — Profile, Appearance, Experience, Integrations and
   Extra. Every control writes a field the public page already reads; the
   couple of reference features this product does not have yet are shown
   disabled rather than pretending to save.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { AUDIO_STYLES } from "../../lib/profileAssets";
import { WIDGET_PLATFORMS, createWidgetInstance } from "../../lib/widgets";
import { ProfilePreview } from "../../components/ProfilePreview";
import { EntryOverlay } from "../../components/LinkerPreview";
import { WidgetCard } from "../../components/WidgetCard";
import { DEFAULT_BADGE_STYLE } from "../../lib/badges";
import { DEFAULT_LINK_DESIGN } from "../../lib/links";
import { formatJoinDate } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import { PlatformIcon } from "../../components/PlatformIcons";
import { useDash, type ProfileTab } from "../context";
import {
  Button,
  Card,
  CardHead,
  Chip,
  ColorField,
  EmptyState,
  Field,
  Icon,
  LockedBlock,
  Select,
  Slider,
  TextInput,
  Textarea,
  Toggle,
  ToggleTile,
} from "../ui";

const JOIN_FORMATS = [
  { value: "relative", label: "Relative (e.g. “9 months ago”)" },
  { value: "us", label: "US (12/23/2025)" },
  { value: "eu", label: "EU (23/12/2025)" },
];

const DATE_FORMATS = [
  { value: "us", label: "US (12/23/2025)" },
  { value: "eu", label: "EU (23/12/2025)" },
];

const ENTRY_ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "cycle", label: "Cycle" },
  { value: "typewriter", label: "Typewriter" },
];

const TOOLTIP_STYLES = [
  { value: "default", label: "Default" },
  { value: "glass", label: "Glass" },
  { value: "accent", label: "Accent" },
  { value: "dark", label: "Dark" },
  { value: "minimal", label: "Minimal" },
];

const FILTERS = [
  { value: "none", label: "No filter" },
  { value: "soft", label: "Soft fade" },
  { value: "blur", label: "Blur" },
  { value: "deep", label: "Deep blur" },
];

function PlayerStyleCard() {
  const { about, setAbout } = useDash();
  const style = about.assets.audio.style;
  return (
    <Card>
      <CardHead icon="music" title="Player style" />
      <Field label="Player style" hint="How the player looks on your profile.">
        <Select
          icon="music"
          value={style}
          options={AUDIO_STYLES.map((entry) => ({ value: entry.id, label: entry.name }))}
          onChange={(value) =>
            setAbout((current) => ({
              ...current,
              assets: { ...current.assets, audio: { ...current.assets.audio, style: value as typeof style } },
            }))
          }
        />
      </Field>
    </Card>
  );
}

function DiscordPresenceCard() {
  const { widgets, setWidgets, settings, notify } = useDash();
  const { user: authUser, linkDiscord } = useAuth();
  const linked = Boolean(authUser?.discordLinked);
  const platform = WIDGET_PLATFORMS.find((entry) => entry.id === "discord");
  const widget = widgets.widgets.find((entry) => entry.platform === "discord");
  const [discordId, setDiscordId] = useState(widget?.content || settings.discordUserId);
  const [busy, setBusy] = useState(false);

  // No connected Discord account, no presence section — there is nothing to
  // read and nothing to configure.

  const updateOption = (key: string, value: boolean | string) => {
    if (!widget) return;
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.map((entry) =>
        entry.id === widget.id
          ? { ...entry, options: { ...entry.options, [key]: value } }
          : entry,
      ),
    }));
  };

  const savePresence = () => {
    if (!platform) return;
    const id = discordId.trim();
    if (!id) {
      notify("Discord", "Add your Discord user ID first.");
      return;
    }
    if (widget) {
      setWidgets((current) => ({
        ...current,
        widgets: current.widgets.map((entry) =>
          entry.id === widget.id ? { ...entry, content: id, visible: true } : entry,
        ),
      }));
    } else {
      const instance = createWidgetInstance(platform);
      instance.id = "discord-presence";
      instance.content = id;
      instance.visible = true;
      setWidgets((current) => ({ ...current, widgets: [...current.widgets, instance] }));
    }
    notify("Discord presence", "Saved — your live status shows on the profile once you save.");
  };

  const connect = async () => {
    setBusy(true);
    const result = await linkDiscord();
    if (result.error) notify("Discord", result.error);
    setBusy(false);
  };

  if (!linked) return null;

  return (
    <Card>
      <CardHead
        icon="discord"
        title="Discord Presence"
        subtitle="Driven by your connected Discord account — no widget to add."
      />

      <div className="tw-discord-connect">
        <span className="tw-widget-icon" style={{ width: 34, height: 34 }}>
          <PlatformIcon id="discord" size={18} />
        </span>
        <span>
          <b>{linked ? "Discord account connected" : "Connect your Discord account"}</b>
          <small>
            {linked
              ? "Your account is linked. Presence reads the user ID below."
              : "Link the account that owns this profile."}
          </small>
        </span>
        <Button
          variant={linked ? "ghost" : "primary"}
          icon="discord"
          disabled={busy}
          onClick={() => void connect()}
        >
          {busy ? "Opening…" : linked ? "Reconnect" : "Connect Discord"}
        </Button>
      </div>

      <div className="tw-form-grid" style={{ marginTop: 18 }}>
        <Field
          label="Discord user ID"
          help
          hint="Discord → Settings → Advanced → Developer Mode, then right-click your name → Copy User ID."
        >
          <TextInput
            icon="discord"
            value={discordId}
            placeholder="1546745348020772915"
            onChange={(event) => setDiscordId(event.target.value)}
          />
        </Field>
        <div className="tw-inline-toggle">
          <span>
            <b>Show on profile</b>
            <small>Off hides the presence card without deleting it.</small>
          </span>
          <Toggle
            checked={Boolean(widget) && widget?.visible !== false}
            onChange={(checked) => {
              if (!widget) {
                if (checked) savePresence();
                return;
              }
              setWidgets((current) => ({
                ...current,
                widgets: current.widgets.map((entry) =>
                  entry.id === widget.id ? { ...entry, visible: checked } : entry,
                ),
              }));
            }}
            label="Show Discord presence"
          />
        </div>
      </div>

      <div className="tw-row" style={{ marginTop: 14 }}>
        <Button variant="primary" onClick={savePresence}>
          Save presence
        </Button>
      </div>

      {platform && widget ? (
        <>
          <div className="tw-subhead">Presence options</div>
          <div className="tw-option-grid">
            {platform.options
              .filter((option) => option.type === "select")
              .map((option) => (
                <Field key={option.key} label={option.label}>
                  <Select
                    value={String(widget.options[option.key] ?? option.default)}
                    options={(option.choices ?? []).map((choice) => ({
                      value: choice.value,
                      label: choice.label,
                    }))}
                    onChange={(value) => updateOption(option.key, value)}
                  />
                </Field>
              ))}
          </div>
          <div className="tw-grid tw-grid--4" style={{ marginTop: 14 }}>
            {platform.options
              .filter((option) => option.type === "toggle")
              .map((option) => (
                <ToggleTile
                  key={option.key}
                  title={option.label}
                  description={option.hint}
                  checked={widget.options[option.key] === true}
                  onChange={(checked) => updateOption(option.key, checked)}
                  accentBorder
                />
              ))}
          </div>
        </>
      ) : (
        <p className="tw-foot-note">
          Save your Discord user ID to unlock presence options.
        </p>
      )}
    </Card>
  );
}

export function CustomizeProfilePage({ tab }: { tab: ProfileTab }) {
  const {
    user,
    about,
    badges,
    links,
    widgets,
    profileViews,
    setAbout,
    setBadges,
    setLinks,
    isPremium,
    notify,
    go,
    setProfileTab,
  } = useDash();

  const design = about.design;
  const entry = design.entry;

  const updateDesign = (patch: Partial<typeof design>) =>
    setAbout((current) => ({ ...current, design: { ...current.design, ...patch } }));

  const updateEntry = (patch: Partial<typeof entry>) =>
    updateDesign({ entry: { ...entry, ...patch } });

  const updateCard = (patch: Partial<typeof about.assets.card>) =>
    setAbout((current) => ({
      ...current,
      assets: { ...current.assets, card: { ...current.assets.card, ...patch } },
    }));

  const updateMetadata = (patch: Partial<typeof about.metadata>) =>
    setAbout((current) => ({ ...current, metadata: { ...current.metadata, ...patch } }));

  const updateColors = (patch: Partial<typeof design.colors>) =>
    updateDesign({ colors: { ...design.colors, ...patch } });

  const filter =
    design.backgroundBlur === 0
      ? "none"
      : design.backgroundBlur <= 8
        ? "soft"
        : design.backgroundBlur <= 18
          ? "blur"
          : "deep";

  if (tab === "profile") {
    return (
      <>
        <Card>
          <CardHead
            icon="sliders"
            title="General Customization"
            subtitle="Profile details and visual styling"
          />

          <div className="tw-form-grid">
            <Field label="Location" help>
              <TextInput
                icon="pin"
                placeholder="My Location"
                value={about.location}
                maxLength={64}
                onChange={(event) =>
                  setAbout((current) => ({
                    ...current,
                    location: event.target.value.slice(0, 64),
                  }))
                }
              />
            </Field>

            <Field label="Enter Text" help>
              <TextInput
                icon="at"
                placeholder="enter"
                value={entry.title}
                maxLength={48}
                onChange={(event) => updateEntry({ title: event.target.value.slice(0, 48) })}
              />
            </Field>

            <Field label="Enter Text Animation" help>
              {isPremium ? (
                <Select
                  value={entry.animation}
                  options={[
                    { value: "split", label: "Split apart" },
                    { value: "fade", label: "Fade in" },
                    { value: "zoom", label: "Zoom in" },
                    { value: "bottom-right", label: "From bottom right" },
                    { value: "top-left", label: "From top left" },
                  ]}
                  onChange={(value) => updateEntry({ animation: value as typeof entry.animation })}
                />
              ) : (
                <LockedBlock onClick={() => go("premium")} />
              )}
            </Field>

            <Field label="Background Filters" help>
              <Select
                icon="filter"
                value={filter}
                placeholder="Select filters"
                options={FILTERS}
                onChange={(value) =>
                  updateDesign({
                    backgroundBlur:
                      value === "none" ? 0 : value === "soft" ? 6 : value === "blur" ? 16 : 28,
                  })
                }
              />
            </Field>

            <Field
              label="Description"
              help
              className="tw-span-2"
              hint={`${about.bio.length}/500`}
            >
              <Textarea
                rows={4}
                placeholder="Tell everyone about yourself..."
                value={about.bio}
                maxLength={500}
                onChange={(event) =>
                  setAbout((current) => ({ ...current, bio: event.target.value.slice(0, 500) }))
                }
              />
            </Field>

          </div>

          {/* Colour pickers on the left, everything else on the right. */}
          <div className="tw-split" style={{ marginTop: 20 }}>
            <div className="tw-split-col">
              <span className="tw-split-label">Colours</span>
              <ColorField
                label="Text colour"
                value={design.colors.text}
                onChange={(value) => updateColors({ text: value })}
              />
              <ColorField
                label="Secondary text"
                value={design.colors.muted}
                onChange={(value) => updateColors({ muted: value })}
              />
              <ColorField
                label="Background"
                value={design.colors.background}
                onChange={(value) => updateColors({ background: value })}
              />
            </div>

            <div className="tw-split-col">
              <span className="tw-split-label">Details</span>
              <Field label="Join Date Format" help>
                <Select
                  icon="clock"
                  value={about.metadata.joinFormat ?? "relative"}
                  options={JOIN_FORMATS}
                  onChange={(value) =>
                    updateMetadata({ joinFormat: value as "relative" | "us" | "eu" })
                  }
                />
              </Field>

              <Field label="Date Format" help>
                <Select
                  icon="calendar"
                  value={about.metadata.dateFormat ?? "us"}
                  options={DATE_FORMATS}
                  onChange={(value) => updateMetadata({ dateFormat: value as "us" | "eu" })}
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="code" title="Page Title" />
          <div className="tw-form-grid">
            <Field label="Custom Title Text">
              <TextInput
                icon="at"
                placeholder="Enter custom title..."
                value={about.metadata.title}
                maxLength={60}
                onChange={(event) => updateMetadata({ title: event.target.value.slice(0, 60) })}
              />
            </Field>
            <Field label="Animation Type">
              <Select
                icon="code"
                value={about.metadata.animation}
                options={ENTRY_ANIMATIONS}
                onChange={(value) =>
                  updateMetadata({ animation: value as typeof about.metadata.animation })
                }
              />
            </Field>
          </div>
        </Card>
      </>
    );
  }

  if (tab === "experience") {
    return (
      <Card>
        <CardHead
          icon="expand"
          title="Enter Screen Customization"
          subtitle="Everything below is the same screen visitors see, live."
        />

        <div className="tw-inline-toggle">
          <span>
            <b>Show enter screen</b>
            <small>Off lets visitors land straight on your page.</small>
          </span>
          <Toggle
            checked={Boolean(entry.enabled)}
            onChange={(checked) => updateEntry({ enabled: checked })}
            label="Show enter screen"
          />
        </div>

        <div className="tw-split" style={{ marginTop: 18 }}>
          <div className="tw-split-col">
            <span className="tw-split-label">Colours</span>
            <ColorField
              label="Background"
              value={entry.background}
              onChange={(value) => updateEntry({ background: value })}
            />
            <ColorField
              label="Text colour"
              value={entry.titleColor}
              onChange={(value) => updateEntry({ titleColor: value })}
            />
            {entry.divider ? (
              <ColorField
                label="Divider colour"
                value={entry.dividerColor ?? "#ffffff"}
                onChange={(value) => updateEntry({ dividerColor: value })}
              />
            ) : null}
          </div>

          <div className="tw-split-col">
            <span className="tw-split-label">Sizes &amp; sliders</span>
            <Slider
              label="Opacity"
              value={entry.dim}
              min={0}
              max={100}
              format={(value) => (value / 100).toFixed(2)}
              ticks={["20%", "50%", "80%"]}
              onChange={(value) => updateEntry({ dim: value })}
            />
            <Slider
              label="Blur"
              value={entry.blur}
              min={0}
              max={40}
              onChange={(value) => updateEntry({ blur: value })}
            />
            <Slider
              label="Font size"
              value={entry.titleSize}
              min={12}
              max={72}
              suffix="px"
              ticks={["24px", "48px", "72px"]}
              onChange={(value) => updateEntry({ titleSize: value })}
            />
            <div className="tw-inline-toggle">
              <span>
                <b>Divider line</b>
                <small>Adds a customizable line below your enter text.</small>
              </span>
              <Toggle
                checked={Boolean(entry.divider)}
                onChange={(checked) => updateEntry({ divider: checked })}
                label="Divider line"
              />
            </div>
            {entry.divider ? (
              <>
                <Slider
                  label="Divider length"
                  value={entry.dividerWidth ?? 42}
                  min={10}
                  max={100}
                  suffix="%"
                  onChange={(value) => updateEntry({ dividerWidth: value })}
                />
                <Slider
                  label="Divider thickness"
                  value={entry.dividerSize ?? 1}
                  min={1}
                  max={8}
                  suffix="px"
                  onChange={(value) => updateEntry({ dividerSize: value })}
                />
                <Slider
                  label="Divider opacity"
                  value={Math.round((entry.dividerOpacity ?? 0.4) * 100)}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(value) => updateEntry({ dividerOpacity: value / 100 })}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="tw-subhead">Live preview</div>
        {/* The real screen, not a mock — so every setting above is visible. */}
        <div className="tw-enter-stage">
          <EntryOverlay about={about} onEnter={() => undefined} preview />
        </div>
      </Card>
    );
  }

  if (tab === "integrations") {
    return (
      <>
        <PlayerStyleCard />
        <DiscordPresenceCard />
      </>
    );
  }

  const profileViewsOn = design.viewPosition !== "hidden";
  const joinOn = design.joinPosition !== "hidden";
  const audioOn = about.assets.audio.style !== "none";
  const tooltips = design.tooltips;

  return (
    <>
      <Card>
        <CardHead icon="sparkles" title="Extras" subtitle="Small extras on your public page" />

        <div className="tw-grid tw-grid--3">
          <ToggleTile
            icon="sparkles"
            title="ONEKO!"
            description="A pixel cat that chases your cursor on your page"
            checked={Boolean(design.oneko)}
            onChange={(checked) => updateDesign({ oneko: checked })}
          />
        </div>

      </Card>

      <Card>
        <CardHead icon="help" title="Tooltips" subtitle="Hover labels on your avatar and badges" />

        <div className="tw-split">
          <div className="tw-split-col">
            <span className="tw-split-label">Behaviour</span>
            <div className="tw-inline-toggle">
              <span>
                <b>Show tooltips</b>
                <small>Links never show one — the icon is the link.</small>
              </span>
              <Toggle
                checked={tooltips.enabled}
                onChange={(checked) =>
                  updateDesign({ tooltips: { ...tooltips, enabled: checked } })
                }
                label="Show tooltips"
              />
            </div>
          </div>

          <div className="tw-split-col">
            <span className="tw-split-label">Style</span>
            <Field label="Tooltip style">
              <Select
                value={tooltips.style}
                options={TOOLTIP_STYLES}
                onChange={(value) =>
                  updateDesign({
                    tooltips: { ...tooltips, style: value as typeof tooltips.style },
                  })
                }
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead icon="user" title="Profile elements" subtitle="What shows on the card" />

        <div className="tw-grid tw-grid--3">
          <ToggleTile
            icon="pin"
            title="Location"
            description="Show where you are from"
            checked={design.locationPosition !== "hidden"}
            onChange={(checked) =>
              updateDesign({ locationPosition: checked ? "under-name" : "hidden" })
            }
          />
          <ToggleTile
            icon="eye"
            title="Profile Views"
            description="Show your view counter"
            checked={profileViewsOn}
            onChange={(checked) =>
              updateDesign({ viewPosition: checked ? "footer" : "hidden" })
            }
          />
          <ToggleTile
            icon="calendar"
            title="Join Date"
            description="Show when you joined"
            checked={joinOn}
            onChange={(checked) => updateDesign({ joinPosition: checked ? "footer" : "hidden" })}
          />
          <ToggleTile
            icon="music"
            title="Audio Player"
            description="Music on your page"
            checked={audioOn}
            onChange={(checked) => {
              if (checked) {
                setProfileTab("integrations");
                notify("Audio Player", "Pick a player style under Integrations.");
                return;
              }
              setAbout((current) => ({
                ...current,
                assets: {
                  ...current.assets,
                  audio: { ...current.assets.audio, style: "none" },
                },
              }));
              notify("Audio Player", "Audio player is off.");
            }}
          />
        </div>
      </Card>

      <Card>
        <CardHead icon="move" title="Motion" subtitle="Parallax tilt on the card" />

        <div className="tw-split">
          <div className="tw-split-col">
            <span className="tw-split-label">Behaviour</span>
            <div className="tw-inline-toggle">
              <span>
                <b>Parallax</b>
                <small>Tilts the card toward your cursor</small>
              </span>
              <Toggle
                checked={design.tilt > 0}
                onChange={(checked) => updateDesign({ tilt: checked ? 4 : 0 })}
                label="Parallax"
              />
            </div>
            <div className="tw-inline-toggle">
              <span>
                <b>Invert direction</b>
                <small>Reverse the direction the card tilts</small>
              </span>
              <Toggle
                checked={Boolean(design.tiltInvert)}
                onChange={(checked) => updateDesign({ tiltInvert: checked })}
                label="Invert parallax"
              />
            </div>
          </div>

          <div className="tw-split-col">
            <span className="tw-split-label">Sizes &amp; sliders</span>
            <Slider
              label="Intensity"
              value={design.tilt}
              min={0}
              max={24}
              onChange={(value) => updateDesign({ tilt: value })}
            />
          </div>
        </div>
      </Card>
    </>
  );
}


