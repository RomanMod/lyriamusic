/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';

@customElement('info-modal')
export class InfoModal extends LitElement {
  static override styles = css`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0s linear 0.3s;
    }
    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease, visibility 0s linear 0s;
    }
    .modal-content {
      background-color: #222; /* Darker background for modal */
      color: #eee;
      padding: 2vmin 3vmin 3vmin 3vmin;
      border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
      width: 90vw;
      max-width: 800px;
      max-height: 85vh;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      touch-action: pan-y;
      position: relative;
      transform: scale(0.95);
      transition: transform 0.3s ease;
      font-family: 'Google Sans', sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #666 #333;
    }
    .modal-overlay.active .modal-content {
        transform: scale(1);
    }
    .modal-content::-webkit-scrollbar {
      width: 8px;
    }
    .modal-content::-webkit-scrollbar-track {
      background: #333;
      border-radius: 4px;
    }
    .modal-content::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 4px;
    }
    .close-button {
      position: absolute;
      top: 1.5vmin;
      right: 1.5vmin;
      background: #444;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 3.5vmin;
      height: 3.5vmin;
      min-width: 30px; /* ensure minimum size */
      min-height: 30px;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    .close-button:hover {
      background: #555;
    }
    h2 {
      margin-top: 0;
      color: #fff;
      font-size: 24px;
      border-bottom: 1px solid #444;
      padding-bottom: 1vmin;
      margin-bottom: 2vmin;
    }
    section {
      margin-bottom: 2.5vmin;
    }
    section h3 {
      font-size: 20px;
      color: #ddd;
      margin-bottom: 0.8vmin;
    }
    p {
      font-size: clamp(16px, 1.8vmin, 22px);
      line-height: 1.6;
      color: #ccc;
      margin-top: 0;
      margin-bottom: 0.8vmin;
    }
    strong {
        color: #eee;
    }
  `;

  @property({type: Boolean, reflect: true}) active = false;

  private boundHandleKeydown = this.handleKeydown.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.boundHandleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.boundHandleKeydown);
  }

  private handleKeydown(event: KeyboardEvent) {
    if (this.active && event.key === 'Escape') {
      this.close();
    }
  }

  private close() {
    this.active = false;
    this.dispatchEvent(new CustomEvent('closed', {bubbles: true, composed: true}));
  }

  private handleOverlayClick(e: MouseEvent) {
    // Close if the click is directly on the overlay, not on its children (modal-content)
    if (e.target === this.shadowRoot?.querySelector('.modal-overlay')) {
      this.close();
    }
  }


  override render() {
    const classes = classMap({
      'modal-overlay': true,
      'active': this.active,
    });

    return html`
      <div class=${classes} @click=${this.handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="modal-title" ?hidden=${!this.active}>
        <div class="modal-content">
          <button class="close-button" @click=${this.close} aria-label="Close modal">✕</button>
          <slot></slot>
        </div>
      </div>
    `;
  }
}