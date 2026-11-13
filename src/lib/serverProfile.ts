import {readDurableDraft,writeDurableDraft} from "./draftStorage";
/* ---------------------------------------------------------------------------
   Public profile documents.

   The dashboard edits four stores (about, widgets, badges, links). They are
   saved to the backend so tourn.lol/<handle> renders the same page for every
   visitor — not just the browser that created it. Local storage stays as the
   offline copy the dashboard reads instantly.
   --------------------------------------------------------------------------- */

import type { Account } from "./auth";
import { api } from "./backend";
import { IS_SWATS_HOST } from "./swats";
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

export const PROFILE_SECTIONS = ["about", "widgets", "badges", "links"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export type ProfilePayload = {
  account: Account;
  profile: ProfileDocument | null;
  /** Badge ids the backend has verified for this account. `null` when the
   *  payload doesn't say — treated as "unknown", never as "none earned". */
  earned: string[] | null;
  autoBadges?: string[];
  /** Monotonic server revision, used to reject stale whole-profile saves. */
  revision?: number | null;
  updatedAt?: string | null;
};

export function normalizeDocument(input: unknown, autoBadges?: string[]): ProfileDocument {
  const raw = (input ?? {}) as Partial<ProfileDocument>;
  const badges=normalizeBadgeStore(raw.badges);
  if(Array.isArray(autoBadges)){badges.equipped=badges.equipped.filter(badge=>!badge.automatic || autoBadges.includes(badge.id));for(const id of autoBadges)if(!badges.equipped.some(badge=>badge.id===id))badges.equipped.push({id,visible:true,automatic:true});}
  return {
    about: normalizeAbout(raw.about),
    widgets: normalizeWidgetStore(raw.widgets),
    badges,
    links: normalizeLinkStore(raw.links),
  };
}

function withDocument(payload: Omit<ProfilePayload, "profile"> & { profile: unknown }): ProfilePayload {
  const revision = Number(payload.revision);
  return {
    account: payload.account,
    earned: Array.isArray(payload.earned)
      ? payload.earned.filter((id): id is string => typeof id === "string")
      : null,
    profile: payload.profile ? normalizeDocument(payload.profile,payload.autoBadges) : null,
    autoBadges: payload.autoBadges,
    revision: Number.isFinite(revision) ? revision : null,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
  };
}

/* ---------------------------------------------------------------------------
   Public profile reads.

   A profile must always render the newest published document. A hover/tap can
   still warm the request, and the page reuses that exact in-flight promise,
   but no older localStorage copy is ever painted as current.
   --------------------------------------------------------------------------- */

type PublicProfileResult =
  | { ok: true; data: ProfilePayload }
  | { ok: false; notFound: boolean; error: string };

const inflight = new Map<string, Promise<PublicProfileResult>>();

/** Warm a profile before the visitor commits to the link. Failures stay silent. */
export function preloadProfile(handle: string): void {
  const key = handle.trim().toLowerCase();
  if (!key || inflight.has(key)) return;
  void fetchPublicProfile(key).catch(() => undefined);
}

/** The public page behind tourn.lol/<handle>. */
export async function fetchPublicProfile(handle: string): Promise<PublicProfileResult> {
  const key = handle.trim().toLowerCase();
  const pending = inflight.get(key);
  if (pending) return pending;
  const request = (async (): Promise<PublicProfileResult> => {
    const suffix = IS_SWATS_HOST ? "?site=swats" : "";
    const result = await api<ProfilePayload>(`/api/profile/${encodeURIComponent(handle)}${suffix}`);
    if (!result.ok) {
      return { ok: false, notFound: result.status === 404, error: result.error };
    }
    return { ok: true, data: withDocument(result.data) };
  })();
  inflight.set(key, request);
  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}

/** The signed-in account's own document — hydrates a new device. */
export async function fetchOwnProfile(): Promise<
  { ok: true; data: ProfilePayload } | { ok: false; error: string }
> {
  const result = await api<ProfilePayload>("/api/profile");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: withDocument(result.data) };
}

export type ProfileSaveResult =
  | { ok: true; revision: number | null; updatedAt: string | null }
  | {
      ok: false;
      error: string;
      status: number;
      revision?: number | null;
      profile?: ProfileDocument | null;
    };

let publishQueue: Promise<unknown> = Promise.resolve();
export function saveProfile(
  document: Partial<ProfileDocument>,
  accountId: string,
  isCurrent: () => boolean = () => true,
  baseRevision: number | null = null,
  sections: readonly ProfileSection[] = PROFILE_SECTIONS,
): Promise<ProfileSaveResult> {
  const body = JSON.stringify({ data: document, accountId, baseRevision, sections });
  const publish = async (): Promise<ProfileSaveResult> => {
    if (!isCurrent()) return { ok: false, error: "Superseded by a newer edit.", status: 0 };
    const result = await api<{
      ok?: boolean;
      revision?: number;
      updatedAt?: string;
      profile?: unknown;
    }>("/api/profile", { method: "PUT", body });
    if (result.ok) {
      return {
        ok: true,
        revision: Number.isFinite(Number(result.data.revision)) ? Number(result.data.revision) : null,
        updatedAt: typeof result.data.updatedAt === "string" ? result.data.updatedAt : null,
      };
    }
    const conflict = result.data;
    return {
      ok: false,
      error: result.error,
      status: result.status,
      revision: Number.isFinite(Number(conflict?.revision)) ? Number(conflict?.revision) : null,
      profile: conflict?.profile ? normalizeDocument(conflict.profile) : null,
    };
  };
  const result = publishQueue.then(publish, publish);
  publishQueue = result;
  return result;
}

/* ---------------------------------------------------------------------------
   Unsaved work.

   A publish can fail for reasons the page cannot see — an expired session, a
   document over the backend's size limit, a dropped connection — and a publish
   that fails silently used to be lost on the next refresh, because the server
   copy then overwrote the local one. An unpublished document is now kept next
   to the local stores and republished on the next visit.
   --------------------------------------------------------------------------- */

const PENDING_PREFIX = "tourn.lol/pending-profile/v1/";

export type PendingDocument = {
  document: ProfileDocument;
  baseDocument: ProfileDocument | null;
  /** The server revision the unsaved draft was based on. A draft based on an
   *  older revision must never be replayed over a newer published document. */
  baseRevision: number | null;
  savedAt: number;
};

export function savePendingDocument(
  userId: string,
  document: ProfileDocument,
  baseRevision: number | null = null,
  baseDocument: ProfileDocument | null = null,
): void {
  const pending={document,baseRevision,baseDocument,savedAt:Date.now()} satisfies PendingDocument;
  void writeDurableDraft(userId,pending);
  try {
    localStorage.setItem(
      PENDING_PREFIX + userId,
      JSON.stringify(pending),
    );
  } catch {
    /* private mode / quota — the local stores still have the edit */
  }
}

export function loadPendingDocument(userId: string): PendingDocument | null {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingDocument> & Record<string, unknown>;
    if (parsed.document && typeof parsed.document === "object") {
      return {
        document: normalizeDocument(parsed.document),
        baseDocument: parsed.baseDocument ? normalizeDocument(parsed.baseDocument) : null,
        baseRevision: parsed.baseRevision != null && Number.isFinite(Number(parsed.baseRevision)) ? Number(parsed.baseRevision) : null,
        savedAt: Number(parsed.savedAt) || 0,
      };
    }
    // Older builds stored the document directly. It has no revision, so the
    // hydration path only replays it when the server still has no revision.
    return { document: normalizeDocument(parsed), baseDocument: null, baseRevision: null, savedAt: 0 };
  } catch {
    return null;
  }
}

export async function loadPendingDocumentDurable(userId:string):Promise<PendingDocument|null>{
 const local=loadPendingDocument(userId);const durable=await readDurableDraft<PendingDocument>(userId);
 if(!durable?.document)return local;
 const newest=!local||durable.savedAt>local.savedAt?durable:local;
 return {...newest,document:normalizeDocument(newest.document),baseDocument:newest.baseDocument?normalizeDocument(newest.baseDocument):null};
}
export function clearPendingDocument(userId: string): void {
  void writeDurableDraft(userId,null);
  try {
    localStorage.removeItem(PENDING_PREFIX + userId);
  } catch {
    /* ignore */
  }
}

/** Rebase only locally changed fields; ID-keyed lists retain additions from both devices. */
export function mergeProfileDraft(server: ProfileDocument, local: ProfileDocument, base: ProfileDocument): ProfileDocument {
 server=normalizeDocument(server);local=normalizeDocument(local);base=normalizeDocument(base);
 const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
 const merge=(remote:any,draft:any,before:any):any=>{
  if(same(draft,before))return remote;
  if(Array.isArray(draft) && Array.isArray(before) && [...draft,...before].every(item=>item && typeof item.id==='string')) {
   const current=Array.isArray(remote)?remote:[];const old=new Map(before.map(item=>[item.id,item]));const changed=new Map(draft.map(item=>[item.id,item]));const received=new Map(current.map(item=>[item.id,item]));
   return [...draft.map(item=>merge(received.get(item.id),item,old.get(item.id))),...current.filter(item=>!changed.has(item.id)&&!old.has(item.id))].filter(Boolean);
  }
  if(remote===undefined)return draft;
  if(draft && before && typeof draft==='object' && typeof before==='object' && !Array.isArray(draft) && !Array.isArray(before)) {
   const out={...(remote||{})};for(const key of new Set([...Object.keys(before),...Object.keys(draft)])){if(!(key in draft))delete out[key];else out[key]=merge(remote?.[key],draft[key],before[key]);}return out;
  }
  return draft;
 };
 return normalizeDocument(merge(server,local,base));
}

export function canonicalJson(value: unknown): string {
 return JSON.stringify(value,(_key,item)=>item && typeof item==='object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item);
}
export function profileFingerprint(document: ProfileDocument): string { return canonicalJson(normalizeDocument(document)); }
