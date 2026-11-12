import { WidgetError } from "./api";

export type SteamProfile = {
  url: string;
  steamId64: string | null;
  username: string;
  avatar: string | null;
  online: boolean | null;
  stateLabel: string;
  memberSince: string | null;
  summary: string | null;
  customUrl: string | null;
  source: "xml" | "meta";
};

export type SteamTarget = { profileUrl: string; xmlUrl: string };

/** Accepts a full Steam URL, a bare profile URL, or an id/custom-name path. */
export function steamProfileTarget(input: string): SteamTarget | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalized = raw.startsWith("http") ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (!/(^|\.)steamcommunity\.com$/i.test(url.hostname)) return null;

  const match = url.pathname.match(/^\/(id|profiles)\/([^/]+)/i);
  if (!match) return null;

  const profileUrl = `https://steamcommunity.com/${match[1].toLowerCase()}/${match[2]}/`;
  return { profileUrl, xmlUrl: `${profileUrl}?xml=1` };
}

function text(doc: Document, tag: string): string {
  return doc.querySelector(tag)?.textContent?.trim() ?? "";
}

function parseSteamXml(xml: string, fallbackUrl: string): SteamProfile | null {
  if (!xml.includes("<profile")) return null;

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) return null;

  const username = text(doc, "steamID");
  if (!username) return null;

  const steamId64 = text(doc, "steamID64") || null;
  const customUrl = text(doc, "customURL") || null;
  const onlineState = text(doc, "onlineState");
  const summary = text(doc, "summary") || null;
  const fallbackProfile = steamId64 ? `https://steamcommunity.com/profiles/${steamId64}/` : fallbackUrl;

  return {
    url: customUrl ? `https://steamcommunity.com/id/${customUrl}/` : fallbackProfile,
    steamId64,
    username,
    avatar: text(doc, "avatarFull") || text(doc, "avatarMedium") || null,
    online: onlineState === "online" ? true : onlineState === "offline" ? false : null,
    stateLabel: text(doc, "stateMessage") || (onlineState === "online" ? "Online" : "Offline"),
    memberSince: text(doc, "memberSince") || null,
    summary,
    customUrl,
    source: "xml",
  };
}

async function fetchXml(xmlUrl: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`/api/steam-profile?url=${encodeURIComponent(xmlUrl)}`, {
    signal,
    headers: { Accept: "text/xml, application/xml" },
  });
  if (!res.ok) throw new WidgetError("http", `Steam proxy responded ${res.status}`);
  const body = await res.text();
  if (!body.includes("<profile")) throw new WidgetError("http", "Steam returned an empty profile");
  return body;
}

type MicrolinkResponse = {
  data?: {
    title?: string;
    image?: { url?: string };
    description?: string;
  };
};

async function fetchMeta(profileUrl: string, signal: AbortSignal): Promise<SteamProfile> {
  const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(profileUrl)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new WidgetError("http", `Steam metadata responded ${res.status}`);
  const body = (await res.json()) as MicrolinkResponse;
  const title = body.data?.title?.replace(/^Steam Community\s*::\s*/i, "").trim();
  if (!title) throw new WidgetError("not_found", "Couldn't read this Steam profile");

  return {
    url: profileUrl,
    steamId64: null,
    username: title,
    avatar: body.data?.image?.url ?? null,
    online: null,
    stateLabel: "Steam profile",
    memberSince: null,
    summary: body.data?.description ?? null,
    customUrl: null,
    source: "meta",
  };
}

/**
 * Reads the public Steam profile. The XML endpoint has no CORS headers, so the
 * Vite server proxies it in development and `vite preview`. When that route is
 * not available (a static production host), we fall back to Microlink's public
 * metadata API, which still gives the real avatar and persona name.
 */
export async function fetchSteamProfile(input: string, signal: AbortSignal): Promise<SteamProfile> {
  const target = steamProfileTarget(input);
  if (!target) {
    throw new WidgetError("invalid", "That doesn't look like a Steam profile URL");
  }

  try {
    const xml = await fetchXml(target.xmlUrl, signal);
    const parsed = parseSteamXml(xml, target.profileUrl);
    if (parsed) return parsed;
  } catch (error) {
    if (signal.aborted) throw error;
  }

  try {
    return await fetchMeta(target.profileUrl, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    throw new WidgetError("network", "Steam didn't answer for this profile");
  }
}
