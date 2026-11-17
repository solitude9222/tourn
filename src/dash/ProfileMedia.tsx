import "./effectsStudio.css";
import { useRef, useState } from "react";
import { useDash } from "./context";
import { fileToDataUrl, imageToDataUrl } from "./files";
import { VIDEO_MAX_BYTES, uploadVideoFile } from "../lib/videoUpload";
import { AudioSettingsCard } from "./pages/Customize";
import { Button, Card, CardHead, Icon, Modal, Slider, Toggle } from "./ui";

type MediaKind = "avatar" | "background" | "cursor" | "pointer" | "cursors";
export function ProfileMedia() {
  const { about, user, setAbout, go, notify, isPremium } = useDash();
  const fileInput = useRef<HTMLInputElement>(null);
  const kindRef = useRef<MediaKind>("avatar");
  const [busy, setBusy] = useState<MediaKind | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [accept, setAccept] = useState("image/*");
  const [audioOpen, setAudioOpen] = useState(false);
  const assets = about.assets;
  const choose = (kind: MediaKind) => {
    if (busy) return;
    kindRef.current = kind;
    setAccept(kind === "background" ? "image/*,video/mp4,video/webm,video/quicktime" : "image/*");
    window.setTimeout(() => fileInput.current?.click(), 0);
  };
  const upload = async (files?: FileList) => {
    const file = files?.[0];
    if (!file) return;
    const kind = kindRef.current;
    setBusy(kind);
    setProgress(null);
    try {
      if (kind === "cursors") {
        const picked = Array.from(files ?? []).slice(0, 8);
        const urls: string[] = [];
        for (const image of picked) {
          if (!image.type.startsWith("image/") || image.size > 12_000_000) continue;
          const url = await imageToDataUrl(image, 128, 128);
          if (url.length <= 700_000) urls.push(url);
        }
        if (!urls.length) throw new Error("Choose PNG, JPG, WebP or GIF cursor images under 12 MB.");
        setAbout(current => {
          const merged = [...urls, ...current.assets.cursor.customCursorUrls].slice(0, 8);
          return {
            ...current,
            assets: {
              ...current.assets,
              cursor: {
                ...current.assets.cursor,
                style: "custom",
                imageUrl: merged[0] ?? "",
                customCursorUrls: merged,
              },
            },
          };
        });
        notify("Cursor set updated", `${urls.length} cursor${urls.length === 1 ? "" : "s"} added.`);
        return;
      }
      if (kind === "background" && file.type.startsWith("video/")) {
        const cap = isPremium ? VIDEO_MAX_BYTES : 4_000_000;
        if (file.size > cap) {
          throw new Error(
            isPremium ? "Choose a video under 100 MB." : "Free accounts can upload videos up to 4 MB.",
          );
        }
        const videoUrl = isPremium
          ? await uploadVideoFile(file, setProgress)
          : await fileToDataUrl(file, setProgress);
        setAbout(current => ({
          ...current,
          assets: {
            ...current.assets,
            background: { ...current.assets.background, style: "video", videoUrl },
          },
        }));
        notify("Background video updated", "Your changes publish automatically.");
        return;
      }
      if (!file.type.startsWith("image/")) throw new Error("Choose a PNG, JPG, WebP, GIF, MP4, WebM or MOV file.");
      if (file.size > 12_000_000) throw new Error("Choose an image under 12 MB.");
      const limit = kind === "avatar" ? 512 : kind === "background" ? 2000 : 128;
      const url = await imageToDataUrl(file, limit, limit);
      if (url.length > ((kind === "cursor" || kind === "pointer") ? 700_000 : 2_500_000)) throw new Error("That image is still too large. Resize it or choose a smaller animation.");
      setAbout(current => ({ ...current, assets: { ...current.assets,
        ...(kind === "avatar" ? { avatarUrl: url } : {}),
        ...(kind === "background" ? { background: { ...current.assets.background, style: "image", imageUrl: url } } : {}),
        ...(kind === "cursor" || kind === "pointer" ? { cursor: { ...current.assets.cursor, ...(kind === "cursor" ? { style: "custom", imageUrl: url, customCursorUrls: [url, ...current.assets.cursor.customCursorUrls.filter((item) => item !== url)].slice(0, 8) } : { pointerImageUrl: url }) } } : {}),
      } }));
      notify("Media updated", "Your changes publish automatically.");
    } catch (error) { notify("Media not uploaded", error instanceof Error ? error.message : "Try a different file."); }
    finally { setBusy(null); setProgress(null); }
  };
  const busyLabel = (kind: MediaKind, idle: string) =>
    busy === kind ? (progress === null ? "Processing…" : `Uploading ${progress}%`) : idle;
  const background = assets.background;
  return <><Card className="tw-profile-media"><CardHead icon="image" title="Media" subtitle="Avatar, background, audio and cursor" />
    <div className="tw-profile-media-grid">
      <div><b className="tw-media-heading">Avatar</b><button className="tw-profile-media-tile" type="button" disabled={Boolean(busy)} onClick={() => choose("avatar")} aria-label="Upload avatar">
        {assets.avatarUrl || user.avatarUrl ? <img className="tw-media-avatar" src={assets.avatarUrl || user.avatarUrl || ""} alt="Your avatar" /> : <span className="tw-media-avatar-fallback">{(about.displayName || user.username).slice(0, 1).toUpperCase()}</span>}
        <span className="tw-media-hover">{busyLabel("avatar", "Change avatar")}</span>
      </button></div>
      <div><b className="tw-media-heading">Background</b><button className="tw-profile-media-tile" type="button" disabled={Boolean(busy)} onClick={() => choose("background")} aria-label="Upload background">
        {background.style === "video" && background.videoUrl ? <video className="tw-media-background" src={background.videoUrl} muted loop playsInline preload="metadata" /> : background.style === "image" && background.imageUrl ? <img className="tw-media-background" src={background.imageUrl} alt="Your background" /> : <span className="tw-media-background-placeholder" style={{ background: background.style === "gradient" ? `linear-gradient(${background.angle ?? 135}deg, ${background.from}, ${background.to})` : background.color }}><Icon name="image" size={30} /></span>}
        <span className="tw-media-hover">{busyLabel("background", "Change background")}</span>
      </button></div>
      <div><b className="tw-media-heading">Audio</b><button className="tw-profile-media-tile tw-media-audio" type="button" onClick={() => setAudioOpen(true)} aria-label="Open audio manager"><Icon name="music" size={34} /><span>{assets.audio.title || "Open the audio player"}</span><small>{assets.audio.fileUrl ? `${1 + assets.audio.queue.length} of 3 tracks` : "Manage up to 3 audio files"}</small></button></div>
      <div><b className="tw-media-heading">Cursor</b><div className="tw-profile-media-tile tw-media-pointer-pair">
        <button type="button" disabled={Boolean(busy)} onClick={() => choose("cursor")} aria-label="Upload cursor image">{assets.cursor.imageUrl ? <img src={assets.cursor.imageUrl} alt="Cursor" /> : <Icon name="plus" size={24} />}<small>{busy === "cursor" ? "Processing…" : "Default cursor"}</small></button>
        <button type="button" disabled={Boolean(busy)} onClick={() => choose("pointer")} aria-label="Upload link pointer image">{assets.cursor.pointerImageUrl ? <img src={assets.cursor.pointerImageUrl} alt="Link pointer" /> : <Icon name="move" size={24} />}<small>{busy === "pointer" ? "Processing…" : "Link pointer"}</small></button>
      </div><div className="tw-media-reset-row"><Button disabled={!assets.cursor.imageUrl && !assets.cursor.pointerImageUrl && !assets.cursor.customCursorUrls.length} onClick={() => setAbout(current => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, style: "system", imageUrl: "", pointerImageUrl: "", customCursorUrls: [], hotspotX: 0, hotspotY: 0 } } }))}>Use default</Button><Button onClick={() => choose("cursors")} disabled={Boolean(busy) || assets.cursor.customCursorUrls.length >= 8}>Add cursor set</Button><Button onClick={() => go("appearance", undefined, "decorations")}>Pointer effects</Button></div>
      </div>
      {assets.cursor.customCursorUrls.length ? <div className="tw-cursor-set"><div><b>Custom cursor set</b><small>{assets.cursor.customCursorUrls.length} of 8 · the trailing-cursor effect uses them in order.</small></div><div className="tw-cursor-set-grid">{assets.cursor.customCursorUrls.map((url, index) => <span className="tw-cursor-set-item" key={`${url.slice(-24)}-${index}`}><button type="button" className={assets.cursor.imageUrl === url ? "is-on" : ""} title="Use as default cursor" onClick={() => setAbout(current => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, style: "custom", imageUrl: url } } }))}><img src={url} alt={`Cursor ${index + 1}`} /></button><button type="button" className="tw-cursor-set-remove" aria-label={`Remove cursor ${index + 1}`} onClick={() => setAbout(current => { const customCursorUrls = current.assets.cursor.customCursorUrls.filter((item) => item !== url); return { ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, customCursorUrls, imageUrl: current.assets.cursor.imageUrl === url ? (customCursorUrls[0] ?? "") : current.assets.cursor.imageUrl } } }; })}>×</button></span>)}</div></div> : null}
    </div>
    <div className="tw-profile-media-settings">
      <div className="tw-media-zoom">
        <div className="tw-media-setting-head"><b>Picture zoom</b><small>Scale your avatar inside its frame without changing the frame size.</small></div>
        <Slider
          label="Zoom"
          value={Math.round((assets.decoration.zoom ?? 1) * 100)}
          min={60}
          max={250}
          suffix="%"
          onChange={(value) => setAbout(current => ({
            ...current,
            assets: {
              ...current.assets,
              decoration: { ...current.assets.decoration, zoom: value / 100 },
            },
          }))}
        />
      </div>
      {assets.cursor.imageUrl || assets.cursor.customCursorUrls.length ? (
        <div className="tw-media-zoom">
          <div className="tw-media-setting-head"><b>Cursor hotspot</b><small>Move the click point if an uploaded cursor feels offset. 0 0 is the top-left pixel.</small></div>
          <Slider label="Hotspot X" value={assets.cursor.hotspotX} min={0} max={64} suffix="px" onChange={(hotspotX) => setAbout(current => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, hotspotX } } }))} />
          <Slider label="Hotspot Y" value={assets.cursor.hotspotY} min={0} max={64} suffix="px" onChange={(hotspotY) => setAbout(current => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, hotspotY } } }))} />
        </div>
      ) : null}
      {background.style === "video" ? (
        <div className="tw-media-video-sound">
          <div className="tw-inline-toggle"><span><b>Video sound</b><small>Unmutes after the visitor clicks the page.</small></span><Toggle label="Video sound" checked={background.videoAudio} onChange={(videoAudio) => setAbout(current => ({ ...current, assets: { ...current.assets, background: { ...current.assets.background, videoAudio } } }))} /></div>
          <Slider label="Video volume" value={Math.round(background.videoVolume * 100)} min={0} max={100} suffix="%" onChange={(volume) => setAbout(current => ({ ...current, assets: { ...current.assets, background: { ...current.assets.background, videoVolume: volume / 100 } } }))} />
        </div>
      ) : null}
    </div>
    <input ref={fileInput} type="file" accept={accept} multiple hidden onChange={event => { void upload(event.target.files ?? undefined); event.target.value = ""; }} />
  </Card><Modal open={audioOpen} title="Audio player" subtitle="Upload the track, manage the playlist and style the player." onClose={() => setAudioOpen(false)} width={1040}><div className="tw-audio-modal"><AudioSettingsCard /></div></Modal></>;
}
