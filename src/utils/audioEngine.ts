import type { Track } from '../types/music';

/**
 * Dual-mode audio engine for ZUNO Music:
 * 1. For local imported audio files (audioObjectUrl), uses HTMLAudioElement + Web Audio Gain/EQ.
 * 2. For catalog tracks, synthesizes warm, musical polyphonic ambient/electronic grooves via Web Audio API
 *    so playback, seek, volume, bass boost, and live visualizer frequencies work out of the box.
 */
class ZunoAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private stepTimer: number | null = null;
  private isPlaying = false;
  private currentTrack: Track | null = null;
  private stepIndex = 0;
  private volume = 0.78;
  private bassBoost = 0.35;

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
      this.masterGain.gain.value = this.volume * 0.25;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.bassFilter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public startTrack(track: Track, startSec = 0) {
    this.stopInternal();
    this.currentTrack = track;
    this.isPlaying = true;
    this.stepIndex = 0;

    if (track.audioObjectUrl) {
      try {
        const audio = new Audio(track.audioObjectUrl);
        audio.currentTime = startSec;
        audio.volume = this.volume;
        const ctx = this.ensureContext();
        if (ctx && this.bassFilter) {
          this.mediaSource = ctx.createMediaElementSource(audio);
          this.mediaSource.connect(this.bassFilter);
        }
        audio.play().catch(() => {});
        this.htmlAudio = audio;
        return;
      } catch {
        // Fallback to synth if audio element fails
      }
    }

    const ctx = this.ensureContext();
    if (!ctx) return;
    const stepMs = Math.max(220, Math.round((60 / Math.max(70, track.bpm)) * 500));
    this.triggerStep(track);
    this.stepTimer = window.setInterval(() => {
      if (this.isPlaying && this.currentTrack?.id === track.id) {
        this.triggerStep(track);
      }
    }, stepMs);
  }

  public pause() {
    this.isPlaying = false;
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }

  public resume(track: Track, currentSec: number) {
    if (this.htmlAudio && track.audioObjectUrl) {
      this.isPlaying = true;
      this.htmlAudio.currentTime = currentSec;
      this.htmlAudio.play().catch(() => {});
      return;
    }
    this.startTrack(track, currentSec);
  }

  public seek(sec: number) {
    if (this.htmlAudio) {
      try {
        this.htmlAudio.currentTime = sec;
      } catch {
        // ignore out of range
      }
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.25, this.ctx.currentTime, 0.04);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.volume;
    }
  }

  public setBassBoost(amount: number) {
    this.bassBoost = Math.max(0, Math.min(1, amount));
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setTargetAtTime(this.bassBoost * 10, this.ctx.currentTime, 0.05);
    }
  }

  public getEnergyLevel(): number {
    if (!this.isPlaying) return 0;
    if (!this.analyser) return 0.4;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return Math.min(1, sum / (data.length * 160));
  }

  private stopInternal() {
    this.isPlaying = false;
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.src = '';
      this.htmlAudio = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {
        // ignore
      }
      this.mediaSource = null;
    }
  }

  private triggerStep(track: Track) {
    const ctx = this.ctx;
    const dest = this.bassFilter;
    if (!ctx || !dest || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const scaleRatios = [1, 1.1892, 1.3348, 1.4983, 1.7818, 2];
    const ratio = scaleRatios[this.stepIndex % scaleRatios.length];
    const freq = track.rootNoteHz * ratio;

    // Warm synth pad / pluck
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = this.stepIndex % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(track.rootNoteHz * 0.5, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.45);

    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

    osc.connect(filter);
    if (this.stepIndex % 4 === 0) {
      subOsc.connect(filter);
    }
    filter.connect(noteGain);
    noteGain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.55);
    if (this.stepIndex % 4 === 0) {
      subOsc.start(now);
      subOsc.stop(now + 0.55);
    }

    this.stepIndex++;
  }
}

export const zunoAudioEngine = new ZunoAudioEngine();
