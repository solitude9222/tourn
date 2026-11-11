/* ---------------------------------------------------------------------------
   Home page hero preview.

   The card has to be there on the very first frame, before any request lands,
   so the build writes a snapshot of real published profiles into
   src/generated/homePreview.json. This module reads that snapshot (or this
   browser's newer copy) synchronously, then refreshes it quietly.

   Modes:
     off    — no featured profile, the generic card is shown
     koni   — always the published /koni profile
     random — one of /koni or the three most viewed pages, per page load
   --------------------------------------------------------------------------- */

import snapshot from "../generated/homePreview.json";
import { api } from "./backend";
import { normalizeDocument, type ProfilePayload } from "./serverProfile";

export type HomePreviewMode = "off" | "koni" | "random";

export type HomePreviewPool = {
  mode: HomePreviewMode;
  profiles: ProfilePayload[];
  topHandles: string[];
};

export const HOME_PREVIEW_MODE_KEY = "tourn.lol/home-preview-mode/v1";
/** v2: the old cache could hold a koni-only pool that made random impossible. */
const CACHE_KEY = "tourn.lol/home-preview-pool/v2";

const MODES: HomePreviewMode[] = ["off", "koni", "random"];
/** One roll per page load, so every remount keeps the same featured profile. */
const roll = Math.random();

function readMode(value: unknown, fallback: HomePreviewMode): HomePreviewMode {
  // "top3" was the name of this setting before /koni joined the random pool.
  if (value === "top3") return "random";
  return MODES.includes(value as HomePreviewMode) ? (value as HomePreviewMode) : fallback;
}

function normalizePool(raw: unknown, fallbackMode: HomePreviewMode = "random"): HomePreviewPool {
  const value = (raw ?? {}) as Partial<HomePreviewPool>;
  const profiles = (Array.isArray(value.profiles) ? value.profiles : [])
    .filter((row) => row?.account?.username && row.profile)
    .map((row) => ({ ...row, profile: normalizeDocument(row.profile,row.autoBadges) }));
  const topHandles = Array.isArray(value.topHandles)
    ? value.topHandles.filter((handle): handle is string => typeof handle === "string" && Boolean(handle))
    : [];
  return { mode: readMode(value.mode, fallbackMode), profiles, topHandles };
}

/** Prefer the newer copy of a handle, but never drop one the snapshot carries. */
function mergePools(base: HomePreviewPool, next: HomePreviewPool): HomePreviewPool {
  const profiles = [...next.profiles];
  for (const row of base.profiles) {
    if (!profiles.some((entry) => entry.account.username.toLowerCase() === row.account.username.toLowerCase())) {
      profiles.push(row);
    }
  }
  return {
    mode: next.mode,
    profiles,
    topHandles: next.topHandles.length ? next.topHandles : base.topHandles,
  };
}

function storedMode(): HomePreviewMode | null {
  try {
    const value = localStorage.getItem(HOME_PREVIEW_MODE_KEY);
    return value === null ? null : readMode(value, "random");
  } catch {
    return null;
  }
}

/** Synchronous pool for the first paint: bundled snapshot plus the last copy. */
export function initialHomePreviews(): HomePreviewPool {
  const bundled = normalizePool(snapshot);
  let pool = bundled;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) pool = mergePools(bundled, normalizePool(JSON.parse(cached)));
  } catch {
    /* the bundled snapshot is enough */
  }
  const mode = storedMode();
  return mode ? { ...pool, mode } : pool;
}

export function chooseHomePreview(pool: HomePreviewPool): ProfilePayload | null {
  if (pool.mode === "off" || pool.profiles.length === 0) return null;

  const byHandle = (handle: string) =>
    pool.profiles.find((row) => row.account.username.toLowerCase() === handle.toLowerCase());
  const koni = byHandle("koni");
  if (pool.mode === "koni") return koni ?? pool.profiles[0];

  // /koni plus the top three, de-duplicated, so the random pool never shrinks
  // just because koni is (or is not) one of the most viewed pages.
  const handles = [...new Set(["koni", ...pool.topHandles])].slice(0, 4);
  const candidates = handles.map(byHandle).filter((row): row is ProfilePayload => Boolean(row));
  const randomPool = candidates.length ? candidates : pool.profiles;
  return randomPool[Math.min(randomPool.length - 1, Math.floor(roll * randomPool.length))];
}

export async function refreshHomePreviews(): Promise<HomePreviewPool | null> {
  const result = await api<HomePreviewPool>("/api/home-preview");
  if (!result.ok || !Array.isArray(result.data.profiles)) return null;
  const pool = normalizePool(result.data, "random");
  try {
    localStorage.setItem(HOME_PREVIEW_MODE_KEY, pool.mode);
    const encoded = JSON.stringify(pool);
    if (encoded.length < 1_000_000) localStorage.setItem(CACHE_KEY, encoded);
  } catch {
    /* the bundled snapshot remains available */
  }
  return pool;
}
