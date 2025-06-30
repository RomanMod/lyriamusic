/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {svg} from 'lit-html';
import {customElement} from 'lit/decorators.js';
import {IconButton} from './icon-button';

/** A button for managing presets. */
@customElement('presets-button')
export class PresetsButton extends IconButton {
  private renderPresetsIcon() {
    // Icon representing a folder or collection for presets
    return svg`
      <path fill="#FEFEFE" d="M50 35 H90 V42 H50 Z M50 48 H90 V55 H50 Z M50 61 H90 V68 H50Z"/>
      <path fill="#FEFEFE" d="M45 30 Q40 30 40 35 V73 Q40 78 45 78 H95 Q100 78 100 73 V40 Q100 35 95 35 H70 L65 30 H45 Z" fill-opacity="0.3"/>

    `;
  }
  // A slightly different icon, more like a "save" or "archive" box
  // return svg`<path d="M50 40 H90 V75 H50 Z M45 35 H95 V40 H45 Z M60 30 H80 V35 H60Z" fill="#FEFEFE" />`;


  override renderIcon() {
    return this.renderPresetsIcon();
  }
}