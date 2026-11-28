import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativePlaybackTrack {
  url: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
}

export interface NativePlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  playWhenReady?: boolean;
  isLoading?: boolean;
  isEnded?: boolean;
  errorMessage?: string;
}

interface ZunoPlaybackPlugin {
  play(track: NativePlaybackTrack): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(options: { positionMs: number }): Promise<void>;
  getState(): Promise<NativePlaybackState>;
}

const NativePlayback = registerPlugin<ZunoPlaybackPlugin>('ZunoPlayback');

export const isAndroidNativePlayback = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const zunoNativePlayback = NativePlayback;
