import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { invoke } from '@tauri-apps/api/core';
import { ClientType, Innertube, YTNodes } from 'youtubei.js';
import type { Album, Artist, Track } from '../types/music';

export interface YouTubeMusicSearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSec: number;
}

type HttpProxyResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

type RawMusicItem = {
  id?: string;
  item_type?: string;
  name?: string;
  title?: string | { toString(): string };
  subtitle?: string | { toString(): string };
  artists?: Array<{ name?: string; channel_id?: string }>;
  authors?: Array<{ name?: string; channel_id?: string }>;
  author?: { name?: string; channel_id?: string };
  duration?: { seconds?: number; text?: string };
  duration_seconds?: number;
  thumbnails?: Array<{ url?: string; width?: number; height?: number }>;
  thumbnail?: unknown;
  endpoint?: { payload?: { browseId?: string; videoId?: string } };
  navigationEndpoint?: unknown;
  flex_columns?: Array<{ title?: { toString(): string; runs?: Array<{ text?: string; endpoint?: unknown; navigationEndpoint?: unknown }> } }>;
  subscribers?: string;
  subscriber_count?: string;
  year?: string;
};

type MusicShelf = { contents?: unknown[] };
type MusicSearchResponse = {
  songs?: MusicShelf;
  albums?: MusicShelf;
  artists?: MusicShelf;
  playlists?: MusicShelf;
  contents?: unknown[];
  page?: unknown;
};

function iterableItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Symbol.iterator in value) {
    try { return Array.from(value as Iterable<unknown>); } catch { return []; }
  }
  return [];
}

/**
 * ZUNO's native client does not rely on shelf labels alone: it also walks the parsed
 * InnerTube page and collects typed music rows. This fallback covers changed or
 * localised response layouts where youtubei.js does not populate response.songs.
 */
function collectMusicItems(root: unknown, acceptedTypes: Set<string>): RawMusicItem[] {
  const results: RawMusicItem[] = [];
  const seen = new WeakSet<object>();
  const page = root as {
    contents_memo?: { getType?: (...types: unknown[]) => unknown[] };
    continuation_contents_memo?: { getType?: (...types: unknown[]) => unknown[] };
  } | null;

  for (const memo of [page?.contents_memo, page?.continuation_contents_memo]) {
    if (!memo?.getType) continue;
    try {
      for (const value of memo.getType(YTNodes.MusicResponsiveListItem, YTNodes.MusicTwoRowItem)) {
        const item = value as RawMusicItem;
        if (item.item_type && acceptedTypes.has(item.item_type) && titleOf(item)) results.push(item);
      }
    } catch {
      // Older or changed parser memo implementations are handled by the recursive walk below.
    }
  }

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const item = value as RawMusicItem;
    if (item.item_type && acceptedTypes.has(item.item_type) && titleOf(item)) results.push(item);
    for (const child of Object.values(value)) visit(child);
  };
  visit(root);
  return results;
}

function normalizeMusicKey(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function songOrVideoItems(items: RawMusicItem[]): RawMusicItem[] {
  const matching = items.filter((item) => item.item_type === 'song' || item.item_type === 'video');
  const songKeys = new Set(matching.filter((item) => item.item_type === 'song')
    .map((item) => normalizeMusicKey(titleOf(item)) + '::' + normalizeMusicKey(artistName(item))));
  return matching.filter((item) => item.item_type !== 'video'
    || !songKeys.has(normalizeMusicKey(titleOf(item)) + '::' + normalizeMusicKey(artistName(item))));
}

/**
 * youtubei.js 17 identifies its parsed shelves by their display heading.
 * YouTube Music localizes these headings from the session's hl setting,
 * while the library's accessors compare English strings. Prefer the typed
 * accessor, then use the shelf contents with a locale-tolerant title match.
 */
function shelfItems(response: MusicSearchResponse, key: 'songs' | 'albums' | 'artists'): unknown[] {
  const direct = iterableItems(response[key]?.contents);
  if (direct.length) return direct;

  const labels: Record<typeof key, string[]> = {
    songs: ['songs', 'song', 'şarkılar', 'şarkı'],
    albums: ['albums', 'album', 'albümler', 'albüm'],
    artists: ['artists', 'artist', 'sanatçılar', 'sanatçı'],
  };
  for (const section of iterableItems(response.contents)) {
    if (!section || typeof section !== 'object') continue;
    const record = section as { title?: unknown; contents?: unknown };
    const heading = itemText(record.title).toLocaleLowerCase('tr-TR').trim();
    if (labels[key].includes(heading)) {
      const contents = iterableItems(record.contents);
      if (contents.length) return contents;
    }
  }
  return [];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map<string, { expiresAt: number; value: YouTubeMusicSearchResults }>();
const inFlight = new Map<string, Promise<YouTubeMusicSearchResults>>();
let clientPromise: Promise<Innertube> | null = null;

export class YouTubeMusicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YouTubeMusicError';
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined'
    && Object.prototype.hasOwnProperty.call(window, '__TAURI_INTERNALS__');
}

function normalizeInput(input: RequestInfo | URL): { url: string; headers: Headers; method: string; request?: Request } {
  if (input instanceof Request) {
    return { url: input.url, headers: new Headers(input.headers), method: input.method, request: input };
  }
  return {
    url: input instanceof URL ? input.toString() : input,
    headers: new Headers(),
    method: 'GET',
  };
}

async function bodyToText(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body as ArrayBufferView);
  if (body instanceof Blob) return await body.text();
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    return await new Response(body).text();
  }
  throw new YouTubeMusicError('YouTube Music sent an unsupported request body.');
}

async function youtubeMusicFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = normalizeInput(input);
  const headers = new Headers(request.headers);
  if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const method = (init?.method || request.method || 'GET').toUpperCase();
  const requestUrl = new URL(request.url);
  if (
    headers.get('x-youtube-client-name') === '67'
    && requestUrl.hostname === 'www.youtube.com'
    && requestUrl.pathname.startsWith('/youtubei/')
  ) {
    requestUrl.hostname = 'music.youtube.com';
  }
  const url = requestUrl.toString();
  const body = init?.body !== undefined
    ? await bodyToText(init.body)
    : request.request
      ? await request.request.clone().text()
      : undefined;
  const headerRecord: Record<string, string> = {};
  headers.forEach((value, key) => { headerRecord[key] = value; });

  if (isTauriRuntime()) {
    const response = await invoke<HttpProxyResponse>('youtube_music_http_request', {
      url,
      method,
      headers: headerRecord,
      body: body ?? null,
    });
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({
      url,
      method,
      headers: headerRecord,
      data: body,
      responseType: 'text',
      connectTimeout: 20000,
      readTimeout: 25000,
    });
    const responseBody = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data ?? '');
    return new Response(responseBody, {
      status: response.status,
      headers: response.headers,
    });
  }

  // The web build can attempt the same public request. Some browsers reject InnerTube CORS;
  // the native Android and Tauri transports above are the supported app paths.
  return fetch(url, {
    ...init,
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
    credentials: 'omit',
  });
}

async function refreshMusicClientMetadata(client: Innertube): Promise<void> {
  try {
    const response = await youtubeMusicFetch('https://music.youtube.com/', {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) return;

    const html = await response.text();
    const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    if (!clientVersion) return;

    const session = client.session as unknown as {
      context: {
        client: {
          clientVersion: string;
          originalUrl?: string;
          mainAppWebInfo?: { graftUrl?: string };
        };
      };
      api_key?: string;
    };
    session.context.client.clientVersion = clientVersion;
    session.context.client.originalUrl = 'https://music.youtube.com';
    if (session.context.client.mainAppWebInfo) {
      session.context.client.mainAppWebInfo.graftUrl = 'https://music.youtube.com';
    }
    if (apiKey) session.api_key = apiKey;
  } catch {
    // A bundled youtubei.js client version remains available as a best-effort fallback.
  }
}

async function getMusicClient(): Promise<Innertube> {
  if (!clientPromise) {
    const pending = (async () => {
      const client = await Innertube.create({
        fetch: youtubeMusicFetch,
        client_type: ClientType.MUSIC,
        // youtubei.js 17 compares YT Music shelf headings to English strings.
        // Keep the API UI locale English so its songs/albums/artists accessors work.
        lang: 'en',
        location: 'AZ',
        generate_session_locally: true,
        retrieve_innertube_config: false,
        retrieve_player: false,
      });
      await refreshMusicClientMetadata(client);
      return client;
    })();
    pending.catch(() => {
      if (clientPromise === pending) clientPromise = null;
    });
    clientPromise = pending;
  }
  return clientPromise;
}

function itemText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'toString' in value) {
    const result = String(value).trim();
    return result === '[object Object]' ? '' : result;
  }
  return '';
}

function bestArtwork(item: RawMusicItem): string {
  const candidates: Array<{ url: string; width: number; height: number }> = [];
  const seen = new WeakSet<object>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const record = value as { url?: unknown; width?: unknown; height?: unknown };
    if (typeof record.url === 'string' && /^https?:\/\//i.test(record.url)) {
      candidates.push({
        url: record.url.startsWith('//') ? 'https:' + record.url : record.url,
        width: typeof record.width === 'number' ? record.width : 0,
        height: typeof record.height === 'number' ? record.height : 0,
      });
    }
    Object.values(value).forEach(visit);
  };
  visit(item.thumbnails);
  visit(item.thumbnail);
  candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  return candidates[0]?.url || '';
}

function artistName(item: RawMusicItem): string {
  const artistNames = item.artists?.map((artist) => artist.name).filter((name): name is string => Boolean(name)) || [];
  const authorNames = item.authors?.map((artist) => artist.name).filter((name): name is string => Boolean(name)) || [];
  if (artistNames.length) return artistNames.join(', ');
  if (authorNames.length) return authorNames.join(', ');
  if (item.author?.name) return item.author.name;
  const subtitle = itemText(item.subtitle);
  if (subtitle) return subtitle.split(/\s*[•·|]\s*/)[0]?.trim() || subtitle;
  return 'YouTube Music';
}

function titleOf(item: RawMusicItem): string {
  return itemText(item.title) || item.name?.trim() || '';
}

function videoIdOf(item: RawMusicItem): string {
  const id = item.endpoint?.payload?.videoId || item.id || '';
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
}

function findBrowseId(value: unknown, depth = 0): string {
  if (!value || typeof value !== 'object' || depth > 6) return '';
  const record = value as { browseId?: unknown; payload?: unknown; endpoint?: unknown; navigationEndpoint?: unknown };
  if (typeof record.browseId === 'string') return record.browseId;
  return findBrowseId(record.payload, depth + 1)
    || findBrowseId(record.endpoint, depth + 1)
    || findBrowseId(record.navigationEndpoint, depth + 1);
}

function browseIdOf(item: RawMusicItem): string {
  return findBrowseId(item.endpoint) || findBrowseId(item.navigationEndpoint) || item.id || '';
}

function durationOf(item: RawMusicItem): number {
  if (typeof item.duration?.seconds === 'number') return item.duration.seconds;
  if (typeof item.duration_seconds === 'number') return item.duration_seconds;
  const text = item.duration?.text || '';
  const parts = text.split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function albumInfo(item: RawMusicItem): { title: string; id: string } {
  for (const column of item.flex_columns?.slice(1) || []) {
    const title = itemText(column.title);
    const runs = column.title?.runs || [];
    const browseId = runs
      .map((run) => findBrowseId(run.endpoint) || findBrowseId(run.navigationEndpoint))
      .find((id) => id.startsWith('MPRE')) || '';
    if (browseId && title) return { title, id: browseId };
  }
  return { title: '', id: '' };
}

function mapTrack(value: unknown): Track | null {
  const item = value as RawMusicItem;
  const videoId = videoIdOf(item);
  const title = titleOf(item);
  if (!videoId || !title) return null;
  const album = albumInfo(item);
  const artist = artistName(item);
  const artwork = bestArtwork(item) || ('https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg');
  return {
    id: 'youtube-music-' + videoId,
    title,
    artist,
    album: album.title || '',
    albumId: album.id || ('youtube-music-album-' + videoId),
    durationSec: durationOf(item),
    coverUrl: artwork,
    category: 'songs',
    accentColor: '#9b72ff',
    ambientColor: '#11151e',
    bpm: 0,
    rootNoteHz: 0,
    fileSizeMb: 0,
    provider: 'youtube-music',
    providerTrackId: videoId,
    downloadable: false,
  };
}

function mapAlbum(value: unknown): Album | null {
  const item = value as RawMusicItem;
  const id = browseIdOf(item);
  const title = titleOf(item);
  if (!id || !title) return null;
  return {
    id,
    title,
    artist: artistName(item),
    year: Number(item.year) || 0,
    coverUrl: bestArtwork(item) || `${import.meta.env.BASE_URL}zuno-icon.svg`,
    accentColor: '#9b72ff',
    trackIds: [],
  };
}

function mapArtist(value: unknown): Artist | null {
  const item = value as RawMusicItem;
  const rawId = browseIdOf(item);
  const id = rawId.startsWith('MPLA') ? rawId.slice(4) : rawId;
  const name = titleOf(item);
  if (!id.startsWith('UC') || !name) return null;
  return {
    id,
    name,
    genre: 'YouTube Music',
    monthlyListeners: item.subscribers || item.subscriber_count || 'YouTube Music',
    coverUrl: bestArtwork(item),
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function searchYouTubeMusic(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<YouTubeMusicSearchResults> {
  const normalized = query.trim();
  if (normalized.length < 2) return { tracks: [], albums: [], artists: [] };
  const cacheKey = normalized.toLocaleLowerCase('tr-TR');
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const pending = (async () => {
    try {
      const client = await getMusicClient();
      const [mixed, artistsResponse] = await Promise.all([
        client.music.search(normalized),
        client.music.search(normalized, { type: 'artist' }).catch(() => null),
      ]);
      const mixedResponse = mixed as unknown as MusicSearchResponse;
      const artistResponse = artistsResponse as unknown as MusicSearchResponse | null;
      const mixedItems = collectMusicItems(mixedResponse.page, new Set(['artist', 'song', 'video', 'album']));
      const artistPageItems = artistResponse
        ? collectMusicItems(artistResponse.page, new Set(['artist']))
        : [];
      const tracks = uniqueById([
        ...shelfItems(mixedResponse, 'songs'),
        ...songOrVideoItems(mixedItems),
      ].map(mapTrack).filter((item): item is Track => Boolean(item)));
      const albums = uniqueById([
        ...shelfItems(mixedResponse, 'albums'),
        ...mixedItems.filter((item) => item.item_type === 'album'),
      ].map(mapAlbum).filter((item): item is Album => Boolean(item)));
      const artists = uniqueById([
        ...shelfItems(mixedResponse, 'artists'),
        ...(artistResponse ? shelfItems(artistResponse, 'artists') : []),
        ...mixedItems.filter((item) => item.item_type === 'artist'),
        ...artistPageItems,
      ].map(mapArtist).filter((item): item is Artist => Boolean(item)));

      const value = { tracks, albums, artists };
      if (tracks.length === 0 && albums.length === 0 && artists.length === 0) {
        throw new YouTubeMusicError('YouTube Music bu arama için sonuç döndürmedi.');
      }
      searchCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
      return value;
    } catch (error) {
      if (error instanceof YouTubeMusicError) throw error;
      const message = error instanceof Error ? error.message : 'Bilinmeyen ağ hatası';
      throw new YouTubeMusicError(
        'YouTube Music kataloğuna bağlanılamadı: ' + message + '. İnternet bağlantını kontrol et.'
      );
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, pending);
  return pending;
}

export function youtubeVideoFromTrack(track: Track): YouTubeVideo {
  const videoId = track.providerTrackId || '';
  return {
    videoId,
    title: track.title,
    channelTitle: track.artist,
    description: track.album || '',
    thumbnailUrl: track.coverUrl,
    publishedAt: '',
    durationSec: track.durationSec,
  };
}
