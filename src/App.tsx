import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import type {
  Album,
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
  INITIAL_DOWNLOADS,
  INITIAL_PLAYLISTS,
  ZUNO_ALBUMS,
  ZUNO_ARTISTS,
  ZUNO_LOCAL_TRACKS,
  ZUNO_TRACKS,
} from './data/zunoCatalog';
import { advanceDownloadProgress, formatDuration, getNextTrackId } from './utils/zunoLogic';
import { zunoAudioEngine } from './utils/audioEngine';
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

const STORAGE_KEY = 'zuno-music-state-v1';

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
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : ['tr-1', 'tr-4', 'tr-5'],
        recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds : ['tr-1', 'tr-2', 'tr-3', 'tr-5'],
        playlists: Array.isArray(parsed.playlists) ? parsed.playlists : INITIAL_PLAYLISTS,
        downloads: Array.isArray(parsed.downloads) ? parsed.downloads : INITIAL_DOWNLOADS,
        searchHistory: Array.isArray(parsed.searchHistory)
          ? parsed.searchHistory
          : ['Mert Aras', 'Nocturne', 'Ambient'],
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    settings: DEFAULT_SETTINGS,
    favorites: ['tr-1', 'tr-4', 'tr-5'],
    recentIds: ['tr-1', 'tr-2', 'tr-3', 'tr-5'],
    playlists: INITIAL_PLAYLISTS,
    downloads: INITIAL_DOWNLOADS,
    searchHistory: ['Mert Aras', 'Nocturne', 'Ambient'],
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [settings, setSettings] = useState<ZunoSettings>(initial.settings);
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerFullscreen, setPlayerFullscreen] = useState(false);

  const [localTracks, setLocalTracks] = useState<Track[]>(ZUNO_LOCAL_TRACKS);
  const allTracks = useMemo(() => [...ZUNO_TRACKS, ...localTracks], [localTracks]);

  const [favorites, setFavorites] = useState<string[]>(initial.favorites);
  const [recentIds, setRecentIds] = useState<string[]>(initial.recentIds);
  const [playlists, setPlaylists] = useState<Playlist[]>(initial.playlists);
  const [downloads, setDownloads] = useState<DownloadItem[]>(initial.downloads);
  const [searchHistory, setSearchHistory] = useState<string[]>(initial.searchHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback State
  const [queue, setQueue] = useState<string[]>(() => ZUNO_TRACKS.slice(0, 6).map((t) => t.id));
  const [activeTrackId, setActiveTrackId] = useState<string>(ZUNO_TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(34);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [sleepTimerMin, setSleepTimerMin] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [cacheMb, setCacheMb] = useState(42.5);

  const activeTrack = useMemo(
    () => allTracks.find((t) => t.id === activeTrackId) || allTracks[0],
    [allTracks, activeTrackId]
  );

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

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const handlePlayTrack = useCallback(
    (track: Track, contextIds?: string[]) => {
      if (contextIds && contextIds.length > 0) {
        setQueue(contextIds);
      } else if (!queue.includes(track.id)) {
        setQueue((prev) => [track.id, ...prev]);
      }

      if (activeTrackId === track.id) {
        if (isPlaying) {
          zunoAudioEngine.pause();
          setIsPlaying(false);
        } else {
          zunoAudioEngine.resume(track, currentTimeSec);
          setIsPlaying(true);
        }
        return;
      }

      setActiveTrackId(track.id);
      setCurrentTimeSec(0);
      setIsPlaying(true);
      zunoAudioEngine.startTrack(track, 0);
      setRecentIds((prev) => [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 12));
    },
    [activeTrackId, currentTimeSec, isPlaying, queue]
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      zunoAudioEngine.pause();
      setIsPlaying(false);
    } else {
      zunoAudioEngine.resume(activeTrack, currentTimeSec);
      setIsPlaying(true);
    }
  }, [activeTrack, currentTimeSec, isPlaying]);

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
      zunoAudioEngine.startTrack(nextTrack, 0);
      setRecentIds((prev) => [nextTrack.id, ...prev.filter((id) => id !== nextTrack.id)].slice(0, 12));
    },
    [activeTrack.id, allTracks, currentTimeSec, queue, repeat, shuffle]
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

  // Playback progress loop respecting playbackRate
  useEffect(() => {
    if (!isPlaying) return;
    const tickMs = Math.max(250, Math.round(1000 / Math.max(0.5, playbackRate)));
    const id = window.setInterval(() => {
      setCurrentTimeSec((prev) => {
        if (prev + 1 >= activeTrack.durationSec) {
          handleSkip('next');
          return 0;
        }
        return prev + 1;
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [isPlaying, playbackRate, activeTrack.durationSec, handleSkip]);

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

  // Download manager progression loop
  useEffect(() => {
    const hasActive = downloads.some((d) => d.status === 'downloading');
    if (!hasActive) return;

    const timer = window.setInterval(() => {
      setDownloads((prev) => {
        const newlyCompleted: string[] = [];
        const next = prev.map((d) => {
          if (d.status !== 'downloading') return d;
          const updated = advanceDownloadProgress(d, 14);
          if (updated.status === 'completed') {
            newlyCompleted.push(d.trackId);
          }
          return updated;
        });
        if (newlyCompleted.length > 0) {
          const tr = allTracks.find((t) => t.id === newlyCompleted[0]);
          if (tr) {
            showToast(`İndirme tamamlandı: ${tr.title}`);
          }
        }
        return next;
      });
    }, 450);

    return () => window.clearInterval(timer);
  }, [downloads, allTracks, showToast]);

  const handleDownloadTrack = useCallback(
    (track: Track) => {
      const existing = downloads.find((d) => d.trackId === track.id);
      if (existing) {
        if (existing.status === 'completed') {
          showToast(`${track.title} zaten cihazına indirildi`);
          return;
        }
        if (existing.status === 'paused' || existing.status === 'error') {
          setDownloads((prev) =>
            prev.map((d) => (d.id === existing.id ? { ...d, status: 'downloading' } : d))
          );
          return;
        }
        if (existing.status === 'downloading') {
          setDownloads((prev) =>
            prev.map((d) => (d.id === existing.id ? { ...d, status: 'paused' } : d))
          );
          return;
        }
      }

      const item: DownloadItem = {
        id: `dl-${Date.now()}-${track.id}`,
        trackId: track.id,
        status: 'downloading',
        progress: 8,
        downloadedMb: Number((track.fileSizeMb * 0.08).toFixed(1)),
        totalMb: track.fileSizeMb,
        addedAt: Date.now(),
      };
      setDownloads((prev) => [item, ...prev]);
      showToast(`İndirme başlatıldı: ${track.title}`);
    },
    [downloads, showToast]
  );

  const handleToggleFavorite = useCallback((trackId: string) => {
    setFavorites((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [trackId, ...prev]
    );
  }, []);

  const handleImportLocalFiles = useCallback(
    (files: FileList) => {
      const imported: Track[] = [];
      Array.from(files).forEach((file, idx) => {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const objectUrl = URL.createObjectURL(file);
        imported.push({
          id: `loc-file-${Date.now()}-${idx}`,
          title: cleanName,
          artist: 'Yerel Ses Dosyası',
          album: 'Cihaz İçe Aktarımı',
          albumId: 'alb-local-import',
          durationSec: 180,
          coverUrl: idx % 2 === 0 ? COVER_SUBZERO : COVER_PRISM,
          category: 'songs',
          accentColor: settings.accentColor,
          ambientColor: '#1d2b44',
          bpm: 105,
          rootNoteHz: 196,
          fileSizeMb: Number(Math.max(0.5, file.size / (1024 * 1024)).toFixed(1)),
          folderName: '/Device/Imported',
          isLocal: true,
          audioObjectUrl: objectUrl,
        });
      });
      if (imported.length > 0) {
        setLocalTracks((prev) => [...imported, ...prev]);
        showToast(`${imported.length} yerel müzik dosyası eklendi`);
      }
    },
    [settings.accentColor, showToast]
  );

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
    cacheMb + downloads.reduce((sum, d) => sum + d.downloadedMb, 0);

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
                    <img
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
                albums={ZUNO_ALBUMS}
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
                albums={ZUNO_ALBUMS}
                artists={ZUNO_ARTISTS}
                playlists={playlists}
                downloads={downloads}
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
                tracks={ZUNO_TRACKS}
                localTracks={localTracks}
                albums={ZUNO_ALBUMS}
                artists={ZUNO_ARTISTS}
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
                    trackIds: [activeTrack.id],
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
                accentColor={settings.accentColor}
                tabStyle={settings.tabStyle}
                knobShape={settings.knobShape}
                darkMode={darkMode}
              />
            ) : (
              <DownloadsView
                downloads={downloads}
                tracks={allTracks}
                onTogglePause={(dlId) =>
                  setDownloads((prev) =>
                    prev.map((d) =>
                      d.id === dlId
                        ? { ...d, status: d.status === 'paused' ? 'downloading' : 'paused' }
                        : d
                    )
                  )
                }
                onRetry={(dlId) =>
                  setDownloads((prev) =>
                    prev.map((d) => (d.id === dlId ? { ...d, status: 'downloading' } : d))
                  )
                }
                onCancel={(dlId) =>
                  setDownloads((prev) => prev.filter((d) => d.id !== dlId))
                }
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
              <span className="text-xs font-medium opacity-60">Şimdi Oynatılıyor</span>
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
              <img
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
                <img
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

      {/* Mobile / Tablet Bottom Dock: MiniPlayer + FlowingTabs Navigation */}
      <div
        data-testid="mobile-dock"
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 pt-4 pointer-events-none bg-gradient-to-t ${
          darkMode
            ? 'from-[#07090e] via-[#07090e]/92 to-transparent'
            : 'from-[#f4f6fa] via-[#f4f6fa]/92 to-transparent'
        }`}
      >
        <div className="mx-auto max-w-md space-y-2 pointer-events-auto">
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
      <div className="hidden lg:block xl:hidden fixed bottom-4 right-6 z-30 w-96">
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
      </div>

      {/* Fullscreen Immersive Player */}
      <FullscreenPlayer
        open={playerFullscreen}
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
    </div>
  );
}
