/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';

type WikiTab = 'mic' | 'prompts' | 'player' | 'effects' | 'presets' | 'faq';

@customElement('info-modal')
export class InfoModal extends LitElement {
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: String }) supportedStyles = '';

  @state() private activeTab: WikiTab = 'mic';
  @state() private searchQuery = '';

  static override styles = css`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
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
      background: linear-gradient(155deg, #1b1c24, #12131a);
      color: #eee;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(82, 0, 255, 0.15);
      width: 94vw;
      max-width: 900px;
      height: 86vh;
      display: flex;
      flex-direction: column;
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    }

    /* Header */
    .wiki-header {
      padding: 2vmin 3vmin 1.5vmin 3vmin;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5vmin;
      background: rgba(0, 0, 0, 0.2);
    }
    .wiki-title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .wiki-title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
      background: linear-gradient(135deg, #fff 30%, #2af6de 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .wiki-badge {
      font-size: 11px;
      background: rgba(42, 246, 222, 0.15);
      color: #2af6de;
      padding: 3px 8px;
      border-radius: 20px;
      border: 1px solid rgba(42, 246, 222, 0.3);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .close-button {
      background: rgba(255, 255, 255, 0.08);
      color: #ccc;
      border: none;
      border-radius: 50%;
      width: 34px;
      height: 34px;
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

    /* Navigation Bar / Tabs */
    .tabs-bar {
      display: flex;
      gap: 6px;
      padding: 1.2vmin 3vmin;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .tabs-bar::-webkit-scrollbar {
      display: none;
    }
    .tab-btn {
      background: transparent;
      color: #aaa;
      border: 1px solid transparent;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 7px;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-btn.active {
      color: #fff;
      background: rgba(82, 0, 255, 0.35);
      border-color: rgba(82, 0, 255, 0.6);
      box-shadow: 0 2px 10px rgba(82, 0, 255, 0.3);
    }

    /* Main Body */
    .wiki-body {
      flex: 1;
      overflow-y: auto;
      padding: 3vmin;
      scrollbar-width: thin;
      scrollbar-color: #444 #1b1c24;
    }
    .wiki-body::-webkit-scrollbar {
      width: 8px;
    }
    .wiki-body::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 4px;
    }

    /* Article Typography */
    h2, h3, h4 {
      color: #fff;
      margin-top: 0;
    }
    h2 {
      font-size: 24px;
      margin-bottom: 1.5vmin;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h3 {
      font-size: 18px;
      color: #2af6de;
      margin-top: 3vmin;
      margin-bottom: 1vmin;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    p {
      font-size: 15px;
      line-height: 1.65;
      color: #cfd3dc;
      margin: 0 0 1.5vmin 0;
    }
    strong {
      color: #fff;
    }
    em {
      color: #ffdd28;
      font-style: normal;
    }

    /* Callout & Guide Cards */
    .callout {
      background: rgba(42, 246, 222, 0.06);
      border-left: 4px solid #2af6de;
      border-radius: 8px;
      padding: 1.5vmin 2vmin;
      margin: 2vmin 0;
      font-size: 14.5px;
      line-height: 1.6;
    }
    .callout-pro {
      background: rgba(153, 0, 255, 0.1);
      border-left: 4px solid #9900ff;
    }
    .callout-warn {
      background: rgba(255, 221, 40, 0.08);
      border-left: 4px solid #ffdd28;
    }

    /* Steps list */
    .step-list {
      display: flex;
      flex-direction: column;
      gap: 1.5vmin;
      margin: 2vmin 0;
    }
    .step-item {
      display: flex;
      gap: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1.5vmin 2vmin;
      align-items: flex-start;
    }
    .step-num {
      background: linear-gradient(135deg, #5200ff, #9900ff);
      color: #fff;
      font-weight: 800;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
    }
    .step-text {
      flex: 1;
      font-size: 14.5px;
      line-height: 1.55;
      color: #ccc;
    }
    .step-text strong {
      color: #fff;
    }

    /* Grid of Features */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5vmin;
      margin: 2vmin 0;
    }
    .feature-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 1.8vmin;
    }
    .feature-card h4 {
      font-size: 15px;
      color: #3dffab;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .feature-card p {
      font-size: 13.5px;
      color: #aaa;
      margin: 0;
      line-height: 1.5;
    }

    /* Code / Shortcut Pill */
    .pill {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 2px 7px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 13px;
    }

    /* Footer */
    .wiki-footer {
      padding: 1.5vmin 3vmin;
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      color: #888;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.active && e.key === 'Escape') {
      this.close();
    }
  };

  private close() {
    this.active = false;
    this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true }));
  }

  private renderMicSection() {
    return html`
      <h2><span>🎙️</span> Захват ритма и мотива с микрофона</h2>
      <p>
        Новая функция позволяет синхронизировать музыку с вашим живым ритмом или напевом. Вы настукиваете ритм (хлопками, битбоксом или пальцем) либо напеваете мотив — алгоритм определяет темп и тональность и мгновенно передает их в генерацию Gemini Lyria.
      </p>

      <div class="callout">
        <strong>Как это устроено:</strong> В реальном времени браузер анализирует поток микрофона через Web Audio API. 
        Алгоритм <strong>Onsets & Energy Detection</strong> улавливает фронты звуковых ударов и вычисляет BPM (от 60 до 200). 
        Параллельный алгоритм <strong>автокорреляции (YIN Pitch Tracker)</strong> определяет фундаментальную частоту вашего напева (ноту) и подбирает наиболее подходящую музыкальную тональность из 12 поддерживаемых моделью гамм (Scale).
      </div>

      <h3><span>📋</span> Пошаговое руководство</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-text">
            <strong>Откройте окно синхронизации:</strong> нажмите кнопку с иконкой микрофона <strong>🎙️</strong> в центральной панели управления (рядом с кнопками записи).
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-text">
            <strong>Запустите прослушивание:</strong> нажмите зелёную кнопку <em>«🎙 Слушать микрофон»</em> и разрешите доступ к микрофону в браузере. Заработает живой неоновый визуализатор.
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-text">
            <strong>Задайте ритм:</strong> настучите ритм в микрофон (щелчками, хлопками, ритмичным битбоксом «пум-па-пум»). На каждой доле загорится индикатор <em>«🔥 Удар зафиксирован»</em>, а счетчик отобразит точный BPM.
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-text">
            <strong>Задайте тональность (мотив):</strong> напевайте мелодию ровным звуком — анализатор распознает текущую ноту (например, <span class="pill">A3</span>, <span class="pill">C4</span>) и определит доминирующую гамму (например, <em>C Major / A Minor</em>).
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-text">
            <strong>Примените к музыке:</strong> нажмите фиолетовую кнопку <em>«⚡ Применить к музыке»</em>. Модель Lyria мгновенно перестроится под заданный ритм и тональность!
          </div>
        </div>
      </div>

      <h3><span>✨</span> Дополнительные возможности</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <h4>👆 Tap Tempo (Ручной тап)</h4>
          <p>Если вокруг шумно или нет микрофона, настукивайте темп кнопкой <strong>«Тапнуть ритм»</strong> или нажимайте клавишу <span class="pill">Space (Пробел)</span> прямо во время прослушивания.</p>
        </div>
        <div class="feature-card">
          <h4>🔄 Режим «Live Follow»</h4>
          <p>Включите тумблер <strong>«Авто-применение на лету»</strong>, и музыка будет непрерывно следовать за изменением скорости вашего ритма в процессе исполнения.</p>
        </div>
        <div class="feature-card">
          <h4>🎧 Мониторинг микрофона</h4>
          <p>Тумблер <strong>«Слышать микрофон»</strong> выводит ваш голос в наушники, позволяя напевать поверх играющего бита.</p>
        </div>
        <div class="feature-card">
          <h4>🎛 Ручная подстройка</h4>
          <p>Вы всегда можете точно скорректировать вычисленный BPM слайдером от 60 до 200 или вручную выбрать любую из 12 тональностей в выпадающем списке.</p>
        </div>
      </div>
    `;
  }

  private renderPromptsSection() {
    return html`
      <h2><span>🎛️</span> Управление подсказками (Prompts & Weights)</h2>
      <p>
        Подсказки — это основной способ управления звучанием модели Google Lyria. Каждая карточка представляет собой отдельный музыкальный концепт (стиль, инструмент, ритмический рисунок или настроение).
      </p>

      <div class="callout callout-pro">
        <strong>Принцип взвешенного микширования:</strong> Модель генерирует непрерывный аудиопоток, объединяя концепты карточек с учётом их весов. Сумма весов нормализуется на стороне сервера.
      </div>

      <h3><span>🎚</span> Ползунки веса (Weight Sliders)</h3>
      <p>
        Регулятор веса варьируется от <strong>0</strong> до <strong>2.0</strong>:
      </p>
      <ul>
        <li><strong style="color: #888;">0.0</strong> — инструмент/стиль полностью отключён и не влияет на звук.</li>
        <li><strong style="color: #2af6de;">1.0</strong> — стандартный балансный уровень инструмента в миксе.</li>
        <li><strong style="color: #ff25f6;">2.0</strong> — доминирующий элемент (выводит стиль или инструмент на главный план).</li>
      </ul>
      <p>
        <em>Управление:</em> перетаскивайте ползунок мышью, касанием или просто наведите курсор на карточку и <strong>крутите колесо мыши</strong> для быстрой плавной регулировки.
      </p>

      <h3><span>🔒</span> Блокировка карточек (Замок)</h3>
      <p>
        Нажатие на замок <strong>🔒/🔓</strong> переводит карточку в заблокированное состояние:
      </p>
      <ul>
        <li>Заблокированная карточка защищена от случайного удаления крестиком.</li>
        <li>Она сохраняет свой текст и вес в памяти браузера при следующей перезагрузке страницы.</li>
      </ul>

      <h3><span>➕</span> Добавление новых подсказок</h3>
      <p>
        В правой части панели подсказок доступны две кнопки:
      </p>
      <ul>
        <li><strong>Кнопка «+»</strong> — создает пустую карточку. Вы можете ввести любой собственный инструмент или жанр (например: <em>Saxophone solo</em>, <em>Heavy 808 Bass</em>, <em>Cosmic Synth</em>, <em>Lofi Hip Hop</em>).</li>
        <li><strong>Кнопка «+🎲» (Случайная)</strong> — выбирает готовый стиль из библиотеки пресетов: ${this.supportedStyles || 'Minimal Techno, Bossa Nova, Funk, Shoegaze, Chiptune, Post Punk и др.'}</li>
      </ul>
    `;
  }

  private renderPlayerSection() {
    return html`
      <h2><span>▶️</span> Плеер, Буферизация и Запись</h2>
      <p>
        PromptDJ воспроизводит живой непрерывный аудиопоток с частотой дискретизации <strong>48 кГц (стерео)</strong>.
      </p>

      <h3><span>🎮</span> Основные органы управления</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <h4>▶️ Play / Pause</h4>
          <p>Запуск и остановка генерации. При старте запускается буферизация с плавным нарастанием громкости (Fade-in 3 сек), чтобы звук начинался мягко и без щелчков.</p>
        </div>
        <div class="feature-card">
          <h4>🔴 Запись RAW (Чистый звук)</h4>
          <p>Записывает прямой поток от модели Lyria без окраски эффектами. Повторный клик мгновенно сохраняет и скачивает файл <strong>.WAV</strong> студийного качества.</p>
        </div>
        <div class="feature-card">
          <h4>🔵 Запись FX (С эффектами)</h4>
          <p>Записывает финальный звук со всей вашей цепочкой эффектов (реверберация, дисторшн, эквалайзер) в файл <strong>.WAV</strong>.</p>
        </div>
        <div class="feature-card">
          <h4>🔄 Сброс (Reset)</h4>
          <p>Сбрасывает все эффекты до значений по умолчанию и обновляет музыкальный контекст модели. Текстовые подсказки при этом сохраняются.</p>
        </div>
      </div>

      <h3><span>🛡</span> Стабилизатор и Непрерывный режим</h3>
      <div class="callout">
        <strong>Стабилизатор буфера:</strong> постоянно следит за притоком аудио-чанков. Если соединение с сервером замедляется, стабилизатор плавно приглушает громкость, чтобы не было резких пауз и заиканий, и восстанавливает её при получении новых данных.
      </div>
      <p>
        Тумблер <strong>«Непрерывно»</strong> активирует автопереподключение: если связь с интернетом прервалась, плеер продолжит проверку сети и автоматически возобновит музыку, как только соединение восстановится.
      </p>

      <h3><span>📻</span> Треск винила (Silence Filler)</h3>
      <p>
        В настройках можно включить имитацию аналогового винила: мягкий виниловый треск заполняет моменты тишины и буферизации, создавая атмосферу радиостанции или винилового проигрывателя.
      </p>
    `;
  }

  private renderEffectsSection() {
    return html`
      <h2><span>🎚️</span> Звуковые Эффекты и Параметры Модели</h2>
      <p>
        Нажав кнопку шестеренки <strong>⚙️ Настройки</strong>, вы получаете доступ к двум уровням управления звуком: параметрам нейросети и студийным эффектам Web Audio.
      </p>

      <h3><span>🧠</span> Параметры модели Lyria</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <h4>Temperature (0.0 — 3.0)</h4>
          <p>Вариативность генерации. При низких значениях музыка более предсказуема; при высоких (1.1–1.8) — насыщена неожиданными сбивками и импровизациями.</p>
        </div>
        <div class="feature-card">
          <h4>Guidance (0.0 — 6.0)</h4>
          <p>Строгость следования подсказкам. Чем выше значение, тем жестче модель концентрируется на выбранных стилях.</p>
        </div>
        <div class="feature-card">
          <h4>Top-K (1 — 1000)</h4>
          <p>Широта пула вероятностей токенов. Позволяет тонко регулировать разнообразие звуковых элементов.</p>
        </div>
        <div class="feature-card">
          <h4>BPM (60 — 200) & Scale</h4>
          <p>Темп генерации в ударах в минуту и тональность (12 ладов мажора и минора). Также настраиваются через микрофон!</p>
        </div>
      </div>

      <h3><span>🔊</span> Цепочка эффектов (DSP Effects Chain)</h3>
      <p>
        Каждый эффект можно включить отдельно и отрегулировать в меню настроек:
      </p>
      <ul>
        <li><strong>Distortion:</strong> тёплое гармоническое насыщение и перегруз с алгоритмом мягкого клиппинга.</li>
        <li><strong>Chorus:</strong> стерео-хорус для придания плотности, глубины и объёма.</li>
        <li><strong>Echo / Delay:</strong> дилей с регулировкой времени задержки, обратной связи (feedback) и баланса wet/dry.</li>
        <li><strong>Reverb:</strong> алгоритм пространственной реверберации Шрёдера с симуляцией естественного затухания.</li>
        <li><strong>Flanger:</strong> гребенчатая стерео-фильтрация с низкочастотной модуляцией LFO.</li>
        <li><strong>Широкополосный EQ (37 полос от 1 Гц до 25 кГц):</strong> студийный графический эквалайзер высокого разрешения с охватом от глубочайшего инфразвука/суб-баса (1 Гц) до ультразвукового воздуха (25 кГц). Каждая полоса имеет удобные кнопки «+» и «-», точный вертикальный слайдер от -24 до +24 dB, быстрый сброс в 0 dB, интерактивную неоновую кривую АЧХ, фильтрацию по диапазонам (Суб-НЧ, Бас, СЧ, ВЧ, Воздух), мастер-преамп (Preamp) и набор готовых пресетов (Bass Boost, Sub Kick, V-Shape Smile, Vocal Clarity, Air Brilliance, Sub-Cut). Также доступен режим одиночного параметрического фильтра (Sweep).</li>
        <li><strong>Compressor:</strong> студийный компрессор динамического диапазона (Threshold, Knee, Ratio, Attack, Release).</li>
        <li><strong>Phaser & Tremolo:</strong> многоступенчатый фазовращатель и синусоидальная модуляция амплитуды.</li>
        <li><strong>Stereo Phase Shift:</strong> смещение фазы правого канала для сверхширокой стереобазы.</li>
      </ul>
    `;
  }

  private renderPresetsSection() {
    return html`
      <h2><span>💾</span> Менеджер Пресетов</h2>
      <p>
        Менеджер пресетов позволяет сохранять идеальные комбинации промптов и настроек, чтобы возвращаться к ним в один клик или делиться с друзьями.
      </p>

      <h3><span>📁</span> Что сохраняется в пресет:</h3>
      <ul>
        <li>Весь набор карточек подсказок (текст, установленный вес, цвет, состояние замка).</li>
        <li>Все параметры модели Lyria (Temperature, Guidance, Top-K, BPM, Scale).</li>
        <li>Все настройки звуковых эффектов (эквалайзер, реверберация, хорус, компрессор).</li>
        <li>Параметры громкости и фонового винила.</li>
      </ul>

      <h3><span>🚀</span> Как управлять пресетами:</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-num">💾</div>
          <div class="step-text">
            <strong>Сохранение:</strong> откройте Настройки ⚙️ -> <em>«Менеджер пресетов»</em> -> введите название и нажмите <strong>«Сохранить текущее состояние»</strong>.
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">⚡</div>
          <div class="step-text">
            <strong>Загрузка:</strong> кликните на любой сохраненный пресет из списка — все слайдеры и промпты моментально переключатся.
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">📤</div>
          <div class="step-text">
            <strong>Экспорт (Скачать файл):</strong> нажмите кнопку <em>«Экспорт»</em> рядом с пресетом, чтобы скачать файл <span class="pill">.json</span>.
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">📥</div>
          <div class="step-text">
            <strong>Импорт:</strong> нажмите <em>«Импортировать из файла»</em> и выберите любой JSON-файл пресетов с вашего компьютера.
          </div>
        </div>
      </div>
    `;
  }

  private renderFaqSection() {
    return html`
      <h2><span>❓</span> Частые вопросы и Решение проблем</h2>

      <div class="callout callout-warn">
        <strong>Звук не пошел при нажатии Play?</strong><br>
        Современные браузеры блокируют автовоспроизведение звука до прямого клика пользователя (Web Audio Autoplay Policy). Просто нажмите в любое место страницы или по кнопке Play.
      </div>

      <div class="callout" style="border-left-color: #2af6de; background: rgba(42, 246, 222, 0.08);">
        <strong style="color: #2af6de;">⚡ Звук прерывается или звучит «рваным» на слабом устройстве?</strong><br>
        Включите <strong>«⚡ Облегченный режим»</strong> (в Настройках приложения или тумблером на нижней панели управления):<br>
        • <strong>Расширенный буфер потока</strong>: увеличивает запас аудиоданных до 4.5–6.5 сек, защищая от просадок сети и медленного декодирования.<br>
        • <strong>Мягкая компенсация задержек</strong>: предотвращает сбросы в тишину и перезагрузку при микро-паузах процессора.<br>
        • <strong>Сниженная нагрузка на CPU / GPU</strong>: отключает тяжелый 4x-оверсэмплинг эффектов, ресурсоемкие эффекты размытия и оптимизирует графику.
      </div>

      <h3><span>❓</span> Микрофон не определяет темп или ритм?</h3>
      <p>
        • Настукивайте ритм ближе к микрофону с чёткими короткими акцентами (щелчками, хлопками, выраженным битбоксом).<br>
        • Если в помещении шумно, воспользуйтесь кнопкой <strong>«👆 Тапнуть ритм (Tap)»</strong> или клавишей <span class="pill">Space</span> — она мгновенно рассчитает точный BPM ваших нажатий!
      </p>

      <h3><span>❓</span> Как плавно перейти из одного стиля в другой?</h3>
      <p>
        Не останавливайте воспроизведение: плавно опускайте ползунок старого стиля и поднимайте ползунок нового. Модель плавно трансформирует партии, сохраняя непрерывность бита.
      </p>

      <h3><span>❓</span> Какие горячие клавиши доступны?</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <h4><span class="pill">Space (Пробел)</span></h4>
          <p>В окне микрофона работает как мгновенный Tap Tempo для ручного настукивания темпа.</p>
        </div>
        <div class="feature-card">
          <h4><span class="pill">Esc</span></h4>
          <p>Закрывает любое активное модальное окно (Вики, Микрофон, Настройки, Пресеты).</p>
        </div>
        <div class="feature-card">
          <h4><span class="pill">Колесо мыши</span></h4>
          <p>Вращение колеса мыши над карточкой плавно регулирует вес от 0 до 2.</p>
        </div>
      </div>
    `;
  }

  override render() {
    const overlayClasses = classMap({
      'modal-overlay': true,
      active: this.active,
    });

    return html`
      <div class=${overlayClasses} @click=${(e: MouseEvent) => { if (e.target === e.currentTarget) this.close(); }}>
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="wiki-title">
          
          <!-- Header -->
          <div class="wiki-header">
            <div class="wiki-title-area">
              <span style="font-size: 26px;">📚</span>
              <h1 class="wiki-title" id="wiki-title">PromptDJ Вики & Руководство</h1>
              <span class="wiki-badge">Справка</span>
            </div>
            <button class="close-button" @click=${this.close} aria-label="Закрыть">✕</button>
          </div>

          <!-- Navigation Tabs -->
          <div class="tabs-bar">
            <button class="tab-btn ${this.activeTab === 'mic' ? 'active' : ''}" @click=${() => this.activeTab = 'mic'}>
              🎙️ Микрофон & Ритм
            </button>
            <button class="tab-btn ${this.activeTab === 'prompts' ? 'active' : ''}" @click=${() => this.activeTab = 'prompts'}>
              🎛️ Промпты & Стили
            </button>
            <button class="tab-btn ${this.activeTab === 'player' ? 'active' : ''}" @click=${() => this.activeTab = 'player'}>
              ▶️ Плеер & Запись
            </button>
            <button class="tab-btn ${this.activeTab === 'effects' ? 'active' : ''}" @click=${() => this.activeTab = 'effects'}>
              🎚️ Звуковые Эффекты
            </button>
            <button class="tab-btn ${this.activeTab === 'presets' ? 'active' : ''}" @click=${() => this.activeTab = 'presets'}>
              💾 Пресеты
            </button>
            <button class="tab-btn ${this.activeTab === 'faq' ? 'active' : ''}" @click=${() => this.activeTab = 'faq'}>
              ❓ FAQ & Советы
            </button>
          </div>

          <!-- Tab Content Body -->
          <div class="wiki-body">
            ${this.activeTab === 'mic' ? this.renderMicSection() : ''}
            ${this.activeTab === 'prompts' ? this.renderPromptsSection() : ''}
            ${this.activeTab === 'player' ? this.renderPlayerSection() : ''}
            ${this.activeTab === 'effects' ? this.renderEffectsSection() : ''}
            ${this.activeTab === 'presets' ? this.renderPresetsSection() : ''}
            ${this.activeTab === 'faq' ? this.renderFaqSection() : ''}
          </div>

          <!-- Footer -->
          <div class="wiki-footer">
            <span>PromptDJ на базе Google Gemini Lyria Realtime</span>
            <span>Нажмите Esc для закрытия</span>
          </div>

        </div>
      </div>
    `;
  }
}