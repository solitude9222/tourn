/* ---------------------------------------------------------------------------
   Real community members for the landing page — the profile-page showcase and
   the people strip. Built from the published-profile snapshot (so the first
   paint has avatars), then refreshed from /api/leaderboard when the backend is
   reachable. The owner account is never part of the showcase.
   --------------------------------------------------------------------------- */

import { api } from "./backend";
import { naturalCompare, numberCompare, sorted } from "./sort";
import { initialHomePreviews, refreshHomePreviews } from "./homePreview";

export type CommunityPerson = {
  handle: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  views: number | null;
  joinedAt: string | null;
};

/** The owner's own page isn't part of the community showcase. */
const HIDDEN = new Set(["trackdown"]);

type BoardRow = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  views: number | null;
};

function fromPool(): CommunityPerson[] {
  return initialHomePreviews().profiles.map((row) => ({
    handle: row.account.username,
    name: row.account.alias || row.account.username,
    avatar: row.account.avatarUrl || null,
    bio: row.profile?.about?.bio?.trim() || null,
    views: null,
    joinedAt: row.account.joinedAt || null,
  }));
}

/** One row per handle; a later, fuller copy fills the gaps of the first. */
function mergePeople(groups: CommunityPerson[][]): CommunityPerson[] {
  const byHandle = new Map<string, CommunityPerson>();
  for (const group of groups) {
    for (const person of group) {
      const key = person.handle.trim().toLowerCase();
      if (!key || HIDDEN.has(key)) continue;
      const existing = byHandle.get(key);
      if (!existing) {
        byHandle.set(key, { ...person });
        continue;
      }
      byHandle.set(key, {
        ...existing,
        name: existing.name || person.name,
        avatar: existing.avatar ?? person.avatar,
        bio: existing.bio ?? person.bio,
        views: existing.views ?? person.views,
        joinedAt: existing.joinedAt ?? person.joinedAt,
      });
    }
  }
  return sorted(
    [...byHandle.values()],
    (a, b) => numberCompare(a.views, b.views, "desc") || naturalCompare(a.handle, b.handle),
  );
}

/** Synchronous copy for the first render, from the bundled snapshot. */
export function initialCommunityPeople(): CommunityPerson[] {
  return mergePeople([fromPool()]);
}

/** Real, current members: leaderboard first, then the featured profiles. */
export async function loadCommunityPeople(): Promise<CommunityPerson[]> {
  const [board, pool] = await Promise.all([
    api<{ profiles: BoardRow[] }>("/api/leaderboard"),
    refreshHomePreviews(),
  ]);

  let leaderboard: CommunityPerson[] = board.ok
    ? board.data.profiles.map((row) => ({
        handle: row.username,
        name: row.displayName || row.username,
        avatar: row.avatarUrl || null,
        bio: null,
        views: Number(row.views) || 0,
        joinedAt: null,
      }))
    : [];

  // Older backend: the leaderboard may be missing, but the claimed handles are
  // still real people, so the showcase and the strip keep filling up.
  if (!leaderboard.length) {
    const listed = await api<{ profiles: { username: string; alias?: string | null; avatarUrl?: string | null }[] }>(
      "/api/profiles?limit=25",
    );
    if (listed.ok) {
      leaderboard = listed.data.profiles.map((row) => ({
        handle: row.username,
        name: row.alias || row.username,
        avatar: row.avatarUrl || null,
        bio: null,
        views: null,
        joinedAt: null,
      }));
    }
  }

  const fresh: CommunityPerson[] = pool
    ? pool.profiles.map((row) => ({
        handle: row.account.username,
        name: row.account.alias || row.account.username,
        avatar: row.account.avatarUrl || null,
        bio: row.profile?.about?.bio?.trim() || null,
        views: null,
        joinedAt: row.account.joinedAt || null,
      }))
    : [];

  return mergePeople([leaderboard, fresh, initialCommunityPeople()]);
}
