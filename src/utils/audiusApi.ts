import type { Track } from '../types/music';

const AUDIUS_API_KEY = (import.meta.env.VITE_AUDIUS_API_KEY || '').trim();

const API_BASES = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1',
] as const;

interface AudiusTrackResponse {
  id: string | number;
  title?: string;
  duration?: number;
  album?: { id?: string | number; title?: string };
  artwork?: {
    _1000x1000?: string;
    _480x480?: string;
    _150x150?: string;
  };
  user?: {
    name?: string;
    handle?: string;
  };
  downloadable?: boolean;
  isDownloadable?: boolean;
  is_downloadable?: boolean;
  isStreamable?: boolean | string;
  is_streamable?: boolean | string;
  isStreamGated?: boolean;
  is_stream_gated?: boolean;
  releaseDate?: string;
  release_date?: string;
  genre?: string;
  playCount?: number;
  play_count?: number;
}

interface AudiusApiResponse {
  data?: AudiusTrackResponse[];
  error?: string;
}

export class AudiusApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudiusApiError';
  }
}

function isStreamable(track: AudiusTrackResponse): boolean {
  const value = track.isStreamable;
  const resolved = value ?? track.is_streamable;
  // Some discovery providers omit the flag; allow playback to verify the stream URL.
  return resolved === undefined || resolved === true || resolved === 'true' || resolved === '1';
}

function stableAccent(id: string): string {
  const palette = ['#9b72ff', '#4da6ff', '#ffb454', '#a3f0f0', '#ff83b7'];
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}

function mapTrack(item: AudiusTrackResponse, apiBase: string): Track | null {
  if (!item.id || !item.title || !isStreamable(item) || item.isStreamGated || item.is_stream_gated) {
    return null;
  }

  const id = String(item.id);
  const downloadable = item.downloadable === true || item.isDownloadable === true || item.is_downloadable === true;
  const artist = item.user?.name || item.user?.handle || 'Audius sanatçısı';
  const coverUrl =
    item.artwork?._480x480 ||
    item.artwork?._1000x1000 ||
    item.artwork?._150x150 ||
    './zuno-icon.svg';
  const audioBase = `${apiBase}/tracks/${encodeURIComponent(id)}`;
  const accentColor = stableAccent(id);
  const releaseDate = item.releaseDate || item.release_date;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : undefined;

  return {
    id: `audius-${id}`,
    title: item.title,
    artist,
    album: item.album?.title || item.title,
    albumId: 'audius-album-' + String(item.album?.id || id),
    durationSec: Math.max(1, Math.round(item.duration || 1)),
    coverUrl,
    category: 'songs',
    accentColor,
    ambientColor: '#1d2b44',
    bpm: 110,
    rootNoteHz: 196,
    fileSizeMb: 0,
    audioUrl: `${audioBase}/stream`,
    downloadUrl: downloadable ? `${audioBase}/download` : undefined,
    provider: 'audius',
    providerTrackId: id,
    downloadable,
    year: releaseYear && Number.isFinite(releaseYear) ? releaseYear : undefined,
  };
}

async function requestTracks(
  path: string,
  signal?: AbortSignal
): Promise<Track[]> {
  let lastError: unknown;

  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: 'GET',
        signal,
        headers: {
          Accept: 'application/json',
          ...(AUDIUS_API_KEY ? { 'x-api-key': AUDIUS_API_KEY } : {}),
        },
        credentials: 'omit',
      });
      if (!response.ok) {
        if ((response.status === 401 || response.status === 403) && !AUDIUS_API_KEY) {
          throw new AudiusApiError(
            'Audius ücretsiz API anahtarı gerekiyor. api.audius.co/plans adresinden anahtar oluşturup VITE_AUDIUS_API_KEY olarak tanımla.'
          );
        }
        throw new AudiusApiError(`Müzik kaynağı HTTP ${response.status} yanıtı verdi.`);
      }

      const payload = (await response.json()) as AudiusApiResponse;
      if (!Array.isArray(payload.data)) {
        throw new AudiusApiError(payload.error || 'Müzik kaynağı beklenmeyen bir yanıt verdi.');
      }
      return payload.data.map((item) => mapTrack(item, base)).filter((track): track is Track => track !== null);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }

  throw new AudiusApiError(
    lastError instanceof Error
      ? lastError.message
      : 'Audius müzik kataloğuna bağlanılamadı.'
  );
}

export function searchAudiusTracks(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {}
): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return getTrendingAudiusTracks(options);

  const params = new URLSearchParams({
    query: trimmed,
    limit: String(options.limit ?? 30),
    sort_method: 'relevant',
    app_name: 'ZUNO Music',
  });
  return requestTracks(`/tracks/search?${params.toString()}`, options.signal);
}

export function getTrendingAudiusTracks(
  options: { signal?: AbortSignal; limit?: number } = {}
): Promise<Track[]> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 30),
    time: 'week',
    app_name: 'ZUNO Music',
  });
  return requestTracks(`/tracks/trending?${params.toString()}`, options.signal);
}
