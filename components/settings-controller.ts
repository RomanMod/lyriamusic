


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';
import { AppLiveMusicGenerationConfig, Scale, BiquadFilterType } from '../core/types'; // Scale is now the enum


/** A panel for managing real-time music generation settings. */
@customElement('settings-controller')
export class SettingsController extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: 2vmin;
      background-color: #2a2a2a;
      color: #eee;
      box-sizing: border-box;
      border-radius: 5px;
      font-family: 'Google Sans', sans-serif;
      font-size: 17px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #666 #1a1a1a;
      transition: width 0.3s ease-out max-height 0.3s ease-out; /* Added max-height */
      max-height: 15vmin; /* Default max-height for compact view */
    }
    :host([showadvanced]) {
      max-height: 90vh; /* Increased max-height further */
    }
    :host::-webkit-scrollbar {
      width: 6px;
    }
    :host::-webkit-scrollbar-track {
      background: #1a1a1a;
      border-radius: 3px;
    }
    :host::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 3px;
    }
    .setting {
      margin-bottom: 0.5vmin;
      display: flex;
      flex-direction: column;
      gap: 0.5vmin;
    }
    label {
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      white-space: nowrap;
      user-select: none;
    }
    label span:last-child {
      font-weight: normal;
      color: #ccc;
      min-width: 3em; /* Ensure space for value display */
      text-align: right;
    }
    input[type='range'] {
      --track-height: 8px;
      --track-bg: #0009;
      --track-border-radius: 4px;
      --thumb-size: 16px;
      --thumb-bg: #5200ff; /* Main interactive color */
      --thumb-border-radius: 50%;
      --thumb-box-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
      --value-percent: 0%; /* Dynamic property for gradient fill */

      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: var(--track-height);
      background: transparent; /* Track background handled by ::-webkit-slider-runnable-track */
      cursor: pointer;
      margin: 0.5vmin 0;
      border: none;
      padding: 0;
      vertical-align: middle; /* Align with labels if needed */
    }

    /* Webkit/Blink specific track styling */
    input[type='range']::-webkit-slider-runnable-track {
      width: 100%;
      height: var(--track-height);
      cursor: pointer;
      border: none; /* Remove default border */
      background: linear-gradient(
        to right,
        var(--thumb-bg) var(--value-percent),
        var(--track-bg) var(--value-percent)
      );
      border-radius: var(--track-border-radius);
    }

    /* Mozilla specific track styling */
    input[type='range']::-moz-range-track {
      width: 100%;
      height: var(--track-height);
      cursor: pointer;
      background: var(--track-bg); /* Solid background, gradient fill not directly supported on track for FF like Webkit */
      border-radius: var(--track-border-radius);
      border: none;
    }
    /* Mozilla specific progress fill (lower part) - for a similar effect to webkit gradient */
    input[type='range']::-moz-range-progress {
        background-color: var(--thumb-bg);
        height: var(--track-height);
        border-radius: var(--track-border-radius);
    }


    /* Thumb styling for Webkit/Blink */
    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      height: var(--thumb-size);
      width: var(--thumb-size);
      background: var(--thumb-bg);
      border-radius: var(--thumb-border-radius);
      box-shadow: var(--thumb-box-shadow);
      cursor: pointer;
      margin-top: calc((var(--thumb-size) - var(--track-height)) / -2); /* Center thumb on track */
    }

    /* Thumb styling for Mozilla */
    input[type='range']::-moz-range-thumb {
      height: var(--thumb-size);
      width: var(--thumb-size);
      background: var(--thumb-bg);
      border-radius: var(--thumb-border-radius);
      box-shadow: var(--thumb-box-shadow);
      cursor: pointer;
      border: none; /* Remove default border */
    }

    input[type='number'],
    input[type='text'],
    select {
      background-color: #2a2a2a; /* Match host background */
      color: #eee;
      border: 1px solid #666;
      border-radius: 3px;
      padding: 0.4vmin;
      font-size: 17px;
      font-family: inherit;
      box-sizing: border-box;
    }
    input[type='number'] {
      width: 6em;
    }
    input[type='text'] { /* Seed input */
      width: 100%; /* Take full width of its setting block */
    }
    input[type='text']::placeholder {
        color: #888;
    }
    input[type='number']:focus,
    input[type='text']:focus,
    select:focus {
      outline: none;
      border-color: #5200ff; /* Highlight color */
      box-shadow: 0 0 0 2px rgba(82, 0, 255, 0.3);
    }
    select {
      width: 100%; /* Take full width */
    }
    select option {
        background-color: #2a2a2a;
        color: #eee;
    }
    .checkbox-setting {
        flex-direction: row;
        align-items: center;
        gap: 1vmin;
    }
    .checkbox-setting label { /* Label next to checkbox */
        font-weight: normal;
        cursor: pointer;
    }
    input[type='checkbox'] {
        cursor: pointer;
        accent-color: #5200ff; /* Main interactive color */
        width: 1.8vmin;
        height: 1.8vmin;
        margin-right: 0.5vmin;
    }

    /* Layout for core settings */
    .core-settings-row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap; /* Allow wrapping on smaller viewports */
        gap: 4vmin; /* Space between core settings */
        margin-bottom: 1vmin;
        justify-content: space-evenly; /* Distribute items */
    }
    .core-settings-row .setting {
        min-width: 16vmin; /* Minimum width for each core setting */
    }
    .core-settings-row label span:last-child {
        min-width: 2.5em; /* Slightly less min-width for value if needed */
    }


    /* Advanced Settings Toggle */
    .advanced-toggle {
      cursor: pointer;
      margin: 0 0 2vmin 0;
      color: #aaa;
      text-decoration: underline;
      user-select: none;
      font-size: 16px;
      width: fit-content; /* Only take space needed for text */
    }
    .advanced-toggle:hover {
        color: #eee;
    }

    /* Advanced Settings Area */
    .advanced-settings {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(22vmin, 1fr)); /* Responsive columns */
      gap: 2vmin 3vmin; /* Row and column gap */
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition:
        max-height 0.7s ease-out, /* Slower transition for more content */
        opacity 0.7s ease-out;
    }
    .advanced-settings.visible {
      max-width: 100%;
      max-height: 300vmin; /* Increased max-height further to accommodate ticks */
      opacity: 1;
    }

    hr.divider {
      display: none; /* Hidden by default, shown when advanced settings are visible */
      border: none;
      border-top: 1px solid #666; /* Subtle divider */
      margin: 2vmin 0;
      width: 100%;
    }
    :host([showadvanced]) hr.divider {
        display: block;
    }

    .auto-row {
      display: flex;
      align-items: center;
      gap: 0.5vmin; /* Space between checkbox and "Auto" label */
    }
    .setting[auto='true'] input[type='range'] {
      pointer-events: none; /* Disable slider when auto is checked */
      filter: grayscale(100%); /* Visually indicate disabled state */
    }
    .auto-row span { /* Value display for auto sliders */
      margin-left: auto; /* Push value to the right */
    }
    .auto-row label { /* "Auto" label */
      cursor: pointer; /* Indicate clickable */
    }
    .auto-row input[type='checkbox'] {
      cursor: pointer;
      margin: 0; /* Remove default margin */
    }

    .effect-group {
        border: 1px solid #444;
        border-radius: 4px;
        padding: 1.5vmin;
        margin-top: 1vmin; /* Add some space above each group */
        display: flex;
        flex-direction: column;
        gap: 1vmin; /* Space between settings within a group */
    }
    .effect-group h4 {
        margin: 0 0 0.5vmin 0;
        font-size: 18px;
        color: #ccc;
        font-weight: bold;
        display: flex; /* For aligning checkbox with title */
        align-items: center;
    }
    .effect-group h4 input[type="checkbox"] {
        margin-right: 1vmin; /* Space between checkbox and title text */
    }
    .effect-group .setting {
      margin-bottom: 0.5vmin; /* Space between settings within an effect group */
    }
    .effect-group .setting:last-child {
      margin-bottom: 0;
    }
    /* Disable sliders if effect is disabled */
    .effect-group[disabled] input[type='range'],
    .effect-group[disabled] select {
        pointer-events: none;
        filter: grayscale(80%) opacity(0.6);
    }
    .effect-group[disabled] label {
        color: #777;
    }
    .effect-group[disabled] label span:last-child {
        color: #777;
    }

    .general-effects-section {
        grid-column: 1 / -1;
        margin-top: 1vmin;
        padding-top: 1vmin;
    }
    .general-effects-section .setting {
      margin-bottom: 2vmin; /* Add more margin below slider to make space for ticks */
    }
    .slider-ticks {
      position: relative;
      height: 1.5vmin;
      margin-top: 0.2vmin; /* Position ticks closer to the slider */
      margin-left: calc(var(--thumb-size) / 2); /* Align ticks with slider track start */
      margin-right: calc(var(--thumb-size) / 2); /* Align ticks with slider track end */
      box-sizing: border-box;
    }
    .slider-ticks span {
      position: absolute;
      bottom: 0;
      transform: translateX(-50%);
      font-size: 16px; /* Increased font size */
      font-weight: bold; /* Added bold font weight */
      color: #bbb; /* Slightly brighter color for ticks */
      white-space: nowrap;
    }
    .slider-ticks span::before {
      content: '';
      position: absolute;
      bottom: calc(100% + 0.2vmin); /* Position tick line above the text */
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: 0.8vmin; /* Increased tick height */
      background-color: #999; /* Brighter tick line */
    }
  `;

  private readonly defaultConfig: AppLiveMusicGenerationConfig = {
    temperature: 1.1,
    topK: 40,
    guidance: 4.0,
    echoMix: 0, // Model-level echo
    reverbMix: 0, // Model-level reverb

    distortionEnabled: false,
    distortionAmount: 0.0,

    chorusEnabled: false,
    chorusRate: 1.5,
    chorusDepth: 0.3,
    chorusDelay: 0.025,
    chorusFeedback: 0.0,

    echoUiEnabled: false,
    echoUiDelayTime: 0.25,
    echoUiFeedback: 0.3,
    echoUiMix: 0.0,

    reverbUiEnabled: false,
    reverbUiDelayTime: 0.05,
    reverbUiDecay: 0.2,
    reverbUiMix: 0.0,

    flangerEnabled: false,
    flangerRate: 0.2,
    flangerDepth: 0.002,
    flangerDelay: 0.005,
    flangerFeedback: 0.5,

    eqEnabled: false,
    eqType: 'peaking',
    eqFrequency: 800,
    eqQ: 1,
    eqGain: 0,

    compressorEnabled: false,
    compressorThreshold: -24,
    compressorKnee: 30,
    compressorRatio: 12,
    compressorAttack: 0.003,
    compressorRelease: 0.25,

    phaserEnabled: false,
    phaserRate: 0.5,
    phaserDepth: 0.5,
    phaserFeedback: 0.3,
    phaserStages: 4,
    phaserBaseFrequency: 700,

    tremoloEnabled: false,
    tremoloRate: 5,
    tremoloDepth: 0.5,

    stereoPhaseShiftAmount: 0, // Default to 0 (0 degrees)
  };

  @property({type: Boolean, reflect: true}) showadvanced = false;
  @state() private _config: AppLiveMusicGenerationConfig = {...this.defaultConfig};

  @state() autoDensity = true;
  @state() lastDefinedDensity: number | undefined = 0.5;
  @state() autoBrightness = true;
  @state() lastDefinedBrightness: number | undefined = 0.5;

  public getAppConfig(): AppLiveMusicGenerationConfig {
    const currentFullConfig = {...this._config};
    if (this.autoDensity) currentFullConfig.density = undefined;
    if (this.autoBrightness) currentFullConfig.brightness = undefined;
    return currentFullConfig;
  }

  public getDefaultConfig(): AppLiveMusicGenerationConfig {
    return { ...this.defaultConfig }; // Return a copy
  }

  public setAppConfig(newConfig: AppLiveMusicGenerationConfig) {
    this._config = {...newConfig};
    // If density/brightness are undefined in newConfig, it implies auto is on.
    // If they have values, auto should be off for them.
    if (newConfig.density === undefined) {
        this.autoDensity = true;
    } else {
        this.autoDensity = false;
        this.lastDefinedDensity = newConfig.density;
    }
    if (newConfig.brightness === undefined) {
        this.autoBrightness = true;
    } else {
        this.autoBrightness = false;
        this.lastDefinedBrightness = newConfig.brightness;
    }
    this.requestUpdate('_config'); // Ensure Lit re-renders based on _config change
  }


  public resetToDefaults() {
    this._config = {...this.defaultConfig};
    this.autoDensity = true;
    this.autoBrightness = true;
    this._config.density = undefined;
    this._config.brightness = undefined;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private updateSliderBackground(inputEl: HTMLInputElement) {
    if (inputEl.type !== 'range') return;
    const min = Number(inputEl.min) || 0;
    const max = Number(inputEl.max) || 1;
    const value = Number(inputEl.value);
    const percentage = ((value - min) / (max - min)) * 100;
    inputEl.style.setProperty('--value-percent', `${percentage}%`);
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    let key = target.id as keyof AppLiveMusicGenerationConfig | 'auto-density' | 'auto-brightness';

    let processedValue: string | number | boolean | undefined | Scale | BiquadFilterType;

    if (target instanceof HTMLInputElement) {
        if (target.type === 'number') {
            if (target.value === '') { // Explicitly handle empty string for number inputs
                processedValue = undefined;
            } else {
                processedValue = target.valueAsNumber; // number | NaN
                if (isNaN(processedValue as number)) { // If not a valid number string (e.g., "abc")
                    processedValue = undefined;
                }
            }
        } else if (target.type === 'range') {
            processedValue = target.valueAsNumber; // Should be a number
            this.updateSliderBackground(target);
        } else if (target.type === 'checkbox') {
            processedValue = target.checked;
        } else { // text input (seed)
            processedValue = target.value === '' ? undefined : target.value;
        }
    } else if (target instanceof HTMLSelectElement) { // Scale or EQ Type dropdown
        if (target.id === 'scale') {
             processedValue = target.value === "" ? undefined : target.value as Scale;
        } else if (target.id === 'eqType') {
            processedValue = target.value as BiquadFilterType;
        } else {
            processedValue = target.value;
        }
    } else {
      return; // Should not happen with current HTML structure
    }

    const newConfig: AppLiveMusicGenerationConfig = { ...this._config };

    if (key === 'auto-density') {
      this.autoDensity = Boolean(processedValue);
      newConfig.density = this.autoDensity ? undefined : (this.lastDefinedDensity ?? 0.5);
    } else if (key === 'auto-brightness') {
      this.autoBrightness = Boolean(processedValue);
      newConfig.brightness = this.autoBrightness ? undefined : (this.lastDefinedBrightness ?? 0.5);
    } else if (key === 'density' && (typeof processedValue === 'number' || typeof processedValue === 'undefined')) {
        newConfig.density = processedValue;
        if (typeof processedValue === 'number') this.lastDefinedDensity = processedValue;
    } else if (key === 'brightness' && (typeof processedValue === 'number' || typeof processedValue === 'undefined')) {
        newConfig.brightness = processedValue;
        if (typeof processedValue === 'number') this.lastDefinedBrightness = processedValue;
    } else if (key === 'seed') {
        if (processedValue === undefined || String(processedValue).trim() === '') {
            newConfig.seed = undefined;
        } else {
            const numSeed = parseInt(String(processedValue), 10);
            newConfig.seed = isNaN(numSeed) ? undefined : numSeed;
        }
    } else if (key === 'scale') {
        newConfig.scale = processedValue as Scale | undefined;
    } else if (key === 'eqType') {
        newConfig.eqType = processedValue as BiquadFilterType;
    } else if (key in newConfig) {
      const defaultValueForKey = (this.defaultConfig as any)[key];
      if (typeof defaultValueForKey === 'boolean' || key.endsWith('Enabled') || key.endsWith('UiEnabled')) {
        (newConfig as any)[key] = Boolean(processedValue);
      } else if (
        typeof defaultValueForKey === 'number' ||
        key === 'bpm' || key.endsWith('Amount') || key.endsWith('Rate') ||
        key.endsWith('Depth') || key.endsWith('Delay') || key.endsWith('Feedback') ||
        key === 'eqFrequency' || key === 'eqQ' || key === 'eqGain' ||
        key === 'compressorThreshold' || key === 'compressorKnee' || key === 'compressorRatio' ||
        key === 'compressorAttack' || key === 'compressorRelease' ||
        key === 'phaserStages' || key === 'phaserBaseFrequency' ||
        key.startsWith('echoUi') || key.startsWith('reverbUi') ||
        key === 'stereoPhaseShiftAmount' // Added new key
      ) {
        let numericVal: number | undefined;
        if (typeof processedValue === 'number') {
            numericVal = processedValue;
        } else if (typeof processedValue === 'string') {
            if (processedValue.trim() === "") {
                numericVal = undefined;
            } else {
                const parsedNum = parseFloat(processedValue);
                numericVal = isNaN(parsedNum) ? undefined : parsedNum;
            }
        } else if (typeof processedValue === 'undefined') {
            numericVal = undefined;
        } else {
            numericVal = undefined;
        }
        (newConfig as any)[key] = numericVal;

        if (isNaN((newConfig as any)[key] as number)) {
             (newConfig as any)[key] = undefined;
        }

      } else {
        (newConfig as any)[key] = processedValue;
      }
    }

    this._config = newConfig;
    this.dispatchSettingsChange();
  }

  protected override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('_config') || changedProperties.has('autoDensity') || changedProperties.has('autoBrightness') || changedProperties.has('showadvanced')) {
      this.shadowRoot
        ?.querySelectorAll<HTMLInputElement>('input[type="range"]')
        .forEach((slider: HTMLInputElement) => {
          this.updateSliderBackground(slider);
        });
    }
  }

  private dispatchSettingsChange() {
    this.dispatchEvent(
      new CustomEvent<AppLiveMusicGenerationConfig>('settings-changed', {
        detail: this.getAppConfig(), // Dispatch the publicly accessible version of config
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleAdvancedSettings() {
    this.showadvanced = !this.showadvanced;
  }

  override render() {
    const cfg = this._config; // Use internal _config for rendering UI elements directly
    const advancedClasses = classMap({
      'advanced-settings': true,
      'visible': this.showadvanced,
    });

    const scaleMap = new Map<string, Scale | ''>([
      ['Auto', ''],
      ['C Major / A Minor', Scale.C_MAJOR_A_MINOR],
      ['C# Major / A# Minor', Scale.D_FLAT_MAJOR_B_FLAT_MINOR],
      ['D Major / B Minor', Scale.D_MAJOR_B_MINOR],
      ['D# Major / C Minor', Scale.E_FLAT_MAJOR_C_MINOR],
      ['E Major / C# Minor', Scale.E_MAJOR_D_FLAT_MINOR],
      ['F Major / D Minor', Scale.F_MAJOR_D_MINOR],
      ['F# Major / D# Minor', Scale.G_FLAT_MAJOR_E_FLAT_MINOR],
      ['G Major / E Minor', Scale.G_MAJOR_E_MINOR],
      ['G# Major / F Minor', Scale.A_FLAT_MAJOR_F_MINOR],
      ['A Major / F# Minor', Scale.A_MAJOR_G_FLAT_MINOR],
      ['A# Major / G Minor', Scale.B_FLAT_MAJOR_G_MINOR],
      ['B Major / G# Minor', Scale.B_MAJOR_A_FLAT_MINOR],
    ]);

    const eqFilterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch'];
    const eqFilterTypeLabels: Record<BiquadFilterType, string> = {
        lowpass: 'Low-pass', highpass: 'High-pass', bandpass: 'Band-pass',
        lowshelf: 'Low-shelf', highshelf: 'High-shelf', peaking: 'Peaking',
        notch: 'Notch', allpass: 'All-pass (Phaser)'
    };


    const renderSlider = (
        id: keyof AppLiveMusicGenerationConfig,
        labelText: string,
        min: number,
        max: number,
        step: number,
        value: number | undefined,
        defaultValue: number,
        disabled = false,
        toFixed = 2,
        displayTransform?: (val: number) => string,
        showTicks = false,
        customTickMarks?: Array<{label: string; percent: number}>
    ) => {
      const val = value ?? defaultValue;
      const displayValue = displayTransform ? displayTransform(val) : val.toFixed(toFixed);
      const ticksToRender = customTickMarks;

      return html`
        <div class="setting">
          <label for=${id}>${labelText}<span>${displayValue}</span></label>
          <input
            type="range"
            id=${id}
            min=${min}
            max=${max}
            step=${step}
            .value=${String(val)}
            ?disabled=${disabled}
            @input=${this.handleInputChange} />
          ${showTicks && ticksToRender ? html`
            <div class="slider-ticks">
              ${ticksToRender.map(tick => html`<span style="left: ${tick.percent}%">${tick.label}</span>`)}
            </div>
          ` : ''}
        </div>`;
    };

    const phaseSliderTickMarks = [
        {label: '0°', percent: 0},
        {label: '90°', percent: 25},
        {label: '180°', percent: 50},
        {label: '270°', percent: 75},
        {label: '360°', percent: 100}
    ];

    const currentEqType = cfg.eqType ?? this.defaultConfig.eqType!;
    const showEqQ = ['lowpass', 'highpass', 'bandpass', 'peaking', 'notch'].includes(currentEqType);
    const showEqGain = ['lowshelf', 'highshelf', 'peaking'].includes(currentEqType);

    return html`
      <div class="advanced-toggle" @click=${this.toggleAdvancedSettings} role="button" tabindex="0"
           @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') ? this.toggleAdvancedSettings() : null}
           aria-expanded=${this.showadvanced.toString()}>
        ${this.showadvanced ? 'Hide' : 'Show'} Advanced Settings
      </div>
      <div class="core-settings-row">
        ${renderSlider('temperature', 'Temperature', 0, 3, 0.1, cfg.temperature, this.defaultConfig.temperature!, false, 1)}
        ${renderSlider('guidance', 'Guidance', 0, 6, 0.1, cfg.guidance, this.defaultConfig.guidance!, false, 1)}
        ${renderSlider('topK', 'Top K', 1, 100, 1, cfg.topK, this.defaultConfig.topK!, false, 0)}
      </div>
      <hr class="divider" />
      <div class=${advancedClasses}>
        <div class="setting">
          <label for="seed">Seed</label>
          <input
            type="text"
            id="seed"
            .value=${cfg.seed === undefined ? '' : String(cfg.seed)}
            @input=${this.handleInputChange}
            placeholder="Auto" />
        </div>
        <div class="setting">
          <label for="bpm">BPM</label>
          <input
            type="number"
            id="bpm"
            min="60"
            max="180"
            .value=${cfg.bpm === undefined ? '' : String(cfg.bpm)}
            @input=${this.handleInputChange}
            placeholder="Auto (60-180)" />
        </div>
        <div class="setting" auto=${this.autoDensity.toString()}>
          <label for="density">Density</label>
          <input
            type="range"
            id="density"
            min="0"
            max="1"
            step="0.05"
            .value=${String(this.autoDensity ? (this.lastDefinedDensity ?? 0.5) : (cfg.density ?? this.lastDefinedDensity ?? 0.5))}
            ?disabled=${this.autoDensity}
            @input=${this.handleInputChange} />
          <div class="auto-row">
            <input
              type="checkbox"
              id="auto-density"
              aria-labelledby="label-auto-density"
              .checked=${this.autoDensity}
              @input=${this.handleInputChange} />
            <label id="label-auto-density" for="auto-density">Auto</label>
            <span>${(this.autoDensity ? (this.lastDefinedDensity ?? 0.5) : (cfg.density ?? this.lastDefinedDensity ?? 0.5)).toFixed(2)}</span>
          </div>
        </div>
        <div class="setting" auto=${this.autoBrightness.toString()}>
          <label for="brightness">Brightness</label>
          <input
            type="range"
            id="brightness"
            min="0"
            max="1"
            step="0.05"
            .value=${String(this.autoBrightness ? (this.lastDefinedBrightness ?? 0.5) : (cfg.brightness ?? this.lastDefinedBrightness ?? 0.5))}
            ?disabled=${this.autoBrightness}
            @input=${this.handleInputChange} />
          <div class="auto-row">
            <input
              type="checkbox"
              id="auto-brightness"
              aria-labelledby="label-auto-brightness"
              .checked=${this.autoBrightness}
              @input=${this.handleInputChange} />
            <label id="label-auto-brightness" for="auto-brightness">Auto</label>
            <span>${(this.autoBrightness ? (this.lastDefinedBrightness ?? 0.5) : (cfg.brightness ?? this.lastDefinedBrightness ?? 0.5)).toFixed(2)}</span>
          </div>
        </div>
         ${renderSlider('echoMix', 'Echo Mix (Model)', 0, 1, 0.05, cfg.echoMix, this.defaultConfig.echoMix!)}
         ${renderSlider('reverbMix', 'Reverb Mix (Model)', 0, 1, 0.05, cfg.reverbMix, this.defaultConfig.reverbMix!)}
        <div class="setting">
          <label for="scale">Scale</label>
          <select
            id="scale"
            .value=${cfg.scale || ""}
            @change=${this.handleInputChange}>
            ${[...scaleMap.entries()].map(
              ([displayName, scaleValue]) =>
                html`<option .value=${scaleValue} ?selected=${cfg.scale === scaleValue || (scaleValue === "" && !cfg.scale)}>${displayName}</option>`,
            )}
          </select>
        </div>
        <div class="setting">
          <div class="checkbox-setting">
            <input type="checkbox" id="muteBass" .checked=${!!cfg.muteBass} @change=${this.handleInputChange} />
            <label for="muteBass">Mute Bass</label>
          </div>
          <div class="checkbox-setting">
            <input type="checkbox" id="muteDrums" .checked=${!!cfg.muteDrums} @change=${this.handleInputChange} />
            <label for="muteDrums">Mute Drums</label>
          </div>
          <div class="checkbox-setting">
            <input type="checkbox" id="onlyBassAndDrums" .checked=${!!cfg.onlyBassAndDrums} @change=${this.handleInputChange} />
            <label for="onlyBassAndDrums">Only Bass & Drums</label>
          </div>
        </div>

        <!-- Distortion Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.distortionEnabled ?? this.defaultConfig.distortionEnabled)}>
            <h4>
                <input type="checkbox" id="distortionEnabled" .checked=${!!(cfg.distortionEnabled ?? this.defaultConfig.distortionEnabled)} @input=${this.handleInputChange}>
                Distortion
            </h4>
            ${renderSlider('distortionAmount', 'Amount', 0, 1, 0.01, cfg.distortionAmount, this.defaultConfig.distortionAmount!, !(cfg.distortionEnabled ?? this.defaultConfig.distortionEnabled))}
        </div>

        <!-- Chorus Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled)}>
            <h4>
                <input type="checkbox" id="chorusEnabled" .checked=${!!(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled)} @input=${this.handleInputChange}>
                Chorus
            </h4>
            ${renderSlider('chorusRate', 'Rate (Hz)', 0.1, 10, 0.1, cfg.chorusRate, this.defaultConfig.chorusRate!, !(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled), 1)}
            ${renderSlider('chorusDepth', 'Depth', 0, 1, 0.01, cfg.chorusDepth, this.defaultConfig.chorusDepth!, !(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled))}
            ${renderSlider('chorusDelay', 'Delay (s)', 0.001, 0.05, 0.001, cfg.chorusDelay, this.defaultConfig.chorusDelay!, !(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled), 3)}
            ${renderSlider('chorusFeedback', 'Feedback', 0, 0.95, 0.01, cfg.chorusFeedback, this.defaultConfig.chorusFeedback!, !(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled))}
        </div>

        <!-- UI Echo Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.echoUiEnabled ?? this.defaultConfig.echoUiEnabled)}>
            <h4>
                <input type="checkbox" id="echoUiEnabled" .checked=${!!(cfg.echoUiEnabled ?? this.defaultConfig.echoUiEnabled)} @input=${this.handleInputChange}>
                Echo (UI)
            </h4>
            ${renderSlider('echoUiDelayTime', 'Delay (s)', 0.01, 1, 0.01, cfg.echoUiDelayTime, this.defaultConfig.echoUiDelayTime!, !(cfg.echoUiEnabled ?? this.defaultConfig.echoUiEnabled), 2)}
            ${renderSlider('echoUiFeedback', 'Feedback', 0, 0.95, 0.01, cfg.echoUiFeedback, this.defaultConfig.echoUiFeedback!, !(cfg.echoUiEnabled ?? this.defaultConfig.echoUiEnabled), 2)}
            ${renderSlider('echoUiMix', 'Mix', 0, 1, 0.01, cfg.echoUiMix, this.defaultConfig.echoUiMix!, !(cfg.echoUiEnabled ?? this.defaultConfig.echoUiEnabled), 2)}
        </div>

        <!-- UI Reverb Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.reverbUiEnabled ?? this.defaultConfig.reverbUiEnabled)}>
            <h4>
                <input type="checkbox" id="reverbUiEnabled" .checked=${!!(cfg.reverbUiEnabled ?? this.defaultConfig.reverbUiEnabled)} @input=${this.handleInputChange}>
                Reverb (UI)
            </h4>
            ${renderSlider('reverbUiDelayTime', 'Pre-Delay (s)', 0.001, 0.2, 0.001, cfg.reverbUiDelayTime, this.defaultConfig.reverbUiDelayTime!, !(cfg.reverbUiEnabled ?? this.defaultConfig.reverbUiEnabled), 3)}
            ${renderSlider('reverbUiDecay', 'Decay', 0, 0.95, 0.01, cfg.reverbUiDecay, this.defaultConfig.reverbUiDecay!, !(cfg.reverbUiEnabled ?? this.defaultConfig.reverbUiEnabled), 2)}
            ${renderSlider('reverbUiMix', 'Mix', 0, 1, 0.01, cfg.reverbUiMix, this.defaultConfig.reverbUiMix!, !(cfg.reverbUiEnabled ?? this.defaultConfig.reverbUiEnabled), 2)}
        </div>

        <!-- Flanger Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled)}>
            <h4>
                <input type="checkbox" id="flangerEnabled" .checked=${!!(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled)} @input=${this.handleInputChange}>
                Flanger
            </h4>
            ${renderSlider('flangerRate', 'Rate (Hz)', 0.05, 5, 0.05, cfg.flangerRate, this.defaultConfig.flangerRate!, !(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled), 2)}
            ${renderSlider('flangerDepth', 'Depth (mod s)', 0.0005, 0.005, 0.0001, cfg.flangerDepth, this.defaultConfig.flangerDepth!, !(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled), 4)}
            ${renderSlider('flangerDelay', 'Delay (s)', 0.001, 0.01, 0.0005, cfg.flangerDelay, this.defaultConfig.flangerDelay!, !(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled), 4)}
            ${renderSlider('flangerFeedback', 'Feedback', 0, 0.95, 0.01, cfg.flangerFeedback, this.defaultConfig.flangerFeedback!, !(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled))}
        </div>

        <!-- EQ Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.eqEnabled ?? this.defaultConfig.eqEnabled)}>
            <h4>
                <input type="checkbox" id="eqEnabled" .checked=${!!(cfg.eqEnabled ?? this.defaultConfig.eqEnabled)} @input=${this.handleInputChange}>
                Filter / EQ
            </h4>
            <div class="setting">
                <label for="eqType">Type</label>
                <select id="eqType" .value=${currentEqType} @change=${this.handleInputChange} ?disabled=${!(cfg.eqEnabled ?? this.defaultConfig.eqEnabled)}>
                    ${eqFilterTypes.map(type => html`<option value=${type} ?selected=${type === currentEqType}>${eqFilterTypeLabels[type]}</option>`)}
                </select>
            </div>
            ${renderSlider('eqFrequency', 'Frequency (Hz)', 20, 20000, 1, cfg.eqFrequency, this.defaultConfig.eqFrequency!, !(cfg.eqEnabled ?? this.defaultConfig.eqEnabled), 0)}
            ${showEqQ ? renderSlider('eqQ', 'Q Factor', 0.0001, 100, 0.0001, cfg.eqQ, this.defaultConfig.eqQ!, !(cfg.eqEnabled ?? this.defaultConfig.eqEnabled), 4) : ''}
            ${showEqGain ? renderSlider('eqGain', 'Gain (dB)', -40, 40, 0.1, cfg.eqGain, this.defaultConfig.eqGain!, !(cfg.eqEnabled ?? this.defaultConfig.eqEnabled), 1) : ''}
        </div>

        <!-- Compressor Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled)}>
            <h4>
                <input type="checkbox" id="compressorEnabled" .checked=${!!(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled)} @input=${this.handleInputChange}>
                Compressor
            </h4>
            ${renderSlider('compressorThreshold', 'Threshold (dB)', -100, 0, 1, cfg.compressorThreshold, this.defaultConfig.compressorThreshold!, !(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled), 0)}
            ${renderSlider('compressorKnee', 'Knee (dB)', 0, 40, 1, cfg.compressorKnee, this.defaultConfig.compressorKnee!, !(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled), 0)}
            ${renderSlider('compressorRatio', 'Ratio', 1, 20, 1, cfg.compressorRatio, this.defaultConfig.compressorRatio!, !(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled), 0)}
            ${renderSlider('compressorAttack', 'Attack (s)', 0, 1, 0.001, cfg.compressorAttack, this.defaultConfig.compressorAttack!, !(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled), 3)}
            ${renderSlider('compressorRelease', 'Release (s)', 0, 1, 0.001, cfg.compressorRelease, this.defaultConfig.compressorRelease!, !(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled), 3)}
        </div>

        <!-- Phaser Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled)}>
            <h4>
                <input type="checkbox" id="phaserEnabled" .checked=${!!(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled)} @input=${this.handleInputChange}>
                Phaser
            </h4>
            ${renderSlider('phaserRate', 'Rate (Hz)', 0.05, 10, 0.05, cfg.phaserRate, this.defaultConfig.phaserRate!, !(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled), 2)}
            ${renderSlider('phaserDepth', 'Depth', 0, 1, 0.01, cfg.phaserDepth, this.defaultConfig.phaserDepth!, !(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled))}
            ${renderSlider('phaserFeedback', 'Feedback', 0, 0.95, 0.01, cfg.phaserFeedback, this.defaultConfig.phaserFeedback!, !(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled))}
            ${renderSlider('phaserStages', 'Stages', 2, 12, 1, cfg.phaserStages, this.defaultConfig.phaserStages!, !(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled), 0)}
            ${renderSlider('phaserBaseFrequency', 'Base Freq (Hz)', 300, 3000, 50, cfg.phaserBaseFrequency, this.defaultConfig.phaserBaseFrequency!, !(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled), 0)}
        </div>

        <!-- Tremolo Effect Group -->
        <div class="effect-group" ?disabled=${!(cfg.tremoloEnabled ?? this.defaultConfig.tremoloEnabled)}>
            <h4>
                <input type="checkbox" id="tremoloEnabled" .checked=${!!(cfg.tremoloEnabled ?? this.defaultConfig.tremoloEnabled)} @input=${this.handleInputChange}>
                Tremolo
            </h4>
            ${renderSlider('tremoloRate', 'Rate (Hz)', 0.1, 20, 0.1, cfg.tremoloRate, this.defaultConfig.tremoloRate!, !(cfg.tremoloEnabled ?? this.defaultConfig.tremoloEnabled), 1)}
            ${renderSlider('tremoloDepth', 'Depth', 0, 1, 0.01, cfg.tremoloDepth, this.defaultConfig.tremoloDepth!, !(cfg.tremoloEnabled ?? this.defaultConfig.tremoloEnabled))}
        </div>

        <!-- General/Utility Effects Section -->
        <div class="general-effects-section">
            ${renderSlider(
                'stereoPhaseShiftAmount',
                'Phase Shift (R Ch.)',
                0, 1, 0.01,
                cfg.stereoPhaseShiftAmount,
                this.defaultConfig.stereoPhaseShiftAmount!,
                false,
                2,
                (val) => `${(val * 360).toFixed(0)}°`,
                true, // showTicks = true for this slider
                phaseSliderTickMarks // Pass custom ticks for phase slider
            )}
        </div>

      </div>
    `;
  }
}