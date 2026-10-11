/* =====================================================================
   levels.js - Niveles, elementos del escenario e historia
   ---------------------------------------------------------------------
   Cada nivel se describe con un MAPA DE TEXTO: cada carácter es una
   casilla de 24x24 píxeles de arte. Así es muy fácil crear o modificar
   niveles sin tocar el resto del código. Los mapas tienen 15 filas
   (360 píxeles, el alto de la pantalla).

   LEYENDA DEL MAPA
   ----------------
   Terreno y plataformas:
     .  vacío                       #  suelo / pared sólida
     =  plataforma flotante (se atraviesa desde abajo)
     M  plataforma móvil horizontal (se mueve 3 casillas a cada lado)
     V  plataforma móvil vertical   (se mueve 3 casillas arriba y abajo)
     C  plataforma que se derrumba al pisarla
     D  puerta cerrada (se abre con una llave)
   Peligros:
     ^  pinchos      L  lava      J  trampa de fuego (bloque que lanza llamas)
   Objetos:
     o  moneda   h  corazón   *  estrella   k  llave
   Personajes y enemigos:
     P  inicio del jugador
     s  slime   m  seta   w  murciélago   g  jabalí   n  caballero   q  fantasma
     B  jefe final (Rey Rata)   Z  jaula con Luna
   Elementos especiales:
     K  bandera de control (punto de reaparición)
     F  bandera de meta (final del nivel)
     A  inicio de la sala del jefe (la cámara se bloquea al cruzarla)
     i  cartel con un mensaje (los textos van en "signs", de izquierda a derecha)
   Decoración (no colisiona):
     T  árbol   f  flores   r  roca   b  arbusto   x  antorcha
   ===================================================================== */
'use strict';

/* ============================ Datos de niveles ============================ */

const LEVELS = [
  {
    name: 'El bosque encantado',
    subtitle: 'Nivel 1',
    theme: 'forest',
    music: 'forest',
    signs: [
      '¡Hola, Milo! Usa ← → (o A / D) para moverte.',
      'Pulsa ESPACIO (o W / ↑) para saltar. Mantén pulsado para llegar más alto.',
      '¡Cuidado con los huecos! Si caes al vacío perderás una vida.',
      'Salta encima de los enemigos para derrotarlos. Con X lanzas energía.',
      'Esta puerta está cerrada... La llave dorada está en esa plataforma.',
      '¡La bandera marca el final del bosque! Mantén Shift para correr.'
    ],
    map: [
      '..........................................................................#.............................................',
      '..........................................................................#.............................................',
      '..........................................................................#.............................................',
      '..........................................................................#.............................................',
      '......................................................o*o.................#.............................................',
      '...................................*..................ooo.................#.............................................',
      '......................................................===.................#.............................................',
      '..........................................................................#.................*...........................',
      '.............................ooo..===.....ooo......................k......#.........h......ooo..........................',
      '..............oo......ooo....===..................===.............===.....D........===..............oo..................',
      '..........................................===.............................D.......................oo##.....ooooo........',
      '.TP.i.oofo.i.f##.b.i......Ti....s.f...s.r.....b.T....f....K...i.m.....T.f.D..Toooo.....m........i.####..T.s...f.b.F..T..',
      '######################...################.....#############################################...##########################',
      '######################...################.....#############################################...##########################',
      '######################...################.....#############################################...##########################'
    ]
  },
  {
    name: 'Las montañas peligrosas',
    subtitle: 'Nivel 2',
    theme: 'mountains',
    music: 'mountains',
    signs: [
      'Las plataformas móviles te ayudarán a cruzar los precipicios.',
      'Dicen que hay un tesoro escondido... ¿Qué abrirá la llave de las alturas?'
    ],
    map: [
      '......................................................................................................................................................',
      '......................................................................................................................................................',
      '...................................................................................oko................................................................',
      '..................................................................................====................................................................',
      '......................................................................................................................................................',
      '......................................................................................w..............................w.......................*........',
      '.....................................*......................................................########........................................oo........',
      '...............ooooo........w..................................................VV...........#......#...............ooooo.........w..........==........',
      '......................................o.............ooo.........oo..o....................o..#...*..#...oooo...........................................',
      '.................................o...==..o..........===..................................==.D.hooo.#..................................................',
      '................MMM....f.^^......==......==...................CC..CC........................D......#................MMM..................##...........',
      '.TP..i...r............#########...............K.T.m.....g..r...........i..m..T..............D.oooo.#.f..^^..^^.g...........K.T.m...g...####....f..F.T.',
      '#############.........#########..............################.........###########################################.........############################',
      '#############.........#########..............################.........###########################################.........############################',
      '#############.........#########..............################.........###########################################.........############################'
    ]
  },
  {
    name: 'El castillo del villano',
    subtitle: 'Nivel 3',
    theme: 'castle',
    music: 'castle',
    signs: [
      'El castillo del Rey Rata. ¡Cuidado con la lava y las trampas de fuego!',
      'El salón del trono. Solo la llave dorada abre esta puerta.'
    ],
    map: [
      '.......................................................................................................#.......................####',
      '.......................................................................................................#.......................####',
      '.......................................................................................................#.......................####',
      '.......................................................................................................#.......................####',
      '.......................................................................................................#....................Z..####',
      '...............................*.........q........................*....................................#.......................####',
      '...............................................................................q.......oooooooo........#.......................####',
      '.....................................ooooooo........................o........k............n............#.......................####',
      '.x.......x......oooo......x......x..................xh....x....o...........x==.....VV.##########..x....#..x..................x.####',
      '..............................===..................................CC.................##########.......D....===.........===....####',
      '.................==....................MMM.....................CC........==...........##########.....h.D..............B........####',
      '..P..i......................n...................K.....n.......................^^^n....##########.K.i...D..A....................####',
      '###############......###J##########............###J######J###..........############################################################',
      '###############LLLLLL##############LLLLLLLLLLLL##############LLLLLLLLLL############################################################',
      '###############LLLLLL##############LLLLLLLLLLLL##############LLLLLLLLLL############################################################'
    ]
  }
];

/* ============================== Historia ============================== */

/*
  Las escenas se dibujan en un "escenario" de 320x180 píxeles que se
  amplía x2 (los personajes se ven más grandes). El suelo está en y = 134.
  Cada frase indica quién habla y dónde están los personajes ("actors").
  Los personajes se desplazan suavemente de una posición a la siguiente.
  "from" indica desde dónde aparece un personaje nuevo.
*/
const STORY_STAGE = { WIDTH: 320, HEIGHT: 180, GROUND_Y: 134 };

const STORY_SCENES = {
  intro: {
    background: 'forest',
    lines: [
      { speaker: 'narrator', text: 'En un rincón tranquilo del Reino Bigotudo vivían Milo y Luna, dos gatitos inseparables.',
        actors: { milo: { x: 133, pose: 'sit', facing: 1 }, luna: { x: 180, pose: 'sit', facing: -1 } } },
      { speaker: 'luna', text: '¡Milo, mira qué atardecer tan bonito!',
        actors: { milo: { x: 133, pose: 'sit', facing: 1 }, luna: { x: 180, pose: 'idle', facing: -1 } } },
      { speaker: 'milo', text: 'Es casi tan bonito como tú, Luna. ♥',
        actors: { milo: { x: 137, pose: 'idle', facing: 1 }, luna: { x: 180, pose: 'idle', facing: -1 } } },
      { speaker: 'narrator', text: 'Pero de repente, el cielo se oscureció y una risa terrible resonó en el bosque...',
        actors: { milo: { x: 137, pose: 'scared', facing: 1 }, luna: { x: 180, pose: 'scared', facing: 1 },
          villain: { x: 262, y: 94, pose: 'fly', facing: -1, from: { x: 380, y: 24 } } } },
      { speaker: 'villain', text: '¡Ja, ja, ja! ¡Soy el Rey Rata! ¡Esta gatita será la princesa de mi castillo!',
        actors: { milo: { x: 137, pose: 'scared', facing: 1 }, luna: { x: 180, pose: 'scared', facing: 1 },
          villain: { x: 245, y: 104, pose: 'windup', facing: -1 } } },
      { speaker: 'luna', text: '¡Milo! ¡Ayúdame!',
        actors: { milo: { x: 137, pose: 'scared', facing: 1 }, luna: { x: 214, y: 100, pose: 'scared', facing: -1 },
          villain: { x: 222, y: 96, pose: 'fly', facing: 1 } } },
      { speaker: 'milo', text: '¡¡LUNA!! ¡Te encontraré, cueste lo que cueste!',
        actors: { milo: { x: 173, pose: 'idle', facing: 1 }, luna: { x: 420, y: 14, pose: 'scared', facing: -1 },
          villain: { x: 428, y: 10, pose: 'fly', facing: 1 } } },
      { speaker: 'narrator', text: 'Así comenzó el gran viaje de Milo. Primero debía atravesar el Bosque Encantado...',
        actors: { milo: { x: 207, pose: 'walk', facing: 1 } } }
    ]
  },
  afterForest: {
    background: 'mountains',
    lines: [
      { speaker: 'narrator', text: 'Milo dejó atrás el bosque. Ante él se alzaban las Montañas Peligrosas.',
        actors: { milo: { x: 127, pose: 'idle', facing: 1, from: { x: -20 } } } },
      { speaker: 'milo', text: 'Desde aquí puedo ver el castillo del Rey Rata... ¡Aguanta, Luna, ya voy!',
        actors: { milo: { x: 140, pose: 'idle', facing: 1 } } },
      { speaker: 'narrator', text: 'Cuidado con los precipicios, los jabalíes y los murciélagos que acechan entre las rocas.',
        actors: { milo: { x: 173, pose: 'walk', facing: 1 } } }
    ]
  },
  afterMountains: {
    background: 'castle',
    lines: [
      { speaker: 'narrator', text: 'Por fin, el castillo del Rey Rata apareció entre la niebla.',
        actors: { milo: { x: 120, pose: 'idle', facing: 1, from: { x: -20 } } } },
      { speaker: 'milo', text: 'Huele a queso rancio... ¡Luna tiene que estar aquí dentro!',
        actors: { milo: { x: 133, pose: 'idle', facing: 1 } } },
      { speaker: 'narrator', text: 'Dicen que la puerta del salón del trono solo se abre con una llave dorada...',
        actors: { milo: { x: 167, pose: 'walk', facing: 1 } } }
    ]
  },
  ending: {
    background: 'ending',
    hearts: true,
    lines: [
      { speaker: 'luna', text: '¡Milo! ¡Sabía que vendrías a por mí!',
        actors: { milo: { x: 140, pose: 'idle', facing: 1, from: { x: 100 } }, luna: { x: 180, pose: 'idle', facing: -1, from: { x: 220 } } } },
      { speaker: 'milo', text: 'Atravesaría mil bosques y mil montañas por ti, Luna.',
        actors: { milo: { x: 146, pose: 'idle', facing: 1 }, luna: { x: 174, pose: 'idle', facing: -1 } } },
      { speaker: 'luna', text: 'Eres el gato más valiente del mundo. ♥',
        actors: { milo: { x: 148, pose: 'victory', facing: 1 }, luna: { x: 172, pose: 'victory', facing: -1 } } },
      { speaker: 'narrator', text: 'Y así, Milo y Luna volvieron a casa juntos, y vivieron felices entre siestas y atardeceres.',
        actors: { milo: { x: 146, pose: 'sit', facing: 1 }, luna: { x: 176, pose: 'sit', facing: -1 } } }
    ]
  }
};

// Diálogo que aparece al entrar en la sala del jefe
const BOSS_INTRO_DIALOGUE = [
  { speaker: 'villain', text: '¿Un gatito? ¿De verdad has venido hasta aquí tú solo?' },
  { speaker: 'luna', text: '¡Milo! ¡Has venido a rescatarme!' },
  { speaker: 'milo', text: '¡Suelta a Luna, ratón malvado!' },
  { speaker: 'villain', text: '¡Ja! ¡Prepárate para conocer el poder del Rey Rata! (Solo puedes dañarle cuando esté agotado)' }
];

/** Número pseudoaleatorio estable a partir de dos enteros (para variar la decoración). */
function tileHash(a, b) {
  return hashNoise(a, b, 0);
}

/* ===================== Elementos interactivos del nivel ===================== */

/** Dibuja una plataforma de varias casillas con remates en los extremos. */
function drawPlatformTiles(ctx, themeName, x, y, width, kind) {
  const T = CONFIG.TILE_SIZE;
  const count = Math.max(1, Math.round(width / T));
  for (let i = 0; i < count; i++) {
    let part = 'middle';
    if (count === 1) part = 'single';
    else if (i === 0) part = 'left';
    else if (i === count - 1) part = 'right';
    ctx.drawImage(Scenery.getPlatformTile(themeName, part, kind), Math.round(x + i * T), Math.round(y));
  }
}

/** Plataforma que se mueve de forma continua (horizontal o vertical). */
class MovingPlatform {
  constructor(x, y, width, axis) {
    this.originX = x;
    this.originY = y;
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = 12;
    this.axis = axis;          // 'horizontal' o 'vertical'
    this.amplitude = CONFIG.TILE_SIZE * 3;
    this.angularSpeed = (Math.PI * 2) / 4.5; // una vuelta completa cada 4,5 s
    this.time = 0;
    this.dx = 0;               // desplazamiento en este paso (para arrastrar al jugador)
    this.dy = 0;
    this.oneWay = true;
    this.active = true;
  }

  update(dt) {
    this.time += dt;
    const offset = Math.sin(this.time * this.angularSpeed) * this.amplitude;
    const newX = this.axis === 'horizontal' ? this.originX + offset : this.originX;
    const newY = this.axis === 'vertical' ? this.originY + offset : this.originY;
    this.dx = newX - this.x;
    this.dy = newY - this.y;
    this.x = newX;
    this.y = newY;
  }

  draw(ctx, themeName) {
    drawPlatformTiles(ctx, themeName, this.x, this.y, this.w, 'moving');
  }
}

/** Plataforma que tiembla y cae poco después de pisarla; reaparece más tarde. */
class CrumblingPlatform {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = 12;
    this.oneWay = true;
    this.active = true;
    this.state = 'idle';       // idle -> shaking -> fallen -> idle
    this.timer = 0;
    this.fallOffset = 0;
  }

  /** Lo llama el jugador cuando está encima. */
  onStep() {
    if (this.state === 'idle') {
      this.state = 'shaking';
      this.timer = 0.55;
      AudioManager.play('crumble');
    }
  }

  update(dt) {
    if (this.state === 'shaking') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'fallen';
        this.active = false;
        this.timer = 3;
      }
    } else if (this.state === 'fallen') {
      this.timer -= dt;
      this.fallOffset += 240 * dt;
      if (this.timer <= 0) {
        this.state = 'idle';
        this.active = true;
        this.fallOffset = 0;
      }
    }
  }

  draw(ctx, themeName) {
    if (this.state === 'fallen' && this.fallOffset > 180) return;
    const shake = this.state === 'shaking' ? (Math.floor(this.timer * 40) % 2 === 0 ? 1 : -1) : 0;
    drawPlatformTiles(ctx, themeName, this.x + shake, this.y + this.fallOffset, this.w, 'crumble');
  }
}

/** Puerta cerrada que se abre con una llave. Mientras está cerrada es sólida. */
class Door {
  constructor(x, y, height) {
    this.x = x;
    this.y = y;
    this.w = CONFIG.TILE_SIZE;
    this.h = height;
    this.oneWay = false;
    this.active = true;  // true = cerrada (bloquea el paso)
    this.openProgress = 0;
  }

  open() {
    this.active = false;
    AudioManager.play('door');
  }

  update(dt) {
    if (!this.active && this.openProgress < 1) this.openProgress = Math.min(1, this.openProgress + dt * 1.2);
  }

  draw(ctx) {
    if (this.openProgress >= 1) return;
    // La puerta se desliza hacia arriba dentro de su hueco
    const slide = Math.round(this.h * this.openProgress);
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.w, this.h);
    ctx.clip();
    ctx.drawImage(Scenery.getDoor(this.h), this.x, this.y - slide);
    ctx.restore();
  }
}

/** Bloque que lanza una columna de fuego de forma periódica. */
class FireTrap {
  constructor(x, y, phase) {
    this.x = x;
    this.y = y;
    this.time = phase;
    this.cycle = 3;
    // Zona de daño (sobre el bloque)
    this.flameHeight = 66;
    this.hitbox = { x: x + 5, y: y - this.flameHeight, w: CONFIG.TILE_SIZE - 10, h: this.flameHeight };
  }

  get phaseTime() { return this.time % this.cycle; }
  get isWarning() { return this.phaseTime > 1.6 && this.phaseTime <= 2.1; }
  get isActive() { return this.phaseTime > 2.1; }

  update(dt) {
    this.time += dt;
  }

  draw(ctx, time) {
    const art = Scenery.getFireTrap();
    ctx.drawImage(this.isWarning || this.isActive ? art.glowing : art.idle, this.x, this.y);
    const centerX = this.x + 12;
    if (this.isWarning) {
      // Aviso: chispas antes de que salga el fuego
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#ffd23f' : '#ff7b00';
        ctx.fillRect(Math.round(centerX + Math.sin(time * 30 + i * 2) * 5), this.y - 2 - i * 3 - Math.floor((time * 20) % 3), 2, 2);
      }
    } else if (this.isActive) {
      art.flames[Math.floor(time * 14) % art.flames.length].draw(ctx, centerX, this.y + 1);
    }
  }
}

/** Cartel con un mensaje de ayuda que aparece al acercarse. */
class Sign {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.w = CONFIG.TILE_SIZE;
    this.h = CONFIG.TILE_SIZE;
  }

  draw(ctx) {
    Scenery.getSign().draw(ctx, this.x + 12, this.y + 24);
  }

  /** Bocadillo con el texto del cartel (se dibuja encima de todo). */
  drawBubble(ctx, cameraX) {
    const maxTextWidth = 168;
    const lines = PixelFont.wrap(this.text, maxTextWidth);
    const textWidth = Math.max(...lines.map((line) => PixelFont.measure(line)));
    const bubbleWidth = textWidth + 16;
    const bubbleHeight = lines.length * PixelFont.LINE_HEIGHT + 11;
    let bubbleX = Math.round(this.x + 12 - bubbleWidth / 2);
    // Evitamos que el bocadillo se salga de la pantalla
    bubbleX = clamp(bubbleX, Math.round(cameraX) + 4, Math.round(cameraX) + CONFIG.VIEW_WIDTH - bubbleWidth - 4);
    const bubbleY = this.y - bubbleHeight - 8;

    drawPixelPanel(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    // Piquito del bocadillo
    const tipX = this.x + 12;
    ctx.fillStyle = '#3b2214';
    ctx.fillRect(tipX - 4, bubbleY + bubbleHeight - 1, 9, 1);
    ctx.fillRect(tipX - 3, bubbleY + bubbleHeight, 7, 1);
    ctx.fillRect(tipX - 2, bubbleY + bubbleHeight + 1, 5, 1);
    ctx.fillRect(tipX - 1, bubbleY + bubbleHeight + 2, 3, 1);
    ctx.fillStyle = '#f6e7c8';
    ctx.fillRect(tipX - 3, bubbleY + bubbleHeight - 2, 7, 1);
    ctx.fillRect(tipX - 2, bubbleY + bubbleHeight - 1, 5, 1);
    ctx.fillRect(tipX - 1, bubbleY + bubbleHeight, 3, 1);
    lines.forEach((line, index) => {
      PixelFont.draw(ctx, line, bubbleX + 8, bubbleY + 5 + index * PixelFont.LINE_HEIGHT, { color: '#3a2618' });
    });
  }
}

/** Bandera de control: al tocarla, el jugador reaparecerá aquí. */
class Checkpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.activated = false;
    this.hitbox = { x: x + 2, y: y - 36, w: 20, h: 60 };
    this.raise = 0;
  }

  get respawnPoint() {
    return { x: this.x + 4, y: this.y + CONFIG.TILE_SIZE - 20 };
  }

  update(dt) {
    if (this.activated) this.raise = Math.min(1, this.raise + dt * 2);
  }

  draw(ctx, time) {
    const poleX = this.x + 10;
    const groundY = this.y + CONFIG.TILE_SIZE;
    ctx.fillStyle = '#1b1828';
    ctx.fillRect(poleX - 1, groundY - 50, 4, 50);
    ctx.fillStyle = '#d9dbe8';
    ctx.fillRect(poleX, groundY - 49, 1, 49);
    ctx.fillStyle = '#8f93a8';
    ctx.fillRect(poleX + 1, groundY - 49, 1, 49);
    ctx.fillStyle = '#1b1828';
    ctx.fillRect(poleX - 2, groundY - 54, 6, 5);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(poleX - 1, groundY - 53, 4, 3);
    // La bandera sube al activarse
    const flagY = Math.round(groundY - 22 - this.raise * 26);
    const flags = Scenery.getCheckpointFlags(this.activated);
    ctx.drawImage(flags[Math.floor(time * 6) % flags.length], poleX + 1, flagY);
  }
}

/** Bandera de meta al final del nivel. */
class Goal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hitbox = { x: x + 5, y: y - 96, w: 14, h: 120 };
    this.reached = false;
  }

  draw(ctx, time) {
    const poleX = this.x + 10;
    const groundY = this.y + CONFIG.TILE_SIZE;
    // Base de piedra
    ctx.fillStyle = '#1b1828';
    ctx.fillRect(poleX - 7, groundY - 7, 17, 7);
    ctx.fillStyle = '#8a8699';
    ctx.fillRect(poleX - 6, groundY - 6, 15, 5);
    ctx.fillStyle = '#b8b4c8';
    ctx.fillRect(poleX - 6, groundY - 6, 15, 1);
    // Mástil
    ctx.fillStyle = '#1b1828';
    ctx.fillRect(poleX - 1, groundY - 106, 5, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(poleX, groundY - 105, 1, 99);
    ctx.fillStyle = '#c9cbd8';
    ctx.fillRect(poleX + 1, groundY - 105, 2, 99);
    // Bola dorada
    ctx.fillStyle = '#3b2a00';
    ctx.fillRect(poleX - 2, groundY - 113, 7, 7);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(poleX - 1, groundY - 112, 5, 5);
    ctx.fillStyle = '#fff3a0';
    ctx.fillRect(poleX - 1, groundY - 112, 2, 2);
    const flags = Scenery.getGoalFlags();
    ctx.drawImage(flags[Math.floor(time * 6) % flags.length], poleX + 3, groundY - 104);
  }
}

/**
 * La jaula donde está encerrada Luna. Cuando el jefe es derrotado, la
 * jaula se abre, Luna baja al suelo y corre hacia Milo.
 */
class LunaCage {
  constructor(x, y) {
    this.cageX = x + 12;  // centro de la jaula
    this.cageY = y;       // parte superior de la jaula
    this.opened = false;
    this.time = 0;
    // Luna como pequeño personaje con física
    this.luna = {
      x: this.cageX - 8, y: this.cageY + 41 - 20, w: 16, h: 20,
      vx: 0, vy: 0, onGround: false, facing: -1, free: false, reachedMilo: false, pose: 'scared', walkCycle: 0
    };
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    this.luna.free = true;
    this.luna.vy = -252;
    this.luna.vx = -72;
  }

  update(dt, game) {
    this.time += dt;
    const luna = this.luna;
    if (!luna.free) {
      luna.pose = 'scared';
      return;
    }
    // Luna cae y camina hasta Milo
    const player = game.player;
    const distance = player.centerX - (luna.x + luna.w / 2);
    if (luna.onGround) {
      if (Math.abs(distance) > 26) {
        luna.facing = Math.sign(distance);
        luna.vx = luna.facing * 144;
        luna.pose = 'walk';
      } else {
        luna.vx = 0;
        luna.facing = Math.sign(distance) || -1;
        luna.pose = 'victory';
        luna.reachedMilo = true;
      }
    } else {
      luna.pose = 'fall';
    }
    applyGravity(luna, dt);
    moveAndCollide(luna, game.level.bossSolids, dt);
    luna.walkCycle += Math.abs(luna.vx) * dt * 0.09;
  }

  draw(ctx) {
    // Cadena que sujeta la jaula
    for (let y = 0; y < this.cageY; y += 4) {
      ctx.fillStyle = '#1b1828';
      ctx.fillRect(this.cageX - 2, y, 4, 4);
      ctx.fillStyle = y % 8 === 0 ? '#a9adc0' : '#6d7086';
      ctx.fillRect(this.cageX - 1, y, 2, 3);
    }
    // Luna (detrás de los barrotes si sigue encerrada)
    const luna = this.luna;
    drawCatSprite(ctx, 'luna', luna.pose, luna.x + luna.w / 2, luna.y + luna.h, luna.facing, this.time, luna.walkCycle);
    Scenery.getCage(this.opened).draw(ctx, this.cageX, this.cageY);
  }
}

/* ================================ Nivel ================================ */

/**
 * Convierte el mapa de texto de un nivel en objetos del juego y se
 * encarga de dibujar el escenario.
 */
class Level {
  constructor(levelIndex) {
    const data = LEVELS[levelIndex];
    this.index = levelIndex;
    this.name = data.name;
    this.subtitle = data.subtitle;
    this.themeName = data.theme;
    this.music = data.music;
    this.map = data.map;
    this.rows = this.map.length;
    this.cols = this.map[0].length;
    this.width = this.cols * CONFIG.TILE_SIZE;
    this.height = this.rows * CONFIG.TILE_SIZE;

    // Listas de objetos que se rellenan al leer el mapa
    this.solids = [];             // todo lo que colisiona
    this.movingPlatforms = [];
    this.crumblingPlatforms = [];
    this.doors = [];
    this.fireTraps = [];
    this.spikes = [];
    this.lavaTiles = [];
    this.signs = [];
    this.checkpoints = [];
    this.decorations = [];
    this.collectibles = [];
    this.enemies = [];
    this.goal = null;
    this.cage = null;
    this.arena = null;
    this.playerStart = { x: 48, y: 200 };

    this.parseMap(data.signs);
    // El jefe no usa las plataformas flotantes: solo suelo, paredes y barrera
    this.bossSolids = this.solids.filter((solid) => !solid.oneWay);
  }

  /** Devuelve el carácter de una casilla (o '.' si está fuera del mapa). */
  tileAt(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return '.';
    return this.map[row][col];
  }

  /** ¿Es una casilla sobre la que se puede caminar? */
  isSolidTile(col, row) {
    const tile = this.tileAt(col, row);
    return tile === '#' || tile === '=' || tile === 'J' || tile === 'D';
  }

  /** ¿Es una casilla de terreno macizo (para elegir los bordes de cada casilla)? */
  isGroundTile(col, row) {
    if (row >= this.rows) return this.tileAt(col, this.rows - 1) === '#';
    const tile = this.tileAt(col, row);
    return tile === '#' || tile === 'J';
  }

  /** Comprueba si un enemigo que camina está a punto de caerse o de pisar pinchos. */
  isEdgeAhead(entity) {
    const T = CONFIG.TILE_SIZE;
    const probeX = entity.facing > 0 ? entity.x + entity.w + 1 : entity.x - 1;
    const col = Math.floor(probeX / T);
    const footRow = Math.floor((entity.y + entity.h - 1) / T);
    const belowRow = Math.floor((entity.y + entity.h + 1) / T);
    const tileAhead = this.tileAt(col, footRow);
    if (tileAhead === '^' || tileAhead === 'L') return true;
    return !this.isSolidTile(col, belowRow);
  }

  /** Lee el mapa carácter a carácter y crea todos los objetos. */
  parseMap(signTexts) {
    const T = CONFIG.TILE_SIZE;
    const signPositions = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.map[row][col];
        const x = col * T;
        const y = row * T;
        const previousTile = this.tileAt(col - 1, row);

        switch (tile) {
          case '#':
          case 'J': {
            // Unimos los bloques seguidos de una fila en un solo rectángulo
            if (previousTile !== '#' && previousTile !== 'J') {
              let length = 0;
              while (['#', 'J'].includes(this.tileAt(col + length, row))) length++;
              this.solids.push({ x, y, w: length * T, h: T, oneWay: false, active: true });
            }
            if (tile === 'J') this.fireTraps.push(new FireTrap(x, y, (col * 0.37) % 3));
            break;
          }
          case '=':
          case 'M':
          case 'V':
          case 'C': {
            if (previousTile === tile) break; // ya se creó con la primera casilla
            let length = 0;
            while (this.tileAt(col + length, row) === tile) length++;
            if (tile === '=') {
              this.solids.push({ x, y, w: length * T, h: 12, oneWay: true, active: true, isPlatform: true });
            } else if (tile === 'C') {
              const platform = new CrumblingPlatform(x, y, length * T);
              this.crumblingPlatforms.push(platform);
              this.solids.push(platform);
            } else {
              const platform = new MovingPlatform(x, y, length * T, tile === 'M' ? 'horizontal' : 'vertical');
              this.movingPlatforms.push(platform);
              this.solids.push(platform);
            }
            break;
          }
          case 'D': {
            if (this.tileAt(col, row - 1) === 'D') break;
            let length = 0;
            while (this.tileAt(col, row + length) === 'D') length++;
            const door = new Door(x, y, length * T);
            this.doors.push(door);
            this.solids.push(door);
            break;
          }
          case '^':
            this.spikes.push({ x: x + 2, y: y + 13, w: T - 4, h: 11, tileX: x, tileY: y });
            break;
          case 'L':
            this.lavaTiles.push({ x, y, w: T, h: T, isSurface: this.tileAt(col, row - 1) !== 'L' });
            break;
          case 'o':
          case 'h':
          case '*':
          case 'k':
            this.collectibles.push(new Collectible(COLLECTIBLE_TYPES[tile], x, y));
            break;
          case 'P':
            this.playerStart = { x: x + 4, y: y + T - 20 };
            break;
          case 'K':
            this.checkpoints.push(new Checkpoint(x, y));
            break;
          case 'F':
            this.goal = new Goal(x, y);
            break;
          case 'Z':
            this.cage = new LunaCage(x, y);
            break;
          case 'A': {
            // La sala del jefe empieza dos casillas antes del marcador
            const arenaLeft = (col - 2) * T;
            let floorRow = 0;
            while (floorRow < this.rows && this.tileAt(col - 2, floorRow) !== '#') floorRow++;
            const barrier = { x: arenaLeft, y: 0, w: T, h: floorRow * T, oneWay: false, active: false, isBarrier: true };
            this.solids.push(barrier);
            this.arena = { triggerX: x, left: arenaLeft, right: this.width, barrier, started: false };
            break;
          }
          case 'i':
            signPositions.push({ x, y });
            break;
          case 'T':
          case 'f':
          case 'r':
          case 'b':
          case 'x':
            this.decorations.push({ type: tile, x, y, seed: tileHash(col, row) });
            break;
          default:
            if (ENEMY_TYPES[tile]) {
              const enemy = createEnemy(tile, x, y);
              if (enemy) this.enemies.push(enemy);
            }
            break;
        }
      }
    }

    // Los textos de los carteles se asignan de izquierda a derecha
    signPositions.sort((a, b) => a.x - b.x);
    signPositions.forEach((position, index) => {
      this.signs.push(new Sign(position.x, position.y, signTexts[index] || '...'));
    });
    this.checkpoints.sort((a, b) => a.x - b.x);
  }

  /** Actualiza los elementos móviles del escenario. */
  update(dt, game) {
    for (const platform of this.movingPlatforms) platform.update(dt);
    for (const platform of this.crumblingPlatforms) platform.update(dt);
    for (const door of this.doors) door.update(dt);
    for (const trap of this.fireTraps) trap.update(dt);
    for (const checkpoint of this.checkpoints) checkpoint.update(dt);
    if (this.cage) this.cage.update(dt, game);
  }

  /** Zonas que hacen daño en este momento (pinchos y fuego activo). */
  getDamageZones() {
    const zones = this.spikes.slice();
    for (const trap of this.fireTraps) {
      if (trap.isActive) zones.push(trap.hitbox);
    }
    return zones;
  }

  /* ------------------------------ Dibujo ------------------------------ */

  /** Fondo con parallax (en coordenadas de pantalla, antes de aplicar la cámara). */
  drawBackground(ctx, camera, time) {
    Scenery.drawBackground(ctx, this.themeName, camera.x, time, CONFIG.VIEW_WIDTH, CONFIG.VIEW_HEIGHT);
  }

  /** Dibuja las casillas de terreno visibles (solo las que están en pantalla). */
  drawTerrain(ctx, camera, time) {
    const T = CONFIG.TILE_SIZE;
    const firstCol = Math.max(0, Math.floor(camera.x / T) - 1);
    const lastCol = Math.min(this.cols - 1, Math.ceil((camera.x + camera.width) / T) + 1);

    // Los precipicios sin fondo se oscurecen para que se vea que son peligrosos
    const bottomRow = this.rows - 1;
    const chasm = Scenery.getChasm(96);
    for (let col = firstCol; col <= lastCol; col++) {
      const bottomTile = this.map[bottomRow][col];
      if (bottomTile === '#' || bottomTile === 'J' || bottomTile === 'L') continue;
      ctx.drawImage(chasm, col * T, this.height - 96);
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        if (this.map[row][col] !== '#') continue;
        // Máscara de bordes: qué lados de la casilla quedan al aire
        const mask = (this.isGroundTile(col, row - 1) ? 0 : 1) |
          (this.isGroundTile(col + 1, row) ? 0 : 2) |
          (this.isGroundTile(col, row + 1) ? 0 : 4) |
          (this.isGroundTile(col - 1, row) ? 0 : 8);
        const variant = Math.floor(tileHash(col, row) * 4);
        ctx.drawImage(Scenery.getGroundTile(this.themeName, mask, variant), col * T, row * T - 4);
      }
    }

    // Lava animada
    const lavaFrames = Scenery.getLavaFrames();
    const lavaFrame = lavaFrames[Math.floor(time * 6) % lavaFrames.length];
    for (const lava of this.lavaTiles) {
      if (!camera.isVisible(lava.x, lava.y, lava.w, lava.h)) continue;
      ctx.drawImage(lava.isSurface ? lavaFrame.surface : lavaFrame.body, lava.x, lava.y);
    }

    // Pinchos
    const spikes = Scenery.getSpikes();
    for (const spike of this.spikes) {
      if (camera.isVisible(spike.tileX, spike.tileY, T, T)) spikes.draw(ctx, spike.tileX, spike.tileY + T);
    }
  }

  /** Decoración que va detrás de los personajes (árboles, flores, rocas, antorchas). */
  drawDecorations(ctx, camera, time) {
    for (const deco of this.decorations) {
      if (!camera.isVisible(deco.x - 40, deco.y - 90, 104, 120)) continue;
      const groundY = deco.y + CONFIG.TILE_SIZE;
      const centerX = deco.x + 12;
      switch (deco.type) {
        case 'T':
          Scenery.getTree(this.themeName, deco.seed).draw(ctx, centerX, groundY);
          break;
        case 'f': {
          const frames = Scenery.getFlowers(deco.seed);
          frames[Math.floor(time * 1.5 + deco.seed * 4) % 2].draw(ctx, centerX, groundY);
          break;
        }
        case 'r':
          Scenery.getRock(this.themeName).draw(ctx, centerX, groundY);
          break;
        case 'b':
          Scenery.getBush(this.themeName).draw(ctx, centerX, groundY);
          break;
        case 'x': {
          const torch = Scenery.getTorch();
          ctx.globalAlpha = Math.sin(time * 9 + deco.seed * 20) > 0 ? 0.32 : 0.26;
          torch.halo.draw(ctx, centerX, deco.y + 8);
          ctx.globalAlpha = 1;
          torch.holder.draw(ctx, centerX, deco.y + 10);
          torch.flames[Math.floor(time * 10 + deco.seed * 7) % torch.flames.length].draw(ctx, centerX, deco.y + 11);
          break;
        }
        default:
          break;
      }
    }
  }

  /** Plataformas, puertas, trampas, carteles y banderas. */
  drawObjects(ctx, camera, time) {
    for (const solid of this.solids) {
      if (!solid.isPlatform || !camera.isVisible(solid.x, solid.y, solid.w, solid.h)) continue;
      drawPlatformTiles(ctx, this.themeName, solid.x, solid.y, solid.w, 'static');
    }
    for (const platform of this.movingPlatforms) platform.draw(ctx, this.themeName);
    for (const platform of this.crumblingPlatforms) platform.draw(ctx, this.themeName);
    for (const door of this.doors) door.draw(ctx);
    for (const trap of this.fireTraps) {
      if (camera.isVisible(trap.x, trap.y - 72, 24, 96)) trap.draw(ctx, time);
    }
    for (const sign of this.signs) sign.draw(ctx);
    for (const checkpoint of this.checkpoints) checkpoint.draw(ctx, time);
    if (this.goal) this.goal.draw(ctx, time);

    // Barrera mágica de la sala del jefe
    if (this.arena && this.arena.barrier.active) {
      const barrier = this.arena.barrier;
      for (let barY = 0; barY < barrier.h; barY += 6) {
        const wave = Math.round(Math.sin(time * 5 + barY * 0.3) * 2);
        ctx.fillStyle = '#5a189a';
        ctx.fillRect(barrier.x + 5 + wave, barY, 3, 5);
        ctx.fillRect(barrier.x + 16 - wave, barY + 3, 3, 5);
        ctx.fillStyle = '#e0aaff';
        ctx.fillRect(barrier.x + 6 + wave, barY, 1, 4);
        ctx.fillRect(barrier.x + 17 - wave, barY + 3, 1, 4);
      }
    }
  }
}
