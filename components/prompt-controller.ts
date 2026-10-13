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
      background: linear-gradient(180deg, #24252c 0%, #1a1b20 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .prompt:hover {
      border-color: rgba(255, 255, 255, 0.16);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    }
    .action-buttons {
      position: absolute;
      top: 1vmin;
      left: 1vmin;
      right: 1vmin;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .remove-button {
      background: rgba(255, 255, 255, 0.08);
      color: #bbb;
      border: none;
      border-radius: 50%;
      width: clamp(20px, 3.2vmin, 26px);
      height: clamp(20px, 3.2vmin, 26px);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.2s ease;
      padding: 0;
    }
    .remove-button:hover {
      opacity: 1;
      background: rgba(231, 76, 60, 0.3);
      color: #fff;
    }
    .remove-button[disabled] {
      opacity: 0.25;
      cursor: not-allowed;
      background: transparent;
    }
    
    /* Styles for the lock button */
    .lock-button {
      background: rgba(255, 255, 255, 0.08);
      color: #bbb;
      border: none;
      border-radius: 50%;
      width: clamp(20px, 3.2vmin, 26px);
      height: clamp(20px, 3.2vmin, 26px);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.2s ease;
      padding: 0;
      flex-shrink: 0;
    }
    .lock-button:hover {
      opacity: 1;
      background: rgba(42, 246, 222, 0.25);
      color: #2af6de;
    }
    .lock-button svg {
      width: 58%;
      height: 58%;
    }

    weight-slider {
      max-height: calc(100% - 17vmin);
      flex: 1;
      min-height: 10vmin;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      margin-top: 4vmin;
      margin-bottom: 0;
    }
    .controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 9vmin;
      max-height: 14vmin;
      padding: 0.5vmin 1vmin;
      box-sizing: border-box;
      margin-bottom: 0.8vmin;
    }
    #text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Google Sans', sans-serif;
      font-size: clamp(12px, 1.8vmin, 14.5px);
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.2px;
      width: 100%;
      max-height: 100%;
      box-sizing: border-box;
      text-align: center;
      word-break: normal;
      overflow-wrap: break-word;
      overflow-y: auto;
      scrollbar-width: none; /* No ugly scrollbars */
      -ms-overflow-style: none;
      border: none;
      outline: none;
      -webkit-font-smoothing: antialiased;
      color: #eee;
      background-color: transparent;
      padding: 4px 6px;
      border-radius: 6px;
      cursor: text;
      transition: all 0.2s ease;
    }
    #text::-webkit-scrollbar {
      display: none; /* Completely hide webkit scrollbars */
      width: 0;
      height: 0;
    }
    #text:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    #text:focus {
      background-color: rgba(255, 255, 255, 0.08);
      color: #fff;
      box-shadow: 0 0 0 1.5px rgba(42, 246, 222, 0.5);
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