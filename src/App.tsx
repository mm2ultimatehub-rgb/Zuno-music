import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArtworkImage } from './components/ArtworkImage';
import {
  CheckCircle2,
  Compass,
  Download,
  Heart,
  Home,
  Library,
  Maximize2,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  UserRound,
} from 'lucide-react';
import type {
  Album,
  Artist,
  DownloadItem,
  NavTabId,
  Playlist,
  RepeatMode,
  SearchCategory,
  Track,
  ZunoSettings,
} from './types/music';
import {
  COVER_PRISM,
  COVER_SUBZERO,
  DEFAULT_SETTINGS,
} from './data/zunoCatalog';
import { formatDuration, getNextTrackId } from './utils/zunoLogic';
import { zunoAudioEngine } from './utils/audioEngine';
import { createAudioId, deleteAudioFile, fetchAudioBlob, listAudioFiles, readAudioDuration, saveAudioFile } from './utils/localAudioLibrary';
import { getTrendingAudiusTracks, searchAudiusTracks } from './utils/audiusApi';
import { searchYouTubeMusic, youtubeVideoFromTrack } from './utils/youtubeMusicApi';
import type { YouTubeVideo } from './utils/youtubeApi';
import { ZunoLogo } from './components/ZunoLogo';
import { FlowingTabs, type FlowingTabItem } from './components/fluid/FlowingTabs';
import { LiquidSlider } from './components/fluid/LiquidSlider';
import { DownloadActionButton } from './components/fluid/DownloadActionButton';
import { HomeView } from './components/HomeView';
import { DiscoverView } from './components/DiscoverView';
import { LibraryView } from './components/LibraryView';
import { DownloadsView } from './components/DownloadsView';
import { FullscreenPlayer, MiniPlayer } from './components/PlayerOverlay';
import { SettingsView } from './components/SettingsView';
import { AlbumModal } from './components/AlbumModal';
import { PwaInstallButton } from './components/PwaInstallButton';
import { AccountModal } from './components/AccountModal';
import { YouTubePlayerModal } from './components/YouTubePlayerModal';
import { DynamicIslandPlayer } from './components/DynamicIslandPlayer';
import { buildZunoCloudState, normalizeZunoCloudState, type CloudSyncStatus } from './utils/cloudSync';
import { isSupabaseConfigured, supabase } from './utils/supabaseClient';
import type { RealtimeChannel, User } from '@supabase/supabase-js';

const STORAGE_KEY = 'zuno-music-state-v1';

const EMPTY_TRACK: Track = {
  id: '',
  title: 'Henüz parça seçilmedi',
  artist: 'ZUNO Music',
  album: 'Müzik keşfet veya dosya ekle',
  albumId: '',
  durationSec: 0,
  coverUrl: './zuno-icon.svg',
  category: 'songs',
  accentColor: '#9b72ff',
  ambientColor: '#11151e',
  bpm: 0,
  rootNoteHz: 0,
  fileSizeMb: 0,
};

interface PersistedState {
  settings: ZunoSettings;
  favorites: string[];
  recentIds: string[];
  playlists: Playlist[];
  downloads: DownloadItem[];
  searchHistory: string[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        favorites: Array.isArray(parsed.favorites)
          ? parsed.favorites.filter((id) => !/^tr-\d+$/.test(id))
          : [],
        recentIds: Array.isArray(parsed.recentIds)
          ? parsed.recentIds.filter((id) => !/^tr-\d+$/.test(id))
          : [],
        playlists: Array.isArray(parsed.playlists)
          ? parsed.playlists.filter((playlist) => playlist.isUserCreated || playlist.trackIds.some((id) => !/^tr-\d+$/.test(id)))
          : [],
        // Older releases stored simulated download progress; rebuild this list from real IndexedDB files.
        downloads: [],
        searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    settings: DEFAULT_SETTINGS,
    favorites: [],
    recentIds: [],
    playlists: [],
    downloads: [],
    searchHistory: [],
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [settings, setSettings] = useState<ZunoSettings>(initial.settings);
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudReadyUserId, setCloudReadyUserId] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('disabled');
  const lastCloudStateJsonRef = useRef('');
  const [playerFullscreen, setPlayerFullscreen] = useState(false);

  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [offlineCatalogTracks, setOfflineCatalogTracks] = useState<Track[]>([]);
  const [remoteTracks, setRemoteTracks] = useState<Track[]>([]);
  const [audiusLoading, setAudiusLoading] = useState(false);
  const [audiusError, setAudiusError] = useState<string | null>(null);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
  const [youtubeMusicTracks, setYoutubeMusicTracks] = useState<Track[]>([]);
  const [youtubeMusicAlbums, setYoutubeMusicAlbums] = useState<Album[]>([]);
  const [youtubeMusicArtists, setYoutubeMusicArtists] = useState<Artist[]>([]);
  const [youtubeMusicLoading, setYoutubeMusicLoading] = useState(false);
  const [youtubeMusicError, setYoutubeMusicError] = useState<string | null>(null);
  const [youtubeMusicQueue, setYoutubeMusicQueue] = useState<Track[]>([]);
  const [youtubeMusicQueueIndex, setYoutubeMusicQueueIndex] = useState(0);
  const [selectedYoutubeVideo, setSelectedYoutubeVideo] = useState<YouTubeVideo | null>(null);
  const allTracks = useMemo(() => {
    const offlineById = new Map(offlineCatalogTracks.map((track) => [track.id, track]));
    const onlineIds = new Set(remoteTracks.map((track) => track.id));
    return [
      ...remoteTracks.map((track) => offlineById.get(track.id) || track),
      ...youtubeMusicTracks,
      ...localTracks,
      ...offlineCatalogTracks.filter((track) => !onlineIds.has(track.id)),
    ];
  }, [localTracks, offlineCatalogTracks, remoteTracks, youtubeMusicTracks]);
  const downloadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const handleSkipRef = useRef<(direction: 'next' | 'prev') => void>(() => undefined);

  const [favorites, setFavorites] = useState<string[]>(initial.favorites);
  const [recentIds, setRecentIds] = useState<string[]>(initial.recentIds);
  const [playlists, setPlaylists] = useState<Playlist[]>(initial.playlists);
  const [downloads, setDownloads] = useState<DownloadItem[]>(initial.downloads);
  const [searchHistory, setSearchHistory] = useState<string[]>(initial.searchHistory);
  const cloudState = useMemo(
    () => buildZunoCloudState({ settings, favorites, recentIds, playlists, searchHistory }),
    [settings, favorites, recentIds, playlists, searchHistory]
  );
  const cloudStateRef = useRef(cloudState);
  cloudStateRef.current = cloudState;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback State
  const [queue, setQueue] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [sleepTimerMin, setSleepTimerMin] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [cacheMb, setCacheMb] = useState(0);

  const activeTrack = useMemo(
    () => allTracks.find((track) => track.id === activeTrackId) || EMPTY_TRACK,
    [allTracks, activeTrackId]
  );

  const libraryArtists = useMemo(() => {
    const artists = new Map<string, Artist>();
    allTracks
      .filter((track) => track.audioObjectUrl || track.audioUrl || track.provider === 'youtube-music')
      .forEach((track) => {}
        if (!artists.has(track.artist)) {
          artists.set(track.artist, {
            id: `artist-${track.provider || 'local'}-${track.artist.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '-')}`,
            name: track.artist,
            genre: track.provider === 'audius' ? 'Audius' : track.provider === 'youtube-music' ? 'YouTube Music' : 'Yerel müzik',
            monthlyListeners: track.provider === 'audius' ? 'Audius kataloğu' : track.provider === 'youtube-music' ? 'YouTube Music' : 'Cihazındaki müzik',
            coverUrl: track.coverUrl,
          });
        }
      });
    youtubeMusicArtists.forEach((artist) => artists.set(artist.id, artist));
    return [...artists.values()];
  }, [allTracks, youtubeMusicArtists]);

  const libraryAlbums = useMemo(() => {
    const groups = new Map<string, Track[]>();
    allTracks
      .filter((track) => track.audioObjectUrl || track.audioUrl || track.provider === 'youtube-music')
      .forEach((track) => {
        const key = track.albumId || track.id;
        const group = groups.get(key) || [];
        group.push(track);
        groups.set(key, group);
      });

    const derivedAlbums = [...groups.entries()]
      .filter(([, group]) => group.length > 1 || group.some((track) => track.isLocal))
      .map(([id, group]) => {
        const first = group[0];
        return {
          id,
          title: first.album || 'Albüm',
          artist: first.artist,
          year: first.year || 0,
          coverUrl: first.coverUrl,
          accentColor: first.accentColor,
          trackIds: group.map((track) => track.id),
        };
      });
    const albumMap = new Map<string, Album>();
    [...youtubeMusicAlbums, ...derivedAlbums].forEach((album) => albumMap.set(album.id, album));
    return [...albumMap.values()];
  }, [allTracks, youtubeMusicAlbums]);

  const prevTrack = useMemo(() => {
    const prevId = getNextTrackId(queue, activeTrack.id, repeat, false, 'prev');
    return prevId ? allTracks.find((t) => t.id === prevId) : undefined;
  }, [queue, activeTrack.id, repeat, allTracks]);

  const nextTrack = useMemo(() => {
    const nextId = getNextTrackId(queue, activeTrack.id, repeat, shuffle, 'next', () => 0);
    return nextId ? allTracks.find((t) => t.id === nextId) : undefined;
  }, [queue, activeTrack.id, repeat, shuffle, allTracks]);

  // Determine effective dark mode from settings.theme
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const darkMode =
    settings.theme === 'dark' ? true : settings.theme === 'light' ? false : systemDark;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.setProperty('--zuno-accent', settings.accentColor);
  }, [darkMode, settings.accentColor]);

  // Persist user data
  useEffect(() => {
    try {
      const payload: PersistedState = {
        settings,
        favorites,
        recentIds,
        playlists,
        downloads,
        searchHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [settings, favorites, recentIds, playlists, downloads, searchHistory]);

  // Sync audio volume & bass boost
  useEffect(() => {
    zunoAudioEngine.setVolume(settings.volume);
    zunoAudioEngine.setBassBoost(settings.bassBoost);
  }, [settings.volume, settings.bassBoost]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);


  // Password recovery links opened by Android are routed through Capacitor's native URL handler.
  useEffect(() => {
    const handleNativeRecovery = () => {
      setPasswordRecoveryMode(true);
      setAccountOpen(true);
    };
    window.addEventListener('zuno:password-recovery', handleNativeRecovery);
    return () => window.removeEventListener('zuno:password-recovery', handleNativeRecovery);
  }, []);

  // Restore the Supabase session on every platform and keep it updated after login/logout.
  useEffect(() => {
    const authClient = supabase;
    if (!authClient) {
      setAuthReady(true);
      setCloudSyncStatus('disabled');
      return;
    }

    let active = true;
    void authClient.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setCloudSyncStatus('error');
      setAuthUser(data.session?.user || null);
      setAuthReady(true);
    }).catch(() => {
      if (!active) return;
      setCloudSyncStatus('error');
      setAuthReady(true);
    });

    const { data: { subscription } } = authClient.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
        setAccountOpen(true);
      } else if (event === 'SIGNED_OUT') {
        setPasswordRecoveryMode(false);
      }
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load a user's cloud library before enabling automatic writes, then listen for other devices.
  useEffect(() => {
    if (!authReady) return;
    const client = supabase;
    if (!client || !authUser) {
      setCloudReadyUserId(null);
      setCloudSyncStatus(isSupabaseConfigured ? 'signed-out' : 'disabled');
      return;
    }

    const userId = authUser.id;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    setCloudReadyUserId(null);
    setCloudSyncStatus('syncing');

    const restoreCloudState = async () => {
      try {
        const { data, error } = await client
          .from('zuno_user_state')
          .select('state')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;

        const restored = normalizeZunoCloudState(data?.state);
        if (restored) {
          setSettings({ ...DEFAULT_SETTINGS, ...restored.settings });
          setFavorites(restored.favorites);
          setRecentIds(restored.recentIds);
          setPlaylists(restored.playlists);
          setSearchHistory(restored.searchHistory);
          lastCloudStateJsonRef.current = JSON.stringify(restored);
        } else {
          // First sign-in: seed this account with the library already on this device.
          const firstState = cloudStateRef.current;
          const { error: insertError } = await client.from('zuno_user_state').upsert({
            user_id: userId,
            state: firstState,
            updated_at: new Date().toISOString(),
          });
          if (insertError) throw insertError;
          lastCloudStateJsonRef.current = JSON.stringify(firstState);
        }

        if (cancelled) return;
        setCloudReadyUserId(userId);
        setCloudSyncStatus('syncing');

        channel = client
          .channel('zuno-user-state-' + userId)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'zuno_user_state',
              filter: 'user_id=eq.' + userId,
            },
            (payload) => {
              const row = payload.new as { state?: unknown };
              const nextState = normalizeZunoCloudState(row?.state);
              if (!nextState) return;
              const serialized = JSON.stringify(nextState);
              if (serialized === lastCloudStateJsonRef.current) return;
              lastCloudStateJsonRef.current = serialized;
              setSettings({ ...DEFAULT_SETTINGS, ...nextState.settings });
              setFavorites(nextState.favorites);
              setRecentIds(nextState.recentIds);
              setPlaylists(nextState.playlists);
              setSearchHistory(nextState.searchHistory);
              setCloudSyncStatus('synced');
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setCloudSyncStatus('synced');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setCloudSyncStatus('error');
            }
          });
      } catch (error) {
        if (cancelled) return;
        setCloudSyncStatus('error');
        showToast(
          error instanceof Error
            ? 'Bulut eşitlemesi kurulamadı: ' + error.message
            : 'Bulut eşitlemesi kurulamadı. Supabase tablo kurulumunu kontrol et.'
        );
      }
    };

    void restoreCloudState();
    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
    };
  }, [authReady, authUser?.id, showToast]);

  // Debounced cloud writes keep settings and library changes synchronized across devices.
  useEffect(() => {
    const client = supabase;
    if (!client || !authUser || cloudReadyUserId !== authUser.id) return;
    const userId = authUser.id;
    const serialized = JSON.stringify(cloudState);
    if (serialized === lastCloudStateJsonRef.current) return;

    const timer = window.setTimeout(() => {
      setCloudSyncStatus('syncing');
      void (async () => {
        try {
          const { error } = await client.from('zuno_user_state').upsert({
            user_id: userId,
            state: cloudState,
            updated_at: new Date().toISOString(),
          });
          if (error) {
            setCloudSyncStatus('error');
            return;
          }
          // Do not mark an older in-flight save as current if another device changed the state meanwhile.
          if (JSON.stringify(cloudStateRef.current) === serialized) {
            lastCloudStateJsonRef.current = serialized;
            setCloudSyncStatus('synced');
          }
        } catch {
          setCloudSyncStatus('error');
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [authUser?.id, cloudReadyUserId, cloudState]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Load live indie music charts on Home and search Audius as the user types.
  useEffect(() => {
    if (activeTab !== 'home' && activeTab !== 'discover') return;
    const controller = new AbortController();
    const query = activeTab === 'discover' ? searchQuery.trim() : '';
    setAudiusLoading(true);
    setAudiusError(null);

    const timer = window.setTimeout(() => {
      const request = query
        ? searchAudiusTracks(query, { signal: controller.signal, limit: 30 })
        : getTrendingAudiusTracks({ signal: controller.signal, limit: 30 });
      void request.then((tracks) => {
        setRemoteTracks((previous) => {
          const merged = new Map(tracks.map((track) => [track.id, track]));
          previous.forEach((track) => {
            if (!merged.has(track.id)) merged.set(track.id, track);
          });
          return [...merged.values()].slice(0, 150);
        });
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAudiusError(error instanceof Error ? error.message : 'Audius kataloğu yüklenemedi.');
      }).finally(() => {
        if (!controller.signal.aborted) setAudiusLoading(false);
      });
    }, query ? 350 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, searchQuery]);

  // Home starts with real public YouTube Music catalogue results, without requiring a key.
  useEffect(() => {
    if (activeTab !== 'home' || youtubeMusicTracks.length > 0) return;
    const controller = new AbortController();
    setYoutubeMusicLoading(true);
    setYoutubeMusicError(null);
    void searchYouTubeMusic('popular songs', { signal: controller.signal })
      .then((results) => {
        if (controller.signal.aborted) return;
        setYoutubeMusicTracks(results.tracks);
        setYoutubeMusicAlbums(results.albums);
        setYoutubeMusicArtists(results.artists);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setYoutubeMusicError(error instanceof Error ? error.message : 'YouTube Music kataloğu açılamadı.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setYoutubeMusicLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, youtubeMusicTracks.length]);

  // Search the same YouTube Music catalogue used by Zuno, only after the user submits a query.
  useEffect(() => {
    const query = youtubeSearchQuery.trim();
    if (activeTab !== 'discover' || query.length < 2) return;

    const controller = new AbortController();
    setYoutubeMusicLoading(true);
    setYoutubeMusicError(null);
    const timer = window.setTimeout(() => {
      void searchYouTubeMusic(query, { signal: controller.signal })
        .then((results) => {
          if (controller.signal.aborted) return;
          setYoutubeMusicTracks(results.tracks);
          setYoutubeMusicAlbums(results.albums);
          setYoutubeMusicArtists(results.artists);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setYoutubeMusicTracks([]);
          setYoutubeMusicAlbums([]);
          setYoutubeMusicArtists([]);
          setYoutubeMusicError(error instanceof Error ? error.message : 'YouTube Music araması başarısız oldu.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setYoutubeMusicLoading(false);
        });
    }, 150);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, youtubeSearchQuery]);

  // Restore imported audio and completed offline downloads from persistent IndexedDB storage.
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    void listAudioFiles().then(async (records) => {
      const restoredLocals: Track[] = [];
      const restoredCatalog: Track[] = [];
      for (const record of records) {
        if (cancelled) break;
        const objectUrl = URL.createObjectURL(record.blob);
        objectUrls.push(objectUrl);
        if (record.sourceTrackId) {
          const sourceTrack = record.trackMetadata;
          if (!sourceTrack) continue;
          restoredCatalog.push({
            ...sourceTrack,
            audioFileId: record.id,
            audioObjectUrl: objectUrl,
            fileSizeMb: Number((record.size / (1024 * 1024)).toFixed(1)),
          });
        } else {
          const title = record.name.replace(/\.[^/.]+$/, '');
          restoredLocals.push({
            id: record.id,
            title,
            artist: 'Yerel Dosya',
            album: 'İçe Aktarılan Müzikler',
            albumId: 'alb-local-import',
            durationSec: await readAudioDuration(record.blob),
            coverUrl: restoredLocals.length % 2 === 0 ? COVER_SUBZERO : COVER_PRISM,
            category: 'songs',
            accentColor: DEFAULT_SETTINGS.accentColor,
            ambientColor: '#1d2b44',
            bpm: 105,
            rootNoteHz: 196,
            fileSizeMb: Number((record.size / (1024 * 1024)).toFixed(1)),
            folderName: 'Cihaz / İçe Aktarılanlar',
            isLocal: true,
            audioFileId: record.id,
            audioObjectUrl: objectUrl,
          });
        }
      }
      if (cancelled) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setLocalTracks((previous) => {
        const existingIds = new Set(previous.map((track) => track.id));
        return [...restoredLocals.filter((track) => !existingIds.has(track.id)), ...previous];
      });
      setOfflineCatalogTracks(restoredCatalog);
      setDownloads(restoredCatalog.map((track) => ({
        id: `offline-${track.id}`,
        trackId: track.id,
        status: 'completed' as const,
        progress: 100,
        downloadedMb: track.fileSizeMb,
        totalMb: track.fileSizeMb,
        addedAt: Date.now(),
      })));
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Bilinmeyen depolama hatası';
      showToast(`Kayıtlı müzikler açılamadı: ${message}`);
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [showToast]);

  const handlePlayTrack = useCallback(
    (track: Track, contextIds?: string[]) => {
      if (!track.audioObjectUrl && !track.audioUrl) {
        showToast('Bu parça için henüz gerçek ses kaynağı bağlı değil. Kendi ses dosyanı kütüphaneye ekleyebilirsin.');
        return;
      }
      if (contextIds && contextIds.length > 0) {
        setQueue(contextIds);
      } else {
        const playableIds = allTracks
          .filter((item) => item.audioObjectUrl || item.audioUrl)
          .map((item) => item.id);
        setQueue((previous) => {
          const retained = previous.filter((id) => id !== track.id && playableIds.includes(id));
          return [track.id, ...retained, ...playableIds.filter((id) => id !== track.id && !retained.includes(id))];
        });
      }

      if (activeTrackId === track.id) {
        if (isPlaying) {
          zunoAudioEngine.pause();
          setIsPlaying(false);
        } else {
          const resumed = zunoAudioEngine.resume(track, currentTimeSec);
          setIsPlaying(resumed);
        }
        return;
      }

      setActiveTrackId(track.id);
      setCurrentTimeSec(0);
      const started = zunoAudioEngine.startTrack(track, 0);
      setIsPlaying(started);
      if (!started) return;
      setRecentIds((prev) => [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 12));
    },
    [activeTrackId, allTracks, currentTimeSec, isPlaying, queue, showToast]
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      zunoAudioEngine.pause();
      setIsPlaying(false);
    } else {
      const resumed = zunoAudioEngine.resume(activeTrack, currentTimeSec);
      setIsPlaying(resumed);
      if (!resumed) showToast('Bu parça için oynatılabilir ses kaynağı bulunamadı.');
    }
  }, [activeTrack, currentTimeSec, isPlaying, showToast]);

  const handleSkip = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'prev' && currentTimeSec > 4) {
        setCurrentTimeSec(0);
        zunoAudioEngine.seek(0);
        return;
      }
      const nextId = getNextTrackId(queue, activeTrack.id, repeat, shuffle, direction);
      if (!nextId) {
        zunoAudioEngine.pause();
        setIsPlaying(false);
        return;
      }
      const nextTrack = allTracks.find((t) => t.id === nextId);
      if (!nextTrack) return;
      setActiveTrackId(nextTrack.id);
      setCurrentTimeSec(0);
      setIsPlaying(true);
      const started = zunoAudioEngine.startTrack(nextTrack, 0);
      setIsPlaying(started);
      if (!started) {
        showToast('Sıradaki parça için gerçek ses kaynağı bulunamadı.');
        return;
      }
      setRecentIds((prev) => [nextTrack.id, ...prev.filter((id) => id !== nextTrack.id)].slice(0, 12));
    },
    [activeTrack.id, allTracks, currentTimeSec, queue, repeat, shuffle, showToast]
  );

  const handleSetSleepTimer = useCallback(
    (minutes: number | null) => {
      setSleepTimerMin(minutes);
      if (minutes === null) {
        setSleepRemainingSec(null);
        showToast('Uyku zamanlayıcısı kapatıldı');
      } else {
        setSleepRemainingSec(minutes * 60);
        showToast(`Uyku zamanlayıcısı: ${minutes} dakika`);
      }
    },
    [showToast]
  );

  // Read playback time from the real media element instead of a simulated timer.
  useEffect(() => {
    zunoAudioEngine.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  // Send real track metadata and transport actions to supported system media controls.
  useEffect(() => {
    if (selectedYoutubeVideo || !activeTrack.id || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const session = navigator.mediaSession;
    const artworkUrl = new URL(activeTrack.coverUrl, window.location.href).href;

    try {
      session.metadata = new MediaMetadata({
        title: activeTrack.title,
        artist: activeTrack.artist,
        album: activeTrack.album,
        artwork: [{ src: artworkUrl, sizes: '512x512' }],
      });
      session.playbackState = isPlaying ? 'playing' : 'paused';
      const registerAction = (
        action: MediaSessionAction,
        handler: MediaSessionActionHandler
      ) => {
        try {
          session.setActionHandler(action, handler);
        } catch {
          // Unsupported media actions must not prevent other controls from registering.
        }
      };
      registerAction('play', () => {
        if (!isPlaying) handleTogglePlay();
      });
      registerAction('pause', () => {
        if (isPlaying) handleTogglePlay();
      });
      registerAction('previoustrack', () => handleSkip('prev'));
      registerAction('nexttrack', () => handleSkip('next'));
      registerAction('seekbackward', (details) => {
        const next = Math.max(0, zunoAudioEngine.getCurrentTime() - (details.seekOffset || 10));
        zunoAudioEngine.seek(next);
        setCurrentTimeSec(Math.floor(next));
      });
      registerAction('seekforward', (details) => {
        const next = Math.min(zunoAudioEngine.getDuration(), zunoAudioEngine.getCurrentTime() + (details.seekOffset || 10));
        zunoAudioEngine.seek(next);
        setCurrentTimeSec(Math.floor(next));
      });
      registerAction('seekto', (details) => {
        if (typeof details.seekTime !== 'number') return;
        zunoAudioEngine.seek(details.seekTime);
        setCurrentTimeSec(Math.floor(details.seekTime));
      });
    } catch {
      // Some WebViews expose only part of the Media Session API.
    }

    return () => {
      try {
        session.setActionHandler('play', null);
        session.setActionHandler('pause', null);
        session.setActionHandler('previoustrack', null);
        session.setActionHandler('nexttrack', null);
        session.setActionHandler('seekbackward', null);
        session.setActionHandler('seekforward', null);
        session.setActionHandler('seekto', null);
      } catch {
        // Unsupported action handlers are ignored.
      }
    };
  }, [activeTrack, handleSkip, handleTogglePlay, isPlaying, selectedYoutubeVideo?.videoId]);



  useEffect(() => {
    handleSkipRef.current = handleSkip;
  }, [handleSkip]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      if (zunoAudioEngine.hasEnded()) {
        handleSkipRef.current('next');
        return;
      }
      const current = zunoAudioEngine.getCurrentTime();
      setCurrentTimeSec(Math.floor(current));
      const duration = zunoAudioEngine.getDuration();
      if ('mediaSession' in navigator && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate,
            position: Math.min(current, duration),
          });
        } catch {
          // Position state is optional on older WebViews.
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  // Sleep timer countdown loop
  useEffect(() => {
    if (!isPlaying || sleepRemainingSec === null) return;
    const timer = window.setInterval(() => {
      setSleepRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          zunoAudioEngine.pause();
          setIsPlaying(false);
          setSleepTimerMin(null);
          showToast('Uyku zamanlayıcısı tamamlandı, oynatma duraklatıldı');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, sleepRemainingSec !== null, showToast]);

  const handleDownloadTrack = useCallback(
    async (track: Track) => {
      const existing = downloads.find((item) => item.trackId === track.id);
      if (existing?.status === 'completed') {
        showToast(`${track.title} çevrimdışı kullanıma hazır`);
        return;
      }
      if (existing?.status === 'downloading') {
        const runningController = downloadControllersRef.current.get(existing.id);
        if (runningController) {
          runningController.abort();
        } else {
          showToast('İndirme işlemi zaten çalışıyor.');
        }
        return;
      }
      if (track.provider === 'audius' && !track.downloadable) {
        showToast('Bu parçanın sanatçısı indirmeye izin vermiyor. Çevrimiçi dinleyebilirsin.');
        return;
      }
      if (!track.downloadUrl) {
        if (track.isLocal && track.audioFileId) {
          const size = track.fileSizeMb;
          const item: DownloadItem = {
            id: `offline-${track.id}`,
            trackId: track.id,
            status: 'completed',
            progress: 100,
            downloadedMb: size,
            totalMb: size,
            addedAt: Date.now(),
          };
          setDownloads((previous) => [item, ...previous.filter((download) => download.trackId !== track.id)]);
          showToast(`${track.title} zaten bu cihazda saklanıyor`);
        } else {
          showToast('Bu parça için gerçek ses bağlantısı henüz eklenmedi; sahte indirme başlatılmadı.');
        }
        return;
      }

      const downloadId = existing?.id || `dl-${Date.now()}-${track.id}`;
      const controller = new AbortController();
      downloadControllersRef.current.set(downloadId, controller);
      const initialItem: DownloadItem = {
        id: downloadId,
        trackId: track.id,
        status: 'downloading',
        progress: 0,
        downloadedMb: 0,
        totalMb: 0,
        addedAt: Date.now(),
      };
      setDownloads((previous) => [initialItem, ...previous.filter((download) => download.id !== downloadId)]);
      showToast(`İndirme başlatıldı: ${track.title}`);

      try {
        const blob = await fetchAudioBlob(
          track.downloadUrl,
          (loadedBytes, totalBytes) => {
            const totalMb = totalBytes / (1024 * 1024);
            const downloadedMb = loadedBytes / (1024 * 1024);
            setDownloads((previous) => previous.map((item) => item.id === downloadId
              ? {
                  ...item,
                  downloadedMb: Number(downloadedMb.toFixed(2)),
                  totalMb: Number(totalMb.toFixed(2)),
                  progress: totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : 0,
                }
              : item));
          },
          controller.signal
        );
        const fileId = `offline-${track.id}`;
        const fileName = `${track.title.replace(/[\\/:*?"<>|]/g, '_')}.audio`;
        await saveAudioFile(fileId, blob, fileName, track.id, track);
        const audioObjectUrl = URL.createObjectURL(blob);
        const cachedTrack: Track = {
          ...track,
          audioFileId: fileId,
          audioObjectUrl,
          fileSizeMb: Number((blob.size / (1024 * 1024)).toFixed(2)),
        };
        setOfflineCatalogTracks((previous) => [
          cachedTrack,
          ...previous.filter((item) => item.id !== track.id),
        ]);
        const sizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));
        setDownloads((previous) => previous.map((item) => item.id === downloadId
          ? { ...item, status: 'completed', progress: 100, downloadedMb: sizeMb, totalMb: sizeMb }
          : item));
        showToast(`İndirme tamamlandı: ${track.title}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'İndirme başarısız oldu.';
        if (controller.signal.aborted) {
          setDownloads((previous) => previous.map((item) => item.id === downloadId
            ? { ...item, status: 'paused', progress: 0, downloadedMb: 0 }
            : item));
        } else {
          setDownloads((previous) => previous.map((item) => item.id === downloadId
            ? { ...item, status: 'error', errorMessage: message }
            : item));
          showToast(`${track.title} indirilemedi: ${message}`);
        }
      } finally {
        downloadControllersRef.current.delete(downloadId);
      }
    },
    [downloads, showToast]
  );

  const handleToggleFavorite = useCallback((trackId: string) => {
    setFavorites((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [trackId, ...prev]
    );
  }, []);

  const handleImportLocalFiles = useCallback(
    async (files: FileList) => {
      const audioFiles = Array.from(files).filter((file) =>
        file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|flac|ogg|opus|wma)$/i.test(file.name)
      );
      if (audioFiles.length === 0) {
        showToast('Desteklenen bir ses dosyası seçilmedi.');
        return;
      }

      const results = await Promise.allSettled(audioFiles.map(async (file) => {
        const id = createAudioId();
        await saveAudioFile(id, file);
        const audioObjectUrl = URL.createObjectURL(file);
        const durationSec = await readAudioDuration(file);
        return {
          id,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Yerel Dosya',
          album: 'İçe Aktarılan Müzikler',
          albumId: 'alb-local-import',
          durationSec,
          coverUrl: COVER_SUBZERO,
          category: 'songs' as const,
          accentColor: settings.accentColor,
          ambientColor: '#1d2b44',
          bpm: 105,
          rootNoteHz: 196,
          fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
          folderName: 'Cihaz / İçe Aktarılanlar',
          isLocal: true,
          audioFileId: id,
          audioObjectUrl,
        } satisfies Track;
      }));

      const imported: Track[] = [];
      let failures = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          imported.push(result.value as Track);
        } else {
          failures += 1;
        }
      });
      if (imported.length > 0) {
        setLocalTracks((previous) => [...imported, ...previous]);
        showToast(`${imported.length} ses dosyası kalıcı müzik kütüphanesine eklendi`);
      }
      if (failures > 0) {
        showToast(`${failures} dosya cihaz depolamasına kaydedilemedi`);
      }
    },
    [settings.accentColor, showToast]
  );

  const handleDeleteLocalTrack = useCallback(async (trackId: string) => {
    const track = localTracks.find((item) => item.id === trackId);
    if (!track) return;
    try {
      await deleteAudioFile(track.audioFileId || track.id);
      if (track.audioObjectUrl) URL.revokeObjectURL(track.audioObjectUrl);
      if (activeTrackId === trackId) {
        zunoAudioEngine.pause();
        setIsPlaying(false);
        setCurrentTimeSec(0);
        setActiveTrackId('');
      }
      setLocalTracks((previous) => previous.filter((item) => item.id !== trackId));
      setDownloads((previous) => previous.filter((item) => item.trackId !== trackId));
      setQueue((previous) => previous.filter((id) => id !== trackId));
      setFavorites((previous) => previous.filter((id) => id !== trackId));
      setRecentIds((previous) => previous.filter((id) => id !== trackId));
      setPlaylists((previous) => previous.map((playlist) => ({
        ...playlist,
        trackIds: playlist.trackIds.filter((id) => id !== trackId),
      })));
      showToast(`${track.title} cihazdan silindi`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Dosya silinemedi.');
    }
  }, [activeTrackId, localTracks, showToast]);

  const navItems: FlowingTabItem[] = [
    { id: 'home', label: 'Ana Sayfa', icon: <Home className="h-[18px] w-[18px]" /> },
    { id: 'discover', label: 'Keşfet', icon: <Compass className="h-[18px] w-[18px]" /> },
    { id: 'library', label: 'Kütüphane', icon: <Library className="h-[18px] w-[18px]" /> },
    { id: 'downloads', label: 'İndirilenler', icon: <Download className="h-[18px] w-[18px]" /> },
  ];

  const activeDownloadsCount = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
  ).length;

  const queueTracks = queue
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t));

  const storageUsedMb =
    cacheMb +
    localTracks.reduce((sum, track) => sum + track.fileSizeMb, 0) +
    downloads.reduce((sum, item) => sum + item.downloadedMb, 0);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-[#07090e] text-[#f2f5f9]' : 'bg-[#f4f6fa] text-[#0c1118]'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-medium shadow-2xl backdrop-blur-xl ${
            darkMode
              ? 'border-white/15 bg-[#141925]/95 text-white'
              : 'border-slate-200 bg-white/95 text-slate-900'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: settings.accentColor }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop + Mobile Responsive App Shell */}
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        {/* Desktop Left Navigation Rail */}
        <aside
          className={`hidden lg:flex w-64 shrink-0 flex-col justify-between border-r p-5 sticky top-0 h-screen ${
            darkMode ? 'border-white/[0.07] bg-[#0a0d14]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="space-y-7">
            <div className="px-1">
              <ZunoLogo accentColor={settings.accentColor} size={30} />
            </div>

            <nav aria-label="Ana menü" className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = !settingsOpen && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setActiveTab(item.id as NavTabId);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'font-semibold'
                        : darkMode
                          ? 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${settings.accentColor}22`,
                            color: settings.accentColor,
                          }
                        : undefined
                    }
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'downloads' && activeDownloadsCount > 0 && (
                      <span
                        className="text-xs font-mono-num font-semibold"
                        style={{ color: settings.accentColor }}
                      >
                        {activeDownloadsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-current/[0.07] space-y-2">
              <div className="px-2 text-xs font-medium opacity-55">Çalma listelerin</div>
              <div className="space-y-1">
                {playlists.slice(0, 4).map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      const first = allTracks.find((t) => t.id === pl.trackIds[0]);
                      if (first) handlePlayTrack(first, pl.trackIds);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                      darkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-100'
                    }`}
                  >
                    <ArtworkImage
                      src={pl.coverUrl}
                      alt={pl.name}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded-lg object-cover shrink-0"
                    />
                    <span className="truncate font-medium opacity-85">{pl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors ${
              settingsOpen
                ? 'font-semibold'
                : darkMode
                  ? 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            style={
              settingsOpen
                ? {
                    backgroundColor: `${settings.accentColor}22`,
                    color: settings.accentColor,
                  }
                : undefined
            }
          >
            <Settings className="h-[18px] w-[18px]" />
            <span>Ayarlar</span>
          </button>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Compact Top Bar */}
          <header
            className={`sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b px-4 sm:px-6 backdrop-blur-xl ${
              darkMode
                ? 'border-white/[0.06] bg-[#07090e]/85'
                : 'border-slate-200/80 bg-[#f4f6fa]/85'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden">
                <ZunoLogo accentColor={settings.accentColor} size={26} />
              </div>
              <span className="hidden sm:inline text-xs font-medium opacity-60 truncate">
                {settingsOpen
                  ? 'Ayarlar'
                  : activeTab === 'home'
                    ? 'Müziğin seni bekliyor'
                    : activeTab === 'discover'
                      ? 'Keşfet ve ara'
                      : activeTab === 'library'
                        ? 'Kişisel kütüphanen'
                        : 'Çevrimdışı indirmeler'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="./download.html"
                aria-label="ZUNO Music'i indir"
                title="ZUNO Music'i indir"
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${darkMode ? 'border-white/15 bg-white/[0.04] text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">İndir</span>
              </a>
              <PwaInstallButton accentColor={settings.accentColor} darkMode={darkMode} />
              <button
                type="button"
                aria-label={authUser ? 'Hesap ve senkronizasyon' : 'Giriş yap'}
                title={authUser?.email || 'ZUNO hesabı'}
                onClick={() => setAccountOpen(true)}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-900/10'
                }`}
                style={authUser ? { color: settings.accentColor } : undefined}
              >
                {authUser?.email ? (
                  <span className="text-sm font-bold">{authUser.email.slice(0, 1).toUpperCase()}</span>
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                aria-label="Ayarlar"
                onClick={() => setSettingsOpen((v) => !v)}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  settingsOpen
                    ? 'bg-white/15'
                    : darkMode
                      ? 'hover:bg-white/10'
                      : 'hover:bg-slate-900/10'
                }`}
                style={settingsOpen ? { color: settings.accentColor } : undefined}
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Main Scrollable View */}
          <main className="flex-1 px-4 pt-5 pb-44 sm:px-6 lg:pb-10">
            {settingsOpen ? (
              <SettingsView
                settings={settings}
                onUpdate={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
                storageUsedMb={storageUsedMb}
                onClearCache={() => {
                  setCacheMb(0);
                  showToast('Önbellek temizlendi');
                }}
                onBack={() => setSettingsOpen(false)}
                darkMode={darkMode}
              />
            ) : activeTab === 'home' ? (
              <HomeView
                tracks={allTracks}
                albums={libraryAlbums}
                recentTrackIds={recentIds}
                activeTrack={activeTrack}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onOpenAlbum={(album) => setSelectedAlbum(album)}
                onOpenDiscover={() => setActiveTab('discover')}
                accentColor={settings.accentColor}
                darkMode={darkMode}
              />
            ) : activeTab === 'discover' ? (
              <DiscoverView
                tracks={allTracks}
                albums={libraryAlbums}
                artists={libraryArtists}
                playlists={playlists}
                downloads={downloads}
                remoteLoading={audiusLoading}
                remoteError={audiusError}
                youtubeVideos={youtubeVideos}
                youtubeLoading={youtubeLoading}
                youtubeError={youtubeError}
                youtubeNeedsSubmit={searchQuery.trim() !== youtubeSearchQuery.trim()}
                onOpenYouTube={(video) => {
                  if (isPlaying) {
                    zunoAudioEngine.pause();
                    setIsPlaying(false);
                  }
                  setSelectedYoutubeVideo(video);
                }}
                favoriteIds={favorites}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                category={searchCategory}
                onCategoryChange={setSearchCategory}
                searchHistory={searchHistory}
                onSubmitSearch={(q) => {
                  const trimmed = q.trim();
                  if (!trimmed) return;
                  setSearchHistory((prev) =>
                    [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 8)
                  );
                  setYoutubeSearchQuery(
                    searchCategory === 'all' || searchCategory === 'songs' || searchCategory === 'videos' ? trimmed : ''
                  );
                }}
                onClearHistory={() => setSearchHistory([])}
                activeTrackId={activeTrack.id}
                onPlayTrack={handlePlayTrack}
                onOpenAlbum={(album) => setSelectedAlbum(album)}
                onAddToQueue={(track) => {
                  setQueue((prev) => (prev.includes(track.id) ? prev : [...prev, track.id]));
                  showToast(`Sıraya eklendi: ${track.title}`);
                }}
                onToggleFavorite={handleToggleFavorite}
                onDownloadTrack={handleDownloadTrack}
                onAddToPlaylist={(plId, trId) => {
                  setPlaylists((prev) =>
                    prev.map((p) =>
                      p.id === plId && !p.trackIds.includes(trId)
                        ? { ...p, trackIds: [...p.trackIds, trId], updatedAt: Date.now() }
                        : p
                    )
                  );
                  showToast('Çalma listesine eklendi');
                }}
                accentColor={settings.accentColor}
                tabStyle={settings.tabStyle}
                knobShape={settings.knobShape}
                darkMode={darkMode}
              />
            ) : activeTab === 'library' ? (
              <LibraryView
                tracks={allTracks.filter((track) => !track.isLocal)}
                localTracks={localTracks}
                albums={libraryAlbums}
                artists={libraryArtists}
                playlists={playlists}
                favoriteIds={favorites}
                recentTrackIds={recentIds}
                activeTrackId={activeTrack.id}
                onPlayTrack={handlePlayTrack}
                onOpenAlbum={(album) => setSelectedAlbum(album)}
                onToggleFavorite={handleToggleFavorite}
                onCreatePlaylist={(name, description) => {
                  const newPl: Playlist = {
                    id: `pl-${Date.now()}`,
                    name,
                    description: description || 'Kişisel çalma listesi',
                    coverUrl: activeTrack.coverUrl,
                    trackIds: activeTrack.id ? [activeTrack.id] : [],
                    isUserCreated: true,
                    updatedAt: Date.now(),
                  };
                  setPlaylists((prev) => [newPl, ...prev]);
                  showToast(`Liste oluşturuldu: ${name}`);
                }}
                onRenamePlaylist={(id, newName) => {
                  setPlaylists((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, name: newName, updatedAt: Date.now() } : p))
                  );
                }}
                onDeletePlaylist={(id) => {
                  setPlaylists((prev) => prev.filter((p) => p.id !== id));
                  showToast('Çalma listesi silindi');
                }}
                onRemoveTrackFromPlaylist={(plId, trId) => {
                  setPlaylists((prev) =>
                    prev.map((p) =>
                      p.id === plId
                        ? { ...p, trackIds: p.trackIds.filter((id) => id !== trId) }
                        : p
                    )
                  );
                }}
                onImportLocalFiles={handleImportLocalFiles}
                onDeleteLocalTrack={handleDeleteLocalTrack}
                accentColor={settings.accentColor}
                tabStyle={settings.tabStyle}
                knobShape={settings.knobShape}
                darkMode={darkMode}
              />
            ) : (
              <DownloadsView
                downloads={downloads}
                tracks={allTracks}
                onTogglePause={(dlId) => {
                  const item = downloads.find((download) => download.id === dlId);
                  const controller = downloadControllersRef.current.get(dlId);
                  if (controller) {
                    controller.abort();
                  } else if (item?.status === 'paused' || item?.status === 'error') {
                    const track = allTracks.find((candidate) => candidate.id === item.trackId);
                    if (track) void handleDownloadTrack(track);
                  }
                }}
                onRetry={(dlId) => {
                  const item = downloads.find((download) => download.id === dlId);
                  const track = item && allTracks.find((candidate) => candidate.id === item.trackId);
                  if (track) void handleDownloadTrack(track);
                }}
                onCancel={async (dlId) => {
                  downloadControllersRef.current.get(dlId)?.abort();
                  const item = downloads.find((download) => download.id === dlId);
                  const cachedTrack = item && allTracks.find((track) => track.id === item.trackId);
                  if (cachedTrack?.audioFileId && !cachedTrack.isLocal) {
                    try {
                      await deleteAudioFile(cachedTrack.audioFileId);
                      if (cachedTrack.audioObjectUrl) URL.revokeObjectURL(cachedTrack.audioObjectUrl);
                      setOfflineCatalogTracks((previous) => previous.filter((track) => track.id !== cachedTrack.id));
                    } catch (error) {
                      showToast(error instanceof Error ? error.message : 'Çevrimdışı dosya silinemedi.');
                      return;
                    }
                  }
                  setDownloads((previous) => previous.filter((download) => download.id !== dlId));
                  showToast('İndirme kaydı kaldırıldı');
                }}
                onPlayTrack={(tr) => handlePlayTrack(tr)}
                accentColor={settings.accentColor}
                darkMode={darkMode}
              />
            )}
          </main>
        </div>

        {/* Desktop Right Live Player Sidebar */}
        <aside
          className={`hidden xl:flex w-[340px] shrink-0 flex-col justify-between border-l p-5 sticky top-0 h-screen ${
            darkMode ? 'border-white/[0.07] bg-[#0a0d14]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-60">{activeTrack.id ? 'Şimdi Oynatılıyor' : 'Oynatıcı hazır'}</span>
              <button
                type="button"
                aria-label="Tam ekran oynatıcıyı aç"
                onClick={() => setPlayerFullscreen(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium opacity-75 hover:bg-white/10 hover:opacity-100"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Tam Ekran</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPlayerFullscreen(true)}
              aria-label={`Tam ekran oynatıcıyı aç: ${activeTrack.title}`}
              className="group relative block w-full aspect-square overflow-hidden rounded-3xl bg-slate-900 shadow-xl"
            >
              <ArtworkImage
                src={activeTrack.coverUrl}
                alt={activeTrack.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-bold">{activeTrack.title}</div>
                <div className="truncate text-xs opacity-65">{activeTrack.artist}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label="Favori"
                  onClick={() => handleToggleFavorite(activeTrack.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <Heart
                    className="h-4 w-4"
                    fill={favorites.includes(activeTrack.id) ? settings.accentColor : 'none'}
                    style={
                      favorites.includes(activeTrack.id)
                        ? { color: settings.accentColor }
                        : undefined
                    }
                  />
                </button>
                <DownloadActionButton
                  status={downloads.find((d) => d.trackId === activeTrack.id)?.status}
                  progress={downloads.find((d) => d.trackId === activeTrack.id)?.progress}
                  onTrigger={() => handleDownloadTrack(activeTrack)}
                  accentColor={
                    settings.dynamicPlayerColors ? activeTrack.accentColor : settings.accentColor
                  }
                  shapeId={settings.knobShape}
                  compact
                  ariaLabel={`${activeTrack.title} indir`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <LiquidSlider
                value={activeTrack.durationSec > 0 ? currentTimeSec / activeTrack.durationSec : 0}
                onChange={(ratio) => {
                  const nextSec = Math.round(ratio * activeTrack.durationSec);
                  setCurrentTimeSec(nextSec);
                  zunoAudioEngine.seek(nextSec);
                }}
                accentColor={
                  settings.dynamicPlayerColors ? activeTrack.accentColor : settings.accentColor
                }
                shapeId={settings.knobShape}
                waveAmp={settings.waveAmplitude}
                speed={settings.animationSpeed}
                height={32}
                ariaLabel="Oynatma ilerlemesi"
                darkMode={darkMode}
              />
              <div className="flex justify-between text-[11px] opacity-60 tabular-nums font-mono-num">
                <span>{formatDuration(currentTimeSec)}</span>
                <span>{formatDuration(activeTrack.durationSec)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Önceki"
                onClick={() => handleSkip('prev')}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
              >
                <SkipBack className="h-5 w-5 fill-current" />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
                onClick={handleTogglePlay}
                className="flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
                style={{
                  backgroundColor: settings.dynamicPlayerColors
                    ? activeTrack.accentColor
                    : settings.accentColor,
                  color: '#0b0e16',
                }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                aria-label="Sonraki"
                onClick={() => handleSkip('next')}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Upcoming Queue Preview */}
          <div className="mt-4 pt-4 border-t border-current/[0.07] overflow-y-auto space-y-2">
            <div className="text-xs font-medium opacity-60">Sıradakiler</div>
            {queueTracks.slice(0, 3).map((qt) => (
              <button
                key={qt.id}
                type="button"
                onClick={() => handlePlayTrack(qt)}
                className={`flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors ${
                  darkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-100'
                }`}
              >
                <ArtworkImage
                  src={qt.coverUrl}
                  alt={qt.title}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-xs font-semibold"
                    style={qt.id === activeTrack.id ? { color: settings.accentColor } : undefined}
                  >
                    {qt.title}
                  </div>
                  <div className="truncate text-[11px] opacity-60">{qt.artist}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* Floating mobile playback island */}
      {!playerFullscreen && activeTrack.id && !selectedYoutubeVideo && (
        <DynamicIslandPlayer
          track={activeTrack}
          isPlaying={isPlaying}
          currentTimeSec={currentTimeSec}
          onExpand={() => setPlayerFullscreen(true)}
          onTogglePlay={handleTogglePlay}
          onNext={() => handleSkip('next')}
          accentColor={settings.dynamicPlayerColors ? activeTrack.accentColor : settings.accentColor}
        />
      )}

      {/* Mobile / Tablet Bottom Dock: Navigation */}
      <div
        data-testid="mobile-dock"
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 pt-4 pointer-events-none bg-gradient-to-t ${
          darkMode
            ? 'from-[#07090e] via-[#07090e]/92 to-transparent'
            : 'from-[#f4f6fa] via-[#f4f6fa]/92 to-transparent'
        }`}
      >
        <div className="mx-auto max-w-md space-y-2 pointer-events-auto">
          <FlowingTabs
            items={navItems}
            activeId={activeTab}
            onSelect={(id) => {
              setSettingsOpen(false);
              setActiveTab(id as NavTabId);
            }}
            accentColor={settings.accentColor}
            styleMode={settings.tabStyle}
            shapeId={settings.knobShape}
            speed={settings.animationSpeed}
            darkMode={darkMode}
            ariaLabel="Alt navigasyon"
          />
        </div>
      </div>

      {/* Tablet / Desktop medium MiniPlayer bar (lg..xl where right sidebar isn't shown) */}
      {activeTrack.id && <div className="hidden lg:block xl:hidden fixed bottom-4 right-6 z-30 w-96">
        <MiniPlayer
          track={activeTrack}
          prevTrack={prevTrack}
          nextTrack={nextTrack}
          isPlaying={isPlaying}
          isFavorite={favorites.includes(activeTrack.id)}
          currentTimeSec={currentTimeSec}
          sleepRemainingSec={sleepRemainingSec}
          onTogglePlay={handleTogglePlay}
          onToggleFavorite={() => handleToggleFavorite(activeTrack.id)}
          onPrev={() => handleSkip('prev')}
          onNext={() => handleSkip('next')}
          onSeekRatio={(ratio) => {
            const nextSec = Math.round(ratio * activeTrack.durationSec);
            setCurrentTimeSec(nextSec);
            zunoAudioEngine.seek(nextSec);
          }}
          onExpand={() => setPlayerFullscreen(true)}
          accentColor={
            settings.dynamicPlayerColors ? activeTrack.accentColor : settings.accentColor
          }
          darkMode={darkMode}
        />
      </div>}

      {/* Fullscreen Immersive Player */}
      <FullscreenPlayer
        open={playerFullscreen && Boolean(activeTrack.id)}
        track={activeTrack}
        queueTracks={queueTracks}
        isPlaying={isPlaying}
        currentTimeSec={currentTimeSec}
        shuffle={shuffle}
        repeat={repeat}
        isFavorite={favorites.includes(activeTrack.id)}
        downloadItem={downloads.find((d) => d.trackId === activeTrack.id)}
        volume={settings.volume}
        playbackRate={playbackRate}
        sleepTimerMin={sleepTimerMin}
        sleepRemainingSec={sleepRemainingSec}
        waveAmp={settings.waveAmplitude}
        animSpeed={settings.animationSpeed}
        knobShape={settings.knobShape}
        dynamicColors={settings.dynamicPlayerColors}
        globalAccent={settings.accentColor}
        onClose={() => setPlayerFullscreen(false)}
        onTogglePlay={handleTogglePlay}
        onPrev={() => handleSkip('prev')}
        onNext={() => handleSkip('next')}
        onSeekRatio={(ratio) => {
          const nextSec = Math.round(ratio * activeTrack.durationSec);
          setCurrentTimeSec(nextSec);
          zunoAudioEngine.seek(nextSec);
        }}
        onToggleShuffle={() => setShuffle((v) => !v)}
        onCycleRepeat={() =>
          setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
        }
        onToggleFavorite={() => handleToggleFavorite(activeTrack.id)}
        onDownload={() => handleDownloadTrack(activeTrack)}
        onVolumeChange={(v) => setSettings((prev) => ({ ...prev, volume: v }))}
        onPlaybackRateChange={(rate) => {
          setPlaybackRate(rate);
          showToast(`Oynatma hızı: ${rate}x`);
        }}
        onSetSleepTimer={handleSetSleepTimer}
        onPlayFromQueue={(tr) => handlePlayTrack(tr)}
        onRemoveFromQueue={(trId) =>
          setQueue((prev) => prev.filter((id) => id !== trId))
        }
      />

      <YouTubePlayerModal
        video={selectedYoutubeVideo}
        onStop={() => setSelectedYoutubeVideo(null)}
      />

      {/* Album Detail Sheet/Modal */}
      <AlbumModal
        album={selectedAlbum}
        tracks={allTracks}
        favoriteIds={favorites}
        downloads={downloads}
        activeTrackId={activeTrack.id}
        onClose={() => setSelectedAlbum(null)}
        onPlayTrack={handlePlayTrack}
        onToggleFavorite={handleToggleFavorite}
        onDownloadTrack={handleDownloadTrack}
        accentColor={settings.accentColor}
        knobShape={settings.knobShape}
        darkMode={darkMode}
      />

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={authUser}
        status={cloudSyncStatus}
        darkMode={darkMode}
        accentColor={settings.accentColor}
        recoveryMode={passwordRecoveryMode}
        onRecoveryComplete={() => setPasswordRecoveryMode(false)}
      />
    </div>
  );
}
