/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';

@customElement('settings-modal')
export class SettingsModal extends LitElement {
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
      background-color: #2a2a2a; /* Same as settings controller */
      color: #eee;
      border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
      width: 95vw;
      max-width: 1200px;
      height: 90vh;
      overflow: hidden; /* No scroll on modal, handled by child */
      position: relative;
      transform: scale(0.95);
      transition: transform 0.3s ease;
      font-family: 'Google Sans', sans-serif;
      display: flex;
      flex-direction: column;
    }
    .modal-overlay.active .modal-content {
        transform: scale(1);
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
      z-index: 10;
    }
    .close-button:hover {
      background: #555;
    }
    .content-area {
      padding: 2vmin;
      padding-top: 6vmin; /* Add space for close button */
      flex-grow: 1;
      overflow: hidden; /* The settings controller inside will handle its own scrolling if any */
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
      <div class=${classes} @click=${this.handleOverlayClick} role="dialog" aria-modal="true" ?hidden=${!this.active}>
        <div class="modal-content">
          <button class="close-button" @click=${this.close} aria-label="Close settings">✕</button>
          <div class="content-area">
             <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}
