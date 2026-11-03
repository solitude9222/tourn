/* ---------------------------------------------------------------------------
   Customize > Profile — Profile, Appearance, Experience, Integrations and
   Switches. Every control writes a field the public page already reads; the
   couple of reference features this product does not have yet are shown
   disabled rather than pretending to save.
   --------------------------------------------------------------------------- */

import { AUDIO_STYLES } from "../../lib/profileAssets";
import { WIDGET_PLATFORMS } from "../../lib/widgets";
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
  const { widgets, setWidgets, go } = useDash();
  const widget = widgets.widgets.find((entry) => entry.platform === "discord");
  const platform = WIDGET_PLATFORMS.find((entry) => entry.id === "discord");

  if (!widget || !platform) {
    return (
      <Card>
        <CardHead icon="discord" title="Discord Presence" />
        <EmptyState
          icon="discord"
          title="No Discord widget yet"
          message="Add the Discord widget to configure your presence card."
          action={
            <Button variant="primary" icon="plus" onClick={() => go("widgets")}>
              Add Discord widget
            </Button>
          }
        />
      </Card>
    );
  }

  const updateOption = (key: string, value: boolean | string) => {
    setWidgets((current) => ({
      ...current,
      widgets: current.widgets.map((entry) =>
        entry.id === widget.id
          ? { ...entry, options: { ...entry.options, [key]: value } }
          : entry,
      ),
    }));
  };

  return (
    <Card>
      <CardHead icon="discord" title="Discord Presence" />

      <div className="tw-option-grid" style={{ marginBottom: 20 }}>
        {platform.options
          .filter((option) => option.type === "select")
          .map((option) => (
            <Field key={option.key} label={option.label} help>
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

      <div className="tw-subhead">Additional options:</div>
      <div className="tw-grid tw-grid--4">
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
    const glowOn = about.assets.card.id === "edgeGlow";

    return (
      <>
        <Card>
          <CardHead icon="edit" title="Card Customization" />

          <div className="tw-subhead">Card Style</div>

          <div className="tw-style-preview">
            <div
              className="tw-style-demo"
              style={{
                background: design.colors.card,
                opacity: Math.max(0.08, design.backgroundOpacity),
                borderRadius: design.cardRadius,
                borderColor: design.colors.border,
                borderWidth: design.borderWidth,
                borderStyle: design.borderWidth > 0 ? "solid" : "none",
                backdropFilter: design.backgroundBlur > 0 ? `blur(${design.backgroundBlur}px)` : undefined,
              }}
            >
              <span className="tw-style-avatar" />
              <b>{about.displayName.trim() || "your name"}</b>
              <small>Joined 13 days ago</small>
              <div className="tw-style-widget" />
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

            <div className="tw-inline-toggle">
              <span>
                <b>Disable Border on Mute Button</b>
                <small>Coming with audio controls</small>
              </span>
              <Toggle checked={false} onChange={() => undefined} disabled label="Disable border on mute button" />
            </div>

            <div className="tw-inline-toggle">
              <span>
                <b>Disable Border on Audio Display</b>
                <small>Coming with audio controls</small>
              </span>
              <Toggle checked={false} onChange={() => undefined} disabled label="Disable border on audio display" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="sparkles" title="Card Gradient" />
          <Button
            variant="primary"
            wide
            icon="sparkles"
            onClick={() => {
              setAbout((current) => ({
                ...current,
                assets: {
                  ...current.assets,
                  card: { ...current.assets.card, id: gradientOn ? "none" : "aurora" },
                },
              }));
              notify("Card Gradient", gradientOn ? "Gradient turned off." : "Gradient activated.");
            }}
          >
            {gradientOn ? "Disable Card Gradient" : "Activate Card Gradient"}
          </Button>
        </Card>

        <Card>
          <CardHead icon="bolt" title="Glow Settings" />
          <Button
            variant="primary"
            wide
            icon="sparkles"
            onClick={() => {
              setAbout((current) => ({
                ...current,
                assets: {
                  ...current.assets,
                  card: { ...current.assets.card, id: glowOn ? "none" : "edgeGlow" },
                },
              }));
              notify("Glow", glowOn ? "Glow turned off." : "Glow activated.");
            }}
          >
            {glowOn ? "Disable Glow" : "Activate Glow"}
          </Button>
        </Card>
      </>
    );
  }

  if (tab === "experience") {
    return (
      <>
        <Card>
          <CardHead icon="comment" title="Comments" subtitle="Let visitors comment on your profile" />
          <div className="tw-stack">
            <div className="tw-inline-toggle">
              <span>
                <b>Enable Comments</b>
                <small>Coming soon — comments are not part of this build yet.</small>
              </span>
              <Toggle checked={false} onChange={() => undefined} disabled label="Enable comments" />
            </div>
            <div className="tw-inline-toggle">
              <span>
                <b>Disable Border on Comment Button</b>
                <small>Removes the border and its effect from the comment button</small>
              </span>
              <Toggle checked={false} onChange={() => undefined} disabled label="Disable comment border" />
            </div>
          </div>
        </Card>

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
            <Toggle checked={false} onChange={() => undefined} disabled label="Divider line" />
          </div>

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
            <span className="tw-enter-lock">
              <Icon name="lock" size={13} />
              Divider controls come next
            </span>
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
              <small>Reverse the tilt effect (coming soon)</small>
            </span>
            <Toggle checked={false} onChange={() => undefined} disabled label="Invert parallax" />
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
            description="Coming soon"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Username Glow", "This effect is not available yet.")}
          />
          <ToggleTile
            icon="pin"
            title="Location Glow"
            description="Coming soon"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Location Glow", "This effect is not available yet.")}
          />
          <ToggleTile
            icon="eye"
            title="Profile Views Glow"
            description="Coming soon"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Profile Views Glow", "This effect is not available yet.")}
          />
          <ToggleTile
            icon="calendar"
            title="Join Date Glow"
            description="Coming soon"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Join Date Glow", "This effect is not available yet.")}
          />
          <ToggleTile
            icon="sparkles"
            title="ONEKO!"
            description="Shows a funny little cat which follows your cursor"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("ONEKO!", "This feature is not available yet.")}
          />
          <ToggleTile
            icon="layers"
            title="Container Shadow"
            description="Coming soon"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Container Shadow", "This effect is not available yet.")}
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
            icon="music"
            title="Mute Button"
            description="Show the mute button on your page (coming soon)"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Mute Button", "This control is not available yet.")}
          />
          <ToggleTile
            icon="like"
            title="Like Button"
            description="Enable or disable the profile feedback (coming soon)"
            checked={false}
            onChange={() => undefined}
            locked
            onLockedClick={() => notify("Like Button", "Profile feedback is not available yet.")}
          />
          <ToggleTile
            icon="discord"
            title="Discord Presence"
            description="Show your Discord status on your page"
            checked={widgets.widgets.some((entry) => entry.platform === "discord")}
            onChange={() => go("widgets")}
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
