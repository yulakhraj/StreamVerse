export interface Country {
  code: string;
  name: string;
  languages?: string[];
  flag?: string;
}
export interface Region {
  code: string;
  name: string;
  countries: string[];
}
export interface Named {
  id: string;
  name: string;
}
export interface Language {
  code: string;
  name: string;
}
export interface Stream {
  channel: string | null;
  url: string;
  http_referrer?: string | null;
  user_agent?: string | null;
}
export interface RawChannel {
  id: string;
  name: string;
  country: string;
  categories?: string[];
  languages?: string[];
  is_nsfw?: boolean;
  closed?: string | null;
  logo?: string;
}
export interface Channel extends RawChannel {
  countryName: string;
  categoryNames: string[];
  categories: string[];
  languages: string[];
  logo?: string;
  streams: string[];
}
export interface Catalog {
  channels: Channel[];
  countries: Country[];
  regions: Region[];
  categories: Named[];
  languages: Language[];
}
export interface Feed {
  channel: string;
  id: string;
  languages: string[];
}
export interface Sources {
  feeds?: Feed[];
  channels: RawChannel[];
  streams: Stream[];
  countries: Country[];
  regions: Region[];
  categories: Named[];
  languages: Language[];
  logos: { channel: string; url: string }[];
}
export const API = "https://iptv-org.github.io/api/";
export const CACHE_TTL = 6 * 60 * 60 * 1000;
const CACHE_KEY = "catalog-v2";

export function publicUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
export function normalize(s: Sources): Catalog {
  const streams = new Map<string, Set<string>>();
  for (const stream of s.streams) {
    if (
      !stream.channel ||
      stream.http_referrer ||
      stream.user_agent ||
      !publicUrl(stream.url)
    )
      continue;
    const urls = streams.get(stream.channel) ?? new Set<string>();
    urls.add(stream.url);
    streams.set(stream.channel, urls);
  }
  const feedLanguages = new Map<string, Set<string>>();
  for (const feed of s.feeds ?? []) {
    const languages = feedLanguages.get(feed.channel) ?? new Set<string>();
    for (const language of feed.languages ?? []) languages.add(language);
    feedLanguages.set(feed.channel, languages);
  }
  const logos = new Map(
    s.logos
      .filter((l) => publicUrl(l.url) && l.url.startsWith("https:"))
      .map((l) => [l.channel, l.url]),
  );
  const countries = new Map(s.countries.map((c) => [c.code, c]));
  const categories = new Map(s.categories.map((c) => [c.id, c.name]));
  const channels = s.channels
    .filter((c) => !c.is_nsfw && !c.closed && streams.has(c.id))
    .map((c) => ({
      ...c,
      countryName: countries.get(c.country)?.name ?? c.country,
      categories: c.categories ?? [],
      categoryNames: (c.categories ?? []).map((id) => categories.get(id) ?? id),
      languages: [
        ...new Set([
          ...(c.languages ?? []),
          ...(feedLanguages.get(c.id) ?? []),
        ]),
      ],
      logo: logos.get(c.id),
      streams: [...streams.get(c.id)!].sort(
        (a, b) =>
          Number(b.startsWith("https:")) - Number(a.startsWith("https:")),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    channels,
    countries: s.countries,
    regions: s.regions,
    categories: s.categories,
    languages: s.languages,
  };
}
interface CacheEntry {
  timestamp: number;
  data: Catalog;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("streamverse", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("cache");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function cacheRead(): Promise<CacheEntry | undefined> {
  try {
    const db = await database();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("cache");
      const req = tx.objectStore("cache").get(CACHE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return undefined;
  }
}
async function cacheWrite(data: Catalog) {
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cache", "readwrite");
      tx.objectStore("cache").put({ timestamp: Date.now(), data }, CACHE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* Private browsing/storage quota must not block viewing. */
  }
}
export function cacheFresh(timestamp: number, now = Date.now()) {
  return timestamp <= now && now - timestamp < CACHE_TTL;
}
let inflight: Promise<{ data: Catalog; stale: boolean }> | undefined;
export function loadCatalog(force = false) {
  if (inflight) return inflight;
  inflight = (async () => {
    const cached = await cacheRead();
    if (!force && cached && cacheFresh(cached.timestamp))
      return { data: cached.data, stale: false };
    try {
      const keys = [
        "channels",
        "streams",
        "countries",
        "regions",
        "categories",
        "languages",
        "logos",
        "feeds",
      ] as const;
      const responses = await Promise.all(
        keys.map(async (key) => {
          const response = await fetch(`${API}${key}.json`, {
            signal: AbortSignal.timeout(25000),
          });
          if (key === "feeds" && response.status === 404)
            return [key, []] as const;
          if (!response.ok)
            throw new Error(`Catalog request failed (${response.status}).`);
          const data: unknown = await response.json();
          if (!Array.isArray(data))
            throw new Error(
              "The public catalog returned an unexpected response.",
            );
          return [key, data] as const;
        }),
      );
      const data = normalize(
        Object.fromEntries(responses) as unknown as Sources,
      );
      if (!data.channels.length)
        throw new Error(
          "No public streams are currently available in the catalog.",
        );
      await cacheWrite(data);
      return { data, stale: false };
    } catch {
      if (cached) return { data: cached.data, stale: true };
      throw new Error(
        "We could not reach the public channel catalog. Check your connection and try again.",
      );
    }
  })().finally(() => {
    inflight = undefined;
  });
  return inflight;
}
