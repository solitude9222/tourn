/* ---------------------------------------------------------------------------
   Customize > Profile — Profile, Appearance, Experience, Integrations and
   Extra. Every control writes a field the public page already reads; the
   couple of reference features this product does not have yet are shown
   disabled rather than pretending to save.
   --------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { uploadAudioFile } from "../../lib/audioUpload";
import { AudioPlayer } from "../../components/AudioPlayer";
import { MuteButton } from "../../components/MuteButton";
import { imageToDataUrl } from "../files";
import { AUDIO_STYLES } from "../../lib/profileAssets";
import { ONEKO_CATS } from "../../lib/oneko";
import { fileToDataUrl } from "../files";
import { ProfilePreview } from "../../components/ProfilePreview";
import { EntryOverlay } from "../../components/LinkerPreview";
import { ENTRY_ANIMATIONS as ENTRY_TRANSITIONS } from "../../lib/about";
import { DEFAULT_BADGE_STYLE } from "../../lib/badges";
import { DEFAULT_LINK_DESIGN } from "../../lib/links";
import { formatJoinDate } from "../../lib/format";
import { PlatformIcon } from "../../components/PlatformIcons";
import { useDash, type ProfileTab } from "../context";
import { MediaCard } from "../MediaCard";
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
  MultiSelect,
  Select,
  SectionLabel,
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

const ENTRY_LAYERS = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "background", label: "Background" },
];

const TOOLTIP_STYLES = [
  { value: "default", label: "Default" },
  { value: "glass", label: "Glass" },
  { value: "accent", label: "Accent" },
  { value: "dark", label: "Dark" },
  { value: "minimal", label: "Minimal" },
];

const TOOLTIP_ANIMATIONS = [
  { value: "slide", label: "Swipe up" },
  { value: "blur", label: "Blur up" },
  { value: "pop", label: "Nothing (pops in)" },
];

const FILTERS = [
  { value: "none", label: "No filter" },
  { value: "soft", label: "Soft fade" },
  { value: "blur", label: "Blur" },
  { value: "deep", label: "Deep blur" },
];

export function AudioSettingsCard() {
  const { about, setAbout, notify } = useDash();
  const audio = about.assets.audio;
  const [audioTab,setAudioTab]=useState("tracks");
  const audioInput = useRef<HTMLInputElement>(null);
  const lyricsInput = useRef<HTMLInputElement>(null);
  const queueInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const updateDesign = (patch: Partial<typeof about.design>) =>
    setAbout((current) => ({ ...current, design: { ...current.design, ...patch } }));

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

  const uploadQueueSong = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await uploadAudioFile(file);
      updateAudio({
        queue: [
          ...audio.queue,
          { id: globalThis.crypto?.randomUUID?.() ?? "q-" + Date.now(), url, title: file.name.replace(/\.[^.]+$/, "") },
        ].slice(0, 2),
      });
      notify("Playlist", "Song added. Save to publish it.");
    } catch (error) {
      notify("Upload failed", error instanceof Error ? error.message : "That audio file could not be read.");
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
      notify("Lyrics", file.name + " loaded. Changes save automatically.");
    } catch {
      notify("Lyrics", "That lyrics file could not be read.");
    }
  };

  const audioSlotNames: Record<string, string> = {
    "card-bottom": "Bottom of card",
    "below-card": "Below card",
    "page-top": "Top of page",
    "page-bottom": "Bottom of page",
  };

  const styleName = AUDIO_STYLES.find((entry) => entry.id === audio.style)?.name ?? "No style";
  const placementName =
    audioSlotNames[about.design.audioSlot] ?? about.design.audioSlot;
  const songCount = audio.fileUrl ? 1 + audio.queue.length : 0;

  return (
    <Card className="tw-audio-manager">
      <CardHead
        icon="music"
        title="Audio player"
        subtitle="Songs first, then how it plays, where it sits and how it looks."
      />

      {audio.fileUrl && audio.style !== "none" && audio.cardOpacity > 0.005 ? (
        <div className="tw-audio-live-preview">
          <AudioPlayer settings={{ ...audio, autoplay: false }} preview />
        </div>
      ) : (
        <p className="tw-foot-note">
          {!audio.fileUrl
            ? "Upload a song below to preview your player here."
            : audio.style === "none"
              ? "Player style is None, so nothing is drawn yet."
              : "Player opacity is 0%, so the player is invisible."}
        </p>
      )}
      <div className="tw-audio-chips">
        <span>{songCount ? songCount + (songCount === 1 ? " song" : " songs") : "No track"}</span>
        <span>{styleName}</span>
        <span>{placementName}</span>
      </div>

      <div className="tw-editor-tabs" role="tablist" aria-label="Audio manager sections">{[["tracks","Tracks"],["playback","Playback"],["design","Appearance"],["lyrics","Lyrics"]].map(([id,label])=><button type="button" role="tab" key={id} aria-selected={audioTab===id} onClick={()=>setAudioTab(id)}>{label}</button>)}</div>
      {audioTab==="tracks" ? <section className="tw-audio-tab-panel" aria-label="tracks">
      <SectionLabel hint="One main track plus up to two more. Shuffle picks one per visit.">
        Songs
      </SectionLabel>
      <div className="tw-audio-group">
        <Field label="Main track" hint="MP3, WAV, OGG, M4A and other audio formats.">
          <div className="tw-row">
            <Button icon="upload" disabled={uploading} onClick={() => audioInput.current?.click()}>
              {uploading ? "Uploading " + uploadProgress + "%" : audio.fileUrl ? "Replace track" : "Upload track"}
            </Button>
            {audio.fileUrl ? (
              <Button variant="danger" icon="trash" onClick={() => updateAudio({ fileUrl: "", style: "none" })}>
                Remove
              </Button>
            ) : null}
          </div>
        </Field>

        <div className="tw-audio-playlist">
          <div className="tw-audio-playlist-head">
            <b>Playlist</b>
            <span>{audio.queue.length + (audio.fileUrl ? 1 : 0)} of 3</span>
          </div>
          {audio.fileUrl ? (
            <div className="tw-queue-row">
              <span>
                <b>{audio.title || "Main track"}</b>
                <small>Main track</small>
              </span>
            </div>
          ) : null}
          {audio.queue.map((song, index) => (
            <div className="tw-queue-row" key={song.id}>
              <span>
                <b>{song.title || "Song " + (index + 2)}</b>
                <small>{"Extra song " + (index + 2)}</small>
              </span>
              <Button
                icon="trash"
                variant="danger"
                onClick={() => updateAudio({ queue: audio.queue.filter((item) => item.id !== song.id) })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button icon="upload" onClick={() => queueInput.current?.click()} disabled={audio.queue.length >= 2 || !audio.fileUrl}>
            Add another song
          </Button>
          {!audio.fileUrl ? <small className="tw-foot-note">Upload the main track first.</small> : null}
        </div>

        <div className="tw-form-grid">
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
        </div>

        <Field label="Cover art" hint="Square image shown on the player.">
          <div className="tw-row">
            {audio.coverUrl ? <img className="tw-audio-cover" src={audio.coverUrl} alt="" /> : null}
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
      </div>

      </section> : null}
      {audioTab==="playback" ? <section className="tw-audio-tab-panel" aria-label="playback">
      <SectionLabel hint="How the song behaves when someone opens your profile.">Playback</SectionLabel>
      <div className="tw-audio-group">
        <div className="tw-audio-sliders">
          <Slider label="Start at" value={audio.startAt} min={0} max={300} suffix="s" onChange={(startAt) => updateAudio({ startAt })} />
          <Slider label="Playback speed" value={audio.playbackRate} min={0.5} max={2} step={0.05} suffix="×" onChange={(playbackRate) => updateAudio({ playbackRate })} />
          <Slider label="Default volume" value={Math.round(audio.volume * 100)} min={0} max={100} suffix="%" onChange={(volume) => updateAudio({ volume: volume / 100 })} />
          <Slider label="Fade in" value={audio.fadeIn} min={0} max={4000} step={100} suffix="ms" onChange={(fadeIn) => updateAudio({ fadeIn })} />
        </div>
        <div className="tw-audio-toggles">
          <div className="tw-inline-toggle">
            <span><b>Play after entry</b><small>Starts once the visitor is inside.</small></span>
            <Toggle label="Play after entry" checked={audio.autoplay} onChange={(checked) => updateAudio({ autoplay: checked })} />
          </div>
          <div className="tw-inline-toggle">
            <span><b>Loop track</b><small>Restart when it ends.</small></span>
            <Toggle label="Loop track" checked={audio.loop} onChange={(loop) => updateAudio({ loop })} />
          </div>
          <div className="tw-inline-toggle">
            <span><b>Start muted</b><small>Visitors unmute with one click.</small></span>
            <Toggle label="Start muted" checked={audio.startMuted} onChange={(startMuted) => updateAudio({ startMuted })} />
          </div>
          <div className="tw-inline-toggle">
            <span><b>Shuffle</b><small>Pick a random song each visit.</small></span>
            <Toggle label="Shuffle" checked={audio.shuffle} onChange={(shuffle) => updateAudio({ shuffle })} />
          </div>
        </div>
      </div>

      <SectionLabel hint="A floating control that silences the track. It is not a player.">
        Mute button
      </SectionLabel>
      <div className="tw-audio-group">
        <div className="tw-inline-toggle">
          <span><b>Show mute button</b><small>Floats in a corner of the page and mutes the track.</small></span>
          <Toggle label="Mute button" checked={audio.muteButton} onChange={(muteButton) => updateAudio({ muteButton })} />
        </div>
        {audio.muteButton ? (
          <>
            <div className="tw-mute-style-preview"><MuteButton settings={audio}/><small>Live mute-button preview</small></div>
            <div className="tw-form-grid">
              <Field label="Mute button style"><Select ariaLabel="Mute button style" value={audio.popupStyle} options={[{value:"glossy",label:"Glossy circle"},{value:"minimal",label:"Minimal circle"},{value:"glass",label:"Glass"},{value:"rounded",label:"Rounded square"}]} onChange={popupStyle=>updateAudio({popupStyle:popupStyle as typeof audio.popupStyle})}/></Field>
              <Field label="Corner" hint="Where the mute button sits on the page.">
                <Select
                  value={audio.popupSide}
                  options={[
                    { value: "left", label: "Top left" },
                    { value: "right", label: "Top right" },
                    { value: "bottom-left", label: "Bottom left" },
                    { value: "bottom-right", label: "Bottom right" },
                  ]}
                  onChange={(popupSide) => updateAudio({ popupSide: popupSide as typeof audio.popupSide })}
                />
              </Field>
              <Slider label="Button opacity" min={0} max={100} suffix="%" value={Math.round(audio.popupOpacity*100)} onChange={value=>updateAudio({popupOpacity:value/100})}/>
              <Slider label="Volume rail opacity" min={0} max={100} suffix="%" value={Math.round(audio.popupRailOpacity*100)} onChange={value=>updateAudio({popupRailOpacity:value/100})}/>
              <Slider label="Speaker opacity" min={0} max={100} suffix="%" value={Math.round(audio.popupIconOpacity*100)} onChange={value=>updateAudio({popupIconOpacity:value/100})}/>
              <div className="tw-inline-toggle"><b>Mute button glow</b><Toggle label="Mute button glow" checked={audio.popupGlow} onChange={popupGlow=>updateAudio({popupGlow})}/></div>
              <ColorField label="Mute glow color" value={audio.popupGlowColor} onChange={popupGlowColor=>updateAudio({popupGlowColor})}/>
              <Slider label="Mute glow strength" min={0} max={100} suffix="%" value={audio.popupGlowStrength} onChange={popupGlowStrength=>updateAudio({popupGlowStrength})}/>
              <Slider label="Mute glow radius" min={0} max={60} suffix="px" value={audio.popupGlowBlur} onChange={popupGlowBlur=>updateAudio({popupGlowBlur})}/>
              <ColorField label="Button background" value={audio.popupBackground} onChange={(popupBackground) => updateAudio({ popupBackground })} />
              <ColorField label="Icon colour" value={audio.popupColor} onChange={(popupColor) => updateAudio({ popupColor })} />
            </div>
            <div className="tw-audio-sliders">
              <Slider label="Button size" value={audio.popupSize} min={28} max={64} suffix="px" onChange={(popupSize) => updateAudio({ popupSize })} />
              <Slider label="Volume bar width" value={audio.popupBarWidth} min={60} max={180} suffix="px" onChange={(popupBarWidth) => updateAudio({ popupBarWidth })} />
              <Slider label="Corner spacing" value={audio.popupOffset} min={8} max={80} suffix="px" onChange={(popupOffset) => updateAudio({ popupOffset })} />
              <Slider label="Reveal duration" value={audio.popupDuration} min={100} max={700} step={25} suffix="ms" onChange={(popupDuration) => updateAudio({ popupDuration })} />
            </div>
          </>
        ) : null}
      </div>

      </section> : null}
      {audioTab==="design" ? <section className="tw-audio-tab-panel" aria-label="design">
      <SectionLabel hint="Same four places the Layout preview drops it on.">Placement and style</SectionLabel>
      <div className="tw-form-grid">
        <Field label="Player style" hint="How the player looks on your profile.">
          <Select
            value={audio.style}
            options={AUDIO_STYLES.map((entry) => ({ value: entry.id, label: entry.name }))}
            onChange={(value) => updateAudio({ style: value as typeof audio.style })}
          />
        </Field>
        <Field label="Player placement" hint="Or drag the player in Layout.">
          <Select
            value={about.design.audioSlot}
            options={[
              { value: "card-bottom", label: "Bottom of card" },
              { value: "below-card", label: "Below card" },
              { value: "page-top", label: "Top of page" },
              { value: "page-bottom", label: "Bottom of page" },
            ]}
            onChange={(value) => updateDesign({ audioSlot: value as typeof about.design.audioSlot })}
          />
        </Field>
      </div>

      <SectionLabel hint="Surface, accent and typography.">Look</SectionLabel>
      <div className="tw-audio-group">
        <div className="tw-form-grid tw-audio-colors">
          <ColorField label="Player background" value={audio.playerColor} onChange={(value) => updateAudio({ playerColor: value })} />
          <ColorField label="Player accent" value={audio.accentColor} onChange={(value) => updateAudio({ accentColor: value })} />
          <ColorField label="Title colour" value={audio.titleColor} onChange={(value) => updateAudio({ titleColor: value })} />
          <ColorField label="Artist colour" value={audio.artistColor} onChange={(value) => updateAudio({ artistColor: value })} />
          <ColorField label="Play button" value={audio.buttonColor} onChange={(value) => updateAudio({ buttonColor: value })} />
          <ColorField label="Play icon" value={audio.buttonIconColor} onChange={(value) => updateAudio({ buttonIconColor: value })} />
        </div>
        <div className="tw-audio-sliders">
          <Slider label="Player opacity" value={Math.round(audio.cardOpacity * 100)} min={0} max={100} suffix="%" onChange={(cardOpacity) => updateAudio({ cardOpacity: cardOpacity / 100 })} />
          <Slider label="Accent opacity" value={Math.round(audio.accentOpacity * 100)} min={0} max={100} suffix="%" onChange={(value) => updateAudio({ accentOpacity: value / 100 })} />
        </div>
        <details className="tw-advanced">
          <summary>Bar and progress colours<small>optional</small></summary>
          <div className="tw-form-grid tw-audio-colors">
            <ColorField label="Progress colour" value={audio.progressColor} onChange={(value) => updateAudio({ progressColor: value })} />
            <ColorField label="Track colour" value={audio.trackColor} onChange={(value) => updateAudio({ trackColor: value })} />
          </div>
          <div className="tw-audio-sliders">
            <Slider label="Track alpha" value={Math.round(audio.trackOpacity * 100)} min={0} max={100} suffix="%" onChange={(value) => updateAudio({ trackOpacity: value / 100 })} />
          </div>
        </details>
        <details className="tw-advanced">
          <summary>Border<small>colour, alpha and animation</small></summary>
          <div className="tw-form-grid tw-audio-colors">
            <ColorField label="Border colour" value={audio.borderColor} onChange={(value) => updateAudio({ borderColor: value })} />
            <ColorField label="Animation colour" value={audio.edgeColor} onChange={(edgeColor) => updateAudio({ edgeColor })} />
          </div>
          <Field label="Border animation">
            <Select
              value={audio.edgeEffect}
              options={[
                { value: "none", label: "None" },
                { value: "trace", label: "Travelling light" },
                { value: "pulse", label: "Soft pulse" },
              ]}
              onChange={(edgeEffect) => updateAudio({ edgeEffect: edgeEffect as typeof audio.edgeEffect })}
            />
          </Field>
          <div className="tw-audio-sliders">
            <Slider label="Border alpha" value={Math.round(audio.borderOpacity * 100)} min={0} max={100} suffix="%" onChange={(value) => updateAudio({ borderOpacity: value / 100 })} />
            <Slider label="Animation duration" value={audio.edgeSpeed} min={1} max={15} step={0.5} suffix="s" onChange={(edgeSpeed) => updateAudio({ edgeSpeed })} />
          </div>
        </details>
      </div>

      </section> : null}
      {audioTab==="lyrics" ? <section className="tw-audio-tab-panel" aria-label="lyrics">
      <SectionLabel hint="Optional synced words over the player.">Lyrics</SectionLabel>
      <div className="tw-audio-group">
        <div className="tw-row">
          <Button icon="upload" onClick={() => lyricsInput.current?.click()}>
            {audio.lyrics ? "Replace .lrc" : "Upload .lrc"}
          </Button>
          {audio.lyrics ? (
            <Button variant="danger" icon="trash" onClick={() => updateAudio({ lyrics: "" })}>
              Remove
            </Button>
          ) : null}
          <div className="tw-inline-toggle tw-audio-inline-toggle">
            <span><b>Auto-fetch</b><small>When no file is set.</small></span>
            <Toggle label="Auto-fetch lyrics" checked={audio.autoLyrics} onChange={(checked) => updateAudio({ autoLyrics: checked })} />
          </div>
        </div>
        <Slider label="Lyric size" value={audio.lyricsSize} min={8} max={18} step={0.5} suffix="px" onChange={(lyricsSize) => updateAudio({ lyricsSize })} />
        <Field label="Lyrics text" hint={audio.lyrics.length + " / 40000"}>
          <Textarea
            rows={6}
            maxLength={40_000}
            placeholder={"[00:12.40] First line\n[00:16.10] Second line"}
            value={audio.lyrics}
            onChange={(event) => updateAudio({ lyrics: event.target.value.slice(0, 40_000) })}
          />
        </Field>
      </div>

      </section> : null}
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
        ref={queueInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={(event) => {
          void uploadQueueSong(event.target.files?.[0]);
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

function EntryPreviewStage({ about, token }: { about: ReturnType<typeof useDash>["about"]; token: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // The entry screen is designed at full page size, so preview it at that
  // size and scale the whole thing down — cropping or shrinking the type
  // would show a different screen from the one visitors get.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / 1440);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="tw-enter-stage" ref={ref}>
      <div className="tw-enter-canvas" style={{ transform: `scale(${scale})` }}>
        <EntryOverlay key={token} about={about} onEnter={() => undefined} preview />
      </div>
    </div>
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
        <MediaCard />
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
          <CardHead icon="code" title="Browser tab title" subtitle="The main title shown in the browser tab." />
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
          <Field label="Entry image upload"><FileUpload aria-label="Entry image upload" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 500_000) { notify("Entry image", "Choose an image or GIF under 500 KB."); return; } updateEntry({ imageUrl: await fileToDataUrl(file) }); }} /></Field>
          <Field label="Entry image style" hint="Background makes the image fill the whole entry screen instead of sitting in a small frame."><Select value={entry.imageMode ?? "inline"} options={[{ value: "inline", label: "Inline image" }, { value: "background", label: "Full-screen background" }]} onChange={(value) => updateEntry({ imageMode: value as "inline" | "background" })} /></Field>
          <Slider label="Entry image size" value={entry.imageSize} min={24} max={250} suffix="px" onChange={(imageSize) => updateEntry({ imageSize })} />
          <Slider label="Entry image radius" value={entry.imageRadius} min={0} max={100} suffix="px" onChange={(imageRadius) => updateEntry({ imageRadius })} />
          <Slider label="Entry content gap" value={entry.contentGap} min={0} max={60} suffix="px" onChange={(contentGap) => updateEntry({ contentGap })} />
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
          <Field label="Animation layers" hint="Choose which layers animate when the screen opens.">
            <MultiSelect ariaLabel="Animation layers" value={entry.layers ?? []} options={ENTRY_LAYERS} placeholder="Choose layers" onChange={(layers) => updateEntry({ layers: layers as typeof entry.layers })} />
          </Field>
          <Slider label="Animation duration" value={entry.animationDuration} min={100} max={2000} step={50} suffix="ms" onChange={(animationDuration) => updateEntry({ animationDuration })} />
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
              label="Opacity — 0 shows your live page behind"
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
        <EntryPreviewStage about={about} token={previewToken} />
      </Card>
    );
  }


  const profileViewsOn = design.showViews !== false;
  const audioOn = about.assets.audio.style !== "none";
  const tooltips = design.tooltips;

  return (
    <>
      <Card><CardHead icon="sparkles" title="Glow settings" subtitle="Control the profile halo and metadata glow independently."/><div className="tw-form-grid"><div className="tw-inline-toggle"><b>Profile glow</b><Toggle label="Profile glow" checked={Boolean(design.profileGlow)} onChange={profileGlow=>updateDesign({profileGlow})}/></div><ColorField label="Profile glow color" value={design.profileGlowColor||"#80aaff"} onChange={profileGlowColor=>updateDesign({profileGlowColor})}/><Slider label="Profile glow strength" min={0} max={100} suffix="%" value={Math.round((design.profileGlowStrength??.4)*100)} onChange={value=>updateDesign({profileGlowStrength:value/100})}/><Slider label="Profile glow radius" min={0} max={60} suffix="px" value={design.profileGlowRadius??18} onChange={profileGlowRadius=>updateDesign({profileGlowRadius})}/><ColorField label="Details glow color" value={design.metaGlowColor||"#80aaff"} onChange={metaGlowColor=>updateDesign({metaGlowColor})}/><Slider label="Details glow strength" min={0} max={100} suffix="%" value={Math.round((design.metaGlowStrength??0)*100)} onChange={value=>updateDesign({metaGlowStrength:value/100})}/></div></Card>
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

        {design.oneko ? (
          <div className="tw-oneko-cats">
            {ONEKO_CATS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={"tw-oneko-cat" + (design.onekoCat === cat.id ? " is-active" : "")}
                onClick={() => updateDesign({ onekoCat: cat.id })}
                aria-pressed={design.onekoCat === cat.id}
              >
                <span style={{ backgroundImage: `url(${cat.sprite})` }} />
                <small>{cat.label}</small>
              </button>
            ))}
          </div>
        ) : null}

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
            <Field label="Entrance animation">
              <Select
                value={tooltips.animation}
                options={TOOLTIP_ANIMATIONS}
                onChange={(value) =>
                  updateDesign({
                    tooltips: { ...tooltips, animation: value as typeof tooltips.animation },
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
            checked={design.showLocation !== false}
            onChange={(checked) => updateDesign({ showLocation: checked })}
          />
          <ToggleTile
            icon="eye"
            title="Profile Views"
            description="Show your view counter"
            checked={profileViewsOn}
            onChange={(checked) => updateDesign({ showViews: checked })}
          />
          <ToggleTile
            icon="calendar"
            title="Account date"
            description="Place it in Layout"
            checked={design.showJoined !== false}
            onChange={(checked) => updateDesign({ showJoined: checked })}
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
          <ToggleTile
            icon="music"
            title="Mute button"
            description="Floating mute control"
            checked={about.assets.audio.muteButton}
            onChange={(muteButton) =>
              setAbout((current) => ({
                ...current,
                assets: { ...current.assets, audio: { ...current.assets.audio, muteButton } },
              }))
            }
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
            <div className="tw-inline-toggle">
              <span>
                <b>Tilt widgets &amp; audio</b>
                <small>The widget cards and the player lean with the card</small>
              </span>
              <Toggle
                checked={Boolean(design.widgetTilt)}
                onChange={(checked) => updateDesign({ widgetTilt: checked })}
                label="Tilt widgets and audio"
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



/** Appearance → Audio: the player settings on their own, not buried in
    the integrations list. */
export function AudioPage() {
  return (
    <>
      <AudioSettingsCard />
    </>
  );
}
