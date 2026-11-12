/* ---------------------------------------------------------------------------
   Synced lyrics via lrclib.net — a free, open, CORS-enabled lyrics database
   that needs no API key. Used by the "Lyrics" audio player style to show
   lines that follow playback automatically.
   --------------------------------------------------------------------------- */

export type LyricLine = { time: number; text: string };

export type LyricsResult = {
  synced: LyricLine[] | null;
  plain: string | null;
};

const LRC_LINE = /\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/** Parses LRC text (`[mm:ss.xx] line`) into timed lines. Returns [] when the
 *  text has no timestamps, so callers can fall back to plain rendering. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const matches = [...raw.matchAll(LRC_LINE)];
    if (!matches.length) continue;
    const text = raw.replace(LRC_LINE, "").trim();
    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = Number((match[3] ?? "0").padEnd(3, "0")) / 1000;
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }
  return lines.filter((line) => line.text).sort((a, b) => a.time - b.time);
}

/** Looks up synced (LRC) or plain lyrics for a track. Returns nulls — never
 *  throws — so a missing or unreachable lyrics service degrades quietly. */
type LrcLibRecord = { syncedLyrics?: string | null; plainLyrics?: string | null };

async function searchLrcLib(params: URLSearchParams, signal?: AbortSignal): Promise<LrcLibRecord[]> {
  // No custom headers here on purpose: a non-"simple" header like a custom
  // User-Agent forces a CORS preflight, and if that preflight ever fails
  // (flaky host, strict proxy) the real request never goes out at all.
  // Plain GETs are never preflighted.
  const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, { signal });
  if (!res.ok) return [];
  return (await res.json()) as LrcLibRecord[];
}

/** Looks up synced (LRC) or plain lyrics for a track. Returns nulls — never
 *  throws — so a missing or unreachable lyrics service degrades quietly. */
export async function fetchLyrics(
  trackName: string,
  artistName: string,
  signal?: AbortSignal,
): Promise<LyricsResult> {
  const title = trackName.trim();
  if (!title) return { synced: null, plain: null };

  try {
    const structured = new URLSearchParams({ track_name: title });
    if (artistName.trim()) structured.set("artist_name", artistName.trim());
    let results = await searchLrcLib(structured, signal);

    // Structured search found nothing — try once more with a loose keyword
    // search, which sometimes matches where the strict title/artist pair
    // doesn't (slightly different punctuation, "feat." credits, etc).
    if (!results.length) {
      const loose = new URLSearchParams({ q: artistName.trim() ? `${title} ${artistName.trim()}` : title });
      results = await searchLrcLib(loose, signal);
    }

    const best = results.find((item) => item.syncedLyrics) ?? results[0];
    if (!best) return { synced: null, plain: null };
    return {
      synced: best.syncedLyrics ? parseLrc(best.syncedLyrics) : null,
      plain: best.plainLyrics ?? null,
    };
  } catch {
    return { synced: null, plain: null };
  }
}

/** Index of the lyric line active at `position` seconds, or -1 before the
 *  first line. */
export function activeLyricIndex(lines: LyricLine[], position: number): number {
  let index = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].time <= position) index = i;
    else break;
  }
  return index;
}

/** Splits user-supplied lyrics into synced/plain form: LRC timestamps make it
 *  synced, anything else renders as plain lines. */
export function parseLyricsInput(text: string): LyricsResult {
  const trimmed = text.trim();
  if (!trimmed) return { synced: null, plain: null };
  const synced = parseLrc(trimmed);
  if (synced.length) return { synced, plain: null };
  return { synced: null, plain: trimmed };
}
