import type { Playlist, ZunoSettings } from '../types/music';

export type CloudSyncStatus = 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'error';

export interface ZunoCloudState {
  schemaVersion: 1;
  settings: Partial<ZunoSettings>;
  favorites: string[];
  recentIds: string[];
  playlists: Playlist[];
  searchHistory: string[];
}

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function cleanStringList(value: unknown, limit: number, maxLength = 200): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
  )].slice(0, limit);
}

function cleanCoverUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return '';
  if (value.startsWith('https://')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

function cleanPlaylists(value: unknown): Playlist[] {
  if (!Array.isArray(value)) return [];
  const playlists: Playlist[] = [];

  for (const entry of value) {
    const record = asRecord(entry);
    if (!record || typeof record.id !== 'string' || typeof record.name !== 'string') continue;
    const id = record.id.trim().slice(0, 128);
    const name = record.name.trim().slice(0, 100);
    if (!id || !name) continue;

    playlists.push({
      id,
      name,
      description: typeof record.description === 'string' ? record.description.slice(0, 240) : '',
      coverUrl: cleanCoverUrl(record.coverUrl),
      trackIds: cleanStringList(record.trackIds, 500),
      isUserCreated: record.isUserCreated !== false,
      updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : Date.now(),
    });
  }

  return playlists.slice(0, 200);
}

function cleanSettings(value: unknown): Partial<ZunoSettings> {
  const source = asRecord(value);
  if (!source) return {};

  const result: Partial<ZunoSettings> = {};
  if (source.theme === 'dark' || source.theme === 'light' || source.theme === 'system') {
    result.theme = source.theme;
  }
  if (typeof source.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.accentColor)) {
    result.accentColor = source.accentColor;
  }
  if (source.tabStyle === 'pill' || source.tabStyle === 'shape' || source.tabStyle === 'line') {
    result.tabStyle = source.tabStyle;
  }
  if (source.knobShape === 'burst' || source.knobShape === 'sun' || source.knobShape === 'pent'
    || source.knobShape === 'hex' || source.knobShape === 'sq' || source.knobShape === 'tri'
    || source.knobShape === 'pill' || source.knobShape === 'circ') {
    result.knobShape = source.knobShape;
  }

  const numericSettings: Array<[keyof ZunoSettings, number, number]> = [
    ['waveAmplitude', 0.1, 3],
    ['animationSpeed', 0.1, 3],
    ['bassBoost', 0, 1],
    ['volume', 0, 1],
  ];
  for (const [key, minimum, maximum] of numericSettings) {
    const setting = source[key];
    if (typeof setting === 'number' && Number.isFinite(setting)) {
      (result as Record<string, unknown>)[key] = Math.min(maximum, Math.max(minimum, setting));
    }
  }

  const booleanSettings: Array<keyof ZunoSettings> = [
    'dynamicPlayerColors',
    'gaplessPlayback',
    'crossfadeEnabled',
    'audioNormalization',
    'hapticFeedback',
    'wifiOnlyDownloads',
  ];
  for (const key of booleanSettings) {
    if (typeof source[key] === 'boolean') (result as Record<string, unknown>)[key] = source[key];
  }

  if (source.downloadQuality === '320kbps' || source.downloadQuality === '192kbps' || source.downloadQuality === 'lossless') {
    result.downloadQuality = source.downloadQuality;
  }
  return result;
}

export function normalizeZunoCloudState(value: unknown): ZunoCloudState | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.schemaVersion !== undefined && record.schemaVersion !== 1) return null;

  return {
    schemaVersion: 1,
    settings: cleanSettings(record.settings),
    favorites: cleanStringList(record.favorites, 1000),
    recentIds: cleanStringList(record.recentIds, 100),
    playlists: cleanPlaylists(record.playlists),
    searchHistory: cleanStringList(record.searchHistory, 30, 120),
  };
}

export function buildZunoCloudState(input: {
  settings: ZunoSettings;
  favorites: string[];
  recentIds: string[];
  playlists: Playlist[];
  searchHistory: string[];
}): ZunoCloudState {
  return normalizeZunoCloudState({
    schemaVersion: 1,
    settings: input.settings,
    favorites: input.favorites,
    recentIds: input.recentIds,
    playlists: input.playlists,
    searchHistory: input.searchHistory,
  }) || {
    schemaVersion: 1,
    settings: {},
    favorites: [],
    recentIds: [],
    playlists: [],
    searchHistory: [],
  };
}
