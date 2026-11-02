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
    // A fixed 4-line window that physically slides to the active line —
    // transform transition, so it glides instead of jumping.
    const visible = lines.slice(0, 160);
    const offset = Math.max(0, activeLine);
    return (
      <div className="ap-lyrics" aria-live="polite">
        <div
          className="ap-lyrics-track"
          style={{ transform: `translateY(calc(var(--ap-lyric-center) - ${offset} * var(--ap-lyric-h)))` }}
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
export function AudioPlayer({ settings }: { settings: AudioSettings }) {
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
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [settings.fileUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

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

  if (settings.style === "marquee") {
    return (
      <div className="ap ap--marquee" style={cardStyle}>
        {audioEl}
        <button type="button" className="ap-marquee-btn" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <PauseIcon size={11} /> : <PlayIcon size={11} />}
        </button>
        <span className="ap-marquee-track">
          <span className={`ap-marquee-scroll${playing ? "" : " is-paused"}`}>
            {/* 8 identical chunks: the animation shifts exactly half the
                strip (4 chunks), so the loop is perfectly seamless. */}
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="ap-marquee-chunk">
                {artist ? <b>{artist}</b> : null} {title}
              </span>
            ))}
          </span>
        </span>
      </div>
    );
  }

  if (settings.style === "vinyl") {
    return (
      <button type="button" className="ap ap--vinyl" style={cardStyle} onClick={togglePlay}>
        {audioEl}
        <span className={`ap-vinyl-disc${playing ? " is-spinning" : ""}`}>
          <span className="ap-vinyl-label">{coverNode}</span>
        </span>
        <span className="ap-vinyl-copy">
          <b>{title}</b>
          <small>{artist || "Uploaded track"}</small>
        </span>
      </button>
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
