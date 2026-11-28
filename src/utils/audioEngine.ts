import type { Track } from '../types/music';

/**
 * Real audio playback engine. It only plays an actual local file or a direct
 * audio URL; catalog placeholders are never replaced with generated tones.
 */
class ZunoAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private isPlaying = false;
  private currentTrack: Track | null = null;
  private volume = 0.78;
  private bassBoost = 0.35;
  private playbackRate = 1;
  private onPlaybackError: ((error: Error) => void) | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 140;
      this.bassFilter.gain.value = this.bassBoost * 10;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.bassFilter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  public startTrack(
    track: Track,
    startSec = 0,
    onError?: (error: Error) => void
  ): boolean {
    const source = track.audioObjectUrl || track.audioUrl;
    if (!source) return false;

    this.stopInternal();
    this.onPlaybackError = onError || null;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = source;
    audio.playbackRate = this.playbackRate;

    // Cross-origin audio is played directly so missing CORS headers do not mute it.
    const isBlobSource = source.startsWith('blob:');
    let isSameOrigin = false;
    try {
      isSameOrigin = new URL(source, window.location.href).origin === window.location.origin;
    } catch {
      isSameOrigin = false;
    }
    let routedThroughGraph = false;
    if ((isBlobSource || isSameOrigin) && this.bassFilter) {
      const context = this.ensureContext();
      if (context) {
        try {
          this.mediaSource = context.createMediaElementSource(audio);
          this.mediaSource.connect(this.bassFilter);
          routedThroughGraph = true;
        } catch {
          this.mediaSource = null;
        }
      }
    }
    audio.volume = routedThroughGraph ? 1 : this.volume;

    this.htmlAudio = audio;
    this.currentTrack = track;
    this.isPlaying = true;

    const seekToStart = () => {
      if (startSec > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(startSec, Math.max(0, audio.duration - 0.1));
      }
    };
    audio.addEventListener('loadedmetadata', seekToStart, { once: true });
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) seekToStart();

    const reportError = (error: Error) => {
      if (this.htmlAudio !== audio) return;
      this.isPlaying = false;
      this.onPlaybackError?.(error);
    };
    audio.addEventListener('error', () => {
      reportError(new Error('Ses akışı yüklenemedi veya bağlantı kesildi.'));
    }, { once: true });

    const playResult = audio.play();
    if (playResult) {
      void playResult.catch((error: unknown) => {
        reportError(error instanceof Error ? error : new Error('Ses oynatma başlatılamadı.'));
      });
    }
    return true;
  }

  public pause(): void {
    this.isPlaying = false;
    this.htmlAudio?.pause();
  }

  public resume(track: Track, currentSec: number): boolean {
    if (this.htmlAudio && this.currentTrack?.id === track.id) {
      try {
        if (Number.isFinite(this.htmlAudio.duration) && currentSec > 0) {
          this.htmlAudio.currentTime = Math.min(currentSec, Math.max(0, this.htmlAudio.duration - 0.1));
        }
        this.htmlAudio.playbackRate = this.playbackRate;
        const result = this.htmlAudio.play();
        if (result) {
          void result.catch(() => {
            this.isPlaying = false;
          });
        }
        this.isPlaying = true;
        return true;
      } catch {
        return false;
      }
    }
    return this.startTrack(track, currentSec);
  }

  public seek(seconds: number): void {
    if (!this.htmlAudio) return;
    try {
      this.htmlAudio.currentTime = Math.max(0, seconds);
    } catch {
      // The media element may not have metadata yet.
    }
  }

  public getCurrentTime(): number {
    return this.htmlAudio && Number.isFinite(this.htmlAudio.currentTime)
      ? this.htmlAudio.currentTime
      : 0;
  }

  public getDuration(): number {
    return this.htmlAudio && Number.isFinite(this.htmlAudio.duration)
      ? this.htmlAudio.duration
      : 0;
  }

  public hasEnded(): boolean {
    return Boolean(this.htmlAudio?.ended);
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
    }
    if (this.htmlAudio) this.htmlAudio.volume = this.mediaSource ? 1 : this.volume;
  }

  public setBassBoost(value: number): void {
    this.bassBoost = Math.max(0, Math.min(1, value));
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setTargetAtTime(this.bassBoost * 10, this.ctx.currentTime, 0.05);
    }
  }

  public setPlaybackRate(value: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2, value));
    if (this.htmlAudio) this.htmlAudio.playbackRate = this.playbackRate;
  }

  public getEnergyLevel(): number {
    if (!this.isPlaying) return 0;
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let total = 0;
    for (let index = 0; index < data.length; index += 1) total += data[index];
    return Math.min(1, total / (data.length * 160));
  }

  private stopInternal(): void {
    this.isPlaying = false;
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.removeAttribute('src');
      this.htmlAudio.load();
      this.htmlAudio = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {
        // Already disconnected.
      }
      this.mediaSource = null;
    }
    this.currentTrack = null;
    this.onPlaybackError = null;
  }
}

export const zunoAudioEngine = new ZunoAudioEngine();
