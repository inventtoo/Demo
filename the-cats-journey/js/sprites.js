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

/*
  El Rey Rata se monta por piezas sombreadas (como un muñeco articulado):
  capa, cola, piernas con garras, torso peludo, túnica real con cuello de
  armiño, brazos, báculo y cabeza. Cada pieza lleva su propia línea de
  contorno para que se distinga de las demás, y al final se añade un
  contorno exterior. Los detalles finos (ojos, cicatriz, colmillos,
  corona) se pintan encima a mano.
*/
const RAT_COLORS = {
  line: '#1a1028',
  fur: ['#2e2944', '#46405e', '#625c7c', '#857f9e', '#aaa5c2'],
  furDark: ['#241f38', '#36304e', '#4a4464', '#625c7c'],
  belly: ['#857f9e', '#a19bb9', '#beb9d2', '#dad6e8'],
  skin: ['#8a4a62', '#b8667f', '#e08ea4', '#ffbccb'],
  robe: ['#2a0f3e', '#45185f', '#622384', '#8236a8', '#a356c8'],
  cape: ['#3d0812', '#5e0f1f', '#86182d', '#b0263f', '#d84a5e'],
  lining: ['#1f0b30', '#33134a'],
  gold: ['#7a4a00', '#b88200', '#ecb52a', '#ffe17a', '#fff6c8'],
  ermine: ['#b9b4cc', '#dedaea', '#f6f4fb', '#ffffff'],
  wood: ['#2b170a', '#4a2c16', '#6e4626', '#8f6236'],
  orb: ['#155c3a', '#22a35f', '#5ff099', '#c8ffdc', '#ffffff'],
  claw: '#f2ead8'
};

const RAT_PALETTE = {
  O: '#1a1028', Y: '#ecb52a', y: '#b88200', Z: '#fff6c8', J: '#e63946', j: '#9b1d30', B: '#4ea6ff',
  W: '#ffffff', E: '#ff3030', e: '#a00010', K: '#1d1228', G: '#ffe17a', f: '#46405e', F: '#625c7c'
};

// Corona con joyas (15x11)
const RAT_CROWN = `
..O.....O.....O..
.OZO...OZO...OGO.
.OYO..OYJYO..OYO.
OYZYOOYJJJYOOYYyO
OYYYYYYYJYYYYYYyO
OYBYYYJYYYJYYBYyO
OYYYYyYYYYYyYYyyO
OyyyyyyyyyyyyyyyO
.OOOOOOOOOOOOOOO.
`;

const RAT_EYES = {
  angry: `
.OOOOO.
OEEEWWO
OEEKEeO
.OeeeO.
..OOO..
`,
  tired: `
.OOOO.
ffffOO
.OOO.O
.O.fO.
.OOO..
`
};

/** Elige un color de una rampa según la luz (de -1 a 1). */
function rampByLight(ramp, light) {
  return ramp[clamp(Math.round((light * 0.5 + 0.5) * (ramp.length - 1)), 0, ramp.length - 1)];
}

/**
 * Dibuja un fotograma del Rey Rata (mirando a la derecha) en un lienzo de 88x100.
 * @param {object} pose Desplazamientos de las piezas para cada postura
 */
function drawRatKingFrame(pose) {
  const {
    bodyX = 0, bodyY = 0, lean = 0, headX = 0, headY = 0, feet = [0, 0], staffY = 0, orbRadius = 3,
    eyes = 'angry', fly = false, capeWave = 0, tongue = false, squash = 0, crownTilt = 0, armRaise = 0
  } = pose;
  const C = RAT_COLORS;
  const L = C.line;
  const TOP = 8;                     // margen superior para el orbe levantado
  const b = new PixelBuffer(88, 92 + TOP);
  const groundY = 90 + TOP;
  const cx = 40 + bodyX;            // centro del torso
  const cy = 56 + TOP + bodyY + squash;
  const shoulderX = cx + lean;      // los hombros se inclinan hacia delante al embestir

  // ---------------- Capa (detrás de todo) ----------------
  const capeTop = cy - 18;
  const capePoints = [
    [shoulderX - 14, capeTop - 2], [shoulderX + 4, capeTop - 3], [cx + 6, groundY - 2],
    [cx - 37 - capeWave * 2, groundY], [cx - 35 - capeWave, groundY - 16], [cx - 27, cy - 6]
  ];
  b.polygon(capePoints, (x, y) => {
    // Pliegues: bandas verticales de luz y sombra que ondulan
    const fold = Math.sin((x - cx) * 0.55 + y * 0.06 + capeWave);
    const depth = (x - (cx - 36)) / 40;
    let color = rampByLight(C.cape, fold * 0.45 - depth * 0.9 + 0.35);
    if (y > groundY - 6) color = y > groundY - 4 ? C.lining[0] : C.lining[1];
    return color;
  }, L);
  // Ribete dorado en el borde exterior de la capa
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const x = Math.round(lerp(cx - 27, cx - 35 - capeWave, t));
    const y = Math.round(lerp(cy - 6, groundY - 16, t));
    b.set(x + 1, y, C.gold[3]);
    b.set(x + 2, y, C.gold[2]);
  }

  // Cuello alto de la capa detrás de la cabeza (silueta de villano)
  const collarPoints = [[shoulderX - 15, capeTop + 2], [shoulderX - 21, capeTop - 17], [shoulderX - 9, capeTop - 7],
    [shoulderX - 1, capeTop - 16], [shoulderX + 5, capeTop + 1]];
  b.polygon(collarPoints, (x, y) => (x + y) % 5 === 0 ? C.lining[0] : C.lining[1], L);
  b.line(shoulderX - 20, capeTop - 15, shoulderX - 15, capeTop + 1, C.gold[2]);
  b.line(shoulderX - 1, capeTop - 14, shoulderX + 4, capeTop, C.gold[2]);

  // ---------------- Cola segmentada ----------------
  const tailPoints = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const x = lerp(lerp(cx - 10, cx - 34, t), lerp(cx - 34, cx - 30 - capeWave, t), t);
    const y = lerp(lerp(groundY - 6, groundY - 2, t), lerp(groundY - 2, groundY - 34, t), t);
    tailPoints.push([x, y, 3 - t * 2.2]);
  }
  for (const [x, y, r] of tailPoints) b.ellipse(x, y, r + 1, r + 1, L);
  tailPoints.forEach(([x, y, r], i) => {
    b.shadedEllipse(x, y, r, r, C.skin);
    if (i % 5 === 0 && r > 1.2) b.set(Math.round(x), Math.round(y), C.skin[0]); // anillos de la cola
  });

  // ---------------- Brazo trasero (asoma por detrás) ----------------
  b.contouredEllipse(shoulderX - 17, cy - 4, 5, 9, C.robe.slice(0, 4), L);
  b.contouredEllipse(shoulderX - 19, cy + 7, 3.5, 3.5, C.skin, L);

  // ---------------- Piernas y pies con garras ----------------
  if (!fly) {
    for (const [legX, footOffset, isBack] of [[cx - 9, feet[0], true], [cx + 8, feet[1], false]]) {
      const ramp = isBack ? C.furDark : C.fur;
      const footX = legX + footOffset;
      // Muslo y espinilla
      b.contouredEllipse(legX, cy + 16, 7, 8, ramp, L, { ditherNoise: 0.3, seed: 3 });
      b.polygon([[legX - 4, cy + 18], [legX + 4, cy + 18], [footX + 3, groundY - 3], [footX - 4, groundY - 3]], (x) => ramp[x < legX ? 2 : 1], L);
      // Pie rosado con dedos y garras
      b.contouredEllipse(footX + 2, groundY - 2, 8, 3, C.skin, L);
      for (let toe = 0; toe < 3; toe++) {
        const toeX = footX + 6 + toe * 2;
        b.set(toeX, groundY - 3, L);
        b.set(toeX + 1, groundY - 1, C.claw);
        b.set(toeX + 2, groundY - 1, C.claw);
      }
    }
  }

  // ---------------- Torso peludo (forma de pera, encorvado) ----------------
  b.contouredEllipse(cx + Math.round(lean / 2), cy - 2, 18, 20 - squash, C.fur, L, { ditherNoise: 0.35, seed: 1 });

  // ---------------- Túnica real ----------------
  const robeTop = cy - 10;
  const hemY = cy + 25;
  // Silueta de campana: estrecha en los hombros y ancha abajo
  const robePoints = [
    [shoulderX - 15, robeTop + 3], [shoulderX - 8, robeTop - 2], [cx + 3, cy + 2], [shoulderX + 13, robeTop - 3],
    [shoulderX + 18, robeTop + 3], [cx + 21, cy + 6], [cx + 24, hemY - 3], [cx + 22, hemY],
    [cx - 23, hemY], [cx - 25, hemY - 3], [cx - 20, cy + 6]
  ];
  b.polygon(robePoints, (x, y) => {
    // Pliegues en abanico que nacen del cinturón
    const fanX = (x - cx) / Math.max(1, (y - cy) * 0.35 + 6);
    const fold = Math.sin(fanX * 3.2) * 0.35;
    let color = rampByLight(C.robe, (cx - x) / 26 + fold + 0.1);
    if (y >= hemY - 2) color = y === hemY - 2 ? C.gold[3] : C.gold[1];
    else if (y === hemY - 4 && (x % 4 === 0)) color = C.gold[2]; // bordado
    else if (y === hemY - 5 && (x % 4 === 1 || x % 4 === 3)) color = C.gold[1];
    return color;
  }, L);
  // Pecho claro en el escote en V
  b.polygon([[shoulderX - 6, robeTop - 1], [cx + 3, cy + 2], [shoulderX + 11, robeTop - 2], [shoulderX + 3, robeTop - 6]], (x, y) => rampByLight(C.belly, (cx + 3 - x) / 10 + (cy - y) / 30), null);
  // Ribete dorado del escote
  b.line(shoulderX - 7, robeTop - 1, cx + 3, cy + 3, C.gold[3]);
  b.line(cx + 3, cy + 3, shoulderX + 12, robeTop - 2, C.gold[2]);
  // Cinturón con hebilla
  for (let x = cx - 24; x <= cx + 24; x++) {
    for (let y = cy + 5; y <= cy + 7; y++) {
      if (b.isOpaque(x, y) && b.get(x, y) !== Color.toInt(L)) b.set(x, y, y === cy + 5 ? C.gold[3] : y === cy + 7 ? C.gold[1] : C.gold[2]);
    }
  }
  b.rect(cx + 1, cy + 4, 7, 5, L);
  b.rect(cx + 2, cy + 5, 5, 3, C.gold[1]);
  b.set(cx + 4, cy + 6, '#e63946');
  b.set(cx + 3, cy + 5, C.gold[4]);

  // Cuello de armiño (blanco con puntitas negras)
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    const x = lerp(cx - 17, shoulderX + 16, t);
    const y = robeTop - 2 - Math.sin(t * Math.PI) * 5 + 2;
    b.contouredEllipse(x, y, 3.5, 3, C.ermine, L);
    if (i % 2 === 1) { b.set(Math.round(x), Math.round(y), L); b.set(Math.round(x), Math.round(y) + 1, L); }
  }

  // ---------------- Báculo ornamentado ----------------
  const staffX = shoulderX + 27;
  const staffTop = 18 + TOP + staffY + bodyY;
  b.rect(staffX - 2, staffTop, 5, groundY - staffTop, L);
  for (let y = staffTop + 1; y < groundY - 1; y++) {
    // Madera retorcida: una franja clara en diagonal que se repite
    const twist = (y - staffTop) % 6;
    b.set(staffX - 1, y, twist < 3 ? C.wood[3] : C.wood[2]);
    b.set(staffX, y, twist < 3 ? C.wood[2] : C.wood[1]);
    b.set(staffX + 1, y, C.wood[0]);
  }
  for (const ringY of [staffTop + 10, staffTop + 30, groundY - 8]) {
    b.rect(staffX - 2, ringY, 5, 2, C.gold[2]);
    b.set(staffX - 2, ringY, C.gold[4]);
  }
  // Garra dorada que sujeta el orbe
  const orbY = staffTop - 3 - orbRadius;
  for (const side of [-1, 1]) {
    b.line(staffX, staffTop, staffX + side * (orbRadius + 2), orbY + 1, L);
    b.line(staffX + side, staffTop - 1, staffX + side * (orbRadius + 2), orbY + 2, C.gold[3]);
    b.set(staffX + side * (orbRadius + 2), orbY, C.gold[4]);
  }
  b.ellipse(staffX + 0.5, orbY, orbRadius + 1, orbRadius + 1, L);
  b.glowDisc(staffX + 0.5, orbY, orbRadius, C.orb);

  // ---------------- Brazo delantero sujetando el báculo ----------------
  const handY = cy - 8 - armRaise + Math.round(staffY / 3);
  b.contouredEllipse(shoulderX + 13, cy - 12, 6, 7, C.robe, L);                     // manga
  b.contouredEllipse(shoulderX + 20, handY + 2, 5, 4, C.robe.slice(1), L);           // antebrazo
  b.rect(shoulderX + 18, handY - 1, 3, 6, C.gold[2]);                                // puño dorado
  b.contouredEllipse(staffX, handY + 1, 3.5, 3.5, C.skin, L);                         // mano
  b.set(staffX + 3, handY, C.claw); b.set(staffX + 3, handY + 2, C.claw);

  // ---------------- Cabeza ----------------
  const hx = 51 + bodyX + lean + headX;
  const hy = 25 + TOP + bodyY + headY + squash;
  // Oreja trasera (con una muesca de alguna pelea)
  b.contouredEllipse(hx - 12, hy - 11, 7, 7, C.furDark, L);
  b.shadedEllipse(hx - 12, hy - 11, 4, 4, C.skin);
  b.set(hx - 8, hy - 17, 0); b.set(hx - 7, hy - 16, 0); b.set(hx - 8, hy - 16, L); b.set(hx - 7, hy - 15, L);
  // Cráneo
  b.contouredEllipse(hx, hy, 12, 10, C.fur, L, { ditherNoise: 0.25, seed: 5 });
  // Hocico afilado (sin línea en la unión, para que nazca de la cabeza): claro arriba, mandíbula pálida
  b.polygon([[hx + 3, hy - 7], [hx + 12, hy - 5], [hx + 19, hy - 1], [hx + 23, hy + 2], [hx + 21, hy + 5],
    [hx + 13, hy + 8], [hx + 4, hy + 8]], (x, y) => {
    if (y > hy + 3) return rampByLight(C.belly, 0.4 - (y - hy - 3) / 5);
    return rampByLight(C.fur, 0.95 - (y - hy + 6) / 9 - (x - hx) / 60);
  }, null);
  // Contorno solo por fuera del hocico (arriba y abajo)
  b.line(hx + 6, hy - 8, hx + 12, hy - 6, L); b.line(hx + 12, hy - 6, hx + 19, hy - 2, L); b.line(hx + 19, hy - 2, hx + 24, hy + 2, L);
  b.line(hx + 22, hy + 5, hx + 13, hy + 9, L); b.line(hx + 13, hy + 9, hx + 6, hy + 9, L);
  b.line(hx + 8, hy - 5, hx + 18, hy - 1, C.fur[4]); // brillo sobre el hocico
  // Mechones claros en la mejilla
  b.polygon([[hx - 10, hy + 2], [hx - 13, hy + 8], [hx - 8, hy + 6], [hx - 7, hy + 10], [hx - 3, hy + 6],
    [hx, hy + 9], [hx + 3, hy + 5]], (x, y) => rampByLight(C.belly, (hx - x) / 12 - (y - hy) / 18 + 0.3), L);
  // Oreja delantera
  b.contouredEllipse(hx - 1, hy - 13, 6.5, 6.5, C.fur, L);
  b.shadedEllipse(hx - 1, hy - 13, 4, 4, C.skin);
  // Nariz húmeda
  b.ellipse(hx + 23, hy + 2, 2.5, 2.2, L);
  b.shadedEllipse(hx + 23, hy + 2, 1.8, 1.6, C.skin);
  b.set(hx + 22, hy + 1, '#ffffff');
  // Colmillos y mandíbula
  b.line(hx + 8, hy + 4, hx + 21, hy + 4, L); // boca
  b.rect(hx + 16, hy + 5, 5, 5, L);
  b.rect(hx + 17, hy + 5, 1, 4, '#fffbe6'); b.rect(hx + 18, hy + 5, 1, 3, '#e8dcc0');
  b.rect(hx + 19, hy + 5, 1, 4, '#fffbe6');
  if (tongue) {
    b.rect(hx + 13, hy + 5, 4, 6, L);
    b.rect(hx + 14, hy + 5, 2, 5, C.skin[2]);
  }
  // Ojo, ceja y cicatriz
  b.paintGrid(RAT_EYES[eyes], RAT_PALETTE, hx + 2, hy - 6);
  if (eyes === 'angry') {
    b.line(hx + 1, hy - 9, hx + 10, hy - 6, L);
    b.line(hx + 1, hy - 8, hx + 10, hy - 5, L);
  }
  b.line(hx + 2, hy - 12, hx, hy + 1, C.skin[1]); // cicatriz sobre el ojo
  // Bigotes
  b.line(hx + 19, hy + 1, hx + 32, hy - 4, '#2b2440');
  b.line(hx + 19, hy + 2, hx + 33, hy + 2, '#2b2440');
  b.line(hx + 19, hy + 3, hx + 31, hy + 8, '#2b2440');
  // Corona (algo ladeada cuando está mareado)
  b.paintGrid(RAT_CROWN, RAT_PALETTE, hx - 12 + crownTilt, hy - 21 + Math.abs(crownTilt));

  b.outline(L);
  return b;
}

/** Todas las posturas del jefe. */
function buildRatKingSprites() {
  const make = (pose) => new Sprite(drawRatKingFrame(pose).toCanvas(), 40, 99);
  return {
    idle: [make({}), make({ bodyY: 1, headY: 1, capeWave: 1, orbRadius: 3 })],
    walk: [make({ feet: [-4, 3], capeWave: 1, bodyY: -1 }), make({ feet: [3, -4], capeWave: 2 })],
    windup: [make({ staffY: -8, orbRadius: 5, armRaise: 4, headY: -1 }), make({ staffY: -9, orbRadius: 6, armRaise: 5, capeWave: 1, headY: -1 })],
    charge: [make({ lean: 6, headX: 2, headY: 6, feet: [-7, 6], capeWave: 4, bodyX: 1 }),
      make({ lean: 6, headX: 2, headY: 5, feet: [5, -6], capeWave: 5, bodyX: 1, bodyY: -1 })],
    crouch: [make({ squash: 4, headY: 3, feet: [-3, 3], lean: 2 })],
    tired: [make({ headY: 7, headX: -1, eyes: 'tired', tongue: true, staffY: 6, orbRadius: 2, crownTilt: 2, lean: 2 }),
      make({ headY: 8, headX: -1, eyes: 'tired', tongue: true, staffY: 6, orbRadius: 2, crownTilt: 3, lean: 2, bodyY: 1 })],
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
