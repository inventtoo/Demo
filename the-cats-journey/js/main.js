/* =====================================================================
   main.js - Punto de entrada y bucle principal del juego
   ---------------------------------------------------------------------
   Contiene:
   - Input: lectura del teclado y de los controles táctiles.
   - Game: el "director" del juego. Guarda el estado actual (menú,
     historia, jugando, pausa...), carga los niveles, comprueba las
     interacciones entre el jugador, los enemigos y los objetos, y
     ejecuta el bucle con requestAnimationFrame.
   ===================================================================== */
'use strict';

/* ================================ Entrada ================================ */

const Input = {
  // Teclas asignadas a cada acción (se usa event.code, independiente del idioma del teclado)
  bindings: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    attack: ['KeyX'],
    run: ['ShiftLeft', 'ShiftRight'],
    pause: ['Escape'],
    restart: ['KeyR'],
    confirm: ['Enter', 'NumpadEnter', 'Space']
  },
  keysDown: {},       // teclas mantenidas
  pressed: {},        // acciones pulsadas en este fotograma
  virtualDown: {},    // botones táctiles mantenidos

  init() {
    window.addEventListener('keydown', (event) => {
      AudioManager.init();
      // Evitamos que las flechas o el espacio desplacen la página o pulsen botones durante el juego
      const isGameKey = Object.values(this.bindings).some((codes) => codes.includes(event.code));
      if (isGameKey && Game.capturesKeyboard()) event.preventDefault();
      if (!this.keysDown[event.code]) {
        for (const [action, codes] of Object.entries(this.bindings)) {
          if (codes.includes(event.code)) this.pressed[action] = true;
        }
      }
      this.keysDown[event.code] = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keysDown[event.code] = false;
    });
    // Si la ventana pierde el foco, soltamos todas las teclas
    window.addEventListener('blur', () => {
      this.keysDown = {};
      this.virtualDown = {};
    });
  },

  /** ¿Está mantenida la acción? */
  isDown(action) {
    if (this.virtualDown[action]) return true;
    return this.bindings[action].some((code) => this.keysDown[code]);
  },

  /** ¿Se ha pulsado la acción en este fotograma? */
  wasPressed(action) {
    return !!this.pressed[action];
  },

  /** Lo usan los botones táctiles. */
  setVirtual(action, isPressed) {
    if (isPressed && !this.virtualDown[action]) this.pressed[action] = true;
    this.virtualDown[action] = isPressed;
  },

  /** Se llama al final de cada fotograma. */
  clearPressed() {
    this.pressed = {};
  }
};

/* ================================= Juego ================================= */

const TOTAL_STARS = 9;          // 3 estrellas por nivel
const COINS_FOR_EXTRA_LIFE = 50;
const STARTING_LIVES = 3;

const Game = {
  canvas: null,
  ctx: null,
  renderScale: 1,
  state: 'menu',      // menu | story | playing | paused | cutscene | levelComplete | rescue | gameover | victory
  time: 0,
  lastTimestamp: 0,

  camera: null,
  particles: null,
  level: null,
  levelIndex: 0,
  player: null,
  enemies: [],
  collectibles: [],
  playerProjectiles: [],
  enemyProjectiles: [],
  boss: null,
  storyScene: null,
  menuScene: null,

  respawnPoint: null,
  hasKey: false,
  lives: STARTING_LIVES,
  stats: null,
  levelSnapshot: null,
  levelEndTimer: 0,
  rescueTimer: 0,
  doorMessageCooldown: 0,

  /* --------------------------- Inicialización --------------------------- */

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.camera = new Camera(CONFIG.VIEW_WIDTH, CONFIG.VIEW_HEIGHT);
    this.particles = new ParticleSystem();
    this.stats = this.createStats();

    Input.init();
    UI.init((action) => this.handleAction(action));
    UI.initTouchControls((action, isPressed) => Input.setVirtual(action, isPressed));

    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Pausa automática si se cambia de pestaña
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    // Desbloqueo del audio con el primer toque o clic
    window.addEventListener('pointerdown', () => AudioManager.init());

    this.goToMenu(true);

    // Atajo de pruebas: index.html?nivel=2 empieza directamente en ese nivel
    const startLevel = Number(new URLSearchParams(window.location.search).get('nivel'));
    if (startLevel >= 1 && startLevel <= LEVELS.length) {
      this.resetProgress();
      this.loadLevel(startLevel - 1);
    }

    requestAnimationFrame((timestamp) => this.loop(timestamp));
  },

  createStats() {
    return { coins: 0, stars: 0, enemiesDefeated: 0, livesLost: 0, playTime: 0 };
  },

  /** Ajusta el tamaño del juego a la ventana manteniendo la proporción. */
  resize() {
    const container = document.getElementById('game-container');
    const scale = Math.max(0.3, Math.min(window.innerWidth / CONFIG.VIEW_WIDTH, window.innerHeight / CONFIG.VIEW_HEIGHT));
    const displayWidth = Math.floor(CONFIG.VIEW_WIDTH * scale);
    const displayHeight = Math.floor(CONFIG.VIEW_HEIGHT * scale);
    container.style.width = `${displayWidth}px`;
    container.style.height = `${displayHeight}px`;
    container.style.fontSize = `${16 * scale}px`;

    // Usamos la densidad de píxeles de la pantalla para que se vea nítido
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(displayWidth * pixelRatio);
    this.canvas.height = Math.round(displayHeight * pixelRatio);
    this.renderScale = this.canvas.width / CONFIG.VIEW_WIDTH;
  },

  /** ¿Debe el juego "quedarse" con las teclas (y no los botones HTML)? */
  capturesKeyboard() {
    return ['playing', 'story', 'cutscene', 'rescue'].includes(this.state);
  },

  /* ------------------------ Acciones de los botones ------------------------ */

  handleAction(action) {
    switch (action) {
      case 'start':
      case 'play-again':
        this.startNewGame();
        break;
      case 'instructions':
        UI.showScreen('screen-instructions');
        break;
      case 'settings':
        UI.openSettings(this.state === 'paused' ? 'screen-pause' : 'screen-menu');
        break;
      case 'back':
        if (UI.isScreenVisible('screen-settings')) UI.showScreen(UI.settingsReturnScreen);
        else UI.showScreen(this.state === 'paused' ? 'screen-pause' : 'screen-menu');
        break;
      case 'resume':
        this.resume();
        break;
      case 'restart':
        this.restartLevel();
        break;
      case 'menu':
        UI.fade(() => this.goToMenu());
        break;
      case 'retry':
        this.retryAfterGameOver();
        break;
      case 'continue':
        this.continueAfterLevel();
        break;
      default:
        break;
    }
  },

  /* ------------------------- Flujo de la partida ------------------------- */

  goToMenu(instant = false) {
    this.state = 'menu';
    // Cerramos cualquier diálogo abierto sin ejecutar su continuación
    UI.dialogue.active = false;
    UI.dialogue.onComplete = null;
    UI.elements.dialogue.classList.add('hidden');
    UI.showHUD(false);
    UI.showBossBar(false);
    UI.hideToast();
    UI.setPausedIndicator(false);
    UI.updateTouchVisibility(false);
    UI.showScreen('screen-menu');
    this.menuScene = new StoryScene({
      background: 'forest',
      hearts: true,
      lines: [{ speaker: 'narrator', text: '', actors: { milo: { x: 430, pose: 'sit', facing: 1 }, luna: { x: 530, pose: 'sit', facing: -1 } } }]
    });
    AudioManager.playMusic('menu');
    if (!instant) UI.elements.fade.classList.remove('visible');
  },

  resetProgress() {
    this.stats = this.createStats();
    this.lives = STARTING_LIVES;
  },

  startNewGame() {
    this.resetProgress();
    UI.fade(() => this.playStory('intro', () => this.loadLevel(0)));
  },

  /** Muestra una escena de historia y al terminar ejecuta onComplete. */
  playStory(sceneName, onComplete) {
    const sceneData = STORY_SCENES[sceneName];
    this.state = 'story';
    this.storyScene = new StoryScene(sceneData);
    UI.hideScreens();
    UI.showHUD(false);
    UI.showBossBar(false);
    UI.updateTouchVisibility(false);
    AudioManager.playMusic(sceneName === 'ending' ? 'victory' : 'menu');
    UI.startDialogue(
      sceneData.lines,
      () => UI.fade(onComplete),
      (lineIndex) => this.storyScene.applyLine(lineIndex)
    );
  },

  /** Carga un nivel y coloca todos sus elementos. */
  loadLevel(index) {
    this.levelIndex = index;
    this.level = new Level(index);
    this.enemies = this.level.enemies;
    this.collectibles = this.level.collectibles;
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.particles.clear();
    this.boss = this.enemies.find((enemy) => enemy.isBoss) || null;

    const start = this.level.playerStart;
    this.player = new Player(start.x, start.y);
    this.respawnPoint = { x: start.x, y: start.y };
    this.hasKey = false;
    this.levelEndTimer = 0;
    this.rescueTimer = 0;
    this.deathHandled = false;

    // Guardamos el progreso al empezar el nivel (para reiniciarlo)
    this.levelSnapshot = { ...this.stats };

    this.camera.setWorldSize(this.level.width, this.level.height);
    this.camera.follow(this.player, 0, true);

    this.state = 'playing';
    UI.hideScreens();
    UI.resetHUDCache();
    UI.showHUD(true);
    UI.showBossBar(false);
    UI.setPausedIndicator(false);
    UI.updateTouchVisibility(true);
    UI.showLevelTitle(this.level.subtitle, this.level.name);
    AudioManager.playMusic(this.level.music);
  },

  /** Reinicia el nivel actual (tecla R o menú de pausa). */
  restartLevel() {
    if (!this.level) return;
    this.state = 'transition';
    UI.fade(() => {
      if (this.levelSnapshot) this.stats = { ...this.levelSnapshot, playTime: this.stats.playTime };
      this.loadLevel(this.levelIndex);
    });
  },

  retryAfterGameOver() {
    this.lives = STARTING_LIVES;
    this.restartLevel();
  },

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    UI.setPausedIndicator(true);
    UI.showScreen('screen-pause');
    UI.updateTouchVisibility(false);
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    UI.hideScreens();
    UI.setPausedIndicator(false);
    UI.updateTouchVisibility(true);
  },

  /** Al tocar la bandera de meta. */
  completeLevel() {
    this.level.goal.reached = true;
    this.player.celebrate();
    this.player.vx = 0;
    this.levelEndTimer = 2.2;
    AudioManager.stopMusic();
    AudioManager.play('levelComplete');
    this.particles.emit(this.level.goal.x + 20, this.level.goal.y - 60, {
      count: 30, color: ['#ffd23f', '#ff8c42', '#ffffff'], speed: 260, size: 5, life: 1.2, shape: 'star'
    });
  },

  showLevelComplete() {
    this.state = 'levelComplete';
    const snapshot = this.levelSnapshot;
    const levelStars = this.stats.stars - snapshot.stars;
    UI.fillStats('level-complete-stats', [
      ['Nivel', this.level.name],
      ['Monedas recogidas', String(this.stats.coins - snapshot.coins)],
      ['Estrellas', `${levelStars} / 3`],
      ['Enemigos derrotados', String(this.stats.enemiesDefeated - snapshot.enemiesDefeated)],
      ['Vidas restantes', String(this.lives)]
    ]);
    UI.updateTouchVisibility(false);
    UI.showScreen('screen-level-complete');
  },

  continueAfterLevel() {
    const storyAfterLevel = ['afterForest', 'afterMountains'];
    const nextLevel = this.levelIndex + 1;
    UI.fade(() => this.playStory(storyAfterLevel[this.levelIndex], () => this.loadLevel(nextLevel)));
  },

  /** El jugador ha terminado su animación de derrota. */
  handlePlayerDeath() {
    if (this.deathHandled) return;
    this.deathHandled = true;
    this.lives--;
    this.stats.livesLost++;

    if (this.lives <= 0) {
      this.state = 'gameover';
      AudioManager.stopMusic();
      UI.updateTouchVisibility(false);
      UI.showBossBar(false);
      UI.showScreen('screen-gameover');
      return;
    }
    UI.fade(() => this.respawnPlayer());
  },

  /** Hace reaparecer al jugador en el último punto de control. */
  respawnPlayer() {
    this.player.reset(this.respawnPoint.x, this.respawnPoint.y);
    this.player.invulnerableTimer = 1;
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.deathHandled = false;

    // Si morimos contra el jefe, el combate vuelve a empezar
    const arena = this.level.arena;
    if (arena && arena.started && this.boss) {
      arena.started = false;
      arena.barrier.active = false;
      this.boss.reset();
      this.camera.unlock();
      UI.showBossBar(false);
      AudioManager.playMusic(this.level.music);
    }
    this.camera.follow(this.player, 0, true);
  },

  /** Al cruzar la entrada de la sala del jefe. */
  startBossFight() {
    const arena = this.level.arena;
    arena.started = true;
    arena.barrier.active = true;
    this.camera.lockTo(arena.left, arena.right);
    this.player.vx = 0;
    this.state = 'cutscene';
    UI.updateTouchVisibility(false);
    AudioManager.stopMusic();
    UI.startDialogue(BOSS_INTRO_DIALOGUE, () => {
      this.state = 'playing';
      this.boss.activate();
      UI.showBossBar(true);
      UI.updateBossBar(1);
      UI.updateTouchVisibility(true);
      AudioManager.playMusic('boss');
    });
  },

  /** Lo llama el jefe cuando termina su animación de derrota. */
  onBossDefeated() {
    this.state = 'rescue';
    this.rescueTimer = 0;
    this.rescueElapsed = 0;
    this.enemyProjectiles = [];
    UI.showBossBar(false);
    UI.updateTouchVisibility(false);
    this.player.celebrate();
    this.player.invulnerableTimer = 0;
    if (this.level.cage) this.level.cage.open();
    AudioManager.play('victory');
    AudioManager.playMusic('victory');
  },

  showVictory() {
    this.state = 'victory';
    const minutes = Math.floor(this.stats.playTime / 60);
    const seconds = Math.floor(this.stats.playTime % 60).toString().padStart(2, '0');
    UI.fillStats('victory-stats', [
      ['Monedas recogidas', String(this.stats.coins)],
      ['Estrellas encontradas', `${this.stats.stars} / ${TOTAL_STARS}`],
      ['Enemigos derrotados', String(this.stats.enemiesDefeated)],
      ['Vidas perdidas', String(this.stats.livesLost)],
      ['Tiempo de juego', `${minutes}:${seconds}`]
    ]);
    UI.showScreen('screen-victory');
    AudioManager.playMusic('victory');
  },

  /* ------------------------------ Actualización ------------------------------ */

  update(dt) {
    this.time += dt;
    UI.updateDialogue(dt);

    switch (this.state) {
      case 'menu':
        this.menuScene.update(dt);
        break;
      case 'story':
      case 'victory':
        if (this.storyScene) this.storyScene.update(dt);
        if (this.state === 'story' && (Input.wasPressed('confirm') || Input.wasPressed('jump'))) UI.advanceDialogue();
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'cutscene':
        // Diálogo dentro del nivel: el mundo se queda quieto, la cámara se mueve
        if (Input.wasPressed('confirm') || Input.wasPressed('jump')) UI.advanceDialogue();
        this.camera.follow(this.player, dt);
        this.particles.update(dt);
        break;
      case 'rescue':
        this.updateRescue(dt);
        break;
      case 'paused':
        if (Input.wasPressed('pause')) {
          if (UI.isScreenVisible('screen-pause')) this.resume();
          else UI.showScreen('screen-pause');
        }
        break;
      default:
        break;
    }
  },

  updatePlaying(dt) {
    if (Input.wasPressed('pause')) {
      this.pause();
      return;
    }
    if (Input.wasPressed('restart') && !this.player.dead) {
      this.restartLevel();
      return;
    }

    this.stats.playTime += dt;
    this.doorMessageCooldown = Math.max(0, this.doorMessageCooldown - dt);

    // Dividimos el fotograma en pasos pequeños para que las colisiones sean precisas
    const steps = Math.max(1, Math.ceil(dt / CONFIG.MAX_PHYSICS_STEP));
    const stepDuration = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.updateWorld(stepDuration);
      Input.clearPressed(); // las pulsaciones solo cuentan en el primer paso
      if (this.state !== 'playing') break;
    }

    this.particles.update(dt);
    this.camera.follow(this.player, dt);
    this.updateHUD();

    // Pequeña pausa celebrando antes de mostrar el resumen del nivel
    if (this.levelEndTimer > 0) {
      this.levelEndTimer -= dt;
      if (this.player.onGround && Math.random() < 0.08) this.player.vy = -350;
      if (this.levelEndTimer <= 0) this.showLevelComplete();
    }
  },

  /** Un paso de simulación del mundo. */
  updateWorld(dt) {
    const player = this.player;
    const level = this.level;

    level.update(dt, this);
    player.update(dt, Input, this);

    if (player.dead) {
      if (player.deathTimer <= 0) this.handlePlayerDeath();
    } else {
      this.checkHazards();
      this.checkInteractions();
    }

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateCollectibles(dt);
  },

  updateEnemies(dt) {
    const camera = this.camera;
    for (const enemy of this.enemies) {
      // Solo actualizamos los enemigos cercanos a la pantalla (mejor rendimiento)
      if (!enemy.isBoss && !camera.isVisible(enemy.x, enemy.y, enemy.w, enemy.h, 400)) continue;
      enemy.update(dt, this);
      if (enemy.y > this.level.height + 200) enemy.alive = false;
    }

    const player = this.player;
    if (!player.dead && !player.celebrating) {
      for (const enemy of this.enemies) {
        if (enemy.dying || !rectsOverlap(player, enemy)) continue;
        this.resolvePlayerEnemyContact(enemy);
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.level.enemies = this.enemies;

    if (this.boss && this.level.arena && this.level.arena.started) {
      UI.updateBossBar(this.boss.hp / this.boss.maxHp);
    }
  },

  /** Decide si el jugador pisa al enemigo o recibe daño. */
  resolvePlayerEnemyContact(enemy) {
    const player = this.player;
    const isFallingOnTop = player.vy > 0 && player.previousBottom <= enemy.y + 14;

    if (isFallingOnTop && enemy.stompable) {
      if (enemy.isBoss) {
        if (enemy.state === 'waiting' || enemy.state === 'intro') return;
        const damaged = enemy.hit(2, this, 'stomp');
        player.y = enemy.y - player.h;
        player.bounce(Input);
        if (!damaged) {
          AudioManager.play('deflect');
          this.particles.emit(player.centerX, enemy.y, { count: 6, color: '#ffffff', speed: 120, size: 3, life: 0.3 });
        }
      } else {
        enemy.hit(1, this, 'stomp');
        player.bounce(Input);
        AudioManager.play('stomp');
        this.particles.emit(enemy.centerX, enemy.y, { count: 8, color: ['#ffffff', '#ffe066'], speed: 150, size: 3, life: 0.4, shape: 'star' });
      }
      this.countDefeat(enemy);
    } else if (enemy.harmful) {
      player.takeDamage(1, enemy.centerX, this);
    }
  },

  /** Suma el enemigo a las estadísticas cuando es derrotado (una sola vez). */
  countDefeat(enemy) {
    if (enemy.dying && !enemy.defeatCounted) {
      enemy.defeatCounted = true;
      this.stats.enemiesDefeated++;
    }
  },

  updateProjectiles(dt) {
    // Bolas de energía del jugador
    for (const ball of this.playerProjectiles) {
      ball.update(dt, this);
      if (!ball.alive) continue;
      for (const enemy of this.enemies) {
        if (enemy.dying || !rectsOverlap(ball, enemy)) continue;
        const damaged = enemy.hit(1, this, 'projectile');
        if (!damaged && enemy.isBoss) AudioManager.play('deflect');
        else if (damaged && !enemy.isBoss) AudioManager.play(enemy.dying ? 'stomp' : 'enemyHit');
        this.countDefeat(enemy);
        ball.explode(this);
        break;
      }
    }
    this.playerProjectiles = this.playerProjectiles.filter((ball) => ball.alive);

    // Ataques del jefe
    const player = this.player;
    for (const projectile of this.enemyProjectiles) {
      projectile.update(dt, this);
      if (projectile.alive && !player.dead && rectsOverlap(projectile, player)) {
        if (player.takeDamage(1, projectile.x + projectile.w / 2, this) && projectile instanceof BossFireball) {
          projectile.alive = false;
        }
      }
    }
    this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => projectile.alive);
  },

  updateCollectibles(dt) {
    const player = this.player;
    for (const item of this.collectibles) {
      item.update(dt);
      if (player.dead || item.collected || !rectsOverlap(player, item)) continue;
      item.collected = true;
      this.collectItem(item);
    }
    this.collectibles = this.collectibles.filter((item) => !item.collected);
    this.level.collectibles = this.collectibles;
  },

  /** Aplica el efecto de un objeto recogido. */
  collectItem(item) {
    const centerX = item.x + item.w / 2;
    const centerY = item.y + item.h / 2;
    switch (item.type) {
      case 'coin':
        this.stats.coins++;
        AudioManager.play('coin');
        this.particles.emit(centerX, centerY, { count: 6, color: ['#ffc93c', '#fff6c2'], speed: 100, size: 2.5, life: 0.4, gravity: 200 });
        if (this.stats.coins % COINS_FOR_EXTRA_LIFE === 0) {
          this.lives++;
          AudioManager.play('oneUp');
          UI.showToast('¡50 monedas! ¡Vida extra!');
        }
        break;
      case 'heart':
        this.player.heal(1);
        AudioManager.play('heart');
        this.particles.emit(centerX, centerY, { count: 6, color: '#ff4f6d', speed: 80, size: 6, life: 0.8, gravity: -80, shape: 'heart' });
        break;
      case 'star':
        this.stats.stars++;
        AudioManager.play('star');
        UI.showToast(`¡Estrella especial! (${this.stats.stars}/${TOTAL_STARS})`);
        this.particles.emit(centerX, centerY, { count: 16, color: ['#ffe066', '#ffffff'], speed: 220, size: 5, life: 0.8, shape: 'star' });
        break;
      case 'key':
        this.hasKey = true;
        AudioManager.play('key');
        UI.showToast('¡Has conseguido una llave!');
        this.particles.emit(centerX, centerY, { count: 12, color: ['#ffd23f', '#ffffff'], speed: 160, size: 4, life: 0.6, shape: 'star' });
        break;
      default:
        break;
    }
  },

  /** Pinchos, fuego, lava y caídas al vacío. */
  checkHazards() {
    const player = this.player;
    const level = this.level;

    for (const zone of level.getDamageZones()) {
      if (rectsOverlap(player, zone)) {
        player.takeDamage(1, zone.x + zone.w / 2, this);
        break;
      }
    }

    for (const lava of level.lavaTiles) {
      if (rectsOverlap(player, { x: lava.x, y: lava.y + 10, w: lava.w, h: lava.h })) {
        this.particles.emit(player.centerX, player.y + player.h, { count: 20, color: ['#f77f00', '#fcbf49', '#d62828'], speed: 220, size: 5, life: 0.7 });
        player.die();
        return;
      }
    }

    if (player.y > level.height + 40) player.die(true);
  },

  /** Puertas, banderas de control, meta y entrada a la sala del jefe. */
  checkInteractions() {
    const player = this.player;
    const level = this.level;

    for (const door of level.doors) {
      if (!door.active) continue;
      const touchArea = { x: door.x - 4, y: door.y, w: door.w + 8, h: door.h };
      if (!rectsOverlap(player, touchArea)) continue;
      if (this.hasKey) {
        this.hasKey = false;
        door.open();
        UI.showToast('¡La puerta se ha abierto!');
      } else if (this.doorMessageCooldown <= 0) {
        UI.showToast('La puerta está cerrada. Necesitas una llave.');
        this.doorMessageCooldown = 3;
      }
    }

    for (const checkpoint of level.checkpoints) {
      if (!checkpoint.activated && rectsOverlap(player, checkpoint.hitbox)) {
        checkpoint.activated = true;
        this.respawnPoint = checkpoint.respawnPoint;
        AudioManager.play('checkpoint');
        UI.showToast('¡Punto de control!', 1500);
        this.particles.emit(checkpoint.x + 20, checkpoint.y - 30, { count: 12, color: ['#4caf50', '#ffffff'], speed: 140, size: 4, life: 0.6, shape: 'star' });
      }
    }

    if (level.goal && !level.goal.reached && rectsOverlap(player, level.goal.hitbox)) {
      this.completeLevel();
    }

    const arena = level.arena;
    if (arena && !arena.started && this.boss && player.x > arena.triggerX) {
      this.startBossFight();
    }
  },

  /** Secuencia del rescate tras derrotar al jefe. */
  updateRescue(dt) {
    const steps = Math.max(1, Math.ceil(dt / CONFIG.MAX_PHYSICS_STEP));
    for (let i = 0; i < steps; i++) {
      const stepDuration = dt / steps;
      this.level.update(stepDuration, this);
      this.player.update(stepDuration, Input, this);
    }
    Input.clearPressed();
    this.particles.update(dt);
    this.camera.follow(this.player, dt);
    this.stats.playTime += dt;
    this.updateHUD();

    // La secuencia continúa cuando Luna llega junto a Milo (o tras unos segundos, por seguridad)
    const cage = this.level.cage;
    this.rescueElapsed = (this.rescueElapsed || 0) + dt;
    if (!cage || cage.luna.reachedMilo || this.rescueElapsed > 8) {
      this.rescueTimer += dt;
      if (Math.random() < dt * 6) {
        const luna = cage ? cage.luna : this.player;
        this.particles.emit((this.player.centerX + luna.x + 13) / 2, this.player.y - 10, {
          count: 1, color: ['#ff4f6d', '#ff8fab'], speed: 50, size: 8, life: 1.5, gravity: -60, shape: 'heart'
        });
      }
      if (this.rescueTimer > 2 && this.state === 'rescue') {
        this.state = 'transition';
        UI.fade(() => this.playStory('ending', () => {
          this.state = 'victory';
          this.showVictory();
        }));
      }
    }
  },

  updateHUD() {
    UI.updateHUD({
      health: Math.max(0, this.player.health),
      maxHealth: this.player.maxHealth,
      lives: this.lives,
      coins: this.stats.coins,
      stars: this.stats.stars,
      totalStars: TOTAL_STARS,
      hasKey: this.hasKey,
      levelName: `${this.level.subtitle}: ${this.level.name}`,
      energy: 1 - this.player.shootCooldown / PLAYER_SETTINGS.SHOOT_COOLDOWN
    });
  },

  /* -------------------------------- Dibujo -------------------------------- */

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);

    if (this.state === 'menu') {
      this.menuScene.draw(ctx);
    } else if ((this.state === 'story' || this.state === 'victory') && this.storyScene) {
      this.storyScene.draw(ctx);
    } else if (this.state === 'transition' && !this.level && this.storyScene) {
      this.storyScene.draw(ctx);
    } else if (this.level) {
      this.renderWorld(ctx);
    }
  },

  renderWorld(ctx) {
    const camera = this.camera;
    const level = this.level;

    level.drawBackground(ctx, camera, this.time);

    ctx.save();
    camera.applyTransform(ctx);
    level.drawDecorations(ctx, camera, this.time);
    level.drawTerrain(ctx, camera, this.time);
    level.drawObjects(ctx, camera, this.time);

    for (const item of this.collectibles) {
      if (camera.isVisible(item.x, item.y, item.w, item.h)) item.draw(ctx);
    }
    if (level.cage) level.cage.draw(ctx);
    for (const enemy of this.enemies) {
      if (camera.isVisible(enemy.x, enemy.y, enemy.w, enemy.h)) enemy.draw(ctx);
    }
    this.player.draw(ctx);
    for (const ball of this.playerProjectiles) ball.draw(ctx);
    for (const projectile of this.enemyProjectiles) projectile.draw(ctx);
    this.particles.draw(ctx);

    // Bocadillo del cartel más cercano
    if (this.state === 'playing') {
      for (const sign of level.signs) {
        if (Math.abs(sign.x + 20 - this.player.centerX) < 70 && Math.abs(sign.y - this.player.y) < 80) {
          sign.drawBubble(ctx, camera.x);
          break;
        }
      }
    }
    ctx.restore();

    // Viñeta oscura en el castillo para dar ambiente
    if (level.themeName === 'castle') {
      const vignette = ctx.createRadialGradient(480, 280, 200, 480, 280, 600);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CONFIG.VIEW_WIDTH, CONFIG.VIEW_HEIGHT);
    }
  },

  /* ------------------------------ Bucle principal ------------------------------ */

  /**
   * Bucle del juego con requestAnimationFrame. "dt" es el tiempo real
   * transcurrido entre fotogramas, así el juego va a la misma velocidad
   * a 30, 60 o 144 FPS.
   */
  loop(timestamp) {
    // Limitamos dt para evitar saltos enormes (por ejemplo, al volver de otra pestaña)
    const dt = this.lastTimestamp ? Math.min((timestamp - this.lastTimestamp) / 1000, 1 / 20) : 0;
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.render();
    Input.clearPressed();

    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }
};

// Arrancamos el juego cuando el HTML está listo
window.addEventListener('DOMContentLoaded', () => Game.init());
