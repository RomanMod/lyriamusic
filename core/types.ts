/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type LiveMusicGenerationConfig as ImportedLiveMusicGenerationConfigType, // Use 'type' for the interface
  Scale as ScaleEnum // Import the enum value
} from '@google/genai';

// Re-export Scale enum value and its type
// Now `Scale` can be used as `Scale.C_MAJOR_A_MINOR` (value) and as a type.
export { ScaleEnum as Scale };

// Define BiquadFilterType string literal type for EQ
export type BiquadFilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'lowshelf'
  | 'highshelf'
  | 'peaking'
  | 'notch'
  | 'allpass';


// Define our extended interface for use within the application
// The `scale` property from ImportedLiveMusicGenerationConfigType should already use the ScaleEnum type
export interface AppLiveMusicGenerationConfig extends ImportedLiveMusicGenerationConfigType {
  echoMix?: number; // Model-level echo
  reverbMix?: number; // Model-level reverb
  scale?: ScaleEnum; // Explicitly use the imported enum type

  // Distortion
  distortionEnabled?: boolean;
  distortionAmount?: number; // 0-1 range, controls intensity

  // Chorus
  chorusEnabled?: boolean;
  chorusRate?: number; // Hz, e.g., 0.1 - 10
  chorusDepth?: number; // 0-1 range, modulation intensity
  chorusDelay?: number; // seconds, e.g., 0.01 - 0.05
  chorusFeedback?: number; // 0-1 range, typically low or 0 for chorus

  // UI Echo (Client-side effect)
  echoUiEnabled?: boolean;
  echoUiDelayTime?: number; // seconds, e.g., 0.01 - 1
  echoUiFeedback?: number; // 0-1 range, feedback gain
  echoUiMix?: number; // 0-1 range, wet/dry mix

  // UI Reverb (Client-side effect)
  reverbUiEnabled?: boolean;
  reverbUiDelayTime?: number; // seconds, e.g., 0.001 - 0.1 (can be pre-delay or base for comb)
  reverbUiDecay?: number; // 0-1 range (maps to feedback gain, simulating decay)
  reverbUiMix?: number; // 0-1 range, wet/dry mix

  // Flanger
  flangerEnabled?: boolean;
  flangerRate?: number; // Hz, e.g., 0.05 - 5
  flangerDepth?: number; // seconds, modulation range for delay, e.g., 0.0005 - 0.005
  flangerDelay?: number; // seconds, base delay, e.g., 0.001 - 0.01
  flangerFeedback?: number; // 0-0.95 range

  // EQ (BiquadFilter)
  eqEnabled?: boolean;
  eqType?: BiquadFilterType;
  eqFrequency?: number; // Hz, e.g., 20-20000
  eqQ?: number; // 0.0001 - 1000
  eqGain?: number; // dB, e.g., -40 to 40 (for lowshelf, highshelf, peaking)

  // Compressor (DynamicsCompressorNode)
  compressorEnabled?: boolean;
  compressorThreshold?: number; // dB, e.g., -100 to 0
  compressorKnee?: number; // dB, e.g., 0 to 40
  compressorRatio?: number; // e.g., 1 to 20
  compressorAttack?: number; // seconds, e.g., 0 to 1
  compressorRelease?: number; // seconds, e.g., 0 to 1

  // Phaser
  phaserEnabled?: boolean;
  phaserRate?: number; // Hz, e.g., 0.05 - 10
  phaserDepth?: number; // 0-1 range, modulation intensity for allpass filters
  phaserFeedback?: number; // 0-0.95 range
  phaserStages?: number; // e.g., 2-12 (number of allpass filters)
  phaserBaseFrequency?: number; // Hz, e.g., 300-1500

  // Tremolo
  tremoloEnabled?: boolean;
  tremoloRate?: number; // Hz, e.g., 0.1 - 20
  tremoloDepth?: number; // 0-1 range, modulation intensity for gain

  // Stereo Phase Shift (Right Channel)
  stereoPhaseShiftAmount?: number; // 0 (0 deg) to 1 (360 deg), where 0.5 is 180 deg
}

export interface Prompt {
  readonly promptId: string;
  readonly color: string;
  text: string;
  weight: number;
  locked?: boolean; // New property for locking state
}

export type PlaybackState = 'stopped' | 'playing' | 'loading' | 'paused';

export interface Preset {
  id: string; // Unique ID for the preset, e.g., preset-${Date.now()}
  name: string;
  prompts: Prompt[]; // Store prompts as an array for JSON serialization
  settings: AppLiveMusicGenerationConfig;
  autoDensity: boolean;
  autoBrightness: boolean;
}