import React from 'react';
import { ArtworkImage } from './ArtworkImage';
import { AlertCircle, CheckCircle2, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { DownloadItem, DownloadStatus, Track } from '../types/music';
import { formatFileSize } from '../utils/zunoLogic';
import { WaveProgress } from './fluid/WaveProgress';

interface DownloadsViewProps {
  downloads: DownloadItem[];
  tracks: Track[];
  onTogglePause: (downloadId: string) => void;
  onRetry: (downloadId: string) => void;
  onCancel: (downloadId: string) => void;
  onPlayTrack: (track: Track) => void;
  accentColor: string;
  darkMode: boolean;
}

const STATUS_LABELS: Record<DownloadStatus, string> = {
  downloading: 'İndiriliyor',
  queued: 'Bekliyor',
  paused: 'Baştan başlatılabilir',
  completed: 'Tamamlandı',
  error: 'Hata oluştu',
};

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloads,
  tracks,
  onTogglePause,
  onRetry,
  onCancel,
  onPlayTrack,
  accentColor,
  darkMode,
}) => {
  const completedCount = downloads.filter((d) => d.status === 'completed').length;
  const activeCount = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
  ).length;
  const totalDownloadedMb = downloads.reduce((sum, d) => sum + d.downloadedMb, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Summary */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 ${
          darkMode ? 'border-white/[0.08] bg-[#11151e]' : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div>
          <h1 className="font-display text-xl font-bold">İndirme Yöneticisi</h1>
          <p className="mt-1 text-xs opacity-70 tabular-nums">
            {completedCount} tamamlandı · {activeCount} aktif · {formatFileSize(totalDownloadedMb)}{' '}
            çevrimdışı depolama
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WaveProgress
            progress={
              downloads.length === 0
                ? 0
                : Math.round(
                    downloads.reduce((s, d) => s + d.progress, 0) / downloads.length
                  )
            }
            accentColor={accentColor}
            variant="ring"
            size={54}
            paused={activeCount === 0}
          />
        </div>
      </div>

      {/* Download List */}
      {downloads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-current/15 py-14 px-4 text-center">
          <p className="text-sm font-medium opacity-75">Henüz indirilen veya bekleyen parça yok.</p>
          <p className="mt-1 text-xs opacity-55">
            Keşfet ekranından veya oynatıcıdan parçaları çevrimdışı dinlemek için indirebilirsin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((item) => {
            const track = tracks.find((t) => t.id === item.trackId);
            if (!track) return null;

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-3.5 transition-colors ${
                  darkMode
                    ? 'border-white/[0.07] bg-[#11151e]'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                    <ArtworkImage
                      src={track.coverUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-sm font-semibold">{track.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs opacity-70">
                      <span>{track.artist}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          item.status === 'error'
                            ? 'text-red-400'
                            : item.status === 'completed'
                              ? 'text-emerald-400'
                              : ''
                        }`}
                        style={
                          item.status === 'downloading' ? { color: accentColor } : undefined
                        }
                      >
                        {item.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {item.status === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
                        <span>{STATUS_LABELS[item.status]}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatFileSize(item.downloadedMb)} / {formatFileSize(item.totalMb)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {item.status !== 'completed' && (
                    <WaveProgress
                      progress={item.progress}
                      accentColor={item.status === 'error' ? '#f87171' : accentColor}
                      variant="liquid"
                      size={46}
                      paused={item.status !== 'downloading'}
                    />
                  )}

                  <div className="flex items-center gap-1.5">
                    {item.status === 'completed' && (
                      <button
                        type="button"
                        aria-label={`${track.title} oynat`}
                        onClick={() => onPlayTrack(track)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold"
                        style={{ backgroundColor: accentColor, color: '#0b0e16' }}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Oynat</span>
                      </button>
                    )}

                    {(item.status === 'downloading' ||
                      item.status === 'paused' ||
                      item.status === 'queued') && (
                      <button
                        type="button"
                        aria-label={
                          item.status === 'paused'
                            ? `${track.title} indirmeyi baştan başlat`
                            : `${track.title} indirmeyi durdur`
                        }
                        onClick={() => onTogglePause(item.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-current/15 hover:bg-white/10"
                      >
                        {item.status === 'paused' ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        type="button"
                        aria-label={`${track.title} yeniden dene`}
                        onClick={() => onRetry(item.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-red-400/30 text-red-400 hover:bg-red-500/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label={`${track.title} indirmeyi iptal et`}
                      onClick={() => onCancel(item.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-full opacity-65 hover:bg-white/10 hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
