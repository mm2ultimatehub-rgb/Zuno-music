import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativePlaybackTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  userAgent: string;
}

export interface NativePlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  playWhenReady?: boolean;
  isLoading?: boolean;
  isEnded?: boolean;
  isForegroundService?: boolean;
  currentMediaId?: string;
  errorMessage?: string;
}

interface ZunoPlaybackPlugin {
  play(track: NativePlaybackTrack): Promise<void>;
  setQueue(options: { tracks: NativePlaybackTrack[]; startIndex: number }): Promise<void>;
  setRepeatMode(options: { mode: 'off' | 'one' | 'all' }): Promise<void>;
  setShuffleMode(options: { enabled: boolean }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(options: { positionMs: number }): Promise<void>;
  setPlaybackRate(options: { rate: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  getState(): Promise<NativePlaybackState>;
}

const NativePlayback = registerPlugin<ZunoPlaybackPlugin>('ZunoPlayback');

export const isAndroidNativePlayback = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const zunoNativePlayback = NativePlayback;
