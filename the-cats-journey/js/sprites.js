/* =====================================================================
   sprites.js - Pixel art de personajes, enemigos y objetos
   ---------------------------------------------------------------------
   Todo el arte está "pintado" aquí como rejillas de texto: cada
   carácter es un píxel y la paleta indica su color. Al arrancar, el
   juego convierte estas rejillas en imágenes (Sprite).

   Para los personajes se dibujan PIEZAS (cabeza, cuerpo, patas, cola)
   y el código las combina en cada fotograma de animación. Así, una
   sola cabeza sirve para todas las poses y las animaciones son suaves.
   ===================================================================== */
'use strict';

/* =============================== Gatos =============================== */

// Paletas: misma rejilla, distintos colores -> Milo (atigrado naranja) y Luna (gatita blanca)
const CAT_PALETTES = {
  milo: {
    O: '#3d1c10', D: '#9c4419', b: '#d8692c', B: '#f28c3a', L: '#ffb562', Y: '#ffd99a',
    S: '#b24e1d', W: '#fff4e4', w: '#e9cfb2', P: '#ff9bb0', p: '#d8607e', N: '#ff6f91',
    K: '#1d1228', E: '#4cc77a', e: '#2b8d55', H: '#ffffff', C: '#ff9a8a', R: null, r: null
  },
  luna: {
    O: '#4a3b66', D: '#a99cc4', b: '#cfc6e3', B: '#f3f0fa', L: '#ffffff', Y: '#ffffff',
    S: '#f3f0fa', W: '#ffffff', w: '#e4def2', P: '#ffa6c3', p: '#e0739b', N: '#ff7aa2',
    K: '#1d1228', E: '#4ea6ff', e: '#2a64c9', H: '#ffffff', C: '#ffb0c4', R: '#ff4f9a', r: '#b8236a'
  }
};

// Cabeza de frente (17x15). Los ojos se sustituyen según la expresión.
const CAT_HEAD = `
..O...........O..
.OLO.........ODO.
.OLPO.......OPbO.
.OLPPO.....OPPbO.
OLBPPBOOOOOBPPBbO
OLBBBBBBSBBBBBBbO
OLBBBBSBSBSBBBBbO
OLBBBBBBBBBBBBBbO
OLBB...BBB...BBbO
OBBB...BBB...BbbO
ObCC...WWW...CCbO
ObBBBWWWNWWWBBBbO
.ObbBWWOWOWWBbbO.
..ObbbWWWWWbbbO..
...OOOOOOOOOOO...
`;

// Ojos (3x3): izquierdo y derecho para cada expresión. "B" = color base del gato.
const CAT_EYES = {
  normal: ['HKK/KKK/EEe', 'HKK/KKK/EEe'],
  blink: ['BBB/OOO/BBB', 'BBB/OOO/BBB'],
  happy: ['BOB/OBO/BBB', 'BOB/OBO/BBB'],
  hurt: ['OOB/BBO/OOB', 'BOO/OBB/BOO'],
  wide: ['WWW/WKW/WWW', 'WWW/WKW/WWW'],
  lunaNormal: ['OKK/HKK/EEe', 'KKO/HKK/EEe'],
  lunaBlink: ['OBB/OOO/BBB', 'BBO/OOO/BBB']
};

// Lazo de Luna (se pinta sobre la oreja izquierda)
const CAT_BOW = `
RR.RR
RrRrR
.RRR.
RrRrR
`;

// Cuerpo de lado sin patas (20x8)
const CAT_BODY = `
...OOOOOOOOOOOO.....
..OLLBSBBSBBSBBOO...
.OLBBBSBBSBBSBBBBO..
.OLBBBBBBBBBBBBBBbO.
.OBBBBBBBBBBBBBBBbO.
.ObBBBBBBBWWWWWWbbO.
..ObbbbbbWwwwwwwbO..
...OOOOOOOOOOOOOO...
`;

// Cuerpo sentado (14x12) para las escenas de historia
const CAT_BODY_SIT = `
....OOOOOO....
...OLBBSBBO...
..OLBBSBBBBO..
.OLBBBBBBBBbO.
.OLBBBWWWBBbO.
.OBBBWWWWWBbO.
OLBBBWwwwWBbbO
OBBBBWwwwWBbbO
ObBBBWWWWWbbbO
ObbOWWOWWOObbO
.OOOWWOWWOOOO.
....OO.OO.....
`;

// Una pata (4x5)
const CAT_LEG = `
OBbO
OBbO
OBbO
OWwO
.OO.
`;

// Colas: arriba (dos posiciones para balancearse), hacia atrás (correr) y erizada (susto)
const CAT_TAILS = {
  up1: `
.OO.....
OLSO....
OBBO....
OSBO....
.OBO....
.OBBO...
..OBO...
..OBBO..
...OBBOO
....OBBO
.....OOO
`,
  up2: `
...OO...
..OLSO..
..OBBO..
.OSBO...
.OBO....
.OBBO...
..OBO...
..OBBO..
...OBBOO
....OBBO
.....OOO
`,
  back: `
...........
...........
...........
...........
...........
OOO........
OLSOOOO....
OBBSBBBOOO.
.OOOOOBBBBO
......OOOOO
...........
`,
  high: `
.OO.....
OLSO....
OBBO....
OSBO....
OBBO....
OSBO....
.OBO....
.OBBO...
..OBBOO.
...OBBBO
....OOOO
`
};

// Pata delantera levantada (victoria / saludo)
const CAT_PAW_UP = `
.OO.
OWWO
OBBO
OBbO
OBbO
`;

/** Paleta de las patas "lejanas": más oscuras para dar profundidad. */
function farLegPalette(palette) {
  return { ...palette, B: palette.b, b: palette.D, W: palette.w, w: palette.D };
}

/** Pinta los ojos de una expresión sobre la cabeza. */
function paintCatEyes(head, palette, expression) {
  const eyes = CAT_EYES[expression];
  const positions = [[4, 8], [10, 8]];
  eyes.forEach((pattern, index) => {
    const [ox, oy] = positions[index];
    pattern.split('/').forEach((row, y) => {
      [...row].forEach((character, x) => {
        const color = palette[character];
        if (color) head.set(ox + x, oy + y, color);
      });
    });
  });
}

/**
 * Construye todas las animaciones de un gato.
 * Devuelve { idle: [Sprite...], walk: [...], run: [...], jump, fall, hurt, victory, sit, scared }
 */
function buildCatSprites(styleName) {
  const palette = CAT_PALETTES[styleName];
  const isLuna = styleName === 'luna';
  const FRAME_W = 34;
  const FRAME_H = 28;
  const ANCHOR_X = 16;

  const makeHead = (expression) => {
    const head = gridToBuffer(CAT_HEAD, palette);
    let eyeStyle = expression;
    if (isLuna && expression === 'normal') eyeStyle = 'lunaNormal';
    if (isLuna && expression === 'blink') eyeStyle = 'lunaBlink';
    paintCatEyes(head, palette, eyeStyle);
    if (isLuna) head.blit(gridToBuffer(CAT_BOW, palette), 0, 0);
    return head;
  };

  const body = gridToBuffer(CAT_BODY, palette);
  const nearLeg = gridToBuffer(CAT_LEG, palette);
  const farLeg = gridToBuffer(CAT_LEG, farLegPalette(palette));
  const tails = {};
  for (const [name, grid] of Object.entries(CAT_TAILS)) tails[name] = gridToBuffer(grid, palette);
  const heads = {};
  for (const expression of ['normal', 'blink', 'happy', 'hurt', 'wide']) heads[expression] = makeHead(expression);

  /**
   * Monta un fotograma.
   * legs: [[dx, dy] x4] desplazamiento de cada pata (trasera lejana, delantera lejana, trasera cercana, delantera cercana)
   */
  const compose = ({ legs, bodyY = 0, headX = 0, headY = 0, tail = 'up1', tailY = 0, expression = 'normal', pawUp = false }) => {
    const frame = new PixelBuffer(FRAME_W, FRAME_H);
    const bodyX = 6;
    const baseY = 15 + bodyY;
    const legY = baseY + 6;
    const [backFar, frontFar, backNear, frontNear] = legs;
    // Orden de dibujo: cola y patas lejanas detrás, cabeza delante
    frame.blit(tails[tail], tail === 'back' ? -2 : 0, 6 + bodyY + tailY);
    frame.blit(farLeg, bodyX + 5 + backFar[0], legY + backFar[1]);
    frame.blit(farLeg, bodyX + 15 + frontFar[0], legY + frontFar[1]);
    frame.blit(body, bodyX, baseY);
    frame.blit(nearLeg, bodyX + 2 + backNear[0], legY + backNear[1]);
    frame.blit(nearLeg, bodyX + 12 + frontNear[0], legY + frontNear[1]);
    frame.blit(heads[expression], 16 + headX, 2 + bodyY + headY);
    if (pawUp) frame.blit(gridToBuffer(CAT_PAW_UP, palette), 29, 9 + bodyY);
    return new Sprite(frame.toCanvas(), ANCHOR_X, FRAME_H - 2);
  };

  const standing = [[0, 0], [0, 0], [0, 0], [0, 0]];
  const sprites = {};

  sprites.idle = [
    compose({ legs: standing, tail: 'up1' }),
    compose({ legs: standing, tail: 'up2', headY: 0 }),
    compose({ legs: standing, tail: 'up2', expression: 'blink' })
  ];

  // Ciclo de andar: las patas se mueven en parejas opuestas siguiendo una onda
  const cycle = (frames, stride, lift, bob, tail) => {
    const result = [];
    for (let i = 0; i < frames; i++) {
      const phase = (i / frames) * Math.PI * 2;
      const step = (offset) => {
        const s = Math.sin(phase + offset);
        const raised = Math.cos(phase + offset) > 0.2 ? -lift : 0;
        return [Math.round(s * stride), raised];
      };
      const bodyBob = Math.abs(Math.sin(phase)) > 0.7 ? -bob : 0;
      result.push(compose({
        legs: [step(Math.PI), step(0), step(0), step(Math.PI)],
        bodyY: bodyBob, tail: tail === 'up' ? (i % 2 ? 'up1' : 'up2') : tail
      }));
    }
    return result;
  };
  sprites.walk = cycle(6, 2, 1, 1, 'up');
  sprites.run = cycle(6, 3, 2, 1, 'back');

  sprites.jump = [compose({ legs: [[-2, -2], [2, -3], [-2, -2], [2, -3]], tail: 'back', headY: -1 })];
  sprites.fall = [compose({ legs: [[1, 1], [-1, 1], [1, 1], [-1, 1]], tail: 'high', expression: 'wide', tailY: -2 })];
  sprites.hurt = [compose({ legs: [[-1, -1], [1, 0], [-1, -1], [1, 0]], tail: 'high', expression: 'hurt', headX: -1 })];
  sprites.victory = [
    compose({ legs: standing, tail: 'up1', expression: 'happy', pawUp: true }),
    compose({ legs: standing, tail: 'up2', expression: 'happy', pawUp: true, bodyY: -1 })
  ];
  sprites.scared = [compose({ legs: [[1, 0], [-1, 0], [1, 0], [-1, 0]], tail: 'high', expression: 'wide' })];

  // Sentado: cuerpo distinto, cabeza encima
  const sit = (expression) => {
    const frame = new PixelBuffer(FRAME_W, FRAME_H);
    frame.blit(tails.up1, 2, 8);
    frame.blit(gridToBuffer(CAT_BODY_SIT, palette), 7, 14);
    frame.blit(heads[expression], 7, 1);
    return new Sprite(frame.toCanvas(), ANCHOR_X, FRAME_H - 2);
  };
  sprites.sit = [sit('normal'), sit('normal'), sit('blink')];
  sprites.sitHappy = [sit('happy')];
  return sprites;
}

/* ============================== Enemigos ============================== */

/** Crea un sprite a partir de una rejilla, anclado en el centro de su borde inferior. */
function spriteFromGrid(grid, palette, anchorX = null, anchorY = null) {
  const buffer = gridToBuffer(grid, palette);
  return new Sprite(buffer.toCanvas(), anchorX === null ? Math.floor(buffer.width / 2) : anchorX,
    anchorY === null ? buffer.height : anchorY);
}

/** Slime: gota de gelatina sombreada por código (3 fotogramas: normal, aplastado, estirado). */
function buildSlimeSprites() {
  const ramp = ['#1d5a2a', '#2e8a3d', '#45ad4e', '#6fcf67', '#a8ef93'];
  const shapes = [[8.5, 6.5], [9.5, 5.5], [7.5, 7.5]];
  return shapes.map(([rx, ry]) => {
    const buffer = new PixelBuffer(22, 18);
    const bottom = 16;
    buffer.shadedEllipse(11, bottom - ry + 1, rx, ry + 1, ramp);
    // Base plana: quitamos lo que sobresale por debajo
    for (let x = 0; x < 22; x++) buffer.set(x, bottom, 0);
    for (let x = 0; x < 22; x++) buffer.data[bottom * 22 + x] = 0;
    // Brillos y cara
    const top = Math.round(bottom - ry * 2 + 1);
    buffer.set(7, top + 2, '#ffffff'); buffer.set(8, top + 2, '#ffffff'); buffer.set(7, top + 3, '#d8ffd0');
    const eyeY = top + Math.round(ry * 0.9);
    for (const ex of [11, 15]) {
      buffer.set(ex, eyeY, '#10241a'); buffer.set(ex, eyeY + 1, '#10241a');
      buffer.set(ex - 1, eyeY, '#10241a'); buffer.set(ex - 1, eyeY + 1, '#10241a');
      buffer.set(ex - 1, eyeY, '#ffffff');
    }
    buffer.set(12, eyeY + 3, '#10241a'); buffer.set(13, eyeY + 3, '#10241a');
    buffer.outline('#0f3318');
    return new Sprite(buffer.toCanvas(), 11, 17);
  });
}

const MUSHROOM_PALETTE = {
  O: '#3a1414', R: '#e8433c', r: '#a8262a', L: '#ff7a63', W: '#fff3e0', w: '#e9c9b0',
  S: '#f7e3c4', s: '#d1ad84', K: '#1d1228', D: '#6b3a22', d: '#4a2716'
};
const MUSHROOM_CAP = `
.....OOOOOO.....
...OOLLRRRROO...
..OLLWWRRRRRRO..
.OLRWWWWRRWWRRO.
.OLRRWWRRRWWWRO.
ORRRRRRRRRRWRRrO
ORRWWRRRRRRRRRrO
OrRWWWRRRRRRrrrO
.OOOOOOOOOOOOOO.
`;
const MUSHROOM_FACE = `
...OSSSSSSSSO...
...OSOSSSSOSO...
...OSKOSSOKSO...
...OsKSSSSKsO...
...OsSSOOSSsO...
....OssssssO....
`;
const MUSHROOM_FEET = [`
..OOO....OOO....
.ODDdO..ODDdO...
.OOOOO..OOOOO...
`, `
...OOO..OOO.....
..ODDdOODDdO....
..OOOOOOOOOO....
`];

function buildMushroomSprites() {
  return MUSHROOM_FEET.map((feet) => spriteFromGrid(MUSHROOM_CAP + MUSHROOM_FACE + feet, MUSHROOM_PALETTE, 8, 18));
}

const BAT_PALETTE = {
  O: '#1e1030', B: '#6b45a8', b: '#4a2c7a', L: '#9a73d6', M: '#8a5cc7', m: '#5a3590',
  P: '#ff9bc0', E: '#ff3b5c', W: '#ffffff'
};
const BAT_BODY = `
.O.....O.
OPO...OPO
OPLOOOLPO
OBLBBBBBO
OBEBBBEBO
OBBBBBBbO
.ObWbWbO.
..OOOOO..
`;
const BAT_WINGS = [`
O......
OO.....
OmO....
OMmO...
OMMmOO.
.OMMMmO
..OMOMO
...O.O.
`, `
.......
.......
.......
OOO....
OMmOOO.
OMMMmmO
.OMOMMO
..O.OO.
`, `
.......
.......
.......
.....OO
....OmO
...OMmO
..OMMMO
.OMMMMO
OMOMOO.
OO.O...
`];

function buildBatSprites() {
  const body = gridToBuffer(BAT_BODY, BAT_PALETTE);
  return BAT_WINGS.map((wingGrid) => {
    const wing = gridToBuffer(wingGrid, BAT_PALETTE);
    const frame = new PixelBuffer(22, 14);
    frame.blit(wing, 0, 1);
    frame.blit(wing, 15, 1, true);
    frame.blit(body, 6, 3);
    return new Sprite(frame.toCanvas(), 11, 12);
  });
}

const GHOST_PALETTE = { O: '#33356a', W: '#eef1ff', w: '#b6bde6', L: '#ffffff', K: '#1d1228', P: '#ff9bc0' };
const GHOST_TOP = `
.....OOOOOO.....
...OOLLLWWWOO...
..OLLWWWWWWWWO..
.OLWWWWWWWWWWWO.
.OLWWWWKKWWKKWO.
OLWWWWWKKWWKKWWO
OLWWWWPWWWWWWPWO
OWWWWWWWWOOWWWwO
OWWWWWWWWOOWWWwO
OwWWWWWWWWWWWwwO
OwWWWWWWWWWWwwwO
OwwWWWWWWWWwwwwO
OwwwwwwwwwwwwwwO
`;
const GHOST_BOTTOMS = [`
OwOOwwOOwwOOwwO.
.O..OO..OO..OO..
`, `
OwwOOwwOOwwOOwO.
.OO..OO..OO..O..
`];

function buildGhostSprites() {
  return GHOST_BOTTOMS.map((bottom) => spriteFromGrid(GHOST_TOP + bottom, GHOST_PALETTE, 8, 15));
}

const BOAR_PALETTE = {
  O: '#2a160c', B: '#8f5d3b', b: '#6a4128', L: '#b07b52', M: '#4a2a18', m: '#6b3f25',
  P: '#eaa497', p: '#b8706a', T: '#fff6dc', K: '#1d1228', H: '#3a2418', E: '#1d1228'
};
const BOAR_BODY = `
......O.O.O.O.O...............
.....OMOMOMOMOMO..............
....OMMmMMmMMmMMOO.....OO.....
...OMMmMMmMMmMMMMMOO..OLbO....
..OLLMMMMMMMMMMMMMMBOOLLbO....
.OLLBBBBBBBBBBBBBBBBBBBBBBO...
.OLBBBBLBBBBBBBBBBBBBBBEBBBO..
OLBBBBBBBBBBBBBBBBBBBBBBBBBPO.
OLBBBBBBBBBBBBBBBBBBBBBBBBPPPO
OBBBBBBBBBBBBBBBBBBBBBTBBPpPpO
OBBBBBBBBBBBBBBBBBBBBBTTBBPPPO
ObBBBBBBBBBBBBBBBBBBBBBTTbbOO.
.ObbBBBBBBBBBBBBBBBBBbbbbbbO..
..ObbbbbbbbbbbbbbbbbbbbbbbO...
...OOOOOOOOOOOOOOOOOOOOOOO....
`;
const BOAR_LEG = `
ObbO
ObbO
OHHO
OOOO
`;

/** Jabalí: normal (2 pasos) y embistiendo (ojos rojos, 2 pasos rápidos). */
function buildBoarSprites() {
  const make = (palette, offsets) => {
    const body = gridToBuffer(BOAR_BODY, palette);
    const near = gridToBuffer(BOAR_LEG, palette);
    const far = gridToBuffer(BOAR_LEG, { ...palette, b: palette.O === '#2a160c' ? '#4a2c1a' : palette.b });
    const frame = new PixelBuffer(31, 19);
    const [a, b] = offsets;
    frame.blit(far, 7 + b, 14);
    frame.blit(far, 20 + a, 14);
    frame.blit(body, 0, 0);
    frame.blit(near, 4 + a, 14);
    frame.blit(near, 17 + b, 14);
    return new Sprite(frame.toCanvas(), 14, 18);
  };
  const angry = { ...BOAR_PALETTE, E: '#ff2a2a' };
  return {
    walk: [make(BOAR_PALETTE, [1, -1]), make(BOAR_PALETTE, [-1, 1])],
    charge: [make(angry, [2, -2]), make(angry, [-2, 2])]
  };
}

const KNIGHT_PALETTE = {
  O: '#1b1828', X: '#1b1828', A: '#b8bfd6', a: '#7d849e', L: '#eef1fb', V: '#2a2438', E: '#ff4040',
  Q: '#e0303f', q: '#8f1426', T: '#7b3aa0', t: '#4e2066', G: '#ffd23f', W: '#8a5a34',
  S: '#e6e9f4', s: '#9aa1b8', K: '#3a3348'
};
const KNIGHT_BODY = `
....XX...............
...XQqX..........X...
..XQQqX.........XSX..
..XQqX.........XSSsX.
.XQqOOOOO......OSSsO.
..OOLLAAAOO.....OSO..
..OLLAAAAAAO....OWO..
.OLAAAAAAAAAO...OWO..
.OLAAAAAOVVVO...OWO..
.OLAAAAAOVEEO...OWO..
.OAAAAAAOVVVO...OWO..
.OaAAAAAAAAaO...OWO..
..OaaaGGGaaO....OWO..
.OLAAATTTAAAOO..OWO..
OLAAATTTTTAAAAOOOWO..
OAAAATTGTTAAAAALAWO..
OaAAATTTTTAAOOOOOWO..
OaaAATTTTTAaO...OWO..
.OaaTTTTTTTaO...OWO..
.OOTTTtTtTTOO...OWO..
..OtTtOtTtO.....OWO..
................OWO..
................OOO..
`;
const KNIGHT_LEG = `
OaAO.
OaAO.
OKKKO
OOOOO
`;

function buildKnightSprites() {
  const make = (palette, offsets) => {
    const frame = new PixelBuffer(21, 26);
    const leg = gridToBuffer(KNIGHT_LEG, palette);
    frame.blit(gridToBuffer(KNIGHT_BODY, palette), 0, 0);
    frame.blit(leg, 2 + offsets[0], 21 + Math.min(0, offsets[0]));
    frame.blit(leg, 7 + offsets[1], 21 + Math.min(0, offsets[1]));
    return new Sprite(frame.toCanvas(), 9, 25);
  };
  const damaged = { ...KNIGHT_PALETTE, Q: null, q: null, X: null, A: '#9aa1b8', L: '#c9cfe0' };
  return {
    walk: [make(KNIGHT_PALETTE, [0, 0]), make(KNIGHT_PALETTE, [-1, 1])],
    damaged: [make(damaged, [0, 0]), make(damaged, [-1, 1])]
  };
}

/* ============================ Rey Rata ============================ */

const RAT_COLORS = {
  line: '#1f1430',
  fur: ['#3a3552', '#5b5674', '#7d7896', '#a39fbd', '#c9c6dc'],
  furDark: ['#2e2a44', '#45405e', '#5b5674', '#7d7896'],
  belly: ['#7d7896', '#938cae', '#b9b3cf', '#d6d1e6'],
  pink: ['#9c4f68', '#c46d88', '#e898aa', '#ffc2cf'],
  cape: ['#4a0c18', '#6e1424', '#9b1d30', '#c42f45'],
  gold: ['#8a5a00', '#c98a00', '#ffd23f', '#fff3a0'],
  wood: ['#3b2010', '#5c3a1e', '#7d5430'],
  orb: ['#1f6b44', '#2fbf6e', '#7ef9a0', '#e8ffe8']
};

const RAT_PALETTE = {
  O: '#1f1430', Y: '#ffd23f', y: '#c98a00', Z: '#fff3a0', J: '#e63946', W: '#ffffff',
  E: '#ff2a2a', e: '#a00010', K: '#1d1228', X: '#2b2440', P: '#e898aa', F: '#7d7896', f: '#5b5674'
};

const RAT_CROWN = `
.O....O....O.
OZO..OZO..OYO
OYO..OYO..OYO
OYYOOYYYOOYyO
OYZYYYJYYYYyO
OYYYYJJJYYYyO
OyYYYYJYYYyyO
OyyyyyyyyyyyO
.OOOOOOOOOOO.
`;
const RAT_EYES = {
  angry: `
.OOOO.
OWWEEO
OWEKeO
OEEeeO
.OOOO.
`,
  tired: `
OOOOO
fff.O
.OO.O
.O..O
.OOOO
`
};

/**
 * Dibuja un fotograma del Rey Rata (mirando a la derecha).
 * @param {object} pose Desplazamientos de las piezas para cada postura
 */
function drawRatKingFrame(pose) {
  const {
    headX = 0, headY = 0, bodyY = 0, bodyX = 0, feet = [0, 0], staffY = 0, orbRadius = 3,
    eyes = 'angry', fly = false, capeWave = 0, tongue = false, stretch = 0
  } = pose;
  const C = RAT_COLORS;
  const b = new PixelBuffer(76, 74);
  const bx = 36 + bodyX;
  const by = 50 + bodyY;

  // Capa (detrás de todo)
  for (let y = 34 + bodyY; y <= 70; y++) {
    const t = (y - 34 - bodyY) / (36 - bodyY);
    const left = Math.round(20 + bodyX - t * (16 + capeWave) + Math.sin(y * 0.35 + capeWave) * 1.5);
    const right = 40 + bodyX;
    for (let x = left; x <= right; x++) {
      // La luz viene de la izquierda: el borde exterior de la capa es más claro
      const shade = clamp(3 - Math.floor(((x - left) / Math.max(1, right - left)) * 4), 1, 3);
      b.set(x, y, y > 67 ? C.cape[1] : C.cape[shade]);
    }
    b.set(left, y, RAT_COLORS.line);
  }

  // Cola: una curva gruesa que se va afinando
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = lerp(lerp(22 + bodyX, 2, t), lerp(2, 6, t), t);
    const y = lerp(lerp(66, 64, t), lerp(64, 40 + capeWave * 2, t), t);
    const thickness = 2.6 - t * 1.8;
    b.ellipse(x, y, thickness + 1, thickness + 1, RAT_COLORS.line);
  }
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = lerp(lerp(22 + bodyX, 2, t), lerp(2, 6, t), t);
    const y = lerp(lerp(66, 64, t), lerp(64, 40 + capeWave * 2, t), t);
    const thickness = 2.6 - t * 1.8;
    b.shadedEllipse(x, y, thickness, thickness, C.pink);
  }

  // Pies
  if (!fly) {
    b.contouredEllipse(26 + bodyX + feet[0], 70, 7, 3, C.pink, RAT_COLORS.line);
    b.contouredEllipse(44 + bodyX + feet[1], 70, 7, 3, C.pink, RAT_COLORS.line);
  }

  // Cuerpo y barriga
  b.contouredEllipse(bx, by, 17 + stretch, 18 - stretch, C.fur, RAT_COLORS.line);
  b.shadedEllipse(bx + 5, by + 2, 10, 13 - stretch, C.belly);
  // Cinturón dorado con hebilla
  for (let x = bx - 17; x <= bx + 17; x++) {
    for (let y = by + 5; y <= by + 7; y++) {
      if (b.isOpaque(x, y) && b.get(x, y) !== Color.toInt(RAT_COLORS.line)) b.set(x, y, y === by + 5 ? C.gold[3] : C.gold[2]);
    }
  }
  b.rect(bx + 3, by + 4, 5, 5, RAT_COLORS.line);
  b.rect(bx + 4, by + 5, 3, 3, C.gold[1]);

  // Báculo (detrás del brazo)
  const staffX = 56 + bodyX;
  const staffTop = 18 + staffY + bodyY;
  b.rect(staffX - 2, staffTop, 5, 68 - staffTop, RAT_COLORS.line);
  b.rect(staffX - 1, staffTop + 1, 2, 66 - staffTop, C.wood[2]);
  b.rect(staffX + 1, staffTop + 1, 1, 66 - staffTop, C.wood[0]);
  b.contouredEllipse(staffX, staffTop - 1, 3, 2, C.gold, RAT_COLORS.line);
  b.ellipse(staffX + 0.5, staffTop - 4 - orbRadius + 2, orbRadius + 1, orbRadius + 1, RAT_COLORS.line);
  b.glowDisc(staffX + 0.5, staffTop - 4 - orbRadius + 2, orbRadius, C.orb);

  // Brazo con la mano sujetando el báculo
  b.contouredEllipse(bx + 12, by - 6 + Math.round(staffY / 3), 7, 5, C.fur, RAT_COLORS.line);
  b.contouredEllipse(staffX, by - 6 + Math.round(staffY / 3), 3, 3, C.pink, RAT_COLORS.line);

  // Cabeza: orejas, cara y hocico
  const hx = 40 + headX + bodyX;
  const hy = 25 + headY + bodyY;
  b.contouredEllipse(hx - 12, hy - 12, 7, 7, C.furDark, RAT_COLORS.line);
  b.shadedEllipse(hx - 12, hy - 12, 4, 4, C.pink);
  b.contouredEllipse(hx, hy, 13, 10, C.fur, RAT_COLORS.line);
  b.contouredEllipse(hx + 4, hy - 13, 6, 6, C.fur, RAT_COLORS.line);
  b.shadedEllipse(hx + 4, hy - 13, 3.5, 3.5, C.pink);
  b.contouredEllipse(hx + 14, hy + 3, 9, 5.5, C.fur, RAT_COLORS.line);
  // Mejilla clara
  b.shadedEllipse(hx + 8, hy + 5, 5, 3, C.belly);

  // Detalles dibujados a mano encima
  b.ellipse(hx + 22, hy + 1, 2.5, 2.5, RAT_COLORS.line);
  b.shadedEllipse(hx + 22, hy + 1, 2, 2, C.pink);
  b.set(hx + 21, hy, '#ffffff');
  // Dientes
  b.rect(hx + 15, hy + 7, 6, 5, RAT_COLORS.line);
  b.rect(hx + 16, hy + 7, 2, 4, '#fffbe6');
  b.rect(hx + 19, hy + 7, 1, 4, '#fffbe6');
  b.set(hx + 18, hy + 7, '#fffbe6');
  if (tongue) {
    b.rect(hx + 12, hy + 8, 4, 4, RAT_COLORS.line);
    b.rect(hx + 13, hy + 8, 2, 3, C.pink[2]);
  }
  // Ojo y ceja
  b.paintGrid(RAT_EYES[eyes], RAT_PALETTE, hx + 5, hy - 4);
  if (eyes === 'angry') {
    b.line(hx + 3, hy - 8, hx + 11, hy - 5, RAT_COLORS.line);
    b.line(hx + 3, hy - 7, hx + 11, hy - 4, RAT_COLORS.line);
  }
  // Bigotes
  b.line(hx + 20, hy + 4, hx + 33, hy - 1, '#2b2440');
  b.line(hx + 20, hy + 5, hx + 34, hy + 5, '#2b2440');
  b.line(hx + 20, hy + 6, hx + 32, hy + 11, '#2b2440');
  // Corona
  b.paintGrid(RAT_CROWN, RAT_PALETTE, hx - 9, hy - 21);
  return b;
}

/** Todas las posturas del jefe. */
function buildRatKingSprites() {
  const make = (pose) => new Sprite(drawRatKingFrame(pose).toCanvas(), 36, 73);
  return {
    idle: [make({}), make({ bodyY: 1, headY: 1, capeWave: 1 })],
    walk: [make({ feet: [-3, 3], capeWave: 1 }), make({ feet: [3, -3], bodyY: -1, capeWave: 2 })],
    windup: [make({ staffY: -6, orbRadius: 4 }), make({ staffY: -7, orbRadius: 5, capeWave: 1 })],
    charge: [make({ headX: 5, headY: 5, bodyX: 2, feet: [-6, 5], capeWave: 4 }),
      make({ headX: 5, headY: 4, bodyX: 2, feet: [4, -5], capeWave: 5 })],
    crouch: [make({ headY: 6, bodyY: 3, stretch: 3, feet: [-2, 2] })],
    tired: [make({ headY: 6, headX: 2, eyes: 'tired', tongue: true, staffY: 6, orbRadius: 2 }),
      make({ headY: 7, headX: 2, eyes: 'tired', tongue: true, staffY: 6, orbRadius: 2, bodyY: 1 })],
    fly: [make({ fly: true, capeWave: 3 }), make({ fly: true, capeWave: 5, bodyY: -1 })]
  };
}

/* ============================ Objetos ============================ */

/** Moneda que gira: 4 fotogramas generados con un óvalo sombreado. */
function buildCoinSprites() {
  const ramp = ['#a86a00', '#d99a00', '#ffc93c', '#ffe27a', '#fff6c2'];
  return [5.5, 4, 1.6, 4].map((rx, index) => {
    const buffer = new PixelBuffer(13, 13);
    buffer.shadedEllipse(6.5, 6.5, rx, 5.5, ramp);
    if (rx > 3) {
      // Relieve en el centro de la moneda
      for (let y = 4; y <= 8; y++) buffer.set(6 + (index === 3 ? -1 : 0), y, '#c98a00');
      buffer.set(index === 3 ? 6 : 7, 4, '#fff6c2');
    }
    buffer.outline('#6b4400');
    return new Sprite(buffer.toCanvas(), 6, 6);
  });
}

const HEART_PALETTE = { O: '#5a0f22', R: '#ff4f6d', r: '#c9184a', L: '#ff9fb0', W: '#ffffff' };
const HEART_GRID = `
.OOO...OOO.
OLLRO.ORRRO
OLWRROORRrO
ORLRRRRRRrO
ORRRRRRRRrO
.ORRRRRRrO.
..ORRRRrO..
...ORRrO...
....OrO....
.....O.....
`;

const STAR_PALETTE = { O: '#6b4400', Y: '#ffd23f', W: '#ffffff', L: '#fff3a0', d: '#d99a00', K: '#6b4400' };
const STAR_GRID = `
.......O.......
......OWO......
......OLO......
.....OLYdO.....
OOOOOLYYYdOOOOO
OLWLLYYYYYYYYdO
.OLYYKYYYKYYdO.
..OLYKYYYKYdO..
...OYYYYYYYdO..
...OYYYYYYYdO..
..OYYYdOdYYYdO.
..OYYdO.OdYYdO.
.OYdOO...OOddO.
.OOO.......OOO.
`;

const KEY_PALETTE = { O: '#5a3a00', Y: '#ffd23f', W: '#fff6c2', d: '#c98a00' };
const KEY_GRID = `
.OOOO...........
OYWWYO..........
OYOOYOOOOOOOOOO.
OYO.OYYYYYYYYYYO
OYOOYOdddddYdYdO
OYYYdO.OOOOOdOdO
.OOOO.......OOO.
`;

/** Bola de energía de Milo y proyectiles del jefe (2 fotogramas que laten). */
function buildGlowSprites(size, ramp, outline) {
  return [0, 1].map((frame) => {
    const buffer = new PixelBuffer(size, size);
    const center = size / 2;
    buffer.glowDisc(center, center, size / 2 - 1 - frame, ramp);
    if (outline) buffer.outline(outline);
    return new Sprite(buffer.toCanvas(), Math.floor(size / 2), Math.floor(size / 2));
  });
}

/** Onda expansiva del jefe. */
function buildShockwaveSprites() {
  return [0, 1].map((frame) => {
    const buffer = new PixelBuffer(16, 18);
    const colors = ['#5a189a', '#9d4edd', '#e0aaff', '#ffffff'];
    for (let layer = 0; layer < 4; layer++) {
      const height = 16 - layer * 3 - frame * 2;
      for (let x = 0; x < 12 - layer * 2; x++) {
        const columnHeight = Math.round(height * Math.sin(((x + 0.5) / (12 - layer * 2)) * Math.PI));
        for (let y = 0; y < columnHeight; y++) buffer.set(x + layer + 2, 17 - y, colors[layer]);
      }
    }
    return new Sprite(buffer.toCanvas(), 8, 18);
  });
}

/* ============================ Iconos del HUD ============================ */

const ICON_PALETTE = {
  O: '#1a0f1f', R: '#ff4f6d', r: '#c9184a', W: '#ffffff', G: '#5b5370', g: '#3d3650',
  Y: '#ffd23f', y: '#d99a00', L: '#fff3a0', B: '#f28c3a', b: '#d8692c', P: '#ff9bb0', K: '#1d1228'
};
const ICONS = {
  heart: `
.OO.OO.
ORWORrO
ORRRRrO
.ORRrO.
..ORO..
...O...
`,
  heartEmpty: `
.OO.OO.
OGgOGgO
OGGGGgO
.OGGgO.
..OgO..
...O...
`,
  coin: `
.OOO.
OYLyO
OYLyO
OYYyO
.OOO.
`,
  star: `
...O...
..OYO..
OOOYOOO
OLYYYyO
.OYYyO.
OYyOOyO
OO...OO
`,
  key: `
.OOO.......
OYLYOOOOOO.
OYOYOYYYYYO
OYYYOOyOyO.
.OOO..O.O..
`,
  cat: `
.O....O.
OBO..OBO
OPBOOBPO
OBBBBBBO
OKBBBBKO
OBBPPBBO
.ObbbbO.
..OOOO..
`
};

/* ====================== Registro global de sprites ====================== */

const SPRITES = {};

/** Genera todos los sprites del juego. Se llama una vez al arrancar. */
function buildAllSprites() {
  PixelFont.init();
  SPRITES.milo = buildCatSprites('milo');
  SPRITES.luna = buildCatSprites('luna');
  SPRITES.slime = buildSlimeSprites();
  SPRITES.mushroom = buildMushroomSprites();
  SPRITES.bat = buildBatSprites();
  SPRITES.ghost = buildGhostSprites();
  SPRITES.boar = buildBoarSprites();
  SPRITES.knight = buildKnightSprites();
  SPRITES.ratKing = buildRatKingSprites();
  SPRITES.coin = buildCoinSprites();
  SPRITES.heart = spriteFromGrid(HEART_GRID, HEART_PALETTE, 5, 5);
  SPRITES.star = spriteFromGrid(STAR_GRID, STAR_PALETTE, 7, 7);
  SPRITES.key = spriteFromGrid(KEY_GRID, KEY_PALETTE, 8, 3);
  // Versiones grises para el HUD (corazón vacío, llave aún no conseguida)
  SPRITES.heartEmpty = spriteFromGrid(HEART_GRID, { O: '#1a0f1f', R: '#4a4060', r: '#352c48', L: '#6a5f85', W: '#7d7298' }, 5, 5);
  SPRITES.keyEmpty = spriteFromGrid(KEY_GRID, { O: '#1a0f1f', Y: '#4a4060', W: '#5a5075', d: '#352c48' }, 8, 3);
  SPRITES.energyBall = buildGlowSprites(10, ['#5a2aa0', '#7b5cff', '#7ef9ff', '#d6ffff'], null);
  SPRITES.fireball = buildGlowSprites(12, ['#6a0d5a', '#b5179e', '#7ef9a0', '#e8ffe8'], null);
  SPRITES.shockwave = buildShockwaveSprites();
  SPRITES.icons = {};
  for (const [name, grid] of Object.entries(ICONS)) SPRITES.icons[name] = spriteFromGrid(grid, ICON_PALETTE, 0, 0);
}
