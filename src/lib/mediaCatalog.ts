/* Interest libraries, backed by public APIs with no key:
   - AniList GraphQL for anime: thousands of real titles, 48 per page.
   - FreeToGame for games: the full free-to-play catalogue (400+ titles).
   - iTunes Search for artists and songs: real artwork and store links.
   - Wikipedia for films: real posters and a short description.
   Results are cached per page so paging back and forth is instant. */

export type CatalogKind = "anime" | "game" | "artist" | "song" | "movie";

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

type ITunesItem = {
  wrapperType?: string;
  kind?: string;
  artistName?: string;
  artistViewUrl?: string;
  collectionName?: string;
  trackName?: string;
  trackViewUrl?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

type WikiPage = {
  pageid: number;
  index?: number;
  title: string;
  extract?: string;
  thumbnail?: { source?: string };
};

type WikiResponse = {
  continue?: { gsroffset?: number };
  query?: { pages?: Record<string, WikiPage> };
};

const animeCache = new Map<string, CatalogPage>();
const itunesCache = new Map<string, CatalogPage>();
const movieCache = new Map<string, CatalogPage>();
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
  if (kind === "game") return loadGames(query, page, signal);
  if (kind === "movie") return loadMovies(query, page, signal);
  return loadITunes(kind, query, page, signal);
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
      variables: { page, perPage: 48, search: query.trim() || null },
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
  const start = (page - 1) * 48;
  return {
    items: filtered.slice(start, start + 48),
    hasMore: start + 48 < filtered.length,
  };
}

/** iTunes returns 100px art; the same asset is available at any square size. */
function itunesArt(item: ITunesItem): string {
  return (item.artworkUrl100 || item.artworkUrl60 || "").replace(/\/\d+x\d+bb\.(jpg|png)$/i, "/600x600bb.$1");
}

async function itunesSearch(term: string, entity: "song" | "musicArtist", signal?: AbortSignal): Promise<ITunesItem[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", term);
  url.searchParams.set("entity", entity);
  url.searchParams.set("limit", "200");
  url.searchParams.set("country", "US");
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("The music library could not be reached.");
  const payload = (await response.json()) as { results?: ITunesItem[] };
  return Array.isArray(payload.results) ? payload.results : [];
}

async function loadITunes(
  kind: "artist" | "song",
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<CatalogPage> {
  const term = query.trim() || (kind === "artist" ? "pop" : "top hits");
  const key = `${kind}|${term.toLowerCase()}|${page}`;
  const cached = itunesCache.get(key);
  if (cached) return cached;

  // Artist results carry no artwork, so search songs and group by artist.
  // The song's cover becomes the artist tile and the link stays an artist link.
  const results = await itunesSearch(term, "song", signal);
  const items: CatalogItem[] = [];
  const seen = new Set<string>();
  for (const item of results) {
    const artist = (item.artistName || "").trim();
    if (!artist) continue;
    const image = itunesArt(item);
    if (!image) continue;
    if (kind === "artist") {
      if (seen.has(artist.toLowerCase())) continue;
      seen.add(artist.toLowerCase());
      items.push({
        id: `artist-${item.artistViewUrl || artist}`,
        kind,
        title: artist,
        subtitle: "Artist",
        image,
        url: item.artistViewUrl || "https://music.apple.com/",
        meta: item.primaryGenreName || "Music",
      });
    } else {
      if (!item.trackName || !item.trackViewUrl) continue;
      const id = item.trackViewUrl;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id: `song-${id}`,
        kind,
        title: item.trackName,
        subtitle: artist,
        image,
        url: item.trackViewUrl,
        meta: [item.collectionName, item.releaseDate?.slice(0, 4), item.primaryGenreName].filter(Boolean).join(" · "),
      });
    }
  }

  const start = (page - 1) * 48;
  const result: CatalogPage = { items: items.slice(start, start + 48), hasMore: start + 48 < items.length };
  itunesCache.set(key, result);
  if (itunesCache.size > 80) itunesCache.clear();
  return result;
}

async function wikipediaPoster(title: string, signal?: AbortSignal): Promise<string> {
  try {
    const path = title.replace(/ /g, "_");
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(path)}`, { signal });
    if (!response.ok) return "";
    const payload = (await response.json()) as {
      items?: { title?: string; type?: string; srcset?: { src?: string }[] }[];
    };
    const image = (payload.items ?? []).find((item) => item.type === "image" && item.title?.startsWith("File:"));
    const source = image?.srcset?.[0]?.src || "";
    return source.startsWith("//") ? `https:${source}` : source;
  } catch {
    return "";
  }
}

async function loadMovies(query: string, page: number, signal?: AbortSignal): Promise<CatalogPage> {
  const trimmed = query.trim();
  const key = `${trimmed.toLowerCase() || "popular"}|${page}`;
  const cached = movieCache.get(key);
  if (cached) return cached;
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  if (trimmed) {
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `${trimmed} film`);
    url.searchParams.set("gsrnamespace", "0");
    url.searchParams.set("gsrlimit", "48");
    url.searchParams.set("gsroffset", String((page - 1) * 48));
  } else {
    // A category gives actual film articles; a text search mostly returns
    // "List of … films" pages with no poster.
    url.searchParams.set("generator", "categorymembers");
    url.searchParams.set("gcmtitle", "Category:2025 films");
    url.searchParams.set("gcmtype", "page");
    url.searchParams.set("gcmlimit", "200");
  }
  url.searchParams.set("prop", "pageimages|extracts");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "600");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("The film library could not be reached.");
  const payload = (await response.json()) as WikiResponse;
  const pages = Object.values(payload.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const candidates = pages.filter((item) => {
    if (/^Lists? of\b/i.test(item.title)) return false;
    if (!trimmed) return true;
    // Search matches actor and awards pages too; keep actual film articles.
    const extract = (item.extract || "").replace(/\s+/g, " ");
    return /\([^)]*film[^)]*\)/i.test(item.title) || /\b(?:is|was) (?:a|an) [^.]{0,140}\bfilm\b/i.test(extract);
  });
  // Free images are rare in film articles — posters are usually non-free and
  // pageimages hides them. The REST media list does expose the infobox poster,
  // so fetch it for the films actually being shown.
  const pageSize = trimmed ? 48 : 24;
  const start = trimmed ? 0 : (page - 1) * pageSize;
  const selected = candidates.slice(start, start + pageSize);
  const items = (await Promise.all(selected.map(async (item): Promise<CatalogItem | null> => {
    const image = item.thumbnail?.source || await wikipediaPoster(item.title, signal);
    if (!image) return null;
    return {
      id: `movie-${item.pageid}`,
      kind: "movie" as const,
      title: item.title.replace(/\s*\([^)]*film[^)]*\)$/i, ""),
      subtitle: "Film",
      image,
      url: `https://en.wikipedia.org/?curid=${item.pageid}`,
      meta: (item.extract || "").replace(/\s+/g, " ").slice(0, 120),
    };
  }))).filter((item): item is CatalogItem => item !== null);
  const result: CatalogPage = {
    items,
    hasMore: trimmed ? Boolean(payload.continue?.gsroffset) : start + pageSize < candidates.length,
  };
  movieCache.set(key, result);
  if (movieCache.size > 80) movieCache.clear();
  return result;
}
