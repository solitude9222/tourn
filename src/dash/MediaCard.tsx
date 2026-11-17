/* ---------------------------------------------------------------------------
   Appearance → Card → Media.

   One row, four tiles: avatar, background, audio and cursor. Every tile is an
   upload or a door into the manager that owns it — there is no URL box, because
   a pasted link was the thing that broke half the time. The cursor tile shows
   the actual uploaded cursors and sets them on hover, so "no pointer" is
   visibly different from a chosen one.
   --------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { useDash } from "./context";
import { Card, CardHead, Icon } from "./ui";
import { cursorToDataUrl, imageToDataUrl } from "./files";
import { detectCursorHotspot, type CursorHotspot } from "../lib/cursorImage";

export function MediaCard() {
  const { about, setAbout, go, notify } = useDash();
  const assets = about.assets;
  const avatarInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const cursorInput = useRef<HTMLInputElement>(null);
  const pointerInput = useRef<HTMLInputElement>(null);

  const patch = (next: Partial<typeof assets>) =>
    setAbout((current) => ({ ...current, assets: { ...current.assets, ...next } }));

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      patch({ avatarUrl: await imageToDataUrl(file, 512, 512) });
      notify("Avatar", "Updated. Save to publish it.");
    } catch {
      notify("Avatar", "That image could not be read.");
    }
  };

  const uploadBackground = async (file: File | undefined) => {
    if (!file) return;
    try {
      patch({
        background: {
          ...assets.background,
          style: "image",
          imageUrl: await imageToDataUrl(file, 1920, 1080),
        },
      });
      notify("Background", "Updated. Save to publish it.");
    } catch {
      notify("Background", "That image could not be read.");
    }
  };

  const uploadCursor = async (file: File | undefined, pointer: boolean) => {
    if (!file) return;
    if (file.size > 5_000_000) {
      notify("Cursor", "Choose a cursor image under 5 MB.");
      return;
    }
    try {
      const url = await cursorToDataUrl(file);
      patch({
        cursor: {
          ...assets.cursor,
          style: "custom",
          ...(pointer
            ? { pointerImageUrl: url }
            : {
                imageUrl: url,
                customCursorUrls: [url, ...assets.cursor.customCursorUrls.filter((item) => item !== url)].slice(0, 8),
                hotspotX: 0,
                hotspotY: 0,
              }),
        },
      });
      notify("Cursor", pointer ? "Pointer cursor set." : "Default cursor set.");
    } catch {
      notify("Cursor", "That cursor image could not be read.");
    }
  };

  const avatar = assets.avatarUrl.trim();
  const backgroundImage = assets.background.imageUrl.trim();
  const cursorUrl = assets.cursor.imageUrl.trim() || assets.cursor.customCursorUrls[0]?.trim() || "";
  const pointerUrl = assets.cursor.pointerImageUrl.trim();
  const [autoHotspots, setAutoHotspots] = useState<{ cursor: CursorHotspot; pointer: CursorHotspot }>({
    cursor: { x: 0, y: 0 },
    pointer: { x: 0, y: 0 },
  });
  useEffect(() => {
    let active = true;
    const measure = (key: "cursor" | "pointer", url: string) => {
      if (!url) return;
      void detectCursorHotspot(url).then((hotspot) => {
        if (active) setAutoHotspots((current) => ({ ...current, [key]: hotspot }));
      });
    };
    measure("cursor", cursorUrl);
    measure("pointer", pointerUrl);
    return () => { active = false; };
  }, [cursorUrl, pointerUrl]);
  const manualHotspot = assets.cursor.hotspotX !== 0 || assets.cursor.hotspotY !== 0;
  const cursorHotspot = manualHotspot
    ? `${Math.round(assets.cursor.hotspotX)} ${Math.round(assets.cursor.hotspotY)}`
    : `${autoHotspots.cursor.x} ${autoHotspots.cursor.y}`;
  const pointerHotspot = manualHotspot
    ? `${Math.round(assets.cursor.hotspotX)} ${Math.round(assets.cursor.hotspotY)}`
    : `${autoHotspots.pointer.x} ${autoHotspots.pointer.y}`;
  const initial = (about.displayName.trim() || "?").slice(0, 1).toUpperCase();

  return (
    <Card>
      <CardHead icon="image" title="Media" subtitle="Avatar, background, audio and cursor" />

      <div className="tw-media-row">
        <div className="tw-media-tile">
          <span className="tw-media-label">Avatar</span>
          <button
            type="button"
            className="tw-media-well tw-media-well--avatar"
            onClick={() => avatarInput.current?.click()}
            aria-label="Upload avatar"
          >
            {avatar ? <img src={avatar} alt="" /> : <span className="tw-media-avatar-fallback">{initial}</span>}
            <span className="tw-media-hint">Change</span>
          </button>
        </div>

        <div className="tw-media-tile">
          <span className="tw-media-label">Background</span>
          <button
            type="button"
            className="tw-media-well tw-media-well--bg"
            onClick={() => backgroundInput.current?.click()}
            style={backgroundImage ? { backgroundImage: `url("${backgroundImage.replace(/"/g, '\\"')}")` } : undefined}
            aria-label="Upload background"
          >
            {backgroundImage ? (
              <span className="tw-media-hint">Change</span>
            ) : (
              <span className="tw-media-empty">
                Upload a background
                <br />
                <small>max 100 MB</small>
              </span>
            )}
          </button>
        </div>

        <div className="tw-media-tile">
          <span className="tw-media-label">Audio</span>
          <button
            type="button"
            className="tw-media-well tw-media-well--audio"
            onClick={() => go("music")}
          >
            <Icon name="music" size={20} />
            <b>{assets.audio.fileUrl ? "Open audio manager" : "Click to open audio manager"}</b>
            <small>Manage up to 3 audio files</small>
          </button>
        </div>

        <div className="tw-media-tile tw-media-tile--cursor">
          <span className="tw-media-label">Cursor</span>
          <div className="tw-media-cursors">
            <button
              type="button"
              className="tw-media-cursor"
              onClick={() => cursorInput.current?.click()}
              style={{ cursor: cursorUrl ? `url("${cursorUrl}") ${cursorHotspot}, auto` : "default" }}
              aria-label="Upload default cursor"
            >
              {cursorUrl ? <img src={cursorUrl} alt="" /> : <span className="tw-cursor-glyph" aria-hidden="true">↖</span>}
              <small>{cursorUrl ? "Default cursor" : "Default"}</small>
            </button>
            <button
              type="button"
              className="tw-media-cursor"
              onClick={() => pointerInput.current?.click()}
              style={{ cursor: pointerUrl ? `url("${pointerUrl}") ${pointerHotspot}, pointer` : "pointer" }}
              aria-label="Upload pointer cursor"
            >
              {pointerUrl ? <img src={pointerUrl} alt="" /> : <span className="tw-cursor-glyph tw-cursor-glyph--pointer" aria-hidden="true">↗</span>}
              <small>{pointerUrl ? "Pointer cursor" : "No pointer"}</small>
            </button>
          </div>
        </div>
      </div>

      <input
        ref={avatarInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void uploadAvatar(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={backgroundInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void uploadBackground(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={cursorInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void uploadCursor(event.target.files?.[0], false);
          event.target.value = "";
        }}
      />
      <input
        ref={pointerInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void uploadCursor(event.target.files?.[0], true);
          event.target.value = "";
        }}
      />
    </Card>
  );
}
