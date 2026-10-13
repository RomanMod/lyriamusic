/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html, LitElement } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { LiveAudioAnalyzer, AudioAnalysisResult } from '../core/audio-analyzer';
import { Scale } from '../core/types';

const SCALE_OPTIONS: Array<{ value: Scale; label: string }> = [
  { value: Scale.C_MAJOR_A_MINOR, label: 'C Major / A Minor' },
  { value: Scale.D_FLAT_MAJOR_B_FLAT_MINOR, label: 'Db / C# Major (Bb Minor)' },
  { value: Scale.D_MAJOR_B_MINOR, label: 'D Major / B Minor' },
  { value: Scale.E_FLAT_MAJOR_C_MINOR, label: 'Eb Major / C Minor' },
  { value: Scale.E_MAJOR_D_FLAT_MINOR, label: 'E Major / C# Minor' },
  { value: Scale.F_MAJOR_D_MINOR, label: 'F Major / D Minor' },
  { value: Scale.G_FLAT_MAJOR_E_FLAT_MINOR, label: 'Gb / F# Major (Eb Minor)' },
  { value: Scale.G_MAJOR_E_MINOR, label: 'G Major / E Minor' },
  { value: Scale.A_FLAT_MAJOR_F_MINOR, label: 'Ab Major / F Minor' },
  { value: Scale.A_MAJOR_G_FLAT_MINOR, label: 'A Major / F# Minor' },
  { value: Scale.B_FLAT_MAJOR_G_MINOR, label: 'Bb Major / G Minor' },
  { value: Scale.B_MAJOR_A_FLAT_MINOR, label: 'B Major / G# Minor' },
];

@customElement('mic-sync-modal')
export class MicSyncModal extends LitElement {
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: Number }) currentAppBpm = 120;
  @property({ type: String }) currentAppScale: Scale = Scale.C_MAJOR_A_MINOR;

  @state() private isListening = false;
  @state() private detectedBpm = 120;
  @state() private detectedNote = '-';
  @state() private detectedFreq = 0;
  @state() private detectedScale: Scale = Scale.C_MAJOR_A_MINOR;
  @state() private detectedScaleLabel = 'C Major / A Minor';
  @state() private isBeatFlashing = false;
  @state() private autoApplyLive = false;
  @state() private monitorMic = false;
  @state() private micError: string | null = null;
  @state() private tapPulse = false;

  @query('#viz-canvas') private canvasElement!: HTMLCanvasElement;

  private analyzer: LiveAudioAnalyzer | null = null;
  private animId: number | null = null;
  private lastAppliedBpm = 120;
  private lastAppliedScale: Scale = Scale.C_MAJOR_A_MINOR;

  static override styles = css`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, visibility 0s linear 0.25s;
    }
    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
      transition: opacity 0.25s ease, visibility 0s linear 0s;
    }
    .modal-content {
      background: linear-gradient(145deg, #18191f, #101116);
      color: #eee;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(42, 246, 222, 0.1);
      width: 92vw;
      max-width: 640px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2.5vmin 3vmin;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5vmin;
      margin-bottom: 2vmin;
    }
    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
    }
    .close-button {
      background: rgba(255, 255, 255, 0.08);
      color: #ccc;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s ease;
    }
    .close-button:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    /* Live visualizer canvas */
    .viz-container {
      position: relative;
      background: #090a0f;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 2vmin;
      height: 100px;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .viz-overlay {
      position: absolute;
      top: 8px;
      left: 12px;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
      pointer-events: none;
    }

    /* Primary Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5vmin;
      margin-bottom: 2.5vmin;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 1.5vmin;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .stat-card.beat-flash {
      border-color: #2af6de;
      box-shadow: inset 0 0 15px rgba(42, 246, 222, 0.2);
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 38px;
      font-weight: 800;
      color: #2af6de;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .stat-sub {
      font-size: 12px;
      color: #aaa;
      margin-top: 4px;
    }

    .beat-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #444;
      display: inline-block;
      margin-left: 6px;
      transition: background-color 0.08s ease, transform 0.08s ease;
    }
    .beat-dot.active {
      background: #ff25f6;
      transform: scale(1.6);
      box-shadow: 0 0 10px #ff25f6;
    }

    /* Actions Bar */
    .controls-row {
      display: flex;
      gap: 1vmin;
      margin-bottom: 2vmin;
      flex-wrap: wrap;
    }
    .btn {
      flex: 1;
      min-width: 130px;
      padding: 1.2vmin 1.8vmin;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-mic {
      background: linear-gradient(135deg, #1abc9c, #16a085);
      color: #fff;
    }
    .btn-mic.listening {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      animation: pulseBtn 1.5s infinite ease-in-out;
    }
    @keyframes pulseBtn {
      0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
      70% { box-shadow: 0 0 0 12px rgba(231, 76, 60, 0); }
      100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
    }
    .btn-tap {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      user-select: none;
    }
    .btn-tap:active, .btn-tap.pulse {
      background: rgba(42, 246, 222, 0.2);
      border-color: #2af6de;
      transform: scale(0.97);
    }
    .btn-apply {
      background: linear-gradient(135deg, #5200ff, #9900ff);
      color: #fff;
      box-shadow: 0 4px 15px rgba(153, 0, 255, 0.3);
    }
    .btn-apply:hover {
      box-shadow: 0 6px 20px rgba(153, 0, 255, 0.5);
      transform: translateY(-1px);
    }

    /* Option Sliders / Toggles */
    .settings-list {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5vmin;
      margin-bottom: 2vmin;
    }
    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.8vmin 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 13.5px;
    }
    .setting-item:last-child {
      border-bottom: none;
    }
    .setting-label {
      color: #ccc;
    }
    .slider-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    input[type='range'] {
      accent-color: #2af6de;
      width: 140px;
      cursor: pointer;
    }
    select {
      background: #222;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
    }

    /* Switch */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider-toggle {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #333;
      transition: 0.3s;
      border-radius: 24px;
    }
    .slider-toggle:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
    input:checked + .slider-toggle {
      background-color: #2af6de;
    }
    input:checked + .slider-toggle:before {
      transform: translateX(20px);
    }

    .tip {
      font-size: 12px;
      color: #888;
      line-height: 1.5;
      margin-top: 1vmin;
      text-align: center;
    }
    .error-msg {
      color: #ff5555;
      font-size: 13px;
      margin-top: 8px;
      text-align: center;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    this.stopListening();
  }

  override updated(changedProps: Map<string, any>) {
    if (changedProps.has('active')) {
      if (this.active) {
        this.detectedBpm = this.currentAppBpm || 120;
        this.detectedScale = this.currentAppScale || Scale.C_MAJOR_A_MINOR;
        const matching = SCALE_OPTIONS.find((s) => s.value === this.detectedScale);
        if (matching) this.detectedScaleLabel = matching.label;
        this.startVisualizer();
      } else {
        this.stopListening();
        this.stopVisualizer();
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;
    if (e.key === 'Escape') {
      this.close();
    } else if (e.code === 'Space' && (e.target === document.body || e.target === this)) {
      e.preventDefault();
      this.handleTap();
    }
  };

  private close() {
    this.stopListening();
    this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true }));
  }

  public async toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      await this.startListening();
    }
  }

  public async startListening() {
    this.micError = null;
    if (!this.analyzer) {
      this.analyzer = new LiveAudioAnalyzer();
      this.analyzer.setOnUpdate(this.handleAnalysisUpdate);
    }
    const ok = await this.analyzer.start();
    if (ok) {
      this.isListening = true;
      this.analyzer.setMonitoringVolume(this.monitorMic ? 0.35 : 0);
    } else {
      this.isListening = false;
      this.micError = 'Не удалось получить доступ к микрофону. Проверьте разрешения браузера.';
    }
  }

  public stopListening() {
    if (this.analyzer) {
      this.analyzer.stop();
    }
    this.isListening = false;
  }

  private handleAnalysisUpdate = (res: AudioAnalysisResult) => {
    if (res.isBeat) {
      this.isBeatFlashing = true;
      setTimeout(() => {
        this.isBeatFlashing = false;
      }, 120);
    }

    if (res.detectedBpm !== null) {
      this.detectedBpm = res.detectedBpm;
    }
    if (res.detectedNoteName) {
      this.detectedNote = res.detectedNoteName;
    }
    if (res.detectedPitchHz) {
      this.detectedFreq = res.detectedPitchHz;
    }
    if (res.detectedScale) {
      this.detectedScale = res.detectedScale;
      this.detectedScaleLabel = res.detectedScaleName || this.detectedScale;
    }

    // If live auto-apply is enabled and values changed significantly
    if (this.autoApplyLive) {
      const bpmDiff = Math.abs(this.detectedBpm - this.lastAppliedBpm);
      const scaleChanged = this.detectedScale !== this.lastAppliedScale;
      if (bpmDiff >= 4 || scaleChanged) {
        this.emitApply();
      }
    }
  };

  private handleTap() {
    this.tapPulse = true;
    setTimeout(() => {
      this.tapPulse = false;
    }, 150);

    if (this.analyzer) {
      this.detectedBpm = this.analyzer.registerTap();
    } else {
      // Standalone manual tap without active mic
      const now = performance.now();
      (this as any)._taps = ((this as any)._taps || []).filter((t: number) => now - t <= 3500);
      (this as any)._taps.push(now);
      const taps = (this as any)._taps;
      if (taps.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < taps.length; i++) {
          intervals.push((taps[i] - taps[i - 1]) / 1000);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        let bpm = Math.round(60 / avg);
        while (bpm < 60) bpm *= 2;
        while (bpm > 200) bpm = Math.round(bpm / 2);
        this.detectedBpm = Math.max(60, Math.min(200, bpm));
      }
    }

    if (this.autoApplyLive) {
      this.emitApply();
    }
  }

  private handleBpmSlider(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    this.detectedBpm = val;
    if (this.autoApplyLive) this.emitApply();
  }

  private handleScaleSelect(e: Event) {
    const val = (e.target as HTMLSelectElement).value as Scale;
    this.detectedScale = val;
    const match = SCALE_OPTIONS.find((s) => s.value === val);
    if (match) this.detectedScaleLabel = match.label;
    if (this.autoApplyLive) this.emitApply();
  }

  private handleMonitorToggle(e: Event) {
    this.monitorMic = (e.target as HTMLInputElement).checked;
    if (this.analyzer) {
      this.analyzer.setMonitoringVolume(this.monitorMic ? 0.35 : 0);
    }
  }

  private handleAutoApplyToggle(e: Event) {
    this.autoApplyLive = (e.target as HTMLInputElement).checked;
    if (this.autoApplyLive) {
      this.emitApply();
    }
  }

  private emitApply() {
    this.lastAppliedBpm = this.detectedBpm;
    this.lastAppliedScale = this.detectedScale;
    this.dispatchEvent(
      new CustomEvent('apply-sync', {
        detail: {
          bpm: this.detectedBpm,
          scale: this.detectedScale,
          scaleLabel: this.detectedScaleLabel,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private startVisualizer() {
    const render = () => {
      if (!this.active) return;
      if (this.canvasElement) {
        const ctx = this.canvasElement.getContext('2d');
        if (ctx) {
          const width = this.canvasElement.width;
          const height = this.canvasElement.height;
          ctx.clearRect(0, 0, width, height);

          // Draw visualizer
          if (this.analyzer && this.analyzer.isActive()) {
            const analyser = this.analyzer.getAnalyserNode();
            if (analyser) {
              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              analyser.getByteFrequencyData(dataArray);

              // Draw neon gradient spectrum bars
              const barWidth = (width / bufferLength) * 3;
              let x = 0;
              for (let i = 0; i < bufferLength; i += 3) {
                const barHeight = (dataArray[i] / 255) * height;
                const grad = ctx.createLinearGradient(0, height, 0, 0);
                grad.addColorStop(0, '#5200ff');
                grad.addColorStop(0.5, '#2af6de');
                grad.addColorStop(1, '#ff25f6');
                ctx.fillStyle = grad;
                ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
                x += barWidth;
              }
            }
          } else {
            // Idle gentle sine wave
            ctx.strokeStyle = 'rgba(42, 246, 222, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const time = performance.now() * 0.002;
            for (let x = 0; x < width; x++) {
              const y = height / 2 + Math.sin(x * 0.03 + time) * 8;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }
      this.animId = requestAnimationFrame(render);
    };
    render();
  }

  private stopVisualizer() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  override render() {
    const overlayClasses = classMap({
      'modal-overlay': true,
      active: this.active,
    });

    const beatFlashClass = classMap({
      'stat-card': true,
      'beat-flash': this.isBeatFlashing,
    });

    return html`
      <div class=${overlayClasses} @click=${(e: MouseEvent) => { if (e.target === e.currentTarget) this.close(); }}>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>🎙️</span> Захват ритма и мотива с микрофона
            </h3>
            <button class="close-button" @click=${this.close} aria-label="Закрыть">✕</button>
          </div>

          <!-- Canvas Visualizer -->
          <div class="viz-container">
            <span class="viz-overlay">${this.isListening ? 'Слушаю микрофон в реальном времени...' : 'Микрофон отключен'}</span>
            <canvas id="viz-canvas" width="600" height="100"></canvas>
          </div>

          <!-- Detected Stats Grid -->
          <div class="stats-grid">
            <div class=${beatFlashClass}>
              <span class="stat-label">
                Ритм (Темп)
                <span class="beat-dot ${this.isBeatFlashing ? 'active' : ''}"></span>
              </span>
              <div class="stat-value">${this.detectedBpm} <span style="font-size: 16px; color: #888;">BPM</span></div>
              <span class="stat-sub">${this.isBeatFlashing ? '🔥 Удар зафиксирован' : 'Настучите ритм в микрофон'}</span>
            </div>

            <div class="stat-card">
              <span class="stat-label">Мотив / Тональность</span>
              <div class="stat-value" style="font-size: 26px; color: #ff25f6;">
                ${this.detectedNote !== '-' ? this.detectedNote : '—'}
              </div>
              <span class="stat-sub" style="color: #3dffab; font-weight: 600;">
                ${this.detectedScaleLabel}
              </span>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="controls-row">
            <button class="btn btn-mic ${this.isListening ? 'listening' : ''}" @click=${this.toggleListening}>
              <span>${this.isListening ? '⏹ Остановить микрофон' : '🎙 Слушать микрофон'}</span>
            </button>
            <button class="btn btn-tap ${this.tapPulse ? 'pulse' : ''}" @click=${this.handleTap} title="Настукивайте темп кнопкой или клавишей Пробел">
              <span>👆 Тапнуть ритм (Tap)</span>
            </button>
            <button class="btn btn-apply" @click=${this.emitApply} title="Передать этот BPM и тональность в генерацию музыки">
              <span>⚡ Применить к музыке</span>
            </button>
          </div>

          ${this.micError ? html`<div class="error-msg">${this.micError}</div>` : ''}

          <!-- Live Settings adjustments -->
          <div class="settings-list">
            <div class="setting-item">
              <span class="setting-label">Точная подстройка BPM:</span>
              <div class="slider-wrap">
                <input
                  type="range"
                  min="60"
                  max="200"
                  step="1"
                  .value=${String(this.detectedBpm)}
                  @input=${this.handleBpmSlider}
                />
                <span style="font-weight: bold; width: 40px; color: #2af6de;">${this.detectedBpm}</span>
              </div>
            </div>

            <div class="setting-item">
              <span class="setting-label">Выбор тональности (Scale):</span>
              <select @change=${this.handleScaleSelect} .value=${this.detectedScale}>
                ${SCALE_OPTIONS.map(
                  (opt) => html`<option value=${opt.value} ?selected=${this.detectedScale === opt.value}>${opt.label}</option>`
                )}
              </select>
            </div>

            <div class="setting-item">
              <span class="setting-label">Авто-применение на лету (Live Follow):</span>
              <label class="switch">
                <input type="checkbox" .checked=${this.autoApplyLive} @change=${this.handleAutoApplyToggle} />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <div class="setting-item">
              <span class="setting-label">Слышать микрофон в динамиках:</span>
              <label class="switch">
                <input type="checkbox" .checked=${this.monitorMic} @change=${this.handleMonitorToggle} />
                <span class="slider-toggle"></span>
              </label>
            </div>
          </div>

          <div class="tip">
            💡 Напевайте мелодию или стучите ритм (битбокс / хлопки). Алгоритм определит частоту ударов и ключевые ноты, чтобы модель Lyria начала играть в вашем ритме!
          </div>
        </div>
      </div>
    `;
  }
}
