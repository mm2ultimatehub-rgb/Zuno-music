import React from 'react';
import { useTranslation } from '../utils/i18n';
import { ArtworkImage } from './ArtworkImage';
import { ChevronRight, Pause, Play, Sparkles } from 'lucide-react';
import type { Album, Track } from '../types/music';
import { formatDuration } from '../utils/zunoLogic';

interface HomeViewProps {
  tracks: Track[];
  albums: Album[];
  recentTrackIds: string[];
  activeTrack: Track;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextIds?: string[]) => void;
  onOpenAlbum: (album: Album) => void;
  onOpenDiscover: () => void;
  accentColor: string;
  darkMode: boolean;
  catalogLoading?: boolean;
  catalogError?: string | null;
  catalogSections?: Array<{ id: string; title: string; tracks: Track[] }>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  albums,
  recentTrackIds,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onOpenAlbum,
  onOpenDiscover,
  accentColor,
  darkMode,
  catalogLoading = false,
  catalogError = null,
  catalogSections = [],
}) => {
  const tr = useTranslation();
  const playableTracks = tracks.filter((track) => Boolean(
    track.audioUrl || track.audioObjectUrl || track.provider === 'youtube-music'
  ));
  const recentTracks = recentTrackIds
    .map((id) => playableTracks.find((track) => track.id === id))
    .filter((track): track is Track => Boolean(track));


  const surfaceCls = darkMode
    ? 'bg-[#11151e] hover:bg-[#171d29] border-white/[0.06]'
    : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-sm';

  const renderCarouselSection = (
    title: string,
    items: Track[],
    contextIds: string[],
    onMore?: () => void
  ) => (
    items.length === 0 ? null : (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className="inline-flex items-center gap-1 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity whitespace-nowrap shrink-0"
          >
            <span>{tr('Tümü')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
        {items.map((track) => {
          const isCurrent = activeTrack.id === track.id;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onPlayTrack(track, contextIds)}
              className={`group snap-start flex w-[148px] sm:w-[168px] shrink-0 flex-col rounded-2xl border p-2.5 text-left transition-all duration-200 active:scale-[0.98] ${surfaceCls}`}
            >
              <div className="relative mb-2.5 aspect-square w-full overflow-hidden rounded-xl bg-slate-900">
                <ArtworkImage
                  src={track.coverUrl}
                  alt={`${track.title} albüm kapağı`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 flex items-end justify-end p-2 transition-opacity duration-200 ${
                    isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
                    style={{ backgroundColor: accentColor, color: '#0b0e16' }}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </span>
                </div>
              </div>
              <span
                className="truncate text-sm font-semibold leading-snug"
                style={isCurrent ? { color: accentColor } : undefined}
              >
                {track.title}
              </span>
              <span className="mt-0.5 truncate text-xs opacity-65">{track.artist}</span>
            </button>
          );
        })}
      </div>
    </section>
    )
  );

  const featured = playableTracks[0] || activeTrack;
  const hasFeatured = playableTracks.length > 0;
  const isFeaturedCurrent = hasFeatured && activeTrack.id === featured.id;

  return (
    <div className="space-y-8 pb-6">
      {/* Compact Welcome Hero Banner */}
      <section
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 ${
          darkMode
            ? 'border-white/[0.08] bg-[#11151e]'
            : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: accentColor }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-xl">
            <p className="text-xs font-medium tracking-wide opacity-65">
              {tr('Kişisel Ses Alanın · Akışkan Deneyim')}
            </p>
            <h1
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              {tr('Müziğin seni bekliyor')}
            </h1>
            <p className="text-sm opacity-75 leading-relaxed">
              {tr('Canlı müzik kataloğunda gerçek parçaları keşfet veya cihazındaki ses dosyalarını kütüphanene ekle.')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => hasFeatured ? onPlayTrack(featured, playableTracks.map((track) => track.id)) : onOpenDiscover()}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform active:scale-[0.97]"
                style={{ backgroundColor: accentColor, color: '#0b0e16' }}
              >
                {isFeaturedCurrent && isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                <span>{isFeaturedCurrent && isPlaying ? tr('Duraklat') : hasFeatured ? tr('Akışı Başlat') : tr('Müzik keşfet')}</span>
              </button>
              <button
                type="button"
                onClick={onOpenDiscover}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  darkMode
                    ? 'border-white/15 bg-white/5 hover:bg-white/10'
                    : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
                <span>{tr('Keşfet')}</span>
              </button>
            </div>
          </div>

          {hasFeatured && <button
            type="button"
            onClick={() => onPlayTrack(featured, playableTracks.map((track) => track.id))}
            aria-label={`${featured.title} parçasını oynat`}
            className="group relative flex items-center gap-3.5 rounded-2xl border border-white/10 bg-black/25 p-2.5 pr-4 text-left backdrop-blur-md transition-transform hover:scale-[1.01] sm:w-64 shrink-0"
          >
            <ArtworkImage
              src={featured.coverUrl}
              alt={featured.title}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] opacity-65">{tr('Öne çıkan parça')}</div>
              <div className="truncate font-display text-sm font-semibold">{featured.title}</div>
              <div className="truncate text-xs opacity-70">
                {featured.artist} · <span className="tabular-nums">{formatDuration(featured.durationSec)}</span>
              </div>
            </div>
          </button>}
        </div>
      </section>

      {/* Son dinlenen şarkılar */}
      {recentTracks.length > 0 &&
        renderCarouselSection(
          tr('Son dinlenen şarkılar'),
          recentTracks,
          recentTracks.map((t) => t.id)
        )}

      {/* Keep the separate shelves from the live YouTube Music home feed. */}
      {catalogSections.length > 0 ? (
        catalogSections.map((section) => {
          const sectionTracks = section.tracks.filter((track) => playableTracks.some((item) => item.id === track.id));
          return renderCarouselSection(
            section.title,
            sectionTracks,
            sectionTracks.map((track) => track.id),
            onOpenDiscover,
          );
        })
      ) : (
        renderCarouselSection(
          tr('Canlı katalogdan parçalar'),
          playableTracks.slice(0, 12),
          playableTracks.slice(0, 12).map((track) => track.id),
          onOpenDiscover,
        )
      )}

      {playableTracks.length === 0 && (
        <section className={`rounded-3xl border border-dashed px-5 py-8 text-center ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
          <h2 className="font-display text-base font-semibold">
            {catalogLoading ? tr('YouTube Music kataloğu yükleniyor') : catalogError ? tr('Müzik kataloğuna ulaşılamadı') : tr('Henüz parça yüklenmedi')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed opacity-65">
            {catalogError || tr('YouTube Music üzerinden gerçek şarkıları keşfet veya Kütüphane üzerinden cihazındaki ses dosyalarını ekle.')}
          </p>
          <button type="button" onClick={onOpenDiscover} className="mt-4 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: accentColor, color: '#0b0e16' }}>
            {tr('Müzik keşfet')}
          </button>
        </section>
      )}

      {/* Only show real album groups returned with catalogue metadata. */}
      {albums.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight">{tr('Albüm koleksiyonu')}</h2>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => onOpenAlbum(album)}
                className={`group snap-start flex w-[156px] sm:w-[176px] shrink-0 flex-col rounded-2xl border p-2.5 text-left transition-all active:scale-[0.98] ${surfaceCls}`}
              >
                <div className="mb-2.5 aspect-square w-full overflow-hidden rounded-xl bg-slate-900">
                  <ArtworkImage src={album.coverUrl} alt={`${album.title} albümü`} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <span className="truncate text-sm font-semibold">{album.title}</span>
                <span className="mt-0.5 truncate text-xs opacity-65">
                  {album.artist}{album.year ? ` · ${album.year}` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
