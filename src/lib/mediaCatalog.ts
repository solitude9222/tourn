/* Anime and game libraries, backed by public APIs with no key:
   - AniList GraphQL for anime: thousands of real titles, 24 per page.
   - FreeToGame for games: the full free-to-play catalogue (400+ titles).
   Results are cached per page so paging back and forth is instant. */

export type CatalogKind = "anime" | "game";

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  title: string;
  subtitle: string;
  image: string;
  url: string;
  meta: string;
};

export type CatalogPage = {
  items: CatalogItem[];
  hasMore: boolean;
};

type AniListMedia = {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null };
  siteUrl?: string | null;
  format?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  averageScore?: number | null;
  genres?: string[];
};

type AniListResponse = {
  data?: {
    Page?: {
      pageInfo?: { hasNextPage?: boolean };
      media?: AniListMedia[];
    };
  };
  errors?: { message?: string }[];
};

type FreeToGameItem = {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  release_date: string;
};

const animeCache = new Map<string, CatalogPage>();
let gamesCache: CatalogItem[] | null = null;
let gamesPromise: Promise<CatalogItem[]> | null = null;

const ANIME_QUERY = `
  query ($page: Int, $perPage: Int, $search: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: ANIME, sort: POPULARITY_DESC, search: $search, isAdult: false) {
        id
        title { english romaji }
        coverImage { extraLarge large }
        siteUrl
        format
        seasonYear
        episodes
        averageScore
        genres
      }
    }
  }
`;

function animeItem(anime: AniListMedia): CatalogItem {
  const bits = [
    anime.format,
    anime.seasonYear ? String(anime.seasonYear) : "",
    anime.episodes ? `${anime.episodes} eps` : "",
  ].filter(Boolean);
  const genres = (anime.genres ?? []).slice(0, 2).join(" · ");
  return {
    id: `anime-${anime.id}`,
    kind: "anime",
    title: anime.title?.english || anime.title?.romaji || `Anime ${anime.id}`,
    subtitle: bits.join(" · "),
    image: anime.coverImage?.extraLarge || anime.coverImage?.large || "",
    url: anime.siteUrl || `https://anilist.co/anime/${anime.id}`,
    meta: [anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : "", genres]
      .filter(Boolean)
      .join(" · "),
  };
}

export async function loadCatalog(
  kind: CatalogKind,
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<CatalogPage> {
  if (kind === "anime") return loadAnime(query, page, signal);
  return loadGames(query, page, signal);
}

async function loadAnime(query: string, page: number, signal?: AbortSignal): Promise<CatalogPage> {
  const key = `${query.trim().toLowerCase()}|${page}`;
  const cached = animeCache.get(key);
  if (cached) return cached;

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: ANIME_QUERY,
      variables: { page, perPage: 24, search: query.trim() || null },
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "The anime library is busy — try again in a moment."
        : "The anime library could not be reached.",
    );
  }
  const payload = (await response.json()) as AniListResponse;
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "The anime library could not be searched.");
  }
  const result: CatalogPage = {
    items: (payload.data?.Page?.media ?? []).map(animeItem).filter((item) => item.title && item.image),
    hasMore: payload.data?.Page?.pageInfo?.hasNextPage === true,
  };
  animeCache.set(key, result);
  if (animeCache.size > 80) animeCache.clear();
  return result;
}

async function allGames(): Promise<CatalogItem[]> {
  if (gamesCache) return gamesCache;
  if (gamesPromise) return gamesPromise;
  const request = (async () => {
    const response = await fetch("https://www.freetogame.com/api/games");
    if (!response.ok) throw new Error("The game library could not be reached.");
    const payload = (await response.json()) as FreeToGameItem[];
    const items = (Array.isArray(payload) ? payload : []).map((game) => ({
      id: `game-${game.id}`,
      kind: "game" as const,
      title: game.title,
      subtitle: [game.genre, game.platform].filter(Boolean).join(" · "),
      image: game.thumbnail,
      url: game.game_url || `https://www.freetogame.com/g/${game.id}`,
      meta: [game.release_date ? game.release_date.slice(0, 4) : "", game.short_description]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 120),
    }));
    gamesCache = items;
    return items;
  })()
    .catch((error) => {
      gamesPromise = null;
      throw error;
    })
    .finally(() => {
      gamesPromise = null;
    });
  gamesPromise = request;
  return request;
}

async function loadGames(query: string, page: number, signal?: AbortSignal): Promise<CatalogPage> {
  const games = await allGames();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const search = query.trim().toLowerCase();
  const filtered = search
    ? games.filter((game) => `${game.title} ${game.subtitle}`.toLowerCase().includes(search))
    : games;
  const start = (page - 1) * 24;
  return {
    items: filtered.slice(start, start + 24),
    hasMore: start + 24 < filtered.length,
  };
}
