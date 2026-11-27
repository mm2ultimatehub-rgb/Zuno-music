import React from 'react';
import { ExternalLink, X, Youtube } from 'lucide-react';
import type { YouTubeVideo } from '../utils/youtubeApi';

interface YouTubePlayerModalProps {
  video: YouTubeVideo | null;
  onClose: () => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({ video, onClose }) => {
  if (!video) return null;

  const embedUrl = 'https://www.youtube-nocookie.com/embed/'
    + encodeURIComponent(video.videoId)
    + '?autoplay=1&playsinline=1&controls=1&rel=0';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-xl sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="YouTube oynatıcı"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1119] text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Youtube className="h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{video.title}</div>
              <div className="truncate text-xs text-white/55">{video.channelTitle}</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Oynatıcıyı kapat"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          <iframe
            key={video.videoId}
            src={embedUrl}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <span className="text-xs text-white/55">Resmî YouTube oynatıcısı · Kontroller ve reklamlar YouTube tarafından yönetilir</span>
          <a
            href={'https://www.youtube.com/watch?v=' + encodeURIComponent(video.videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold transition-colors hover:bg-white/15"
          >
            <span>YouTube'da aç</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
