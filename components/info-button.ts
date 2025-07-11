/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {svg} from 'lit-html';
import {customElement} from 'lit/decorators.js';
import {IconButton} from './icon-button';

/** A button for showing information or help. */
@customElement('info-button')
export class InfoButton extends IconButton {
  private renderInfoIcon() {
    // A simple question mark icon
    return svg`
      <path d="M70 35 Q 60 35, 60 45 Q 60 55, 70 55 Q 80 55, 80 45 Q 80 35, 70 35 M 70 58 L 70 65" 
            stroke="#FEFEFE" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="70" cy="72" r="3" fill="#FEFEFE" />
    `;
  }

  override renderIcon() {
    return this.renderInfoIcon();
  }
}