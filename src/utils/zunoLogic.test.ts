import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLUID_SHAPES,
  getContrastTextHex,
  getDarkAccentRgb,
  hexToRgb,
  stepSpring,
} from './fluidShapes';
import {
  advanceDownloadProgress,
  filterTracksByQueryAndCategory,
  formatDuration,
  getNextTrackId,
  getSyncedLyricIndex,
  resolveMiniPlayerSwipe,
  sortTracks,
} from './zunoLogic';
import type { DownloadItem, Track } from '../types/music';

const SAMPLE_TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Gece Yankısı',
    artist: 'Mert Aras',
    album: 'Nocturne',
    albumId: 'a1',
    durationSec: 214,
    coverUrl: '/cover1.jpg',
    category: 'songs',
    accentColor: '#9b72ff',
    ambientColor: '#4527a0',
    bpm: 118,
    rootNoteHz: 220,
    fileSizeMb: 8.4,
  },
  {
    id: 't2',
    title: 'Mavi Ufuk',
    artist: 'Selin K.',
    album: 'Horizon',
    albumId: 'a2',
    durationSec: 185,
    coverUrl: '/cover2.jpg',
    category: 'videos',
    accentColor: '#4da6ff',
    ambientColor: '#1565c0',
    bpm: 102,
    rootNoteHz: 196,
    fileSizeMb: 14.2,
  },
  {
    id: 't3',
    title: 'Ses Tasarımı Sohbetleri',
    artist: 'ZUNO Podcast',
    album: 'Bölüm 12',
    albumId: 'a3',
    durationSec: 1420,
    coverUrl: '/cover3.jpg',
    category: 'podcasts',
    accentColor: '#a3f0f0',
    ambientColor: '#00695c',
    bpm: 90,
    rootNoteHz: 164,
    fileSizeMb: 28.0,
  },
];

test('fluidShapes builds normalized polar arrays and dark accents', () => {
  const burst = FLUID_SHAPES.burst.r;
  assert.equal(burst.length, 120);
  const avg = burst.reduce((acc, v) => acc + v, 0) / burst.length;
  assert.ok(Math.abs(avg - 0.92) < 0.02);

  assert.deepEqual(hexToRgb('#9b72ff'), [155, 114, 255]);
  const dark = getDarkAccentRgb([163, 240, 240]);
  assert.ok(dark[0] < 60 && dark[1] < 80);

  assert.equal(getContrastTextHex('#a3f0f0'), '#0b0e16');
  assert.equal(getContrastTextHex('#1a1033'), '#ffffff');
});

test('stepSpring converges smoothly toward target', () => {
  let val = 0;
  let vel = 0;
  for (let i = 0; i < 60; i++) {
    const next = stepSpring(val, 1, vel, 260, 0.55, 1 / 60);
    val = next.value;
    vel = next.velocity;
  }
  assert.ok(Math.abs(val - 1) < 0.02);
});

test('formatDuration formats mm:ss accurately', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(214), '3:34');
});

test('filterTracksByQueryAndCategory filters by search query and category', () => {
  assert.equal(filterTracksByQueryAndCategory(SAMPLE_TRACKS, '', 'all').length, 3);
  assert.equal(filterTracksByQueryAndCategory(SAMPLE_TRACKS, '', 'songs').length, 1);
  assert.equal(filterTracksByQueryAndCategory(SAMPLE_TRACKS, 'mavi', 'all')[0].id, 't2');
  assert.equal(filterTracksByQueryAndCategory(SAMPLE_TRACKS, 'mavi', 'songs').length, 0);
});

test('sortTracks sorts by title and duration without mutating input', () => {
  const byDur = sortTracks(SAMPLE_TRACKS, 'duration');
  assert.equal(byDur[0].id, 't3');
  assert.equal(SAMPLE_TRACKS[0].id, 't1');
});

test('getNextTrackId handles repeat, wraparound, and shuffle', () => {
  const q = ['t1', 't2', 't3'];
  assert.equal(getNextTrackId(q, 't1', 'off', false, 'next'), 't2');
  assert.equal(getNextTrackId(q, 't3', 'off', false, 'next'), null);
  assert.equal(getNextTrackId(q, 't3', 'all', false, 'next'), 't1');
  assert.equal(getNextTrackId(q, 't2', 'one', false, 'next'), 't2');
  assert.equal(getNextTrackId(q, 't1', 'off', false, 'prev'), 't1');
  assert.equal(getNextTrackId(q, 't1', 'all', false, 'prev'), 't3');
  const shuffled = getNextTrackId(q, 't1', 'off', true, 'next', () => 0);
  assert.equal(shuffled, 't2');
});

test('advanceDownloadProgress updates downloadedMb and completes at 100%', () => {
  const dl: DownloadItem = {
    id: 'd1',
    trackId: 't1',
    status: 'downloading',
    progress: 80,
    downloadedMb: 8.0,
    totalMb: 10.0,
    addedAt: 1,
  };
  const next = advanceDownloadProgress(dl, 25);
  assert.equal(next.progress, 100);
  assert.equal(next.downloadedMb, 10.0);
  assert.equal(next.status, 'completed');
});

test('resolveMiniPlayerSwipe detects horizontal track switches and upward expand', () => {
  assert.equal(resolveMiniPlayerSwipe(-60, 4), 'next');
  assert.equal(resolveMiniPlayerSwipe(65, -5), 'prev');
  assert.equal(resolveMiniPlayerSwipe(5, -50), 'expand');
  assert.equal(resolveMiniPlayerSwipe(12, -8), null);
});

test('getSyncedLyricIndex returns active lyric line for current playback second', () => {
  const lines = [
    { timeSec: 0, text: 'Intro' },
    { timeSec: 18, text: 'Verse 1' },
    { timeSec: 42, text: 'Chorus' },
  ];
  assert.equal(getSyncedLyricIndex(lines, 5), 0);
  assert.equal(getSyncedLyricIndex(lines, 18), 1);
  assert.equal(getSyncedLyricIndex(lines, 55), 2);
});

