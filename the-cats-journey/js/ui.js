/* =====================================================================
   ui.js - Interfaz de usuario
   ---------------------------------------------------------------------
   - Pantallas HTML (menú, instrucciones, configuración, pausa, derrota,
     nivel completado y victoria) y controles táctiles.
   - Interfaz dibujada en pixel art dentro del canvas: HUD (corazones,
     vidas, monedas, estrellas, llave, energía), barra del jefe, avisos,
     títulos de nivel y caja de diálogo con retratos de los personajes.
   - Escenas de la historia (StoryScene).
   ===================================================================== */
'use strict';

const SPEAKER_NAMES = {
  narrator: 'Narrador',
  milo: 'Milo',
  luna: 'Luna',
  villain: 'Rey Rata'
};

// Colores de la etiqueta con el nombre de quien habla
const SPEAKER_COLORS = {
  narrator: { fill: '#7d6bb0', light: '#a898d8', shade: '#5a4a8a' },
  milo: { fill: '#f28c3a', light: '#ffb562', shade: '#c4621f' },
  luna: { fill: '#e778a8', light: '#ffa6c9', shade: '#b8507e' },
  villain: { fill: '#6b2e8a', light: '#9a5ab8', shade: '#4a1d61' }
};

const UI = {
  elements: {},
  actionHandler: null,
  settingsReturnScreen: 'screen-menu',

  // Mensajes y títulos que se dibujan en el canvas
  toast: { text: '', timer: 0 },
  levelTitle: { title: '', subtitle: '', timer: 0 },
  bossBar: { visible: false, ratio: 1, shownRatio: 1 },
  pausedIndicator: false,
  hudVisible: false,

  // Estado del diálogo
  dialogue: {
    active: false,
    lines: [],
    index: 0,
    visibleChars: 0,
    time: 0,
    onLineChange: null,
    onComplete: null
  },

  settings: {
    music: true,
    sfx: true,
    musicVolume: 45,
    sfxVolume: 70,
    touch: 'auto'
  },

  /**
   * Prepara la interfaz.
   * @param {function} actionHandler Función a la que se avisa cuando se pulsa un botón con data-action
   */
  init(actionHandler) {
    this.actionHandler = actionHandler;
    const ids = [
      'game-container', 'touch-controls', 'fade', 'level-complete-stats', 'victory-stats',
      'setting-music', 'setting-sfx', 'setting-music-volume', 'setting-sfx-volume', 'setting-touch'
    ];
    for (const id of ids) this.elements[id] = document.getElementById(id);

    // Todos los botones con data-action avisan al juego
    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        AudioManager.init();
        AudioManager.play('select');
        this.actionHandler(button.dataset.action);
      });
    });

    this.loadSettings();
    this.bindSettings();
  },

  /* ---------------------------- Pantallas ---------------------------- */

  showScreen(screenId) {
    this.hideScreens();
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.remove('hidden');
      // Damos el foco al primer botón para poder usar el teclado
      const firstButton = screen.querySelector('button');
      if (firstButton) firstButton.focus({ preventScroll: true });
    }
  },

  hideScreens() {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'));
    // Quitamos el foco de los botones ocultos para que Espacio no los active
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  isScreenVisible(screenId) {
    const screen = document.getElementById(screenId);
    return screen && !screen.classList.contains('hidden');
  },

  /** Abre la configuración recordando a qué pantalla volver. */
  openSettings(returnScreen) {
    this.settingsReturnScreen = returnScreen;
    this.showScreen('screen-settings');
  },

  /** Transición de fundido a negro: oscurece, ejecuta la acción y aclara. */
  fade(callback) {
    const fadeElement = this.elements.fade;
    fadeElement.classList.add('visible');
    setTimeout(() => {
      callback();
      setTimeout(() => fadeElement.classList.remove('visible'), 60);
    }, 420);
  },

  /* ------------------------ Mensajes en el canvas ------------------------ */

  showHUD(visible) {
    this.hudVisible = visible;
  },

  setPausedIndicator(paused) {
    this.pausedIndicator = paused;
  },

  showBossBar(visible) {
    this.bossBar.visible = visible;
    if (visible) this.bossBar.shownRatio = this.bossBar.ratio;
  },

  updateBossBar(ratio) {
    this.bossBar.ratio = Math.max(0, ratio);
  },

  /** Mensaje corto en la parte superior de la pantalla. */
  showToast(text, duration = 2200) {
    this.toast.text = text;
    this.toast.timer = duration / 1000;
  },

  hideToast() {
    this.toast.timer = 0;
  },

  /** Muestra el nombre del nivel al empezarlo. */
  showLevelTitle(subtitle, name) {
    this.levelTitle = { title: name, subtitle, timer: 2.8 };
  },

  /** Avanza los temporizadores de los mensajes y el efecto de escritura. */
  update(dt) {
    this.toast.timer = Math.max(0, this.toast.timer - dt);
    this.levelTitle.timer = Math.max(0, this.levelTitle.timer - dt);
    this.bossBar.shownRatio += (this.bossBar.ratio - this.bossBar.shownRatio) * Math.min(1, dt * 5);
    this.updateDialogue(dt);
  },

  /** Rellena una tabla de estadísticas (HTML). */
  fillStats(elementId, rows) {
    const container = this.elements[elementId];
    container.innerHTML = '';
    for (const [label, value] of rows) {
      const labelElement = document.createElement('div');
      labelElement.textContent = label;
      const valueElement = document.createElement('div');
      valueElement.className = 'stat-value';
      valueElement.textContent = value;
      container.appendChild(labelElement);
      container.appendChild(valueElement);
    }
  },

  /* ------------------------------- HUD ------------------------------- */

  /**
   * Dibuja el HUD en pixel art.
   * @param {object} data health, maxHealth, lives, coins, stars, totalStars, hasKey, levelName, energy
   */
  drawHUD(ctx, data, time) {
    if (!this.hudVisible) return;
    const textStyle = { color: '#ffffff', outline: '#1a0f1f' };

    // Panel izquierdo: corazones y vidas
    drawPixelPanel(ctx, 6, 6, 18 + data.maxHealth * 13 + 34, 22, { fill: '#2a1d3d', border: '#120a1c', light: '#4a3a66', shade: '#1c132a' });
    for (let i = 0; i < data.maxHealth; i++) {
      const heart = i < data.health ? SPRITES.heart : SPRITES.heartEmpty;
      // El último corazón late cuando queda poca vida
      const beat = data.health === 1 && i === 0 && Math.floor(time * 4) % 2 === 0 ? -1 : 0;
      heart.draw(ctx, 18 + i * 13, 17 + beat);
    }
    const livesX = 16 + data.maxHealth * 13;
    SPRITES.icons.cat.draw(ctx, livesX, 12);
    PixelFont.draw(ctx, `×${data.lives}`, livesX + 10, 11, textStyle);

    // Centro: nombre del nivel (o PAUSA)
    const centerText = this.pausedIndicator ? 'PAUSA' : data.levelName;
    const centerWidth = PixelFont.measure(centerText) + 16;
    drawPixelPanel(ctx, 320 - centerWidth / 2, 6, centerWidth, 18, { fill: '#2a1d3d', border: '#120a1c', light: '#4a3a66', shade: '#1c132a' });
    if (!this.pausedIndicator || Math.floor(time * 2) % 2 === 0) {
      PixelFont.draw(ctx, centerText, 320, 10, { color: this.pausedIndicator ? '#ffe066' : '#ffffff', align: 'center', shadow: '#120a1c' });
    }

    // Panel derecho: monedas, estrellas, llave y energía
    const panelX = 634 - 158;
    drawPixelPanel(ctx, panelX, 6, 152, 22, { fill: '#2a1d3d', border: '#120a1c', light: '#4a3a66', shade: '#1c132a' });
    SPRITES.coin[Math.floor(time * 8) % 4].draw(ctx, panelX + 13, 17);
    PixelFont.draw(ctx, String(data.coins), panelX + 22, 11, textStyle);
    SPRITES.icons.star.draw(ctx, panelX + 46, 10);
    PixelFont.draw(ctx, `${data.stars}/${data.totalStars}`, panelX + 56, 11, textStyle);
    if (data.hasKey) SPRITES.key.draw(ctx, panelX + 96, 17);
    else SPRITES.keyEmpty.draw(ctx, panelX + 96, 17);
    // Barra de energía (bola de energía lista cuando está llena)
    const barX = panelX + 110;
    ctx.fillStyle = '#120a1c';
    ctx.fillRect(barX, 13, 36, 8);
    ctx.fillStyle = '#3d2f55';
    ctx.fillRect(barX + 1, 14, 34, 6);
    const fill = Math.round(34 * clamp(data.energy, 0, 1));
    ctx.fillStyle = data.energy >= 1 ? '#7ef9ff' : '#8a6ad8';
    ctx.fillRect(barX + 1, 14, fill, 6);
    ctx.fillStyle = data.energy >= 1 ? '#d6ffff' : '#b9a4f0';
    ctx.fillRect(barX + 1, 14, fill, 2);
  },

  /** Barra de vida del jefe en la parte inferior. */
  drawBossBar(ctx) {
    if (!this.bossBar.visible) return;
    const width = 260;
    const x = 320 - width / 2;
    const y = 338;
    PixelFont.draw(ctx, 'REY RATA', 320, y - 13, { color: '#ffffff', outline: '#120a1c', align: 'center' });
    ctx.fillStyle = '#120a1c';
    ctx.fillRect(x - 2, y - 2, width + 4, 12);
    ctx.fillStyle = '#3a1020';
    ctx.fillRect(x, y, width, 8);
    // Daño reciente (franja clara que se va reduciendo)
    ctx.fillStyle = '#ffd6a8';
    ctx.fillRect(x, y, Math.round(width * this.bossBar.shownRatio), 8);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x, y, Math.round(width * this.bossBar.ratio), 8);
    ctx.fillStyle = '#ff8a8a';
    ctx.fillRect(x, y, Math.round(width * this.bossBar.ratio), 2);
    ctx.fillStyle = '#9b1d30';
    ctx.fillRect(x, y + 6, Math.round(width * this.bossBar.ratio), 2);
    // Separaciones cada punto de vida
    ctx.fillStyle = '#120a1c';
    for (let i = 1; i < 10; i++) ctx.fillRect(x + Math.round((width * i) / 10), y, 1, 8);
  },

  /** Avisos y títulos de nivel. */
  drawMessages(ctx, time) {
    if (this.toast.timer > 0) {
      const width = PixelFont.measure(this.toast.text) + 20;
      const slide = Math.min(0, Math.round((this.toast.timer - 2) * 0));
      drawPixelPanel(ctx, 320 - width / 2, 34 + slide, width, 19, { fill: '#2a1d3d', border: '#120a1c', light: '#4a3a66', shade: '#1c132a' });
      PixelFont.draw(ctx, this.toast.text, 320, 39 + slide, { color: '#ffe066', align: 'center' });
    }
    const title = this.levelTitle;
    if (title.timer > 0) {
      // Entra desde arriba y parpadea antes de desaparecer
      if (title.timer < 0.5 && Math.floor(title.timer * 16) % 2 === 0) return;
      const drop = Math.round(Math.max(0, title.timer - 2.5) * 120);
      PixelFont.draw(ctx, title.subtitle.toUpperCase(), 320, 112 - drop, { color: '#ffe066', outline: '#120a1c', align: 'center', scale: 2 });
      PixelFont.draw(ctx, title.title, 320, 138 - drop, { color: '#ffffff', outline: '#120a1c', align: 'center', scale: 3 });
    }
  },

  /* ----------------------------- Diálogos ----------------------------- */

  /**
   * Muestra una secuencia de frases.
   * @param {Array} lines            [{speaker, text}]
   * @param {function} onComplete    Se llama al terminar
   * @param {function} onLineChange  Se llama al empezar cada frase (índice)
   */
  startDialogue(lines, onComplete, onLineChange = null) {
    const dialogue = this.dialogue;
    dialogue.active = true;
    dialogue.lines = lines;
    dialogue.index = 0;
    dialogue.onComplete = onComplete;
    dialogue.onLineChange = onLineChange;
    this.showLine();
  },

  showLine() {
    const dialogue = this.dialogue;
    dialogue.visibleChars = 0;
    if (dialogue.onLineChange) dialogue.onLineChange(dialogue.index);
  },

  /** Efecto de máquina de escribir: el texto aparece letra a letra. */
  updateDialogue(dt) {
    const dialogue = this.dialogue;
    dialogue.time += dt;
    if (!dialogue.active) return;
    const text = dialogue.lines[dialogue.index].text;
    if (dialogue.visibleChars < text.length) {
      const before = Math.floor(dialogue.visibleChars);
      dialogue.visibleChars = Math.min(text.length, dialogue.visibleChars + dt * 45);
      // Pequeño "bip" cada pocas letras, como en los juegos clásicos
      if (Math.floor(dialogue.visibleChars / 3) > Math.floor(before / 3)) AudioManager.play('textBlip');
    }
  },

  /** Avanza: completa la frase actual o pasa a la siguiente. */
  advanceDialogue() {
    const dialogue = this.dialogue;
    if (!dialogue.active) return;
    const text = dialogue.lines[dialogue.index].text;
    if (dialogue.visibleChars < text.length) {
      dialogue.visibleChars = text.length;
      return;
    }
    AudioManager.play('select');
    dialogue.index++;
    if (dialogue.index >= dialogue.lines.length) this.endDialogue();
    else this.showLine();
  },

  skipDialogue() {
    if (this.dialogue.active) this.endDialogue();
  },

  endDialogue() {
    const dialogue = this.dialogue;
    dialogue.active = false;
    const callback = dialogue.onComplete;
    dialogue.onComplete = null;
    if (callback) callback();
  },

  /** Cierra el diálogo sin ejecutar su continuación (al volver al menú). */
  cancelDialogue() {
    this.dialogue.active = false;
    this.dialogue.onComplete = null;
  },

  /** Caja de diálogo con retrato, nombre y texto. */
  drawDialogue(ctx) {
    const dialogue = this.dialogue;
    if (!dialogue.active) return;
    const line = dialogue.lines[dialogue.index];
    const boxX = 10;
    const boxY = 282;
    const boxW = 620;
    const boxH = 72;
    drawPixelPanel(ctx, boxX, boxY, boxW, boxH);

    // Retrato del personaje que habla
    let textX = boxX + 14;
    const portrait = PORTRAITS[line.speaker];
    if (portrait) {
      const frameX = boxX + 8;
      const frameY = boxY + 8;
      const size = 56;
      ctx.fillStyle = '#3b2214';
      ctx.fillRect(frameX, frameY, size + 4, size + 4);
      ctx.fillStyle = portrait.background;
      ctx.fillRect(frameX + 2, frameY + 2, size, size);
      ctx.fillStyle = portrait.backgroundLight;
      for (let y = 0; y < size; y += 4) ctx.fillRect(frameX + 2, frameY + 2 + y, size, 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(frameX + 2, frameY + 2, size, size);
      ctx.clip();
      const sprite = portrait.getSprite(dialogue.time);
      const [sx, sy, sw, sh] = portrait.crop;
      const scale = portrait.scale;
      ctx.drawImage(sprite.image, sx, sy, sw, sh,
        frameX + 2 + Math.round((size - sw * scale) / 2), frameY + 2 + Math.round(size - sh * scale + portrait.offsetY),
        sw * scale, sh * scale);
      ctx.restore();
      textX = frameX + size + 16;
    }

    // Etiqueta con el nombre
    const name = SPEAKER_NAMES[line.speaker] || line.speaker;
    const nameColors = SPEAKER_COLORS[line.speaker] || SPEAKER_COLORS.narrator;
    const nameWidth = PixelFont.measure(name) + 14;
    drawPixelPanel(ctx, textX - 4, boxY - 10, nameWidth, 18, { fill: nameColors.fill, border: '#3b2214', light: nameColors.light, shade: nameColors.shade });
    PixelFont.draw(ctx, name, textX + 3, boxY - 6, { color: '#ffffff', shadow: nameColors.shade });

    // Texto con efecto de máquina de escribir (se divide en líneas completas)
    const maxWidth = boxX + boxW - textX - 14;
    const lines = PixelFont.wrap(line.text, maxWidth);
    let remaining = Math.floor(dialogue.visibleChars);
    lines.forEach((textLine, index) => {
      if (remaining <= 0) return;
      const visible = textLine.slice(0, remaining);
      remaining -= textLine.length + 1;
      PixelFont.draw(ctx, visible, textX, boxY + 14 + index * 14, { color: '#3a2618' });
    });

    // Indicador para continuar y ayuda
    if (dialogue.visibleChars >= line.text.length && Math.floor(dialogue.time * 3) % 2 === 0) {
      PixelFont.draw(ctx, '▼', boxX + boxW - 16, boxY + boxH - 16, { color: '#c4621f' });
    }
    PixelFont.draw(ctx, 'ESPACIO: seguir · ESC: saltar', boxX + boxW - 6, boxY - 12, { color: '#ffffff', outline: '#3b2214', align: 'right' });
  },

  /* ---------------------------- Configuración ---------------------------- */

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('catsJourneySettings') || 'null');
      if (saved) Object.assign(this.settings, saved);
    } catch (error) {
      // Si el almacenamiento no está disponible usamos los valores por defecto
    }
    this.applySettings();
  },

  saveSettings() {
    try {
      localStorage.setItem('catsJourneySettings', JSON.stringify(this.settings));
    } catch (error) {
      // Sin almacenamiento: la configuración solo dura esta sesión
    }
  },

  applySettings() {
    const settings = this.settings;
    this.elements['setting-music'].checked = settings.music;
    this.elements['setting-sfx'].checked = settings.sfx;
    this.elements['setting-music-volume'].value = settings.musicVolume;
    this.elements['setting-sfx-volume'].value = settings.sfxVolume;
    this.elements['setting-touch'].value = settings.touch;
    AudioManager.setMusicEnabled(settings.music);
    AudioManager.setSfxEnabled(settings.sfx);
    AudioManager.setMusicVolume(settings.musicVolume / 100);
    AudioManager.setSfxVolume(settings.sfxVolume / 100);
  },

  bindSettings() {
    const update = () => {
      this.settings.music = this.elements['setting-music'].checked;
      this.settings.sfx = this.elements['setting-sfx'].checked;
      this.settings.musicVolume = Number(this.elements['setting-music-volume'].value);
      this.settings.sfxVolume = Number(this.elements['setting-sfx-volume'].value);
      this.settings.touch = this.elements['setting-touch'].value;
      this.applySettings();
      this.saveSettings();
    };
    ['setting-music', 'setting-sfx', 'setting-music-volume', 'setting-sfx-volume', 'setting-touch'].forEach((id) => {
      this.elements[id].addEventListener('input', update);
      this.elements[id].addEventListener('change', update);
    });
  },

  /* -------------------------- Controles táctiles -------------------------- */

  /**
   * Conecta los botones táctiles con el sistema de entrada.
   * @param {function} onPress   (acción, pulsado) => void
   */
  initTouchControls(onPress) {
    const buttons = this.elements['touch-controls'].querySelectorAll('[data-touch]');
    buttons.forEach((button) => {
      const action = button.dataset.touch;
      const press = (event) => {
        event.preventDefault();
        AudioManager.init();
        button.classList.add('active');
        onPress(action, true);
      };
      const release = (event) => {
        event.preventDefault();
        button.classList.remove('active');
        onPress(action, false);
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
  },

  /** Muestra los controles táctiles según la configuración y el dispositivo. */
  updateTouchVisibility(isPlaying) {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let visible = false;
    if (this.settings.touch === 'on') visible = true;
    else if (this.settings.touch === 'auto') visible = isTouchDevice;
    this.elements['touch-controls'].classList.toggle('hidden', !(visible && isPlaying));
  }
};

/*
  Retratos del diálogo: se recorta la cabeza del sprite del personaje y
  se amplía a escala entera (x3 los gatos, x2 el Rey Rata).
*/
const PORTRAITS = {
  milo: {
    background: '#ffd9a8', backgroundLight: '#ffe6c4', crop: [15, 0, 20, 18], scale: 3, offsetY: 3,
    getSprite: (time) => SPRITES.milo.idle[(time % 3) > 2.85 ? 2 : 0]
  },
  luna: {
    background: '#ffd6e6', backgroundLight: '#ffe6f0', crop: [15, 0, 20, 18], scale: 3, offsetY: 3,
    getSprite: (time) => SPRITES.luna.idle[(time % 3) > 2.85 ? 2 : 0]
  },
  villain: {
    background: '#4a2a5a', backgroundLight: '#5a3670', crop: [32, 4, 28, 28], scale: 2, offsetY: 0,
    getSprite: () => SPRITES.ratKing.idle[0]
  }
};

/* ============================ Escenas de historia ============================ */

/**
 * Dibuja una escena de la historia en un escenario de 320x180 que se
 * amplía x2. Los personajes se mueven según la frase del diálogo.
 */
class StoryScene {
  constructor(sceneData) {
    this.data = sceneData;
    this.actors = {};
    this.time = 0;
    this.particles = new ParticleSystem();
    this.stage = createPixelCanvas(STORY_STAGE.WIDTH, STORY_STAGE.HEIGHT);
    this.stageContext = this.stage.getContext('2d');
    this.stageContext.imageSmoothingEnabled = false;
    this.applyLine(0);
  }

  /** Coloca a los personajes según la frase indicada. */
  applyLine(lineIndex) {
    const line = this.data.lines[lineIndex];
    const actorsInLine = line.actors || {};
    // Los personajes que no aparecen en la frase desaparecen
    for (const name of Object.keys(this.actors)) {
      if (!actorsInLine[name]) delete this.actors[name];
    }
    for (const [name, target] of Object.entries(actorsInLine)) {
      const targetY = target.y !== undefined ? target.y : STORY_STAGE.GROUND_Y;
      if (!this.actors[name]) {
        const start = target.from || {};
        this.actors[name] = {
          x: start.x !== undefined ? start.x : target.x,
          y: start.y !== undefined ? start.y : targetY
        };
      }
      const actor = this.actors[name];
      actor.targetX = target.x;
      actor.targetY = targetY;
      actor.pose = target.pose || 'idle';
      actor.facing = target.facing || 1;
    }
  }

  update(dt) {
    this.time += dt;
    const smoothing = 1 - Math.exp(-2.5 * dt);
    for (const actor of Object.values(this.actors)) {
      actor.x += (actor.targetX - actor.x) * smoothing;
      actor.y += (actor.targetY - actor.y) * smoothing;
    }
    // En las escenas románticas flotan corazones
    if (this.data.hearts && Math.random() < dt * 3) {
      this.particles.emit(randomRange(120, 200), 92, { count: 1, speed: 14, life: 2.5, gravity: -14, shape: 'heart' });
    }
    this.particles.update(dt);
  }

  draw(ctx) {
    const stage = this.stageContext;
    const { WIDTH, HEIGHT, GROUND_Y } = STORY_STAGE;
    Scenery.drawBackground(stage, this.data.background, this.time * 8, this.time, WIDTH, HEIGHT);

    // Suelo de la escena (dos filas de casillas)
    const themeName = this.data.background;
    for (let x = 0; x < WIDTH; x += 24) {
      const variant = Math.floor(hashNoise(x, 1, 5) * 4);
      stage.drawImage(Scenery.getGroundTile(themeName, 1, variant), x, GROUND_Y - 4);
      stage.drawImage(Scenery.getGroundTile(themeName, 0, variant), x, GROUND_Y + 20);
    }

    // El cielo se oscurece cuando aparece el villano
    if (this.actors.villain) {
      stage.fillStyle = 'rgba(40, 10, 60, 0.4)';
      stage.fillRect(0, 0, WIDTH, HEIGHT);
    }

    for (const [name, actor] of Object.entries(this.actors)) {
      const isMoving = Math.abs(actor.targetX - actor.x) > 1.5;
      const onGround = actor.y >= GROUND_Y - 2;
      const pose = isMoving && actor.pose !== 'scared' && onGround ? 'walk' : actor.pose;
      if (name === 'villain') {
        // Aura mágica tramada bajo el villano volador
        for (let y = -5; y <= 5; y++) {
          for (let x = -26; x <= 26; x++) {
            if ((x * x) / 676 + (y * y) / 25 <= 1 && ditherAt(x + Math.round(actor.x), y, 0.5)) {
              stage.fillStyle = Math.abs(y) < 3 ? '#e0aaff' : '#9d4edd';
              stage.fillRect(Math.round(actor.x) + x, Math.round(actor.y) + y, 1, 1);
            }
          }
        }
        const frames = SPRITES.ratKing[pose] || SPRITES.ratKing.idle;
        frames[Math.floor(this.time * 3) % frames.length].draw(stage, actor.x, actor.y, actor.facing < 0);
      } else {
        if (onGround) {
          stage.fillStyle = 'rgba(20, 10, 30, 0.3)';
          stage.fillRect(Math.round(actor.x) - 8, GROUND_Y - 1, 16, 1);
        }
        drawCatSprite(stage, name, pose, actor.x, actor.y, actor.facing, this.time, this.time * 9);
      }
    }
    this.particles.draw(stage);
    ctx.drawImage(this.stage, 0, 0, WIDTH * 2, HEIGHT * 2);
  }
}
