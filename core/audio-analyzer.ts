/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Scale } from './types';

export interface AudioAnalysisResult {
  rms: number;
  detectedBpm: number | null;
  detectedPitchHz: number | null;
  detectedNoteName: string | null;
  detectedScale: Scale | null;
  detectedScaleName: string | null;
  isBeat: boolean;
}

const SCALE_MAPPING: Array<{ scale: Scale; name: string; rootNotes: number[] }> = [
  { scale: Scale.C_MAJOR_A_MINOR, name: 'C Major / A Minor', rootNotes: [0, 9] },
  { scale: Scale.D_FLAT_MAJOR_B_FLAT_MINOR, name: 'C# / Db Major (Bb Minor)', rootNotes: [1, 10] },
  { scale: Scale.D_MAJOR_B_MINOR, name: 'D Major / B Minor', rootNotes: [2, 11] },
  { scale: Scale.E_FLAT_MAJOR_C_MINOR, name: 'Eb Major / C Minor', rootNotes: [3, 0] },
  { scale: Scale.E_MAJOR_D_FLAT_MINOR, name: 'E Major / C# Minor', rootNotes: [4, 1] },
  { scale: Scale.F_MAJOR_D_MINOR, name: 'F Major / D Minor', rootNotes: [5, 2] },
  { scale: Scale.G_FLAT_MAJOR_E_FLAT_MINOR, name: 'F# / Gb Major (Eb Minor)', rootNotes: [6, 3] },
  { scale: Scale.G_MAJOR_E_MINOR, name: 'G Major / E Minor', rootNotes: [7, 4] },
  { scale: Scale.A_FLAT_MAJOR_F_MINOR, name: 'Ab Major / F Minor', rootNotes: [8, 5] },
  { scale: Scale.A_MAJOR_G_FLAT_MINOR, name: 'A Major / F# Minor', rootNotes: [9, 6] },
  { scale: Scale.B_FLAT_MAJOR_G_MINOR, name: 'Bb Major / G Minor', rootNotes: [10, 7] },
  { scale: Scale.B_MAJOR_A_FLAT_MINOR, name: 'B Major / G# Minor', rootNotes: [11, 8] },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export class LiveAudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;

  private isRunning = false;
  private animFrameId: number | null = null;

  // Beat tracking state
  private lastOnsetTime = 0;
  private energyHistory: number[] = [];
  private readonly energyHistoryLength = 40;
  private beatIntervals: number[] = [];
  private currentBpm: number | null = null;
  private lastBeatFlag = false;

  // Pitch tracking state
  private timeBuffer: Float32Array = new Float32Array(2048);
  private noteHistogram: number[] = new Array(12).fill(0);
  private currentPitchHz: number | null = null;
  private currentNoteName: string | null = null;
  private currentScale: Scale | null = null;
  private currentScaleName: string | null = null;

  // Manual tap tempo
  private tapTimestamps: number[] = [];

  // Callback
  private onUpdateCallback: ((result: AudioAnalysisResult) => void) | null = null;

  constructor(existingContext?: AudioContext) {
    if (existingContext) {
      this.audioContext = existingContext;
    }
  }

  public setOnUpdate(cb: (result: AudioAnalysisResult) => void) {
    this.onUpdateCallback = cb;
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Lowpass filter for rhythm transients (kick / taps / hum)
      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.setValueAtTime(280, this.audioContext.currentTime);

      // Monitoring (default 0 = muted to avoid feedback loop)
      this.monitorGainNode = this.audioContext.createGain();
      this.monitorGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.sourceNode.connect(this.analyserNode);
      this.sourceNode.connect(this.lowpassFilter);
      this.sourceNode.connect(this.monitorGainNode);
      this.monitorGainNode.connect(this.audioContext.destination);

      this.timeBuffer = new Float32Array(this.analyserNode.fftSize);
      this.isRunning = true;
      this.energyHistory = [];
      this.beatIntervals = [];

      this.loop();
      return true;
    } catch (err) {
      console.warn('[LiveAudioAnalyzer] Microphone access error:', err);
      return false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.monitorGainNode) {
      try {
        this.monitorGainNode.disconnect();
      } catch {}
      this.monitorGainNode = null;
    }
  }

  public setMonitoringVolume(volume: number) {
    if (this.monitorGainNode && this.audioContext) {
      const vol = Math.max(0, Math.min(1, volume));
      this.monitorGainNode.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.05);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Manual Tap Tempo (tapping with finger / mouse / spacebar).
   */
  public registerTap(): number {
    const now = performance.now();
    this.tapTimestamps.push(now);

    // Keep only taps from last 3.5 seconds
    this.tapTimestamps = this.tapTimestamps.filter((t) => now - t <= 3500);

    if (this.tapTimestamps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.tapTimestamps.length; i++) {
        intervals.push((this.tapTimestamps[i] - this.tapTimestamps[i - 1]) / 1000);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let bpm = Math.round(60 / avgInterval);
      while (bpm < 60) bpm *= 2;
      while (bpm > 200) bpm = Math.round(bpm / 2);
      this.currentBpm = Math.max(60, Math.min(200, bpm));
    }
    return this.currentBpm || 120;
  }

  private loop = () => {
    if (!this.isRunning || !this.analyserNode || !this.audioContext) return;

    this.analyserNode.getFloatTimeDomainData(this.timeBuffer);

    // 1. Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < this.timeBuffer.length; i++) {
      sum += this.timeBuffer[i] * this.timeBuffer[i];
    }
    const rms = Math.sqrt(sum / this.timeBuffer.length);

    // 2. Onset / Beat detection
    const now = performance.now();
    let isBeat = false;

    this.energyHistory.push(rms);
    if (this.energyHistory.length > this.energyHistoryLength) {
      this.energyHistory.shift();
    }

    if (this.energyHistory.length >= 10 && rms > 0.02) {
      const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      const threshold = avgEnergy * 1.55;

      // Check if this frame is a sudden burst
      if (rms > threshold && now - this.lastOnsetTime > 220) {
        isBeat = true;
        const intervalSec = (now - this.lastOnsetTime) / 1000;
        this.lastOnsetTime = now;

        // Plausible interval: 0.28s (214 BPM) to 1.1s (54 BPM)
        if (intervalSec >= 0.25 && intervalSec <= 1.2) {
          this.beatIntervals.push(intervalSec);
          if (this.beatIntervals.length > 6) {
            this.beatIntervals.shift();
          }

          // Compute median/average interval
          const sorted = [...this.beatIntervals].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          let calculatedBpm = Math.round(60 / median);

          // Normalize to [60, 200]
          while (calculatedBpm < 60) calculatedBpm *= 2;
          while (calculatedBpm > 200) calculatedBpm = Math.round(calculatedBpm / 2);

          // Smooth with previous BPM
          if (this.currentBpm === null) {
            this.currentBpm = calculatedBpm;
          } else {
            this.currentBpm = Math.round(this.currentBpm * 0.7 + calculatedBpm * 0.3);
          }
          this.currentBpm = Math.max(60, Math.min(200, this.currentBpm));
        }
      }
    }

    // 3. Pitch Detection (Autocorrelation)
    if (rms > 0.025) {
      const sampleRate = this.audioContext.sampleRate;
      const pitchHz = this.detectPitchAutocorrelation(this.timeBuffer, sampleRate);
      if (pitchHz !== null && pitchHz >= 75 && pitchHz <= 950) {
        this.currentPitchHz = Math.round(pitchHz * 10) / 10;
        const midi = Math.round(12 * Math.log2(pitchHz / 440) + 69);
        const pitchClass = ((midi % 12) + 12) % 12;
        this.currentNoteName = NOTE_NAMES[pitchClass];

        // Increment histogram for detected pitch class
        this.noteHistogram[pitchClass]++;

        // Pick dominant scale from histogram
        let bestScaleIdx = 0;
        let maxWeight = -1;
        for (let s = 0; s < SCALE_MAPPING.length; s++) {
          const mapping = SCALE_MAPPING[s];
          let weight = 0;
          for (const root of mapping.rootNotes) {
            weight += this.noteHistogram[root] * 1.5;
            // Also bonus for fifth (root + 7)
            const fifth = (root + 7) % 12;
            weight += this.noteHistogram[fifth];
          }
          if (weight > maxWeight) {
            maxWeight = weight;
            bestScaleIdx = s;
          }
        }

        this.currentScale = SCALE_MAPPING[bestScaleIdx].scale;
        this.currentScaleName = SCALE_MAPPING[bestScaleIdx].name;
      }
    }

    this.lastBeatFlag = isBeat;

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        rms,
        detectedBpm: this.currentBpm,
        detectedPitchHz: this.currentPitchHz,
        detectedNoteName: this.currentNoteName,
        detectedScale: this.currentScale,
        detectedScaleName: this.currentScaleName,
        isBeat,
      });
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Autocorrelation pitch detector with parabolic interpolation.
   */
  private detectPitchAutocorrelation(buffer: Float32Array, sampleRate: number): number | null {
    const minSamples = Math.floor(sampleRate / 950); // ~950 Hz max
    const maxSamples = Math.floor(sampleRate / 75);  // ~75 Hz min
    const bufferSize = buffer.length;

    let bestOffset = -1;
    let bestCorrelation = 0;

    // Center clipping to improve harmonic peak detection
    let maxAmp = 0;
    for (let i = 0; i < bufferSize; i++) {
      if (Math.abs(buffer[i]) > maxAmp) maxAmp = Math.abs(buffer[i]);
    }
    const clipThreshold = maxAmp * 0.25;

    for (let offset = minSamples; offset <= maxSamples; offset++) {
      let correlation = 0;
      let energy1 = 0;
      let energy2 = 0;

      for (let i = 0; i < bufferSize - offset; i += 2) {
        let v1 = buffer[i];
        let v2 = buffer[i + offset];

        // Apply clip
        v1 = Math.abs(v1) < clipThreshold ? 0 : v1;
        v2 = Math.abs(v2) < clipThreshold ? 0 : v2;

        correlation += v1 * v2;
        energy1 += v1 * v1;
        energy2 += v2 * v2;
      }

      const norm = Math.sqrt(energy1 * energy2);
      if (norm > 0) {
        const coeff = correlation / norm;
        if (coeff > 0.82 && coeff > bestCorrelation) {
          bestCorrelation = coeff;
          bestOffset = offset;
        }
      }
    }

    if (bestOffset > 0 && bestCorrelation > 0.82) {
      return sampleRate / bestOffset;
    }
    return null;
  }
}
