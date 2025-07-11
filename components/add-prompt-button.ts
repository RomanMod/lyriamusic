/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {svg} from 'lit-html';
import {customElement} from 'lit/decorators.js';
import {IconButton} from './icon-button';

/** A button for adding a new prompt. */
@customElement('add-prompt-button')
export class AddPromptButton extends IconButton {
  private renderAddIcon() {
    return svg`<path d="M67 40 H73 V52 H85 V58 H73 V70 H67 V58 H55 V52 H67 Z" fill="#FEFEFE" />`;
  }

  override renderIcon() {
    return this.renderAddIcon();
  }
}