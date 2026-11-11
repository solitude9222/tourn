import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatClock } from "../lib/format";
import {
  activeLyricIndex,
  fetchLyrics,
  parseLyricsInput,
  type LyricLine,
} from "../lib/lyrics";
import type { AudioSettings } from "../lib/profileAssets";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "./Icons";
import "../audioPlayer.css";

function LyricsPanel({
  lines,
  activeLine,
  loading,
  plainFallback,
  hint,
}: {
  lines: LyricLine[];
  activeLine: number;
  loading: boolean;
  plainFallback: string | null;
  hint: string;
}) {
  if (lines.length) {
    // A fixed 5-line window whose middle row is the active line. The track
    // physically slides by whole rows (transform transition) so the lyrics
    // follow the song instead of jumping. The shift is clamped at both ends:
    // the first lines start at the top rather than leaving blank rows, and the
    // track never scrolls past the last line.
    const visible = lines.slice(0, 160);
    const rows = 5;
    const middle = Math.floor(rows / 2);
    const offset = Math.max(0, activeLine);
    const shift = Math.min(0, Math.max(middle - offset, middle - (visible.length - 1)));
    return (
      <div className="ap-lyrics" aria-live="polite">
        <div
          className="ap-lyrics-track"
          style={{ transform: `translateY(calc(var(--ap-lyric-h) * ${shift}))` }}
        >
          {visible.map((line, index) => (
            <p key={index} className={index === activeLine ? "ap-lyric-current" : "ap-lyric-dim"}>
              {line.text || "\u00A0"}
            </p>
          ))}
        </div>
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
}

/**
 * The owner's uploaded track, in one of four styles. Playback is a native
 * <audio> element this component fully controls — real play/pause/seek/skip,
 * no third-party embed, no external script, nothing that can fail to load.
 * Lyrics come from the owner first (pasted or uploaded LRC/plain text) and
 * optionally fall back to a synced lookup for the Lyrics style.
 */
export function AudioPlayer({
  settings,
  enabled = true,
}: {
  settings: AudioSettings;
  /** False while the entry screen covers the page — the track starts after it. */
  enabled?: boolean;
}) {
  const title = settings.title.trim() || "Untitled track";
  const artist = settings.artist.trim();
  const cover = settings.coverUrl.trim() || null;
  const hasTrack = Boolean(settings.fileUrl);

  const cardStyle = {
    "--ap-opacity": settings.cardOpacity,
    "--ap-accent": settings.accentColor,
    // The player always spans the card at full size; only the compact layout
    // changes its shape.
    "--ap-scale": "1",
  } as CSSProperties;

  // ── native <audio> playback ──────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(settings.volume);
  const [muted, setMuted] = useState(settings.startMuted);
  useEffect(() => { setVolume(settings.volume); }, [settings.volume]);
  useEffect(() => { setMuted(settings.startMuted); }, [settings.startMuted]);
  useEffect(() => { const el = audioRef.current; if (el) { el.volume = volume; el.muted = muted; el.playbackRate = settings.playbackRate; } }, [volume, muted, settings.playbackRate, settings.fileUrl, settings.style]);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const pillViewport = useRef<HTMLSpanElement>(null);
  const pillText = useRef<HTMLSpanElement>(null);
  const [pillOverflow, setPillOverflow] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [settings.fileUrl]);

  // Measure the pill's title strip after layout and fonts settle. The shift
  // and duration are CSS variables, so the back-and-forth marquee runs on the
  // compositor instead of updating React on every frame.
  useEffect(() => {
    if (settings.style !== "pill") return;
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
  }, [settings.style, settings.fileUrl, title, artist, hasTrack]);

  // Autoplay is held while the entry screen is up: the song starts when the
  // visitor actually enters, not while the intro is still covering the page.
  // If the browser blocks it, it replays on the next click or keypress.
  const retryCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !settings.fileUrl || !settings.autoplay) return;

    if (!enabled) {
      el.pause();
      if (el.currentTime !== 0) el.currentTime = 0;
      return;
    }

    let cancelled = false;

    const armRetry = () => {
      const retry = () => {
        cleanup();
        if (!cancelled) void el.play().catch(() => undefined);
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
      if (!cancelled) armRetry();
    });

    return () => {
      cancelled = true;
      retryCleanup.current?.();
    };
  }, [settings.fileUrl, settings.autoplay, enabled]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  // `timeupdate` only fires about four times a second, which makes the lyric
  // track visibly lag a fast line. While the track plays, read the real clock
  // on an animation frame (throttled) so the highlight and the scroll land on
  // the line the moment it is sung.
  useEffect(() => {
    if (!playing) return;
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
  }, [playing]);

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

  if (settings.style === "none" || !hasTrack) return null;

  const audioEl = (
    <audio
      ref={audioRef}
      src={settings.fileUrl}
      preload="metadata"
      loop={settings.loop}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime || 0)}
      style={{ display: "none" }}
    />
  );

  const coverNode = cover ? (
    <img src={cover} alt="" draggable={false} />
  ) : (
    <span className="ap-cover-fallback" aria-hidden="true">
      <PlayIcon size={13} />
    </span>
  );

  if (settings.style === "popup") {
    return <div className="ap-popup" style={{ "--popup-size": `${settings.popupSize}px`, "--popup-color": settings.popupColor, "--popup-background": settings.popupBackground, "--popup-opacity": settings.cardOpacity, "--popup-bar-width": `${settings.popupBarWidth}px`, "--popup-duration": `${settings.popupDuration}ms`, "--popup-volume": `${volume * 100}%` } as CSSProperties}>
      {audioEl}
      <button className="ap-popup-icon" type="button" aria-label={!playing ? "Play music" : muted ? "Unmute music" : "Mute music"} onClick={() => { if (!playing) togglePlay(); else setMuted(!muted); }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2.5" /><ellipse cx="17" cy="16" rx="3" ry="2.5" />{muted || volume === 0 ? <path d="M3 3l18 18" /> : null}</svg>
      </button>
      <div className="ap-popup-reveal"><div className="ap-popup-volume"><input aria-label="Music volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => { setVolume(Number(event.target.value)); if (Number(event.target.value) > 0) setMuted(false); }} /></div></div>
    </div>;
  }

  if (settings.style === "pill") {
    const durationSeconds = Math.min(26, Math.max(8, pillOverflow / 16));
    const pillStyle = {
      "--ap-pill-end": `-${pillOverflow}px`,
      "--ap-pill-duration": `${durationSeconds.toFixed(1)}s`,
    } as CSSProperties;

    return (
      <div
        className={`ap ap--pill${playing ? " is-playing" : ""}${pillOverflow ? " is-scrolling" : ""}`}
        style={cardStyle}
      >
        {audioEl}
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
    <div className={`ap ap--${settings.style}`} style={cardStyle}>
      {audioEl}
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
          <button type="button" className="ap-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
          </button>
          <button type="button" className="ap-skip" onClick={() => skip(10)} aria-label="Forward 10 seconds">
            <SkipForwardIcon size={13} />
          </button>
        </div>
      </div>

      {settings.style === "lyrics" ? (
        <LyricsPanel
          lines={syncedLines}
          activeLine={activeLine}
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
