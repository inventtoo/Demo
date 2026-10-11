/* =====================================================================
   pixelart.js - Herramientas de pixel art
   ---------------------------------------------------------------------
   El juego se dibuja en un lienzo pequeño de 640x360 "píxeles de arte"
   que después se amplía x2 (sin suavizado) a la imagen final de
   1280x720 (720p). Así cada píxel del dibujo se ve nítido y cuadrado.

   Este archivo contiene:
   - Funciones de color (mezclar, aclarar, paletas).
   - PixelBuffer: un lienzo en memoria para dibujar píxel a píxel
     (círculos sombreados, líneas, contornos...). Lo usan los fondos,
     las casillas y los objetos que se generan por código.
   - Sprites a partir de "rejillas de texto" (cada carácter es un píxel).
   - PixelFont: una fuente de mapa de bits propia (con tildes y ñ).
   ===================================================================== */
'use strict';

/* ============================ Colores ============================ */

const Color = {
  /** '#rrggbb' -> [r, g, b] */
  parse(hex) {
    let digits = hex.slice(1);
    if (digits.length === 3) digits = digits.split('').map((d) => d + d).join('');
    const value = parseInt(digits, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  },

  toHex(rgb) {
    return '#' + rgb.map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('');
  },

  /** Mezcla dos colores hex. amount = 0 -> a, 1 -> b */
  mix(a, b, amount) {
    const ca = Color.parse(a);
    const cb = Color.parse(b);
    return Color.toHex(ca.map((c, i) => c + (cb[i] - c) * amount));
  },

  /** Convierte un color hex en un entero RGBA para PixelBuffer. */
  toInt(hex, alpha = 255) {
    const [r, g, b] = Color.parse(hex);
    return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
};

/* ============================ PixelBuffer ============================ */

/**
 * Lienzo en memoria donde cada píxel se puede leer y escribir. Es mucho
 * más rápido que dibujar rectángulos de 1x1 en un canvas.
 */
class PixelBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint32Array(width * height);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Pinta un píxel. color puede ser '#rrggbb' o un entero ya convertido. */
  set(x, y, color) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y) || color === null || color === undefined) return;
    this.data[y * this.width + x] = typeof color === 'string' ? Color.toInt(color) : color;
  }

  get(x, y) {
    if (!this.inside(x, y)) return 0;
    return this.data[y * this.width + x];
  }

  isOpaque(x, y) {
    return (this.get(x, y) >>> 24) > 0;
  }

  rect(x, y, w, h, color) {
    const value = typeof color === 'string' ? Color.toInt(color) : color;
    for (let py = Math.max(0, y); py < Math.min(this.height, y + h); py++) {
      for (let px = Math.max(0, x); px < Math.min(this.width, x + w); px++) {
        this.data[py * this.width + px] = value;
      }
    }
  }

  /** Línea con el algoritmo de Bresenham (sin suavizado). */
  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * error;
      if (e2 >= dy) { error += dy; x0 += sx; }
      if (e2 <= dx) { error += dx; y0 += sy; }
    }
  }

  /**
   * Elipse rellena con sombreado: el color se elige de una rampa
   * (de oscuro a claro) según lo iluminado que esté cada píxel. La luz
   * viene de arriba a la izquierda, como en los juegos clásicos.
   */
  shadedEllipse(cx, cy, rx, ry, ramp, options = {}) {
    const { lightX = -0.55, lightY = -0.75, ditherNoise = 0, seed = 0 } = options;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const distance = nx * nx + ny * ny;
        if (distance > 1) continue;
        const nz = Math.sqrt(1 - distance);
        let light = nx * lightX + ny * lightY + nz * 0.6;
        if (ditherNoise) light += (hashNoise(x, y, seed) - 0.5) * ditherNoise;
        const index = clamp(Math.floor((light + 0.35) * ramp.length / 1.35), 0, ramp.length - 1);
        this.set(x, y, ramp[index]);
      }
    }
  }

  /**
   * Elipse sombreada con una línea de contorno propia: primero se pinta
   * una elipse 1 píxel mayor con el color de línea. Así las piezas que
   * se solapan (cabeza sobre cuerpo, oreja sobre cabeza) quedan separadas
   * por una línea, como en el pixel art dibujado a mano.
   */
  contouredEllipse(cx, cy, rx, ry, ramp, lineColor, options = {}) {
    this.ellipse(cx, cy, rx + 1, ry + 1, lineColor);
    this.shadedEllipse(cx, cy, rx, ry, ramp, options);
  }

  /** Disco brillante: el centro es el color más claro de la rampa. */
  glowDisc(cx, cy, radius, ramp) {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius;
        if (distance > 1) continue;
        this.set(x, y, ramp[clamp(Math.floor((1 - distance) * ramp.length), 0, ramp.length - 1)]);
      }
    }
  }

  /** Pinta una rejilla de texto encima (útil para detalles: ojos, coronas...). */
  paintGrid(text, palette, offsetX, offsetY, flipX = false) {
    this.blit(gridToBuffer(text, palette), offsetX, offsetY, flipX);
  }

  /** Elipse rellena de un solo color. */
  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, color);
      }
    }
  }

  /**
   * Añade un contorno de 1 píxel alrededor de lo dibujado. Si se pasa
   * "darkenFactor", el contorno usa una versión oscura del color vecino
   * (contorno "selectivo", típico del pixel art de 32 bits).
   */
  outline(color) {
    const value = typeof color === 'string' ? Color.toInt(color) : color;
    const copy = this.data.slice();
    const opaqueAt = (x, y) => this.inside(x, y) && (copy[y * this.width + x] >>> 24) > 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (opaqueAt(x, y)) continue;
        if (opaqueAt(x - 1, y) || opaqueAt(x + 1, y) || opaqueAt(x, y - 1) || opaqueAt(x, y + 1)) {
          this.data[y * this.width + x] = value;
        }
      }
    }
  }

  /** Copia otro buffer encima de este (los píxeles transparentes no se copian). */
  blit(source, offsetX, offsetY, flipX = false) {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const value = source.data[y * source.width + (flipX ? source.width - 1 - x : x)];
        if ((value >>> 24) === 0) continue;
        this.set(offsetX + x, offsetY + y, value);
      }
    }
  }

  /** Convierte el buffer en un canvas listo para dibujar con drawImage. */
  toCanvas() {
    const canvas = createPixelCanvas(this.width, this.height);
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(this.width, this.height);
    new Uint32Array(imageData.data.buffer).set(this.data);
    context.putImageData(imageData, 0, 0);
    return canvas;
  }
}

/** Ruido determinista entre 0 y 1 (mismo resultado siempre para x, y). */
function hashNoise(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Ruido suave (interpolado) para formas naturales: montañas, nubes, rocas. */
function smoothNoise(x, seed = 0) {
  const x0 = Math.floor(x);
  const t = x - x0;
  const fade = t * t * (3 - 2 * t);
  return lerp(hashNoise(x0, 0, seed), hashNoise(x0 + 1, 0, seed), fade);
}

function smoothNoise2D(x, y, seed = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const fx = tx * tx * (3 - 2 * tx);
  const fy = ty * ty * (3 - 2 * ty);
  const top = lerp(hashNoise(x0, y0, seed), hashNoise(x0 + 1, y0, seed), fx);
  const bottom = lerp(hashNoise(x0, y0 + 1, seed), hashNoise(x0 + 1, y0 + 1, seed), fx);
  return lerp(top, bottom, fy);
}

/** Matriz de Bayer 4x4: patrón clásico de tramado (dithering). */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

/** Devuelve true si en (x, y) toca el color "siguiente" para un degradado tramado. */
function ditherAt(x, y, amount) {
  return amount * 16 > BAYER_4X4[y & 3][x & 3] + 0.5;
}

/** Crea un canvas con el suavizado desactivado. */
function createPixelCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  return canvas;
}

/* ============================== Sprites ============================== */

/**
 * Un sprite es una imagen con un "punto de anclaje" (normalmente entre
 * los pies del personaje). Guarda también su versión volteada.
 */
class Sprite {
  constructor(canvas, anchorX = 0, anchorY = 0) {
    this.image = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.flippedImage = null;
  }

  getFlipped() {
    if (!this.flippedImage) {
      this.flippedImage = createPixelCanvas(this.width, this.height);
      const context = this.flippedImage.getContext('2d');
      context.translate(this.width, 0);
      context.scale(-1, 1);
      context.drawImage(this.image, 0, 0);
    }
    return this.flippedImage;
  }

  /** Versión blanca del sprite (para el destello al recibir un golpe). */
  getSilhouette(flip) {
    const key = flip ? 'silhouetteFlipped' : 'silhouette';
    if (!this[key]) {
      const canvas = createPixelCanvas(this.width, this.height);
      const context = canvas.getContext('2d');
      context.drawImage(flip ? this.getFlipped() : this.image, 0, 0);
      context.globalCompositeOperation = 'source-in';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, this.width, this.height);
      this[key] = canvas;
    }
    return this[key];
  }

  /** Dibuja la silueta blanca en la misma posición que draw(). */
  drawSilhouette(ctx, x, y, flip = false) {
    const anchorX = flip ? this.width - this.anchorX : this.anchorX;
    ctx.drawImage(this.getSilhouette(flip), Math.round(x - anchorX), Math.round(y - this.anchorY));
  }

  /**
   * Dibuja el sprite con su anclaje en (x, y).
   * @param {boolean} flip true para mirar a la izquierda
   */
  draw(ctx, x, y, flip = false, scale = 1) {
    const anchorX = flip ? this.width - this.anchorX : this.anchorX;
    const drawX = Math.round(x - anchorX * scale);
    const drawY = Math.round(y - this.anchorY * scale);
    ctx.drawImage(flip ? this.getFlipped() : this.image, drawX, drawY, this.width * scale, this.height * scale);
  }
}

/**
 * Convierte una rejilla de texto en un PixelBuffer.
 * Cada carácter es un píxel; '.' y ' ' son transparentes.
 * @param {string} text     Rejilla (una fila por línea)
 * @param {object} palette  { carácter: '#rrggbb' }
 */
function gridToBuffer(text, palette) {
  const rows = text.split('\n').filter((row) => row.trim().length > 0).map((row) => row.replace(/\s+$/, ''));
  const width = Math.max(...rows.map((row) => row.length));
  const buffer = new PixelBuffer(width, rows.length);
  const intPalette = {};
  for (const [key, hex] of Object.entries(palette)) intPalette[key] = hex ? Color.toInt(hex) : null;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const character = row[x];
      if (character === '.' || character === ' ') continue;
      const color = intPalette[character];
      if (color) buffer.data[y * width + x] = color;
    }
  });
  return buffer;
}

/* =========================== Fuente de píxeles =========================== */

/*
  Cada letra se describe con filas separadas por "/" ('#' = píxel).
  Las letras miden 7 filas de alto (más 2 filas para las partes que
  bajan, como en la g o la p). La primera fila del dibujo final queda
  libre para las tildes de las mayúsculas.
*/
const FONT_GLYPHS = {
  'A': '.###./#...#/#...#/#####/#...#/#...#/#...#',
  'B': '####./#...#/#...#/####./#...#/#...#/####.',
  'C': '.###./#...#/#..../#..../#..../#...#/.###.',
  'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
  'E': '#####/#..../#..../####./#..../#..../#####',
  'F': '#####/#..../#..../####./#..../#..../#....',
  'G': '.###./#...#/#..../#.###/#...#/#...#/.####',
  'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  'I': '###/.#./.#./.#./.#./.#./###',
  'J': '..###/...#./...#./...#./#..#./#..#./.##..',
  'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  'L': '#..../#..../#..../#..../#..../#..../#####',
  'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  'N': '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  'P': '####./#...#/#...#/####./#..../#..../#....',
  'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  'R': '####./#...#/#...#/####./#.#../#..#./#...#',
  'S': '.####/#..../#..../.###./....#/....#/####.',
  'T': '#####/..#../..#../..#../..#../..#../..#..',
  'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  'W': '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..',
  'Z': '#####/....#/...#./..#../.#.../#..../#####',
  'a': '..../..../.###/...#/.###/#..#/.###',
  'b': '#.../#.../###./#..#/#..#/#..#/###.',
  'c': '..../..../.###/#.../#.../#.../.###',
  'd': '...#/...#/.###/#..#/#..#/#..#/.###',
  'e': '..../..../.##./#..#/####/#.../.###',
  'f': '..##/.#../###./.#../.#../.#../.#..',
  'g': '..../..../.###/#..#/#..#/#..#/.###/...#/.##.',
  'h': '#.../#.../###./#..#/#..#/#..#/#..#',
  'i': '#/./#/#/#/#/#',
  'j': '..#/.../..#/..#/..#/..#/..#/#.#/.#.',
  'k': '#.../#.../#..#/#.#./##../#.#./#..#',
  'l': '#./#./#./#./#./#./.#',
  'm': '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
  'n': '..../..../###./#..#/#..#/#..#/#..#',
  'o': '..../..../.##./#..#/#..#/#..#/.##.',
  'p': '..../..../###./#..#/#..#/#..#/###./#.../#...',
  'q': '..../..../.###/#..#/#..#/#..#/.###/...#/...#',
  'r': '.../.../#.#/##./#../#../#..',
  's': '..../..../.###/#.../.##./...#/###.',
  't': '.#./.#./###/.#./.#./.#./..#',
  'u': '..../..../#..#/#..#/#..#/#..#/.###',
  'v': '...../...../#...#/#...#/#...#/.#.#./..#..',
  'w': '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.',
  'x': '..../..../#..#/#..#/.##./#..#/#..#',
  'y': '..../..../#..#/#..#/#..#/#..#/.###/...#/.##.',
  'z': '..../..../####/...#/.##./#.../####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '.#./##./.#./.#./.#./.#./###',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '../../../../../../..',
  '.': './././././././#',
  ',': '././././././#/#',
  '!': '#/#/#/#/#/./#',
  '¡': './#/./#/#/#/#/#',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '¿': '..#../...../..#../.#.../#..../#...#/.###.',
  ':': './././#/./././#',
  ';': './././#/./././#/#',
  '-': '.../.../.../###/.../.../...',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '=': '..../..../####/..../####/..../....',
  '(': '.#/#./#./#./#./#./.#',
  ')': '#./.#/.#/.#/.#/.#/#.',
  '/': '....#/...#./...#./..#../.#.../.#.../#....',
  '\'': '#/#/./././././',
  '"': '#.#/#.#/.../.../.../.../...',
  '%': '##..#/##.#./...#./..#../.#.../.#.##/#..##',
  '♥': '...../.#.#./#####/#####/.###./..#../.....',
  '★': '..#../..#../#####/.###./.#.#./#...#/.....',
  '←': '...../..#../.#.../#####/.#.../..#../.....',
  '→': '...../..#../...#./#####/...#./..#../.....',
  '↑': '..#../.###./#.#.#/..#../..#../..#../.....',
  '↓': '..#../..#../..#../#.#.#/.###./..#../.....',
  '×': '...../#...#/.#.#./..#../.#.#./#...#/.....',
  '▶': '#.../##../###./####/###./##../#...',
  '▼': '...../...../#####/.###./..#../...../.....',
  '·': '././././#/./.',
  '_': '...../...../...../...../...../...../#####'
};

// Letras con tilde: letra base + marca encima (fila 0 de las mayúsculas o filas 1-2 de las minúsculas)
const FONT_ACCENTS = {
  'á': ['a', 'acute'], 'é': ['e', 'acute'], 'í': ['i', 'acute'], 'ó': ['o', 'acute'], 'ú': ['u', 'acute'],
  'ü': ['u', 'dieresis'], 'ñ': ['n', 'tilde'],
  'Á': ['A', 'acute'], 'É': ['E', 'acute'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'], 'Ú': ['U', 'acute'],
  'Ñ': ['N', 'tilde']
};

const PixelFont = {
  LINE_HEIGHT: 11,
  glyphs: {},
  colorCache: {},

  /** Prepara los mapas de bits de todas las letras (una sola vez). */
  init() {
    for (const [character, pattern] of Object.entries(FONT_GLYPHS)) {
      this.glyphs[character] = this.parseGlyph(pattern);
    }
    for (const [character, [base, accent]] of Object.entries(FONT_ACCENTS)) {
      this.glyphs[character] = this.addAccent(this.glyphs[base], accent, base === base.toUpperCase());
    }
  },

  /** Convierte el patrón "##./#.#" en una matriz de 10 filas (fila 0 = tildes). */
  parseGlyph(pattern) {
    const rows = pattern.split('/');
    const width = Math.max(...rows.map((row) => row.length));
    const pixels = [new Array(width).fill(false)];
    rows.forEach((row) => pixels.push([...row.padEnd(width, '.')].map((c) => c === '#')));
    while (pixels.length < 10) pixels.push(new Array(width).fill(false));
    return { width, pixels };
  },

  addAccent(baseGlyph, accent, isCapital) {
    const pixels = baseGlyph.pixels.map((row) => row.slice());
    const width = baseGlyph.width;
    const center = Math.floor(width / 2);
    const set = (x, y) => { if (x >= 0 && x < width) pixels[y][x] = true; };
    const top = isCapital ? 0 : 1;
    if (accent === 'acute') {
      if (isCapital) { set(center, 0); set(center + 1, 0); } else { set(center + 1, top); set(center, top + 1); }
      if (!isCapital && width === 1) { pixels[1][0] = true; pixels[2][0] = false; }
    } else if (accent === 'dieresis') {
      set(center - 1, top); set(center + 1, top);
    } else if (accent === 'tilde') {
      if (isCapital) {
        set(center - 1, 0); set(center, 0); set(center + 1, 0);
      } else {
        // Zigzag de dos filas: ~
        for (let x = 0; x < width; x++) set(x, x % 2 === 1 ? top : top + 1);
      }
    }
    return { width, pixels };
  },

  getGlyph(character) {
    return this.glyphs[character] || this.glyphs['?'];
  },

  /** Imagen de una letra en un color concreto (se guarda en caché). */
  getColoredGlyph(character, color) {
    const key = character + color;
    if (this.colorCache[key]) return this.colorCache[key];
    const glyph = this.getGlyph(character);
    const buffer = new PixelBuffer(glyph.width, 10);
    const colorInt = Color.toInt(color);
    glyph.pixels.forEach((row, y) => row.forEach((on, x) => { if (on) buffer.data[y * glyph.width + x] = colorInt; }));
    this.colorCache[key] = buffer.toCanvas();
    return this.colorCache[key];
  },

  /** Ancho en píxeles de un texto. */
  measure(text, scale = 1) {
    let width = 0;
    for (const character of text) width += this.getGlyph(character).width + 1;
    return Math.max(0, width - 1) * scale;
  },

  /**
   * Escribe un texto. (x, y) es la esquina superior de la línea.
   * @param {object} options color, shadow (color de la sombra), outline, scale, align ('left'|'center'|'right')
   */
  draw(ctx, text, x, y, options = {}) {
    const { color = '#ffffff', shadow = null, outline = null, scale = 1, align = 'left' } = options;
    let startX = x;
    if (align === 'center') startX = x - this.measure(text, scale) / 2;
    else if (align === 'right') startX = x - this.measure(text, scale);
    startX = Math.round(startX);
    y = Math.round(y);

    if (outline) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        this.drawRaw(ctx, text, startX + dx * scale, y + dy * scale, outline, scale);
      }
    }
    if (shadow) this.drawRaw(ctx, text, startX, y + scale, shadow, scale);
    this.drawRaw(ctx, text, startX, y, color, scale);
  },

  drawRaw(ctx, text, x, y, color, scale) {
    let cursor = x;
    for (const character of text) {
      const glyph = this.getGlyph(character);
      if (character !== ' ') {
        ctx.drawImage(this.getColoredGlyph(character, color), cursor, y, glyph.width * scale, 10 * scale);
      }
      cursor += (glyph.width + 1) * scale;
    }
  },

  /** Divide un texto en líneas que quepan en maxWidth píxeles. */
  wrap(text, maxWidth, scale = 1) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (this.measure(candidate, scale) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
};

/* ===================== Utilidades de dibujo en pantalla ===================== */

/**
 * Panel con borde de píxeles (para diálogos, carteles y HUD).
 * Dibuja un rectángulo con esquinas recortadas, borde oscuro y brillo.
 */
function drawPixelPanel(ctx, x, y, w, h, style = {}) {
  const { fill = '#f6e7c8', border = '#3b2214', light = '#fff8e8', shade = '#d9bf94' } = style;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = light;
  ctx.fillRect(x + 3, y + 2, w - 6, 1);
  ctx.fillRect(x + 2, y + 3, 1, h - 6);
  ctx.fillStyle = shade;
  ctx.fillRect(x + 3, y + h - 3, w - 6, 1);
  ctx.fillRect(x + w - 3, y + 3, 1, h - 6);
}
