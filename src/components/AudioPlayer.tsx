import {PlaylistAudioPlayer} from './PlaylistAudioPlayer';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { formatClock } from "../lib/format";
import {
  activeLyricIndex,
  fetchLyrics,
  parseLyricsInput,
  type LyricLine,
} from "../lib/lyrics";
import type { AudioSettings } from "../lib/profileAssets";
import { hexToRgba } from "../lib/about";
import { setAudioBus, subscribeAudioBus } from "../lib/audioBus";
import { apiBase } from "../lib/backend";
import { useTilt } from "../lib/useTilt";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "./Icons";
import "../audioPlayer.css";

const LyricsPanel = memo(function LyricsPanel({
  lines,
  activeLine,
  position,
  loading,
  plainFallback,
  hint,
}: {
  lines: LyricLine[];
  activeLine: number;
  position: number;
  loading: boolean;
  plainFallback: string | null;
  hint: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  // The panel holds every line, not a five-line window; it scrolls so the line
  // being sung sits in the middle and nothing is ever cut off.
  useEffect(() => {
    const wrap = wrapRef.current;
    const row = activeRef.current;
    if (!wrap || !row) return;
    wrap.scrollTo({
      top: Math.max(0, row.offsetTop - wrap.clientHeight / 2 + row.offsetHeight / 2),
      behavior: "smooth",
    });
  }, [activeLine]);

  if (lines.length) {
    const current = activeLine >= 0 ? lines[activeLine] : undefined;
    const next = activeLine >= 0 ? lines[activeLine + 1] : undefined;
    const words = current ? current.text.split(/\s+/).filter(Boolean) : [];
    // Spread the line's own duration over its words so the glow walks the line
    // in time with the vocal instead of snapping on at the line start.
    const span = current ? Math.max(0.6, (next ? next.time : current.time + 4) - current.time) : 1;
    const progress = current ? Math.min(1, Math.max(0, (position - current.time) / span)) : 0;
    const sung = Math.floor(progress * words.length);
    return (
      <div className="ap-lyrics" aria-live="polite" ref={wrapRef}>
        {lines.map((line, index) => (
          <p
            key={index}
            ref={index === activeLine ? activeRef : undefined}
            className={
              index === activeLine ? "ap-lyric-current" : index < activeLine ? "ap-lyric-past" : "ap-lyric-dim"
            }
          >
            {index === activeLine && words.length
              ? words.map((word, wordIndex) => (
                  <span key={wordIndex} className={`ap-lyric-word${wordIndex <= sung ? " is-sung" : ""}`}>
                    {word}
                    {wordIndex < words.length - 1 ? " " : ""}
                  </span>
                ))
              : line.text || "\u00A0"}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="ap-lyrics">
      <p className="ap-lyrics-empty">
        {loading
          ? "Finding lyrics…"
          : plainFallback
            ? plainFallback.split("\n").filter(Boolean).slice(0, 3).join(" · ")
            : hint}
      </p>
    </div>
  );
});

/**
 * The owner's uploaded track, in one of four styles. Playback is a native
 * <audio> element this component fully controls — real play/pause/seek/skip,
 * no third-party embed, no external script, nothing that can fail to load.
 * Lyrics come from the owner first (pasted or uploaded LRC/plain text) and
 * optionally fall back to a synced lookup for the Lyrics style.
 */
function SingleAudioPlayer({
  settings,
  enabled = true,
  tilt = 0,
  preview = false,
}: {
  settings: AudioSettings;
  /** False while the entry screen covers the page — the track starts after it. */
  enabled?: boolean;
  /** Optional pointer tilt, in degrees. 0 keeps the player flat. */
  tilt?: number;
  /** Dashboard/demo previews show the player but must never play a sound. */
  preview?: boolean;
}) {
  const musicTilt = useTilt<HTMLDivElement>(tilt);
  // The manager can hold three songs. Shuffle picks one per page load;
  // otherwise the main file plays and the queue is a fallback.
  const pool = [
    { id: "main", url: settings.fileUrl, title: settings.title },
    ...(settings.queue ?? []),
  ].filter((item) => item.url.trim());
  const [queuePick] = useState(() =>
    settings.shuffle && pool.length > 1 ? Math.floor(Math.random() * pool.length) : 0,
  );
  const active = pool.length ? pool[Math.min(queuePick, pool.length - 1)] : null;
  const fileUrl = (active?.url ?? settings.fileUrl).trim();
  const title = (active?.title ?? settings.title).trim() || "Untitled track";
  const artist = settings.artist.trim();
  const cover = settings.coverUrl.trim() || null;
  const hasTrack = Boolean(fileUrl);
  // "None" hides the player chrome, not the music. An uploaded track keeps
  // playing with this hidden element so the page mute button can control it.
  const audioOn = settings.style !== "none";
  const style = settings.style;
  // Saved uploads can hold a relative /api path; resolve it so the audio
  // element can actually fetch the file.
  const trackSrc = !fileUrl
    ? ""
    : /^(https?:|data:|blob:)/i.test(fileUrl)
      ? fileUrl
      : `${apiBase()}${fileUrl}`;
  // A track can outlive its upload (re-deploy, deleted row). Say so instead of
  // presenting a play button that silently does nothing.
  const [loadFailed, setLoadFailed] = useState(false);
  const [autoplayBlocked,setAutoplayBlocked]=useState(false);

  const cardStyle = {
    "--ap-opacity": settings.cardOpacity,
    "--ap-edge-color":settings.edgeColor,
    "--ap-edge-speed":`${settings.edgeSpeed}s`,
    "--ap-accent": hexToRgba(settings.accentColor, settings.accentOpacity ?? 1),
    "--ap-bg": settings.playerColor,
    "--ap-border": settings.borderColor,
    "--ap-border-opacity": settings.borderOpacity,
    "--ap-title": settings.titleColor,
    "--ap-artist": settings.artistColor,
    "--ap-progress": settings.progressColor,
    "--ap-track": settings.trackColor,
    "--ap-track-opacity": settings.trackOpacity,
    "--ap-button": settings.buttonColor,
    "--ap-button-ink": settings.buttonIconColor,
    // The player always spans the card at full size; only the compact layout
    // changes its shape.
    "--ap-scale": "1",
    "--ap-lyric-size": `${settings.lyricsSize}px`,
  } as CSSProperties;

  // ── native <audio> playback ──────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(settings.volume);
  const [muted, setMuted] = useState(settings.startMuted);
  useEffect(() => { setVolume(settings.volume); }, [settings.volume]);
  useEffect(() => { setMuted(settings.startMuted); }, [settings.startMuted]);
  useEffect(() => { const el = audioRef.current; if (el) { el.volume = volume; el.muted = muted; el.playbackRate = settings.playbackRate; } }, [volume, muted, settings.playbackRate, fileUrl, settings.style]);
  // The mute button is a separate control on the page; it drives this player
  // through the bus so there is never a second <audio> playing the same track.
  const playsRef = useRef(0);
  useEffect(() =>
    subscribeAudioBus((next) => {
      setMuted(next.muted);
      setVolume(next.volume);
      if (preview) return;
      if (next.playToken !== playsRef.current) {
        playsRef.current = next.playToken;
        const el = audioRef.current;
        if (el && el.paused) void el.play().then(() => setPlaying(true)).catch(() => undefined);
      }
    }),
  [preview]);
  useEffect(() => {
    setAudioBus({ muted, volume });
  }, [muted, volume]);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const pillViewport = useRef<HTMLSpanElement>(null);
  const pillText = useRef<HTMLSpanElement>(null);
  const [pillOverflow, setPillOverflow] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [fileUrl]);

  // Measure the pill's title strip after layout and fonts settle. The shift
  // and duration are CSS variables, so the back-and-forth marquee runs on the
  // compositor instead of updating React on every frame.
  useEffect(() => {
    if (style !== "pill") return;
    const viewport = pillViewport.current;
    const text = pillText.current;
    if (!viewport || !text) {
      setPillOverflow(0);
      return;
    }
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const next = Math.max(0, text.scrollWidth - viewport.clientWidth);
      setPillOverflow((current) => (Math.abs(current - next) > 1 ? next : current));
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    observer?.observe(text);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [style, fileUrl, title, artist, hasTrack]);

  // Autoplay is held while the entry screen is up: the song starts when the
  // visitor actually enters, not while the intro is still covering the page.
  // If the browser blocks it, it replays on the next click or keypress.
  const retryCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (preview) {
      el.pause();
      return;
    }
    if (!fileUrl || !settings.autoplay) return;

    if (!enabled) {
      el.pause();
      if (el.currentTime !== 0) el.currentTime = 0;
      return;
    }

    let cancelled = false;

    const armRetry = () => {
      const retry = () => {
        cleanup();
        if (!cancelled) void el.play().then(()=>setAutoplayBlocked(false)).catch(()=>setAutoplayBlocked(true));
      };
      const cleanup = () => {
        window.removeEventListener("pointerdown", retry);
        window.removeEventListener("keydown", retry);
        retryCleanup.current = null;
      };
      retryCleanup.current = cleanup;
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    };

    void el.play().catch(() => {
      if (!cancelled){setAutoplayBlocked(true);armRetry();}
    });

    return () => {
      cancelled = true;
      retryCleanup.current?.();
    };
  }, [fileUrl, settings.autoplay, enabled, preview]);

  const togglePlay = () => {
    if (preview) return;
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  // Optional volume ramp when playback starts, so a track eases in instead of
  // hitting at full level. 0ms leaves the level exactly where the slider is.
  const fadeFrame = useRef(0);
  const startFade = () => {
    const el = audioRef.current;
    window.cancelAnimationFrame(fadeFrame.current);
    if (!el) return;
    if (!settings.fadeIn || el.muted) {
      el.volume = volume;
      return;
    }
    const target = volume;
    const startedAt = performance.now();
    el.volume = 0;
    const step = (now: number) => {
      if (!audioRef.current) return;
      const ratio = Math.min(1, (now - startedAt) / settings.fadeIn);
      audioRef.current.volume = target * ratio;
      if (ratio < 1) fadeFrame.current = window.requestAnimationFrame(step);
    };
    fadeFrame.current = window.requestAnimationFrame(step);
  };
  useEffect(() => () => window.cancelAnimationFrame(fadeFrame.current), []);

  // `timeupdate` only fires about four times a second, which makes the lyric
  // track visibly lag a fast line. While the track plays, read the real clock
  // on an animation frame (throttled) so the highlight and the scroll land on
  // the line the moment it is sung.
  // Only styles that show synced lyrics need it. Everything else is happy with
  // the native `timeupdate` (about 4 Hz); running a React state update every
  // 80 ms re-rendered the whole player for nothing.
  const needsFineClock = style === "lyrics" || style === "vinyl";
  useEffect(() => {
    if (!playing || !needsFineClock) return;
    const el = audioRef.current;
    if (!el) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (now - last < 80) return;
      last = now;
      const next = el.currentTime || 0;
      setPosition((current) => (Math.abs(next - current) > 0.02 ? next : current));
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, needsFineClock]);

  const skip = (deltaSeconds: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.min(duration, Math.max(0, el.currentTime + deltaSeconds));
  };

  const seekToFraction = (fraction: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.min(duration, Math.max(0, fraction * duration));
  };

  // ── lyrics ───────────────────────────────────────────────────────────
  const customLyrics = useMemo(() => parseLyricsInput(settings.lyrics), [settings.lyrics]);
  const autoLyrics = useAutoLyrics(
    settings.style === "lyrics" &&
      settings.autoLyrics &&
      !customLyrics.synced &&
      !customLyrics.plain,
    title,
    artist,
  );

  const syncedLines = customLyrics.synced ?? autoLyrics.data?.synced ?? [];
  const plainFallback = customLyrics.plain ?? autoLyrics.data?.plain ?? null;
  const activeLine = useMemo(
    () => (syncedLines.length ? activeLyricIndex(syncedLines, position) : -1),
    [syncedLines, position],
  );

  if (!hasTrack) return null;

  const audioEl = (
    <audio
      ref={audioRef}
      src={trackSrc}
                    preload={preview ? "none" : enabled ? "auto" : "metadata"}
      onError={() => {
        setLoadFailed(true);
        console.warn("[tourn] audio failed to load", trackSrc);
      }}
      onCanPlay={() => setLoadFailed(false)}
      loop={settings.loop}
      onPlay={() => { setPlaying(true);setAutoplayBlocked(false); startFade(); }}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onLoadedMetadata={(event) => {
        const el = event.currentTarget;
        setDuration(el.duration || 0);
        // Start at the owner's chosen second, clamped inside the track.
        if (settings.startAt > 0 && el.currentTime < settings.startAt) {
          el.currentTime = Math.min(settings.startAt, Math.max(0, (el.duration || 0) - 1));
        }
      }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime || 0)}
      style={{ display: "none" }}
    />
  );

  if (!audioOn) return audioEl;

  const coverNode = cover ? (
    <img src={cover} alt="" draggable={false} decoding="async" />
  ) : (
    <span className="ap-cover-fallback" aria-hidden="true">
      <PlayIcon size={13} />
    </span>
  );

  if (style === "vinyl") {
    // The record spins only while the track is actually playing, and the
    // current lyric (custom or auto) rides under the artist line.
    const currentLine =
      (syncedLines.length && activeLine >= 0 ? syncedLines[activeLine]?.text : null) ??
      plainFallback?.split("\n").find(Boolean) ??
      null;

    return (
      <div
        ref={musicTilt.ref}
        onPointerMove={tilt > 0 ? musicTilt.onPointerMove : undefined}
        onPointerLeave={tilt > 0 ? musicTilt.onPointerLeave : undefined}
        className={`ap ap--vinyl ap-edge-${settings.edgeEffect}${tilt > 0 ? " has-tilt" : ""}`}
        style={cardStyle}
      >
        {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
        <span className={`ap-vinyl-disc${playing ? " is-spinning" : ""}`}>
          <span className="ap-vinyl-label">{coverNode}</span>
        </span>
        <div className="ap-vinyl-copy">
          <b>{title}</b>
          <small>{artist || "Uploaded track"}</small>
          {currentLine ? <em className="ap-vinyl-lyric">{currentLine}</em> : null}
          <div
            className="ap-progress is-seekable"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              seekToFraction((event.clientX - rect.left) / rect.width);
            }}
          >
            <span
              className="ap-progress-fill"
              style={{ width: `${duration ? (position / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="ap-transport">
          <button type="button" className="ap-skip" onClick={() => skip(-10)} aria-label="Back 10 seconds">
            <SkipBackIcon size={13} />
          </button>
          <button type="button" className="ap-play" onClick={togglePlay} disabled={preview} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
          </button>
          <button type="button" className="ap-skip" onClick={() => skip(10)} aria-label="Forward 10 seconds">
            <SkipForwardIcon size={13} />
          </button>
        </div>
      </div>
    );
  }

  // 0% opacity hides the frame but keeps the audio element mounted, so the
  // track is not silenced by a visual-only setting.
  if (settings.cardOpacity <= 0.005) return audioEl;

  const seekFrom = (event: ReactMouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seekToFraction((event.clientX - rect.left) / rect.width);
  };
  const fraction = duration ? Math.min(1, Math.max(0, position / duration)) : 0;
  const tiltProps = {
    ref: musicTilt.ref,
    onPointerMove: tilt > 0 ? musicTilt.onPointerMove : undefined,
    onPointerLeave: tilt > 0 ? musicTilt.onPointerLeave : undefined,
  };
  const playButton = (
    <button type="button" className="ap-play" onClick={togglePlay} disabled={preview} aria-label={playing ? "Pause" : "Play"}>
      {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
    </button>
  );
  const errorNode = loadFailed ? (
    <span className="ap-load-error" role="status">Track unavailable — re-upload it in Customise</span>
  ) : null;

  if (style === "bars") {
    return (
      <div
        {...tiltProps}
        className={`ap ap-edge-${settings.edgeEffect} ap--bars${playing ? " is-playing" : ""}${tilt > 0 ? " has-tilt" : ""}`}
        style={cardStyle}
      >
        {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
        {errorNode}
        <div className="ap-row">
          <span className="ap-cover">{coverNode}</span>
          <div className="ap-meta">
            <b className="ap-title">{title}</b>
            <small className="ap-artist">{artist || "Uploaded track"}</small>
          </div>
          <span className="ap-eq" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          {playButton}
        </div>
        <div className="ap-bars-progress is-seekable" onClick={seekFrom}>
          <span className="ap-progress-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
      </div>
    );
  }

  if (style === "minimal") {
    return (
      <div
        {...tiltProps}
        className={`ap ap-edge-${settings.edgeEffect} ap--minimal${playing ? " is-playing" : ""}${tilt > 0 ? " has-tilt" : ""}`}
        style={cardStyle}
      >
        {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
        {errorNode}
        <div className="ap-min-row">
          {playButton}
          <span className="ap-min-text">
            <b>{title}</b>
            <span aria-hidden="true"> – </span>
            <span className="ap-min-artist">{artist || "Uploaded track"}</span>
          </span>
          <span className="ap-min-time">{formatClock(position * 1000)}</span>
        </div>
        <div className="ap-min-progress is-seekable" onClick={seekFrom}>
          <span className="ap-progress-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
      </div>
    );
  }

  if (style === "cover") {
    return (
      <div
        {...tiltProps}
        className={`ap ap-edge-${settings.edgeEffect} ap--cover${playing ? " is-playing" : ""}${tilt > 0 ? " has-tilt" : ""}`}
        style={cardStyle}
      >
        {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
        {errorNode}
        <div className="ap-album">{coverNode}</div>
        <div className="ap-album-body">
          <div className="ap-album-copy">
            <b className="ap-title">{title}</b>
            <small className="ap-artist">{artist || "Uploaded track"}</small>
          </div>
          <div className="ap-progress is-seekable" onClick={seekFrom}>
            <span className="ap-progress-fill" style={{ width: `${fraction * 100}%` }} />
          </div>
          <div className="ap-times">
            <span>{formatClock(position * 1000)}</span>
            <span>{duration ? formatClock(duration * 1000) : "--:--"}</span>
          </div>
          <div className="ap-transport ap-transport--center">
            <button type="button" className="ap-skip" onClick={() => skip(-10)} aria-label="Back 10 seconds">
              <SkipBackIcon size={13} />
            </button>
            {playButton}
            <button type="button" className="ap-skip" onClick={() => skip(10)} aria-label="Forward 10 seconds">
              <SkipForwardIcon size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (style === "glass") {
    const glassStyle = {
      ...cardStyle,
      "--ap-pct": `${(fraction * 360).toFixed(1)}deg`,
      "--ap-glass-cover": cover ? `url("${cover.replace(/"/g, '\\"')}")` : "none",
    } as CSSProperties;
    return (
      <div
        {...tiltProps}
        className={`ap ap-edge-${settings.edgeEffect} ap--glass${playing ? " is-playing" : ""}${tilt > 0 ? " has-tilt" : ""}`}
        style={glassStyle}
      >
        {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
        {errorNode}
        <span className="ap-glass-bg" aria-hidden="true" />
        <div className="ap-row">
          <span className="ap-cover">{coverNode}</span>
          <div className="ap-meta">
            <b className="ap-title">{title}</b>
            <small className="ap-artist">{artist || "Uploaded track"}</small>
            <div className="ap-times ap-times--inline">
              <span>{formatClock(position * 1000)}</span>
              <span>{duration ? formatClock(duration * 1000) : "--:--"}</span>
            </div>
          </div>
          <span className="ap-ring">{playButton}</span>
        </div>
      </div>
    );
  }

  if (style === "pill") {
    const durationSeconds = Math.min(26, Math.max(8, pillOverflow / 16));
    const pillStyle = {
      "--ap-pill-end": `-${pillOverflow}px`,
      "--ap-pill-duration": `${durationSeconds.toFixed(1)}s`,
    } as CSSProperties;

    return (
      <div
        ref={musicTilt.ref}
        onPointerMove={tilt > 0 ? musicTilt.onPointerMove : undefined}
        onPointerLeave={tilt > 0 ? musicTilt.onPointerLeave : undefined}
        className={`ap ap-edge-${settings.edgeEffect} ap--pill${playing ? " is-playing" : ""}${pillOverflow ? " is-scrolling" : ""}${tilt > 0 ? " has-tilt" : ""}`}
        style={cardStyle}
      >
        {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
        {loadFailed ? <span className="ap-load-error" role="status">Track unavailable — re-upload it in Customise</span> : null}
        <div className="ap-pill">
          <span className="ap-cover ap-pill-cover">{coverNode}</span>
          <span className="ap-pill-viewport" ref={pillViewport}>
            <span
              className={`ap-pill-text${pillOverflow ? "" : " is-static"}`}
              ref={pillText}
              style={pillStyle}
            >
              <b>{title}</b>
              <span className="ap-pill-sep" aria-hidden="true">
                ·
              </span>
              <span className="ap-pill-artist">{artist || "Uploaded track"}</span>
            </span>
          </span>
          <button
            type="button"
            className="ap-play ap-pill-play"
            onClick={togglePlay}
            disabled={preview}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
          </button>
        </div>
        <div
          className="ap-pill-progress is-seekable"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            seekToFraction((event.clientX - rect.left) / rect.width);
          }}
        >
          <span
            className="ap-progress-fill"
            style={{ width: `${duration ? (position / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={musicTilt.ref}
      onPointerMove={tilt > 0 ? musicTilt.onPointerMove : undefined}
      onPointerLeave={tilt > 0 ? musicTilt.onPointerLeave : undefined}
      className={`ap ap-edge-${settings.edgeEffect} ap--${style}${tilt > 0 ? " has-tilt" : ""}`}
      style={cardStyle}
    >
      {audioEl}{autoplayBlocked&&!preview?<span className="ap-playback-status" role="status">Playback is paused by your browser. Press Play or Unmute to start.</span>:null}
      {loadFailed ? <span className="ap-load-error" role="status">Track unavailable — re-upload it in Customise</span> : null}
      <div className="ap-row">
        <span className="ap-cover">{coverNode}</span>
        <div className="ap-meta">
          <b className="ap-title">{title}</b>
          <small className="ap-artist">{artist || "Uploaded track"}</small>
          <div
            className="ap-progress is-seekable"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              seekToFraction((event.clientX - rect.left) / rect.width);
            }}
          >
            <span className="ap-progress-fill" style={{ width: `${duration ? (position / duration) * 100 : 0}%` }} />
          </div>
          <div className="ap-times">
            <span>{formatClock(position * 1000)}</span>
            <span>{duration ? formatClock(duration * 1000) : "--:--"}</span>
          </div>
        </div>
        <div className="ap-transport">
          <button type="button" className="ap-skip" onClick={() => skip(-10)} aria-label="Back 10 seconds">
            <SkipBackIcon size={13} />
          </button>
          <button type="button" className="ap-play" onClick={togglePlay} disabled={preview} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
          </button>
          <button type="button" className="ap-skip" onClick={() => skip(10)} aria-label="Forward 10 seconds">
            <SkipForwardIcon size={13} />
          </button>
        </div>
      </div>

      {style === "lyrics" ? (
        <LyricsPanel
          lines={syncedLines}
          activeLine={activeLine}
          position={position}
          loading={autoLyrics.loading}
          plainFallback={plainFallback}
          hint="No lyrics yet — add them in the dashboard."
        />
      ) : null}
    </div>
  );
}

/** Auto-lookup only runs when the owner didn't supply their own lyrics. */
function useAutoLyrics(
  enabled: boolean,
  title: string,
  artist: string,
): { data: { synced: LyricLine[] | null; plain: string | null } | null; loading: boolean } {
  const [state, setState] = useState<{ data: { synced: LyricLine[] | null; plain: string | null } | null; loading: boolean }>({
    data: null,
    loading: false,
  });

  useEffect(() => {
    if (!enabled || !title || title === "Untitled track") {
      setState({ data: null, loading: false });
      return;
    }
    let active = true;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true }));
    void fetchLyrics(title, artist, controller.signal).then((result) => {
      if (!active) return;
      setState({ data: result, loading: false });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, title, artist]);

  return state;
}

export function AudioPlayer(props:Parameters<typeof SingleAudioPlayer>[0]){return props.settings.style==="playlist"?<PlaylistAudioPlayer {...props}/>:<SingleAudioPlayer {...props}/>;}
