import { useEffect, useState } from "react";

/** A custom emoji from the Discord server the bot lives in. */
export type GuildEmoji = { id: string; name: string; animated: boolean; url: string };

let cache: GuildEmoji[] | null = null;
let pending: Promise<GuildEmoji[]> | null = null;

function clean(list: unknown): GuildEmoji[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is GuildEmoji => Boolean(item && typeof item.name === "string" && typeof item.url === "string"))
    .map((item) => ({ id: String(item.id ?? item.name), name: item.name, animated: Boolean(item.animated), url: item.url }));
}

/** Fetched once per page load; the picker and the renderer share it. */
export function loadGuildEmojis(): Promise<GuildEmoji[]> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = fetch("/api/discord/emojis", { headers: { accept: "application/json" } })
    .then((response) => (response.ok ? response.json() : { emojis: [] }))
    .then((body: { emojis?: unknown }) => {
      cache = clean(body?.emojis);
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useGuildEmojis(): GuildEmoji[] {
  const [list, setList] = useState<GuildEmoji[]>(() => cache ?? []);
  useEffect(() => {
    if (cache) {
      setList(cache);
      return;
    }
    let alive = true;
    void loadGuildEmojis().then((items) => {
      if (alive) setList(items);
    });
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

export function emojiIndex(list: GuildEmoji[]): Map<string, GuildEmoji> {
  return new Map(list.map((item) => [item.name.toLowerCase(), item]));
}
