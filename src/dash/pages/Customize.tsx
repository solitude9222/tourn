/* ---------------------------------------------------------------------------
   Customize > Profile — Profile, Appearance, Experience, Integrations and
   Extra. Every control writes a field the public page already reads; the
   couple of reference features this product does not have yet are shown
   disabled rather than pretending to save.
   --------------------------------------------------------------------------- */

import { useRef, useState } from "react";
import { uploadAudioFile } from "../../lib/audioUpload";
import { AudioPlayer } from "../../components/AudioPlayer";
import { imageToDataUrl } from "../files";
import { AUDIO_STYLES } from "../../lib/profileAssets";
import { fileToDataUrl } from "../files";
import { ProfilePreview } from "../../components/ProfilePreview";
import { EntryOverlay } from "../../components/LinkerPreview";
import { ENTRY_ANIMATIONS as ENTRY_TRANSITIONS } from "../../lib/about";
import { DEFAULT_BADGE_STYLE } from "../../lib/badges";
import { DEFAULT_LINK_DESIGN } from "../../lib/links";
import { formatJoinDate } from "../../lib/format";
import { PlatformIcon } from "../../components/PlatformIcons";
import { useDash, type ProfileTab } from "../context";
import { FileUpload,
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
  { value: "us", label: "US (12/23/2026)" },
  { value: "eu", label: "EU (23/12/2026)" },
];

const DATE_FORMATS = [
  { value: "us", label: "US (12/23/2026)" },
  { value: "eu", label: "EU (23/12/2026)" },
];

const TITLE_ANIMATIONS = [
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

function AudioSettingsCard() {
  const { about, setAbout, notify } = useDash();
  const audio = about.assets.audio;
  const audioInput = useRef<HTMLInputElement>(null);
  const lyricsInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const updateAudio = (patch: Partial<typeof audio>) =>
    setAbout((current) => ({
      ...current,
      assets: {
        ...current.assets,
        audio: { ...current.assets.audio, ...patch },
      },
    }));

  const uploadTrack = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAudioFile(file, setUploadProgress);
      updateAudio({
        fileUrl: url,
        style: audio.style === "none" ? "compact" : audio.style,
        title: audio.title || file.name.replace(/\.[^.]+$/, ""),
      });
      notify("Audio", "Track added. Changes save automatically.");
    } catch (error) {
      notify("Upload failed", error instanceof Error ? error.message : "That audio file could not be read.");
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await imageToDataUrl(file, 512, 512);
      updateAudio({ coverUrl: url });
      notify("Cover art", "Cover updated. Changes save automatically.");
    } catch {
      notify("Upload failed", "That image could not be read.");
    }
  };

  // A real .lrc / .txt file read, not just a textarea: the player already
  // parses [mm:ss.xx] timestamps, so the file becomes synced lyrics as-is.
  const uploadLyrics = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = (await file.text()).slice(0, 40_000);
      updateAudio({ lyrics: text, autoLyrics: false });
      notify("Lyrics", `${file.name} loaded. Changes save automatically.`);
    } catch {
      notify("Lyrics", "That lyrics file could not be read.");
    }
  };

  return (
    <Card>
      <CardHead
        icon="music"
        title="Audio player"
        subtitle="Upload a track, choose a player and preview it here."
      />

      {audio.fileUrl && audio.style !== "none" ? <div className="tw-audio-live-preview"><AudioPlayer settings={{ ...audio, autoplay: false }} /></div> : <p className="tw-foot-note">Add an audio file to preview your player.</p>}
      <div className="tw-audio-settings-grid"><div className="tw-stack">
        <Field label="Border animation"><Select value={audio.edgeEffect} options={[{value:"none",label:"None"},{value:"trace",label:"Travelling light"},{value:"pulse",label:"Soft pulse"}]} onChange={edgeEffect=>updateAudio({edgeEffect:edgeEffect as typeof audio.edgeEffect})}/></Field><Slider label="Border animation duration" value={audio.edgeSpeed} min={1} max={15} step={.5} suffix="s" onChange={edgeSpeed=>updateAudio({edgeSpeed})}/>
        <div className="tw-stack"><Slider label="Border alpha" value={Math.round(audio.borderOpacity * 100)} min={0} max={100} suffix="%" onChange={(value) => updateAudio({ borderOpacity: value / 100 })} /></div>
        <div className="tw-stack"><Slider label="Track alpha" value={Math.round(audio.trackOpacity * 100)} min={0} max={100} suffix="%" onChange={(value) => updateAudio({ trackOpacity: value / 100 })} /></div>
        <Slider label="Default volume" value={Math.round(audio.volume * 100)} min={0} max={100} suffix="%" onChange={(volume) => updateAudio({ volume: volume / 100 })} />
        <Slider label="Player opacity" value={Math.round(audio.cardOpacity * 100)} min={0} max={100} suffix="%" onChange={(cardOpacity) => updateAudio({ cardOpacity: cardOpacity / 100 })} />
        <Slider label="Playback speed" value={audio.playbackRate} min={.5} max={2} step={.05} suffix="×" onChange={(playbackRate) => updateAudio({ playbackRate })} />
        <div className="tw-inline-toggle"><b>Loop track</b><Toggle label="Loop track" checked={audio.loop} onChange={(loop) => updateAudio({ loop })} /></div>
        <div className="tw-inline-toggle"><b>Start muted</b><Toggle label="Start muted" checked={audio.startMuted} onChange={(startMuted) => updateAudio({ startMuted })} /></div>

        <Field label="Player style" hint="How the player looks on your profile.">
          <Select
            value={audio.style}
            options={AUDIO_STYLES.map((entry) => ({ value: entry.id, label: entry.name }))}
            onChange={(value) => updateAudio({ style: value as typeof audio.style })}
          />
        </Field>

        <Field label="Audio file" hint="MP3, WAV, OGG, M4A and other audio formats.">
          <div className="tw-row">
            <Button
              icon="upload"
              disabled={uploading}
              onClick={() => audioInput.current?.click()}
            >
              {uploading ? `Uploading ${uploadProgress}%` : audio.fileUrl ? "Replace audio" : "Upload audio"}
            </Button>
            {audio.fileUrl ? (
              <Button
                variant="danger"
                icon="trash"
                onClick={() => updateAudio({ fileUrl: "", style: "none" })}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </Field>

        <Field label="Cover art" hint="Square image shown on the player.">
          <div className="tw-row">
            {audio.coverUrl ? (
              <img className="tw-audio-cover" src={audio.coverUrl} alt="" />
            ) : null}
            <Button icon="upload" onClick={() => coverInput.current?.click()}>
              {audio.coverUrl ? "Replace cover" : "Upload cover"}
            </Button>
            {audio.coverUrl ? (
              <Button variant="danger" icon="trash" onClick={() => updateAudio({ coverUrl: "" })}>
                Remove
              </Button>
            ) : null}
          </div>
        </Field>

        <div className="tw-inline-toggle"><span><b>Play after entry</b><small>Playback starts after the visitor enters your profile.</small></span><Toggle label="Autoplay audio" checked={audio.autoplay} onChange={(checked) => updateAudio({ autoplay: checked })} /></div>
        <Field label="Hosted audio URL" hint="Or use a direct link to an audio file."><TextInput value={audio.fileUrl.startsWith("data:") ? "" : audio.fileUrl} placeholder="https://.../track.mp3" onChange={(event) => updateAudio({ fileUrl: event.target.value, style: audio.style === "none" ? "compact" : audio.style })} /></Field>
        <Field label="Track title">
          <TextInput
            value={audio.title}
            maxLength={80}
            placeholder="Track title"
            onChange={(event) => updateAudio({ title: event.target.value.slice(0, 80) })}
          />
        </Field>

        <Field label="Artist">
          <TextInput
            value={audio.artist}
            maxLength={80}
            placeholder="Artist"
            onChange={(event) => updateAudio({ artist: event.target.value.slice(0, 80) })}
          />
        </Field>

        <Field
          label="Lyrics file"
          className="tw-span-2"
          hint="Upload a .lrc file with [mm:ss.xx] timestamps for synced lyrics, or a .txt file for plain lines."
        >
          <div className="tw-row">
            <Button icon="upload" onClick={() => lyricsInput.current?.click()}>
              {audio.lyrics ? "Replace lyrics" : "Upload .lrc"}
            </Button>
            {audio.lyrics ? (
              <Button
                variant="danger"
                icon="trash"
                onClick={() => updateAudio({ lyrics: "" })}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </Field>

        <Field
          label="Lyrics"
          className="tw-span-2"
          hint={`${audio.lyrics.length} / 40000`}
        >
          <Textarea
            rows={6}
            maxLength={40_000}
            placeholder={"[00:12.40] First line\n[00:16.10] Second line"}
            value={audio.lyrics}
            onChange={(event) => updateAudio({ lyrics: event.target.value.slice(0, 40_000) })}
          />
        </Field>

      <div className="tw-inline-toggle" style={{ marginTop: 14 }}>
        <span>
          <b>Auto-fetch lyrics</b>
          <small>Used when no lyrics text or .lrc file is set.</small>
        </span>
        <Toggle
          checked={audio.autoLyrics}
          onChange={(checked) => updateAudio({ autoLyrics: checked })}
          label="Auto-fetch lyrics"
        />
      </div></div><div className="tw-stack tw-audio-colors">        <div className="tw-subhead tw-span-2">Colours &amp; transparency</div>
        <ColorField label="Border animation colour" value={audio.edgeColor} onChange={edgeColor=>updateAudio({edgeColor})}/><ColorField label="Player accent" value={audio.accentColor} onChange={(value) => updateAudio({ accentColor: value })} />
        <ColorField label="Player background" value={audio.playerColor} onChange={(value) => updateAudio({ playerColor: value })} />
        <ColorField label="Border colour" value={audio.borderColor} onChange={(value) => updateAudio({ borderColor: value })} />

        <ColorField label="Title colour" value={audio.titleColor} onChange={(value) => updateAudio({ titleColor: value })} />
        <ColorField label="Artist colour" value={audio.artistColor} onChange={(value) => updateAudio({ artistColor: value })} />
        <ColorField label="Progress colour" value={audio.progressColor} onChange={(value) => updateAudio({ progressColor: value })} />
        <ColorField label="Track colour" value={audio.trackColor} onChange={(value) => updateAudio({ trackColor: value })} />

        <ColorField label="Play button" value={audio.buttonColor} onChange={(value) => updateAudio({ buttonColor: value })} />
        <ColorField label="Play icon" value={audio.buttonIconColor} onChange={(value) => updateAudio({ buttonIconColor: value })} />
</div></div>

      {audio.style === "popup" || about.design.audioPosition === "popup" ? <div className="tw-popup-settings"><h3>Popup appearance</h3><div className="tw-audio-settings-grid"><div className="tw-stack">
        <Field label="Popup corner"><Select value={audio.popupSide} options={[{value:"left",label:"Top left"},{value:"right",label:"Top right"}]} onChange={(popupSide) => updateAudio({ popupSide: popupSide as "left" | "right" })} /></Field>
        <Slider label="Music icon size" value={audio.popupSize} min={28} max={64} suffix="px" onChange={(popupSize) => updateAudio({ popupSize })} />


        <Slider label="Volume bar width" value={audio.popupBarWidth} min={60} max={180} suffix="px" onChange={(popupBarWidth) => updateAudio({ popupBarWidth })} />
        <Slider label="Corner spacing" value={audio.popupOffset} min={8} max={80} suffix="px" onChange={(popupOffset) => updateAudio({ popupOffset })} />
        <Slider label="Reveal duration" value={audio.popupDuration} min={100} max={700} step={25} suffix="ms" onChange={(popupDuration) => updateAudio({ popupDuration })} />
      </div><div className="tw-stack tw-audio-colors">        <ColorField label="Music icon colour" value={audio.popupColor} onChange={(popupColor) => updateAudio({ popupColor })} />        <ColorField label="Popup background" value={audio.popupBackground} onChange={(popupBackground) => updateAudio({ popupBackground })} /></div></div></div> : null}

      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={(event) => {
          void uploadTrack(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={lyricsInput}
        type="file"
        accept=".lrc,.txt,text/plain"
        hidden
        onChange={(event) => {
          void uploadLyrics(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void uploadCover(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
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
  // Remounting the real entry overlay replays its animation, so the preview
  // reacts to settings changes instead of looking static.
  const [previewToken, setPreviewToken] = useState(0);

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
            title="Profile appearance"
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
          <CardHead icon="code" title="Browser tab title" />
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
                options={TITLE_ANIMATIONS}
                onChange={(value) =>
                  updateMetadata({ animation: value as typeof about.metadata.animation })
                }
              />
            </Field>
          </div>
          {about.metadata.animation !== "none" ? <div className="tw-form-grid" style={{ marginTop: 16 }}>
            <Field label="Title messages" hint="One message per line. Up to 8 messages, 60 characters each.">
              <Textarea value={about.metadata.messages.join("\n")} rows={4} onChange={(event) => updateMetadata({ messages: event.target.value.split("\n").slice(0, 8).map((line) => line.slice(0, 60)) })} />
            </Field>
            <Slider label="Message interval" value={about.metadata.interval} min={2} max={30} suffix="s" onChange={(value) => updateMetadata({ interval: value })} />
          </div> : null}

        </Card>
      </>
    );
  }

  if (tab === "experience") {
    return (
      <Card>
        <CardHead
          icon="expand"
          title="Entry screen"
          subtitle="Choose what visitors see before opening your profile."
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

        <section className="tw-entry-media"><h3>Entry image and transition</h3><div className="tw-form-grid">
          <Field label="Entry image URL" hint="Images and animated GIFs are supported."><TextInput value={entry.imageUrl} onChange={(event) => updateEntry({ imageUrl: event.target.value })} /></Field>
          <Field label="Entry image upload"><FileUpload aria-label="Entry image upload" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 500_000) { notify("Entry image", "Choose an image or GIF under 500 KB."); return; } updateEntry({ imageUrl: await fileToDataUrl(file) }); }} /></Field>
          <Slider label="Entry image size" value={entry.imageSize} min={24} max={250} suffix="px" onChange={(imageSize) => updateEntry({ imageSize })} />
          <Slider label="Entry image radius" value={entry.imageRadius} min={0} max={100} suffix="px" onChange={(imageRadius) => updateEntry({ imageRadius })} />
          <Slider label="Entry content gap" value={entry.contentGap} min={0} max={60} suffix="px" onChange={(contentGap) => updateEntry({ contentGap })} />
          <Slider label="Entry transition duration" value={entry.animationDuration} min={100} max={2000} step={50} suffix="ms" onChange={(animationDuration) => updateEntry({ animationDuration })} />
          <div className="tw-inline-toggle"><b>Show once per session</b><Toggle label="Entry once per session" checked={entry.oncePerSession} onChange={(oncePerSession) => updateEntry({ oncePerSession })} /></div>
        </div></section>
        <div className="tw-subhead">Text</div>
        <div className="tw-form-grid">
          <Field label="Enter text" help>
            <TextInput
              icon="at"
              placeholder="Enter text"
              value={entry.title}
              maxLength={48}
              onChange={(event) => updateEntry({ title: event.target.value.slice(0, 48) })}
            />
          </Field>
          <Field label="Entry animation">
            <Select value={entry.animation} options={ENTRY_TRANSITIONS.map((animation) => ({ value: animation.id, label: animation.name }))} onChange={(value) => updateEntry({ animation: value as typeof entry.animation })} />
          </Field>
          <Field label="Text alignment">
            <Select
              value={entry.align}
              options={[
                { value: "center", label: "Center" },
                { value: "top", label: "Top" },
                { value: "bottom", label: "Bottom" },
              ]}
              onChange={(value) => updateEntry({ align: value as typeof entry.align })}
            />
          </Field>
          <Field label="Subtitle">
            <TextInput
              placeholder="Subtitle under the enter text"
              value={entry.subtitle}
              maxLength={96}
              onChange={(event) => updateEntry({ subtitle: event.target.value.slice(0, 96) })}
            />
          </Field>
          <Field label="Hint">
            <TextInput
              placeholder="e.g. click anywhere to enter"
              value={entry.hint}
              maxLength={60}
              onChange={(event) => updateEntry({ hint: event.target.value.slice(0, 60) })}
            />
          </Field>
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
            <ColorField
              label="Subtitle colour"
              value={entry.subtitleColor}
              onChange={(value) => updateEntry({ subtitleColor: value })}
            />
            <ColorField
              label="Hint colour"
              value={entry.hintColor}
              onChange={(value) => updateEntry({ hintColor: value })}
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
            <Slider
              label="Subtitle size"
              value={entry.subtitleSize}
              min={8}
              max={32}
              suffix="px"
              onChange={(value) => updateEntry({ subtitleSize: value })}
            />
            <Slider
              label="Hint size"
              value={entry.hintSize}
              min={8}
              max={24}
              suffix="px"
              onChange={(value) => updateEntry({ hintSize: value })}
            />
            <Slider
              label="Letter spacing"
              value={Math.round(entry.letterSpacing * 100)}
              min={-12}
              max={32}
              format={(value) => `${(value / 100).toFixed(2)}em`}
              onChange={(value) => updateEntry({ letterSpacing: value / 100 })}
            />
            <Slider
              label="Content width"
              value={entry.contentWidth}
              min={40}
              max={100}
              suffix="%"
              onChange={(value) => updateEntry({ contentWidth: value })}
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

        <div className="tw-enter-preview-head">
          <span className="tw-subhead">Live preview</span>
          <Button icon="refresh" onClick={() => setPreviewToken((value) => value + 1)}>
            Replay
          </Button>
        </div>
        {/* The real screen, not a mock — so every setting above is visible.
            It never starts audio: the entry screen is silent here. */}
        <div className="tw-enter-stage">
          <EntryOverlay key={previewToken} about={about} onEnter={() => undefined} preview />
        </div>
      </Card>
    );
  }

  if (tab === "integrations") {
    return (
      <>
        <AudioSettingsCard />
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
            onChange={(checked) => updateDesign({ joinPosition: checked ? "under-name" : "hidden" })}
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


