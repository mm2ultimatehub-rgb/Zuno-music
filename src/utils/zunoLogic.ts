import type {
  DownloadItem,
  RepeatMode,
  SearchCategory,
  SortMode,
  Track,
} from '../types/music';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatFileSize(mb: number): string {
  if (!Number.isFinite(mb) || mb < 0) return '0.0 MB';
  return `${mb.toFixed(1)} MB`;
}

export function filterTracksByQueryAndCategory(
  tracks: Track[],
  query: string,
  category: SearchCategory
): Track[] {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  return tracks.filter((t) => {
    const categoryMatch =
      category === 'all' ||
      (category === 'songs' && t.category === 'songs') ||
      (category === 'videos' && t.category === 'videos') ||
      (category === 'podcasts' && t.category === 'podcasts');

    if (!categoryMatch) return false;
    if (!q) return true;

    return (
      t.title.toLocaleLowerCase('tr-TR').includes(q) ||
      t.artist.toLocaleLowerCase('tr-TR').includes(q) ||
      t.album.toLocaleLowerCase('tr-TR').includes(q)
    );
  });
}

export function sortTracks(tracks: Track[], sortBy: SortMode): Track[] {
  const copy = [...tracks];
  if (sortBy === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title, 'tr-TR'));
  } else if (sortBy === 'artist') {
    copy.sort((a, b) => a.artist.localeCompare(b.artist, 'tr-TR'));
  } else if (sortBy === 'duration') {
    copy.sort((a, b) => b.durationSec - a.durationSec);
  }
  return copy;
}

export function getNextTrackId(
  queue: string[],
  currentTrackId: string,
  repeat: RepeatMode,
  shuffle: boolean,
  direction: 'next' | 'prev',
  randomFn: () => number = Math.random
): string | null {
  if (queue.length === 0) return null;
  if (repeat === 'one' && direction === 'next') {
    return currentTrackId;
  }
  const idx = queue.indexOf(currentTrackId);
  if (idx === -1) return queue[0];

  if (shuffle && queue.length > 1 && direction === 'next') {
    const candidates = queue.filter((id) => id !== currentTrackId);
    const pick = Math.floor(randomFn() * candidates.length) % candidates.length;
    return candidates[pick];
  }

  if (direction === 'next') {
    if (idx + 1 < queue.length) return queue[idx + 1];
    return repeat === 'all' ? queue[0] : null;
  } else {
    if (idx - 1 >= 0) return queue[idx - 1];
    return repeat === 'all' ? queue[queue.length - 1] : queue[0];
  }
}

export function advanceDownloadProgress(item: DownloadItem, deltaPct: number): DownloadItem {
  if (item.status !== 'downloading') return item;
  const nextProgress = Math.min(100, Math.max(0, item.progress + deltaPct));
  const completed = nextProgress >= 100;
  return {
    ...item,
    progress: nextProgress,
    downloadedMb: Number(((nextProgress / 100) * item.totalMb).toFixed(1)),
    status: completed ? 'completed' : 'downloading',
  };
}

export type MiniPlayerGesture = 'next' | 'prev' | 'expand' | null;

export function resolveMiniPlayerSwipe(
  deltaX: number,
  deltaY: number,
  thresholdX = 44,
  thresholdY = 38
): MiniPlayerGesture {
  if (Math.abs(deltaX) >= thresholdX && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
    return deltaX < 0 ? 'next' : 'prev';
  }
  if (deltaY <= -thresholdY && Math.abs(deltaY) > Math.abs(deltaX)) {
    return 'expand';
  }
  return null;
}

export interface LyricLine {
  timeSec: number;
  text: string;
}

export function getSyncedLyricIndex(lines: LyricLine[], currentTimeSec: number): number {
  if (lines.length === 0) return -1;
  let active = 0;
  for (let i = 0; i < lines.length; i++) {
    if (currentTimeSec >= lines[i].timeSec) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

