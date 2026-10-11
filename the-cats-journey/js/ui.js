/* =====================================================================
   ui.js - Interfaz de usuario
   ---------------------------------------------------------------------
   Gestiona todo lo que se muestra con HTML encima del canvas:
   - Pantallas (menú, instrucciones, configuración, pausa, derrota,
     nivel completado y victoria).
   - HUD: corazones, vidas, monedas, estrellas, llave y energía.
   - Barra de vida del jefe, mensajes y títulos de nivel.
   - Caja de diálogo con efecto de máquina de escribir.
   - Escenas de la historia (dibujadas en el canvas).
   - Configuración de sonido y controles táctiles.
   ===================================================================== */
'use strict';

const SPEAKER_NAMES = {
  narrator: 'Narrador',
  milo: 'Milo',
  luna: 'Luna',
  villain: 'Rey Rata'
};

// Icono SVG de corazón para el HUD
const HEART_SVG = '<svg viewBox="0 0 24 22" class="hud-heart{CLASS}"><path d="M12 21 C-6 9 3 -4 12 4 C21 -4 30 9 12 21Z" fill="#ff4f6d" stroke="#7a1028" stroke-width="1.6"/><circle cx="7.5" cy="6.5" r="2" fill="#fff" opacity="0.7"/></svg>';

const UI = {
  elements: {},
  actionHandler: null,
  hudCache: {},
  toastTimer: null,
  settingsReturnScreen: 'screen-menu',

  // Estado del diálogo
  dialogue: {
    active: false,
    lines: [],
    index: 0,
    visibleChars: 0,
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
      'game-container', 'hud', 'hud-hearts', 'hud-lives', 'hud-level', 'hud-paused', 'hud-coins', 'hud-stars',
      'hud-key', 'hud-energy-fill', 'boss-bar', 'boss-bar-fill', 'toast', 'level-title', 'dialogue',
      'dialogue-name', 'dialogue-text', 'dialogue-next', 'dialogue-skip', 'touch-controls', 'fade',
      'level-complete-stats', 'victory-stats', 'setting-music', 'setting-sfx', 'setting-music-volume',
      'setting-sfx-volume', 'setting-touch'
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

    // Diálogos: clic para avanzar o botón para saltar
    this.elements.dialogue.addEventListener('click', (event) => {
      if (event.target === this.elements['dialogue-skip']) return;
      this.advanceDialogue();
    });
    this.elements['dialogue-skip'].addEventListener('click', () => this.skipDialogue());

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

  /* ------------------------------- HUD ------------------------------- */

  showHUD(visible) {
    this.elements.hud.classList.toggle('hidden', !visible);
  },

  /** Actualiza el HUD. Solo toca el HTML cuando un valor cambia. */
  updateHUD(data) {
    const cache = this.hudCache;
    if (cache.health !== data.health || cache.maxHealth !== data.maxHealth) {
      let html = '';
      for (let i = 0; i < data.maxHealth; i++) {
        let extraClass = i < data.health ? '' : ' empty';
        if (cache.health !== undefined && i === data.health - 1 && data.health > cache.health) extraClass += ' pop';
        html += HEART_SVG.replace('{CLASS}', extraClass);
      }
      this.elements['hud-hearts'].innerHTML = html;
      cache.health = data.health;
      cache.maxHealth = data.maxHealth;
    }
    if (cache.lives !== data.lives) {
      this.elements['hud-lives'].textContent = data.lives;
      cache.lives = data.lives;
    }
    if (cache.coins !== data.coins) {
      this.elements['hud-coins'].textContent = data.coins;
      cache.coins = data.coins;
    }
    if (cache.stars !== data.stars) {
      this.elements['hud-stars'].textContent = `${data.stars}/${data.totalStars}`;
      cache.stars = data.stars;
    }
    if (cache.hasKey !== data.hasKey) {
      this.elements['hud-key'].classList.toggle('has-key', data.hasKey);
      cache.hasKey = data.hasKey;
    }
    if (cache.levelName !== data.levelName) {
      this.elements['hud-level'].textContent = data.levelName;
      cache.levelName = data.levelName;
    }
    const energyPercent = Math.round(data.energy * 100);
    if (cache.energy !== energyPercent) {
      this.elements['hud-energy-fill'].style.width = `${energyPercent}%`;
      cache.energy = energyPercent;
    }
  },

  resetHUDCache() {
    this.hudCache = {};
  },

  setPausedIndicator(paused) {
    this.elements['hud-paused'].classList.toggle('hidden', !paused);
  },

  showBossBar(visible) {
    this.elements['boss-bar'].classList.toggle('hidden', !visible);
  },

  updateBossBar(ratio) {
    this.elements['boss-bar-fill'].style.width = `${Math.max(0, ratio) * 100}%`;
  },

  /** Mensaje corto en la parte superior de la pantalla. */
  showToast(text, duration = 2200) {
    const toast = this.elements.toast;
    toast.textContent = text;
    toast.classList.remove('hidden');
    // Reiniciamos la animación CSS
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  },

  hideToast() {
    clearTimeout(this.toastTimer);
    this.elements.toast.classList.add('hidden');
  },

  /** Muestra el nombre del nivel al empezarlo. */
  showLevelTitle(subtitle, name) {
    const title = this.elements['level-title'];
    title.innerHTML = '';
    const small = document.createElement('small');
    small.textContent = subtitle;
    title.appendChild(small);
    title.appendChild(document.createTextNode(name));
    title.classList.remove('hidden');
    title.style.animation = 'none';
    void title.offsetWidth;
    title.style.animation = '';
    clearTimeout(this.levelTitleTimer);
    this.levelTitleTimer = setTimeout(() => title.classList.add('hidden'), 2900);
  },

  /** Rellena una tabla de estadísticas. */
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
    this.elements.dialogue.classList.remove('hidden');
    this.showLine();
  },

  showLine() {
    const dialogue = this.dialogue;
    const line = dialogue.lines[dialogue.index];
    dialogue.visibleChars = 0;
    const nameElement = this.elements['dialogue-name'];
    nameElement.textContent = SPEAKER_NAMES[line.speaker] || line.speaker;
    nameElement.className = line.speaker;
    this.elements['dialogue-text'].textContent = '';
    if (dialogue.onLineChange) dialogue.onLineChange(dialogue.index);
  },

  /** Efecto de máquina de escribir: muestra el texto letra a letra. */
  updateDialogue(dt) {
    const dialogue = this.dialogue;
    if (!dialogue.active) return;
    const text = dialogue.lines[dialogue.index].text;
    if (dialogue.visibleChars < text.length) {
      dialogue.visibleChars = Math.min(text.length, dialogue.visibleChars + dt * 45);
      this.elements['dialogue-text'].textContent = text.slice(0, Math.floor(dialogue.visibleChars));
    }
  },

  /** Avanza: completa la frase actual o pasa a la siguiente. */
  advanceDialogue() {
    const dialogue = this.dialogue;
    if (!dialogue.active) return;
    const text = dialogue.lines[dialogue.index].text;
    if (dialogue.visibleChars < text.length) {
      dialogue.visibleChars = text.length;
      this.elements['dialogue-text'].textContent = text;
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
    this.elements.dialogue.classList.add('hidden');
    const callback = dialogue.onComplete;
    dialogue.onComplete = null;
    if (callback) callback();
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

/* ============================ Escenas de historia ============================ */

/**
 * Dibuja una escena de la historia: un fondo y los personajes que se
 * mueven según la frase del diálogo que se está mostrando.
 */
class StoryScene {
  constructor(sceneData) {
    this.data = sceneData;
    this.actors = {};
    this.time = 0;
    this.particles = new ParticleSystem();
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
      const targetY = target.y !== undefined ? target.y : 440;
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
    if (this.data.hearts && Math.random() < dt * 4) {
      this.particles.emit(randomRange(380, 580), 380, {
        count: 1, color: ['#ff4f6d', '#ff8fab', '#ffc2d1'], speed: 40, size: 9, life: 2.5, gravity: -30, shape: 'heart'
      });
    }
    this.particles.update(dt);
  }

  draw(ctx) {
    const background = this.data.background;
    drawThemeBackground(ctx, background, this.time * 15, this.time);
    const theme = THEMES[background];

    // Suelo de la escena
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, 440, CONFIG.VIEW_WIDTH, 120);
    ctx.fillStyle = theme.groundTopDark;
    ctx.fillRect(0, 440, CONFIG.VIEW_WIDTH, 14);
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(0, 440, CONFIG.VIEW_WIDTH, 9);

    // Oscurecemos el cielo cuando aparece el villano
    if (this.actors.villain) {
      ctx.fillStyle = 'rgba(40, 10, 60, 0.35)';
      ctx.fillRect(0, 0, CONFIG.VIEW_WIDTH, CONFIG.VIEW_HEIGHT);
    }

    for (const [name, actor] of Object.entries(this.actors)) {
      const isMoving = Math.abs(actor.targetX - actor.x) > 4;
      const pose = isMoving && actor.pose !== 'scared' && actor.y >= 430 ? 'walk' : actor.pose;
      if (name === 'villain') {
        // Aura mágica bajo el villano volador
        const aura = ctx.createRadialGradient(actor.x, actor.y, 4, actor.x, actor.y, 60);
        aura.addColorStop(0, 'rgba(157, 78, 221, 0.7)');
        aura.addColorStop(1, 'rgba(157, 78, 221, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.ellipse(actor.x, actor.y, 60, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        drawRatKing(ctx, actor.x, actor.y, { facing: actor.facing, time: this.time, pose, scale: 1.3 });
      } else {
        if (actor.y >= 430) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.ellipse(actor.x, 441, 30, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawCat(ctx, actor.x, actor.y, {
          style: name, facing: actor.facing, pose, time: this.time, walkCycle: this.time * 10, scale: 2.2
        });
      }
    }
    this.particles.draw(ctx);
  }
}
