import type { Activity, LanyardUser } from "./api";

export function avatarUrl(user: Pick<LanyardUser, "id" | "avatar">, size = 128): string {
  if (!user.avatar) {
    const index = Number((BigInt(user.id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const extension = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
}

export function decorationUrl(asset: string): string {
  return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=96`;
}

/** Discord snowflake IDs embed their creation timestamp. */
export function snowflakeDate(id: string): Date | null {
  try {
    const millis = Number(BigInt(id) >> 22n) + 1420070400000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function formatJoined(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Reads the join date the API sends. Postgres emits `2025-01-15 12:00:00+00`
 * for a timestamptz, and that space-separated form is not ISO 8601 — Safari
 * returns an invalid date for it, which made the card print a broken date.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  let text = value.trim();
  if (!text) return null;
  if (text.includes(" ")) text = text.replace(" ", "T");
  // `+00` is not a valid ISO offset — Postgres omits the minutes.
  if (/[+-]\d{2}$/.test(text)) text += ":00";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Join date in the format chosen in Customize › Profile. */
export function formatJoinDate(
  value: Date | string | null | undefined,
  format: "relative" | "us" | "eu" = "relative",
): string {
  const date = parseDate(value);
  if (!date) return "";
  if (format === "relative") {
    // Calendar-accurate from the first day: "just now" used to swallow the
    // whole first month, so a three-day-old account read as if it had just
    // signed up and a year was rounded up with Math.round.
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30.4375);
    if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return format === "us" ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

/** "1,204" below 10k, "12.4K" / "3.1M" above it — for stats where a long
 *  exact number would just add noise (site-wide totals, view counts). */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value < 10_000) return Math.round(value).toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatClock(millis: number): string {
  if (!Number.isFinite(millis) || millis < 0) millis = 0;
  const total = Math.floor(millis / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function customStatus(activities: Activity[]): string | null {
  const custom = activities.find((activity) => activity.type === 4);
  if (!custom) return null;
  const emoji = custom.emoji?.name ?? "";
  const text = custom.state ?? "";
  const combined = `${emoji} ${text}`.trim();
  return combined.length > 0 ? combined : null;
}

export function currentGame(activities: Activity[]): Activity | null {
  return (
    activities.find((activity) => activity.type === 0 && Boolean(activity.name)) ??
    activities.find((activity) => activity.type !== 4 && Boolean(activity.name)) ??
    null
  );
}

export function activityArt(activity: Activity | null): string | null {
  const image = activity?.assets?.large_image;
  if (!image) return null;
  if (image.startsWith("mp:external/")) {
    return `https://media.discordapp.net/${image.replace("mp:", "")}`;
  }
  if (activity?.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }
  return null;
}

export function minutesAgo(from: number, now: number): string {
  const diff = Math.max(0, now - from);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function trackProgress(start: number, end: number, now: number): number {
  const total = end - start;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (now - start) / total));
}
