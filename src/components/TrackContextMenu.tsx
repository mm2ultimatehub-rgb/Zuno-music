import React, { useState } from 'react';
import { Check, Download, Heart, ListPlus, MoreVertical, Play, Plus, X } from 'lucide-react';
import type { DownloadItem, Playlist, Track } from '../types/music';

interface TrackContextMenuProps {
  track: Track;
  isFavorite: boolean;
  downloadItem?: DownloadItem;
  playlists: Playlist[];
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onDownload: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  darkMode: boolean;
  accentColor: string;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  track,
  isFavorite,
  downloadItem,
  playlists,
  onPlay,
  onAddToQueue,
  onToggleFavorite,
  onDownload,
  onAddToPlaylist,
  darkMode,
  accentColor,
}) => {
  const [open, setOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);

  const userPlaylists = playlists.filter((p) => p.isUserCreated);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${track.title} seçenekleri`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setShowPlaylists(false);
        }}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          darkMode
            ? 'text-slate-400 hover:bg-white/10 hover:text-white'
            : 'text-slate-600 hover:bg-slate-900/10 hover:text-slate-900'
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 top-12 z-50 w-60 rounded-2xl border p-1.5 shadow-2xl ${
              darkMode
                ? 'border-white/10 bg-[#141924] text-slate-100'
                : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-current/10 mb-1">
              <span className="truncate text-xs font-medium opacity-75">{track.title}</span>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!showPlaylists ? (
              <div className="flex flex-col gap-0.5 text-sm">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onPlay(track);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                >
                  <Play className="h-4 w-4" style={{ color: accentColor }} />
                  <span>Şimdi oynat</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAddToQueue(track);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                >
                  <ListPlus className="h-4 w-4 opacity-75" />
                  <span>Çalma sırasına ekle</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleFavorite(track.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                >
                  <Heart
                    className="h-4 w-4"
                    fill={isFavorite ? accentColor : 'none'}
                    style={isFavorite ? { color: accentColor } : undefined}
                  />
                  <span>{isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShowPlaylists(true)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 opacity-75" />
                  <span>Çalma listesine ekle</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onDownload(track);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                >
                  <Download className="h-4 w-4 opacity-75" />
                  <span>
                    {downloadItem?.status === 'completed'
                      ? 'İndirildi'
                      : downloadItem?.status === 'downloading'
                        ? 'İndiriliyor'
                        : 'Cihaza indir'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => setShowPlaylists(false)}
                  className="px-3 py-2 text-left text-xs opacity-65 hover:opacity-100"
                >
                  ← Geri dön
                </button>
                {userPlaylists.length === 0 ? (
                  <div className="px-3 py-3 text-xs opacity-60">Henüz çalma listesi yok.</div>
                ) : (
                  userPlaylists.map((pl) => {
                    const already = pl.trackIds.includes(track.id);
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          onAddToPlaylist(pl.id, track.id);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                      >
                        <span className="truncate">{pl.name}</span>
                        {already && <Check className="h-4 w-4 shrink-0" style={{ color: accentColor }} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
