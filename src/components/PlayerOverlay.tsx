import React, { useRef, useState } from 'react';
import { ArtworkImage } from './ArtworkImage';
import { useTranslation } from '../utils/i18n';
import {
  ChevronDown,
  Gauge,
  Heart,
  ListMusic,
  Mic2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type { DownloadItem, FluidShapeId, RepeatMode, Track } from '../types/music';
import {
  clamp,
  formatDuration,
  resolveMiniPlayerSwipe,
} from '../utils/zunoLogic';
import { LiquidSlider } from './fluid/LiquidSlider';
import { DownloadActionButton } from './fluid/DownloadActionButton';
import { MorphingLoader } from './fluid/MorphingLoader';

interface MiniPlayerProps {
  track: Track;
  prevTrack?: Track;
  nextTrack?: Track;
  isPlaying: boolean;
  isFavorite: boolean;
  currentTimeSec: number;
  sleepRemainingSec: number | null;
  onTogglePlay: () => void;
  onToggleFavorite: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekRatio: (ratio: number) => void;
  onExpand: () => void;
  accentColor: string;
  darkMode: boolean;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  prevTrack,
  nextTrack,
  isPlaying,
  isFavorite,
  currentTimeSec,
  sleepRemainingSec,
  onTogglePlay,
  onToggleFavorite,
  onPrev,
  onNext,
  onSeekRatio,
  onExpand,
  accentColor,
  darkMode,
}) => {
  const tr = useTranslation();
  const progressPct =
    track.durationSec > 0 ? Math.min(100, (currentTimeSec / track.durationSec) * 100) : 0;

  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gestureRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const suppressClickRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    gestureRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    suppressClickRef.current = false;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!gestureRef.current.active) return;
    gestureRef.current.lastX = e.clientX;
    gestureRef.current.lastY = e.clientY;
    const dx = e.clientX - gestureRef.current.startX;
    const dy = e.clientY - gestureRef.current.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      suppressClickRef.current = true;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      setDragOffset(Math.max(-96, Math.min(96, dx * 0.65)));
    }
  };

  const finishGesture = () => {
    if (!gestureRef.current.active) return;
    const dx = gestureRef.current.lastX - gestureRef.current.startX;
    const dy = gestureRef.current.lastY - gestureRef.current.startY;
    gestureRef.current.active = false;
    setDragging(false);
    setDragOffset(0);

    const action = resolveMiniPlayerSwipe(dx, dy);
    if (action === 'next') {
      onNext();
    } else if (action === 'prev') {
      onPrev();
    } else if (action === 'expand') {
      onExpand();
    }
  };

  const previewTrack = dragOffset < -18 ? nextTrack : dragOffset > 18 ? prevTrack : undefined;
  const swipeHintLabel =
    dragOffset < -18
      ? `Sonraki · ${previewTrack?.title ?? ''}`
      : dragOffset > 18
        ? `Önceki · ${previewTrack?.title ?? ''}`
        : null;

  return (
    <div
      data-testid="mini-player"
      className={`relative overflow-hidden rounded-[22px] border backdrop-blur-2xl transition-colors ${
        darkMode
          ? 'border-white/12 bg-[#121723]/92 text-white shadow-[0_14px_38px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/[0.06]'
          : 'border-slate-200/90 bg-white/94 text-slate-900 shadow-lg'
      }`}
    >
      {/* Subtle dynamic ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 -top-10 h-28 w-44 rounded-full blur-2xl opacity-30 transition-colors duration-500"
        style={{ backgroundColor: accentColor }}
      />

      {/* Interactive scrubbable progress bar */}
      <div
        role="progressbar"
        aria-label={tr("Şarkı ilerlemesi")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
          onSeekRatio(ratio);
        }}
        className="relative z-10 h-1.5 w-full cursor-pointer bg-current/10 group"
      >
        <div
          className="h-full transition-[width] duration-300 rounded-r-full"
          style={{
            width: `${progressPct}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}88`,
          }}
        />
      </div>

      {/* Swipe directional feedback overlay */}
      {swipeHintLabel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 top-2.5 z-20 flex items-center justify-center"
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold shadow-sm"
            style={{ backgroundColor: accentColor, color: '#0b0e16' }}
          >
            {dragOffset > 0 ? <SkipBack className="h-3 w-3" /> : <SkipForward className="h-3 w-3" />}
            <span className="max-w-[190px] truncate">{swipeHintLabel}</span>
          </span>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between gap-2 px-2.5 py-2">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishGesture}
          onPointerCancel={finishGesture}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            onExpand();
          }}
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: dragging ? 'none' : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-label={`${tr("Tam ekran oynatıcıyı aç")}: ${track.title}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left touch-pan-y select-none"
        >
          <div
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-slate-900 shadow-md transition-shadow"
            style={
              isPlaying
                ? { boxShadow: `0 0 0 1.5px ${accentColor}88, 0 6px 16px -4px ${accentColor}55` }
                : undefined
            }
          >
            <ArtworkImage
              src={track.coverUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight">{track.title}</span>
              {isPlaying && (
                <MorphingLoader
                  size={15}
                  accentColor={accentColor}
                  withContainer={false}
                  shapes={['burst', 'sun']}
                  label="Çalıyor"
                />
              )}
            </div>
            <div className="truncate text-xs opacity-65 tabular-nums">
              {track.artist} · {formatDuration(currentTimeSec)} / {formatDuration(track.durationSec)}
              {sleepRemainingSec !== null && ` · ${formatDuration(sleepRemainingSec)}`}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            aria-label={isFavorite ? tr('Favorilerden çıkar') : tr('Favorilere ekle')}
            onClick={onToggleFavorite}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90 hover:bg-white/10"
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorite ? accentColor : 'none'}
              style={isFavorite ? { color: accentColor } : undefined}
            />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? tr('Duraklat') : tr('Oynat')}
            onClick={onTogglePlay}
            className="flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-transform active:scale-90"
            style={{ backgroundColor: accentColor, color: '#0b0e16' }}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            aria-label={tr("Sonraki şarkı")}
            onClick={onNext}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90 hover:bg-white/10"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface FullscreenPlayerProps {
  open: boolean;
  track: Track;
  queueTracks: Track[];
  isPlaying: boolean;
  currentTimeSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isFavorite: boolean;
  downloadItem?: DownloadItem;
  volume: number;
  playbackRate: number;
  sleepTimerMin: number | null;
  sleepRemainingSec: number | null;
  waveAmp: number;
  animSpeed: number;
  knobShape: FluidShapeId;
  dynamicColors: boolean;
  globalAccent: string;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekRatio: (ratio: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
  onVolumeChange: (v: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onPlayFromQueue: (track: Track) => void;
  onRemoveFromQueue: (trackId: string) => void;
}

const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5];
const SLEEP_OPTIONS: (number | null)[] = [null, 15, 30, 45];

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
  open,
  track,
  queueTracks,
  isPlaying,
  currentTimeSec,
  shuffle,
  repeat,
  isFavorite,
  downloadItem,
  volume,
  playbackRate,
  sleepTimerMin,
  sleepRemainingSec,
  waveAmp,
  animSpeed,
  knobShape,
  dynamicColors,
  globalAccent,
  onClose,
  onTogglePlay,
  onPrev,
  onNext,
  onSeekRatio,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onDownload,
  onVolumeChange,
  onPlaybackRateChange,
  onSetSleepTimer,
  onPlayFromQueue,
  onRemoveFromQueue,
}) => {
  const tr = useTranslation();
  const [centerMode, setCenterMode] = useState<'cover' | 'lyrics' | 'queue'>('cover');
  const [showSleepMenu, setShowSleepMenu] = useState(false);

const coverSwipeRef = useRef<{ active: boolean; startX: number; lastX: number }>({
    active: false,
    startX: 0,
    lastX: 0,
  });
  const [coverOffset, setCoverOffset] = useState(0);

  if (!open) return null;

  const activeAccent = dynamicColors ? track.accentColor : globalAccent;
  const ambientBg = dynamicColors ? track.ambientColor : '#1f163a';
  const progressRatio = track.durationSec > 0 ? currentTimeSec / track.durationSec : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr("Tam Ekran Müzik Oynatıcı")}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#07090e] text-white"
    >
      {/* Dynamic blurred album atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 22%, ${ambientBg}cc 0%, #090c14 62%, #05070b 100%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-2xl flex-col justify-between px-5 py-5 sm:px-8 sm:py-7">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={tr("Oynatıcıyı küçült")}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setCenterMode('cover')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                centerMode === 'cover' ? 'text-[#0b0e16]' : 'text-white/75 hover:text-white'
              }`}
              style={centerMode === 'cover' ? { backgroundColor: activeAccent } : undefined}
            >
              Kapak
            </button>
            <button
              type="button"
              onClick={() => setCenterMode('lyrics')}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                centerMode === 'lyrics' ? 'text-[#0b0e16]' : 'text-white/75 hover:text-white'
              }`}
              style={centerMode === 'lyrics' ? { backgroundColor: activeAccent } : undefined}
            >
              <Mic2 className="h-3.5 w-3.5" />
              <span>{tr("Sözler")}</span>
            </button>
            <button
              type="button"
              onClick={() => setCenterMode('queue')}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                centerMode === 'queue' ? 'text-[#0b0e16]' : 'text-white/75 hover:text-white'
              }`}
              style={centerMode === 'queue' ? { backgroundColor: activeAccent } : undefined}
            >
              <ListMusic className="h-3.5 w-3.5" />
              <span>{tr("Sıra")}</span>
            </button>
          </div>

          <button
            type="button"
            aria-label={tr("Uyku zamanlayıcısı")}
            aria-expanded={showSleepMenu}
            onClick={() => setShowSleepMenu((v) => !v)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              sleepTimerMin !== null
                ? 'text-[#0b0e16]'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            style={sleepTimerMin !== null ? { backgroundColor: activeAccent } : undefined}
          >
            <Moon className="h-4 w-4" />
          </button>
        </div>

        {/* Optional Sleep Timer & Playback Speed Bar */}
        {showSleepMenu && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white/80">
                Uyku Zamanlayıcısı
                {sleepRemainingSec !== null && ` (${formatDuration(sleepRemainingSec)} kaldı)`}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {SLEEP_OPTIONS.map((m) => (
                  <button
                    key={String(m)}
                    type="button"
                    onClick={() => onSetSleepTimer(m)}
                    className={`whitespace-nowrap shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      sleepTimerMin === m
                        ? 'text-[#0b0e16] font-semibold'
                        : 'bg-white/10 text-white/75 hover:text-white'
                    }`}
                    style={sleepTimerMin === m ? { backgroundColor: activeAccent } : undefined}
                  >
                    {m === null ? 'Kapalı' : `${m} dk`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <Gauge className="h-3.5 w-3.5" />
                <span>{tr("Oynatma Hızı")}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {SPEED_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onPlaybackRateChange(r)}
                    className={`rounded-full px-2.5 py-1 text-xs font-mono-num ${
                      playbackRate === r
                        ? 'text-[#0b0e16] font-semibold'
                        : 'bg-white/10 text-white/75 hover:text-white'
                    }`}
                    style={playbackRate === r ? { backgroundColor: activeAccent } : undefined}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Center Stage: Cover / Lyrics / Queue */}
        {centerMode === 'cover' ? (
          <div className="my-auto flex flex-col items-center py-6">
            <div
              onPointerDown={(e) => {
                coverSwipeRef.current = { active: true, startX: e.clientX, lastX: e.clientX };
              }}
              onPointerMove={(e) => {
                if (!coverSwipeRef.current.active) return;
                coverSwipeRef.current.lastX = e.clientX;
                setCoverOffset(clamp((e.clientX - coverSwipeRef.current.startX) * 0.45, -72, 72));
              }}
              onPointerUp={() => {
                if (!coverSwipeRef.current.active) return;
                const dx = coverSwipeRef.current.lastX - coverSwipeRef.current.startX;
                coverSwipeRef.current.active = false;
                setCoverOffset(0);
                if (dx <= -48) onNext();
                else if (dx >= 48) onPrev();
              }}
              onPointerCancel={() => {
                coverSwipeRef.current.active = false;
                setCoverOffset(0);
              }}
              style={{ transform: `translateX(${coverOffset}px)` }}
              className="relative w-full max-w-[320px] sm:max-w-[360px] aspect-square transition-transform duration-200 touch-pan-y cursor-grab active:cursor-grabbing"
            >
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[38px] opacity-40 blur-3xl transition-colors duration-700"
                style={{ backgroundColor: activeAccent }}
              />
              <ArtworkImage
                key={track.id}
                src={track.coverUrl}
                alt={`${track.title} albüm kapağı`}
                referrerPolicy="no-referrer"
                draggable={false}
                className={`relative h-full w-full rounded-[28px] object-cover shadow-2xl transition-transform duration-500 ${
                  isPlaying ? 'scale-100' : 'scale-[0.95] opacity-90'
                }`}
              />
            </div>
          </div>
        ) : centerMode === 'lyrics' ? (
          <div className="my-4 flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/35 p-7 text-center backdrop-blur-xl">
            <Mic2 className="mb-3 h-8 w-8 text-white/35" />
            <h2 className="font-display text-base font-semibold">{tr("Şarkı sözleri bulunamadı")}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
              Bu parça için doğrulanmış söz bilgisi mevcut değil. ZUNO, yanlış veya uydurma söz göstermeyecek.
            </p>
          </div>

        ) : (
          <div className="my-4 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl max-h-[380px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">
                Çalma Sırası ({queueTracks.length})
              </h2>
              <button
                type="button"
                aria-label={tr("Sırayı kapat")}
                onClick={() => setCenterMode('cover')}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {queueTracks.map((qt) => {
                const current = qt.id === track.id;
                return (
                  <div key={qt.id} className="flex items-center justify-between gap-3 py-2">
                    <button
                      type="button"
                      onClick={() => onPlayFromQueue(qt)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <ArtworkImage
                        src={qt.coverUrl}
                        alt={qt.title}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-semibold"
                          style={current ? { color: activeAccent } : undefined}
                        >
                          {qt.title}
                        </div>
                        <div className="truncate text-xs text-white/60">{qt.artist}</div>
                      </div>
                    </button>
                    {!current && (
                      <button
                        type="button"
                        aria-label={`${qt.title} ${tr("Sıradan çıkar")}`}
                        onClick={() => onRemoveFromQueue(qt.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls Footer */}
        <div className="space-y-5 pt-2">
          {/* Title, Artist, Favorite & Download */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight">
                {track.title}
              </h1>
              <p className="truncate text-sm text-white/70">
                {track.artist} · {track.album}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label={isFavorite ? tr('Favorilerden çıkar') : tr('Favorilere ekle')}
                onClick={onToggleFavorite}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
              >
                <Heart
                  className="h-5 w-5"
                  fill={isFavorite ? activeAccent : 'none'}
                  style={isFavorite ? { color: activeAccent } : undefined}
                />
              </button>
              <DownloadActionButton
                status={downloadItem?.status}
                progress={downloadItem?.progress}
                onTrigger={onDownload}
                accentColor={activeAccent}
                shapeId={knobShape}
                ariaLabel={`${track.title} indir`}
              />
            </div>
          </div>

          {/* Liquid Wave Seek Bar */}
          <div className="space-y-2">
            <LiquidSlider
              value={progressRatio}
              onChange={onSeekRatio}
              accentColor={activeAccent}
              shapeId={knobShape}
              waveAmp={waveAmp}
              speed={animSpeed}
              height={40}
              ariaLabel="Şarkı ilerleme çubuğu"
              darkMode
            />
            <div className="flex items-center justify-between text-xs text-white/65 tabular-nums font-mono-num">
              <span>{formatDuration(currentTimeSec)}</span>
              {playbackRate !== 1 && <span>{playbackRate}x hız</span>}
              <span>{formatDuration(track.durationSec)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={tr("Karıştırma modu")}
              aria-pressed={shuffle}
              onClick={onToggleShuffle}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10"
              style={shuffle ? { color: activeAccent } : { color: 'rgba(255,255,255,0.65)' }}
            >
              <Shuffle className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label={tr("Önceki şarkı")}
              onClick={onPrev}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>

            <button
              type="button"
              aria-label={isPlaying ? tr('Duraklat') : tr('Oynat')}
              onClick={onTogglePlay}
              className="flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-transform active:scale-95"
              style={{ backgroundColor: activeAccent, color: '#0b0e16' }}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 fill-current" />
              ) : (
                <Play className="h-7 w-7 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              aria-label={tr("Sonraki şarkı")}
              onClick={onNext}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>

            <button
              type="button"
              aria-label={tr(`Tekrar modu: ${repeat}`)}
              onClick={onCycleRepeat}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10"
              style={repeat !== 'off' ? { color: activeAccent } : { color: 'rgba(255,255,255,0.65)' }}
            >
              {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-3 pt-1">
            <Volume2 className="h-4 w-4 shrink-0 text-white/60" />
            <LiquidSlider
              value={volume}
              onChange={onVolumeChange}
              accentColor={activeAccent}
              shapeId="circ"
              waveAmp={0.7}
              speed={animSpeed}
              height={28}
              ariaLabel="Ses seviyesi"
              darkMode
            />
            <span className="w-9 text-right text-xs text-white/60 tabular-nums font-mono-num">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
