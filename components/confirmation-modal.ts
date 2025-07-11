/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';

@customElement('confirmation-modal')
export class ConfirmationModal extends LitElement {
  static override styles = css`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.75); /* Slightly darker overlay for confirmation */
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100; /* Ensure it's above other modals like preset manager */
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
      background-color: #333; /* Dark background for confirmation */
      color: #eee;
      padding: 3vmin;
      border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.6);
      width: 90vw;
      max-width: 450px; /* Smaller max width for a confirmation dialog */
      text-align: center;
      position: relative;
      transform: scale(0.95);
      transition: transform 0.3s ease;
      font-family: 'Google Sans', sans-serif;
    }
    .modal-overlay.active .modal-content {
        transform: scale(1);
    }
    .message {
      font-size: 22px;
      line-height: 1.6;
      margin-bottom: 3vmin;
      white-space: pre-wrap; /* Preserve newlines in message if any */
    }
    .buttons {
      display: flex;
      justify-content: space-around; /* Spread out buttons */
      gap: 2vmin;
    }
    .buttons button {
      flex-grow: 1;
      padding: 1.2vmin 1.5vmin;
      border: none;
      border-radius: 5px;
      font-size: 20px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s, box-shadow 0.2s;
    }
    .confirm-button {
      background-color: #e74c3c; /* Red for destructive actions */
      color: white;
    }
    .confirm-button:hover {
      background-color: #c0392b;
      box-shadow: 0 2px 8px rgba(231, 76, 60, 0.4);
    }
    .cancel-button {
      background-color: #555;
      color: #eee;
    }
    .cancel-button:hover {
      background-color: #666;
    }
  `;

  @property({type: Boolean, reflect: true}) active = false;
  @property({type: String}) message = 'Вы уверены?';
  @property({type: String}) confirmText = 'Подтвердить';
  @property({type: String}) cancelText = 'Отмена';

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
      this._dispatchCancelled();
    }
    if (this.active && event.key === 'Enter') {
      // Assuming Enter confirms, a common pattern
      this._dispatchConfirmed();
    }
  }

  private _dispatchConfirmed() {
    this.dispatchEvent(new CustomEvent('confirmed', {bubbles: true, composed: true}));
    this.active = false; // Usually close on action
  }

  private _dispatchCancelled() {
    this.dispatchEvent(new CustomEvent('cancelled', {bubbles: true, composed: true}));
    this.active = false; // Usually close on action
  }

  private handleOverlayClick(e: MouseEvent) {
    if (e.target === this.shadowRoot?.querySelector('.modal-overlay')) {
      this._dispatchCancelled();
    }
  }

  override render() {
    const classes = classMap({'modal-overlay': true, active: this.active});

    return html`
      <div class=${classes} @click=${this.handleOverlayClick} role="alertdialog" aria-modal="true" aria-labelledby="confirmation-message" ?hidden=${!this.active}>
        <div class="modal-content">
          <div id="confirmation-message" class="message">${this.message}</div>
          <div class="buttons">
            <button class="cancel-button" @click=${this._dispatchCancelled} aria-label=${this.cancelText}>
              ${this.cancelText}
            </button>
            <button class="confirm-button" @click=${this._dispatchConfirmed} aria-label=${this.confirmText}>
              ${this.confirmText}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}