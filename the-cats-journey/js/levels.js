/* =====================================================================
   levels.js - Niveles, escenarios e historia
   ---------------------------------------------------------------------
   Cada nivel se describe con un MAPA DE TEXTO: cada carácter es una
   casilla de 40x40 píxeles. Así es muy fácil crear o modificar niveles
   sin tocar el resto del código.

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
      '.......................................................................................................#.......................#',
      '.......................................................................................................#.......................#',
      '.......................................................................................................#.......................#',
      '.......................................................................................................#....................Z..#',
      '...............................*.........q........................*....................................#.......................#',
      '...............................................................................q.......oooooooo........#.......................#',
      '.....................................ooooooo........................o........k............n............#.......................#',
      '.x.......x......oooo......x......x..................xh....x....o...........x==.....VV.##########..x....#..x..................x.#',
      '..............................===..................................CC.................##########.......D....===.........===....#',
      '.................==....................MMM.....................CC........==...........##########.....h.D..............B........#',
      '..P..i......................n...................K.....n.......................^^^n....##########.K.i...D..A....................#',
      '###############......###J##########............###J######J###..........#########################################################',
      '###############LLLLLL##############LLLLLLLLLLLL##############LLLLLLLLLL#########################################################',
      '###############LLLLLL##############LLLLLLLLLLLL##############LLLLLLLLLL#########################################################'
    ]
  }
];

/* ============================== Historia ============================== */

/*
  Cada escena tiene un fondo y una lista de frases. En cada frase se
  indica quién habla y dónde están los personajes ("actors"). Los
  personajes se desplazan suavemente de una posición a la siguiente.
  "from" indica desde dónde aparece un personaje nuevo.
*/
const STORY_SCENES = {
  intro: {
    background: 'forest',
    lines: [
      { speaker: 'narrator', text: 'En un rincón tranquilo del Reino Bigotudo vivían Milo y Luna, dos gatitos inseparables.',
        actors: { milo: { x: 400, pose: 'sit', facing: 1 }, luna: { x: 540, pose: 'sit', facing: -1 } } },
      { speaker: 'luna', text: '¡Milo, mira qué atardecer tan bonito!',
        actors: { milo: { x: 400, pose: 'sit', facing: 1 }, luna: { x: 540, pose: 'idle', facing: -1 } } },
      { speaker: 'milo', text: 'Es casi tan bonito como tú, Luna. ♥',
        actors: { milo: { x: 410, pose: 'idle', facing: 1 }, luna: { x: 540, pose: 'idle', facing: -1 } } },
      { speaker: 'narrator', text: 'Pero de repente, el cielo se oscureció y una risa terrible resonó en el bosque...',
        actors: { milo: { x: 410, pose: 'scared', facing: 1 }, luna: { x: 540, pose: 'scared', facing: 1 },
          villain: { x: 760, y: 300, pose: 'fly', facing: -1, from: { x: 1150, y: 80 } } } },
      { speaker: 'villain', text: '¡Ja, ja, ja! ¡Soy el Rey Rata! ¡Esta gatita será la princesa de mi castillo!',
        actors: { milo: { x: 410, pose: 'scared', facing: 1 }, luna: { x: 540, pose: 'scared', facing: 1 },
          villain: { x: 700, y: 320, pose: 'windup', facing: -1 } } },
      { speaker: 'luna', text: '¡Milo! ¡Ayúdame!',
        actors: { milo: { x: 410, pose: 'scared', facing: 1 }, luna: { x: 600, y: 330, pose: 'scared', facing: -1 },
          villain: { x: 640, y: 300, pose: 'fly', facing: 1 } } },
      { speaker: 'milo', text: '¡¡LUNA!! ¡Te encontraré, cueste lo que cueste!',
        actors: { milo: { x: 520, pose: 'idle', facing: 1 }, luna: { x: 1250, y: 90, pose: 'scared', facing: -1 },
          villain: { x: 1290, y: 60, pose: 'fly', facing: 1 } } },
      { speaker: 'narrator', text: 'Así comenzó el gran viaje de Milo. Primero debía atravesar el Bosque Encantado...',
        actors: { milo: { x: 620, pose: 'walk', facing: 1 } } }
    ]
  },
  afterForest: {
    background: 'mountains',
    lines: [
      { speaker: 'narrator', text: 'Milo dejó atrás el bosque. Ante él se alzaban las Montañas Peligrosas.',
        actors: { milo: { x: 380, pose: 'idle', facing: 1, from: { x: -60 } } } },
      { speaker: 'milo', text: 'Desde aquí puedo ver el castillo del Rey Rata... ¡Aguanta, Luna, ya voy!',
        actors: { milo: { x: 420, pose: 'idle', facing: 1 } } },
      { speaker: 'narrator', text: 'Cuidado con los precipicios, los jabalíes y los murciélagos que acechan entre las rocas.',
        actors: { milo: { x: 520, pose: 'walk', facing: 1 } } }
    ]
  },
  afterMountains: {
    background: 'castle',
    lines: [
      { speaker: 'narrator', text: 'Por fin, el castillo del Rey Rata apareció entre la niebla.',
        actors: { milo: { x: 360, pose: 'idle', facing: 1, from: { x: -60 } } } },
      { speaker: 'milo', text: 'Huele a queso rancio... ¡Luna tiene que estar aquí dentro!',
        actors: { milo: { x: 400, pose: 'idle', facing: 1 } } },
      { speaker: 'narrator', text: 'Dicen que la puerta del salón del trono solo se abre con una llave dorada...',
        actors: { milo: { x: 500, pose: 'walk', facing: 1 } } }
    ]
  },
  ending: {
    background: 'ending',
    hearts: true,
    lines: [
      { speaker: 'luna', text: '¡Milo! ¡Sabía que vendrías a por mí!',
        actors: { milo: { x: 420, pose: 'idle', facing: 1, from: { x: 300 } }, luna: { x: 540, pose: 'idle', facing: -1, from: { x: 660 } } } },
      { speaker: 'milo', text: 'Atravesaría mil bosques y mil montañas por ti, Luna.',
        actors: { milo: { x: 440, pose: 'idle', facing: 1 }, luna: { x: 520, pose: 'idle', facing: -1 } } },
      { speaker: 'luna', text: 'Eres el gato más valiente del mundo. ♥',
        actors: { milo: { x: 450, pose: 'victory', facing: 1 }, luna: { x: 510, pose: 'victory', facing: -1 } } },
      { speaker: 'narrator', text: 'Y así, Milo y Luna volvieron a casa juntos, y vivieron felices entre siestas y atardeceres.',
        actors: { milo: { x: 435, pose: 'sit', facing: 1 }, luna: { x: 525, pose: 'sit', facing: -1 } } }
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

/* ============================== Temas visuales ============================== */

const THEMES = {
  forest: {
    skyTop: '#7cc8f7', skyBottom: '#d8f3ff',
    farRidge: '#a9c6e8', midRidge: '#86c98a', nearRidge: '#5fae6a',
    cloud: 'rgba(255,255,255,0.9)',
    ground: '#8b5a2b', groundDark: '#6e4420', groundTop: '#5cbf4a', groundTopDark: '#3f9a33',
    platform: '#a0693a', platformTop: '#5cbf4a'
  },
  mountains: {
    skyTop: '#6a7fd1', skyBottom: '#ffcf99',
    farRidge: '#8d93c7', midRidge: '#6d76a8', nearRidge: '#8a7a96',
    cloud: 'rgba(255,240,230,0.85)',
    ground: '#7a7486', groundDark: '#5b5668', groundTop: '#f4f8ff', groundTopDark: '#c9d6ee',
    platform: '#9a93a8', platformTop: '#f4f8ff'
  },
  castle: {
    skyTop: '#0f0c29', skyBottom: '#3a2d6b',
    farRidge: '#1c1838', midRidge: '#241d45', nearRidge: '#2c2452',
    cloud: 'rgba(120,100,170,0.35)',
    ground: '#3d3555', groundDark: '#2a2440', groundTop: '#6a5f8a', groundTopDark: '#4f456e',
    platform: '#5a5078', platformTop: '#7d72a3'
  },
  ending: {
    skyTop: '#ff9a8b', skyBottom: '#ffe3b3',
    farRidge: '#e8a0b4', midRidge: '#9ccf8f', nearRidge: '#6fb86a',
    cloud: 'rgba(255,255,255,0.9)',
    ground: '#8b5a2b', groundDark: '#6e4420', groundTop: '#5cbf4a', groundTopDark: '#3f9a33',
    platform: '#a0693a', platformTop: '#5cbf4a'
  }
};

/** Número pseudoaleatorio estable a partir de dos enteros (para texturas). */
function tileHash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Altura de una cordillera en una posición x (suma de ondas). */
function ridgeHeight(x, seed) {
  return Math.sin(x * 0.004 + seed) * 0.5 + Math.sin(x * 0.011 + seed * 2.3) * 0.3 + Math.sin(x * 0.027 + seed * 4.1) * 0.2;
}

/** Dibuja una silueta de montañas/colinas con efecto parallax. */
function drawRidge(ctx, cameraX, parallax, baseY, amplitude, color, seed, snowColor = null) {
  const width = CONFIG.VIEW_WIDTH;
  const offset = cameraX * parallax;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.VIEW_HEIGHT);
  for (let screenX = 0; screenX <= width + 16; screenX += 16) {
    ctx.lineTo(screenX, baseY - ridgeHeight(screenX + offset, seed) * amplitude);
  }
  ctx.lineTo(width, CONFIG.VIEW_HEIGHT);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  if (snowColor) {
    // Nieve en las cumbres: pintamos una franja alta recortada con la forma de la montaña
    ctx.save();
    ctx.clip();
    ctx.fillStyle = snowColor;
    ctx.fillRect(0, 0, width, baseY - amplitude * 0.5);
    ctx.restore();
  }
}

/** Dibuja una nube redondeada. */
function drawCloud(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.45, y - size * 0.2, size * 0.42, 0, Math.PI * 2);
  ctx.arc(x + size * 0.9, y, size * 0.45, 0, Math.PI * 2);
  ctx.arc(x + size * 0.45, y + size * 0.1, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Dibuja el fondo completo de un tema (cielo, sol/luna, montañas, nubes).
 * Se dibuja en coordenadas de pantalla, antes de aplicar la cámara.
 */
function drawThemeBackground(ctx, themeName, cameraX, time) {
  const theme = THEMES[themeName];
  const width = CONFIG.VIEW_WIDTH;
  const height = CONFIG.VIEW_HEIGHT;

  // Cielo con degradado
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  if (themeName === 'castle') {
    // Estrellas titilantes y luna llena
    for (let i = 0; i < 60; i++) {
      const starX = (tileHash(i, 1) * width * 1.5 - cameraX * 0.02) % width;
      const starY = tileHash(i, 2) * height * 0.55;
      ctx.globalAlpha = 0.4 + Math.sin(time * 2 + i) * 0.3 + 0.3;
      ctx.fillStyle = '#fff';
      ctx.fillRect((starX + width) % width, starY, 2, 2);
    }
    ctx.globalAlpha = 1;
    const moonGlow = ctx.createRadialGradient(780, 90, 20, 780, 90, 120);
    moonGlow.addColorStop(0, 'rgba(255, 250, 220, 0.5)');
    moonGlow.addColorStop(1, 'rgba(255, 250, 220, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(640, 0, 280, 230);
    ctx.fillStyle = '#fff6d5';
    ctx.beginPath();
    ctx.arc(780, 90, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 190, 160, 0.5)';
    ctx.beginPath();
    ctx.arc(768, 80, 7, 0, Math.PI * 2);
    ctx.arc(792, 102, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sol con resplandor
    const sunX = themeName === 'forest' ? 800 : 700;
    const sunY = themeName === 'forest' ? 90 : 260;
    const sunColor = themeName === 'forest' ? '255, 240, 160' : '255, 200, 120';
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 140);
    glow.addColorStop(0, `rgba(${sunColor}, 0.9)`);
    glow.addColorStop(1, `rgba(${sunColor}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
    ctx.fillStyle = `rgb(${sunColor})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  // Montañas lejanas (se mueven poco: parecen estar muy lejos)
  const hasSnow = themeName === 'mountains' || themeName === 'forest';
  drawRidge(ctx, cameraX, 0.1, 300, 120, theme.farRidge, 1.3, hasSnow ? 'rgba(255,255,255,0.85)' : null);

  // Nubes animadas
  for (let i = 0; i < 7; i++) {
    const cloudSize = 50 + tileHash(i, 7) * 50;
    const span = width + 400;
    let cloudX = (i * 230 + time * (10 + i * 2) - cameraX * 0.2) % span;
    if (cloudX < 0) cloudX += span;
    drawCloud(ctx, cloudX - 200, 50 + tileHash(i, 9) * 140, cloudSize, theme.cloud);
  }

  if (themeName === 'castle') {
    drawCastleSilhouette(ctx, cameraX, time);
    drawRidge(ctx, cameraX, 0.45, 470, 50, theme.nearRidge, 5.2);
  } else {
    drawRidge(ctx, cameraX, 0.3, 380, 90, theme.midRidge, 3.1, themeName === 'mountains' ? 'rgba(255,255,255,0.7)' : null);
    if (themeName === 'forest' || themeName === 'ending') drawBackgroundTrees(ctx, cameraX, theme.nearRidge);
    else drawRidge(ctx, cameraX, 0.5, 450, 60, theme.nearRidge, 7.7);
  }
}

/** Árboles lejanos para dar profundidad al bosque. */
function drawBackgroundTrees(ctx, cameraX, color) {
  const parallax = 0.5;
  const spacing = 70;
  const offset = cameraX * parallax;
  const firstIndex = Math.floor(offset / spacing) - 1;
  for (let i = firstIndex; i < firstIndex + CONFIG.VIEW_WIDTH / spacing + 3; i++) {
    const x = i * spacing - offset + tileHash(i, 3) * 30;
    const treeHeight = 70 + tileHash(i, 4) * 60;
    const baseY = 470;
    ctx.fillStyle = '#4f7d4a';
    ctx.fillRect(x - 4, baseY - treeHeight * 0.5, 8, treeHeight * 0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, baseY - treeHeight * 0.6, treeHeight * 0.32, 0, Math.PI * 2);
    ctx.arc(x - 14, baseY - treeHeight * 0.45, treeHeight * 0.22, 0, Math.PI * 2);
    ctx.arc(x + 14, baseY - treeHeight * 0.45, treeHeight * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 460, CONFIG.VIEW_WIDTH, 100);
}

/** Siluetas de torres del castillo con ventanas iluminadas. */
function drawCastleSilhouette(ctx, cameraX, time) {
  const parallax = 0.2;
  const spacing = 180;
  const offset = cameraX * parallax;
  const firstIndex = Math.floor(offset / spacing) - 1;
  for (let i = firstIndex; i < firstIndex + CONFIG.VIEW_WIDTH / spacing + 3; i++) {
    const x = i * spacing - offset;
    const towerHeight = 150 + tileHash(i, 5) * 140;
    const towerWidth = 50 + tileHash(i, 6) * 30;
    const baseY = 440;
    ctx.fillStyle = '#1a1533';
    ctx.fillRect(x, baseY - towerHeight, towerWidth, towerHeight + 120);
    // Tejado puntiagudo
    ctx.beginPath();
    ctx.moveTo(x - 8, baseY - towerHeight);
    ctx.lineTo(x + towerWidth / 2, baseY - towerHeight - 60);
    ctx.lineTo(x + towerWidth + 8, baseY - towerHeight);
    ctx.fill();
    // Muralla entre torres
    ctx.fillRect(x + towerWidth, baseY - 90, spacing - towerWidth, 200);
    for (let j = 0; j < 4; j++) {
      ctx.fillRect(x + towerWidth + 6 + j * 30, baseY - 104, 16, 14);
    }
    // Ventana con luz parpadeante
    const flicker = 0.7 + Math.sin(time * 5 + i * 3) * 0.15;
    ctx.fillStyle = `rgba(255, 190, 80, ${flicker})`;
    ctx.fillRect(x + towerWidth / 2 - 5, baseY - towerHeight + 30, 10, 16);
    if (tileHash(i, 8) > 0.4) ctx.fillRect(x + towerWidth / 2 - 5, baseY - towerHeight + 80, 10, 16);
  }
}

/* ===================== Elementos interactivos del nivel ===================== */

/** Plataforma que se mueve de forma continua (horizontal o vertical). */
class MovingPlatform {
  constructor(x, y, width, axis) {
    this.originX = x;
    this.originY = y;
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = 18;
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

  draw(ctx, theme) {
    drawPlatformShape(ctx, this.x, this.y, this.w, this.h, theme, true);
  }
}

/** Plataforma que tiembla y cae poco después de pisarla; reaparece más tarde. */
class CrumblingPlatform {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = 18;
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
      this.fallOffset += 400 * dt;
      if (this.timer <= 0) {
        this.state = 'idle';
        this.active = true;
        this.fallOffset = 0;
      }
    }
  }

  draw(ctx, theme) {
    if (this.state === 'fallen' && this.fallOffset > 300) return;
    const shake = this.state === 'shaking' ? (Math.random() - 0.5) * 4 : 0;
    ctx.save();
    if (this.state === 'fallen') ctx.globalAlpha = Math.max(0, 1 - this.fallOffset / 300);
    const x = this.x + shake;
    const y = this.y + this.fallOffset;
    drawPlatformShape(ctx, x, y, this.w, this.h, theme, false);
    // Grietas
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let crackX = x + 12; crackX < x + this.w - 6; crackX += 22) {
      ctx.moveTo(crackX, y + 2);
      ctx.lineTo(crackX + 4, y + 8);
      ctx.lineTo(crackX - 2, y + 16);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Dibuja una plataforma flotante con el estilo del tema. */
function drawPlatformShape(ctx, x, y, w, h, theme, isMoving) {
  ctx.fillStyle = theme.platform;
  roundedRectPath(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3, y + h - 5, w - 6, 4);
  ctx.fillStyle = theme.platformTop;
  roundedRectPath(ctx, x, y, w, 6, 3);
  ctx.fill();
  // Separaciones entre tablones/piedras
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let seamX = x + CONFIG.TILE_SIZE; seamX < x + w; seamX += CONFIG.TILE_SIZE) {
    ctx.fillRect(seamX - 1, y + 6, 2, h - 8);
  }
  if (isMoving) {
    // Pequeñas flechas para indicar que se mueve
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 11); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 12, y + 14);
    ctx.moveTo(x + w - 6, y + 11); ctx.lineTo(x + w - 12, y + 8); ctx.lineTo(x + w - 12, y + 14);
    ctx.fill();
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
    const visibleHeight = this.h * (1 - this.openProgress);
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.w, this.h);
    ctx.clip();
    // La puerta se desliza hacia arriba al abrirse
    const top = this.y - (this.h - visibleHeight);
    ctx.fillStyle = '#7a4b23';
    ctx.fillRect(this.x + 2, top, this.w - 4, this.h);
    ctx.fillStyle = '#5c3615';
    for (let plankX = this.x + 10; plankX < this.x + this.w - 4; plankX += 9) {
      ctx.fillRect(plankX, top, 2, this.h);
    }
    ctx.fillStyle = '#3b3b48';
    ctx.fillRect(this.x + 2, top + 12, this.w - 4, 6);
    ctx.fillRect(this.x + 2, top + this.h - 20, this.w - 4, 6);
    // Cerradura dorada
    const lockY = top + this.h / 2;
    ctx.fillStyle = '#ffd23f';
    roundedRectPath(ctx, this.x + 10, lockY - 10, 20, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#3a2618';
    ctx.beginPath();
    ctx.arc(this.x + 20, lockY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(this.x + 19, lockY - 1, 2, 7);
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
    this.flameHeight = 110;
    this.hitbox = { x: x + 8, y: y - this.flameHeight, w: CONFIG.TILE_SIZE - 16, h: this.flameHeight };
  }

  get phaseTime() { return this.time % this.cycle; }
  get isWarning() { return this.phaseTime > 1.6 && this.phaseTime <= 2.1; }
  get isActive() { return this.phaseTime > 2.1; }

  update(dt) {
    this.time += dt;
  }

  draw(ctx, time) {
    // Bloque metálico con rejilla
    ctx.fillStyle = '#4a4458';
    ctx.fillRect(this.x, this.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    ctx.fillStyle = '#1e1a28';
    for (let i = 0; i < 4; i++) ctx.fillRect(this.x + 6 + i * 8, this.y + 4, 4, 10);
    ctx.fillStyle = this.isWarning || this.isActive ? '#ff7b00' : '#7a2e00';
    ctx.fillRect(this.x + 4, this.y + 16, CONFIG.TILE_SIZE - 8, 4);

    const centerX = this.x + CONFIG.TILE_SIZE / 2;
    if (this.isWarning) {
      // Aviso: pequeñas chispas antes de que salga el fuego
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#ffd23f' : '#ff7b00';
        ctx.beginPath();
        ctx.arc(centerX + Math.sin(time * 30 + i * 2) * 8, this.y - 4 - i * 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.isActive) {
      const flicker = Math.sin(time * 40) * 6;
      const gradient = ctx.createLinearGradient(0, this.y, 0, this.y - this.flameHeight);
      gradient.addColorStop(0, '#fff3b0');
      gradient.addColorStop(0.3, '#ffb703');
      gradient.addColorStop(0.7, '#fb5607');
      gradient.addColorStop(1, 'rgba(230, 57, 70, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(this.x + 6, this.y);
      ctx.quadraticCurveTo(centerX - 20 + flicker, this.y - this.flameHeight * 0.5, centerX, this.y - this.flameHeight - flicker);
      ctx.quadraticCurveTo(centerX + 20 - flicker, this.y - this.flameHeight * 0.5, this.x + CONFIG.TILE_SIZE - 6, this.y);
      ctx.closePath();
      ctx.fill();
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
    const centerX = this.x + 20;
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(centerX - 3, this.y + 14, 6, 26);
    ctx.fillStyle = '#c68b59';
    roundedRectPath(ctx, centerX - 16, this.y + 2, 32, 20, 3);
    ctx.fill();
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', centerX, this.y + 17);
  }

  /** Bocadillo con el texto del cartel (se dibuja encima de todo). */
  drawBubble(ctx, cameraX) {
    const maxWidth = 280;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    const lines = wrapText(ctx, this.text, maxWidth - 24);
    const bubbleWidth = maxWidth;
    const bubbleHeight = lines.length * 20 + 18;
    let bubbleX = this.x + 20 - bubbleWidth / 2;
    // Evitamos que el bocadillo se salga de la pantalla
    bubbleX = clamp(bubbleX, cameraX + 8, cameraX + CONFIG.VIEW_WIDTH - bubbleWidth - 8);
    const bubbleY = this.y - bubbleHeight - 16;

    ctx.fillStyle = 'rgba(255, 248, 235, 0.96)';
    ctx.strokeStyle = '#6b3f1d';
    ctx.lineWidth = 3;
    roundedRectPath(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 248, 235, 0.96)';
    ctx.beginPath();
    ctx.moveTo(this.x + 12, bubbleY + bubbleHeight - 2);
    ctx.lineTo(this.x + 20, bubbleY + bubbleHeight + 10);
    ctx.lineTo(this.x + 28, bubbleY + bubbleHeight - 2);
    ctx.fill();
    ctx.fillStyle = '#3a2618';
    ctx.textAlign = 'left';
    lines.forEach((line, index) => {
      ctx.fillText(line, bubbleX + 12, bubbleY + 24 + index * 20);
    });
  }
}

/** Divide un texto en líneas que quepan en un ancho máximo. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Bandera de control: al tocarla, el jugador reaparecerá aquí. */
class Checkpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.activated = false;
    this.hitbox = { x: x + 4, y: y - 60, w: 32, h: 100 };
    this.raise = 0;
  }

  get respawnPoint() {
    return { x: this.x + 7, y: this.y + CONFIG.TILE_SIZE - 32 };
  }

  update(dt) {
    if (this.activated) this.raise = Math.min(1, this.raise + dt * 2);
  }

  draw(ctx, time) {
    const poleX = this.x + 18;
    const groundY = this.y + CONFIG.TILE_SIZE;
    ctx.fillStyle = '#d9d9d9';
    ctx.fillRect(poleX, groundY - 80, 4, 80);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(poleX + 2, groundY - 82, 4, 0, Math.PI * 2);
    ctx.fill();
    // La bandera sube al activarse y cambia de color
    const flagY = groundY - 30 - this.raise * 44;
    const wave = Math.sin(time * 6) * 3;
    ctx.fillStyle = this.activated ? '#4caf50' : '#9e9e9e';
    ctx.beginPath();
    ctx.moveTo(poleX + 4, flagY);
    ctx.quadraticCurveTo(poleX + 16, flagY + wave, poleX + 30, flagY + 8);
    ctx.lineTo(poleX + 4, flagY + 18);
    ctx.closePath();
    ctx.fill();
    if (this.activated) {
      drawHeart(ctx, poleX + 13, flagY + 9, 4, '#ffffff');
    }
  }
}

/** Bandera de meta al final del nivel. */
class Goal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hitbox = { x: x + 8, y: y - 160, w: 24, h: 200 };
    this.reached = false;
  }

  draw(ctx, time) {
    const poleX = this.x + 18;
    const groundY = this.y + CONFIG.TILE_SIZE;
    ctx.fillStyle = '#5c3a24';
    ctx.fillRect(poleX - 8, groundY - 10, 20, 10);
    ctx.fillStyle = '#f1f1f1';
    ctx.fillRect(poleX, groundY - 180, 5, 170);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(poleX + 2.5, groundY - 184, 7, 0, Math.PI * 2);
    ctx.fill();
    const flagTop = groundY - 176 + (this.reached ? 120 : 0);
    const wave = Math.sin(time * 5) * 4;
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.moveTo(poleX + 5, flagTop);
    ctx.quadraticCurveTo(poleX + 30, flagTop - 6 + wave, poleX + 56, flagTop + 4 + wave);
    ctx.quadraticCurveTo(poleX + 32, flagTop + 22 - wave, poleX + 5, flagTop + 38);
    ctx.closePath();
    ctx.fill();
    // Huellita de gato en la bandera
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(poleX + 24, flagTop + 21, 5, 0, Math.PI * 2);
    ctx.arc(poleX + 18, flagTop + 13, 2.2, 0, Math.PI * 2);
    ctx.arc(poleX + 24, flagTop + 11, 2.2, 0, Math.PI * 2);
    ctx.arc(poleX + 30, flagTop + 13, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * La jaula donde está encerrada Luna. Cuando el jefe es derrotado, la
 * jaula se abre, Luna baja al suelo y corre hacia Milo.
 */
class LunaCage {
  constructor(x, y) {
    this.cageX = x + 20;  // centro de la jaula
    this.cageY = y;       // parte superior de la jaula
    this.cageWidth = 56;
    this.cageHeight = 64;
    this.doorAngle = 0;
    this.opened = false;
    this.time = 0;
    // Luna como pequeño personaje con física
    this.luna = {
      x: this.cageX - 13, y: this.cageY + this.cageHeight - 36, w: 26, h: 32,
      vx: 0, vy: 0, onGround: false, facing: -1, free: false, reachedMilo: false, pose: 'scared'
    };
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    this.luna.free = true;
    this.luna.vy = -420;
    this.luna.vx = -120;
  }

  update(dt, game) {
    this.time += dt;
    if (this.opened) this.doorAngle = Math.min(Math.PI * 0.6, this.doorAngle + dt * 3);
    const luna = this.luna;
    if (!luna.free) {
      luna.pose = 'scared';
      return;
    }
    // Luna cae y camina hasta Milo
    const player = game.player;
    const distance = player.centerX - (luna.x + luna.w / 2);
    if (luna.onGround) {
      if (Math.abs(distance) > 40) {
        luna.facing = Math.sign(distance);
        luna.vx = luna.facing * 240;
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
    luna.walkCycle = (luna.walkCycle || 0) + Math.abs(luna.vx) * dt * 0.06;
  }

  draw(ctx) {
    const left = this.cageX - this.cageWidth / 2;
    // Cadena que sujeta la jaula
    ctx.strokeStyle = '#8d8d99';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.cageX, 0);
    ctx.lineTo(this.cageX, this.cageY);
    ctx.stroke();

    // Luna (detrás de los barrotes si sigue encerrada)
    const luna = this.luna;
    drawCat(ctx, luna.x + luna.w / 2, luna.y + luna.h, {
      style: 'luna', facing: luna.facing, pose: luna.pose, time: this.time, walkCycle: luna.walkCycle || 0
    });

    // Jaula
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, this.cageY + 14);
    ctx.quadraticCurveTo(this.cageX, this.cageY - 12, left + this.cageWidth, this.cageY + 14);
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(left - 2, this.cageY + this.cageHeight - 4, this.cageWidth + 4, 6);
    ctx.fillRect(left - 2, this.cageY + 12, this.cageWidth + 4, 4);
    for (let i = 1; i < 6; i++) {
      const barX = left + (i * this.cageWidth) / 6;
      if (this.opened && i <= 2) continue; // la puerta ya está abierta
      ctx.fillRect(barX - 1.5, this.cageY + 14, 3, this.cageHeight - 16);
    }
    if (this.opened) {
      // Puerta abierta girando sobre su bisagra
      ctx.save();
      ctx.translate(left, this.cageY + 14);
      ctx.rotate(-this.doorAngle);
      ctx.fillRect(this.cageWidth / 6 - 1.5, 0, 3, this.cageHeight - 16);
      ctx.fillRect((2 * this.cageWidth) / 6 - 1.5, 0, 3, this.cageHeight - 16);
      ctx.restore();
    }
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
    this.theme = THEMES[data.theme];
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
    this.playerStart = { x: 80, y: 300 };

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

  /** Comprueba si un enemigo que camina está a punto de caerse o de pisar pinchos. */
  isEdgeAhead(entity) {
    const T = CONFIG.TILE_SIZE;
    const probeX = entity.facing > 0 ? entity.x + entity.w + 2 : entity.x - 2;
    const col = Math.floor(probeX / T);
    const footRow = Math.floor((entity.y + entity.h - 1) / T);
    const belowRow = Math.floor((entity.y + entity.h + 2) / T);
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
              this.solids.push({ x, y, w: length * T, h: 18, oneWay: true, active: true, isPlatform: true });
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
            this.spikes.push({ x: x + 4, y: y + 22, w: T - 8, h: 18, tileX: x, tileY: y });
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
            this.playerStart = { x: x + 7, y: y + T - 32 };
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

  drawBackground(ctx, camera, time) {
    drawThemeBackground(ctx, this.themeName, camera.x, time);
  }

  /** Dibuja las casillas de terreno visibles (solo las que están en pantalla). */
  drawTerrain(ctx, camera, time) {
    const T = CONFIG.TILE_SIZE;
    const firstCol = Math.max(0, Math.floor(camera.x / T) - 1);
    const lastCol = Math.min(this.cols - 1, Math.ceil((camera.x + camera.width) / T) + 1);

    // Los precipicios sin fondo se oscurecen para que se vea que son peligrosos
    const bottomRow = this.rows - 1;
    for (let col = firstCol; col <= lastCol; col++) {
      const bottomTile = this.map[bottomRow][col];
      if (bottomTile === '#' || bottomTile === 'J' || bottomTile === 'L') continue;
      const chasm = ctx.createLinearGradient(0, this.height - 150, 0, this.height);
      chasm.addColorStop(0, 'rgba(15, 8, 30, 0)');
      chasm.addColorStop(1, 'rgba(15, 8, 30, 0.85)');
      ctx.fillStyle = chasm;
      ctx.fillRect(col * T, this.height - 150, T, 150);
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        if (this.map[row][col] !== '#') continue;
        this.drawGroundTile(ctx, col, row);
      }
    }

    // Lava animada
    for (const lava of this.lavaTiles) {
      if (!camera.isVisible(lava.x, lava.y, lava.w, lava.h)) continue;
      ctx.fillStyle = '#d62828';
      ctx.fillRect(lava.x, lava.y, lava.w, lava.h);
      if (lava.isSurface) {
        const wave = Math.sin(time * 3 + lava.x * 0.05) * 3;
        ctx.fillStyle = '#f77f00';
        ctx.fillRect(lava.x, lava.y + 4 + wave, lava.w, 10);
        ctx.fillStyle = '#fcbf49';
        ctx.fillRect(lava.x, lava.y + wave, lava.w, 5);
        // Burbujas
        const bubblePhase = (time * 0.8 + tileHash(lava.x, 1)) % 1;
        ctx.fillStyle = '#fcbf49';
        ctx.beginPath();
        ctx.arc(lava.x + 10 + tileHash(lava.x, 2) * 20, lava.y + 20 - bubblePhase * 20, 3 * (1 - bubblePhase), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pinchos
    for (const spike of this.spikes) {
      if (!camera.isVisible(spike.tileX, spike.tileY, T, T)) continue;
      ctx.fillStyle = '#c0c4d6';
      ctx.strokeStyle = '#6b6f80';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const spikeX = spike.tileX + i * 10;
        ctx.beginPath();
        ctx.moveTo(spikeX, spike.tileY + T);
        ctx.lineTo(spikeX + 5, spike.tileY + T - 18);
        ctx.lineTo(spikeX + 10, spike.tileY + T);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /** Dibuja una casilla de suelo según el tema del nivel. */
  drawGroundTile(ctx, col, row) {
    const T = CONFIG.TILE_SIZE;
    const x = col * T;
    const y = row * T;
    const theme = this.theme;
    const solidAbove = this.tileAt(col, row - 1) === '#';
    const hash = tileHash(col, row);

    ctx.fillStyle = theme.ground;
    ctx.fillRect(x, y, T, T);

    if (this.themeName === 'castle') {
      // Ladrillos
      ctx.fillStyle = theme.groundDark;
      ctx.fillRect(x, y + 19, T, 2);
      ctx.fillRect(x, y + 39, T, 1);
      const brickOffset = row % 2 === 0 ? 0 : 20;
      ctx.fillRect(x + brickOffset, y, 2, 19);
      ctx.fillRect(x + ((brickOffset + 20) % 40), y + 21, 2, 18);
      if (hash > 0.8) {
        ctx.fillStyle = 'rgba(120, 200, 120, 0.25)'; // musgo
        ctx.fillRect(x + 6, y + 24, 12, 6);
      }
    } else {
      // Tierra o roca con pequeñas manchas
      ctx.fillStyle = theme.groundDark;
      ctx.beginPath();
      ctx.arc(x + 8 + hash * 20, y + 12 + hash * 14, 3 + hash * 2, 0, Math.PI * 2);
      ctx.arc(x + 28 - hash * 10, y + 30 - hash * 8, 2 + hash * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!solidAbove) {
      // Borde superior: césped, nieve o piedra según el tema
      ctx.fillStyle = theme.groundTopDark;
      ctx.fillRect(x, y, T, 12);
      ctx.fillStyle = theme.groundTop;
      ctx.fillRect(x, y, T, 8);
      if (this.themeName === 'forest') {
        ctx.fillStyle = theme.groundTop;
        for (let i = 0; i < 4; i++) {
          const bladeX = x + 4 + i * 10 + hash * 4;
          ctx.beginPath();
          ctx.moveTo(bladeX, y);
          ctx.lineTo(bladeX + 3, y - 5 - ((hash * 10 + i) % 3));
          ctx.lineTo(bladeX + 6, y);
          ctx.fill();
        }
      } else if (this.themeName === 'mountains') {
        // Gotas de nieve
        ctx.beginPath();
        ctx.arc(x + 10 + hash * 15, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Sombra en los laterales expuestos
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    if (this.tileAt(col - 1, row) !== '#') ctx.fillRect(x, y, 3, T);
    if (this.tileAt(col + 1, row) !== '#') ctx.fillRect(x + T - 3, y, 3, T);
  }

  /** Decoración que va detrás de los personajes (árboles, flores, rocas, antorchas). */
  drawDecorations(ctx, camera, time) {
    for (const deco of this.decorations) {
      if (!camera.isVisible(deco.x - 60, deco.y - 140, 160, 200)) continue;
      const groundY = deco.y + CONFIG.TILE_SIZE;
      const centerX = deco.x + 20;
      switch (deco.type) {
        case 'T':
          if (this.themeName === 'mountains') this.drawPineTree(ctx, centerX, groundY, deco.seed);
          else this.drawRoundTree(ctx, centerX, groundY, deco.seed, time);
          break;
        case 'f': {
          const colors = ['#ff6b9a', '#ffd23f', '#a06cd5', '#ffffff'];
          for (let i = 0; i < 3; i++) {
            const flowerX = centerX - 12 + i * 12;
            const sway = Math.sin(time * 2 + i + deco.seed * 5) * 2;
            ctx.strokeStyle = '#3f9a33';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(flowerX, groundY);
            ctx.lineTo(flowerX + sway, groundY - 12 - i * 2);
            ctx.stroke();
            ctx.fillStyle = colors[(i + Math.floor(deco.seed * 4)) % colors.length];
            ctx.beginPath();
            ctx.arc(flowerX + sway, groundY - 14 - i * 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd23f';
            ctx.beginPath();
            ctx.arc(flowerX + sway, groundY - 14 - i * 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'r':
          ctx.fillStyle = '#8d8a99';
          ctx.beginPath();
          ctx.ellipse(centerX, groundY - 10, 20, 13, 0, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#a9a6b6';
          ctx.beginPath();
          ctx.ellipse(centerX - 5, groundY - 15, 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8d8a99';
          ctx.fillRect(centerX - 20, groundY - 10, 40, 10);
          break;
        case 'b':
          ctx.fillStyle = '#3f9a33';
          ctx.beginPath();
          ctx.arc(centerX - 12, groundY - 10, 12, 0, Math.PI * 2);
          ctx.arc(centerX + 2, groundY - 16, 15, 0, Math.PI * 2);
          ctx.arc(centerX + 16, groundY - 9, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff6b9a';
          ctx.beginPath();
          ctx.arc(centerX - 6, groundY - 18, 2.5, 0, Math.PI * 2);
          ctx.arc(centerX + 10, groundY - 22, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'x':
          this.drawTorch(ctx, centerX, deco.y + 20, time, deco.seed);
          break;
        default:
          break;
      }
    }
  }

  drawRoundTree(ctx, x, groundY, seed, time) {
    const height = 90 + seed * 40;
    ctx.fillStyle = '#7a4b23';
    ctx.fillRect(x - 7, groundY - height * 0.6, 14, height * 0.6);
    const sway = Math.sin(time * 1.5 + seed * 10) * 2;
    ctx.fillStyle = '#3f9a33';
    ctx.beginPath();
    ctx.arc(x + sway, groundY - height * 0.75, 34, 0, Math.PI * 2);
    ctx.arc(x - 26 + sway, groundY - height * 0.58, 24, 0, Math.PI * 2);
    ctx.arc(x + 26 + sway, groundY - height * 0.58, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5cbf4a';
    ctx.beginPath();
    ctx.arc(x - 8 + sway, groundY - height * 0.82, 18, 0, Math.PI * 2);
    ctx.fill();
    // Algunas manzanas rojas
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(x + 14 + sway, groundY - height * 0.66, 4, 0, Math.PI * 2);
    ctx.arc(x - 20 + sway, groundY - height * 0.55, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPineTree(ctx, x, groundY, seed) {
    const height = 100 + seed * 40;
    ctx.fillStyle = '#5c3a24';
    ctx.fillRect(x - 5, groundY - 24, 10, 24);
    for (let i = 0; i < 3; i++) {
      const layerY = groundY - 20 - i * (height / 4);
      const layerWidth = 34 - i * 8;
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.moveTo(x - layerWidth, layerY);
      ctx.lineTo(x, layerY - height / 2.5);
      ctx.lineTo(x + layerWidth, layerY);
      ctx.closePath();
      ctx.fill();
      // Nieve en las ramas
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.moveTo(x - layerWidth * 0.35, layerY - height / 2.5 + height / 2.5 * 0.65);
      ctx.lineTo(x, layerY - height / 2.5);
      ctx.lineTo(x + layerWidth * 0.35, layerY - height / 2.5 + height / 2.5 * 0.65);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawTorch(ctx, x, y, time, seed) {
    const flicker = Math.sin(time * 18 + seed * 20) * 2;
    const glow = ctx.createRadialGradient(x, y - 10, 2, x, y - 10, 70);
    glow.addColorStop(0, 'rgba(255, 170, 60, 0.35)');
    glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 70, y - 80, 140, 140);
    ctx.fillStyle = '#5c3a24';
    ctx.fillRect(x - 3, y - 4, 6, 18);
    ctx.fillStyle = '#3b3b48';
    ctx.fillRect(x - 7, y - 6, 14, 5);
    ctx.fillStyle = '#fb5607';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 6);
    ctx.quadraticCurveTo(x - 6, y - 20 - flicker, x, y - 26 - flicker);
    ctx.quadraticCurveTo(x + 6, y - 20 + flicker, x + 7, y - 6);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 6);
    ctx.quadraticCurveTo(x, y - 18 - flicker, x + 3, y - 6);
    ctx.fill();
  }

  /** Plataformas, puertas, trampas, carteles y banderas. */
  drawObjects(ctx, camera, time) {
    for (const solid of this.solids) {
      if (!solid.isPlatform || !camera.isVisible(solid.x, solid.y, solid.w, solid.h)) continue;
      drawPlatformShape(ctx, solid.x, solid.y, solid.w, solid.h, this.theme, false);
    }
    for (const platform of this.movingPlatforms) platform.draw(ctx, this.theme);
    for (const platform of this.crumblingPlatforms) platform.draw(ctx, this.theme);
    for (const door of this.doors) door.draw(ctx);
    for (const trap of this.fireTraps) {
      if (camera.isVisible(trap.x, trap.y - 120, 40, 160)) trap.draw(ctx, time);
    }
    for (const sign of this.signs) sign.draw(ctx);
    for (const checkpoint of this.checkpoints) checkpoint.draw(ctx, time);
    if (this.goal) this.goal.draw(ctx, time);

    // Barrera mágica de la sala del jefe
    if (this.arena && this.arena.barrier.active) {
      const barrier = this.arena.barrier;
      ctx.fillStyle = 'rgba(157, 78, 221, 0.35)';
      ctx.fillRect(barrier.x, barrier.y, barrier.w, barrier.h);
      ctx.fillStyle = '#9d4edd';
      for (let barY = 0; barY < barrier.h; barY += 20) {
        ctx.fillRect(barrier.x + 6 + Math.sin(time * 4 + barY) * 3, barY, 4, 14);
        ctx.fillRect(barrier.x + 26 + Math.cos(time * 4 + barY) * 3, barY + 6, 4, 14);
      }
    }
  }
}
