/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css } from 'lit';
import { svg } from 'lit-html';
import { customElement, property } from 'lit/decorators.js';
import { IconButton } from './icon-button';

@customElement('mic-sync-button')
export class MicSyncButton extends IconButton {
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: Boolean, reflect: true }) listening = false;

  static override styles = [
    IconButton.styles,
    css`
      :host([listening]) svg {
        animation: pulseMic 1.1s infinite ease-in-out;
        transform-origin: center;
        transform-box: fill-box;
      }
      @keyframes pulseMic {
        0% {
          transform: scale(1);
          filter: drop-shadow(0 0 2px rgba(42, 246, 222, 0.4));
        }
        50% {
          transform: scale(1.08);
          filter: drop-shadow(0 0 10px rgba(42, 246, 222, 0.8));
        }
        100% {
          transform: scale(1);
          filter: drop-shadow(0 0 2px rgba(42, 246, 222, 0.4));
        }
      }
    `,
  ];

  override renderIcon() {
    const micColor = this.listening ? '#2af6de' : this.active ? '#3dffab' : '#FEFEFE';

    return svg`
      <g transform="translate(48, 30) scale(1.8)">
        <!-- Microphone body -->
        <rect x="9" y="3" width="6" height="12" rx="3" fill="${micColor}" />
        <!-- Microphone stand / arc -->
        <path
          d="M5 10C5 14.4183 8.58172 18 13 18C17.4183 18 21 14.4183 21 10"
          stroke="${micColor}"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
        <!-- Center stem -->
        <path
          d="M13 18V22"
          stroke="${micColor}"
          stroke-width="2"
          stroke-linecap="round"
        />
        <!-- Base stand -->
        <path
          d="M9 22H17"
          stroke="${micColor}"
          stroke-width="2"
          stroke-linecap="round"
        />
      </g>
    `;
  }
}
