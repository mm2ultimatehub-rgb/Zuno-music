export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSec: number;
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean };
}

interface YouTubeApiResponse<T> {
  items?: T[];
  error?: { message?: string; errors?: Array<{ reason?: string }> };
}

const API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY || '').trim();
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map<string, { expiresAt: number; videos: YouTubeVideo[] }>();

export class YouTubeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

export function parseYouTubeDuration(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600
    + Number(match[2] || 0) * 60
    + Number(match[3] || 0);
}

async function requestYouTube<T>(url: URL, signal?: AbortSignal): Promise<YouTubeApiResponse<T>> {
  const response = await fetch(url, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  });

  const payload = await response.json() as YouTubeApiResponse<T>;
  if (!response.ok) {
    const reason = payload.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      throw new YouTubeApiError('YouTube arama kotası doldu. Kotalar sıfırlandığında tekrar deneyebilirsin.');
    }
    if (response.status === 403) {
      throw new YouTubeApiError('YouTube API erişimi reddedildi. API anahtarının ve YouTube Data API v3 izninin açık olduğunu kontrol et.');
    }
    if (response.status === 400) {
      throw new YouTubeApiError('YouTube arama isteği geçersiz. Arama ifadesini değiştirip tekrar dene.');
    }
    throw new YouTubeApiError(payload.error?.message || ('YouTube API HTTP ' + response.status + ' yanıtı verdi.'));
  }
  return payload;
}

export async function searchYouTubeVideos(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {}
): Promise<YouTubeVideo[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  if (!API_KEY) {
    throw new YouTubeApiError('YouTube bağlantısı kurulmadı. GitHub Actions secrets bölümüne VITE_YOUTUBE_API_KEY eklenmeli.');
  }

  const cacheKey = trimmed.toLocaleLowerCase('tr-TR') + '|' + (options.limit ?? 20);
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.videos;

  const searchUrl = new URL(API_BASE + '/search');
  searchUrl.search = new URLSearchParams({
    key: API_KEY,
    part: 'snippet',
    type: 'video',
    q: trimmed,
    maxResults: String(Math.min(25, Math.max(1, options.limit ?? 20))),
    order: 'relevance',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    regionCode: 'AZ',
    relevanceLanguage: 'tr',
  }).toString();

  const searchPayload = await requestYouTube<YouTubeSearchItem>(searchUrl, options.signal);
  const searchItems = (searchPayload.items || []).filter((item) =>
    Boolean(item.id?.videoId && item.snippet?.title)
  );
  const ids = searchItems
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) return [];

  const detailsUrl = new URL(API_BASE + '/videos');
  detailsUrl.search = new URLSearchParams({
    key: API_KEY,
    part: 'contentDetails,status',
    id: ids.join(','),
  }).toString();

  let detailsById = new Map<string, YouTubeVideoDetails>();
  try {
    const details = await requestYouTube<YouTubeVideoDetails>(detailsUrl, options.signal);
    detailsById = new Map((details.items || []).map((item) => [item.id, item]));
  } catch (error) {
    if (options.signal?.aborted) throw error;
    // Search already filters for embeddable videos; missing duration is safer than losing valid results.
  }

  const videos = searchItems.flatMap((item): YouTubeVideo[] => {
    const videoId = item.id?.videoId;
    const snippet = item.snippet;
    if (!videoId || !snippet) return [];
    const details = detailsById.get(videoId);
    if (details?.status?.embeddable === false) return [];
    return [{
      videoId,
      title: snippet.title || 'YouTube videosu',
      channelTitle: snippet.channelTitle || 'YouTube kanalı',
      description: snippet.description || '',
      thumbnailUrl:
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        ('https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg'),
      publishedAt: snippet.publishedAt || '',
      durationSec: parseYouTubeDuration(details?.contentDetails?.duration),
    }];
  });

  searchCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, videos });
  return videos;
}
