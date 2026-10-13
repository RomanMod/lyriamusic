/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';
import {svg} from 'lit-html';
import {
  AppLiveMusicGenerationConfig,
  Scale,
  BiquadFilterType,
  EQ_BAND_FREQUENCIES,
  formatEqFreqLabel,
  getEqFreqCategory,
  EqCategory,
} from '../core/types';


/** A panel for managing real-time music generation settings. */
@customElement('settings-controller')
export class SettingsController extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      color: #eee;
      font-family: 'Google Sans', sans-serif;
      font-size: 17px;
    }
    
    /* Page Layout */
    .page-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden; /* Prevent this container from scrolling */
    }
    .page-header {
      display: flex;
      align-items: center;
      padding-bottom: 1.5vmin;
      border-bottom: 1px solid #444;
      margin-bottom: 2vmin;
      flex-shrink: 0;
    }
    .page-header h3 {
      margin: 0;
      font-size: 22px;
      flex-grow: 1;
      text-align: center;
    }
    .back-button {
      background: none;
      border: 1px solid #666;
      color: #ccc;
      border-radius: 5px;
      padding: 0.8vmin 1.2vmin;
      cursor: pointer;
      font-size: 17px;
      transition: background-color 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .back-button:hover {
      background-color: #555;
      color: white;
    }
    .page-content, .main-view-content {
      flex-grow: 1;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      touch-action: pan-y;
      scrollbar-width: thin;
      scrollbar-color: #666 #1a1a1a;
      padding: 0 1vmin; /* Add some padding for content */
    }
     .page-content::-webkit-scrollbar, .main-view-content::-webkit-scrollbar {
      width: 6px;
    }
    .page-content::-webkit-scrollbar-track, .main-view-content::-webkit-scrollbar-track {
      background: #1a1a1a;
      border-radius: 3px;
    }
    .page-content::-webkit-scrollbar-thumb, .main-view-content::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 3px;
    }


    /* Main View Specifics */
    .main-view-header {
      flex-shrink: 0;
    }
    .core-settings-row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 2vmin 4vmin;
        margin-bottom: 2vmin;
        justify-content: space-evenly;
    }
    .core-settings-row .setting {
        min-width: 16vmin;
        margin-bottom: 0;
    }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(20vmin, 1fr));
      gap: 1.5vmin;
    }
    .grid-header {
      grid-column: 1 / -1; /* Span full width of the grid */
      font-size: 18px;
      font-weight: bold;
      color: #ccc;
      margin: 2vmin 0 0.5vmin 0;
      padding-bottom: 0.8vmin;
      border-bottom: 1px solid #555;
      text-align: left;
    }
    .grid-header:first-of-type {
      margin-top: 0;
    }
    .grid-button {
      background-color: #383838;
      border: 1px solid #555;
      color: #ddd;
      border-radius: 5px;
      padding: 1.5vmin;
      font-size: 17px;
      text-align: center;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
      word-break: break-word;
    }
    .grid-button:hover {
      background-color: #4a4a4a;
      border-color: #777;
    }
    .grid-button.active-effect {
      border: 2px solid var(--thumb-bg, #5200ff);
      box-shadow: 0 0 8px -2px rgba(82, 0, 255, 0.8);
      padding: calc(1.5vmin - 1px); /* Adjust padding to keep size consistent */
    }

    /* Shared Control Styles */
    .setting {
      margin-bottom: 1.5vmin;
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
      min-width: 3em;
      text-align: right;
    }
    input[type='range'] {
      --track-height: 8px;
      --track-bg: #0009;
      --track-border-radius: 4px;
      --thumb-size: 16px;
      --thumb-bg: #5200ff;
      --thumb-border-radius: 50%;
      --thumb-box-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
      --value-percent: 0%;

      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: var(--track-height);
      background: transparent;
      cursor: pointer;
      margin: 0.5vmin 0;
      border: none;
      padding: 0;
    }
    input[type='range']::-webkit-slider-runnable-track {
      background: linear-gradient(to right, var(--thumb-bg) var(--value-percent), var(--track-bg) var(--value-percent));
      border-radius: var(--track-border-radius);
    }
    input[type='range']::-moz-range-track {
      background: var(--track-bg);
      border-radius: var(--track-border-radius);
    }
    input[type='range']::-moz-range-progress {
      background-color: var(--thumb-bg);
      height: var(--track-height);
      border-radius: var(--track-border-radius);
    }
    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      height: var(--thumb-size);
      width: var(--thumb-size);
      background: var(--thumb-bg);
      border-radius: var(--thumb-border-radius);
      box-shadow: var(--thumb-box-shadow);
      cursor: pointer;
      margin-top: calc((var(--thumb-size) - var(--track-height)) / -2);
    }
    input[type='range']::-moz-range-thumb {
      height: var(--thumb-size);
      width: var(--thumb-size);
      background: var(--thumb-bg);
      border-radius: var(--thumb-border-radius);
      box-shadow: var(--thumb-box-shadow);
      cursor: pointer;
      border: none;
    }

    input[type='number'], input[type='text'], select {
      background-color: #2a2a2a;
      color: #eee;
      border: 1px solid #666;
      border-radius: 3px;
      padding: 0.4vmin;
      font-size: 17px;
      font-family: inherit;
      box-sizing: border-box;
      width: 100%;
    }
    input[type='number']:focus, input[type='text']:focus, select:focus {
      outline: none;
      border-color: #5200ff;
      box-shadow: 0 0 0 2px rgba(82, 0, 255, 0.3);
    }
    input[type='text']::placeholder { color: #888; }
    select option { background-color: #2a2a2a; color: #eee; }

    .checkbox-setting {
        flex-direction: row;
        align-items: center;
        gap: 1vmin;
    }
    .checkbox-setting label { font-weight: normal; cursor: pointer; }
    input[type='checkbox'] {
        cursor: pointer;
        accent-color: #5200ff;
        width: 1.8vmin;
        height: 1.8vmin;
        margin-right: 0.5vmin;
    }

    .auto-row {
      display: flex;
      align-items: center;
      gap: 0.5vmin;
    }
    .setting[auto='true'] input[type='range'] {
      pointer-events: none;
      filter: grayscale(100%);
    }
    .auto-row span { margin-left: auto; }
    .auto-row label { cursor: pointer; }
    .auto-row input[type='checkbox'] { cursor: pointer; margin: 0; }

    .effect-group {
        border: 1px solid #444;
        border-radius: 4px;
        padding: 1.5vmin;
        margin-top: 1vmin;
        display: flex;
        flex-direction: column;
        gap: 1vmin;
    }
    .effect-group h4 {
        margin: 0 0 0.5vmin 0;
        font-size: 18px;
        color: #ccc;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .effect-group[disabled] input, .effect-group[disabled] select {
        pointer-events: none;
        filter: grayscale(80%) opacity(0.6);
    }
    .effect-group[disabled] .switch {
      pointer-events: all;
      filter: none;
      opacity: 0.7;
    }
    .effect-group[disabled] label { color: #777; }
    .effect-group[disabled] label span:last-child { color: #777; }
    
    .inputs-row { display: flex; flex-direction: column; gap: 1.5vmin; align-items: stretch; }
    .input-group { display: flex; flex-direction: column; align-items: center; gap: 0.5vmin; }
    .input-group input[type="number"] { width: 100%; text-align: center; }
    .input-group label { font-weight: normal; }
    .slider-ticks {
      position: relative; height: 1.5vmin; margin-top: 0.2vmin;
      margin-left: calc(var(--thumb-size) / 2); margin-right: calc(var(--thumb-size) / 2);
      box-sizing: border-box;
    }
    .slider-ticks span {
      position: absolute; bottom: 0; transform: translateX(-50%); font-size: 16px;
      font-weight: bold; color: #bbb; white-space: nowrap;
    }
    .slider-ticks span::before {
      content: ''; position: absolute; bottom: calc(100% + 0.2vmin); left: 50%;
      transform: translateX(-50%); width: 1px; height: 0.8vmin; background-color: #999;
    }
    .vinyl-play-button {
      background: #555; border: 1px solid #666; border-radius: 5px; color: #eee;
      width: 100%; height: 4vmin; cursor: pointer; display: flex; align-items: center;
      justify-content: center; padding: 0; transition: background-color 0.2s;
    }
    .vinyl-play-button:hover { background: #666; }
    .vinyl-play-button svg { width: 2.5vmin; height: 2.5vmin; fill: #eee; }

    /* Toggle switch styles */
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 26px;
      flex-shrink: 0; /* prevent shrinking in flex container */
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
      border-radius: 26px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
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
      -webkit-transform: translateX(24px);
      -ms-transform: translateX(24px);
      transform: translateX(24px);
    }

    /* Wideband Multi-Band EQ Styles */
    .eq-mode-switch {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      background: rgba(0, 0, 0, 0.35);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .eq-mode-btn {
      flex: 1;
      background: transparent;
      border: 1px solid transparent;
      color: #aaa;
      padding: 9px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .eq-mode-btn:hover {
      color: #eee;
      background: rgba(255, 255, 255, 0.05);
    }
    .eq-mode-btn.active {
      background: linear-gradient(135deg, rgba(82, 0, 255, 0.45), rgba(42, 246, 222, 0.25));
      border-color: rgba(42, 246, 222, 0.5);
      color: #fff;
      box-shadow: 0 0 12px rgba(42, 246, 222, 0.2);
    }

    .eq-header-panel {
      background: rgba(20, 22, 30, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .eq-main-controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .eq-power-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: bold;
      color: #fff;
    }
    .eq-preamp-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.35);
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 13px;
    }
    .eq-preamp-box input[type="range"] {
      width: 100px;
      margin: 0;
    }
    .eq-preamp-display {
      font-family: monospace;
      font-weight: bold;
      color: #2af6de;
      min-width: 45px;
      text-align: right;
    }
    .eq-presets-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .eq-preset-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ccc;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .eq-preset-chip:hover {
      background: rgba(42, 246, 222, 0.18);
      border-color: rgba(42, 246, 222, 0.5);
      color: #2af6de;
    }
    .eq-reset-btn {
      background: rgba(255, 75, 75, 0.15);
      border: 1px solid rgba(255, 75, 75, 0.35);
      color: #ff8888;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-left: auto;
    }
    .eq-reset-btn:hover {
      background: rgba(255, 75, 75, 0.35);
      color: #fff;
    }

    .eq-curve-card {
      background: #0d0e14;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 10px;
      padding: 8px 6px 4px 6px;
      margin-bottom: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.85);
    }
    .eq-curve-svg {
      width: 100%;
      height: 125px;
      display: block;
    }
    .grid-line {
      stroke: rgba(255, 255, 255, 0.08);
      stroke-width: 1;
      stroke-dasharray: 2 3;
    }
    .grid-line-zero {
      stroke: rgba(255, 255, 255, 0.3);
      stroke-width: 1.2;
    }
    .grid-line-vert {
      stroke: rgba(255, 255, 255, 0.06);
      stroke-width: 1;
    }
    .grid-text {
      font-size: 10px;
      fill: rgba(255, 255, 255, 0.4);
      font-family: monospace;
    }
    .grid-text.zero {
      fill: rgba(255, 255, 255, 0.75);
      font-weight: bold;
    }
    .grid-text.freq {
      fill: rgba(42, 246, 222, 0.6);
    }
    .eq-curve-dot {
      fill: #2af6de;
      transition: all 0.1s ease;
    }
    .eq-curve-dot.boost {
      fill: #3dffab;
    }
    .eq-curve-dot.cut {
      fill: #ff25f6;
    }

    .eq-filter-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 10px;
      scrollbar-width: thin;
    }
    .eq-filter-tab {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #aaa;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .eq-filter-tab:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.12);
    }
    .eq-filter-tab.active {
      background: rgba(82, 0, 255, 0.45);
      border-color: #5200ff;
      color: #fff;
      box-shadow: 0 0 8px rgba(82, 0, 255, 0.3);
    }

    /* Faders Rack */
    .eq-rack-container {
      background: #14151e;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 12px 8px;
      overflow-x: auto;
      scrollbar-width: thin;
      box-shadow: inset 0 2px 15px rgba(0, 0, 0, 0.6);
    }
    .eq-faders-strip {
      display: flex;
      flex-direction: row;
      gap: 6px;
      align-items: stretch;
      min-width: max-content;
      justify-content: flex-start;
      padding: 0 4px;
    }
    .eq-band-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 44px;
      min-width: 44px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 6px 2px 8px 2px;
      gap: 5px;
      box-sizing: border-box;
      transition: background 0.2s, border-color 0.2s;
    }
    .eq-band-column:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .eq-btn {
      width: 32px;
      height: 26px;
      border-radius: 5px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #eee;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.12s ease;
      user-select: none;
      padding: 0;
    }
    .eq-btn:hover:not(:disabled) {
      background: #5200ff;
      border-color: #2af6de;
      color: #fff;
      transform: scale(1.05);
    }
    .eq-btn:active:not(:disabled) {
      transform: scale(0.95);
    }
    .eq-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .eq-btn.eq-zero {
      height: 18px;
      font-size: 11px;
      color: #888;
      border-color: rgba(255, 255, 255, 0.08);
      background: transparent;
    }
    .eq-btn.eq-zero:hover:not(:disabled) {
      color: #fff;
      border-color: #666;
      background: rgba(255, 255, 255, 0.1);
    }
    .eq-gain-display {
      font-size: 10px;
      font-family: monospace;
      font-weight: bold;
      padding: 2px 3px;
      border-radius: 4px;
      min-width: 38px;
      text-align: center;
      letter-spacing: -0.2px;
      color: #888;
      background: rgba(0, 0, 0, 0.35);
    }
    .eq-gain-display.boost {
      color: #3dffab;
      background: rgba(61, 255, 171, 0.15);
    }
    .eq-gain-display.cut {
      color: #ff4d6d;
      background: rgba(255, 77, 109, 0.15);
    }

    .fader-track-wrap {
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin: 4px 0;
    }
    .eq-fader {
      -webkit-appearance: slider-vertical;
      appearance: slider-vertical;
      writing-mode: vertical-lr;
      direction: rtl;
      width: 22px;
      height: 136px;
      cursor: pointer;
      background: transparent;
      padding: 0;
      margin: 0;
    }
    .fader-zero-indicator {
      position: absolute;
      top: 50%;
      left: 2px;
      right: 2px;
      height: 1px;
      background: rgba(255, 255, 255, 0.25);
      pointer-events: none;
      transform: translateY(-50%);
    }

    .eq-freq-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: -0.2px;
      text-align: center;
      margin-top: 2px;
      white-space: nowrap;
    }
    .eq-freq-badge.sub { color: #d9b2ff; }
    .eq-freq-badge.bass { color: #2af6de; }
    .eq-freq-badge.mid { color: #ffdd28; }
    .eq-freq-badge.high { color: #3dffab; }
    .eq-freq-badge.air { color: #ff25f6; }

    /* BPM Controls Styles */
    .bpm-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .bpm-badge-val {
      font-family: monospace;
      font-size: 14px;
      font-weight: bold;
      color: #2af6de;
    }
    .bpm-controls-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bpm-controls-row input[type="range"] {
      flex: 1;
    }
    .bpm-step-btn {
      width: 36px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #eee;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      user-select: none;
      padding: 0;
      line-height: 1;
    }
    .bpm-step-btn:hover:not(:disabled) {
      background: #5200ff;
      border-color: #2af6de;
      color: #fff;
      transform: scale(1.05);
    }
    .bpm-step-btn:active:not(:disabled) {
      transform: scale(0.95);
    }
    .bpm-step-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .bpm-genre-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-left: auto;
    }
    .bpm-chip-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #bbb;
      border-radius: 5px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .bpm-chip-btn:hover {
      background: rgba(42, 246, 222, 0.18);
      border-color: rgba(42, 246, 222, 0.5);
      color: #2af6de;
    }
    .bpm-chip-btn.active {
      background: rgba(82, 0, 255, 0.45);
      border-color: #5200ff;
      color: #fff;
    }
  `;

  private readonly defaultConfig: AppLiveMusicGenerationConfig = {
    temperature: 1.1,
    topK: 40,
    guidance: 4.0,
    echoMix: 0,
    reverbMix: 0,
    distortionEnabled: false,
    distortionAmount: 0.4,
    chorusEnabled: false,
    chorusRate: 1.5,
    chorusDepth: 0.3,
    chorusDelay: 0.025,
    chorusFeedback: 0.0,
    echoUiEnabled: false,
    echoUiDelayTime: 0.25,
    echoUiFeedback: 0.3,
    echoUiMix: 0.3,
    reverbUiEnabled: false,
    reverbUiDelayTime: 0.05,
    reverbUiDecay: 0.2,
    reverbUiMix: 0.25,
    flangerEnabled: false,
    flangerRate: 0.2,
    flangerDepth: 0.002,
    flangerDelay: 0.005,
    flangerFeedback: 0.5,
    eqEnabled: false,
    eqType: 'peaking',
    eqFrequency: 800,
    eqQ: 1,
    eqGain: 6,
    multiBandEqEnabled: false,
    multiBandEqPreamp: 0,
    multiBandEqGains: {},
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
    stereoPhaseShiftAmount: 0,
  };

  @state() private _config: AppLiveMusicGenerationConfig = {...this.defaultConfig};
  @state() autoDensity = true;
  @state() lastDefinedDensity: number | undefined = 0.5;
  @state() autoBrightness = true;
  @state() lastDefinedBrightness: number | undefined = 0.5;

  @property({type: Number}) vinylVolume = 0.25;
  @property({type: Boolean}) isVinylPlaying = false;
  @property({type: Boolean}) vinylLoopEnabled = false;
  @property({type: Boolean}) silenceFillerEnabled = true;

  @property({type: Boolean}) autoVolumeEnabled = false;
  @property({type: Number}) autoVolumeFrequencyHz = 1 / (8 * 60);
  @property({type: Number}) autoVolumeMinLevelPercent = 60;
  
  @state() private currentView: string = 'main';
  @state() private activeEqMode: 'multiband' | 'parametric' = 'multiband';
  @state() private eqCategoryFilter: 'all' | EqCategory = 'all';
  @state() lastDefinedBpm: number = 120;

  public getAppConfig(): AppLiveMusicGenerationConfig {
    const currentFullConfig = {...this._config};
    if (this.autoDensity) currentFullConfig.density = undefined;
    if (this.autoBrightness) currentFullConfig.brightness = undefined;
    return currentFullConfig;
  }

  public getDefaultConfig(): AppLiveMusicGenerationConfig {
    return { ...this.defaultConfig };
  }

  public setAppConfig(newConfig: AppLiveMusicGenerationConfig) {
    this._config = {...newConfig};
    this.autoDensity = newConfig.density === undefined;
    if (!this.autoDensity) this.lastDefinedDensity = newConfig.density;
    this.autoBrightness = newConfig.brightness === undefined;
    if (!this.autoBrightness) this.lastDefinedBrightness = newConfig.brightness;
    if (typeof newConfig.bpm === 'number') this.lastDefinedBpm = newConfig.bpm;
    this.requestUpdate('_config');
  }

  public resetToDefaults() {
    this._config = {...this.defaultConfig};
    this.autoDensity = true;
    this.autoBrightness = true;
    this.lastDefinedBpm = 120;
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
    const newConfig: AppLiveMusicGenerationConfig = { ...this._config };

    if (target instanceof HTMLInputElement) {
        if (target.type === 'number') {
            processedValue = target.value === '' ? undefined : (isNaN(target.valueAsNumber) ? undefined : target.valueAsNumber);
        } else if (target.type === 'range') {
            processedValue = target.valueAsNumber;
            this.updateSliderBackground(target);
        } else if (target.type === 'checkbox') {
            processedValue = target.checked;

            // When enabling an effect, if its main parameter is at a "no-op" value,
            // reset it to the default to ensure an audible change.
            if (processedValue === true) {
                if (key === 'distortionEnabled' && (this._config.distortionAmount === 0)) {
                    newConfig.distortionAmount = this.defaultConfig.distortionAmount;
                } else if (key === 'echoUiEnabled' && (this._config.echoUiMix === 0)) {
                    newConfig.echoUiMix = this.defaultConfig.echoUiMix;
                } else if (key === 'reverbUiEnabled' && (this._config.reverbUiMix === 0)) {
                    newConfig.reverbUiMix = this.defaultConfig.reverbUiMix;
                } else if (key === 'eqEnabled' && (this._config.eqGain === 0)) {
                    const eqType = this._config.eqType ?? this.defaultConfig.eqType;
                    if (eqType === 'peaking' || eqType === 'lowshelf' || eqType === 'highshelf') {
                         newConfig.eqGain = this.defaultConfig.eqGain;
                    }
                }
            }
        } else {
            processedValue = target.value === '' ? undefined : target.value;
        }
    } else if (target instanceof HTMLSelectElement) {
        processedValue = target.value === "" ? undefined : target.value as Scale | BiquadFilterType;
    } else {
      return;
    }

    
    if (key === 'auto-density') {
      this.autoDensity = Boolean(processedValue);
      newConfig.density = this.autoDensity ? undefined : (this.lastDefinedDensity ?? 0.5);
    } else if (key === 'auto-brightness') {
      this.autoBrightness = Boolean(processedValue);
      newConfig.brightness = this.autoBrightness ? undefined : (this.lastDefinedBrightness ?? 0.5);
    } else if (key === 'density' || key === 'brightness') {
        (newConfig as any)[key] = processedValue;
        if (typeof processedValue === 'number') {
            if (key === 'density') this.lastDefinedDensity = processedValue;
            else this.lastDefinedBrightness = processedValue;
        }
    } else if (key === 'seed') {
        const numSeed = parseInt(String(processedValue), 10);
        newConfig.seed = isNaN(numSeed) ? undefined : numSeed;
    } else if (key in this.defaultConfig) {
        (newConfig as any)[key] = processedValue;
    }

    this._config = newConfig;
    this.dispatchSettingsChange();
  }

  private handleVinylInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const key = target.id;
    const value = target.type === 'checkbox' ? target.checked : target.valueAsNumber;
    this.dispatchEvent(new CustomEvent('vinyl-setting-changed', {detail: { key, value }}));
    if (target.type === 'range') this.updateSliderBackground(target);
  }

  private handleVinylPlayToggle() {
    this.dispatchEvent(new CustomEvent('vinyl-play-toggled'));
  }

  private handleAutoVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const key = target.id.replace('auto-volume-', '');
    const value = target.type === 'checkbox' ? target.checked : (target.valueAsNumber || (key === 'frequency' || key === 'interval' ? 0 : this.autoVolumeMinLevelPercent));
    this.dispatchEvent(new CustomEvent('auto-volume-setting-changed', {detail: { key, value }}));
  }

  private handleBpmSliderInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = input.valueAsNumber;
    this.lastDefinedBpm = val;
    const newConfig = { ...this._config, bpm: val };
    this._config = newConfig;
    this.updateSliderBackground(input);
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private adjustBpm(delta: number, e?: MouseEvent) {
    const step = e && e.shiftKey ? (delta > 0 ? 5 : -5) : delta;
    const current = this._config.bpm ?? this.lastDefinedBpm ?? 120;
    const next = Math.max(60, Math.min(200, current + step));
    this.lastDefinedBpm = next;
    const newConfig = { ...this._config, bpm: next };
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private handleAutoBpmToggle(e: Event) {
    const checkbox = e.target as HTMLInputElement;
    const isAuto = checkbox.checked;
    const newConfig = { ...this._config, bpm: isAuto ? undefined : (this.lastDefinedBpm ?? 120) };
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private setBpm(val: number) {
    this.lastDefinedBpm = val;
    const newConfig = { ...this._config, bpm: val };
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  protected override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('_config') || changedProperties.has('autoDensity') || changedProperties.has('autoBrightness') || changedProperties.has('vinylVolume') || changedProperties.has('autoVolumeEnabled')) {
      this.shadowRoot?.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(slider => this.updateSliderBackground(slider));
    }
  }

  private dispatchSettingsChange() {
    this.dispatchEvent(new CustomEvent<AppLiveMusicGenerationConfig>('settings-changed', {detail: this.getAppConfig()}));
  }

  private renderBackButton() {
    return html`<button class="back-button" @click=${() => this.currentView = 'main'}>← Назад</button>`;
  }
  
  private renderSettingsPage(title: string, content: unknown) {
    return html`
      <div class="page-container">
        <div class="page-header">
          ${this.renderBackButton()}
          <h3>${title}</h3>
        </div>
        <div class="page-content">
          ${content}
        </div>
      </div>
    `;
  }

  private renderSlider(id: keyof AppLiveMusicGenerationConfig, labelText: string, min: number, max: number, step: number, value: number | undefined, defaultValue: number, disabled = false, toFixed = 2, displayTransform?: (val: number) => string, showTicks = false, customTickMarks?: Array<{label: string; percent: number}>) {
    const val = value ?? defaultValue;
    const displayValue = displayTransform ? displayTransform(val) : val.toFixed(toFixed);
    return html`
      <div class="setting">
        <label for=${id}>${labelText}<span>${displayValue}</span></label>
        <input type="range" id=${id} min=${min} max=${max} step=${step} .value=${String(val)} ?disabled=${disabled} @input=${this.handleInputChange} />
        ${showTicks && customTickMarks ? html`
          <div class="slider-ticks">
            ${customTickMarks.map(tick => html`<span style="left: ${tick.percent}%">${tick.label}</span>`)}
          </div>
        ` : ''}
      </div>`;
  }

  private _handleOpenPresets() {
    this.dispatchEvent(new CustomEvent('open-presets-manager', { bubbles: true, composed: true }));
  }

  private _handleOpenInfo() {
    this.dispatchEvent(new CustomEvent('open-info-modal', { bubbles: true, composed: true }));
  }

  private renderMainView() {
    const cfg = this._config;
    const buttonClasses = {
      'model-mix': (cfg.echoMix ?? 0) > 0 || (cfg.reverbMix ?? 0) > 0,
      'distortion': cfg.distortionEnabled ?? false,
      'chorus': cfg.chorusEnabled ?? false,
      'echo': cfg.echoUiEnabled ?? false,
      'reverb': cfg.reverbUiEnabled ?? false,
      'flanger': cfg.flangerEnabled ?? false,
      'eq': (cfg.eqEnabled ?? false) || (cfg.multiBandEqEnabled ?? false),
      'compressor': cfg.compressorEnabled ?? false,
      'phaser': cfg.phaserEnabled ?? false,
      'tremolo': cfg.tremoloEnabled ?? false,
      'auto-volume': this.autoVolumeEnabled,
      'stereo-phase': (cfg.stereoPhaseShiftAmount ?? 0) !== 0,
    };
    
    return html`
      <div class="main-view-header">
        <div class="core-settings-row">
          ${this.renderSlider('temperature', 'Temperature', 0, 3, 0.1, cfg.temperature, this.defaultConfig.temperature!, false, 1)}
          ${this.renderSlider('guidance', 'Guidance', 0, 6, 0.1, cfg.guidance, this.defaultConfig.guidance!, false, 1)}
          ${this.renderSlider('topK', 'Top K', 1, 100, 1, cfg.topK, this.defaultConfig.topK!, false, 0)}
        </div>
      </div>
      <div class="main-view-content">
        <div class="settings-grid">
            <h4 class="grid-header">Параметры генерации модели</h4>
            <button class="grid-button" @click=${() => this.currentView = 'music-controls'}>Music Controls</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['model-mix']})} @click=${() => this.currentView = 'model-mix'}>Model Mix</button>

            <h4 class="grid-header">Аудиоэффекты на стороне клиента</h4>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['distortion']})} @click=${() => this.currentView = 'distortion'}>Distortion</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['chorus']})} @click=${() => this.currentView = 'chorus'}>Chorus</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['echo']})} @click=${() => this.currentView = 'echo'}>Echo (UI)</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['reverb']})} @click=${() => this.currentView = 'reverb'}>Reverb (UI)</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['flanger']})} @click=${() => this.currentView = 'flanger'}>Flanger</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['eq']})} @click=${() => this.currentView = 'eq'}>Широкополосный EQ / Фильтр</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['compressor']})} @click=${() => this.currentView = 'compressor'}>Compressor</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['phaser']})} @click=${() => this.currentView = 'phaser'}>Phaser</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['tremolo']})} @click=${() => this.currentView = 'tremolo'}>Tremolo</button>
            <button class="grid-button" @click=${() => this.currentView = 'vinyl'}>Vinyl Player</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['auto-volume']})} @click=${() => this.currentView = 'auto-volume'}>Auto Volume</button>
            <button class=${classMap({'grid-button': true, 'active-effect': buttonClasses['stereo-phase']})} @click=${() => this.currentView = 'stereo-phase'}>Stereo Phase</button>

            <h4 class="grid-header">Приложение</h4>
            <button class="grid-button" @click=${this._handleOpenPresets}>Управление пресетами</button>
            <button class="grid-button" @click=${this._handleOpenInfo}>Информация</button>
        </div>
      </div>
    `;
  }
  
  private renderMusicControls() {
    const cfg = this._config;
    const scaleMap = new Map<string, Scale | ''>([
      ['Auto', ''], ['C Major / A Minor', Scale.C_MAJOR_A_MINOR], ['C# Major / A# Minor', Scale.D_FLAT_MAJOR_B_FLAT_MINOR],
      ['D Major / B Minor', Scale.D_MAJOR_B_MINOR], ['D# Major / C Minor', Scale.E_FLAT_MAJOR_C_MINOR], ['E Major / C# Minor', Scale.E_MAJOR_D_FLAT_MINOR],
      ['F Major / D Minor', Scale.F_MAJOR_D_MINOR], ['F# Major / D# Minor', Scale.G_FLAT_MAJOR_E_FLAT_MINOR], ['G Major / E Minor', Scale.G_MAJOR_E_MINOR],
      ['G# Major / F Minor', Scale.A_FLAT_MAJOR_F_MINOR], ['A Major / F# Minor', Scale.A_MAJOR_G_FLAT_MINOR], ['A# Major / G Minor', Scale.B_FLAT_MAJOR_G_MINOR],
      ['B Major / G# Minor', Scale.B_MAJOR_A_FLAT_MINOR],
    ]);
    
    return html`
      <div class="setting">
        <label for="seed">Seed</label>
        <input type="text" id="seed" .value=${cfg.seed === undefined ? '' : String(cfg.seed)} @input=${this.handleInputChange} placeholder="Auto" />
      </div>
      <div class="setting bpm-setting-box" auto=${(cfg.bpm === undefined).toString()}>
        <div class="bpm-header-row">
          <label for="bpm">BPM (Темп)</label>
          <span class="bpm-badge-val">${cfg.bpm === undefined ? 'Auto' : `${cfg.bpm} BPM`}</span>
        </div>
        <div class="bpm-controls-row">
          <button
            type="button"
            class="bpm-step-btn"
            ?disabled=${cfg.bpm === undefined}
            @click=${(e: MouseEvent) => this.adjustBpm(-1, e)}
            title="-1 BPM (Shift: -5 BPM)"
          >−</button>
          <input
            type="range"
            id="bpm"
            min="60"
            max="200"
            step="1"
            .value=${String(cfg.bpm ?? this.lastDefinedBpm ?? 120)}
            ?disabled=${cfg.bpm === undefined}
            @input=${this.handleBpmSliderInput}
          />
          <button
            type="button"
            class="bpm-step-btn"
            ?disabled=${cfg.bpm === undefined}
            @click=${(e: MouseEvent) => this.adjustBpm(1, e)}
            title="+1 BPM (Shift: +5 BPM)"
          >+</button>
        </div>
        <div class="auto-row">
          <input
            type="checkbox"
            id="auto-bpm"
            .checked=${cfg.bpm === undefined}
            @change=${this.handleAutoBpmToggle}
          />
          <label for="auto-bpm">Auto</label>
          <div class="bpm-genre-chips">
            ${[
              { bpm: 80, label: '80 Lofi' },
              { bpm: 100, label: '100 Hip-Hop' },
              { bpm: 120, label: '120 House' },
              { bpm: 128, label: '128 EDM' },
              { bpm: 140, label: '140 Dubstep' },
              { bpm: 174, label: '174 DnB' },
            ].map(
              (chip) => html`
                <button
                  type="button"
                  class="bpm-chip-btn ${cfg.bpm === chip.bpm ? 'active' : ''}"
                  @click=${() => this.setBpm(chip.bpm)}
                >
                  ${chip.label}
                </button>
              `
            )}
          </div>
        </div>
      </div>
      <div class="setting" auto=${this.autoDensity.toString()}>
        <label for="density">Density</label>
        <input type="range" id="density" min="0" max="1" step="0.05" .value=${String(this.autoDensity ? (this.lastDefinedDensity ?? 0.5) : (cfg.density ?? this.lastDefinedDensity ?? 0.5))} ?disabled=${this.autoDensity} @input=${this.handleInputChange} />
        <div class="auto-row">
          <input type="checkbox" id="auto-density" .checked=${this.autoDensity} @input=${this.handleInputChange} /><label for="auto-density">Auto</label>
          <span>${(this.autoDensity ? (this.lastDefinedDensity ?? 0.5) : (cfg.density ?? this.lastDefinedDensity ?? 0.5)).toFixed(2)}</span>
        </div>
      </div>
      <div class="setting" auto=${this.autoBrightness.toString()}>
        <label for="brightness">Brightness</label>
        <input type="range" id="brightness" min="0" max="1" step="0.05" .value=${String(this.autoBrightness ? (this.lastDefinedBrightness ?? 0.5) : (cfg.brightness ?? this.lastDefinedBrightness ?? 0.5))} ?disabled=${this.autoBrightness} @input=${this.handleInputChange} />
        <div class="auto-row">
          <input type="checkbox" id="auto-brightness" .checked=${this.autoBrightness} @input=${this.handleInputChange} /><label for="auto-brightness">Auto</label>
          <span>${(this.autoBrightness ? (this.lastDefinedBrightness ?? 0.5) : (cfg.brightness ?? this.lastDefinedBrightness ?? 0.5)).toFixed(2)}</span>
        </div>
      </div>
      <div class="setting">
        <label for="scale">Scale</label>
        <select id="scale" .value=${cfg.scale || ""} @change=${this.handleInputChange}>
          ${[...scaleMap.entries()].map(([name, val]) => html`<option .value=${val}>${name}</option>`)}
        </select>
      </div>
      <div class="setting">
        <div class="checkbox-setting"><input type="checkbox" id="muteBass" .checked=${!!cfg.muteBass} @change=${this.handleInputChange} /><label for="muteBass">Mute Bass</label></div>
        <div class="checkbox-setting"><input type="checkbox" id="muteDrums" .checked=${!!cfg.muteDrums} @change=${this.handleInputChange} /><label for="muteDrums">Mute Drums</label></div>
        <div class="checkbox-setting"><input type="checkbox" id="onlyBassAndDrums" .checked=${!!cfg.onlyBassAndDrums} @change=${this.handleInputChange} /><label for="onlyBassAndDrums">Only Bass & Drums</label></div>
      </div>
    `;
  }
  
  private renderEffectGroup(id: keyof AppLiveMusicGenerationConfig, title: string, content: unknown) {
    const isEnabled = !!(this._config[id] ?? (this.defaultConfig as any)[id]);
    return html`
      <div class="effect-group" ?disabled=${!isEnabled}>
        <h4>
          <span>${title}</span>
          <label class="switch">
            <input type="checkbox" id=${id} .checked=${isEnabled} @input=${this.handleInputChange}>
            <span class="slider"></span>
          </label>
        </h4>
        ${content}
      </div>
    `;
  }
  
  private renderModelMix() {
    const cfg = this._config;
    return html`
      ${this.renderSlider('echoMix', 'Echo Mix (Model)', 0, 1, 0.05, cfg.echoMix, this.defaultConfig.echoMix!)}
      ${this.renderSlider('reverbMix', 'Reverb Mix (Model)', 0, 1, 0.05, cfg.reverbMix, this.defaultConfig.reverbMix!)}
    `;
  }

  private renderDistortion() {
    const cfg = this._config;
    const isEnabled = !!(cfg.distortionEnabled ?? this.defaultConfig.distortionEnabled);
    return this.renderEffectGroup('distortionEnabled', 'Distortion', html`
      ${this.renderSlider('distortionAmount', 'Amount', 0, 1, 0.01, cfg.distortionAmount, this.defaultConfig.distortionAmount!, !isEnabled)}
    `);
  }

  private renderChorus() {
    const cfg = this._config;
    const isEnabled = !!(cfg.chorusEnabled ?? this.defaultConfig.chorusEnabled);
    return this.renderEffectGroup('chorusEnabled', 'Chorus', html`
      ${this.renderSlider('chorusRate', 'Rate (Hz)', 0.1, 10, 0.1, cfg.chorusRate, this.defaultConfig.chorusRate!, !isEnabled, 1)}
      ${this.renderSlider('chorusDepth', 'Depth', 0, 1, 0.01, cfg.chorusDepth, this.defaultConfig.chorusDepth!, !isEnabled)}
      ${this.renderSlider('chorusDelay', 'Delay (s)', 0.001, 0.05, 0.001, cfg.chorusDelay, this.defaultConfig.chorusDelay!, !isEnabled, 3)}
      ${this.renderSlider('chorusFeedback', 'Feedback', 0, 0.95, 0.01, cfg.chorusFeedback, this.defaultConfig.chorusFeedback!, !isEnabled)}
    `);
  }
  
  private renderEcho() {
    const cfg = this._config;
    const isEnabled = !!(cfg.echoUiEnabled ?? this.defaultConfig.echoUiEnabled);
    return this.renderEffectGroup('echoUiEnabled', 'Echo (UI)', html`
      ${this.renderSlider('echoUiDelayTime', 'Delay (s)', 0.01, 1, 0.01, cfg.echoUiDelayTime, this.defaultConfig.echoUiDelayTime!, !isEnabled, 2)}
      ${this.renderSlider('echoUiFeedback', 'Feedback', 0, 0.95, 0.01, cfg.echoUiFeedback, this.defaultConfig.echoUiFeedback!, !isEnabled, 2)}
      ${this.renderSlider('echoUiMix', 'Mix', 0, 1, 0.01, cfg.echoUiMix, this.defaultConfig.echoUiMix!, !isEnabled, 2)}
    `);
  }
  
  private renderReverb() {
    const cfg = this._config;
    const isEnabled = !!(cfg.reverbUiEnabled ?? this.defaultConfig.reverbUiEnabled);
    return this.renderEffectGroup('reverbUiEnabled', 'Reverb (UI)', html`
      ${this.renderSlider('reverbUiDelayTime', 'Pre-Delay (s)', 0.001, 0.2, 0.001, cfg.reverbUiDelayTime, this.defaultConfig.reverbUiDelayTime!, !isEnabled, 3)}
      ${this.renderSlider('reverbUiDecay', 'Decay', 0, 0.95, 0.01, cfg.reverbUiDecay, this.defaultConfig.reverbUiDecay!, !isEnabled, 2)}
      ${this.renderSlider('reverbUiMix', 'Mix', 0, 1, 0.01, cfg.reverbUiMix, this.defaultConfig.reverbUiMix!, !isEnabled, 2)}
    `);
  }
  
  private renderFlanger() {
    const cfg = this._config;
    const isEnabled = !!(cfg.flangerEnabled ?? this.defaultConfig.flangerEnabled);
    return this.renderEffectGroup('flangerEnabled', 'Flanger', html`
      ${this.renderSlider('flangerRate', 'Rate (Hz)', 0.05, 5, 0.05, cfg.flangerRate, this.defaultConfig.flangerRate!, !isEnabled, 2)}
      ${this.renderSlider('flangerDepth', 'Depth (mod s)', 0.0005, 0.005, 0.0001, cfg.flangerDepth, this.defaultConfig.flangerDepth!, !isEnabled, 4)}
      ${this.renderSlider('flangerDelay', 'Delay (s)', 0.001, 0.01, 0.0005, cfg.flangerDelay, this.defaultConfig.flangerDelay!, !isEnabled, 4)}
      ${this.renderSlider('flangerFeedback', 'Feedback', 0, 0.95, 0.01, cfg.flangerFeedback, this.defaultConfig.flangerFeedback!, !isEnabled)}
    `);
  }

  private readonly eqPresets: Record<string, { name: string; icon: string; preamp: number; gains: Record<number, number> }> = {
    flat: {
      name: 'Сброс (Flat 0 dB)',
      icon: '🔄',
      preamp: 0,
      gains: {}
    },
    bassBoost: {
      name: 'Bass Boost (+6 dB)',
      icon: '🔊',
      preamp: -2,
      gains: { 1: 1, 5: 2, 10: 3, 16: 4, 20: 5, 25: 5.5, 31.5: 6, 40: 6, 50: 6, 63: 5.5, 80: 4.5, 100: 3.5, 125: 2.5, 160: 1.5, 200: 0.5 }
    },
    subKick: {
      name: 'Sub Rumble (1-60 Hz)',
      icon: '⚡',
      preamp: -3,
      gains: { 1: 4, 5: 6, 10: 8, 16: 9, 20: 9, 25: 8.5, 31.5: 7.5, 40: 6, 50: 4, 63: 2 }
    },
    vShape: {
      name: 'V-Shape / Smile (Rock/EDM)',
      icon: '🎸',
      preamp: -2.5,
      gains: {
        1: 2, 5: 3, 10: 4, 16: 5, 20: 5.5, 25: 6, 31.5: 6, 40: 5, 50: 4, 63: 3, 80: 1.5, 100: 0.5,
        315: -1.5, 400: -2.5, 500: -3, 630: -3, 800: -2, 1000: -1,
        4000: 1.5, 5000: 2.5, 6300: 3.5, 8000: 4.5, 10000: 5.5, 12500: 6, 16000: 6.5, 20000: 7, 22000: 7, 25000: 7
      }
    },
    vocalClarity: {
      name: 'Vocal Clarity & Presence',
      icon: '🎤',
      preamp: 0,
      gains: {
        1: -12, 5: -12, 10: -10, 16: -8, 20: -6, 25: -4, 31.5: -2, 40: -1,
        200: -1.5, 250: -2.5, 315: -2.5, 400: -1.5,
        1250: 1.5, 1600: 3, 2000: 4, 2500: 4.5, 3150: 4, 4000: 3, 5000: 2,
        12500: 2, 16000: 3, 20000: 2
      }
    },
    airBrilliance: {
      name: 'Air & Sparkle (12k-25k)',
      icon: '✨',
      preamp: -1.5,
      gains: {
        6300: 1, 8000: 2, 10000: 3.5, 12500: 5.5, 16000: 7, 20000: 8, 22000: 8, 25000: 8
      }
    },
    subCut: {
      name: 'Sub-Cut (<20 Hz HPF)',
      icon: '🛡️',
      preamp: 0.5,
      gains: {
        1: -24, 5: -24, 10: -20, 16: -12, 20: -6, 25: -2
      }
    },
    loudness: {
      name: 'Loudness Contour',
      icon: '🎧',
      preamp: -2,
      gains: {
        1: 3, 5: 4, 10: 5, 16: 5.5, 20: 6, 25: 6, 31.5: 5.5, 40: 5, 50: 4, 63: 3,
        8000: 2, 10000: 3.5, 12500: 4.5, 16000: 5.5, 20000: 6, 22000: 6.5, 25000: 6.5
      }
    }
  };

  private handleBandGainInput(freq: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.setBandGain(freq, isNaN(val) ? 0 : val);
  }

  private setBandGain(freq: number, gainDb: number) {
    const clamped = Math.max(-24, Math.min(24, Math.round(gainDb * 10) / 10));
    const newConfig = { ...this._config };
    const currentGains = { ...(newConfig.multiBandEqGains || {}) };
    if (clamped === 0) {
      delete currentGains[freq];
    } else {
      currentGains[freq] = clamped;
    }
    newConfig.multiBandEqGains = currentGains;
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private adjustBandGain(freq: number, deltaDb: number, e?: MouseEvent) {
    const step = e && e.shiftKey ? (deltaDb > 0 ? 0.5 : -0.5) : deltaDb;
    const current = this._config.multiBandEqGains?.[freq] ?? 0;
    this.setBandGain(freq, current + step);
  }

  private resetBandGain(freq: number) {
    this.setBandGain(freq, 0);
  }

  private resetAllBands() {
    const newConfig = { ...this._config };
    newConfig.multiBandEqGains = {};
    newConfig.multiBandEqPreamp = 0;
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private applyEqPreset(presetKey: string) {
    const preset = this.eqPresets[presetKey];
    if (!preset) return;
    const newConfig = { ...this._config };
    newConfig.multiBandEqPreamp = preset.preamp;
    newConfig.multiBandEqGains = { ...preset.gains };
    newConfig.multiBandEqEnabled = true;
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private handlePreampInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = parseFloat(input.value);
    const clamped = Math.max(-12, Math.min(12, Math.round((isNaN(val) ? 0 : val) * 10) / 10));
    const newConfig = { ...this._config, multiBandEqPreamp: clamped };
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private adjustPreamp(deltaDb: number) {
    const current = this._config.multiBandEqPreamp ?? 0;
    const clamped = Math.max(-12, Math.min(12, Math.round((current + deltaDb) * 10) / 10));
    const newConfig = { ...this._config, multiBandEqPreamp: clamped };
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private toggleMultiBandEq(e: Event) {
    const target = e.target as HTMLInputElement;
    const newConfig = { ...this._config, multiBandEqEnabled: target.checked };
    this._config = newConfig;
    this.dispatchSettingsChange();
    this.requestUpdate();
  }

  private renderEqCurveSvg(gains: Record<number, number>, preamp: number) {
    const width = 800;
    const height = 120;
    const pointsCount = 90;
    const minLog = Math.log10(1);      // 0
    const maxLog = Math.log10(25000);  // ~4.39794
    const logRange = maxLog - minLog;

    const activeFrequencies = Object.keys(gains).map(Number).filter(f => (gains[f] ?? 0) !== 0);

    const pathPoints: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < pointsCount; i++) {
      const t = i / (pointsCount - 1);
      const freq = Math.pow(10, minLog + t * logRange);
      let totalGainDb = preamp;

      for (const f of activeFrequencies) {
        const gain = gains[f];
        if (gain) {
          const octDiff = Math.log2(freq / f);
          const bell = 1 / (1 + Math.pow(octDiff / 0.55, 2));
          totalGainDb += gain * bell;
        }
      }

      const clampedGain = Math.max(-24, Math.min(24, totalGainDb));
      const y = (height / 2) - (clampedGain / 24) * (height / 2 - 8);
      const x = t * width;
      pathPoints.push({ x, y });
    }

    const d = pathPoints.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const fillD = `${d} L ${width} ${height / 2} L 0 ${height / 2} Z`;

    const freqMarkers = [
      { freq: 1, label: '1Hz' },
      { freq: 10, label: '10Hz' },
      { freq: 100, label: '100Hz' },
      { freq: 1000, label: '1kHz' },
      { freq: 10000, label: '10kHz' },
      { freq: 25000, label: '25kHz' },
    ];

    return svg`
      <svg class="eq-curve-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eqCurveGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2af6de" stop-opacity="0.3" />
            <stop offset="50%" stop-color="#5200ff" stop-opacity="0.12" />
            <stop offset="100%" stop-color="#9900ff" stop-opacity="0.0" />
          </linearGradient>
          <linearGradient id="eqLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#d9b2ff" />
            <stop offset="25%" stop-color="#2af6de" />
            <stop offset="60%" stop-color="#3dffab" />
            <stop offset="100%" stop-color="#ff25f6" />
          </linearGradient>
        </defs>

        <line x1="0" y1="${height * 0.125}" x2="${width}" y2="${height * 0.125}" class="grid-line" />
        <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${height * 0.25}" class="grid-line" />
        <line x1="0" y1="${height * 0.375}" x2="${width}" y2="${height * 0.375}" class="grid-line" />
        <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" class="grid-line-zero" />
        <line x1="0" y1="${height * 0.625}" x2="${width}" y2="${height * 0.625}" class="grid-line" />
        <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" class="grid-line" />
        <line x1="0" y1="${height * 0.875}" x2="${width}" y2="${height * 0.875}" class="grid-line" />

        <text x="6" y="${height * 0.16}" class="grid-text">+18 dB</text>
        <text x="6" y="${height / 2 - 3}" class="grid-text zero">0 dB</text>
        <text x="6" y="${height * 0.86}" class="grid-text">-18 dB</text>

        ${freqMarkers.map(m => {
          const t = Math.log10(m.freq) / logRange;
          const x = t * width;
          return svg`
            <line x1="${x}" y1="0" x2="${x}" y2="${height}" class="grid-line-vert" />
            <text x="${Math.max(6, Math.min(width - 32, x + 3))}" y="${height - 4}" class="grid-text freq">${m.label}</text>
          `;
        })}

        <path d="${fillD}" fill="url(#eqCurveGlow)" />
        <path d="${d}" fill="none" stroke="url(#eqLineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        ${EQ_BAND_FREQUENCIES.map(f => {
          const gain = gains[f] ?? 0;
          if (gain === 0 && preamp === 0) return '';
          const t = Math.log10(f) / logRange;
          const x = t * width;
          let ptGain = preamp;
          for (const af of activeFrequencies) {
            const g = gains[af];
            if (g) {
              const octDiff = Math.log2(f / af);
              ptGain += g * (1 / (1 + Math.pow(octDiff / 0.55, 2)));
            }
          }
          const y = (height / 2) - (Math.max(-24, Math.min(24, ptGain)) / 24) * (height / 2 - 8);
          return svg`<circle cx="${x}" cy="${y}" r="3.5" class="eq-curve-dot ${gain > 0 ? 'boost' : (gain < 0 ? 'cut' : '')}" />`;
        })}
      </svg>
    `;
  }

  private renderMultiBandEq() {
    const cfg = this._config;
    const isEnabled = !!(cfg.multiBandEqEnabled ?? this.defaultConfig.multiBandEqEnabled);
    const gains = cfg.multiBandEqGains || {};
    const preamp = cfg.multiBandEqPreamp ?? 0;

    const visibleBands = EQ_BAND_FREQUENCIES.filter(freq => {
      if (this.eqCategoryFilter === 'all') return true;
      return getEqFreqCategory(freq) === this.eqCategoryFilter;
    });

    const categoryTabs: Array<{ id: 'all' | EqCategory; label: string }> = [
      { id: 'all', label: `Все полосы (37)` },
      { id: 'sub', label: 'Суб-НЧ (1 - 40 Гц)' },
      { id: 'bass', label: 'Бас (50 - 250 Гц)' },
      { id: 'mid', label: 'СЧ (315 Гц - 2 кГц)' },
      { id: 'high', label: 'ВЧ (2.5 - 10 кГц)' },
      { id: 'air', label: 'Воздух (12.5 - 25 кГц)' },
    ];

    return html`
      <div class="eq-header-panel">
        <div class="eq-main-controls-row">
          <div class="eq-power-toggle">
            <span>Эквалайзер (EQ)</span>
            <label class="switch">
              <input type="checkbox" id="multiBandEqEnabled" .checked=${isEnabled} @change=${this.toggleMultiBandEq}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="eq-preamp-box" title="Предусилитель / Мастер гейн для компенсации громкости">
            <label for="eqPreamp">Preamp:</label>
            <button class="eq-btn" ?disabled=${!isEnabled || preamp <= -12} @click=${() => this.adjustPreamp(-0.5)}>-</button>
            <input type="range" id="eqPreamp" min="-12" max="12" step="0.5" .value=${String(preamp)} ?disabled=${!isEnabled} @input=${this.handlePreampInput} />
            <button class="eq-btn" ?disabled=${!isEnabled || preamp >= 12} @click=${() => this.adjustPreamp(0.5)}>+</button>
            <span class="eq-preamp-display">${preamp >= 0 ? '+' : ''}${preamp.toFixed(1)} dB</span>
            <button class="eq-btn eq-zero" ?disabled=${!isEnabled || preamp === 0} @click=${() => this.adjustPreamp(-preamp)} title="Сброс преампа в 0 dB">0</button>
          </div>

          <button class="eq-reset-btn" ?disabled=${!isEnabled} @click=${this.resetAllBands} title="Сбросить все полосы и преамп в 0 dB">
            🔄 Сброс всех полос (0 dB)
          </button>
        </div>

        <div class="eq-presets-bar">
          <span style="font-size: 12px; color: #888; font-weight: 600;">Пресеты:</span>
          ${Object.entries(this.eqPresets).map(([key, p]) => html`
            <button class="eq-preset-chip" @click=${() => this.applyEqPreset(key)}>
              <span>${p.icon}</span> ${p.name}
            </button>
          `)}
        </div>
      </div>

      <!-- Real-time EQ Curve -->
      <div class="eq-curve-card">
        ${this.renderEqCurveSvg(gains, preamp)}
      </div>

      <!-- Category Filter Tabs -->
      <div class="eq-filter-tabs">
        ${categoryTabs.map(tab => html`
          <button
            class=${classMap({'eq-filter-tab': true, 'active': this.eqCategoryFilter === tab.id})}
            @click=${() => this.eqCategoryFilter = tab.id}
          >
            ${tab.label}
          </button>
        `)}
      </div>

      <!-- Faders Rack -->
      <div class="eq-rack-container" ?disabled=${!isEnabled}>
        <div class="eq-faders-strip">
          ${visibleBands.map(freq => {
            const gain = gains[freq] ?? 0;
            const category = getEqFreqCategory(freq);
            const label = formatEqFreqLabel(freq);
            return html`
              <div class="eq-band-column" title="${freq} Гц">
                <button
                  class="eq-btn"
                  ?disabled=${!isEnabled || gain >= 24}
                  @click=${(e: MouseEvent) => this.adjustBandGain(freq, 1, e)}
                  title="+1.0 dB (Shift: +0.5 dB)"
                >+</button>

                <div class="eq-gain-display ${gain > 0 ? 'boost' : (gain < 0 ? 'cut' : '')}">
                  ${gain > 0 ? '+' : ''}${gain.toFixed(1)}
                </div>

                <div class="fader-track-wrap">
                  <input
                    type="range"
                    class="eq-fader"
                    min="-24"
                    max="24"
                    step="0.5"
                    .value=${String(gain)}
                    ?disabled=${!isEnabled}
                    @input=${(e: Event) => this.handleBandGainInput(freq, e)}
                  />
                  <div class="fader-zero-indicator"></div>
                </div>

                <button
                  class="eq-btn"
                  ?disabled=${!isEnabled || gain <= -24}
                  @click=${(e: MouseEvent) => this.adjustBandGain(freq, -1, e)}
                  title="-1.0 dB (Shift: -0.5 dB)"
                >-</button>

                <button
                  class="eq-btn eq-zero"
                  ?disabled=${!isEnabled || gain === 0}
                  @click=${() => this.resetBandGain(freq)}
                  title="Сбросить полосу в 0 dB"
                >0</button>

                <div class="eq-freq-badge ${category}">
                  ${label}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderParametricFilter() {
    const cfg = this._config;
    const isEnabled = !!(cfg.eqEnabled ?? this.defaultConfig.eqEnabled);
    const eqFilterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch'];
    const currentEqType = cfg.eqType ?? this.defaultConfig.eqType!;
    const showEqQ = ['lowpass', 'highpass', 'bandpass', 'peaking', 'notch'].includes(currentEqType);
    const showEqGain = ['lowshelf', 'highshelf', 'peaking'].includes(currentEqType);

    return this.renderEffectGroup('eqEnabled', 'Параметрический фильтр', html`
      <div class="setting">
        <label for="eqType">Type</label>
        <select id="eqType" .value=${currentEqType} @change=${this.handleInputChange} ?disabled=${!isEnabled}>
          ${eqFilterTypes.map(type => html`<option value=${type}>${type}</option>`)}
        </select>
      </div>
      ${this.renderSlider('eqFrequency', 'Frequency (Hz)', 20, 20000, 1, cfg.eqFrequency, this.defaultConfig.eqFrequency!, !isEnabled, 0)}
      ${showEqQ ? this.renderSlider('eqQ', 'Q Factor', 0.0001, 100, 0.0001, cfg.eqQ, this.defaultConfig.eqQ!, !isEnabled, 4) : ''}
      ${showEqGain ? this.renderSlider('eqGain', 'Gain (dB)', -40, 40, 0.1, cfg.eqGain, this.defaultConfig.eqGain!, !isEnabled, 1) : ''}
    `);
  }

  private renderEq() {
    return html`
      <div class="eq-mode-switch">
        <button
          class=${classMap({'eq-mode-btn': true, 'active': this.activeEqMode === 'multiband'})}
          @click=${() => this.activeEqMode = 'multiband'}
        >
          <span>🎚️</span> Широкополосный EQ (37 полос: 1 Гц — 25 кГц)
        </button>
        <button
          class=${classMap({'eq-mode-btn': true, 'active': this.activeEqMode === 'parametric'})}
          @click=${() => this.activeEqMode = 'parametric'}
        >
          <span>🎛️</span> Параметрический фильтр (Sweep)
        </button>
      </div>

      ${this.activeEqMode === 'multiband' ? this.renderMultiBandEq() : this.renderParametricFilter()}
    `;
  }
  
  private renderCompressor() {
    const cfg = this._config;
    const isEnabled = !!(cfg.compressorEnabled ?? this.defaultConfig.compressorEnabled);
    return this.renderEffectGroup('compressorEnabled', 'Compressor', html`
      ${this.renderSlider('compressorThreshold', 'Threshold (dB)', -100, 0, 1, cfg.compressorThreshold, this.defaultConfig.compressorThreshold!, !isEnabled, 0)}
      ${this.renderSlider('compressorKnee', 'Knee (dB)', 0, 40, 1, cfg.compressorKnee, this.defaultConfig.compressorKnee!, !isEnabled, 0)}
      ${this.renderSlider('compressorRatio', 'Ratio', 1, 20, 1, cfg.compressorRatio, this.defaultConfig.compressorRatio!, !isEnabled, 0)}
      ${this.renderSlider('compressorAttack', 'Attack (s)', 0, 1, 0.001, cfg.compressorAttack, this.defaultConfig.compressorAttack!, !isEnabled, 3)}
      ${this.renderSlider('compressorRelease', 'Release (s)', 0, 1, 0.001, cfg.compressorRelease, this.defaultConfig.compressorRelease!, !isEnabled, 3)}
    `);
  }

  private renderPhaser() {
    const cfg = this._config;
    const isEnabled = !!(cfg.phaserEnabled ?? this.defaultConfig.phaserEnabled);
    return this.renderEffectGroup('phaserEnabled', 'Phaser', html`
      ${this.renderSlider('phaserRate', 'Rate (Hz)', 0.05, 10, 0.05, cfg.phaserRate, this.defaultConfig.phaserRate!, !isEnabled, 2)}
      ${this.renderSlider('phaserDepth', 'Depth', 0, 1, 0.01, cfg.phaserDepth, this.defaultConfig.phaserDepth!, !isEnabled)}
      ${this.renderSlider('phaserFeedback', 'Feedback', 0, 0.95, 0.01, cfg.phaserFeedback, this.defaultConfig.phaserFeedback!, !isEnabled)}
      ${this.renderSlider('phaserStages', 'Stages', 2, 12, 1, cfg.phaserStages, this.defaultConfig.phaserStages!, !isEnabled, 0)}
      ${this.renderSlider('phaserBaseFrequency', 'Base Freq (Hz)', 300, 3000, 50, cfg.phaserBaseFrequency, this.defaultConfig.phaserBaseFrequency!, !isEnabled, 0)}
    `);
  }
  
  private renderTremolo() {
    const cfg = this._config;
    const isEnabled = !!(cfg.tremoloEnabled ?? this.defaultConfig.tremoloEnabled);
    return this.renderEffectGroup('tremoloEnabled', 'Tremolo', html`
      ${this.renderSlider('tremoloRate', 'Rate (Hz)', 0.1, 20, 0.1, cfg.tremoloRate, this.defaultConfig.tremoloRate!, !isEnabled, 1)}
      ${this.renderSlider('tremoloDepth', 'Depth', 0, 1, 0.01, cfg.tremoloDepth, this.defaultConfig.tremoloDepth!, !isEnabled)}
    `);
  }
  
  private renderVinyl() {
    const playIcon = this.isVinylPlaying ? svg`<path d="M6 6 H 18 V 18 H 6 Z" />` : svg`<path d="M8 5 V 19 L 19 12 Z" />`;
    return html`
      <div class="effect-group">
        <h4>Vinyl Player</h4>
        <div class="setting checkbox-setting"><input type="checkbox" id="silenceFillerEnabled" .checked=${this.silenceFillerEnabled} @input=${this.handleVinylInputChange} /><label for="silenceFillerEnabled">Fill Silence</label></div>
        <div class="setting checkbox-setting"><input type="checkbox" id="vinylLoopEnabled" .checked=${this.vinylLoopEnabled} @input=${this.handleVinylInputChange} /><label for="vinylLoopEnabled">Loop Vinyl</label></div>
        <div class="setting">
          <label for="vinylVolume">Volume<span>${this.vinylVolume.toFixed(2)}</span></label>
          <input type="range" id="vinylVolume" min="0" max="1" step="0.01" .value=${String(this.vinylVolume)} @input=${this.handleVinylInputChange} />
        </div>
        <div class="setting"><button class="vinyl-play-button" @click=${this.handleVinylPlayToggle}><svg viewBox="0 0 24 24">${playIcon}</svg></button></div>
      </div>
    `;
  }
  
  private renderAutoVolume() {
    return html`
      <div class="effect-group" ?disabled=${!this.autoVolumeEnabled}>
        <h4>
          <span>Auto Volume</span>
          <label class="switch">
            <input
              type="checkbox"
              id="auto-volume-toggle"
              .checked=${this.autoVolumeEnabled}
              @input=${this.handleAutoVolumeChange}
            />
            <span class="slider"></span>
          </label>
        </h4>
        <div class="inputs-row">
          <div class="input-group">
            <label for="auto-volume-frequency">Частота (Гц)</label>
            <input type="number" id="auto-volume-frequency" min="0.0001" step="0.0001" .value=${this.autoVolumeFrequencyHz > 0 ? this.autoVolumeFrequencyHz.toFixed(4) : ''} ?disabled=${!this.autoVolumeEnabled} @input=${this.handleAutoVolumeChange}>
          </div>
          <div class="input-group">
            <label for="auto-volume-interval">Интервал (мин)</label>
            <input type="number" id="auto-volume-interval" min="0.01" step="0.1" .value=${(this.autoVolumeFrequencyHz > 0 ? (1 / (this.autoVolumeFrequencyHz * 60)).toFixed(2) : '')} ?disabled=${!this.autoVolumeEnabled} @input=${this.handleAutoVolumeChange}>
          </div>
          <div class="input-group">
            <label for="auto-volume-min-level">Мин. уровень (%)</label>
            <input type="number" id="auto-volume-min-level" min="0" max="99" step="1" .value=${String(this.autoVolumeMinLevelPercent)} ?disabled=${!this.autoVolumeEnabled} @input=${this.handleAutoVolumeChange}>
          </div>
        </div>
      </div>
    `;
  }

  private renderStereoPhase() {
    const cfg = this._config;
    const phaseSliderTickMarks = [{label: '0°', percent: 0}, {label: '90°', percent: 25}, {label: '180°', percent: 50}, {label: '270°', percent: 75}, {label: '360°', percent: 100}];
    return html`
      ${this.renderSlider('stereoPhaseShiftAmount', 'Phase Shift (R Ch.)', 0, 1, 0.01, cfg.stereoPhaseShiftAmount, this.defaultConfig.stereoPhaseShiftAmount!, false, 2, (val) => `${(val * 360).toFixed(0)}°`, true, phaseSliderTickMarks)}
    `;
  }

  override render() {
    switch(this.currentView) {
      case 'main': return this.renderMainView();
      case 'music-controls': return this.renderSettingsPage('Music Controls', this.renderMusicControls());
      case 'model-mix': return this.renderSettingsPage('Model Mix', this.renderModelMix());
      case 'distortion': return this.renderSettingsPage('Distortion', this.renderDistortion());
      case 'chorus': return this.renderSettingsPage('Chorus', this.renderChorus());
      case 'echo': return this.renderSettingsPage('Echo (UI)', this.renderEcho());
      case 'reverb': return this.renderSettingsPage('Reverb (UI)', this.renderReverb());
      case 'flanger': return this.renderSettingsPage('Flanger', this.renderFlanger());
      case 'eq': return this.renderSettingsPage('Широкополосный EQ (1 Гц — 25 кГц)', this.renderEq());
      case 'compressor': return this.renderSettingsPage('Compressor', this.renderCompressor());
      case 'phaser': return this.renderSettingsPage('Phaser', this.renderPhaser());
      case 'tremolo': return this.renderSettingsPage('Tremolo', this.renderTremolo());
      case 'vinyl': return this.renderSettingsPage('Vinyl Player', this.renderVinyl());
      case 'auto-volume': return this.renderSettingsPage('Auto Volume', this.renderAutoVolume());
      case 'stereo-phase': return this.renderSettingsPage('Stereo Phase', this.renderStereoPhase());
      default: return this.renderMainView();
    }
  }
}