import React from 'react';
import { ArtworkImage } from './ArtworkImage';
import { Heart, Play, X } from 'lucide-react';
import type { Album, DownloadItem, FluidShapeId, Track } from '../types/music';
import { formatDuration } from '../utils/zunoLogic';
import { DownloadActionButton } from './fluid/DownloadActionButton';

interface AlbumModalProps {
  album: Album | null;
  tracks: Track[];
  favoriteIds: string[];
  downloads: DownloadItem[];
  activeTrackId: string;
  onClose: () => void;
  onPlayTrack: (track: Track, contextIds: string[]) => void;
  onToggleFavorite: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  accentColor: string;
  knobShape: FluidShapeId;
  darkMode: boolean;
}

export const AlbumModal: React.FC<AlbumModalProps> = ({
  album,
  tracks,
  favoriteIds,
  downloads,
  activeTrackId,
  onClose,
  onPlayTrack,
  onToggleFavorite,
  onDownloadTrack,
  accentColor,
  knobShape,
  darkMode,
}) => {
  if (!album) return null;

  const albumTracks = album.trackIds
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${album.title} albüm detayları`}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto ${
          darkMode
            ? 'border-white/10 bg-[#11151e] text-white'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4 min-w-0">
            <ArtworkImage
              src={album.coverUrl}
              alt={album.title}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-2xl object-cover shrink-0 shadow-lg"
            />
            <div className="min-w-0">
              <div className="text-xs opacity-60">Albüm · {album.year}</div>
              <h2 className="truncate font-display text-xl font-bold">{album.title}</h2>
              <div className="truncate text-sm opacity-75">{album.artist}</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Albümü kapat"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (albumTracks[0]) {
                onPlayTrack(albumTracks[0], albumTracks.map((t) => t.id));
              }
            }}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{ backgroundColor: accentColor, color: '#0b0e16' }}
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Albümü Oynat</span>
          </button>
        </div>

        <div className="divide-y divide-current/[0.06]">
          {albumTracks.map((track, idx) => {
            const isCurrent = activeTrackId === track.id;
            const isFav = favoriteIds.includes(track.id);
            const dl = downloads.find((d) => d.trackId === track.id);
            return (
              <div key={track.id} className="flex items-center justify-between gap-2 py-2.5">
                <button
                  type="button"
                  onClick={() => onPlayTrack(track, albumTracks.map((t) => t.id))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="w-5 text-center text-xs opacity-50 tabular-nums">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-semibold"
                      style={isCurrent ? { color: accentColor } : undefined}
                    >
                      {track.title}
                    </div>
                    <div className="truncate text-xs opacity-65 tabular-nums">
                      {track.artist} · {formatDuration(track.durationSec)}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                    onClick={() => onToggleFavorite(track.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                  >
                    <Heart
                      className="h-4 w-4"
                      fill={isFav ? accentColor : 'none'}
                      style={isFav ? { color: accentColor } : undefined}
                    />
                  </button>
                  <DownloadActionButton
                    status={dl?.status}
                    progress={dl?.progress}
                    onTrigger={() => onDownloadTrack(track)}
                    accentColor={accentColor}
                    shapeId={knobShape}
                    compact
                    ariaLabel={`${track.title} indir`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
