/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html } from 'lit';
import { svg } from 'lit-html';
import { customElement, property, state } from 'lit/decorators.js';
import { IconButton } from './icon-button';

@customElement('volume-button')
export class VolumeButton extends IconButton {
  @property({ type: Number }) volume = 1;
  @property({ type: Boolean }) isMuted = false;
  @state() private isPopupOpen = false;

  private closeTimeout: number | null = null;

  static override styles = [
    IconButton.styles,
    css`
      :host {
        position: relative;
      }
      .volume-popover {
        position: absolute;
        bottom: calc(100% + 14px);
        left: 50%;
        transform: translateX(-50%) translateY(8px) scale(0.95);
        background: rgba(18, 19, 26, 0.94);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 12px 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(42, 246, 222, 0.15);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s;
        z-index: 100;
        width: 38px;
      }
      .volume-popover.open {
        opacity: 1;
        visibility: visible;
        pointer-events: all;
        transform: translateX(-50%) translateY(0) scale(1);
        transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0s;
      }
      .volume-popover::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 6px 6px 0 6px;
        border-style: solid;
        border-color: rgba(18, 19, 26, 0.94) transparent transparent transparent;
      }
      .volume-val {
        font-size: 11px;
        font-weight: 700;
        color: #2af6de;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        letter-spacing: 0.5px;
      }
      .slider-track-wrap {
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .popover-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 90px;
        height: 5px;
        transform: rotate(-90deg);
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        margin: 0;
      }
      .popover-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #2af6de;
        box-shadow: 0 0 6px rgba(42, 246, 222, 0.8);
        cursor: pointer;
      }
      .popover-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #2af6de;
        box-shadow: 0 0 6px rgba(42, 246, 222, 0.8);
        cursor: pointer;
        border: none;
      }
    `,
  ];

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);
    this.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('click', this.handleWindowClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('mouseenter', this.handleMouseEnter);
    this.removeEventListener('mouseleave', this.handleMouseLeave);
    this.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('click', this.handleWindowClick);
  }

  private handleMouseEnter = () => {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isPopupOpen = true;
  };

  private handleMouseLeave = () => {
    this.closeTimeout = window.setTimeout(() => {
      this.isPopupOpen = false;
    }, 450);
  };

  private handleWindowClick = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) {
      this.isPopupOpen = false;
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, this.volume + delta));
    this.dispatchVolume(newVol);
  };

  private handleSliderInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.dispatchVolume(val);
  };

  private toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    this.isPopupOpen = !this.isPopupOpen;
    this.dispatchEvent(new CustomEvent('volume-mute-toggle', { bubbles: true, composed: true }));
  };

  private dispatchVolume(val: number) {
    this.volume = val;
    this.dispatchEvent(
      new CustomEvent('volume-change', {
        detail: { volume: val },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected override renderIcon() {
    const isMuted = this.isMuted || this.volume === 0;
    const isHigh = this.volume > 0.5;

    return svg`
      <g transform="translate(48, 32) scale(1.8)">
        <!-- Speaker body -->
        <path d="M4 9v6h4l5 5V4L8 9H4z" fill="#FEFEFE" />
        
        ${isMuted
          ? svg`
            <!-- Mute cross -->
            <line x1="16" y1="9" x2="22" y2="15" stroke="#ff4757" stroke-width="2.2" stroke-linecap="round" />
            <line x1="22" y1="9" x2="16" y2="15" stroke="#ff4757" stroke-width="2.2" stroke-linecap="round" />
          `
          : svg`
            <!-- Sound wave 1 -->
            <path d="M16 8.5c1 1 1.5 2.2 1.5 3.5s-.5 2.5-1.5 3.5" stroke="#2af6de" stroke-width="2" stroke-linecap="round" fill="none" />
            <!-- Sound wave 2 -->
            ${isHigh ? svg`<path d="M19 6c2 1.7 3 3.8 3 6s-1 4.3-3 6" stroke="#2af6de" stroke-width="2" stroke-linecap="round" fill="none" />` : ''}
          `}
      </g>
    `;
  }

  override render() {
    const displayVol = this.isMuted ? 0 : this.volume;

    return html`
      <svg
        width="140"
        height="140"
        viewBox="0 -10 140 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <rect
          x="22"
          y="6"
          width="96"
          height="96"
          rx="48"
          fill="black"
          fill-opacity="0.05" />
        <rect
          x="23.5"
          y="7.5"
          width="93"
          height="93"
          rx="46.5"
          stroke="black"
          stroke-opacity="0.3"
          stroke-width="3" />
        <g filter="url(#filter0_ddi_1048_7373)">
          <rect
            x="25"
            y="9"
            width="90"
            height="90"
            rx="45"
            fill="white"
            fill-opacity="0.05"
            shape-rendering="crispEdges" />
        </g>
        ${this.renderIcon()}
        <defs>
          <filter
            id="filter0_ddi_1048_7373"
            x="0"
            y="0"
            width="140"
            height="140"
            filterUnits="userSpaceOnUse"
            color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha" />
            <feOffset dy="2" />
            <feGaussianBlur stdDeviation="4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_1048_7373" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha" />
            <feOffset dy="16" />
            <feGaussianBlur stdDeviation="12.5" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend
              mode="normal"
              in2="effect1_dropShadow_1048_7373"
              result="effect2_dropShadow_1048_7373" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect2_dropShadow_1048_7373"
              result="shape" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha" />
            <feOffset dy="3" />
            <feGaussianBlur stdDeviation="1.5" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0" />
            <feBlend
              mode="normal"
              in2="shape"
              result="effect3_innerShadow_1048_7373" />
          </filter>
        </defs>
      </svg>
      <div class="hitbox" @click=${this.toggleMute} title="Громкость (клик: слайдер / вкл-выкл, колесо мыши: громкость)"></div>
      <div class="volume-popover ${this.isPopupOpen ? 'open' : ''}" @mouseenter=${this.handleMouseEnter} @mouseleave=${this.handleMouseLeave}>
        <span class="volume-val">${Math.round(displayVol * 100)}%</span>
        <div class="slider-track-wrap">
          <input
            type="range"
            class="popover-slider"
            min="0"
            max="1"
            step="0.01"
            .value=${String(displayVol)}
            @input=${this.handleSliderInput}
            aria-label="Master Volume"
          />
        </div>
      </div>
    `;
  }
}
