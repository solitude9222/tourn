/* ---------------------------------------------------------------------------
   Customize > Profile — Profile, Appearance, Experience, Integrations and
   Switches. Every control writes a field the public page already reads; the
   couple of reference features this product does not have yet are shown
   disabled rather than pretending to save.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { AUDIO_STYLES } from "../../lib/profileAssets";
import { WIDGET_PLATFORMS, createWidgetInstance } from "../../lib/widgets";
import { ProfilePreview } from "../../components/ProfilePreview";
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

            <ColorField
              label="Text Color"
              value={design.colors.text}
              onChange={(value) => updateColors({ text: value })}
            />

            <div className="tw-color-row">
              <ColorField
                label="Secondary Text"
                value={design.colors.muted}
                onChange={(value) => updateColors({ muted: value })}
              />
              <ColorField
                label="Background"
                value={design.colors.background}
                onChange={(value) => updateColors({ background: value })}
              />
            </div>

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

  if (tab === "appearance") {
    const gradientOn = about.assets.card.id === "aurora";

    return (
      <>
        <Card>
          <CardHead
            icon="edit"
            title="Card Customization"
            subtitle="Live preview of your real profile card — every change applies instantly."
          />

          <div className="tw-subhead">Card Style</div>

          <div className="tw-live-stage">
            <div className="tw-live-scaler">
              <ProfilePreview
                user={user}
                about={about}
                badges={badges.equipped}
                badgeStyle={badges.style ?? DEFAULT_BADGE_STYLE}
                links={links.links}
                linkDesign={links.design ?? DEFAULT_LINK_DESIGN}
                className="profile-preview--with-widgets"
                views={profileViews}
                joined={formatJoinDate(
                  new Date(user.joinedAt),
                  about.metadata.joinFormat ?? "relative",
                )}
                hideAudio
              >
                {widgets.widgets.some((widget) => widget.visible !== false) ? (
                  <div className="lkr-widgets">
                    {widgets.widgets
                      .filter((widget) => widget.visible !== false)
                      .map((widget) => (
                        <WidgetCard
                          key={widget.id}
                          widget={widget}
                          design={widgets.design}
                          className="widget-card--linker"
                        />
                      ))}
                  </div>
                ) : null}
              </ProfilePreview>
            </div>
          </div>

          <div className="tw-form-grid" style={{ marginTop: 20 }}>
            <ColorField
              label="Card colour"
              value={design.colors.card}
              onChange={(value) => updateColors({ card: value })}
            />
            <div className="tw-inline-toggle">
              <span>
                <b>Make card transparent</b>
                <small>Remove all card styling</small>
              </span>
              <Toggle
                checked={design.backgroundOpacity === 0}
                onChange={(checked) => updateDesign({ backgroundOpacity: checked ? 0 : 0.08 })}
                label="Make card transparent"
              />
            </div>

            <Slider
              label="Opacity"
              value={design.backgroundOpacity}
              min={0}
              max={1}
              step={0.01}
              format={(value) => value.toFixed(2)}
              ticks={["25%", "50%", "75%"]}
              onChange={(value) => updateDesign({ backgroundOpacity: value })}
            />

            <Slider
              label="Blur"
              value={design.backgroundBlur}
              min={0}
              max={24}
              onChange={(value) => updateDesign({ backgroundBlur: value })}
            />
          </div>

          <div className="tw-subhead">Border Settings</div>

          <div className="tw-form-grid">
            <ColorField
              label="Border colour"
              value={design.colors.border}
              onChange={(value) => updateColors({ border: value })}
            />

            <div className="tw-border-sliders">
              <Slider
                label="Border Width"
                value={design.borderWidth}
                min={0}
                max={12}
                suffix="px"
                onChange={(value) => updateDesign({ borderWidth: value })}
              />
              <Slider
                label="Border Radius"
                value={design.cardRadius}
                min={0}
                max={72}
                suffix="px"
                onChange={(value) => updateDesign({ cardRadius: value })}
              />
              <Slider
                label="Border Opacity"
                value={Math.round(design.borderOpacity * 100)}
                min={0}
                max={100}
                suffix="%"
                ticks={["0%", "50%", "100%"]}
                onChange={(value) => updateDesign({ borderOpacity: value / 100 })}
              />
            </div>

          </div>
        </Card>

        <Card>
          <CardHead
            icon="sparkles"
            title="Card Gradient"
            subtitle="Colour and motion of the gradient that travels around your card."
          />
          <div className="tw-form-grid">
            <ColorField
              label="Gradient colour"
              value={about.assets.card.color}
              onChange={(value) => updateCard({ color: value })}
            />
            <Slider
              label="Intensity"
              value={about.assets.card.intensity}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => updateCard({ intensity: value })}
            />
            <Slider
              label="Speed"
              value={about.assets.card.speed}
              min={1.5}
              max={20}
              step={0.5}
              suffix="s"
              onChange={(value) => updateCard({ speed: value })}
            />
          </div>
          <Button
            variant={gradientOn ? "ghost" : "primary"}
            wide
            icon="sparkles"
            onClick={() => {
              updateCard({ id: gradientOn ? "none" : "aurora" });
              notify("Card Gradient", gradientOn ? "Gradient turned off." : "Gradient activated.");
            }}
          >
            {gradientOn ? "Disable Card Gradient" : "Activate Card Gradient"}
          </Button>
        </Card>
      </>
    );
  }

  if (tab === "experience") {
    return (
      <>
        <Card>
          <CardHead icon="expand" title="Enter Screen Customization" />

          <div className="tw-form-grid">
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
              label="Font Size"
              value={entry.titleSize}
              min={12}
              max={72}
              suffix="px"
              ticks={["24px", "48px", "72px"]}
              onChange={(value) => updateEntry({ titleSize: value })}
            />
          </div>

          <div className="tw-inline-toggle" style={{ marginTop: 18 }}>
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
            <div className="tw-form-grid" style={{ marginTop: 16 }}>
              <ColorField
                label="Divider colour"
                value={entry.dividerColor ?? "#ffffff"}
                onChange={(value) => updateEntry({ dividerColor: value })}
              />
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
            </div>
          ) : null}

          <div className="tw-enter-preview" style={{ background: entry.background }}>
            <div
              className="tw-enter-preview-card"
              style={{ filter: entry.blur > 0 ? `blur(${entry.blur / 4}px)` : undefined }}
            >
              <b style={{ color: entry.titleColor, fontSize: Math.min(38, entry.titleSize) }}>
                {entry.title.trim() || "enter"}
              </b>
              <span className="tw-enter-line" />
            </div>

          </div>
        </Card>

        <Card>
          <CardHead icon="move" title="Parallax Effect" />

          <div className="tw-inline-toggle">
            <span>
              <b>Enable Parallax</b>
              <small>3D tilt effect on mouse movement</small>
            </span>
            <Toggle
              checked={design.tilt > 0}
              onChange={(checked) => updateDesign({ tilt: checked ? 4 : 0 })}
              label="Enable parallax"
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <Slider
              label="Intensity"
              value={design.tilt}
              min={0}
              max={24}
              onChange={(value) => updateDesign({ tilt: value })}
            />
          </div>

          <div className="tw-inline-toggle" style={{ marginTop: 18 }}>
            <span>
              <b>Invert Direction</b>
              <small>Reverse the direction the card tilts</small>
            </span>
            <Toggle
              checked={Boolean(design.tiltInvert)}
              onChange={(checked) => updateDesign({ tiltInvert: checked })}
              label="Invert parallax"
            />
          </div>
        </Card>
      </>
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

  return (
    <>
      <Card>
        <CardHead icon="sliders" title="Switches" subtitle="Toggle profile features" />

        <div className="tw-section-label">Visual Effects &amp; Animations</div>
        <div className="tw-grid tw-grid--3">
          <ToggleTile
            icon="shield"
            title="Badge Glow"
            description="Enable a glow effect for your badges"
            checked={badges.style.glow}
            onChange={(checked) =>
              setBadges((current) => ({
                ...current,
                style: { ...current.style, glow: checked },
              }))
            }
          />
          <ToggleTile
            icon="link"
            title="Socials Glow"
            description="Enable a glow effect for your social media links"
            checked={links.design.showGlow}
            onChange={(checked) =>
              setLinks((current) => ({
                ...current,
                design: { ...current.design, showGlow: checked },
              }))
            }
          />
          <ToggleTile
            icon="at"
            title="Username Glow"
            description="Glow behind your display name"
            checked={Boolean(design.glowName)}
            onChange={(checked) => updateDesign({ glowName: checked })}
          />
          <ToggleTile
            icon="pin"
            title="Location Glow"
            description="Glow around your location pill"
            checked={Boolean(design.glowLocation)}
            onChange={(checked) => updateDesign({ glowLocation: checked })}
          />
          <ToggleTile
            icon="eye"
            title="Profile Views Glow"
            description="Glow around the view counter"
            checked={Boolean(design.glowViews)}
            onChange={(checked) => updateDesign({ glowViews: checked })}
          />
          <ToggleTile
            icon="calendar"
            title="Join Date Glow"
            description="Glow around the join date"
            checked={Boolean(design.glowJoin)}
            onChange={(checked) => updateDesign({ glowJoin: checked })}
          />
          <ToggleTile
            icon="sparkles"
            title="ONEKO!"
            description="A little cat that follows your cursor"
            checked={Boolean(design.oneko)}
            onChange={(checked) => updateDesign({ oneko: checked })}
          />
        </div>

        <div className="tw-section-label">Profile Elements</div>
        <div className="tw-grid tw-grid--3">
          <ToggleTile
            icon="user"
            title="Show Avatar"
            description="Display your avatar icon on your page"
            checked={about.assets.avatarUrl.length > 0 || Boolean(user?.avatarUrl)}
            onChange={(checked) => {
              if (!checked) {
                setAbout((current) => ({
                  ...current,
                  assets: { ...current.assets, avatarUrl: "" },
                }));
              } else {
                notify("Show Avatar", "Upload a picture from Account › Profile.");
              }
            }}
          />

          <ToggleTile
            icon="eye"
            title="Profile Views"
            description="Show off your profile views count"
            checked={profileViewsOn}
            onChange={(checked) =>
              updateDesign({ viewPosition: checked ? "top-right" : "hidden" })
            }
          />
          <ToggleTile
            icon="help"
            title="Tooltip on Social Links"
            description="Enable/disable the hover tooltip on your social links"
            checked={links.design.tooltipEnabled}
            onChange={(checked) =>
              setLinks((current) => ({
                ...current,
                design: { ...current.design, tooltipEnabled: checked },
              }))
            }
          />
          <ToggleTile
            icon="music"
            title="Audio Player"
            description="Enable or disable the profile player on your profile page"
            checked={audioOn}
            onChange={(checked) =>
              setAbout((current) => ({
                ...current,
                assets: {
                  ...current.assets,
                  audio: { ...current.assets.audio, style: checked ? "compact" : "none" },
                },
              }))
            }
          />
          <ToggleTile
            icon="calendar"
            title="Join Date"
            description="Show your account creation date"
            checked={joinOn}
            onChange={(checked) => updateDesign({ joinPosition: checked ? "footer" : "hidden" })}
          />
        </div>
      </Card>
    </>
  );
}
