import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, X, Youtube } from 'lucide-react';
import type { YouTubeVideo } from '../utils/youtubeApi';

interface YouTubePlayerModalProps {
  video: YouTubeVideo | null;
  onStop: () => void;
}

const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({ video, onStop }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const sendPlayerCommand = useCallback((func: 'playVideo' | 'pauseVideo') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      YOUTUBE_ORIGIN
    );
  }, []);

  useEffect(() => {
    if (!video) return;
    setExpanded(true);
    setIsPlaying(true);

    const handlePlayerMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || typeof data !== 'object') return;
      const message = data as { event?: string; info?: { playerState?: number }; infoDelivery?: { playerState?: number }; data?: number };
      const state = message.infoDelivery?.playerState ?? message.info?.playerState ?? message.data;
      if (state === 1) setIsPlaying(true);
      if (state === 2 || state === 0) setIsPlaying(false);
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [video?.videoId]);

  useEffect(() => {
    if (!video || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const session = navigator.mediaSession;
    try {
      session.metadata = new MediaMetadata({
        title: video.title,
        artist: video.channelTitle,
        album: 'YouTube · ZUNO Music',
        artwork: [{ src: video.thumbnailUrl, sizes: '480x360' }],
      });
      session.playbackState = isPlaying ? 'playing' : 'paused';
      session.setActionHandler('play', () => { sendPlayerCommand('playVideo'); setIsPlaying(true); });
      session.setActionHandler('pause', () => { sendPlayerCommand('pauseVideo'); setIsPlaying(false); });
    } catch {
      // Media Session controls vary between browsers and native WebViews.
    }
    return () => {
      try {
        session.setActionHandler('play', null);
        session.setActionHandler('pause', null);
      } catch {
        // Ignore unsupported actions.
      }
    };
  }, [video, isPlaying, sendPlayerCommand]);

  if (!video) return null;

  const embedUrl = YOUTUBE_ORIGIN + '/embed/'
    + encodeURIComponent(video.videoId)
    + '?autoplay=1&playsinline=1&controls=1&rel=0&enablejsapi=1&origin='
    + encodeURIComponent(window.location.origin);

  const togglePlayback = () => {
    const next = !isPlaying;
    sendPlayerCommand(next ? 'playVideo' : 'pauseVideo');
    setIsPlaying(next);
  };

  return (
    <>
      {!expanded && (
        <div className="pointer-events-none fixed inset-x-0 z-[48] flex justify-center px-3" style={{ top: 'max(env(safe-area-inset-top), 9px)' }}>
          <div className="pointer-events-auto flex h-[58px] w-full max-w-[370px] items-center gap-2 overflow-hidden rounded-full border border-white/[0.14] bg-[#080a0f]/95 px-2.5 text-white shadow-[0_12px_38px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <button type="button" onClick={() => setExpanded(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label="YouTube oynatıcısını büyüt">
              <img src={video.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{video.title}</span>
                <span className="mt-1 block truncate text-[10px] text-white/55">{video.channelTitle} · YouTube</span>
              </span>
              <Youtube className="h-4 w-4 shrink-0 text-red-500" />
            </button>
            <button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'YouTube duraklat' : 'YouTube oynat'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
            <button type="button" onClick={onStop} aria-label="YouTube oynatmayı kapat" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className={expanded
        ? 'fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-xl sm:p-6'
        : 'pointer-events-none fixed bottom-0 right-0 z-[1] h-px w-px overflow-hidden opacity-0'}
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded ? true : undefined}
        aria-label={expanded ? 'YouTube oynatıcı' : undefined}
      >
        <div className={expanded ? 'w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1119] text-white shadow-2xl' : 'h-px w-px'}>
          {expanded && (
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <img src={video.thumbnailUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{video.title}</div>
                  <div className="truncate text-xs text-white/55">{video.channelTitle}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" aria-label="Mini oynatıcıya küçült" onClick={() => setExpanded(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/15">
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Oynatıcıyı kapat" onClick={onStop} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/15">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <div className={expanded ? 'aspect-video w-full bg-black' : 'h-px w-px'}>
            <iframe
              ref={iframeRef}
              key={video.videoId}
              src={embedUrl}
              title={video.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen={expanded}
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => {
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: 'listening', id: video.videoId }),
                  YOUTUBE_ORIGIN
                );
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
                  YOUTUBE_ORIGIN
                );
              }}
            />
          </div>
          {expanded && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="text-xs text-white/55">Resmî YouTube oynatıcısı · Reklamlar ve yayın hakları YouTube tarafından yönetilir</span>
              <button type="button" onClick={togglePlayback} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/15">
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? 'Duraklat' : 'Oynat'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
