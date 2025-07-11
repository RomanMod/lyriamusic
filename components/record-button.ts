/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css} from 'lit';
import {svg} from 'lit-html';
import {customElement, property} from 'lit/decorators.js';
import {IconButton} from './icon-button';

@customElement('record-button')
export class RecordButton extends IconButton {
  @property({type: Boolean, reflect: true}) recording = false;

  static override styles = [
    IconButton.styles,
    css`
      :host([recording]) svg {
        animation: pulseRecord 1.2s infinite ease-in-out;
        /* Ensure the animation origin is center for the SVG element itself */
        transform-origin: center; 
        transform-box: fill-box;
      }
      @keyframes pulseRecord {
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

  // Record icon: A red circle
  private renderRecordIcon() {
    return svg`<circle cx="70" cy="54" r="18" fill="#E74C3C" />`;
  }

  // Stop icon: A red square
  private renderStopIcon() {
    return svg`<rect x="56" y="40" width="28" height="28" rx="3" fill="#E74C3C" />`;
  }

  override renderIcon() {
    if (this.recording) {
      return this.renderStopIcon();
    } else {
      return this.renderRecordIcon();
    }
  }
}