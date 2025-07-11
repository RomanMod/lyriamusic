/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {svg} from 'lit-html';
import {customElement, property, query} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';
import type { Prompt } from '../core/types';
import './weight-slider'; // Ensure WeightSlider is imported if used
import type { WeightSlider } from './weight-slider';


/** A single prompt input */
@customElement('prompt-controller')
export class PromptController extends LitElement {
  static override styles = css`
    .prompt {
      position: relative;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-sizing: border-box;
      overflow: hidden;
      background-color: #2a2a2a;
      border-radius: 5px;
    }
    .action-buttons {
      position: absolute;
      top: 1.2vmin;
      left: 1.2vmin;
      right: 1.2vmin;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .remove-button {
      background: #666;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 2.8vmin;
      height: 2.8vmin;
      font-size: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s, background-color 0.2s;
      padding: 0;
    }
    .remove-button:hover {
      opacity: 1;
      background-color: #777;
    }
    .remove-button[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
      background-color: #555;
    }
    
    /* Styles for the lock button */
    .lock-button {
      background: #666;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 2.8vmin;
      height: 2.8vmin;
      font-size: 17px; /* Adjusted for icon */
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s, background-color 0.2s;
      padding: 0;
      flex-shrink: 0; /* Prevent lock button from shrinking */
    }
    .lock-button:hover {
      opacity: 1;
      background-color: #777;
    }
    .lock-button svg {
      width: 60%;
      height: 60%;
    }

    weight-slider {
      max-height: calc(100% - 19.5vmin); /* Adjusted: 4.5vmin top margin + 15vmin (controls + its margin) */
      flex: 1;
      min-height: 10vmin;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      margin-top: 4.5vmin; /* Adjusted: space for remove button */
      margin-bottom: 0; /* No margin needed before .controls */
    }
    .controls {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center; /* Center text now that lock is gone */
      width: 100%;
      height: 14vmin;
      padding: 0 1.2vmin;
      box-sizing: border-box;
      margin-bottom: 1vmin;
    }
    #text {
      font-family: 'Google Sans', sans-serif;
      font-size: 16px;
      flex-grow: 1; /* Allow text to take available space */
      height: auto; /* Adjust height based on content or line-height */
      max-height: 100%; /* Limit to parent's height */
      padding: 0.4vmin;
      box-sizing: border-box;
      text-align: center;
      word-wrap: break-word;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      touch-action: pan-y;
      border: none;
      outline: none;
      -webkit-font-smoothing: antialiased;
      color: #fff;
      background-color: transparent;
      scrollbar-width: thin;
      scrollbar-color: #666 #1a1a1a;
    }
    #text::-webkit-scrollbar {
      width: 6px;
    }
    #text::-webkit-scrollbar-track {
      background: #0009;
      border-radius: 3px;
    }
    #text::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 3px;
    }
    :host([filtered='true']) .prompt {
      outline: 2px solid #da2000;
      outline-offset: -2px;
    }
  `;

  @property({type: String, reflect: true}) promptId = '';
  @property({type: String}) text = '';
  @property({type: Number}) weight = 0;
  @property({type: String}) color = '';
  @property({type: Boolean, reflect: true}) filtered = false;
  @property({type: Boolean, reflect: true}) locked = false;


  @query('weight-slider') private weightInput!: WeightSlider;
  @query('#text') private textInput!: HTMLSpanElement;

  private handleTextKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.updateText();
      (e.target as HTMLElement).blur();
    }
  }

  private dispatchPromptChange() {
    this.dispatchEvent(
      new CustomEvent<Partial<Prompt>>('prompt-changed', {
        detail: {
          promptId: this.promptId,
          text: this.text,
          weight: this.weight,
        },
      }),
    );
  }

  private updateText() {
    const newText = this.textInput.textContent?.trim();
    if (newText === this.text) {
        return;
    }
    if (newText === '') {
      this.textInput.textContent = this.text;
      return;
    }
    this.text = newText ?? '';
    this.dispatchPromptChange();
  }

  private updateWeight() {
    this.weight = this.weightInput.value;
    this.dispatchPromptChange();
  }

  private dispatchPromptRemoved() {
    if (this.locked) return;

    this.dispatchEvent(
      new CustomEvent<string>('prompt-removed', {
        detail: this.promptId,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleLock() {
    this.locked = !this.locked;
    this.dispatchEvent(
      new CustomEvent<{promptId: string; locked: boolean}>('prompt-lock-toggled', {
        detail: {promptId: this.promptId, locked: this.locked},
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderLockedIcon() {
    return svg`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>`;
  }

  private renderUnlockedIcon() {
    return svg`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>`;
  }


  override render() {
    return html`<div class="prompt">
      <div class="action-buttons">
        <button 
          class="remove-button" 
          @click=${this.dispatchPromptRemoved} 
          aria-label="Remove prompt"
          title="Remove prompt"
          ?disabled=${this.locked}>
          ✕
        </button>
        <button 
          class="lock-button" 
          @click=${this.toggleLock} 
          aria-label=${this.locked ? "Unlock prompt" : "Lock prompt"}
          title=${this.locked ? "Unlock prompt" : "Lock prompt"}>
          ${this.locked ? this.renderLockedIcon() : this.renderUnlockedIcon()}
        </button>
      </div>
      <weight-slider
        id="weight"
        .value=${this.weight}
        .color=${this.color}
        @input=${this.updateWeight}></weight-slider>
      <div class="controls">
        <span
          id="text"
          role="textbox"
          aria-multiline="true"
          spellcheck="false"
          contenteditable="plaintext-only"
          @keydown=${this.handleTextKeyDown}
          @blur=${this.updateText}
          >${this.text}</span>
      </div>
    </div>`;
  }
}