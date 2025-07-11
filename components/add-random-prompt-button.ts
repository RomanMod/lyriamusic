/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {svg} from 'lit-html';
import {customElement} from 'lit/decorators.js';
import {IconButton} from './icon-button';

/** A button for adding a new prompt with random text. */
@customElement('add-random-prompt-button')
export class AddRandomPromptButton extends IconButton {
  private renderAddRandomIcon() {
    // Plus sign with three small dots (like a die) in the top-right quadrant
    return svg`
      <path d="M67 40 H73 V52 H85 V58 H73 V70 H67 V58 H55 V52 H67 Z" fill="#FEFEFE" />
      <circle cx="78" cy="45.5" r="2.5" fill="#FEFEFE"/>
      <circle cx="84" cy="45.5" r="2.5" fill="#FEFEFE"/>
      <circle cx="78" cy="39.5" r="2.5" fill="#FEFEFE"/>
    `;
  }

  override renderIcon() {
    return this.renderAddRandomIcon();
  }
}