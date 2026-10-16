/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import {styleMap} from 'lit-html/directives/style-map.js';

/** A slider for adjusting and visualizing prompt weight with smart gesture differentiation. */
@customElement('weight-slider')
export class WeightSlider extends LitElement {
  static override styles = css`
    :host {
      cursor: ns-resize;
      position: relative;
      height: 100%;
      display: flex;
      justify-content: center;
      flex-direction: column;
      align-items: center;
      padding: 5px;
      touch-action: pan-x;
      user-select: none;
      -webkit-user-select: none;
    }
    .scroll-container {
      width: 100%;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      touch-action: pan-x;
      padding: 4px 0;
    }
    .value-display {
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #9ca3af;
      margin: 0.8vmin 0 0.2vmin 0;
      user-select: none;
      text-align: center;
      letter-spacing: 0.4px;
      transition: color 0.2s ease, text-shadow 0.2s ease;
    }
    :host(:hover) .value-display,
    .scroll-container.is-active .value-display {
      color: #2af6de;
      text-shadow: 0 0 8px rgba(42, 246, 222, 0.5);
    }
    .slider-track-wrapper {
      position: relative;
      width: 36px;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: ns-resize;
      touch-action: pan-x;
    }
    .slider-container {
      position: relative;
      width: 12px;
      height: 100%;
      background: rgba(10, 12, 18, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    :host(:hover) .slider-container,
    .scroll-container.is-active .slider-container {
      border-color: rgba(42, 246, 222, 0.4);
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8), 0 0 8px rgba(42, 246, 222, 0.2);
    }
    #thumb {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      border-radius: 5px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
      transition: filter 0.15s ease;
    }
    .scroll-container.is-active #thumb {
      filter: brightness(1.2);
      box-shadow: 0 0 10px rgba(42, 246, 222, 0.6);
    }
  `;

  @property({type: Number}) value = 0; // Range 0-2
  @property({type: String}) color = '#000';

  @state() private isDragging = false;
  @query('.slider-track-wrapper') private sliderTrackWrapper!: HTMLDivElement;

  private startClientX = 0;
  private startClientY = 0;
  private startValue = 0;
  private gestureDecided = false;
  private isVerticalDrag = false;
  private activePointerId: number | null = null;
  private containerBounds: DOMRect | null = null;

  constructor() {
    super();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  private handlePointerDown(e: PointerEvent) {
    // Only respond to primary button (left mouse click or touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.activePointerId = e.pointerId;
    this.startClientX = e.clientX;
    this.startClientY = e.clientY;
    this.startValue = this.value;
    this.containerBounds = (this.sliderTrackWrapper || this).getBoundingClientRect();
    this.gestureDecided = false;
    this.isVerticalDrag = false;

    // For mouse, immediately start vertical drag
    if (e.pointerType === 'mouse') {
      e.preventDefault();
      this.gestureDecided = true;
      this.isVerticalDrag = true;
      this.isDragging = true;
      document.body.classList.add('dragging');
      this.updateValueFromPosition(e.clientY);
    }

    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerCancel);
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    const dx = Math.abs(e.clientX - this.startClientX);
    const dy = Math.abs(e.clientY - this.startClientY);

    if (!this.gestureDecided) {
      const THRESHOLD = 7;
      if (dx > THRESHOLD || dy > THRESHOLD) {
        this.gestureDecided = true;
        if (dx > dy) {
          // Horizontal swipe detected: cancel slider interaction so container scrolls horizontally
          this.isVerticalDrag = false;
          this.cleanupListeners();
          return;
        } else {
          // Vertical movement detected: user wants to adjust this fader
          this.isVerticalDrag = true;
          this.isDragging = true;
          document.body.classList.add('dragging');
        }
      } else {
        // Still below threshold, wait
        return;
      }
    }

    if (this.isVerticalDrag) {
      e.preventDefault();
      this.updateValueFromPosition(e.clientY);
    }
  }

  private handlePointerUp(e: PointerEvent) {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    // If it was a tap without significant movement (click on the fader)
    if (!this.gestureDecided && this.containerBounds) {
      const dx = Math.abs(e.clientX - this.startClientX);
      const dy = Math.abs(e.clientY - this.startClientY);
      if (dx < 6 && dy < 6) {
        // Intentional tap to set value
        this.updateValueFromPosition(e.clientY);
      }
    }

    this.cleanupListeners();
  }

  private handlePointerCancel() {
    this.cleanupListeners();
  }

  private cleanupListeners() {
    this.isDragging = false;
    this.gestureDecided = false;
    this.isVerticalDrag = false;
    this.activePointerId = null;
    this.containerBounds = null;
    document.body.classList.remove('dragging');
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerCancel);
  }

  private handleWheel(e: WheelEvent) {
    // If user holds Alt or Ctrl, adjust this slider with fine precision
    if (e.altKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY;
      this.value = Math.max(0, Math.min(2, this.value + delta * -0.005));
      this.dispatchInputEvent();
      return;
    }

    // Otherwise, DO NOT prevent default and do not stop propagation:
    // Let the wheel event bubble up to #prompts-container to smoothly scroll channels horizontally!
  }

  private updateValueFromPosition(clientY: number) {
    if (!this.containerBounds) {
      this.containerBounds = (this.sliderTrackWrapper || this).getBoundingClientRect();
    }
    if (!this.containerBounds || this.containerBounds.height === 0) return;

    const trackHeight = this.containerBounds.height;
    const relativeY = clientY - this.containerBounds.top;
    // Invert and normalize (0 at bottom, 1 at top)
    const normalizedValue = 1 - Math.max(0, Math.min(trackHeight, relativeY)) / trackHeight;
    // Scale to 0-2 range
    this.value = Math.round(normalizedValue * 200) / 100; // Round to 2 decimal places

    this.dispatchInputEvent();
  }

  private dispatchInputEvent() {
    this.dispatchEvent(new CustomEvent<number>('input', {detail: this.value}));
  }

  override render() {
    const thumbHeightPercent = (this.value / 2) * 100;
    const thumbStyle = styleMap({
      height: `${thumbHeightPercent}%`,
      backgroundColor: this.color,
      display: this.value > 0.01 ? 'block' : 'none',
    });
    const displayValue = this.value.toFixed(2);

    return html`
      <div
        class="scroll-container ${this.isDragging ? 'is-active' : ''}"
        @wheel=${this.handleWheel}>
        <div
          class="slider-track-wrapper"
          @pointerdown=${this.handlePointerDown}>
          <div class="slider-container">
            <div id="thumb" style=${thumbStyle}></div>
          </div>
        </div>
        <div class="value-display">${displayValue}</div>
      </div>
    `;
  }
}