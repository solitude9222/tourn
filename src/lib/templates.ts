/* ---------------------------------------------------------------------------
   templates — a look you can hand to someone else.

   A template is a snapshot of the parts of a profile that are design rather
   than identity: the card, the colours, the effects, the link row styling, the
   widget stack and the badge styling. Names, bios, handles and uploads never
   travel with it.

   Sharing is a portable code (`TRN1.` + base64url JSON) so it works without a
   server to host it: paste the code into another account and the look imports.
   Free accounts can keep two shared looks, premium ten.

   Premium-only pieces of a template (animated effects, the audio player, the
   glowing link row) are stripped for free accounts, so applying someone else's
   premium look never unlocks it.
   --------------------------------------------------------------------------- */

import {
  DEFAULT_ABOUT_DESIGN,
  normalizeAbout,
  type About,
  type AboutDesign,
} from "./about";
import {
  DEFAULT_PROFILE_ASSETS,
  loadProfileAssets,
  type CardEffectId,
  type ProfileAssets,
} from "./profileAssets";
import { DEFAULT_LINK_DESIGN, normalizeLinkStore, type LinkStore } from "./links";
import { DEFAULT_WIDGET_DESIGN, normalizeWidgetStore, type WidgetStore } from "./widgets";
import { DEFAULT_BADGE_STYLE, normalizeBadgeStore, type BadgeStore } from "./badges";

export type TemplatePart = "layout" | "colours" | "effects" | "audio" | "links" | "widgets" | "badges";

export type TemplateSnapshot = {
  design: About["design"];
  assets: ProfileAssets;
  links: LinkStore;
  widgets: WidgetStore;
  badges: BadgeStore;
};

export type TemplateShare = {
  id: string;
  name: string;
  note: string;
  createdAt: number;
  code: string;
  parts: TemplatePart[];
  premiumParts: TemplatePart[];
};

export const TEMPLATE_PART_META: { id: TemplatePart; label: string; hint: string }[] = [
  { id: "layout", label: "Card layout", hint: "Size, radius, spacing, font and positions" },
  { id: "colours", label: "Colours", hint: "Palette, border and background tint" },
  { id: "effects", label: "Effects", hint: "Card, background, overlay and text effects" },
  { id: "links", label: "Link row", hint: "Icon size, colour and glow" },
  { id: "widgets", label: "Widgets", hint: "The widget stack and its appearance" },
  { id: "badges", label: "Badges", hint: "Badge row styling" },
  { id: "audio", label: "Audio player", hint: "The track card styling" },
];

export const TEMPLATE_SHARE_LIMITS = { free: 2, premium: 10 } as const;

export function shareLimit(isPremium: boolean): number {
  return isPremium ? TEMPLATE_SHARE_LIMITS.premium : TEMPLATE_SHARE_LIMITS.free;
}

/* ── snapshot from the live dashboard state ─────────────────── */

/**
 * A look never carries uploads: an avatar, banner, cursor, background image or
 * audio file is the person's own file, and embedding a multi-megabyte data URL
 * in a share code would leak it and blow the code size up.
 */
export function withoutUploads(assets: ProfileAssets): ProfileAssets {
  return {
    ...assets,
    avatarUrl: "",
    decoration: { ...assets.decoration },
    cursor: { ...assets.cursor, imageUrl: "" },
    background: { ...assets.background, imageUrl: "" },
    banner: { ...assets.banner, imageUrl: "" },
    audio: { ...assets.audio, fileUrl: "", coverUrl: "" },
  };
}

export function snapshotFrom(
  about: About,
  links: LinkStore,
  widgets: WidgetStore,
  badges: BadgeStore,
): TemplateSnapshot {
  return {
    design: { ...about.design },
    assets: withoutUploads(about.assets),
    links: { links: [...links.links], design: { ...links.design } },
    widgets: { widgets: widgets.widgets.map((item) => ({ ...item })), design: { ...widgets.design } },
    badges: { equipped: [...badges.equipped], style: { ...badges.style } },
  };
}

/* ── what a template carries ────────────────────────────────── */

export function templateParts(snapshot: TemplateSnapshot): TemplatePart[] {
  return TEMPLATE_PART_META.map((part) => part.id).filter((part) => part !== "audio" || snapshot.assets.audio.style !== "none");
}

export function premiumParts(snapshot: TemplateSnapshot): TemplatePart[] {
  const parts: TemplatePart[] = [];
  const effects = snapshot.assets.effects;
  const hasEffect =
    effects.background.id !== "none" ||
    effects.overlay.id !== "none" ||
    Object.values(effects.text).some((entry) => entry.effect !== "none") ||
    snapshot.assets.card.id !== "none";
  if (hasEffect) parts.push("effects");
  if (snapshot.assets.audio.style !== "none") parts.push("audio");
  if (snapshot.links.design.glow) parts.push("links");
  return parts;
}

/** Free accounts get the look without the premium-only pieces. */
export function stripPremium(snapshot: TemplateSnapshot): TemplateSnapshot {
  return {
    ...snapshot,
    assets: {
      ...snapshot.assets,
      card: { ...snapshot.assets.card, id: "none" },
      audio: { ...snapshot.assets.audio, style: "none", fileUrl: "", coverUrl: "" },
      effects: {
        background: { ...snapshot.assets.effects.background, id: "none" },
        overlay: { ...snapshot.assets.effects.overlay, id: "none" },
        text: snapshot.assets.effects.text,
      },
    },
    links: { ...snapshot.links, design: { ...snapshot.links.design, glow: false } },
  };
}

/* ── merge selected parts into the current profile ──────────── */

const LAYOUT_KEYS = [
  "theme",
  "layout",
  "widgetsPosition",
  "audioPosition",
  "cardStyle",
  "font",
  "cardWidth",
  "cardRadius",
  "borderWidth",
  "avatarSize",
  "widgetGap",
  "cardPadding",
  "nameSize",
  "bioSize",
  "tilt",
  "tiltInvert",
  "oneko",
  "avatarX",
  "avatarY",
  "badgeX",
  "badgeY",
  "avatarShape",
  "pfpPosition",
  "badgePosition",
  "namePosition",
  "bioPosition",
  "viewPosition",
  "joinPosition",
  "locationPosition",
  "entry",
  "tooltips",
  "pills",
] as const;

const COLOUR_KEYS = ["colors", "borderOpacity", "backgroundOpacity", "backgroundBlur"] as const;

function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  keys.forEach((key) => {
    out[key] = source[key];
  });
  return out;
}

export function mergeTemplate(
  current: { about: About; links: LinkStore; widgets: WidgetStore; badges: BadgeStore },
  snapshot: TemplateSnapshot,
  parts: TemplatePart[],
  isPremium: boolean,
): { about: About; links: LinkStore; widgets: WidgetStore; badges: BadgeStore; stripped: TemplatePart[] } {
  const blocked = premiumParts(snapshot).filter((part) => parts.includes(part));
  const usable = isPremium ? snapshot : stripPremium(snapshot);
  const chosen = new Set(parts);

  let design = { ...current.about.design };
  let assets = { ...current.about.assets };

  if (chosen.has("layout")) {
    design = { ...design, ...pick(usable.design, LAYOUT_KEYS) };
  }
  if (chosen.has("colours")) {
    design = { ...design, ...pick(usable.design, COLOUR_KEYS) };
  }
  if (chosen.has("effects")) {
    assets = { ...assets, card: usable.assets.card, effects: usable.assets.effects };
  }
  if (chosen.has("audio")) {
    assets = { ...assets, audio: usable.assets.audio };
  }

  const links = chosen.has("links")
    ? { links: current.links.links, design: { ...usable.links.design } }
    : current.links;

  return {
    about: { ...current.about, design, assets },
    links,
    widgets: chosen.has("widgets")
      ? {
          widgets: usable.widgets.widgets.map((item) => ({
            ...item,
            id: `${item.id}-${Math.random().toString(16).slice(2, 8)}`,
          })),
          design: { ...usable.widgets.design },
        }
      : current.widgets,
    badges: chosen.has("badges")
      ? { ...current.badges, style: { ...usable.badges.style } }
      : current.badges,
    stripped: isPremium ? [] : blocked,
  };
}

/* ── portable code ──────────────────────────────────────────── */

const PREFIX = "TRN1.";

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeTemplate(snapshot: TemplateSnapshot, name: string, note = ""): string {
  return (
    PREFIX +
    toBase64Url(
      JSON.stringify({
        v: 1,
        name: name.slice(0, 40),
        note: note.slice(0, 140),
        design: snapshot.design,
        assets: snapshot.assets,
        links: snapshot.links,
        widgets: snapshot.widgets,
        badges: snapshot.badges,
      }),
    )
  );
}

export function decodeTemplate(code: string): TemplateSnapshot | null {
  const trimmed = code.trim();
  if (!trimmed.toUpperCase().startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;
    const about = normalizeAbout({ design: raw.design, assets: raw.assets });
    return {
      design: about.design,
      assets: withoutUploads(loadProfileAssets(raw.assets)),
      links: normalizeLinkStore(raw.links),
      widgets: normalizeWidgetStore(raw.widgets),
      badges: normalizeBadgeStore(raw.badges),
    };
  } catch {
    return null;
  }
}

export function templateNameFrom(code: string): string {
  const trimmed = code.trim();
  if (!trimmed.toUpperCase().startsWith(PREFIX)) return "Shared look";
  try {
    const raw = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))) as { name?: string };
    return typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Shared look";
  } catch {
    return "Shared look";
  }
}

/* ── the owner's shared looks ───────────────────────────────── */

function key(userId: string): string {
  return `tourn.lol/templates/v1/${userId}`;
}

function receivedKey(userId: string): string {
  return `tourn.lol/templates-received/v1/${userId}`;
}

export function loadShares(userId: string): TemplateShare[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { shares?: unknown };
    if (!Array.isArray(parsed.shares)) return [];
    return parsed.shares
      .filter(
        (entry): entry is TemplateShare =>
          Boolean(
            entry &&
              typeof entry === "object" &&
              typeof (entry as TemplateShare).id === "string" &&
              typeof (entry as TemplateShare).code === "string",
          ),
      )
      .map((entry) => ({
        id: entry.id,
        name: String(entry.name ?? "Shared look").slice(0, 40),
        note: String(entry.note ?? "").slice(0, 140),
        createdAt: Number(entry.createdAt) || Date.now(),
        code: entry.code,
        parts: Array.isArray(entry.parts) ? (entry.parts as TemplatePart[]) : [],
        premiumParts: Array.isArray(entry.premiumParts) ? (entry.premiumParts as TemplatePart[]) : [],
      }));
  } catch {
    return [];
  }
}

export function saveShares(userId: string, shares: TemplateShare[]): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify({ shares }));
  } catch {
    /* private mode — the share still works for this session */
  }
}

export function loadReceived(userId: string): TemplateShare[] {
  try {
    const raw = localStorage.getItem(receivedKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { shares?: TemplateShare[] };
    return Array.isArray(parsed.shares) ? parsed.shares : [];
  } catch {
    return [];
  }
}

export function saveReceived(userId: string, shares: TemplateShare[]): void {
  try {
    localStorage.setItem(receivedKey(userId), JSON.stringify({ shares }));
  } catch {
    /* private mode */
  }
}
