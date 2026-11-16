import "./effectsStudio.css";
import { useRef, useState } from "react";
import { useDash } from "./context";
import { imageToDataUrl } from "./files";
import { Button, Card, CardHead, Icon } from "./ui";

type MediaKind = "avatar" | "background" | "cursor" | "pointer";
export function ProfileMedia() {
  const { about, user, setAbout, go, notify } = useDash();
  const fileInput = useRef<HTMLInputElement>(null);
  const kindRef = useRef<MediaKind>("avatar");
  const [busy, setBusy] = useState<MediaKind | null>(null);
  const assets = about.assets;
  const choose = (kind: MediaKind) => { if (busy) return; kindRef.current = kind; fileInput.current?.click(); };
  const upload = async (file?: File) => {
    if (!file) return;
    const kind = kindRef.current;
    setBusy(kind);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose a PNG, JPG, WebP or GIF image.");
      if (file.size > 12_000_000) throw new Error("Choose an image under 12 MB.");
      const limit = kind === "avatar" ? 512 : kind === "background" ? 2000 : 128;
      const url = await imageToDataUrl(file, limit, limit);
      if (url.length > ((kind === "cursor" || kind === "pointer") ? 700_000 : 2_500_000)) throw new Error("That image is still too large. Resize it or choose a smaller animation.");
      setAbout(current => ({ ...current, assets: { ...current.assets,
        ...(kind === "avatar" ? { avatarUrl: url } : {}),
        ...(kind === "background" ? { background: { ...current.assets.background, style: "image", imageUrl: url } } : {}),
        ...(kind === "cursor" || kind === "pointer" ? { cursor: { ...current.assets.cursor, ...(kind === "cursor" ? { style: "custom", imageUrl: url } : { pointerImageUrl: url }) } } : {}),
      } }));
      notify("Media updated", "Your changes publish automatically.");
    } catch (error) { notify("Image not uploaded", error instanceof Error ? error.message : "Try a different image."); }
    finally { setBusy(null); }
  };
  return <Card className="tw-profile-media"><CardHead icon="image" title="Media" subtitle="Avatar, background, audio and cursor" />
    <div className="tw-profile-media-grid">
      <div><b className="tw-media-heading">Avatar</b><button className="tw-profile-media-tile" type="button" disabled={Boolean(busy)} onClick={() => choose("avatar")} aria-label="Upload avatar">
        {assets.avatarUrl || user.avatarUrl ? <img className="tw-media-avatar" src={assets.avatarUrl || user.avatarUrl || ""} alt="Your avatar" /> : <span className="tw-media-avatar-fallback">{(about.displayName || user.username).slice(0, 1).toUpperCase()}</span>}
        <span className="tw-media-hover">{busy === "avatar" ? "Processing…" : "Change avatar"}</span>
      </button></div>
      <div><b className="tw-media-heading">Background</b><button className="tw-profile-media-tile" type="button" disabled={Boolean(busy)} onClick={() => choose("background")} aria-label="Upload background">
        {assets.background.style === "image" && assets.background.imageUrl ? <img className="tw-media-background" src={assets.background.imageUrl} alt="Your background" /> : <span className="tw-media-background-placeholder" style={{ background: assets.background.style === "gradient" ? `linear-gradient(${assets.background.angle ?? 135}deg, ${assets.background.from}, ${assets.background.to})` : assets.background.color }}><Icon name="image" size={30} /></span>}
        <span className="tw-media-hover">{busy === "background" ? "Processing…" : "Change background"}</span>
      </button></div>
      <div><b className="tw-media-heading">Audio</b><button className="tw-profile-media-tile tw-media-audio" type="button" onClick={() => go("portfolio-audio")} aria-label="Open audio manager"><Icon name="music" size={34} /><span>{assets.audio.title || "Click to open audio manager"}</span><small>{assets.audio.fileUrl ? `${1 + assets.audio.queue.length} of 3 tracks` : "Manage up to 3 audio files"}</small></button></div>
      <div><b className="tw-media-heading">Cursor</b><div className="tw-profile-media-tile tw-media-pointer-pair">
        <button type="button" disabled={Boolean(busy)} onClick={() => choose("cursor")} aria-label="Upload cursor image">{assets.cursor.imageUrl ? <img src={assets.cursor.imageUrl} alt="Cursor" /> : <Icon name="plus" size={24} />}<small>{busy === "cursor" ? "Processing…" : "Default cursor"}</small></button>
        <button type="button" disabled={Boolean(busy)} onClick={() => choose("pointer")} aria-label="Upload link pointer image">{assets.cursor.pointerImageUrl ? <img src={assets.cursor.pointerImageUrl} alt="Link pointer" /> : <Icon name="move" size={24} />}<small>{busy === "pointer" ? "Processing…" : "Link pointer"}</small></button>
      </div><div className="tw-media-reset-row"><Button disabled={!assets.cursor.imageUrl && !assets.cursor.pointerImageUrl} onClick={() => setAbout(current => ({ ...current, assets: { ...current.assets, cursor: { ...current.assets.cursor, style: "default", imageUrl: "", pointerImageUrl: "" } } }))}>Use default</Button><Button onClick={() => go("appearance", undefined, "decorations")}>Pointer effects</Button></div></div>
    </div>
    <input ref={fileInput} type="file" accept="image/*" hidden onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
  </Card>;
}
