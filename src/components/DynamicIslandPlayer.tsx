import React from 'react';
import { ArtworkImage } from './ArtworkImage';
import { Pause, Play, SkipForward } from 'lucide-react';
import type { Track } from '../types/music';

interface DynamicIslandPlayerProps {
  track: Track;
  isPlaying: boolean;
  currentTimeSec: number;
  onExpand: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  accentColor: string;
}

export const DynamicIslandPlayer: React.FC<DynamicIslandPlayerProps> = ({
  track,
  isPlaying,
  currentTimeSec,
  onExpand,
  onTogglePlay,
  onNext,
  accentColor,
}) => {
  if (!track.id) return null;

  const progress = track.durationSec > 0
    ? Math.min(100, Math.max(0, (currentTimeSec / track.durationSec) * 100))
    : 0;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[42] flex justify-center px-3 lg:hidden"
      style={{ top: 'max(env(safe-area-inset-top), 9px)' }}
    >
      <div className="pointer-events-auto relative flex h-[58px] w-full max-w-[360px] items-center gap-2 overflow-hidden rounded-full border border-white/[0.13] bg-[#080a0f]/95 px-2.5 text-white shadow-[0_12px_38px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/[0.06] backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-6 -bottom-8 h-16 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: accentColor }}
        />

        <button
          type="button"
          onClick={onExpand}
          aria-label={track.title + ' oynatıcısını aç'}
          className="relative flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <ArtworkImage
            src={track.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold leading-tight">{track.title}</span>
            <span className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-white/55">
              <span>{isPlaying ? 'ŞİMDİ ÇALIYOR' : 'DURAKLATILDI'}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{track.artist}</span>
            </span>
          </span>
          <span aria-hidden="true" className="mr-1 flex h-5 items-end gap-[3px]">
            {[9, 15, 11, 18].map((height, index) => (
              <span
                key={index}
                className={`block w-[3px] rounded-full ${isPlaying ? 'zuno-island-wave' : ''}`}
                style={{
                  height: isPlaying ? height : 3,
                  animationDelay: (index * 110) + 'ms',
                  backgroundColor: accentColor,
                }}
              />
            ))}
          </span>
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-transform active:scale-90 hover:bg-white/15"
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Sonraki parça"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-transform active:scale-90 hover:bg-white/15"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: progress + '%', backgroundColor: accentColor }} />
        </div>
      </div>
    </div>
  );
};
