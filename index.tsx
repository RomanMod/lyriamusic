/**
 * @fileoverview Control real time music with text prompts
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, CSSResultGroup, html, LitElement} from 'lit';
import {svg} from 'lit-html';
import {customElement, property, query, state} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';
import {styleMap} from 'lit-html/directives/style-map.js';

import {
  GoogleGenAI,
  type LiveMusicServerMessage,
  type LiveMusicSession,
} from '@google/genai';

import { PROMPT_TEXT_PRESETS, COLORS } from './core/constants';
import { AppLiveMusicGenerationConfig, Prompt, PlaybackState, BiquadFilterType, Preset, Scale } from './core/types';
import { throttle, getUnusedRandomColor } from './utils'; // throttle, getUnusedRandomColor moved
import { decode, decodeAudioData, pcmToWav, downloadBlob } from './utils';

// Import components
import './components/weight-slider';
import './components/prompt-controller';
import './components/settings-controller';
import './components/toast-message';
import './components/play-pause-button';
import './components/record-button';
import './components/record-fx-button'; // New for FX recording
import './components/reset-button';
import './components/add-prompt-button';
import './components/add-random-prompt-button'; // New
import './components/info-button';
import './components/info-modal';
import './components/presets-button'; // New
import './components/preset-manager-modal'; // New
import './components/confirmation-modal'; // New

// Component Type Imports for querySelectors and events (adjust paths if they export types differently)
import type { PlayPauseButton } from './components/play-pause-button';
import type { ToastMessage } from './components/toast-message';
import type { SettingsController } from './components/settings-controller';
import type { RecordButton } from './components/record-button';
import type { RecordFxButton } from './components/record-fx-button'; // New
import type { PromptController } from './components/prompt-controller';
import type { PresetManagerModal } from './components/preset-manager-modal'; // New
import type { ConfirmationModal } from './components/confirmation-modal'; // New

const ENABLE_LOGGING = true; // Установите true для отладочных сообщений в консоли

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
  apiVersion: 'v1alpha',
});
let model = 'lyria-realtime-exp';

// GA4 Integration
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

if (GA_MEASUREMENT_ID) {
  // Initialize dataLayer and gtag function if they don't exist.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(...args: any[]) { (window.dataLayer as any).push(args); };

  const scriptId = 'ga-gtag-script';
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    script.onload = () => {
      window.gtag('js', new Date()); // Call 'js' after script is loaded
      window.gtag('config', GA_MEASUREMENT_ID); // This sends the initial page_view
      if (ENABLE_LOGGING) console.log('GA4 configured dynamically with ID:', GA_MEASUREMENT_ID);
    };
  }
}


/** Component for the PromptDJ UI. */
@customElement('prompt-dj')
class PromptDj extends LitElement {
  static override styles: CSSResultGroup = css`
    :host {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      padding: 2vmin;
      position: relative;
      font-size: 20px;
    }
    #background {
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #111;
    }
    .prompts-area {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      flex: 4;
      width: 100%;
      margin-top: 2vmin;
      gap: 2vmin;
    }
    #prompts-container {
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      flex-shrink: 1;
      height: 100%;
      gap: 2vmin;
      margin-left: 10vmin; /* To somewhat center content with add button */
      padding: 1vmin; /* Padding for scrollbar */
      overflow-x: auto;
      /* Custom scrollbar styling */
      scrollbar-width: thin;
      scrollbar-color: #666 #1a1a1a;
    }
    #prompts-container::-webkit-scrollbar {
      height: 8px;
    }
    #prompts-container::-webkit-scrollbar-track {
      background: #111; /* Or match prompts-area background */
      border-radius: 4px;
    }
    #prompts-container::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 4px;
    }
    #prompts-container::-webkit-scrollbar-thumb:hover {
      background-color: #777;
    }
    /* Add pseudo-elements for centering while keeping elements visible when scrolling */
    #prompts-container::before,
    #prompts-container::after {
      content: '';
      flex: 1; /* Distribute remaining space */
      min-width: 0.5vmin; /* Ensure some space even if only one item */
    }
    .add-prompt-button-container {
      display: flex;
      align-items: flex-end; /* Align button to bottom like prompts */
      height: 100%; /* Match prompts-container height */
      flex-shrink: 0; /* Prevent button from shrinking */
      gap: 1.5vmin; /* Gap between add buttons */
    }
    #settings-container {
      flex: 1;
      margin: 2vmin 0 1vmin 0;
      /* max-height controlled by settings-controller itself */
    }
    .playback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0; /* Prevent container from shrinking */
      gap: 0.5vmin; /* Add a small gap between playback buttons */
      flex-wrap: wrap; /* Allow wrapping for more controls */
    }
    play-pause-button,
    add-prompt-button,
    add-random-prompt-button, /* New */
    reset-button,
    record-button,
    record-fx-button, /* New */
    info-button,
    presets-button { /* New */
      width: 12vmin;
      flex-shrink: 0;
    }
    prompt-controller {
      height: 100%;
      max-height: 80vmin; /* Max height for a prompt controller */
      min-width: 14vmin; /* Min width for a prompt controller */
      max-width: 16vmin; /* Max width for a prompt controller */
      flex: 1; /* Allow prompt to grow if few prompts, but also shrink */
    }
    .volume-control-container {
      display: flex;
      align-items: center;
      gap: 1vmin;
      width: 20vmin;
      margin-left: 2vmin;
    }
    .volume-control-container svg {
      width: 3.5vmin;
      height: 3.5vmin;
      fill: #ccc;
      flex-shrink: 0;
    }
    .volume-slider {
      --track-height: 6px;
      --track-bg: #0009;
      --track-border-radius: 3px;
      --thumb-size: 1.8vmin;
      --thumb-bg: #ccc;
      --thumb-border-radius: 50%;
      --thumb-box-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
      /* --value-percent is set via inline style */

      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: var(--track-height);
      background: transparent;
      cursor: pointer;
      margin: 0;
      border: none;
      padding: 0;
    }
    .volume-slider::-webkit-slider-runnable-track {
      width: 100%;
      height: var(--track-height);
      cursor: pointer;
      border: none;
      background: linear-gradient(
        to right,
        var(--thumb-bg) var(--value-percent),
        var(--track-bg) var(--value-percent)
      );
      border-radius: var(--track-border-radius);
    }
    .volume-slider::-moz-range-track {
      width: 100%;
      height: var(--track-height);
      cursor: pointer;
      background: var(--track-bg);
      border-radius: var(--track-border-radius);
      border: none;
    }
    .volume-slider::-moz-range-progress {
      background-color: var(--thumb-bg);
      height: var(--track-height);
      border-radius: var(--track-border-radius);
    }
    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      height: var(--thumb-size);
      width: var(--thumb-size);
      background: var(--thumb-bg);
      border-radius: var(--thumb-border-radius);
      box-shadow: var(--thumb-box-shadow);
      cursor: pointer;
      margin-top: calc((var(--thumb-size) - var(--track-height)) / -2);
      transition: background-color 0.2s;
    }
    .volume-slider::-moz-range-thumb {
      height: var(--thumb-size);
      width: var(--thumb-size);
      background: var(--thumb-bg);
      border-radius: var(--thumb-border-radius);
      box-shadow: var(--thumb-box-shadow);
      cursor: pointer;
      border: none;
      transition: background-color 0.2s;
    }
    .volume-slider:hover::-webkit-slider-thumb {
        background: #fff;
    }
    .volume-slider:hover::-moz-range-thumb {
        background: #fff;
    }

    .stabilizer-container {
      display: flex;
      align-items: center;
      gap: 1vmin;
      margin-left: 2vmin;
      color: #ccc;
      font-size: 18px;
      user-select: none;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 4.5vmin;
      height: 2.4vmin;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #555;
      -webkit-transition: .4s;
      transition: .4s;
      border-radius: 2.4vmin;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 1.8vmin;
      width: 1.8vmin;
      left: 0.3vmin;
      bottom: 0.3vmin;
      background-color: white;
      -webkit-transition: .4s;
      transition: .4s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: #5200ff;
    }
    input:focus + .slider {
      box-shadow: 0 0 1px #5200ff;
    }
    input:checked + .slider:before {
      -webkit-transform: translateX(2.1vmin);
      -ms-transform: translateX(2.1vmin);
      transform: translateX(2.1vmin);
    }
  `;

  @property({
    type: Object,
    attribute: false,
  })
  private prompts: Map<string, Prompt>;
  private nextPromptId: number; // Monotonically increasing ID for new prompts
  private session!: LiveMusicSession; // Assume it will be initialized in firstUpdated
  private readonly sampleRate = 48000;
  private audioContext = new (window.AudioContext || (window as any).webkitAudioContext)(
    {sampleRate: this.sampleRate},
  );
  private outputNode: GainNode = this.audioContext.createGain();
  private nextStartTime = 0;
  
  private getBufferTime(): number {
    return this.stabilizerEnabled ? 5.0 : 2.0;
  }

  @state() private playbackState: PlaybackState = 'stopped';
  @property({type: Object})
  private filteredPrompts = new Set<string>();
  private connectionError = true;

  @state() private isRecording = false;
  private recordedAudioChunks: Uint8Array[] = [];

  @state() private isRecordingFx = false; // New state for FX recording
  private recordedFxAudioChunks: Float32Array[] = []; // New array for FX audio chunks
  private fxRecordProcessorNode?: ScriptProcessorNode; // Node for capturing FX audio
  private fxRecordSilentDestinationNode?: GainNode; // Node to connect processor to, preventing memory leaks


  @state() private isInfoModalOpen = false;
  @state() private isPresetManagerOpen = false; // New state for preset manager modal
  @state() private presets: Map<string, Preset> = new Map(); // New state for presets

  @state() private isConfirmDeleteModalOpen = false; // New state for confirm delete modal
  @state() private presetIdToDelete: string | null = null; // New state for preset ID to delete
  @state() private presetNameToDelete: string | null = null; // New state for preset name to delete


  // Audio Effects Nodes
  private stabilizerFadeNode!: GainNode; // For graceful buffering
  private effectsChainInput!: GainNode;
  private effectsChainOutput!: GainNode;
  @state() private stabilizerEnabled = true;
  private bufferCheckInterval?: number;
  private isStabilizerFadingOut = false;

  // Continuous Playback / Reconnection
  @state() private continuousPlaybackEnabled = false;
  private reconnectionAttempt = 0;
  private reconnectionTimerId?: number;
  @state() private isReconnecting = false;


  // Master Volume
  @state() private masterVolume = 1;
  private masterVolumeNode!: GainNode;

  // Distortion
  private distortionNode!: WaveShaperNode;
  private distortionInputGain!: GainNode;
  private distortionOutputGain!: GainNode;

  // Chorus
  private chorusInputGain!: GainNode;
  private chorusDelayNode!: DelayNode;
  private chorusLFO!: OscillatorNode;
  private chorusLFOGain!: GainNode;
  private chorusFeedbackGain!: GainNode;
  private chorusWetGain!: GainNode;
  private chorusDryGain!: GainNode;
  private chorusOutputGain!: GainNode;

  // UI Echo
  private echoUiInputGain!: GainNode;
  private echoUiDelayNode!: DelayNode;
  private echoUiFeedbackGain!: GainNode;
  private echoUiWetGain!: GainNode;
  private echoUiDryGain!: GainNode;
  private echoUiOutputGain!: GainNode;

  // UI Reverb
  private reverbUiInputGain!: GainNode;
  private reverbUiDelayNode!: DelayNode; // Simple delay for "reverb" effect
  private reverbUiFeedbackGain!: GainNode;
  private reverbUiWetGain!: GainNode;
  private reverbUiDryGain!: GainNode;
  private reverbUiOutputGain!: GainNode;

  // Flanger
  private flangerInputGain!: GainNode;
  private flangerDelayNode!: DelayNode;
  private flangerLFO!: OscillatorNode;
  private flangerLFOGain!: GainNode;
  private flangerFeedbackGain!: GainNode;
  private flangerWetGain!: GainNode;
  private flangerDryGain!: GainNode;
  private flangerOutputGain!: GainNode;

  // EQ
  private eqInputGain!: GainNode;
  private eqDryGain!: GainNode;
  private eqWetGain!: GainNode;
  private eqNode!: BiquadFilterNode;
  private eqOutputGain!: GainNode;

  // Compressor
  private compressorInputGain!: GainNode;
  private compressorDryGain!: GainNode;
  private compressorWetGain!: GainNode;
  private compressorNode!: DynamicsCompressorNode;
  private compressorOutputGain!: GainNode;

  // Phaser
  private phaserInputGain!: GainNode;
  private phaserStagesNodes: BiquadFilterNode[] = [];
  private phaserLFO!: OscillatorNode;
  private phaserLFOGain!: GainNode; // Depth for LFO
  private phaserFeedbackGain!: GainNode;
  private phaserWetGain!: GainNode;
  private phaserDryGain!: GainNode;
  private phaserOutputGain!: GainNode;
  private readonly MAX_PHASER_STAGES = 12;


  // Tremolo
  private tremoloInputGain!: GainNode;
  private tremoloLFO!: OscillatorNode;
  private tremoloDepthGain!: GainNode; // Gain controlled by LFO
  private tremoloSignalGain!: GainNode; // Main signal gain for tremolo effect
  private tremoloOutputGain!: GainNode;

  // Stereo Phase Shift (Right Channel)
  private stereoPhaseShiftInputGain!: GainNode; // Renamed for clarity
  private stereoPhaseSplitterNode!: ChannelSplitterNode;
  private stereoPhaseProcessingGainNode!: GainNode; // Gain node for right channel phase processing
  private stereoPhaseMergerNode!: ChannelMergerNode;
  private stereoPhaseShiftOutputGain!: GainNode; // Renamed for clarity


  private currentConfig: AppLiveMusicGenerationConfig = {};
  // Initialize as empty; will be populated from SettingsController in firstUpdated
  private defaultConfigValues: AppLiveMusicGenerationConfig = {};


  @query('play-pause-button') private playPauseButton!: PlayPauseButton;
  @query('toast-message') private toastMessage!: ToastMessage;
  @query('settings-controller') private settingsController!: SettingsController;
  @query('record-button') private recordButton!: RecordButton;
  @query('record-fx-button') private recordFxButton!: RecordFxButton; // New
  @query('preset-manager-modal') private presetManagerModal!: PresetManagerModal; // New
  @query('confirmation-modal') private confirmationModal!: ConfirmationModal; // New


  constructor(prompts: Map<string, Prompt>, presets: Map<string, Preset>) {
    super();
    this.prompts = prompts;
    this.presets = presets; // Initialize presets
    this.nextPromptId = this.prompts.size > 0 ?
        Math.max(...Array.from(this.prompts.values()).map(p => parseInt(p.promptId.split('-')[1]))) + 1
        : 0;

    for (const prompt of this.prompts.values()) {
        if (prompt.locked === undefined) {
            prompt.locked = false;
        }
    }
    this._setupAudioEffects();
    this._setupFxRecorder(); // New: setup for FX recording
    this.outputNode.connect(this.audioContext.destination);
  }

  override async firstUpdated() {
    await this.connectToSession();
    this.setSessionPrompts();
    if (this.settingsController) {
       this.currentConfig = this.settingsController.getAppConfig();
       // SettingsController is the source of truth for all defaults (model + UI effects)
       this.defaultConfigValues = this.settingsController.getDefaultConfig();
       this._applyAudioSettings(this.currentConfig);
    }
  }

  private sendGaEvent(eventName: string, eventParams?: Record<string, any>) {
    if (GA_MEASUREMENT_ID && typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, eventParams);
        if (ENABLE_LOGGING) console.log(`GA Event sent: ${eventName}`, eventParams || '');
      } catch (e) {
        if (ENABLE_LOGGING) console.error('Error sending GA event:', e);
      }
    }
  }

  private _makeDistortionCurve(amount: number = 0): Float32Array {
    const k = amount * 200; // amount is already ensured to be finite
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    if (k === 0) { // Linear response if amount is 0
        for (let i = 0; i < n_samples; ++i) {
            curve[i] = (i * 2) / n_samples - 1; // x
        }
    } else {
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
    }
    return curve;
  }

  private _setupAudioEffects() {
    this.stabilizerFadeNode = this.audioContext.createGain();
    this.effectsChainInput = this.audioContext.createGain();
    this.effectsChainOutput = this.audioContext.createGain();

    // Connect stabilizer node to the beginning of the effects chain
    this.stabilizerFadeNode.connect(this.effectsChainInput);


    // Master Volume
    this.masterVolumeNode = this.audioContext.createGain();
    this.masterVolumeNode.gain.value = this.masterVolume;

    // Distortion
    this.distortionInputGain = this.audioContext.createGain();
    this.distortionNode = this.audioContext.createWaveShaper();
    this.distortionNode.curve = this._makeDistortionCurve(0); // Initial: disabled
    this.distortionNode.oversample = '4x';
    this.distortionOutputGain = this.audioContext.createGain();
    this.distortionInputGain.connect(this.distortionNode);
    this.distortionNode.connect(this.distortionOutputGain);

    // Chorus
    this.chorusInputGain = this.audioContext.createGain();
    this.chorusDelayNode = this.audioContext.createDelay(0.1);
    this.chorusLFO = this.audioContext.createOscillator();
    this.chorusLFOGain = this.audioContext.createGain();
    this.chorusFeedbackGain = this.audioContext.createGain();
    this.chorusWetGain = this.audioContext.createGain();
    this.chorusDryGain = this.audioContext.createGain();
    this.chorusOutputGain = this.audioContext.createGain();
    this.chorusWetGain.gain.value = 0;
    this.chorusDryGain.gain.value = 1;
    this.chorusLFOGain.gain.value = 0; // Disable LFO effect
    this.chorusFeedbackGain.gain.value = 0; // Disable feedback
    this.chorusLFO.type = 'sine';
    this.chorusLFO.frequency.value = this.defaultConfigValues.chorusRate ?? 1.5;
    this.chorusDelayNode.delayTime.value = this.defaultConfigValues.chorusDelay ?? 0.025;
    this.chorusLFO.connect(this.chorusLFOGain);
    this.chorusLFOGain.connect(this.chorusDelayNode.delayTime);
    this.chorusInputGain.connect(this.chorusDelayNode);
    this.chorusDelayNode.connect(this.chorusWetGain);
    this.chorusInputGain.connect(this.chorusDryGain);
    this.chorusDelayNode.connect(this.chorusFeedbackGain);
    this.chorusFeedbackGain.connect(this.chorusDelayNode);
    this.chorusWetGain.connect(this.chorusOutputGain);
    this.chorusDryGain.connect(this.chorusOutputGain);
    this.chorusLFO.start();

    // UI Echo
    this.echoUiInputGain = this.audioContext.createGain();
    this.echoUiDelayNode = this.audioContext.createDelay(1.0);
    this.echoUiFeedbackGain = this.audioContext.createGain();
    this.echoUiWetGain = this.audioContext.createGain();
    this.echoUiDryGain = this.audioContext.createGain();
    this.echoUiOutputGain = this.audioContext.createGain();
    this.echoUiWetGain.gain.value = 0;
    this.echoUiDryGain.gain.value = 1;
    this.echoUiFeedbackGain.gain.value = 0; // Disable feedback
    this.echoUiDelayNode.delayTime.value = this.defaultConfigValues.echoUiDelayTime ?? 0.25;
    this.echoUiInputGain.connect(this.echoUiDelayNode);
    this.echoUiDelayNode.connect(this.echoUiFeedbackGain);
    this.echoUiFeedbackGain.connect(this.echoUiDelayNode);
    this.echoUiDelayNode.connect(this.echoUiWetGain);
    this.echoUiInputGain.connect(this.echoUiDryGain);
    this.echoUiWetGain.connect(this.echoUiOutputGain);
    this.echoUiDryGain.connect(this.echoUiOutputGain);

    // UI Reverb (simple delay-based)
    this.reverbUiInputGain = this.audioContext.createGain();
    this.reverbUiDelayNode = this.audioContext.createDelay(0.5);
    this.reverbUiFeedbackGain = this.audioContext.createGain();
    this.reverbUiWetGain = this.audioContext.createGain();
    this.reverbUiDryGain = this.audioContext.createGain();
    this.reverbUiOutputGain = this.audioContext.createGain();
    this.reverbUiWetGain.gain.value = 0;
    this.reverbUiDryGain.gain.value = 1;
    this.reverbUiFeedbackGain.gain.value = 0; // Disable feedback (decay)
    this.reverbUiDelayNode.delayTime.value = this.defaultConfigValues.reverbUiDelayTime ?? 0.05;
    this.reverbUiInputGain.connect(this.reverbUiDelayNode);
    this.reverbUiDelayNode.connect(this.reverbUiFeedbackGain);
    this.reverbUiFeedbackGain.connect(this.reverbUiDelayNode);
    this.reverbUiDelayNode.connect(this.reverbUiWetGain);
    this.reverbUiInputGain.connect(this.reverbUiDryGain);
    this.reverbUiWetGain.connect(this.reverbUiOutputGain);
    this.reverbUiDryGain.connect(this.reverbUiOutputGain);

    // Flanger
    this.flangerInputGain = this.audioContext.createGain();
    this.flangerDelayNode = this.audioContext.createDelay(0.02);
    this.flangerLFO = this.audioContext.createOscillator();
    this.flangerLFOGain = this.audioContext.createGain();
    this.flangerFeedbackGain = this.audioContext.createGain();
    this.flangerWetGain = this.audioContext.createGain();
    this.flangerDryGain = this.audioContext.createGain();
    this.flangerOutputGain = this.audioContext.createGain();
    this.flangerWetGain.gain.value = 0;
    this.flangerDryGain.gain.value = 1;
    this.flangerLFOGain.gain.value = 0; // Disable LFO effect
    this.flangerFeedbackGain.gain.value = 0; // Disable feedback
    this.flangerLFO.type = 'sine';
    this.flangerLFO.frequency.value = this.defaultConfigValues.flangerRate ?? 0.2;
    this.flangerDelayNode.delayTime.value = this.defaultConfigValues.flangerDelay ?? 0.005;
    this.flangerLFO.connect(this.flangerLFOGain);
    this.flangerLFOGain.connect(this.flangerDelayNode.delayTime);
    this.flangerInputGain.connect(this.flangerDelayNode);
    this.flangerDelayNode.connect(this.flangerFeedbackGain);
    this.flangerFeedbackGain.connect(this.flangerDelayNode);
    this.flangerDelayNode.connect(this.flangerWetGain);
    this.flangerInputGain.connect(this.flangerDryGain);
    this.flangerWetGain.connect(this.flangerOutputGain);
    this.flangerDryGain.connect(this.flangerOutputGain);
    this.flangerLFO.start();

    // EQ
    this.eqInputGain = this.audioContext.createGain();
    this.eqDryGain = this.audioContext.createGain();
    this.eqWetGain = this.audioContext.createGain();
    this.eqNode = this.audioContext.createBiquadFilter();
    this.eqOutputGain = this.audioContext.createGain();
    this.eqWetGain.gain.value = 0;
    this.eqDryGain.gain.value = 1;
    this.eqNode.type = 'allpass'; // Benign type for disabled state
    this.eqNode.frequency.value = this.defaultConfigValues.eqFrequency ?? 800;
    this.eqNode.Q.value = this.defaultConfigValues.eqQ ?? 1;
    this.eqNode.gain.value = 0;
    this.eqInputGain.connect(this.eqDryGain);
    this.eqInputGain.connect(this.eqWetGain);
    this.eqWetGain.connect(this.eqNode);
    this.eqDryGain.connect(this.eqOutputGain);
    this.eqNode.connect(this.eqOutputGain);

    // Compressor
    this.compressorInputGain = this.audioContext.createGain();
    this.compressorDryGain = this.audioContext.createGain();
    this.compressorWetGain = this.audioContext.createGain();
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorOutputGain = this.audioContext.createGain();
    this.compressorWetGain.gain.value = 0;
    this.compressorDryGain.gain.value = 1;
    // Set compressor defaults
    this.compressorNode.threshold.value = this.defaultConfigValues.compressorThreshold ?? -24;
    this.compressorNode.knee.value = this.defaultConfigValues.compressorKnee ?? 30;
    this.compressorNode.ratio.value = this.defaultConfigValues.compressorRatio ?? 12;
    this.compressorNode.attack.value = this.defaultConfigValues.compressorAttack ?? 0.003;
    this.compressorNode.release.value = this.defaultConfigValues.compressorRelease ?? 0.25;
    this.compressorInputGain.connect(this.compressorDryGain);
    this.compressorInputGain.connect(this.compressorWetGain);
    this.compressorWetGain.connect(this.compressorNode);
    this.compressorDryGain.connect(this.compressorOutputGain);
    this.compressorNode.connect(this.compressorOutputGain);

    // Phaser
    this.phaserInputGain = this.audioContext.createGain();
    this.phaserLFO = this.audioContext.createOscillator();
    this.phaserLFOGain = this.audioContext.createGain();
    this.phaserFeedbackGain = this.audioContext.createGain();
    this.phaserWetGain = this.audioContext.createGain();
    this.phaserDryGain = this.audioContext.createGain();
    this.phaserOutputGain = this.audioContext.createGain();
    this.phaserWetGain.gain.value = 0;
    this.phaserDryGain.gain.value = 1;
    this.phaserLFOGain.gain.value = 0; // Disable LFO effect
    this.phaserFeedbackGain.gain.value = 0; // Disable feedback
    this.phaserLFO.type = 'sine';
    this.phaserLFO.frequency.value = this.defaultConfigValues.phaserRate ?? 0.5;
    this.phaserLFO.connect(this.phaserLFOGain);
    let lastPhaserStageOutput: AudioNode = this.phaserInputGain;
    const defaultPhaserBaseFreq = this.defaultConfigValues.phaserBaseFrequency ?? 700;
    for (let i = 0; i < this.MAX_PHASER_STAGES; i++) {
        const stage = this.audioContext.createBiquadFilter();
        stage.type = 'allpass';
        stage.frequency.value = defaultPhaserBaseFreq; // Set initial frequency
        this.phaserStagesNodes.push(stage);
        lastPhaserStageOutput.connect(stage);
        lastPhaserStageOutput = stage;
    }
    lastPhaserStageOutput.connect(this.phaserFeedbackGain);
    this.phaserFeedbackGain.connect(this.phaserInputGain);
    lastPhaserStageOutput.connect(this.phaserWetGain);
    this.phaserInputGain.connect(this.phaserDryGain);
    this.phaserWetGain.connect(this.phaserOutputGain);
    this.phaserDryGain.connect(this.phaserOutputGain);
    this.phaserLFO.start();

    // Tremolo
    this.tremoloInputGain = this.audioContext.createGain();
    this.tremoloLFO = this.audioContext.createOscillator();
    this.tremoloDepthGain = this.audioContext.createGain();
    this.tremoloSignalGain = this.audioContext.createGain();
    this.tremoloOutputGain = this.audioContext.createGain();
    this.tremoloDepthGain.gain.value = 0; // LFO has no effect
    this.tremoloSignalGain.gain.value = 1; // Signal passes through
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = this.defaultConfigValues.tremoloRate ?? 5;
    this.tremoloLFO.connect(this.tremoloDepthGain);
    this.tremoloDepthGain.connect(this.tremoloSignalGain.gain);
    this.tremoloInputGain.connect(this.tremoloSignalGain);
    this.tremoloSignalGain.connect(this.tremoloOutputGain);
    this.tremoloLFO.start();

    // Stereo Phase Shift (Right Channel)
    this.stereoPhaseShiftInputGain = this.audioContext.createGain();
    this.stereoPhaseSplitterNode = this.audioContext.createChannelSplitter(2);
    this.stereoPhaseProcessingGainNode = this.audioContext.createGain(); // Default gain 1 (0 deg shift)
    this.stereoPhaseMergerNode = this.audioContext.createChannelMerger(2);
    this.stereoPhaseShiftOutputGain = this.audioContext.createGain();
    this.stereoPhaseShiftInputGain.connect(this.stereoPhaseSplitterNode);
    this.stereoPhaseSplitterNode.connect(this.stereoPhaseMergerNode, 0, 0);
    this.stereoPhaseSplitterNode.connect(this.stereoPhaseProcessingGainNode, 1, 0);
    this.stereoPhaseProcessingGainNode.connect(this.stereoPhaseMergerNode, 0, 1);
    this.stereoPhaseMergerNode.connect(this.stereoPhaseShiftOutputGain);

    // Connect the chain:
    this.effectsChainInput.connect(this.distortionInputGain);
    this.distortionOutputGain.connect(this.chorusInputGain);
    this.chorusOutputGain.connect(this.echoUiInputGain);
    this.echoUiOutputGain.connect(this.reverbUiInputGain);
    this.reverbUiOutputGain.connect(this.flangerInputGain);
    this.flangerOutputGain.connect(this.eqInputGain);
    this.eqOutputGain.connect(this.compressorInputGain);
    this.compressorOutputGain.connect(this.phaserInputGain);
    this.phaserOutputGain.connect(this.tremoloInputGain);
    this.tremoloOutputGain.connect(this.stereoPhaseShiftInputGain);
    this.stereoPhaseShiftOutputGain.connect(this.effectsChainOutput);

    // Route effects to master volume, then to play/pause mute control
    this.effectsChainOutput.connect(this.masterVolumeNode);
    this.masterVolumeNode.connect(this.outputNode);
  }

  private _setupFxRecorder() {
    // Create ScriptProcessorNode for capturing audio after effects
    // Buffer size, input channels (2 for stereo), output channels (2 for stereo)
    this.fxRecordProcessorNode = this.audioContext.createScriptProcessor(4096, 2, 2);
    this.fxRecordProcessorNode.onaudioprocess = this.handleFxAudioProcess.bind(this);

    // Create the silent destination node but do NOT connect it to the graph yet.
    // This will be done only when FX recording is active to completely isolate
    // the node when it's not in use, preventing memory leaks.
    this.fxRecordSilentDestinationNode = this.audioContext.createGain();
    this.fxRecordSilentDestinationNode.gain.setValueAtTime(0, this.audioContext.currentTime);
  }

  private handleFxAudioProcess(event: AudioProcessingEvent) {
    if (!this.isRecordingFx || this.playbackState !== 'playing') return;

    const inputBuffer = event.inputBuffer;
    // We expect stereo data from Lyria and the effects chain
    const leftChannelData = inputBuffer.getChannelData(0); // Float32Array
    const rightChannelData = inputBuffer.getChannelData(1); // Float32Array

    // Interleave the stereo Float32 data into a single Float32Array
    const interleavedData = new Float32Array(leftChannelData.length + rightChannelData.length);
    for (let i = 0, j = 0; i < leftChannelData.length; i++) {
      interleavedData[j++] = leftChannelData[i];
      interleavedData[j++] = rightChannelData[i];
    }
    // Store a copy of the interleaved data
    this.recordedFxAudioChunks.push(interleavedData.slice());
  }

  private handleConnectionError() {
    // If a reconnection is already in progress or queued, do nothing.
    if (this.isReconnecting || this.reconnectionTimerId) {
        return;
    }
    this.connectionError = true;

    // If continuous playback is on and we weren't manually stopped/paused
    if (this.continuousPlaybackEnabled && this.playbackState !== 'stopped' && this.playbackState !== 'paused') {
      this.reconnectionAttempt++;
      const delaySeconds = Math.min(30, this.reconnectionAttempt); // 1, 2, 3... up to 30s
      this.toastMessage.show(`Connection lost. Retrying in ${delaySeconds}s...`, (delaySeconds * 1000) - 500);

      // Set a timer to try reconnecting
      this.reconnectionTimerId = window.setTimeout(() => {
        this.reconnectionTimerId = undefined;
        this.attemptReconnection();
      }, delaySeconds * 1000);

      // Immediately start fading out if stabilizer is on
      if (this.stabilizerEnabled && !this.isStabilizerFadingOut) {
        const FADE_DURATION_SECONDS = 3.0;
        this.isStabilizerFadingOut = true;
        this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.setValueAtTime(this.stabilizerFadeNode.gain.value, this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + FADE_DURATION_SECONDS);
      }
      // Visually show that we are in a loading/reconnecting state.
      this.playbackState = 'loading';

    } else {
      // Original behavior if continuous playback is OFF
      this.toastMessage.show('Connection error, please restart audio.');
      if (this.stabilizerEnabled && (this.playbackState === 'playing' || this.playbackState === 'loading')) {
        // Fade out and then stop
        if (this.isStabilizerFadingOut) return;
        const FADE_DURATION_SECONDS = 3.0;
        this.isStabilizerFadingOut = true;
        this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.setValueAtTime(this.stabilizerFadeNode.gain.value, this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + FADE_DURATION_SECONDS);
        setTimeout(() => {
          this.stopAudio(false);
        }, FADE_DURATION_SECONDS * 1000);
      } else {
        // Stop abruptly
        this.stopAudio(true);
      }
    }
  }


  private async connectToSession() {
    this.session = await ai.live.music.connect({
      model: model,
      callbacks: {
        onmessage: async (e: LiveMusicServerMessage) => {
          if (ENABLE_LOGGING) console.log('Received message from the server: %s\n', e);
          if (e.setupComplete) {
            this.connectionError = false;
             // A successful message means connection is good. Reset any reconnection logic.
            this.stopReconnectionAttempts();
          }
          if (e.filteredPrompt) {
            this.filteredPrompts = new Set([
              ...this.filteredPrompts,
              e.filteredPrompt.text,
            ]);
            this.toastMessage.show(e.filteredPrompt.filteredReason);
          }
          
          const audioChunk = e.serverContent?.audioChunks?.[0];
          if (audioChunk?.data) {
             // We have a working connection if we receive audio.
            this.stopReconnectionAttempts();
            if (
              this.playbackState === 'paused' ||
              this.playbackState === 'stopped'
            )
              return;

            const audioData = audioChunk.data;
            if (this.isRecording && (this.playbackState === 'playing' || this.playbackState === 'loading')) {
                try {
                    const decodedChunk = decode(audioData);
                    this.recordedAudioChunks.push(decodedChunk);
                } catch (err) {
                    if (ENABLE_LOGGING) console.error('Error decoding audio chunk for recording:', err);
                    this.toastMessage.show('Error processing audio for recording.');
                }
            }

            const audioBuffer = await decodeAudioData(
              decode(audioData),
              this.audioContext,
              this.sampleRate,
              2, // Lyria is stereo
            );
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.stabilizerFadeNode);

            if (this.stabilizerEnabled) {
              this.isStabilizerFadingOut = false; // New audio arrived, so we are not fading out.
              // This handles fade-in from an underrun, but not for the very first play.
              if (this.stabilizerFadeNode.gain.value < 1.0 && this.nextStartTime > 0) {
                const FADE_DURATION_SECONDS = 3.0;
                this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
                this.stabilizerFadeNode.gain.setValueAtTime(this.stabilizerFadeNode.gain.value, this.audioContext.currentTime);
                this.stabilizerFadeNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + FADE_DURATION_SECONDS);
              }
            }


            if (this.nextStartTime === 0) { // First chunk since 'play' was pressed
              const bufferTime = this.getBufferTime();
              const FADE_IN_DURATION = 3.0;
              
              // Schedule the audio to start playing after the buffer time.
              this.nextStartTime = this.audioContext.currentTime + bufferTime;
              
              // Schedule the master fade-in to start exactly when the audio starts.
              this.outputNode.gain.cancelScheduledValues(this.audioContext.currentTime);
              this.outputNode.gain.setValueAtTime(0.0001, this.nextStartTime);
              this.outputNode.gain.linearRampToValueAtTime(1, this.nextStartTime + FADE_IN_DURATION);

              // Also schedule the stabilizer node to fade in. This ensures both start in sync.
              this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
              this.stabilizerFadeNode.gain.setValueAtTime(0.0001, this.nextStartTime);
              this.stabilizerFadeNode.gain.linearRampToValueAtTime(1, this.nextStartTime + FADE_IN_DURATION);


              setTimeout(() => {
                if (this.playbackState === 'loading') {
                     this.playbackState = 'playing';
                }
              }, bufferTime * 1000);
            }

            if (this.nextStartTime < this.audioContext.currentTime) {
              if (ENABLE_LOGGING) console.log('under run');
              this.playbackState = 'loading';
              this.nextStartTime = 0;
              return;
            }
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
          }
        },
        onerror: (e: ErrorEvent) => {
          if (this.isReconnecting) return;
          if (ENABLE_LOGGING) console.log('Error occurred: %s\n', JSON.stringify(e));
          this.handleConnectionError();
        },
        onclose: (e: CloseEvent) => {
          if (this.isReconnecting) return;
          if (ENABLE_LOGGING) console.log('Connection closed.');
          this.handleConnectionError();
        },
      },
    });
    if (this.settingsController) {
        const initialSettings = this.settingsController.getAppConfig() as AppLiveMusicGenerationConfig;
        this.currentConfig = initialSettings;
        await this.session.setMusicGenerationConfig({musicGenerationConfig: this._stripUiEffects(initialSettings)});
        this._applyAudioSettings(initialSettings);
    }
  }

  private _stripUiEffects(config: AppLiveMusicGenerationConfig): AppLiveMusicGenerationConfig {
    const {
        distortionEnabled, distortionAmount,
        chorusEnabled, chorusRate, chorusDepth, chorusDelay, chorusFeedback,
        echoUiEnabled, echoUiDelayTime, echoUiFeedback, echoUiMix,
        reverbUiEnabled, reverbUiDelayTime, reverbUiDecay, reverbUiMix,
        flangerEnabled, flangerRate, flangerDepth, flangerDelay, flangerFeedback,
        eqEnabled, eqType, eqFrequency, eqQ, eqGain,
        compressorEnabled, compressorThreshold, compressorKnee, compressorRatio, compressorAttack, compressorRelease,
        phaserEnabled, phaserRate, phaserDepth, phaserFeedback, phaserStages, phaserBaseFrequency,
        tremoloEnabled, tremoloRate, tremoloDepth,
        stereoPhaseShiftAmount,
        ...musicGenConfig
    } = config;
    return musicGenConfig;
  }

  private _ensureFinite(value: number | undefined, defaultValue: number): number {
    if (typeof value === 'number' && isFinite(value)) {
        return value;
    }
    // if (ENABLE_LOGGING) console.warn(`Value ${value} is not finite, using default ${defaultValue}`);
    return defaultValue;
  }

 private _applyAudioSettings(config: AppLiveMusicGenerationConfig) {
    this.currentConfig = config;
    const now = this.audioContext.currentTime;
    const rampTime = 0.02; // Short ramp time for smooth transitions

    // Ensure defaultConfigValues is populated
    if (Object.keys(this.defaultConfigValues).length === 0 && this.settingsController) {
        this.defaultConfigValues = this.settingsController.getDefaultConfig();
    }
    const defaults = this.defaultConfigValues;


    // Distortion
    const distortionEnabled = config.distortionEnabled ?? defaults.distortionEnabled ?? false;
    let distortionAmountFinal = 0;
    if (distortionEnabled) {
      const defaultDistAmount = defaults.distortionAmount!;
      let currentDistAmount = config.distortionAmount ?? defaultDistAmount;
      distortionAmountFinal = this._ensureFinite(currentDistAmount, defaultDistAmount);
    }
    this.distortionNode.curve = this._makeDistortionCurve(distortionAmountFinal);


    // Chorus
    const chorusEnabled = config.chorusEnabled ?? defaults.chorusEnabled ?? false;
    this.chorusDryGain.gain.setTargetAtTime(chorusEnabled ? 0.5 : 1, now, rampTime);
    this.chorusWetGain.gain.setTargetAtTime(chorusEnabled ? 0.5 : 0, now, rampTime);
    if (chorusEnabled) {
        const rate = this._ensureFinite(config.chorusRate, defaults.chorusRate!);
        const depth = this._ensureFinite(config.chorusDepth, defaults.chorusDepth!);
        const delay = this._ensureFinite(config.chorusDelay, defaults.chorusDelay!);
        const feedback = this._ensureFinite(config.chorusFeedback, defaults.chorusFeedback!);
        
        this.chorusLFO.frequency.setTargetAtTime(rate, now, rampTime);
        this.chorusLFOGain.gain.setTargetAtTime(this._ensureFinite(depth * 0.005, 0), now, rampTime);
        this.chorusDelayNode.delayTime.setTargetAtTime(delay, now, rampTime);
        this.chorusFeedbackGain.gain.setTargetAtTime(feedback, now, rampTime);
    } else {
        this.chorusLFOGain.gain.setTargetAtTime(0, now, rampTime);
        this.chorusFeedbackGain.gain.setTargetAtTime(0, now, rampTime);
        this.chorusLFO.frequency.setTargetAtTime(defaults.chorusRate!, now, rampTime);
        this.chorusDelayNode.delayTime.setTargetAtTime(defaults.chorusDelay!, now, rampTime);
    }

    // UI Echo
    const echoUiEnabled = config.echoUiEnabled ?? defaults.echoUiEnabled ?? false;
    const echoUiMixDefault = defaults.echoUiMix!;
    let currentEchoUiMix = config.echoUiMix ?? echoUiMixDefault;
    currentEchoUiMix = this._ensureFinite(currentEchoUiMix, echoUiMixDefault);

    this.echoUiDryGain.gain.setTargetAtTime(echoUiEnabled ? 1 - currentEchoUiMix : 1, now, rampTime);
    this.echoUiWetGain.gain.setTargetAtTime(echoUiEnabled ? currentEchoUiMix : 0, now, rampTime);
    if (echoUiEnabled) {
        const delayTime = this._ensureFinite(config.echoUiDelayTime, defaults.echoUiDelayTime!);
        const feedback = this._ensureFinite(config.echoUiFeedback, defaults.echoUiFeedback!);
        this.echoUiDelayNode.delayTime.setTargetAtTime(delayTime, now, rampTime);
        this.echoUiFeedbackGain.gain.setTargetAtTime(feedback, now, rampTime);
    } else {
        this.echoUiFeedbackGain.gain.setTargetAtTime(0, now, rampTime);
        this.echoUiDelayNode.delayTime.setTargetAtTime(defaults.echoUiDelayTime!, now, rampTime);
    }

    // UI Reverb
    const reverbUiEnabled = config.reverbUiEnabled ?? defaults.reverbUiEnabled ?? false;
    const reverbUiMixDefault = defaults.reverbUiMix!;
    let currentReverbUiMix = config.reverbUiMix ?? reverbUiMixDefault;
    currentReverbUiMix = this._ensureFinite(currentReverbUiMix, reverbUiMixDefault);

    this.reverbUiDryGain.gain.setTargetAtTime(reverbUiEnabled ? 1 - currentReverbUiMix : 1, now, rampTime);
    this.reverbUiWetGain.gain.setTargetAtTime(reverbUiEnabled ? currentReverbUiMix : 0, now, rampTime);
    if (reverbUiEnabled) {
        const delayTime = this._ensureFinite(config.reverbUiDelayTime, defaults.reverbUiDelayTime!);
        const decay = this._ensureFinite(config.reverbUiDecay, defaults.reverbUiDecay!);
        this.reverbUiDelayNode.delayTime.setTargetAtTime(delayTime, now, rampTime);
        this.reverbUiFeedbackGain.gain.setTargetAtTime(decay, now, rampTime);
    } else {
        this.reverbUiFeedbackGain.gain.setTargetAtTime(0, now, rampTime);
        this.reverbUiDelayNode.delayTime.setTargetAtTime(defaults.reverbUiDelayTime!, now, rampTime);
    }

    // Flanger
    const flangerEnabled = config.flangerEnabled ?? defaults.flangerEnabled ?? false;
    this.flangerDryGain.gain.setTargetAtTime(flangerEnabled ? 0.5 : 1, now, rampTime);
    this.flangerWetGain.gain.setTargetAtTime(flangerEnabled ? 0.5 : 0, now, rampTime);
    if (flangerEnabled) {
        const rate = this._ensureFinite(config.flangerRate, defaults.flangerRate!);
        const depth = this._ensureFinite(config.flangerDepth, defaults.flangerDepth!);
        const delay = this._ensureFinite(config.flangerDelay, defaults.flangerDelay!);
        const feedback = this._ensureFinite(config.flangerFeedback, defaults.flangerFeedback!);

        this.flangerLFO.frequency.setTargetAtTime(rate, now, rampTime);
        this.flangerLFOGain.gain.setTargetAtTime(depth, now, rampTime); // Depth is already LFO gain for flanger
        this.flangerDelayNode.delayTime.setTargetAtTime(delay, now, rampTime);
        this.flangerFeedbackGain.gain.setTargetAtTime(feedback, now, rampTime);
    } else {
        this.flangerLFOGain.gain.setTargetAtTime(0, now, rampTime);
        this.flangerFeedbackGain.gain.setTargetAtTime(0, now, rampTime);
        this.flangerLFO.frequency.setTargetAtTime(defaults.flangerRate!, now, rampTime);
        this.flangerDelayNode.delayTime.setTargetAtTime(defaults.flangerDelay!, now, rampTime);
    }

    // EQ
    const eqEnabled = config.eqEnabled ?? defaults.eqEnabled ?? false;
    this.eqDryGain.gain.setTargetAtTime(eqEnabled ? 0 : 1, now, rampTime);
    this.eqWetGain.gain.setTargetAtTime(eqEnabled ? 1 : 0, now, rampTime);
    if (eqEnabled) {
        this.eqNode.type = config.eqType ?? defaults.eqType!;
        const frequency = this._ensureFinite(config.eqFrequency, defaults.eqFrequency!);
        const qFactor = this._ensureFinite(config.eqQ, defaults.eqQ!);
        this.eqNode.frequency.setTargetAtTime(frequency, now, rampTime);
        this.eqNode.Q.setTargetAtTime(qFactor, now, rampTime);
        
        let eqGainValue = 0;
        if (this.eqNode.type === 'peaking' || this.eqNode.type === 'lowshelf' || this.eqNode.type === 'highshelf') {
            eqGainValue = this._ensureFinite(config.eqGain, defaults.eqGain!);
        }
        this.eqNode.gain.setTargetAtTime(eqGainValue, now, rampTime);
    } else {
        this.eqNode.type = 'allpass';
        this.eqNode.frequency.setTargetAtTime(defaults.eqFrequency!, now, rampTime);
        this.eqNode.Q.setTargetAtTime(defaults.eqQ!, now, rampTime);
        this.eqNode.gain.setTargetAtTime(0, now, rampTime);
    }

    // Compressor
    const compressorEnabled = config.compressorEnabled ?? defaults.compressorEnabled ?? false;
    this.compressorDryGain.gain.setTargetAtTime(compressorEnabled ? 0 : 1, now, rampTime);
    this.compressorWetGain.gain.setTargetAtTime(compressorEnabled ? 1 : 0, now, rampTime);

    const threshold = this._ensureFinite(config.compressorThreshold, defaults.compressorThreshold!);
    const knee = this._ensureFinite(config.compressorKnee, defaults.compressorKnee!);
    const ratio = this._ensureFinite(config.compressorRatio, defaults.compressorRatio!);
    const attack = this._ensureFinite(config.compressorAttack, defaults.compressorAttack!);
    const release = this._ensureFinite(config.compressorRelease, defaults.compressorRelease!);

    if (compressorEnabled) {
        this.compressorNode.threshold.setTargetAtTime(threshold, now, rampTime);
        this.compressorNode.knee.setTargetAtTime(knee, now, rampTime);
        this.compressorNode.ratio.setTargetAtTime(ratio, now, rampTime);
        this.compressorNode.attack.setTargetAtTime(attack, now, rampTime);
        this.compressorNode.release.setTargetAtTime(release, now, rampTime);
    } else {
        // Reset compressor to defaults when disabled (using ensured default values)
        this.compressorNode.threshold.setTargetAtTime(defaults.compressorThreshold!, now, rampTime);
        this.compressorNode.knee.setTargetAtTime(defaults.compressorKnee!, now, rampTime);
        this.compressorNode.ratio.setTargetAtTime(defaults.compressorRatio!, now, rampTime);
        this.compressorNode.attack.setTargetAtTime(defaults.compressorAttack!, now, rampTime);
        this.compressorNode.release.setTargetAtTime(defaults.compressorRelease!, now, rampTime);
    }

    // Phaser
    const phaserEnabled = config.phaserEnabled ?? defaults.phaserEnabled ?? false;
    this.phaserDryGain.gain.setTargetAtTime(phaserEnabled ? 0.5 : 1, now, rampTime);
    this.phaserWetGain.gain.setTargetAtTime(phaserEnabled ? 0.5 : 0, now, rampTime);
    
    const defaultPhaserBaseFreq = defaults.phaserBaseFrequency!;
    let currentPhaserBaseFreq = config.phaserBaseFrequency ?? defaultPhaserBaseFreq;
    currentPhaserBaseFreq = this._ensureFinite(currentPhaserBaseFreq, defaultPhaserBaseFreq);

    if (phaserEnabled) {
        const defaultPhaserRate = defaults.phaserRate!;
        let currentPhaserRate = config.phaserRate ?? defaultPhaserRate;
        currentPhaserRate = this._ensureFinite(currentPhaserRate, defaultPhaserRate);
        this.phaserLFO.frequency.setTargetAtTime(currentPhaserRate, now, rampTime);

        const defaultPhaserDepth = defaults.phaserDepth!;
        let currentPhaserDepth = config.phaserDepth ?? defaultPhaserDepth;
        currentPhaserDepth = this._ensureFinite(currentPhaserDepth, defaultPhaserDepth);
        
        let lfoGainVal = currentPhaserDepth * currentPhaserBaseFreq * 0.7; // currentPhaserBaseFreq is already ensured
        lfoGainVal = this._ensureFinite(lfoGainVal, 0); // Default LFO modulation to 0
        this.phaserLFOGain.gain.setTargetAtTime(lfoGainVal, now, rampTime);

        const defaultPhaserFeedback = defaults.phaserFeedback!;
        let currentPhaserFeedback = config.phaserFeedback ?? defaultPhaserFeedback;
        currentPhaserFeedback = this._ensureFinite(currentPhaserFeedback, defaultPhaserFeedback);
        this.phaserFeedbackGain.gain.setTargetAtTime(currentPhaserFeedback, now, rampTime);

        const defaultPhaserStages = defaults.phaserStages!;
        let currentPhaserStages = config.phaserStages ?? defaultPhaserStages;
        currentPhaserStages = Math.round(this._ensureFinite(currentPhaserStages, defaultPhaserStages));

        this.phaserStagesNodes.forEach((stage, i) => {
            stage.frequency.setTargetAtTime(currentPhaserBaseFreq, now, rampTime);
            try { this.phaserLFOGain.disconnect(stage.frequency); } catch(e) {/* ignore */}
            if (i < currentPhaserStages) {
                this.phaserLFOGain.connect(stage.frequency);
            }
        });
    } else {
        this.phaserLFOGain.gain.setTargetAtTime(0, now, rampTime);
        this.phaserFeedbackGain.gain.setTargetAtTime(0, now, rampTime);
        this.phaserLFO.frequency.setTargetAtTime(defaults.phaserRate!, now, rampTime);
        this.phaserStagesNodes.forEach((stage) => {
            try { this.phaserLFOGain.disconnect(stage.frequency); } catch(e) {/* ignore */}
            stage.frequency.setTargetAtTime(currentPhaserBaseFreq, now, rampTime); // currentPhaserBaseFreq is ensured
        });
    }

    // Tremolo
    const tremoloEnabled = config.tremoloEnabled ?? defaults.tremoloEnabled ?? false;
    if (tremoloEnabled) {
        const defaultTremoloRate = defaults.tremoloRate!;
        let currentTremoloRate = config.tremoloRate ?? defaultTremoloRate;
        currentTremoloRate = this._ensureFinite(currentTremoloRate, defaultTremoloRate);
        this.tremoloLFO.frequency.setTargetAtTime(currentTremoloRate, now, rampTime);

        const defaultTremoloDepth = defaults.tremoloDepth!;
        let currentTremoloDepth = config.tremoloDepth ?? defaultTremoloDepth;
        currentTremoloDepth = this._ensureFinite(currentTremoloDepth, defaultTremoloDepth);
        
        let signalGainVal = 1 - (currentTremoloDepth / 2);
        signalGainVal = this._ensureFinite(signalGainVal, 1); // Default to full signal if calc is non-finite
        this.tremoloSignalGain.gain.setTargetAtTime(signalGainVal, now, rampTime);
        
        let depthGainVal = currentTremoloDepth / 2;
        depthGainVal = this._ensureFinite(depthGainVal, 0); // Default to no LFO effect if calc is non-finite
        this.tremoloDepthGain.gain.setTargetAtTime(depthGainVal, now, rampTime);
    } else {
        this.tremoloSignalGain.gain.setTargetAtTime(1, now, rampTime);
        this.tremoloDepthGain.gain.setTargetAtTime(0, now, rampTime);
        this.tremoloLFO.frequency.setTargetAtTime(defaults.tremoloRate!, now, rampTime);
    }

    // Stereo Phase Shift (Right Channel)
    const defaultPhaseShift = defaults.stereoPhaseShiftAmount ?? 0;
    let currentPhaseShift = config.stereoPhaseShiftAmount ?? defaultPhaseShift;
    currentPhaseShift = this._ensureFinite(currentPhaseShift, defaultPhaseShift);
    
    let phaseGainValue = Math.cos(currentPhaseShift * 2 * Math.PI);
    phaseGainValue = this._ensureFinite(phaseGainValue, 1); // Default to gain 1 (0 or 360 deg) if Math.cos is non-finite (unlikely with finite input)
    this.stereoPhaseProcessingGainNode.gain.setTargetAtTime(phaseGainValue, now, rampTime);
}


  private setSessionPrompts = throttle(async () => {
    if (!this.session) return;
    const promptsToSend = Array.from(this.prompts.values()).filter((p) => {
      return !this.filteredPrompts.has(p.text) && p.weight !== 0;
    });
    try {
      await this.session.setWeightedPrompts({
        weightedPrompts: promptsToSend,
      });
    } catch (e: any) {
      this.toastMessage.show(e.message);
      this.pauseAudio();
    }
  }, 200);

  private dispatchPromptsChange() {
    this.dispatchEvent(
      new CustomEvent('prompts-changed', {detail: this.prompts}),
    );
  }

  private handlePromptChanged(e: CustomEvent<Partial<Prompt>>) {
    const {promptId, text, weight} = e.detail;
    if (!promptId) {
        if (ENABLE_LOGGING) console.error('Prompt ID missing in prompt-changed event');
        return;
    }
    const prompt = this.prompts.get(promptId);

    if (!prompt) {
      if (ENABLE_LOGGING) console.error('prompt not found', promptId);
      return;
    }

    if (text !== undefined) prompt.text = text;
    if (weight !== undefined) prompt.weight = weight;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, prompt);

    this.prompts = newPrompts;
    this.setSessionPrompts();
    this.requestUpdate();
    this.dispatchPromptsChange();
  }

  private handlePromptLockToggled(e: CustomEvent<{promptId: string; locked: boolean}>) {
    const {promptId, locked} = e.detail;
    const prompt = this.prompts.get(promptId);
    if (prompt) {
      prompt.locked = locked;
      this.prompts = new Map(this.prompts); // Trigger update
      this.dispatchPromptsChange(); // Save to localStorage
      this.requestUpdate('prompts');
    }
  }


  /** Generates radial gradients for each prompt based on weight and color. */
  private makeBackground() {
    const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

    const MAX_WEIGHT = 0.5;
    const MAX_ALPHA = 0.6;

    const bg: string[] = [];

    [...this.prompts.values()].forEach((p, i) => {
      const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
      const alpha = Math.round(alphaPct * 0xff)
        .toString(16)
        .padStart(2, '0');

      const stop = p.weight / 2;
      const x = (i % 4) / 3;
      const y = Math.floor(i / 4) / 3;
      const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0px, ${p.color}00 ${stop * 100}%)`;

      bg.push(s);
    });

    return bg.join(', ');
  }

  private async handlePlayPause() {
    this.stopReconnectionAttempts();
    if (this.playbackState === 'playing') {
      this.pauseAudio();
    } else if (
      this.playbackState === 'paused' ||
      this.playbackState === 'stopped'
    ) {
      if (this.connectionError) {
        await this.connectToSession();
        this.setSessionPrompts();
      }
      this.loadAudio();
      this.sendGaEvent('start_music_generation', { model_id: model });
    } else if (this.playbackState === 'loading') {
      this.stopAudio();
    }
    if (ENABLE_LOGGING) console.debug('handlePlayPause');
  }

  private pauseAudio() {
    this.stopReconnectionAttempts();
    if (this.isRecording) {
        this.stopRecordingAndSave();
    }
    if (this.isRecordingFx) { // New
        this.stopRecordingFxAndSave();
    }
    this.session?.pause();
    this.playbackState = 'paused';
    if (this.audioContext.state === 'running') {
        const FADE_OUT_DURATION = 2.0;
        this.outputNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.outputNode.gain.setValueAtTime(this.outputNode.gain.value, this.audioContext.currentTime);
        this.outputNode.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + FADE_OUT_DURATION);
        
        this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.setValueAtTime(this.stabilizerFadeNode.gain.value, this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + FADE_OUT_DURATION);

    } else {
        this.outputNode.gain.value = 0;
        this.stabilizerFadeNode.gain.value = 0;
    }
    this.nextStartTime = 0;
    this.stopBufferCheck();
    this.isStabilizerFadingOut = false;
  }

  private loadAudio() {
    this.audioContext.resume();
    // Reset the next start time whenever we begin loading a new stream.
    // This is crucial for restarts and reconnections to ensure the first
    // audio chunk is scheduled correctly and playback state is updated.
    this.nextStartTime = 0;

    // Set gain to 0 immediately. The fade-in will be handled when the first audio chunk arrives.
    if (this.audioContext.state === 'running') {
        this.outputNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.outputNode.gain.setValueAtTime(0.0001, this.audioContext.currentTime);
        
        this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.setValueAtTime(0.0001, this.audioContext.currentTime);
    } else {
        // If context isn't running, just set the value. It will be picked up on resume.
        this.outputNode.gain.value = 0.0001;
        this.stabilizerFadeNode.gain.value = 0.0001;
    }

    this.session?.play();
    this.playbackState = 'loading';
    this.startBufferCheck();
  }

  private stopAudio(resetGain = true) {
    this.stopReconnectionAttempts();
    if (this.isRecording) {
        this.stopRecordingAndSave();
    }
    if (this.isRecordingFx) { // New
        this.stopRecordingFxAndSave();
    }
    this.session?.stop();
    this.playbackState = 'stopped';
    if (resetGain) {
      if (this.audioContext.state === 'running') {
          this.outputNode.gain.cancelScheduledValues(this.audioContext.currentTime);
          this.outputNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
          this.stabilizerFadeNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      } else {
           this.outputNode.gain.value = 0;
           this.stabilizerFadeNode.gain.value = 0;
      }
    }
    this.nextStartTime = 0;
    this.stopBufferCheck();
    this.isStabilizerFadingOut = false;
  }

  private async handleAddPrompt() {
    const newPromptId = `prompt-${this.nextPromptId++}`;
    const usedColors = [...this.prompts.values()].map((p) => p.color);
    const newPrompt: Prompt = {
      promptId: newPromptId,
      text: 'New Prompt', // Default text
      weight: 0,
      color: getUnusedRandomColor(usedColors),
      locked: false,
    };
    const newPrompts = new Map(this.prompts);
    newPrompts.set(newPromptId, newPrompt);
    this.prompts = newPrompts;

    await this.setSessionPrompts();
    this.dispatchPromptsChange();

    await this.updateComplete;

    const newPromptElement = this.renderRoot.querySelector<PromptController>(
      `prompt-controller[promptId="${newPromptId}"]`,
    );
    if (newPromptElement) {
      newPromptElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'end',
      });

      const textSpan =
        newPromptElement.shadowRoot?.querySelector<HTMLSpanElement>('#text');
      if (textSpan) {
        textSpan.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  private async handleAddRandomPrompt() {
    const newPromptId = `prompt-${this.nextPromptId++}`;
    const usedColors = [...this.prompts.values()].map((p) => p.color);

    let randomText = 'Random Prompt'; // Fallback
    if (PROMPT_TEXT_PRESETS.length > 0) {
        const randomIndex = Math.floor(Math.random() * PROMPT_TEXT_PRESETS.length);
        randomText = PROMPT_TEXT_PRESETS[randomIndex];
    }

    const newPrompt: Prompt = {
      promptId: newPromptId,
      text: randomText,
      weight: 0,
      color: getUnusedRandomColor(usedColors),
      locked: false,
    };
    const newPrompts = new Map(this.prompts);
    newPrompts.set(newPromptId, newPrompt);
    this.prompts = newPrompts;

    await this.setSessionPrompts();
    this.dispatchPromptsChange();

    await this.updateComplete;

    const newPromptElement = this.renderRoot.querySelector<PromptController>(
      `prompt-controller[promptId="${newPromptId}"]`,
    );
    if (newPromptElement) {
      newPromptElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'end',
      });
      // Optionally focus and select the pre-filled text
      const textSpan = newPromptElement.shadowRoot?.querySelector<HTMLSpanElement>('#text');
      if (textSpan) {
        textSpan.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  private handlePromptRemoved(e: CustomEvent<string>) {
    e.stopPropagation();
    const promptIdToRemove = e.detail;
    const promptToRemove = this.prompts.get(promptIdToRemove);

    if (promptToRemove?.locked) {
        this.toastMessage.show('Cannot remove a locked prompt.');
        return;
    }

    if (this.prompts.has(promptIdToRemove)) {
      this.prompts.delete(promptIdToRemove);
      const newPrompts = new Map(this.prompts);
      this.prompts = newPrompts;
      this.setSessionPrompts();
      this.dispatchPromptsChange();
    } else {
      if (ENABLE_LOGGING) console.warn(
        `Attempted to remove non-existent prompt ID: ${promptIdToRemove}`,
      );
    }
  }

  private handlePromptsContainerWheel(e: WheelEvent) {
    const container = e.currentTarget as HTMLElement;
    if (e.deltaX !== 0) {
      container.scrollLeft += e.deltaX;
    }
  }

  private updateSettings = throttle(
    async (e: CustomEvent<AppLiveMusicGenerationConfig>) => {
      if (!this.session) return;
      const newConfig = e.detail;
      this.currentConfig = newConfig;
      await this.session.setMusicGenerationConfig({
        musicGenerationConfig: this._stripUiEffects(newConfig),
      });
      this._applyAudioSettings(newConfig);
    },
    200,
  );

  private async handleReset() {
    this.stopReconnectionAttempts();
    if (this.isRecording) {
        this.stopRecordingAndSave();
    }
    if (this.isRecordingFx) { // New
        this.stopRecordingFxAndSave();
    }
    if (this.connectionError || !this.session) {
      await this.connectToSession();
    }
    this.pauseAudio();
    this.session?.resetContext();
    if (this.settingsController) {
        this.settingsController.resetToDefaults();
        // After reset, settingsController would have emitted 'settings-changed'
        // which calls updateSettings and _applyAudioSettings.
        // So this.currentConfig should be updated automatically.
        // We explicitly get the reset config to ensure _applyAudioSettings uses it.
        const resetConfig = this.settingsController.getAppConfig();
        this.currentConfig = resetConfig;
        this.defaultConfigValues = this.settingsController.getDefaultConfig(); // Update defaultConfigValues too
        this._applyAudioSettings(resetConfig); // Re-apply the reset audio settings
    }
    setTimeout(() => {
        this.setSessionPrompts();
        if (this.playbackState !== 'playing' && this.playbackState !== 'loading') {
            this.loadAudio();
        }
    } , 200);
  }

  private async handleRecordToggle() {
    if (this.isRecording) {
      this.stopRecordingAndSave();
    } else {
      this.isRecording = true;
      this.recordedAudioChunks = [];
      this.toastMessage.show('Recording raw audio started...');
      if (this.recordButton) this.recordButton.recording = true;

      if (this.playbackState === 'stopped' || this.playbackState === 'paused') {
        if (this.connectionError || !this.session) {
            await this.connectToSession();
            this.setSessionPrompts();
        }
        this.loadAudio();
      }
    }
  }

  private stopRecordingAndSave() {
    if (!this.isRecording && this.recordedAudioChunks.length === 0) return;

    this.isRecording = false;
    if (this.recordButton) this.recordButton.recording = false;

    if (this.recordedAudioChunks.length === 0) {
      this.toastMessage.show('No raw audio data to save.');
      return;
    }

    try {
      let totalLength = 0;
      for (const chunk of this.recordedAudioChunks) {
        totalLength += chunk.length;
      }
      const concatenatedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of this.recordedAudioChunks) {
        concatenatedPcm.set(chunk, offset);
        offset += chunk.length;
      }

      const wavBlob = pcmToWav(concatenatedPcm, 2, this.sampleRate, 16);
      downloadBlob(wavBlob, 'prompt-dj-recording-raw.wav');
      this.toastMessage.show('Raw audio recording saved as WAV.');
    } catch (error) {
      if (ENABLE_LOGGING) console.error('Error saving raw WAV file:', error);
      this.toastMessage.show('Error saving raw recording.');
    } finally {
      this.recordedAudioChunks = [];
    }
  }


  private async handleRecordFxToggle() {
    if (this.isRecordingFx) {
      this.stopRecordingFxAndSave();
    } else {
      // Connect the processor and its destination to the graph right before starting.
      this.fxRecordSilentDestinationNode!.connect(this.audioContext.destination);
      this.effectsChainOutput.connect(this.fxRecordProcessorNode!);
      this.fxRecordProcessorNode!.connect(this.fxRecordSilentDestinationNode!);

      this.isRecordingFx = true;
      this.recordedFxAudioChunks = [];
      this.toastMessage.show('Recording audio with FX started...');
      if (this.recordFxButton) this.recordFxButton.recording = true;

      // Ensure audio context is active and music is playing
      this.audioContext.resume();
      if (this.playbackState === 'stopped' || this.playbackState === 'paused') {
        if (this.connectionError || !this.session) {
          await this.connectToSession();
          this.setSessionPrompts();
        }
        this.loadAudio(); // This will set playbackState to 'loading' then 'playing'
      }
    }
  }

  private stopRecordingFxAndSave() {
    // If we are not in a recording state, do nothing.
    if (!this.isRecordingFx) return;

    // First, disconnect the entire FX recording subgraph from the main graph.
    try {
      this.effectsChainOutput.disconnect(this.fxRecordProcessorNode!);
      this.fxRecordProcessorNode!.disconnect(this.fxRecordSilentDestinationNode!);
      this.fxRecordSilentDestinationNode!.disconnect(this.audioContext.destination);
    } catch (e) {
      if (ENABLE_LOGGING) console.warn('Ignoring error while disconnecting FX recorder:', e);
    }

    this.isRecordingFx = false;
    if (this.recordFxButton) this.recordFxButton.recording = false;

    if (this.recordedFxAudioChunks.length === 0) {
      this.toastMessage.show('No FX audio data to save.');
      return;
    }

    try {
      let totalLength = 0;
      for (const chunk of this.recordedFxAudioChunks) {
        totalLength += chunk.length; // Each chunk is a Float32Array
      }
      const concatenatedFloat32 = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.recordedFxAudioChunks) {
        concatenatedFloat32.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert Float32Array to Int16Array
      const int16Array = new Int16Array(concatenatedFloat32.length);
      for (let i = 0; i < concatenatedFloat32.length; i++) {
        // Clamp values and scale to Int16 range
        const val = Math.max(-1.0, Math.min(1.0, concatenatedFloat32[i]));
        int16Array[i] = val * 32767;
      }

      // Get Uint8Array view of the Int16Array buffer
      const pcmDataUint8 = new Uint8Array(int16Array.buffer);

      // Create WAV blob (2 channels, specified sampleRate, 16 bits per sample)
      const wavBlob = pcmToWav(pcmDataUint8, 2, this.sampleRate, 16);
      downloadBlob(wavBlob, 'prompt-dj-recording-fx.wav');
      this.toastMessage.show('FX audio recording saved as WAV.');
    } catch (error) {
      if (ENABLE_LOGGING) console.error('Error saving FX WAV file:', error);
      this.toastMessage.show('Error saving FX recording.');
    } finally {
      this.recordedFxAudioChunks = [];
    }
  }

  private handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const newVolume = target.valueAsNumber;
    this.masterVolume = newVolume;
    this.masterVolumeNode.gain.setTargetAtTime(this.masterVolume, this.audioContext.currentTime, 0.01);
  }

  private renderVolumeIcon() {
    const speakerOn = svg`<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
    const speakerMute = svg`<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;

    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      ${this.masterVolume > 0 ? speakerOn : speakerMute}
    </svg>`;
  }

  private startBufferCheck() {
    this.stopBufferCheck(); // Ensure no multiple intervals running
    if (!this.stabilizerEnabled) return;

    this.bufferCheckInterval = window.setInterval(() => {
        if (this.playbackState !== 'playing' || this.nextStartTime === 0) {
            return;
        }

        const FADE_THRESHOLD_SECONDS = 3.0;
        const FADE_DURATION_SECONDS = 3.0;
        const bufferRemaining = this.nextStartTime - this.audioContext.currentTime;

        if (bufferRemaining < FADE_THRESHOLD_SECONDS && !this.isStabilizerFadingOut) {
            this.isStabilizerFadingOut = true;
            // Buffer is running low, start fading out. Ramp to a very small value instead of 0
            // to avoid issues if the gain is ever used in a logarithmic context.
            this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
            this.stabilizerFadeNode.gain.setValueAtTime(this.stabilizerFadeNode.gain.value, this.audioContext.currentTime);
            this.stabilizerFadeNode.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + FADE_DURATION_SECONDS);
        }
    }, 250);
  }

  private stopBufferCheck() {
    if (this.bufferCheckInterval) {
        clearInterval(this.bufferCheckInterval);
        this.bufferCheckInterval = undefined;
    }
  }

  private handleStabilizerToggle(e: Event) {
    this.stabilizerEnabled = (e.target as HTMLInputElement).checked;
    if (this.stabilizerEnabled) {
        if (this.playbackState === 'playing') {
            this.startBufferCheck();
        }
    } else {
        this.stopBufferCheck();
        this.isStabilizerFadingOut = false; // Reset flag
        // Ensure gain is back to 1 if we disable it mid-fade
        this.stabilizerFadeNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.stabilizerFadeNode.gain.setValueAtTime(this.stabilizerFadeNode.gain.value, this.audioContext.currentTime);
        // Use a quick linear ramp back to 1 for consistency
        this.stabilizerFadeNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.1);
    }
  }

  private stopReconnectionAttempts() {
    if (this.reconnectionTimerId) {
      clearTimeout(this.reconnectionTimerId);
      this.reconnectionTimerId = undefined;
    }
    this.reconnectionAttempt = 0;
    this.isReconnecting = false;
  }

  private handleContinuousPlaybackToggle(e: Event) {
    this.continuousPlaybackEnabled = (e.target as HTMLInputElement).checked;
    if (!this.continuousPlaybackEnabled) {
      this.stopReconnectionAttempts();
    }
  }

  private async attemptReconnection() {
    // Prevent concurrent attempts
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    // Don't try to reconnect if user stopped it.
    if (this.playbackState === 'stopped' || this.playbackState === 'paused') {
      this.stopReconnectionAttempts(); // This will reset isReconnecting flag.
      return;
    }

    this.toastMessage.show('Attempting to reconnect...');
    this.playbackState = 'loading'; // Show loading spinner on play button

    try {
      // Close any existing session remnants before creating a new one
      this.session?.close();
      await this.connectToSession();
      // If we got here, connectToSession resolved. Assume success and proceed.
      // The onmessage callback will handle resetting connectionError and stopping retries.
      this.toastMessage.show('Reconnected successfully!');
      this.reconnectionAttempt = 0; // Reset on success
      this.isReconnecting = false; // Reconnect attempt is done.
      
      await this.setSessionPrompts();
      this.loadAudio(); // Start playing again
    } catch (e) {
      if (ENABLE_LOGGING) console.error('Reconnect attempt failed:', e);
      this.isReconnecting = false; // Reconnect attempt finished (with an error).
      // The `connect` call failed (e.g., user is offline).
      // We need to handle this as a connection error to schedule the next retry.
      this.handleConnectionError();
    }
  }

  private _handleOpenPresetManager() {
    this.isPresetManagerOpen = true;
  }

  private _handleClosePresetManager() {
    this.isPresetManagerOpen = false;
  }

  private _handleSavePresetRequest(e: CustomEvent<{ name: string }>) {
    if (!this.settingsController) {
        this.toastMessage.show('Error: Settings controller not available.');
        return;
    }
    const newPreset: Preset = {
      id: `preset-${Date.now()}`,
      name: e.detail.name,
      prompts: Array.from(this.prompts.values()).map(p => ({...p})), // Deep copy prompts
      settings: { ...this.currentConfig }, // Deep copy current settings
      autoDensity: this.settingsController.autoDensity,
      autoBrightness: this.settingsController.autoBrightness,
    };

    this.presets.set(newPreset.id, newPreset);
    this.presets = new Map(this.presets); // Trigger Lit update
    setStoredPresets(this.presets);
    this.toastMessage.show(`Preset '${newPreset.name}' saved.`);
    if (this.presetManagerModal) this.presetManagerModal.requestUpdate(); // Ensure modal list updates
  }

  private async _handleLoadPresetRequest(e: CustomEvent<{ presetId: string }>) {
    const preset = this.presets.get(e.detail.presetId);
    if (preset && this.settingsController) {
      // Create new Maps/Arrays to avoid direct mutation issues and ensure reactivity
      this.prompts = new Map(preset.prompts.map(p => [p.promptId, {...p}]));

      // Update settings controller first
      this.settingsController.setAppConfig({ ...preset.settings });
      this.settingsController.autoDensity = preset.autoDensity;
      this.settingsController.autoBrightness = preset.autoBrightness;
      
      // Crucially, update currentConfig in PromptDJ and apply audio settings
      this.currentConfig = this.settingsController.getAppConfig();
      // Also update defaultConfigValues in case _applyAudioSettings relies on it for defaults not present in currentConfig (though less likely with full preset)
      this.defaultConfigValues = this.settingsController.getDefaultConfig();
      this._applyAudioSettings(this.currentConfig); // Apply new audio settings
      // The settings-changed event will also fire from setAppConfig, potentially calling updateSettings again.
      // Ensure this doesn't cause issues, or streamline if necessary.
      // For now, direct application after setting controller ensures audio settings match loaded preset.

      // Ensure UI updates for prompts
      this.requestUpdate('prompts');
      await this.updateComplete; // Wait for prompt controllers to re-render

      await this.setSessionPrompts(); // Update Lyria session with new prompts

      this.isPresetManagerOpen = false;
      this.toastMessage.show(`Preset '${preset.name}' loaded.`);
    } else {
      this.toastMessage.show('Error loading preset.');
    }
  }

  private _handleDeletePresetRequest(e: CustomEvent<{ presetId: string }>) {
    const presetToDelete = this.presets.get(e.detail.presetId);
    if (presetToDelete) {
      this.presetIdToDelete = presetToDelete.id;
      this.presetNameToDelete = presetToDelete.name;
      this.isConfirmDeleteModalOpen = true;
    }
  }

  private _handleExportPresetRequest(e: CustomEvent<{ presetId: string }>) {
    const preset = this.presets.get(e.detail.presetId);
    if (preset) {
        try {
            const presetJson = JSON.stringify(preset, null, 2);
            const blob = new Blob([presetJson], {type: 'application/json'});
            // Sanitize preset name for use in filename
            const filename = `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'preset'}.json`;
            downloadBlob(blob, filename);
            this.toastMessage.show(`Preset '${preset.name}' exported.`);
        } catch (error) {
            if (ENABLE_LOGGING) console.error('Error exporting preset:', error);
            this.toastMessage.show('Error exporting preset.');
        }
    } else {
        this.toastMessage.show('Could not find preset to export.');
    }
  }

  private _isValidPreset(obj: any): obj is Preset {
    return obj && typeof obj.id === 'string' &&
           typeof obj.name === 'string' &&
           Array.isArray(obj.prompts) &&
           typeof obj.settings === 'object' && obj.settings !== null &&
           typeof obj.autoDensity === 'boolean' &&
           typeof obj.autoBrightness === 'boolean' &&
           obj.prompts.every((p: any) => this._isValidPrompt(p));
  }

  private _isValidPrompt(obj: any): obj is Prompt {
    return obj && typeof obj.promptId === 'string' &&
            typeof obj.color === 'string' &&
            typeof obj.text === 'string' &&
            typeof obj.weight === 'number' &&
            (obj.locked === undefined || typeof obj.locked === 'boolean');
  }


  private _handleImportPresetsRequest(e: CustomEvent<{ presetsData: Preset | Preset[] }>) {
    const { presetsData } = e.detail;
    let importedCount = 0;
    let errorCount = 0;

    const processPreset = (presetToImport: any) => {
        if (this._isValidPreset(presetToImport)) {
            // Ensure ID is unique or handle as needed. For now, overwrite if ID exists.
            // If ID is missing (though it shouldn't be from own exports), create one.
            if (!presetToImport.id) {
                presetToImport.id = `preset-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
            }
            this.presets.set(presetToImport.id, presetToImport);
            importedCount++;
        } else {
            if (ENABLE_LOGGING) console.warn('Invalid preset object in imported file:', presetToImport);
            errorCount++;
        }
    };

    if (Array.isArray(presetsData)) {
        presetsData.forEach(processPreset);
    } else if (typeof presetsData === 'object' && presetsData !== null) {
        processPreset(presetsData);
    } else {
        this.toastMessage.show('Invalid preset file format. Expected a preset object or an array of presets.');
        return;
    }

    if (importedCount > 0) {
        this.presets = new Map(this.presets); // Trigger update
        setStoredPresets(this.presets);
        this.toastMessage.show(`${importedCount} preset(s) imported successfully.`);
        if (this.presetManagerModal) this.presetManagerModal.requestUpdate();
    }
    if (errorCount > 0) {
        this.toastMessage.show(`${errorCount} invalid preset object(s) found in the file and were skipped.`, 5000);
    }
    if (importedCount === 0 && errorCount === 0) {
        this.toastMessage.show('No valid presets found in the file.');
    }
  }
  
  private _handlePresetImportError(e: CustomEvent<{ message: string }>) {
    this.toastMessage.show(`Import Error: ${e.detail.message}`, 5000);
  }


  private _confirmDeletePreset() {
    if (this.presetIdToDelete) {
      const presetName = this.presets.get(this.presetIdToDelete)?.name || 'Unknown Preset';
      this.presets.delete(this.presetIdToDelete);
      this.presets = new Map(this.presets); // Trigger Lit update
      setStoredPresets(this.presets);
      this.toastMessage.show(`Preset '${presetName}' deleted.`);
      if (this.presetManagerModal) this.presetManagerModal.requestUpdate();
    }
    this._closeConfirmDeleteModal();
  }

  private _closeConfirmDeleteModal() {
    this.isConfirmDeleteModalOpen = false;
    this.presetIdToDelete = null;
    this.presetNameToDelete = null;
  }


  private renderInfoModalContent() {
    const supportedStyles = PROMPT_TEXT_PRESETS.join(', ');
    return html`
      <h2>Руководство по элементам управления</h2>

      <section>
        <h3>Управление подсказками (Prompts)</h3>
        <p><strong>Текстовые подсказки:</strong> Вводите музыкальные идеи, жанры, настроения или инструменты. ИИ попытается интерпретировать их для генерации музыки.</p>
        <p><em>Примеры поддерживаемых стилей: ${supportedStyles}. Вы также можете экспериментировать с другими описаниями!</em></p>
        <p><strong>Регуляторы веса:</strong> Настройте влияние каждой подсказки. Больший вес означает, что ИИ будет больше уделять внимание этой подсказке. Перетаскивайте ползунок или используйте колесо мыши. Значение от 0 (нет влияния) до 2.</p>
        <p><strong>Замок (🔒/🔓):</strong> Нажмите, чтобы заблокировать/разблокировать карточку. Заблокированные карточки нельзя удалить, и они сохранят свое состояние при следующей загрузке.</p>
        <p><strong>Удалить подсказку (×):</strong> Нажмите '×' на карточке подсказки, чтобы удалить ее (невозможно, если карточка заблокирована).</p>
      </section>

      <section>
        <h3>Основные элементы управления</h3>
        <p><strong>Кнопка Play/Pause:</strong> Запускает, приостанавливает или возобновляет генерацию музыки. Отображает индикатор загрузки при первоначальном подключении или буферизации.</p>
        <p><strong>Кнопка записи (красная):</strong> Нажмите, чтобы начать запись "сырого" аудиопотока (без клиентских эффектов). Нажмите снова, чтобы остановить и загрузить запись в формате WAV.</p>
        <p><strong>Кнопка записи FX (синяя):</strong> Нажмите, чтобы начать запись аудиопотока после применения всех клиентских эффектов (дисторшн, хорус, эквалайзер и т.д.). Нажмите снова, чтобы остановить и загрузить запись в формате WAV.</p>
        <p><strong>Кнопка сброса:</strong> Сбрасывает все настройки генерации (включая эффекты) до значений по умолчанию, очищает текущий музыкальный контекст и перезапускает генерацию. Подсказки сохраняются.</p>
        <p><strong>Кнопка пресетов (папка):</strong> Открывает менеджер пресетов, где можно сохранять текущую конфигурацию (подсказки + все настройки) под именем, загружать, удалять, экспортировать или импортировать пресеты.</p>
        <p><strong>Кнопка информации (эта кнопка):</strong> Открывает это окно с руководством.</p>
        <p><strong>Регулятор общей громкости:</strong> Управляет общей громкостью всего приложения.</p>
        <p><strong>Стабилизатор (переключатель):</strong> Включает режим плавной буферизации. Если интернет-соединение прерывается, музыка будет плавно затухать, а не обрываться резко. При восстановлении соединения громкость так же плавно вернется.</p>
        <p><strong>Непрерывное воспроизведение (переключатель):</strong> Если включено, приложение будет автоматически пытаться переподключиться и возобновить воспроизведение при потере интернет-соединения. Попытки будут происходить с увеличивающимся интервалом (1с, 2с, 3с и т.д., до максимального интервала в 30с).</p>
        <p><strong>Кнопка добавления подсказки (+):</strong> Добавляет новую пустую карточку подсказки справа.</p>
        <p><strong>Кнопка добавления случайной подсказки (+🎲):</strong> Добавляет новую карточку подсказки со случайно выбранным стилем из списка пресетов.</p>
      </section>

      <section>
        <h3>Основные настройки генерации музыки (Панель настроек)</h3>
        <p><strong>Temperature (Температура):</strong> Контролирует случайность. Более высокие значения (например, 1.1-3.0) приводят к более разнообразной и неожиданной музыке. Низкие значения (ближе к 0) делают ее более предсказуемой. По умолчанию: 1.1.</p>
        <p><strong>Guidance (Ведение):</strong> Насколько строго ИИ следует вашим подсказкам. Более высокие значения означают более точное следование. По умолчанию: 4.0.</p>
        <p><strong>Top K:</strong> Ограничивает выбор ИИ для следующего музыкального события 'K' наиболее вероятными вариантами. Меньшие значения могут сделать музыку более сфокусированной, но менее разнообразной. По умолчанию: 40.</p>
      </section>

      <section>
        <h3>Расширенные настройки (Нажмите "Show Advanced Settings")</h3>
        <p><strong>Seed (Зерно генерации):</strong> Число для инициализации генератора случайных чисел. Одинаковое зерно + одинаковые настройки = похожая музыка. Оставьте пустым для случайного значения.</p>
        <p><strong>BPM (Удары в минуту):</strong> Устанавливает темп музыки (60-180). Оставьте пустым для автоматического определения.</p>
        <p><strong>Density (Плотность) (Авто):</strong> Музыкальная насыщенность/сложность. Выше значение — больше нот/слоев. "Auto" позволяет ИИ решать. Ползунок: 0-1, По умолчанию: 0.5 (когда не авто).</p>
        <p><strong>Brightness (Яркость) (Авто):</strong> Тембральное качество, связанное с высокими частотами. "Auto" позволяет ИИ решать. Ползунок: 0-1, По умолчанию: 0.5 (когда не авто).</p>
        <p><strong>Scale (Лад/Тональность):</strong> Устанавливает музыкальный лад/тональность (например, До мажор). "Auto" позволяет ИИ выбирать.</p>
        <p><strong>Mute Bass/Drums, Only Bass & Drums:</strong> Чекбоксы для управления партиями баса и ударных.</p>

        <h4>Эффекты пост-обработки:</h4>
        <p><strong>Echo Mix (Model) (Микс эхо - Модель):</strong> Уровень эффекта эхо, встроенного в модель Lyria (0 = нет, 1 = макс). По умолчанию: 0.</p>
        <p><strong>Reverb Mix (Model) (Микс реверберации - Модель):</strong> Уровень реверберации, встроенной в модель Lyria (0 = нет, 1 = макс). По умолчанию: 0.</p>
        <p><strong>Distortion (Дисторшн):</strong> Добавляет искажения к звуку. "Amount" контролирует интенсивность.</p>
        <p><strong>Chorus (Хорус):</strong> Создает эффект "размытого" или "многоголосого" звучания. Параметры: Rate, Depth, Delay, Feedback.</p>
        <p><strong>Echo (UI) (Эхо - Интерфейс):</strong> Клиентский эффект эхо. Параметры: Delay (время задержки), Feedback (обратная связь), Mix (уровень эффекта).</p>
        <p><strong>Reverb (UI) (Реверберация - Интерфейс):</strong> Клиентский эффект реверберации (простой). Параметры: Pre-Delay (предварительная задержка), Decay (затухание), Mix (уровень эффекта).</p>
        <p><strong>Flanger (Флэнжер):</strong> Создает "закрученный", "реактивный" звук. Параметры: Rate, Depth, Delay, Feedback.</p>
        <p><strong>Filter / EQ (Фильтр / Эквалайзер):</strong> Позволяет изменять тембр звука, усиливая или ослабляя определенные частоты. "Type" - тип фильтра (low-pass, high-pass, peaking и др.), "Frequency" - частота, "Q" - добротность/ширина полосы, "Gain" - усиление/ослабление (для некоторых типов).</p>
        <p><strong>Compressor (Компрессор):</strong> Уменьшает динамический диапазон, делая громкие звуки тише, а тихие - громче. Параметры: Threshold (порог), Knee (изгиб), Ratio (соотношение), Attack (атака), Release (восстановление).</p>
        <p><strong>Phaser (Фэйзер):</strong> Создает "плывущий" эффект за счет модуляции фазы. Параметры: Rate (скорость), Depth (глубина), Feedback (обратная связь), Stages (количество каскадов), Base Frequency (базовая частота).</p>
        <p><strong>Tremolo (Тремоло):</strong> Создает эффект пульсации громкости. Параметры: Rate (скорость), Depth (глубина).</p>
        <p><strong>Stereo Phase Shift (R Ch.) (Сдвиг фазы стерео, правый канал):</strong> Позволяет плавно регулировать фазовый сдвиг правого аудиоканала от 0° до 360°. При 0° и 360° фаза соответствует оригиналу (усиление 1x), при 180° происходит полная инверсия фазы (усиление -1x). Промежуточные значения, такие как 90° или 270°, приведут к ослаблению или полному заглушению сигнала в правом канале. Этот эффект может изменить восприятие стереопанорамы или создать эффекты вычитания в зависимости от аудиоматериала.</p>
      </section>
    `;
  }


  override render() {
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });
    return html`<div id="background" style=${bg}></div>
      <div class="prompts-area">
        <div
          id="prompts-container"
          @prompt-removed=${this.handlePromptRemoved}
          @prompt-lock-toggled=${this.handlePromptLockToggled}
          @wheel=${this.handlePromptsContainerWheel}>
          ${this.renderPrompts()}
        </div>
        <div class="add-prompt-button-container">
          <add-prompt-button @click=${this.handleAddPrompt} title="Add New Prompt"></add-prompt-button>
          <add-random-prompt-button @click=${this.handleAddRandomPrompt} title="Add Random Prompt"></add-random-prompt-button>
        </div>
      </div>
      <div id="settings-container">
        <settings-controller
          .showadvanced=${this.settingsController?.showadvanced ?? false}
          @settings-changed=${this.updateSettings}></settings-controller>
      </div>
      <div class="playback-container">
        <play-pause-button
          @click=${this.handlePlayPause}
          .playbackState=${this.playbackState}
          title="Play/Pause Music"></play-pause-button>
        <record-button
            .recording=${this.isRecording}
            @click=${this.handleRecordToggle}
            title="Record Raw Audio (No FX)"></record-button>
        <record-fx-button
            .recording=${this.isRecordingFx}
            @click=${this.handleRecordFxToggle}
            title="Record Audio With FX"></record-fx-button>
        <reset-button @click=${this.handleReset} title="Reset Settings and Audio"></reset-button>
        <presets-button @click=${this._handleOpenPresetManager} title="Manage Presets"></presets-button>
        <info-button @click=${() => this.isInfoModalOpen = true} title="Show Info"></info-button>
        <div class="volume-control-container">
            ${this.renderVolumeIcon()}
            <input
                type="range"
                class="volume-slider"
                min="0"
                max="1"
                step="0.01"
                .value=${String(this.masterVolume)}
                @input=${this.handleVolumeChange}
                style="--value-percent: ${this.masterVolume * 100}%"
                aria-label="Master Volume"
                title="Master Volume"
            />
        </div>
        <div class="stabilizer-container" title="Сглаживает прерывания при нестабильной сети">
          <label for="stabilizer-toggle">Стабилизатор</label>
          <label class="switch">
            <input type="checkbox" id="stabilizer-toggle"
                .checked=${this.stabilizerEnabled}
                @change=${this.handleStabilizerToggle}>
            <span class="slider"></span>
          </label>
        </div>
        <div class="stabilizer-container" title="Автоматически переподключаться при обрыве связи">
            <label for="continuous-playback-toggle">Непрерывно</label>
            <label class="switch">
                <input type="checkbox" id="continuous-playback-toggle"
                    .checked=${this.continuousPlaybackEnabled}
                    @change=${this.handleContinuousPlaybackToggle}>
                <span class="slider"></span>
            </label>
        </div>
      </div>
      <toast-message></toast-message>
      <info-modal
        .active=${this.isInfoModalOpen}
        @closed=${() => this.isInfoModalOpen = false}>
        ${this.renderInfoModalContent()}
      </info-modal>
      <preset-manager-modal
        .active=${this.isPresetManagerOpen}
        .presets=${this.presets}
        @closed=${this._handleClosePresetManager}
        @save-preset=${this._handleSavePresetRequest}
        @load-preset=${this._handleLoadPresetRequest}
        @delete-preset=${this._handleDeletePresetRequest}
        @export-preset=${this._handleExportPresetRequest}
        @import-presets=${this._handleImportPresetsRequest}
        @import-error=${this._handlePresetImportError}
      ></preset-manager-modal>
      <confirmation-modal
        .active=${this.isConfirmDeleteModalOpen}
        .message=${`Вы уверены, что хотите удалить пресет '${this.presetNameToDelete}'?`}
        confirmText="Удалить"
        cancelText="Отмена"
        @confirmed=${this._confirmDeletePreset}
        @cancelled=${this._closeConfirmDeleteModal}
      ></confirmation-modal>
      `;
  }

  private renderPrompts() {
    return [...this.prompts.values()].map((prompt) => {
      return html`<prompt-controller
        .promptId=${prompt.promptId}
        filtered=${this.filteredPrompts.has(prompt.text)}
        .text=${prompt.text}
        .weight=${prompt.weight}
        .color=${prompt.color}
        .locked=${prompt.locked ?? false}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}

function getStoredPrompts(): Map<string, Prompt> {
  const {localStorage} = window;
  const storedPrompts = localStorage.getItem('prompts');

  if (storedPrompts) {
    try {
      const parsedPrompts = JSON.parse(storedPrompts) as Prompt[];
      if (ENABLE_LOGGING) console.log('Loading stored prompts', parsedPrompts);
      // Ensure all prompts have a 'locked' state, defaulting to false if missing
      const promptsWithLockState = parsedPrompts.map(prompt => ({
        ...prompt,
        locked: prompt.locked ?? false,
      }));
      return new Map(promptsWithLockState.map((prompt) => [prompt.promptId, prompt]));
    } catch (e) {
      if (ENABLE_LOGGING) console.error('Failed to parse stored prompts', e);
    }
  }

  if (ENABLE_LOGGING) console.log('No stored prompts, creating prompt presets');

  const numDefaultPrompts = Math.min(4, PROMPT_TEXT_PRESETS.length);
  const shuffledPresetTexts = [...PROMPT_TEXT_PRESETS].sort(
    () => Math.random() - 0.5,
  );
  const defaultPrompts: Prompt[] = [];
  const usedColors: string[] = [];
  for (let i = 0; i < numDefaultPrompts; i++) {
    const text = shuffledPresetTexts[i];
    const color = getUnusedRandomColor(usedColors);
    usedColors.push(color);
    defaultPrompts.push({
      promptId: `prompt-${i}`,
      text,
      weight: 0,
      color,
      locked: false,
    });
  }
  // Randomly select up to 2 prompts to set their weight to 1.
  const promptsToActivate = [...defaultPrompts].sort(() => Math.random() - 0.5);
  const numToActivate = Math.min(2, defaultPrompts.length);
  for (let i = 0; i < numToActivate; i++) {
    if (promptsToActivate[i]) {
      promptsToActivate[i].weight = 1;
    }
  }
  return new Map(defaultPrompts.map((p) => [p.promptId, p]));
}

function setStoredPrompts(prompts: Map<string, Prompt>) {
  const storedPrompts = JSON.stringify([...prompts.values()]);
  const {localStorage} = window;
  localStorage.setItem('prompts', storedPrompts);
}

function getStoredPresets(): Map<string, Preset> {
  const { localStorage } = window;
  const storedData = localStorage.getItem('presets');
  if (storedData) {
    try {
      const parsedPresetsArray = JSON.parse(storedData) as Preset[];
      // Ensure all presets have necessary fields, defaulting if missing
      const validatedPresets = parsedPresetsArray.map(preset => ({
        ...preset,
        prompts: preset.prompts || [],
        settings: preset.settings || {},
        autoDensity: preset.autoDensity === undefined ? true : preset.autoDensity,
        autoBrightness: preset.autoBrightness === undefined ? true : preset.autoBrightness,
        id: preset.id || `preset-${Date.now()}-${Math.random()}`, // Ensure ID exists
        name: preset.name || "Unnamed Preset"
      }));
      return new Map(validatedPresets.map(preset => [preset.id, preset]));
    } catch (e) {
      if (ENABLE_LOGGING) console.error('Failed to parse stored presets', e);
    }
  }
  return new Map();
}

function setStoredPresets(presets: Map<string, Preset>) {
  // Convert Map to Array for storing in localStorage
  const presetsArray = Array.from(presets.values());
  const { localStorage } = window;
  localStorage.setItem('presets', JSON.stringify(presetsArray));
}


function main(container: HTMLElement) {
  const initialPrompts = getStoredPrompts();
  const initialPresets = getStoredPresets(); // Load presets

  const pdj = new PromptDj(initialPrompts, initialPresets); // Pass presets to constructor
  container.appendChild(pdj); 

  // Store prompts on changes
  pdj.addEventListener('prompts-changed', (e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    setStoredPrompts(customEvent.detail);
  });
}

main(document.body);

declare global {
  interface HTMLElementTagNameMap {
    'prompt-dj': PromptDj;
    'prompt-controller': import('./components/prompt-controller').PromptController;
    'settings-controller': import('./components/settings-controller').SettingsController;
    'add-prompt-button': import('./components/add-prompt-button').AddPromptButton;
    'add-random-prompt-button': import('./components/add-random-prompt-button').AddRandomPromptButton; // New
    'play-pause-button': import('./components/play-pause-button').PlayPauseButton;
    'reset-button': import('./components/reset-button').ResetButton;
    'record-button': import('./components/record-button').RecordButton;
    'record-fx-button': import('./components/record-fx-button').RecordFxButton; // New
    'info-button': import('./components/info-button').InfoButton;
    'presets-button': import('./components/presets-button').PresetsButton; // New
    'weight-slider': import('./components/weight-slider').WeightSlider;
    'toast-message': import('./components/toast-message').ToastMessage;
    'info-modal': import('./components/info-modal').InfoModal;
    'preset-manager-modal': import('./components/preset-manager-modal').PresetManagerModal; // New
    'confirmation-modal': import('./components/confirmation-modal').ConfirmationModal; // New
  }
}