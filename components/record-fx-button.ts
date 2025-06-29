/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css} from 'lit';
import {svg} from 'lit-html';
import {customElement, property} from 'lit/decorators.js';
import {IconButton} from './icon-button';

@customElement('record-fx-button')
export class RecordFxButton extends IconButton {
  @property({type: Boolean, reflect: true}) recording = false;

  static override styles = [
    IconButton.styles,
    css`
      :host([recording]) svg {
        animation: pulseRecordFx 1.2s infinite ease-in-out;
        transform-origin: center; 
        transform-box: fill-box;
      }
      @keyframes pulseRecordFx {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05); /* Slightly larger pulse */
        }
        100% {
          transform: scale(1);
        }
      }
    `,
  ];

  // Record icon: A blue circle
  private renderRecordIcon() {
    return svg`<circle cx="70" cy="54" r="18" fill="#2196F3" />`; // Blue color
  }

  // Stop icon: A blue square
  private renderStopIcon() {
    return svg`<rect x="56" y="40" width="28" height="28" rx="3" fill="#2196F3" />`; // Blue color
  }

  override renderIcon() {
    if (this.recording) {
      return this.renderStopIcon();
    } else {
      return this.renderRecordIcon();
    }
  }
}