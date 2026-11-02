/* ---------------------------------------------------------------------------
   Public profile documents.

   The dashboard edits four stores (about, widgets, badges, links). They are
   saved to the backend so tourn.lol/<handle> renders the same page for every
   visitor — not just the browser that created it. Local storage stays as the
   offline copy the dashboard reads instantly.
   --------------------------------------------------------------------------- */

import type { Account } from "./auth";
import { api } from "./backend";
import { normalizeAbout, type About } from "./about";
import { normalizeWidgetStore, type WidgetStore } from "./widgets";
import { normalizeBadgeStore, type BadgeStore } from "./badges";
import { normalizeLinkStore, type LinkStore } from "./links";

export type ProfileDocument = {
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
};

export type ProfilePayload = {
  account: Account;
  profile: ProfileDocument | null;
  /** Badge ids the backend has verified for this account. */
  earned: string[];
};

export function normalizeDocument(input: unknown): ProfileDocument {
  const raw = (input ?? {}) as Partial<ProfileDocument>;
  return {
    about: normalizeAbout(raw.about),
    widgets: normalizeWidgetStore(raw.widgets),
    badges: normalizeBadgeStore(raw.badges),
    links: normalizeLinkStore(raw.links),
  };
}

function withDocument(payload: Omit<ProfilePayload, "profile"> & { profile: unknown }): ProfilePayload {
  return {
    account: payload.account,
    earned: Array.isArray(payload.earned)
      ? payload.earned.filter((id): id is string => typeof id === "string")
      : [],
    profile: payload.profile ? normalizeDocument(payload.profile) : null,
  };
}

/** The public page behind tourn.lol/<handle>. */
export async function fetchPublicProfile(
  handle: string,
): Promise<{ ok: true; data: ProfilePayload } | { ok: false; notFound: boolean; error: string }> {
  const result = await api<ProfilePayload>(`/api/profile/${encodeURIComponent(handle)}`);
  if (!result.ok) {
    return { ok: false, notFound: result.status === 404, error: result.error };
  }
  return { ok: true, data: withDocument(result.data) };
}

/** The signed-in account's own document — hydrates a new device. */
export async function fetchOwnProfile(): Promise<
  { ok: true; data: ProfilePayload } | { ok: false; error: string }
> {
  const result = await api<ProfilePayload>("/api/profile");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: withDocument(result.data) };
}

export async function saveProfile(document: ProfileDocument): Promise<{ ok: boolean; error?: string }> {
  const result = await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ data: document }),
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
