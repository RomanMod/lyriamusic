/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';

@customElement('toast-message')
export class ToastMessage extends LitElement {
  static override styles = css`
    .toast {
      line-height: 1.6;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #000;
      color: white;
      padding: 15px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      min-width: 200px;
      max-width: 80vw;
      transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
      z-index: 1100; /* Ensure toast is above other elements including modal backdrop */
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    button {
      border-radius: 100px;
      width: 24px;
      height: 24px;
      border: none;
      background-color: #333;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      padding:0;
    }
    button:hover {
      background-color: #555;
    }
    .toast:not(.showing) {
      transition-duration: 1s;
      transform: translate(-50%, -200%);
    }
  `;

  @property({type: String}) message = '';
  @property({type: Boolean}) showing = false;

  private timeoutId?: number;

  override render() {
    return html`<div class=${classMap({showing: this.showing, toast: true})} role="alert" aria-live="assertive">
      <div class="message">${this.message}</div>
      <button @click=${this.hide} aria-label="Dismiss message">✕</button>
    </div>`;
  }

  show(message: string, duration: number = 4000) {
    this.message = message;
    this.showing = true;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (duration > 0) {
     this.timeoutId = window.setTimeout(() => this.hide(), duration);
    }
  }

  hide() {
    this.showing = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}