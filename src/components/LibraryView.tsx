import React, { useRef, useState } from 'react';
import { ArtworkImage } from './ArtworkImage';
import {
  Check,
  Edit3,
  Heart,
  LayoutGrid,
  List,
  Music,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  Album,
  Artist,
  FluidShapeId,
  LibrarySection,
  Playlist,
  SortMode,
  TabIndicatorStyle,
  Track,
  ViewMode,
} from '../types/music';
import { formatDuration, formatFileSize, sortTracks } from '../utils/zunoLogic';
import { FlowingTabs } from './fluid/FlowingTabs';
import { useTranslation } from '../utils/i18n';

interface LibraryViewProps {
  tracks: Track[];
  localTracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  favoriteIds: string[];
  recentTrackIds: string[];
  activeTrackId: string;
  onPlayTrack: (track: Track, contextIds?: string[]) => void;
  onOpenAlbum: (album: Album) => void;
  onToggleFavorite: (trackId: string) => void;
  onCreatePlaylist: (name: string, description: string) => void;
  onRenamePlaylist: (id: string, newName: string) => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onImportLocalFiles: (files: FileList) => void;
  onDeleteLocalTrack: (trackId: string) => void;
  accentColor: string;
  tabStyle: TabIndicatorStyle;
  knobShape: FluidShapeId;
  darkMode: boolean;
}

const SECTIONS: { id: LibrarySection; label: string }[] = [
  { id: 'favorites', label: 'Favoriler' },
  { id: 'playlists', label: 'Çalma listeleri' },
  { id: 'albums', label: 'Albümler' },
  { id: 'artists', label: 'Sanatçılar' },
  { id: 'recent', label: 'Son dinlenenler' },
  { id: 'local', label: 'Yerel müzikler' },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  localTracks,
  albums,
  artists,
  playlists,
  favoriteIds,
  recentTrackIds,
  activeTrackId,
  onPlayTrack,
  onOpenAlbum,
  onToggleFavorite,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onImportLocalFiles,
  onDeleteLocalTrack,
  accentColor,
  tabStyle,
  knobShape,
  darkMode,
}) => {
  const tr = useTranslation();
  const [section, setSection] = useState<LibrarySection>('favorites');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortMode>('recent');
  const [filterText, setFilterText] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCombinedTracks = [...tracks, ...localTracks];
  const filterQ = filterText.trim().toLocaleLowerCase('tr-TR');

  const applyFilterAndSort = (list: Track[]) => {
    const filtered = list.filter(
      (t) =>
        !filterQ ||
        t.title.toLocaleLowerCase('tr-TR').includes(filterQ) ||
        t.artist.toLocaleLowerCase('tr-TR').includes(filterQ)
    );
    return sortTracks(filtered, sortBy);
  };

  const favoriteTracks = applyFilterAndSort(
    allCombinedTracks.filter((t) => favoriteIds.includes(t.id))
  );
  const recentTracks = applyFilterAndSort(
    recentTrackIds
      .map((id) => allCombinedTracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t))
  );
  const filteredLocalTracks = applyFilterAndSort(localTracks);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

  const cardSurface = darkMode
    ? 'border-white/[0.06] bg-[#11151e] hover:bg-[#171d29]'
    : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm';

  const renderTrackCollection = (items: Track[], emptyMsg: string, playlistOwnerId?: string) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-current/15 py-12 px-4 text-center">
          <Music className="h-9 w-9 opacity-35 mb-2.5" />
          <p className="text-sm font-medium opacity-75">{emptyMsg}</p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((track) => {
            const isCurrent = activeTrackId === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onPlayTrack(track, items.map((t) => t.id))}
                className={`group flex flex-col rounded-2xl border p-2.5 text-left transition-all ${cardSurface}`}
              >
                <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-900">
                  <ArtworkImage
                    src={track.coverUrl}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span
                  className="truncate text-sm font-semibold"
                  style={isCurrent ? { color: accentColor } : undefined}
                >
                  {track.title}
                </span>
                <span className="truncate text-xs opacity-65">
                  {track.artist} · <span className="tabular-nums">{formatDuration(track.durationSec)}</span>
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="divide-y divide-current/[0.06]">
        {items.map((track) => {
          const isCurrent = activeTrackId === track.id;
          const isFav = favoriteIds.includes(track.id);
          return (
            <div
              key={track.id}
              className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors ${
                darkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-900/[0.03]'
              }`}
            >
              <button
                type="button"
                onClick={() => onPlayTrack(track, items.map((t) => t.id))}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ArtworkImage
                  src={track.coverUrl}
                  alt={track.title}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-xl object-cover bg-slate-900"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-semibold"
                    style={isCurrent ? { color: accentColor } : undefined}
                  >
                    {track.title}
                  </div>
                  <div className="truncate text-xs opacity-65">
                    {track.artist}
                    {track.folderName ? ` · ${track.folderName}` : ` · ${track.album}`} ·{' '}
                    <span className="tabular-nums">{formatDuration(track.durationSec)}</span>
                    {track.isLocal ? ` · ${formatFileSize(track.fileSizeMb)}` : ''}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={isFav ? `${track.title} favorilerden çıkar` : `${track.title} favorilere ekle`}
                  onClick={() => onToggleFavorite(track.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <Heart
                    className="h-4 w-4"
                    fill={isFav ? accentColor : 'none'}
                    style={isFav ? { color: accentColor } : undefined}
                  />
                </button>
                {track.isLocal && (
                  <button
                    type="button"
                    aria-label={`${track.title} cihazdan sil`}
                    onClick={() => onDeleteLocalTrack(track.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-red-400 opacity-75 hover:bg-red-500/10 hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {playlistOwnerId && (
                  <button
                    type="button"
                    aria-label={`${track.title} listeden kaldır`}
                    onClick={() => onRemoveTrackFromPlaylist(playlistOwnerId, track.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full opacity-60 hover:bg-white/10 hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Sub-navigation FlowingTabs */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <FlowingTabs
          items={SECTIONS.map((item) => ({ ...item, label: tr(item.label) }))}
          activeId={section}
          onSelect={(id) => {
            setSection(id as LibrarySection);
            setSelectedPlaylistId(null);
          }}
          accentColor={accentColor}
          styleMode={tabStyle}
          shapeId={knobShape}
          compact
          darkMode={darkMode}
          ariaLabel="Kütüphane bölümleri"
        />
      </div>

      {/* Controls Bar: Search, Sort, View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border px-3 py-2 ${
            darkMode ? 'border-white/10 bg-[#11151e]' : 'border-slate-200 bg-white'
          }`}
        >
          <Search className="h-4 w-4 opacity-55 shrink-0" />
          <input
            type="search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={tr("Kütüphanede filtrele...")}
            aria-label={tr("Kütüphanede filtrele")}
            className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label={tr("Sıralama")}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className={`h-10 rounded-xl border px-3 text-xs font-medium outline-none ${
              darkMode
                ? 'border-white/10 bg-[#11151e] text-slate-200'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="recent">{tr("Son eklenen")}</option>
            <option value="title">{tr("Ada göre (A-Z)")}</option>
            <option value="artist">{tr("Sanatçıya göre")}</option>
            <option value="duration">{tr("Süreye göre")}</option>
          </select>

          <div
            className={`flex rounded-xl border p-0.5 ${
              darkMode ? 'border-white/10 bg-[#11151e]' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              aria-label={tr("Liste görünümü")}
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white/15' : 'opacity-55 hover:opacity-100'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={tr("Kart görünümü")}
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white/15' : 'opacity-55 hover:opacity-100'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {section === 'favorites' &&
        renderTrackCollection(favoriteTracks, 'Henüz favori şarkın yok. Kalp simgesine dokunarak ekleyebilirsin.')}

      {section === 'recent' &&
        renderTrackCollection(recentTracks, 'Son dinlediğin şarkılar burada görünecek.')}

      {section === 'playlists' && (
        <div className="space-y-4">
          {selectedPlaylist ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlaylistId(null)}
                  className="text-xs font-medium opacity-70 hover:opacity-100"
                >
                  ← Çalma listelerine dön
                </button>
                {selectedPlaylist.isUserCreated && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlaylistId(selectedPlaylist.id);
                        setEditingName(selectedPlaylist.name);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-medium hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{tr("Yeniden adlandır")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePlaylist(selectedPlaylist.id);
                        setSelectedPlaylistId(null);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/30 px-3 text-xs font-medium text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{tr("Listeyi sil")}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <ArtworkImage
                  src={selectedPlaylist.coverUrl}
                  alt={selectedPlaylist.name}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  {editingPlaylistId === selectedPlaylist.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingName.trim()) {
                          onRenamePlaylist(selectedPlaylist.id, editingName.trim());
                          setEditingPlaylistId(null);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="rounded-lg border border-white/20 bg-transparent px-2.5 py-1 text-base font-semibold outline-none"
                      />
                      <button
                        type="submit"
                        aria-label={tr("Kaydet")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: accentColor, color: '#0b0e16' }}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <h3 className="font-display text-xl font-bold">{selectedPlaylist.name}</h3>
                  )}
                  <p className="text-xs opacity-65 mt-0.5">
                    {selectedPlaylist.trackIds.length} parça · {selectedPlaylist.description}
                  </p>
                </div>
              </div>

              {renderTrackCollection(
                selectedPlaylist.trackIds
                  .map((id) => allCombinedTracks.find((t) => t.id === id))
                  .filter((t): t is Track => Boolean(t)),
                'Bu çalma listesi henüz boş.',
                selectedPlaylist.isUserCreated ? selectedPlaylist.id : undefined
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{tr("Çalma listelerin")}</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm((v) => !v)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-transform active:scale-95"
                  style={{ backgroundColor: accentColor, color: '#0b0e16' }}
                >
                  <Plus className="h-4 w-4" />
                  <span>{tr("Yeni liste")}</span>
                </button>
              </div>

              {showCreateForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newPlaylistName.trim()) return;
                    onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
                    setNewPlaylistName('');
                    setNewPlaylistDesc('');
                    setShowCreateForm(false);
                  }}
                  className={`space-y-3 rounded-2xl border p-4 ${
                    darkMode ? 'border-white/10 bg-[#11151e]' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder={tr("Çalma listesi adı")}
                    aria-label={tr("Çalma listesi adı")}
                    className="w-full rounded-xl border border-current/15 bg-transparent px-3.5 py-2.5 text-sm outline-none"
                  />
                  <input
                    type="text"
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    placeholder={tr("Kısa açıklama (isteğe bağlı)")}
                    aria-label={tr("Açıklama")}
                    className="w-full rounded-xl border border-current/15 bg-transparent px-3.5 py-2.5 text-sm outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-full px-4 py-2 text-xs font-medium opacity-70 hover:opacity-100"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="rounded-full px-4 py-2 text-xs font-semibold"
                      style={{ backgroundColor: accentColor, color: '#0b0e16' }}
                    >
                      Oluştur
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {playlists
                  .filter((p) => !filterQ || p.name.toLocaleLowerCase('tr-TR').includes(filterQ))
                  .map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => setSelectedPlaylistId(pl.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${cardSurface}`}
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
                          {pl.trackIds.length} parça · {pl.isUserCreated ? 'Kişisel' : 'ZUNO Seçkisi'}
                        </div>
                      </div>
                      <Play className="h-4 w-4 shrink-0 opacity-60" />
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {section === 'albums' && (
        <div className="space-y-3">
          {albums.filter((album) => !filterQ || album.title.toLocaleLowerCase('tr-TR').includes(filterQ)).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-current/15 py-10 text-center text-sm opacity-60">
              Henüz gerçek albüm kaydı yok. İçe aktardığın müzikler burada koleksiyon olarak görünecek.
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {albums
            .filter((a) => !filterQ || a.title.toLocaleLowerCase('tr-TR').includes(filterQ))
            .map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => onOpenAlbum(album)}
                className={`flex flex-col rounded-2xl border p-2.5 text-left transition-transform active:scale-[0.98] ${cardSurface}`}
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
          )}
        </div>
      )}

      {section === 'artists' && (
        <div className="space-y-3">
          {artists.filter((artist) => !filterQ || artist.name.toLocaleLowerCase('tr-TR').includes(filterQ)).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-current/15 py-10 text-center text-sm opacity-60">
              Müzik kaynağından henüz sanatçı bilgisi alınmadı.
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {artists
            .filter((a) => !filterQ || a.name.toLocaleLowerCase('tr-TR').includes(filterQ))
            .map((artist) => (
              <div
                key={artist.id}
                className={`flex flex-col items-center rounded-2xl border p-3.5 text-center ${cardSurface}`}
              >
                <ArtworkImage
                  src={artist.coverUrl}
                  alt={artist.name}
                  referrerPolicy="no-referrer"
                  className="mb-2.5 h-20 w-20 rounded-full object-cover"
                />
                <span className="truncate w-full text-sm font-semibold">{artist.name}</span>
                <span className="truncate w-full text-xs opacity-65">{artist.monthlyListeners}</span>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {section === 'local' && (
        <div className="space-y-4">
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
              darkMode ? 'border-white/10 bg-[#11151e]' : 'border-slate-200 bg-white shadow-sm'
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">{tr("Cihazdaki Ses Dosyaları")}</div>
              <div className="text-xs opacity-65">
                MP3, FLAC, WAV ve M4A dosyalarını cihazından seçerek kalıcı kütüphanene ekle.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onImportLocalFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold"
                style={{ backgroundColor: accentColor, color: '#0b0e16' }}
              >
                <Upload className="h-4 w-4" />
                <span>{tr("Dosya Ekle")}</span>
              </button>
            </div>
          </div>

          {renderTrackCollection(filteredLocalTracks, 'Cihazda yerel ses dosyası bulunamadı.')}
        </div>
      )}
    </div>
  );
};
