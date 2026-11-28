export type NavTabId = 'home' | 'discover' | 'library' | 'downloads';

export type SearchCategory =
  | 'all'
  | 'songs'
  | 'videos'
  | 'albums'
  | 'artists'
  | 'playlists'
  | 'podcasts';

export type LibrarySection =
  | 'favorites'
  | 'playlists'
  | 'albums'
  | 'artists'
  | 'recent'
  | 'local';

export type SortMode = 'recent' | 'title' | 'artist' | 'duration';
export type ViewMode = 'grid' | 'list';
export type RepeatMode = 'off' | 'all' | 'one';
export type ThemeMode = 'dark' | 'light' | 'system';

export type FluidShapeId = 'burst' | 'sun' | 'pent' | 'hex' | 'sq' | 'tri' | 'pill' | 'circ';
export type TabIndicatorStyle = 'pill' | 'shape' | 'line';
export type DownloadStatus = 'downloading' | 'queued' | 'paused' | 'completed' | 'error';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  durationSec: number;
  coverUrl: string;
  category: 'songs' | 'videos' | 'podcasts';
  accentColor: string;
  ambientColor: string;
  bpm: number;
  rootNoteHz: number;
  fileSizeMb: number;
  folderName?: string;
  isLocal?: boolean;
  audioObjectUrl?: string;
  audioFileId?: string;
  audioUrl?: string;
  downloadUrl?: string;
  provider?: 'audius' | 'youtube-music';
  providerTrackId?: string;
  downloadable?: boolean;
  year?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  accentColor: string;
  trackIds: string[];
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  monthlyListeners: string;
  coverUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  trackIds: string[];
  isUserCreated?: boolean;
  updatedAt: number;
}

export interface DownloadItem {
  id: string;
  trackId: string;
  status: DownloadStatus;
  progress: number; // 0 to 100
  downloadedMb: number;
  totalMb: number;
  errorMessage?: string;
  addedAt: number;
}

export type AppLanguage = 'tr' | 'en' | 'ru';

export interface ZunoSettings {
  language: AppLanguage;
  theme: ThemeMode;
  accentColor: string;
  tabStyle: TabIndicatorStyle;
  knobShape: FluidShapeId;
  waveAmplitude: number;
  animationSpeed: number;
  dynamicPlayerColors: boolean;
  gaplessPlayback: boolean;
  crossfadeEnabled: boolean;
  audioNormalization: boolean;
  hapticFeedback: boolean;
  wifiOnlyDownloads: boolean;
  downloadQuality: '320kbps' | '192kbps' | 'lossless';
  bassBoost: number; // 0 to 1
  volume: number; // 0 to 1
}
