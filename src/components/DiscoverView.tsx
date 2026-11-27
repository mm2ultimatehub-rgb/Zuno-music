import React from 'react';
import { ArtworkImage } from './ArtworkImage';
import { Clock, Play, Search, Trash2, X, Youtube } from 'lucide-react';
import type {
  Album,
  Artist,
  DownloadItem,
  FluidShapeId,
  Playlist,
  SearchCategory,
  TabIndicatorStyle,
  Track,
} from '../types/music';
import type { YouTubeVideo } from '../utils/youtubeApi';
import { filterTracksByQueryAndCategory, formatDuration } from '../utils/zunoLogic';
import { FlowingTabs } from './fluid/FlowingTabs';
import { DownloadActionButton } from './fluid/DownloadActionButton';
import { TrackContextMenu } from './TrackContextMenu';

interface DiscoverViewProps {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  downloads: DownloadItem[];
  remoteLoading: boolean;
  remoteError: string | null;
  youtubeVideos: YouTubeVideo[];
  youtubeLoading: boolean;
  youtubeError: string | null;
  youtubeNeedsSubmit: boolean;
  onOpenYouTube: (video: YouTubeVideo) => void;
  favoriteIds: string[];
  query: string;
  onQueryChange: (q: string) => void;
  category: SearchCategory;
  onCategoryChange: (cat: SearchCategory) => void;
  searchHistory: string[];
  onSubmitSearch: (q: string) => void;
  onClearHistory: () => void;
  activeTrackId: string;
  onPlayTrack: (track: Track, contextIds?: string[]) => void;
  onOpenAlbum: (album: Album) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  accentColor: string;
  tabStyle: TabIndicatorStyle;
  knobShape: FluidShapeId;
  darkMode: boolean;
}

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'songs', label: 'Şarkılar' },
  { id: 'videos', label: 'Videolar' },
  { id: 'albums', label: 'Albümler' },
  { id: 'artists', label: 'Sanatçılar' },
  { id: 'playlists', label: 'Çalma listeleri' },
  { id: 'podcasts', label: 'Podcastler' },
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  tracks,
  albums,
  artists,
  playlists,
  downloads,
  remoteLoading,
  remoteError,
  youtubeVideos,
  youtubeLoading,
  youtubeError,
  youtubeNeedsSubmit,
  onOpenYouTube,
  favoriteIds,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  searchHistory,
  onSubmitSearch,
  onClearHistory,
  activeTrackId,
  onPlayTrack,
  onOpenAlbum,
  onAddToQueue,
  onToggleFavorite,
  onDownloadTrack,
  onAddToPlaylist,
  accentColor,
  tabStyle,
  knobShape,
  darkMode,
}) => {
  const qLower = query.trim().toLocaleLowerCase('tr-TR');
  const playableTracks = tracks.filter((track) => Boolean(track.audioUrl || track.audioObjectUrl));
  const filteredTracks = filterTracksByQueryAndCategory(playableTracks, query, category);
  const filteredAlbums = albums.filter(
    (a) =>
      !qLower ||
      a.title.toLocaleLowerCase('tr-TR').includes(qLower) ||
      a.artist.toLocaleLowerCase('tr-TR').includes(qLower)
  );
  const filteredArtists = artists.filter(
    (a) =>
      !qLower ||
      a.name.toLocaleLowerCase('tr-TR').includes(qLower) ||
      a.genre.toLocaleLowerCase('tr-TR').includes(qLower)
  );
  const filteredPlaylists = playlists.filter(
    (p) =>
      !qLower ||
      p.name.toLocaleLowerCase('tr-TR').includes(qLower) ||
      p.description.toLocaleLowerCase('tr-TR').includes(qLower)
  );

  const showTracksSection =
    category === 'all' || category === 'songs' || category === 'podcasts';

  const rowCls = darkMode
    ? 'hover:bg-white/[0.04] border-white/[0.06]'
    : 'hover:bg-slate-900/[0.03] border-slate-200/80';

  return (
    <div className="space-y-6 pb-8">
      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitSearch(query);
        }}
        className="space-y-3"
      >
        <label htmlFor="zuno-search-input" className="sr-only">
          Şarkı, sanatçı, albüm veya podcast ara
        </label>
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            darkMode
              ? 'border-white/10 bg-[#11151e] focus-within:border-white/25'
              : 'border-slate-200 bg-white focus-within:border-slate-400 shadow-sm'
          }`}
        >
          <Search className="h-5 w-5 shrink-0 opacity-60" />
          <input
            id="zuno-search-input"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Şarkı, sanatçı, albüm veya podcast ara..."
            className="w-full bg-transparent text-sm sm:text-base outline-none placeholder:opacity-50"
          />
          {query && (
            <button
              type="button"
              aria-label="Aramayı temizle"
              onClick={() => onQueryChange('')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-60 hover:bg-white/10 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition-transform active:scale-95"
            style={{ backgroundColor: accentColor, color: '#0b0e16' }}
          >
            Ara
          </button>
        </div>
      </form>

      {(remoteLoading || remoteError) && (
        <div
          role={remoteError ? 'alert' : 'status'}
          aria-live="polite"
          className={`rounded-xl border px-3.5 py-3 text-xs ${darkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}
        >
          {remoteLoading ? 'Audius müzik kataloğu aranıyor…' : `Çevrimiçi müzik kaynağı: ${remoteError}`}
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && !query.trim() && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-60">Son aramalar</span>
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 text-xs font-medium opacity-65 hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Geçmişi temizle</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onQueryChange(item)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors ${
                  darkMode
                    ? 'border-white/10 bg-white/[0.04] hover:bg-white/10'
                    : 'border-slate-200 bg-white hover:bg-slate-100'
                }`}
              >
                <Clock className="h-3 w-3 opacity-60" />
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal Category Filter Tabs (FlowingTabs) */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <FlowingTabs
          items={CATEGORIES}
          activeId={category}
          onSelect={(id) => onCategoryChange(id as SearchCategory)}
          accentColor={accentColor}
          styleMode={tabStyle}
          shapeId={knobShape}
          compact
          darkMode={darkMode}
          ariaLabel="Arama kategorileri"
        />
      </div>

      {/* Results: Tracks / Videos / Podcasts */}
      {showTracksSection && (
        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold tracking-tight opacity-90">
            {category === 'podcasts' ? 'Podcastler' : 'Parçalar'}
          </h2>
          {filteredTracks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-current/15 py-10 text-center text-sm opacity-60">
              “{query}” için eşleşen parça bulunamadı.
            </div>
          ) : (
            <div className="divide-y divide-current/[0.06]">
              {filteredTracks.map((track) => {
                const dl = downloads.find((d) => d.trackId === track.id);
                const isCurrent = activeTrackId === track.id;
                const isFav = favoriteIds.includes(track.id);
                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors ${rowCls}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (query.trim()) onSubmitSearch(query);
                        onPlayTrack(
                          track,
                          filteredTracks.map((t) => t.id)
                        );
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                        <ArtworkImage
                          src={track.coverUrl}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-sm font-semibold"
                          style={isCurrent ? { color: accentColor } : undefined}
                        >
                          {track.title}
                        </div>
                        <div className="truncate text-xs opacity-65">
                          {track.artist} · {track.provider === 'audius' ? 'Audius' : track.album} ·{' '}
                          <span className="tabular-nums">{formatDuration(track.durationSec)}</span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {track.provider === 'audius' && !track.downloadable ? (
                        <span className="px-2 text-[10px] font-medium opacity-50" title="Sanatçı indirmeye izin vermiyor">
                          İndirme kapalı
                        </span>
                      ) : (
                        <DownloadActionButton
                          status={dl?.status}
                          progress={dl?.progress}
                          onTrigger={() => onDownloadTrack(track)}
                          accentColor={accentColor}
                          shapeId={knobShape}
                          compact
                          ariaLabel={`${track.title} indir`}
                        />
                      )}
                      <TrackContextMenu
                        track={track}
                        isFavorite={isFav}
                        downloadItem={dl}
                        playlists={playlists}
                        onPlay={(tr) => onPlayTrack(tr, filteredTracks.map((t) => t.id))}
                        onAddToQueue={onAddToQueue}
                        onToggleFavorite={onToggleFavorite}
                        onDownload={onDownloadTrack}
                        onAddToPlaylist={onAddToPlaylist}
                        darkMode={darkMode}
                        accentColor={accentColor}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* YouTube video search uses YouTube's official embeddable player. */}
      {(category === 'all' || category === 'songs' || category === 'videos') && query.trim().length >= 2 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight opacity-90">
              <Youtube className="h-4 w-4 text-red-500" /> YouTube sonuçları
            </h2>
            <span className="text-[11px] opacity-50">Resmî video oynatma</span>
          </div>
          {youtubeNeedsSubmit ? (
            <div className="rounded-2xl border border-current/10 px-4 py-6 text-center text-sm opacity-60">YouTube'da aramak için Ara düğmesine dokun.</div>
          ) : youtubeLoading ? (
            <div className="rounded-2xl border border-current/10 px-4 py-6 text-center text-sm opacity-60" role="status">YouTube aranıyor…</div>
          ) : youtubeError ? (
            <div className="rounded-2xl border border-dashed border-current/15 px-4 py-5 text-sm opacity-75" role="alert">{youtubeError}</div>
          ) : youtubeVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-current/15 px-4 py-6 text-center text-sm opacity-60">Bu arama için gömülebilir YouTube videosu bulunamadı.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {youtubeVideos.map((video) => (
                <button
                  key={video.videoId}
                  type="button"
                  onClick={() => onOpenYouTube(video)}
                  className={`group overflow-hidden rounded-2xl border text-left transition-transform active:scale-[0.99] ${darkMode ? 'border-white/[0.08] bg-[#11151e] hover:bg-[#171d29]' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'}`}
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    <ArtworkImage src={video.thumbnailUrl} alt={video.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/85 px-2 py-1 text-[10px] font-semibold text-white">YouTube</span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-xl"><Play className="h-5 w-5 fill-current ml-0.5" /></span></span>
                  </div>
                  <div className="space-y-1 p-3">
                    <div className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</div>
                    <div className="truncate text-xs opacity-60">{video.channelTitle}{video.durationSec > 0 ? ` · ${formatDuration(video.durationSec)}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Results: Albums */}
      {(category === 'all' || category === 'albums') && filteredAlbums.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold tracking-tight opacity-90">Albümler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredAlbums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => onOpenAlbum(album)}
                className={`flex flex-col rounded-2xl border p-2.5 text-left transition-transform active:scale-[0.98] ${
                  darkMode
                    ? 'border-white/[0.06] bg-[#11151e] hover:bg-[#171d29]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
                }`}
              >
                <ArtworkImage
                  src={album.coverUrl}
                  alt={album.title}
                  referrerPolicy="no-referrer"
                  className="mb-2 aspect-square w-full rounded-xl object-cover"
                />
                <span className="truncate text-sm font-semibold">{album.title}</span>
                <span className="truncate text-xs opacity-65">
                  {album.artist} · {album.year}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Results: Artists */}
      {(category === 'all' || category === 'artists') && filteredArtists.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold tracking-tight opacity-90">Sanatçılar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {filteredArtists.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => onQueryChange(artist.name)}
                className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-colors ${
                  darkMode
                    ? 'border-white/[0.06] bg-[#11151e] hover:bg-[#171d29]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
                }`}
              >
                <ArtworkImage
                  src={artist.coverUrl}
                  alt={artist.name}
                  referrerPolicy="no-referrer"
                  className="mb-2.5 h-20 w-20 rounded-full object-cover"
                />
                <span className="truncate w-full text-sm font-semibold">{artist.name}</span>
                <span className="truncate w-full text-xs opacity-65">{artist.genre}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Results: Playlists */}
      {(category === 'all' || category === 'playlists') && filteredPlaylists.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold tracking-tight opacity-90">
            Çalma listeleri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPlaylists.map((pl) => {
              const firstTrack = tracks.find((t) => t.id === pl.trackIds[0]);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => firstTrack && onPlayTrack(firstTrack, pl.trackIds)}
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors ${
                    darkMode
                      ? 'border-white/[0.06] bg-[#11151e] hover:bg-[#171d29]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <ArtworkImage
                    src={pl.coverUrl}
                    alt={pl.name}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{pl.name}</div>
                    <div className="truncate text-xs opacity-65">
                      {pl.trackIds.length} parça · {pl.description}
                    </div>
                  </div>
                  <Play className="h-4 w-4 shrink-0 mr-2" style={{ color: accentColor }} />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
