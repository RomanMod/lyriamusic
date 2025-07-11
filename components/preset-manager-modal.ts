/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';
import type { Preset } from '../core/types';

@customElement('preset-manager-modal')
export class PresetManagerModal extends LitElement {
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
      z-index: 1050; /* Ensure it's above toast but below other critical popups if any */
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
      background-color: #2c2c2c; /* Slightly lighter than info modal for differentiation */
      color: #eee;
      padding: 2.5vmin;
      border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.6);
      width: 90vw;
      max-width: 600px; /* Max width for preset manager */
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      position: relative;
      transform: scale(0.95);
      transition: transform 0.3s ease;
      font-family: 'Google Sans', sans-serif;
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
      min-width: 30px;
      min-height: 30px;
      font-size: 2vmin;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      z-index: 1; /* Ensure close button is above content */
    }
    .close-button:hover {
      background: #555;
    }
    h2 {
      margin-top: 0;
      color: #fff;
      font-size: 24px;
      border-bottom: 1px solid #444;
      padding-bottom: 1vmin;
      margin-bottom: 2vmin;
      text-align: center;
    }
    
    .action-section { /* Renamed from save-section for clarity */
      margin-bottom: 2vmin;
      padding-bottom: 2vmin;
      border-bottom: 1px solid #444;
    }
    .action-section input[type="text"] {
      width: 100%;
      padding: 1vmin;
      margin-bottom: 1.5vmin;
      background-color: #333;
      color: #eee;
      border: 1px solid #555;
      border-radius: 4px;
      font-size: 20px;
      box-sizing: border-box;
    }
    .action-section input[type="text"]::placeholder {
      color: #888;
    }
    .action-section button {
      width: 100%;
      padding: 1.2vmin;
      background-color: #5200ff; /* Primary action color */
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 20px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .action-section button:hover {
      background-color: #6a1fff;
    }
    .action-section button:disabled {
      background-color: #555;
      cursor: not-allowed;
    }
    .import-button { /* Style for the new import button */
        background-color: #007bff !important; /* Blue for import */
        margin-top: 1vmin;
    }
    .import-button:hover {
        background-color: #0056b3 !important;
    }


    .presets-list-container {
      flex-grow: 1;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      touch-action: pan-y;
      scrollbar-width: thin;
      scrollbar-color: #666 #333;
      margin:0 -1vmin; 
      padding: 0 1vmin;
    }
    .presets-list-container::-webkit-scrollbar {
      width: 8px;
    }
    .presets-list-container::-webkit-scrollbar-track {
      background: #333;
      border-radius: 4px;
    }
    .presets-list-container::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 4px;
    }
    .preset-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5vmin 1vmin;
      border-bottom: 1px solid #3a3a3a;
      font-size: 20px;
    }
    .preset-item:last-child {
      border-bottom: none;
    }
    .preset-name {
      flex-grow: 1;
      margin-right: 1vmin;
      word-break: break-all;
    }
    .preset-actions button {
      background: none;
      border: 1px solid #666;
      color: #ccc;
      padding: 0.8vmin 1.2vmin;
      margin-left: 0.8vmin; /* Slightly reduced margin */
      border-radius: 4px;
      cursor: pointer;
      font-size: 17px;
      transition: background-color 0.2s, border-color 0.2s, color 0.2s;
    }
    .preset-actions button.load-button:hover {
      background-color: #4CAF50; 
      border-color: #4CAF50;
      color: white;
    }
    .preset-actions button.export-button:hover { /* New style for export */
      background-color: #FF9800; /* Orange for export */
      border-color: #FF9800;
      color: white;
    }
    .preset-actions button.delete-button:hover {
      background-color: #F44336; 
      border-color: #F44336;
      color: white;
    }
    .no-presets {
      text-align: center;
      color: #888;
      font-size: 20px;
      margin-top: 2vmin;
    }
  `;

  @property({type: Boolean, reflect: true}) active = false;
  @property({type: Object}) presets: Map<string, Preset> = new Map();
  @state() private newPresetName = '';

  private fileInputRef: HTMLInputElement | null = null;

  private boundHandleKeydown = this.handleKeydown.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.boundHandleKeydown);
    // Create a file input element that will be used for import
    this.fileInputRef = document.createElement('input');
    this.fileInputRef.type = 'file';
    this.fileInputRef.accept = '.json,application/json';
    this.fileInputRef.style.display = 'none';
    this.fileInputRef.addEventListener('change', this.handleFileSelected.bind(this));
    this.shadowRoot?.appendChild(this.fileInputRef); // Append to shadow DOM or document body
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.boundHandleKeydown);
    if (this.fileInputRef) {
      this.fileInputRef.removeEventListener('change', this.handleFileSelected.bind(this));
      this.fileInputRef.remove();
      this.fileInputRef = null;
    }
  }

  private handleKeydown(event: KeyboardEvent) {
    if (this.active && event.key === 'Escape') {
      this.close();
    }
    if (this.active && event.key === 'Enter' && this.newPresetName.trim() !== '') {
        if (this.shadowRoot?.activeElement === this.shadowRoot?.getElementById('newPresetNameInput')) {
            this.handleSavePreset();
        }
    }
  }

  private close() {
    this.active = false;
    this.newPresetName = ''; // Reset input on close
    this.dispatchEvent(new CustomEvent('closed', {bubbles: true, composed: true}));
  }

  private handleOverlayClick(e: MouseEvent) {
    if (e.target === this.shadowRoot?.querySelector('.modal-overlay')) {
      this.close();
    }
  }

  private handleNameInput(e: Event) {
    this.newPresetName = (e.target as HTMLInputElement).value;
  }

  private handleSavePreset() {
    const name = this.newPresetName.trim();
    if (name) {
      this.dispatchEvent(new CustomEvent('save-preset', {
        detail: { name },
        bubbles: true,
        composed: true
      }));
      this.newPresetName = ''; // Clear input after saving
    }
  }

  private handleLoadPreset(presetId: string) {
    this.dispatchEvent(new CustomEvent('load-preset', {
      detail: { presetId },
      bubbles: true,
      composed: true
    }));
  }

  private handleExportPreset(presetId: string) {
    this.dispatchEvent(new CustomEvent('export-preset', {
      detail: { presetId },
      bubbles: true,
      composed: true
    }));
  }

  private handleDeletePreset(presetId: string) {
    this.dispatchEvent(new CustomEvent('delete-preset', {
      detail: { presetId },
      bubbles: true,
      composed: true
    }));
  }

  private handleImportButtonClick() {
    if (this.fileInputRef) {
      this.fileInputRef.click(); // Trigger file selection dialog
    }
  }

  private handleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          const presetsData = JSON.parse(fileContent);
          this.dispatchEvent(new CustomEvent('import-presets', {
            detail: { presetsData },
            bubbles: true,
            composed: true
          }));
        } catch (error) {
          console.error('Error parsing preset file:', error);
          // Optionally dispatch an error event or show a message
          this.dispatchEvent(new CustomEvent('import-error', {
            detail: { message: 'Invalid JSON file or format.' },
            bubbles: true,
            composed: true
          }));
        }
      };
      reader.onerror = () => {
        this.dispatchEvent(new CustomEvent('import-error', {
            detail: { message: 'Could not read the preset file.' },
            bubbles: true,
            composed: true
          }));
      };
      reader.readAsText(file);
      input.value = ''; // Reset file input to allow selecting the same file again
    }
  }


  override render() {
    const classes = classMap({'modal-overlay': true, active: this.active});
    const sortedPresets = [...this.presets.values()].sort((a, b) => a.name.localeCompare(b.name));

    return html`
      <div class=${classes} @click=${this.handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="preset-manager-title" ?hidden=${!this.active}>
        <div class="modal-content">
          <button class="close-button" @click=${this.close} aria-label="Close preset manager">✕</button>
          <h2 id="preset-manager-title">Manage Presets</h2>

          <div class="action-section">
            <input 
              id="newPresetNameInput"
              type="text" 
              .value=${this.newPresetName} 
              @input=${this.handleNameInput} 
              placeholder="Enter new preset name"
              aria-label="New preset name"
            />
            <button 
              @click=${this.handleSavePreset} 
              ?disabled=${this.newPresetName.trim() === ''}
              aria-label="Save current state as new preset"
            >
              Save Current State
            </button>
            <button 
              class="import-button"
              @click=${this.handleImportButtonClick}
              aria-label="Import presets from a JSON file"
            >
              Import Presets from File
            </button>
          </div>

          <div class="presets-list-container" role="list">
            ${sortedPresets.length === 0 ? html`
              <p class="no-presets">No presets saved yet.</p>
            ` : sortedPresets.map(preset => html`
              <div class="preset-item" role="listitem">
                <span class="preset-name">${preset.name}</span>
                <div class="preset-actions">
                  <button class="load-button" @click=${() => this.handleLoadPreset(preset.id)} aria-label="Load preset ${preset.name}">Load</button>
                  <button class="export-button" @click=${() => this.handleExportPreset(preset.id)} aria-label="Export preset ${preset.name}">Export</button>
                  <button class="delete-button" @click=${() => this.handleDeletePreset(preset.id)} aria-label="Delete preset ${preset.name}">Delete</button>
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}