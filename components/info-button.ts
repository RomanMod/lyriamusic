/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {svg} from 'lit-html';
import {customElement} from 'lit/decorators.js';
import {IconButton} from './icon-button';

/** A button for showing information, wiki, or help. */
@customElement('info-button')
export class InfoButton extends IconButton {
  private renderInfoIcon() {
    return svg`
      <g transform="translate(47, 31) scale(1.9)">
        <!-- Info circle -->
        <circle cx="12" cy="12" r="10" stroke="#FEFEFE" stroke-width="2" fill="none" />
        <!-- Dot -->
        <circle cx="12" cy="7.5" r="1.25" fill="#FEFEFE" />
        <!-- Stem & Serif -->
        <path d="M12 11V16.5M10.5 11H12" stroke="#FEFEFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `;
  }

  override renderIcon() {
    return this.renderInfoIcon();
  }
}