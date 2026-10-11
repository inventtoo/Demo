/* =====================================================================
   scenery.js - Pixel art de los escenarios
   ---------------------------------------------------------------------
   Genera por código (píxel a píxel) todo el arte de los escenarios:
   - Fondos con efecto parallax: cielo tramado, sol/luna, montañas,
     nubes, colinas, bosques y siluetas del castillo.
   - Casillas de suelo que se adaptan a sus vecinas (bordes, césped,
     nieve, almenas).
   - Plataformas, pinchos, lava, trampas de fuego, puertas, carteles,
     banderas, jaula, antorchas, árboles, arbustos, flores y rocas.
   Todo se genera una vez y se guarda en caché como imágenes.
   ===================================================================== */
'use strict';

/* ============================ Paletas ============================ */

const SCENERY_THEMES = {
  forest: {
    sky: ['#4fa3e8', '#6fbdf2', '#95d3f8', '#bde6fb', '#e0f5ff'],
    sun: { type: 'sun', x: 0.8, y: 0.2, radius: 24, colors: ['#fff9d6', '#ffe89a', '#fff3c4'] },
    far: { colors: ['#6f8fc8', '#86a7d8', '#a3c0e6'], snow: ['#d6e4f7', '#f4f9ff'], base: 0.66, amp: 0.34, snowLine: 0.44, seed: 1 },
    cloud: ['#a9c8e8', '#d4e6f7', '#f2f8ff', '#ffffff'],
    mid: { colors: ['#4c9a5a', '#62b066', '#7cc677'], base: 0.72, amp: 0.08, seed: 3 },
    near: { type: 'trees', colors: ['#1f5a35', '#2c7342', '#3d8c4e', '#56a65c'], trunk: '#3a2614', base: 0.83, seed: 5 },
    ground: {
      body: ['#3a2212', '#55351c', '#714a28', '#8d6136'],
      top: ['#24581f', '#33802c', '#4ca43a', '#79cc52', '#a8e878'],
      outline: '#24130a', topKind: 'grass'
    },
    platform: { wood: ['#3a2212', '#6b4224', '#8f5d33', '#b07a45'], top: ['#33802c', '#5cbf4a'] }
  },
  mountains: {
    sky: ['#3e4a9a', '#6a62b4', '#a77ab8', '#e895a8', '#ffc18e'],
    sun: { type: 'sunset', x: 0.68, y: 0.6, radius: 36, colors: ['#ffe6a8', '#ffb877', '#ff9a8a'] },
    far: { colors: ['#4e4a8a', '#5e5a9c', '#7470b0'], snow: ['#c9c4ea', '#f2eeff'], base: 0.68, amp: 0.42, snowLine: 0.4, seed: 7 },
    cloud: ['#b9879e', '#e5a9b4', '#ffd2c2', '#fff0e6'],
    mid: { colors: ['#3f3a6e', '#4e4880', '#615a94'], base: 0.74, amp: 0.16, seed: 11, snow: ['#b9b4dc', '#e2deff'] },
    near: { type: 'pines', colors: ['#1d2a3a', '#26384a', '#33495c', '#46627a'], trunk: '#2a1c18', base: 0.86, seed: 13 },
    ground: {
      body: ['#2e2a3e', '#46405a', '#5f5878', '#7a7394'],
      top: ['#7f8fbf', '#a9b8de', '#d3def4', '#f2f7ff', '#ffffff'],
      outline: '#1a1626', topKind: 'snow'
    },
    platform: { wood: ['#2e2a3e', '#5f5878', '#7a7394', '#9a93b2'], top: ['#d3def4', '#ffffff'] }
  },
  castle: {
    sky: ['#0a0818', '#120e2a', '#1c1540', '#2a1f56', '#3a2a6a'],
    sun: { type: 'moon', x: 0.76, y: 0.2, radius: 20, colors: ['#fff7d6', '#e8dcb0', '#c9bc92'] },
    far: { colors: ['#14102a', '#191334', '#1e183e'], snow: null, base: 0.7, amp: 0.1, snowLine: 0, seed: 17 },
    cloud: ['#2a2350', '#3a3066', '#4d417d', '#5e5190'],
    mid: { type: 'castle', colors: ['#120d26', '#1a1434', '#231b44'], base: 0.72, seed: 19 },
    near: { type: 'spires', colors: ['#0d0a1c', '#151030', '#1d1640', '#2a2056'], trunk: '#0d0a1c', base: 0.86, seed: 23 },
    ground: {
      body: ['#1a1428', '#2a2340', '#3b3258', '#4e4470'],
      top: ['#3b3258', '#544a7a', '#6e6398', '#8a80b4', '#a89ecf'],
      outline: '#0e0a18', topKind: 'stone'
    },
    platform: { wood: ['#1a1428', '#3b3258', '#544a7a', '#6e6398'], top: ['#6e6398', '#8a80b4'] }
  },
  ending: {
    sky: ['#ff8a80', '#ffa585', '#ffc290', '#ffdca6', '#fff0c8'],
    sun: { type: 'sunset', x: 0.5, y: 0.66, radius: 34, colors: ['#fff6d0', '#ffd890', '#ffb37a'] },
    far: { colors: ['#c47a9a', '#d48ea8', '#e3a5b8'], snow: ['#f5d2dc', '#fff0f4'], base: 0.68, amp: 0.3, snowLine: 0.5, seed: 29 },
    cloud: ['#e89a9a', '#ffbdb0', '#ffe0d0', '#fff6ee'],
    mid: { colors: ['#6aa070', '#80b47c', '#9ac78c'], base: 0.74, amp: 0.08, seed: 31 },
    near: { type: 'trees', colors: ['#2f5e3c', '#3d7448', '#4f8c55', '#6aa865'], trunk: '#3a2614', base: 0.85, seed: 37 },
    ground: {
      body: ['#3a2212', '#55351c', '#714a28', '#8d6136'],
      top: ['#24581f', '#33802c', '#4ca43a', '#79cc52', '#a8e878'],
      outline: '#24130a', topKind: 'grass'
    },
    platform: { wood: ['#3a2212', '#6b4224', '#8f5d33', '#b07a45'], top: ['#33802c', '#5cbf4a'] }
  }
};

/** Ruido periódico: se repite cada "period" píxeles (para fondos que se repiten sin cortes). */
function periodicNoise(x, period, seed, maxOctaves = 6) {
  const octaves = [[1, 0.42], [2, 0.26], [3, 0.14], [5, 0.1], [9, 0.05], [17, 0.03]];
  let value = 0;
  for (const [frequency, amplitude] of octaves.slice(0, maxOctaves)) {
    value += amplitude * Math.sin((Math.PI * 2 * frequency * x) / period + seed * 1.37 * frequency + frequency);
  }
  return value;
}

/** Elige un color de una rampa según un valor 0..1, con tramado entre tonos vecinos. */
function ditheredRamp(ramp, value, x, y) {
  const scaled = clamp(value, 0, 0.999) * (ramp.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  return ditherAt(x, y, fraction) ? ramp[Math.min(index + 1, ramp.length - 1)] : ramp[index];
}

/* ============================ Fondos ============================ */

const Scenery = {
  cache: {},

  /**
   * Capas del fondo para un tema y un tamaño de pantalla.
   * Devuelve [{ image, parallax, drift }] de la más lejana a la más cercana.
   */
  getBackgroundLayers(themeName, width, height) {
    const key = `bg-${themeName}-${width}x${height}`;
    if (!this.cache[key]) this.cache[key] = this.buildBackground(themeName, width, height);
    return this.cache[key];
  },

  buildBackground(themeName, width, height) {
    const theme = SCENERY_THEMES[themeName];
    const scale = height / 360;
    const layers = [];
    layers.push({ image: this.buildSky(theme, width, height, scale), parallax: 0, drift: 0 });
    layers.push({ image: this.buildRidgeLayer(theme.far, theme, width, height, scale), parallax: 0.08, drift: 0 });
    layers.push({ image: this.buildClouds(theme, width, height, scale), parallax: 0.15, drift: 6 * scale });
    if (theme.mid.type === 'castle') {
      layers.push({ image: this.buildCastleSilhouette(theme.mid, width, height, scale), parallax: 0.25, drift: 0 });
    } else {
      layers.push({ image: this.buildRidgeLayer(theme.mid, theme, width, height, scale, true), parallax: 0.25, drift: 0 });
    }
    layers.push({ image: this.buildNearLayer(theme.near, width, height, scale), parallax: 0.45, drift: 0 });
    return layers;
  },

  /** Cielo con bandas de color tramadas, y el sol, la puesta de sol o la luna. */
  buildSky(theme, width, height, scale) {
    const buffer = new PixelBuffer(width, height);
    for (let y = 0; y < height; y++) {
      const t = (y / height) * 1.15;
      for (let x = 0; x < width; x++) buffer.set(x, y, ditheredRamp(theme.sky, t, x, y));
    }
    const sun = theme.sun;
    const sunX = Math.round(sun.x * width);
    const sunY = Math.round(sun.y * height);
    const radius = Math.round(sun.radius * scale);
    if (sun.type === 'moon') {
      // Halo tramado alrededor de la luna
      for (let y = -radius * 3; y <= radius * 3; y++) {
        for (let x = -radius * 3; x <= radius * 3; x++) {
          const distance = Math.hypot(x, y) / radius;
          if (distance > 1 && distance < 3 && ditherAt(sunX + x, sunY + y, (3 - distance) / 5)) buffer.set(sunX + x, sunY + y, '#3d3270');
        }
      }
      buffer.glowDisc(sunX, sunY, radius, [sun.colors[2], sun.colors[1], sun.colors[0], sun.colors[0]]);
      // Cráteres
      for (const [cx, cy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.3, 0.16], [0.35, -0.35, 0.1]]) {
        buffer.ellipse(sunX + cx * radius, sunY + cy * radius, r * radius, r * radius, sun.colors[2]);
      }
      // Estrellas
      for (let i = 0; i < 90 * (width / 640); i++) {
        const starX = Math.floor(hashNoise(i, 1, 3) * width);
        const starY = Math.floor(hashNoise(i, 2, 3) * height * 0.6);
        buffer.set(starX, starY, hashNoise(i, 4, 3) > 0.7 ? '#fff4c2' : '#c9c2ff');
      }
    } else {
      // Halo del sol en anillos tramados
      for (let y = -radius * 3; y <= radius * 3; y++) {
        for (let x = -radius * 3; x <= radius * 3; x++) {
          const distance = Math.hypot(x, y) / radius;
          if (distance > 1 && distance < 2.6 && ditherAt(sunX + x, sunY + y, (2.6 - distance) / 3)) buffer.set(sunX + x, sunY + y, sun.colors[2]);
        }
      }
      buffer.glowDisc(sunX, sunY, radius, [sun.colors[1], sun.colors[0], sun.colors[0]]);
      if (sun.type === 'sunset') {
        // Franjas horizontales en la mitad inferior (estilo retro)
        for (let stripe = 0; stripe < 5; stripe++) {
          const stripeY = sunY + Math.round(radius * (0.25 + stripe * 0.17));
          for (let x = -radius; x <= radius; x++) {
            for (let thickness = 0; thickness <= Math.floor(stripe / 2); thickness++) {
              if (buffer.isOpaque(sunX + x, stripeY + thickness) && Math.hypot(x, stripeY + thickness - sunY) < radius + 0.5) {
                buffer.set(sunX + x, stripeY + thickness, ditheredRamp(theme.sky, ((stripeY + thickness) / height) * 1.15, sunX + x, stripeY + thickness));
              }
            }
          }
        }
      }
    }
    return buffer.toCanvas();
  },

  /**
   * Cordillera sombreada: las laderas que miran a la izquierda (hacia la
   * luz) son más claras, hay nieve en las cumbres y un borde iluminado.
   */
  buildRidgeLayer(config, theme, width, height, scale, isHills = false) {
    const buffer = new PixelBuffer(width, height);
    // Montañas: mezcla de ruido "afilado" (picos) y ruido suave (laderas)
    const ridgeShape = (x) => {
      const value = periodicNoise(x, width, config.seed);
      return isHills ? value * 0.5 + 0.5 : (1 - Math.abs(value)) * 0.65 + (value * 0.5 + 0.5) * 0.35;
    };
    const ridge = (x) => Math.round(height * (config.base - ridgeShape(x) * config.amp));
    const smoothRidgeShape = (x) => {
      const value = periodicNoise(x, width, config.seed, 3);
      return (1 - Math.abs(value)) * 0.65 + (value * 0.5 + 0.5) * 0.35;
    };
    const haze = theme.sky[theme.sky.length - 1];
    for (let x = 0; x < width; x++) {
      const top = ridge(x);
      // La luz depende de la forma general (suave) de la montaña, no de cada bache:
      // una ladera que sube hacia la derecha mira a la izquierda, hacia la luz
      const hillLight = ridge(x + 4) < ridge(x - 4);
      for (let y = top; y < height; y++) {
        const depth = y - top;
        // La frontera luz/sombra se inclina con la profundidad: parecen aristas de verdad
        const slant = depth * 0.7;
        const facingLight = isHills ? hillLight : smoothRidgeShape(x + 3 - slant) > smoothRidgeShape(x - 3 - slant);
        let color;
        if (isHills) {
          const light = facingLight ? 2 : 1;
          color = depth < 2 ? config.colors[2] : (depth < 5 && ditherAt(x, y, 0.5) ? config.colors[light] : config.colors[light - 1 + (facingLight ? 0 : 0)]);
          if (depth >= 5) color = ditherAt(x, y, smoothNoise2D(x / 9, y / 6, config.seed) * 0.8) ? config.colors[1] : config.colors[0];
        } else {
          color = facingLight ? config.colors[1] : config.colors[0];
          if (depth < 2 && facingLight) color = config.colors[2];
          // Estratos de roca: manchas horizontales tramadas
          if (smoothNoise2D(x / 14, y / 5, config.seed) > 0.68 && ditherAt(x, y, 0.5)) color = facingLight ? config.colors[2] : config.colors[1];
        }
        const snowLine = height * config.snowLine + periodicNoise(x, width, config.seed + 5) * 5 * scale;
        const snow = config.snow || (isHills ? null : theme.far.snow);
        const snowDepth = 22 * scale + periodicNoise(x * 2, width, config.seed + 9) * 6 * scale;
        if (snow && !isHills && y < snowLine && depth < snowDepth) color = facingLight ? snow[1] : snow[0];
        if (snow && isHills && config.snow && depth < 3 && top < height * 0.68) color = facingLight ? snow[1] : snow[0];
        // Bruma cerca de la base de las montañas lejanas
        if (!isHills && y > height * (config.base + 0.04) && ditherAt(x, y, (y - height * (config.base + 0.04)) / (height * 0.12))) color = haze;
        buffer.set(x, y, color);
      }
    }
    return buffer.toCanvas();
  },

  /** Nubes redondeadas con tres tonos y base plana. */
  buildClouds(theme, width, height, scale) {
    const buffer = new PixelBuffer(width, height);
    const ramp = theme.cloud;
    const count = Math.round(6 * (width / 640));
    for (let i = 0; i < count; i++) {
      const centerX = (i + 0.5) * (width / count) + (hashNoise(i, 1, 9) - 0.5) * 40 * scale;
      const centerY = height * (0.12 + hashNoise(i, 2, 9) * 0.3);
      const size = (16 + hashNoise(i, 3, 9) * 14) * scale;
      const puffs = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.95, 0.2, 0.75], [-0.4, -0.35, 0.75], [0.45, -0.3, 0.65]];
      for (let y = Math.floor(centerY - size * 1.4); y <= centerY + size * 0.5; y++) {
        for (let x = Math.floor(centerX - size * 2); x <= centerX + size * 2; x++) {
          let best = -1;
          for (const [px, py, pr] of puffs) {
            const dx = (x - (centerX + px * size)) / (pr * size);
            const dy = (y - (centerY + py * size)) / (pr * size);
            const distance = dx * dx + dy * dy;
            if (distance <= 1) best = Math.max(best, -dx * 0.5 - dy * 0.8 + Math.sqrt(1 - distance) * 0.5);
          }
          if (best < 0 && best !== -1) best = 0;
          if (best === -1) continue;
          const bottomShade = y > centerY + size * 0.25 ? 0 : 1;
          const value = clamp(best * 0.9 + 0.2, 0, 1) * bottomShade + (bottomShade ? 0 : 0.05);
          const wrappedX = ((Math.round(x) % width) + width) % width;
          buffer.set(wrappedX, y, ditheredRamp(ramp, value, wrappedX, y));
        }
      }
    }
    return buffer.toCanvas();
  },

  /** Siluetas de torres del castillo con ventanas encendidas. */
  buildCastleSilhouette(config, width, height, scale) {
    const buffer = new PixelBuffer(width, height);
    const baseY = Math.round(height * config.base);
    const [dark, mid, light] = config.colors;
    // Muralla continua con almenas
    for (let x = 0; x < width; x++) {
      const wallTop = baseY - Math.round(28 * scale);
      const merlon = Math.floor(x / Math.max(2, Math.round(6 * scale))) % 2 === 0 ? Math.round(5 * scale) : 0;
      for (let y = wallTop - merlon; y < height; y++) buffer.set(x, y, mid);
    }
    // Torres
    const towers = Math.round(5 * (width / 640));
    for (let i = 0; i < towers; i++) {
      const towerWidth = Math.round((22 + hashNoise(i, 1, 41) * 16) * scale);
      const towerX = Math.round((i + 0.3) * (width / towers) + hashNoise(i, 2, 41) * 30 * scale);
      const towerTop = baseY - Math.round((70 + hashNoise(i, 3, 41) * 70) * scale);
      for (let y = towerTop; y < height; y++) {
        for (let x = towerX; x < towerX + towerWidth; x++) {
          const edge = x - towerX < Math.max(1, Math.round(3 * scale)) ? light : (x - towerX > towerWidth - 3 * scale ? dark : mid);
          buffer.set(x % width, y, edge);
        }
      }
      // Tejado cónico
      const roofHeight = Math.round(towerWidth * 1.3);
      for (let y = 0; y < roofHeight; y++) {
        const half = Math.round((y / roofHeight) * (towerWidth / 2 + 3 * scale));
        for (let x = -half; x <= half; x++) {
          const px = Math.round(towerX + towerWidth / 2 + x);
          buffer.set(((px % width) + width) % width, towerTop - roofHeight + y, x < 0 ? light : dark);
        }
      }
      // Ventanas iluminadas en arco
      const windows = 1 + Math.floor(hashNoise(i, 4, 41) * 3);
      for (let w = 0; w < windows; w++) {
        const windowX = Math.round(towerX + towerWidth / 2 - 2 * scale);
        const windowY = towerTop + Math.round((14 + w * 26) * scale);
        const ww = Math.max(2, Math.round(4 * scale));
        const wh = Math.max(3, Math.round(7 * scale));
        for (let y = 0; y < wh; y++) {
          for (let x = 0; x < ww; x++) {
            if (y === 0 && (x === 0 || x === ww - 1)) continue;
            buffer.set((windowX + x) % width, windowY + y, y < wh / 2 ? '#ffd27a' : '#ff9d3c');
          }
        }
      }
    }
    return buffer.toCanvas();
  },

  /** Capa más cercana: copas de árboles, pinos nevados o agujas oscuras. */
  buildNearLayer(config, width, height, scale) {
    const buffer = new PixelBuffer(width, height);
    const baseY = Math.round(height * config.base);
    const ramp = config.colors;
    if (config.type === 'trees') {
      const count = Math.round(26 * (width / 640));
      for (let i = 0; i < count; i++) {
        const x = (i / count) * width + hashNoise(i, 1, config.seed) * 14 * scale;
        const radius = (12 + hashNoise(i, 2, config.seed) * 10) * scale;
        const y = baseY - radius * 0.8 - hashNoise(i, 3, config.seed) * 14 * scale;
        for (const offset of [-width, 0, width]) {
          buffer.rect(Math.round(x + offset - 2 * scale), Math.round(y), Math.max(2, Math.round(4 * scale)), height, config.trunk);
          buffer.shadedEllipse(x + offset, y, radius, radius * 0.9, ramp, { ditherNoise: 0.5, seed: i });
        }
      }
      for (let y = baseY; y < height; y++) for (let x = 0; x < width; x++) buffer.set(x, y, ditheredRamp(ramp, 0.25 - (y - baseY) / height, x, y));
    } else if (config.type === 'pines') {
      const count = Math.round(30 * (width / 640));
      for (let i = 0; i < count; i++) {
        const centerX = (i / count) * width + hashNoise(i, 1, config.seed) * 12 * scale;
        const treeHeight = (40 + hashNoise(i, 2, config.seed) * 34) * scale;
        const treeWidth = treeHeight * 0.36;
        for (const offset of [-width, 0, width]) {
          for (let y = 0; y < treeHeight; y++) {
            const half = Math.round((y / treeHeight) * treeWidth * (0.75 + 0.25 * ((y % Math.round(10 * scale + 1)) / (10 * scale + 1))));
            for (let x = -half; x <= half; x++) {
              const px = Math.round(centerX + offset + x);
              const py = Math.round(baseY - treeHeight + y);
              let color = x < 0 ? ramp[2] : ramp[1];
              if (x < -half + 2 && x < 0) color = ramp[3];
              if (y < treeHeight * 0.3 && x < 0 && ditherAt(px, py, 0.5)) color = '#dfe8ff';
              buffer.set(px, py, color);
            }
          }
        }
      }
      for (let y = baseY; y < height; y++) for (let x = 0; x < width; x++) buffer.set(x, y, ramp[0]);
    } else {
      // Agujas y árboles secos del castillo
      const count = Math.round(18 * (width / 640));
      for (let i = 0; i < count; i++) {
        const centerX = (i / count) * width + hashNoise(i, 1, config.seed) * 20 * scale;
        const spikeHeight = (24 + hashNoise(i, 2, config.seed) * 50) * scale;
        const spikeWidth = (6 + hashNoise(i, 3, config.seed) * 10) * scale;
        for (const offset of [-width, 0, width]) {
          for (let y = 0; y < spikeHeight; y++) {
            const half = Math.round((y / spikeHeight) * spikeWidth);
            for (let x = -half; x <= half; x++) buffer.set(Math.round(centerX + offset + x), Math.round(baseY - spikeHeight + y), x < 0 ? ramp[2] : ramp[1]);
          }
        }
      }
      for (let y = baseY; y < height; y++) for (let x = 0; x < width; x++) buffer.set(x, y, ditherAt(x, y, 0.3) ? ramp[1] : ramp[0]);
    }
    return buffer.toCanvas();
  },

  /**
   * Dibuja el fondo completo. cameraX es la posición de la cámara y time
   * se usa para que las nubes se desplacen solas.
   */
  drawBackground(ctx, themeName, cameraX, time, width, height) {
    const layers = this.getBackgroundLayers(themeName, width, height);
    for (const layer of layers) {
      let offset = Math.round(cameraX * layer.parallax + time * layer.drift) % width;
      if (offset < 0) offset += width;
      ctx.drawImage(layer.image, -offset, 0);
      if (layer.parallax > 0 || layer.drift > 0) ctx.drawImage(layer.image, width - offset, 0);
    }
  },

  /* ============================ Casillas de suelo ============================ */

  /**
   * Devuelve la imagen de una casilla de suelo (24x28: 4 píxeles de margen
   * superior para el césped o la nieve que sobresale).
   * mask: 1 = arriba expuesto, 2 = derecha, 4 = abajo, 8 = izquierda.
   */
  getGroundTile(themeName, mask, variant) {
    const key = `tile-${themeName}-${mask}-${variant}`;
    if (!this.cache[key]) this.cache[key] = this.buildGroundTile(themeName, mask, variant);
    return this.cache[key];
  },

  buildGroundTile(themeName, mask, variant) {
    const T = 24;
    const MARGIN = 4;
    const theme = SCENERY_THEMES[themeName].ground;
    const buffer = new PixelBuffer(T, T + MARGIN);
    const topOpen = mask & 1;
    const rightOpen = mask & 2;
    const bottomOpen = mask & 4;
    const leftOpen = mask & 8;
    const seed = variant * 31 + (themeName.length * 7);
    const body = theme.body;

    // ---- Relleno del bloque ----
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        let color;
        if (theme.topKind === 'stone') {
          // Ladrillos de 12x6 desplazados en filas alternas
          const row = Math.floor(y / 6);
          const brickX = (x + (row % 2) * 6) % 12;
          const brickId = Math.floor((x + (row % 2) * 6) / 12) + row * 3 + variant * 7;
          const brickY = y % 6;
          if (brickY === 5 || brickX === 11) color = body[0];
          else {
            const tone = 1 + Math.floor(hashNoise(brickId, 1, seed) * 2.2);
            color = body[Math.min(3, tone)];
            if (brickY === 0) color = body[Math.min(3, tone + 1)];
            if (brickX === 0 && brickY < 4) color = body[Math.min(3, tone + 1)];
            if (hashNoise(x, y, seed + 3) > 0.94) color = body[Math.max(0, tone - 1)];
          }
        } else {
          const noise = smoothNoise2D(x / 5 + variant * 3, y / 4, seed) * 0.6 + hashNoise(x, y, seed) * 0.4;
          color = body[noise > 0.72 ? 3 : noise > 0.45 ? 2 : noise > 0.2 ? 1 : 0];
          if (color === body[0] && hashNoise(x, y, seed + 1) > 0.5) color = body[1];
        }
        buffer.set(x, y + MARGIN, color);
      }
    }
    if (theme.topKind !== 'stone') {
      // Piedrecitas
      for (let i = 0; i < 2; i++) {
        const px = 3 + Math.floor(hashNoise(i, variant, seed + 9) * 17);
        const py = 9 + Math.floor(hashNoise(variant, i, seed + 9) * 11);
        buffer.rect(px, py + MARGIN, 3, 2, body[3]);
        buffer.rect(px, py + MARGIN + 2, 3, 1, body[0]);
        buffer.set(px, py + MARGIN, theme.top[4] && theme.topKind === 'snow' ? body[3] : body[3]);
      }
    }

    // ---- Bordes laterales e inferior ----
    for (let y = 0; y < T; y++) {
      if (leftOpen) { buffer.set(0, y + MARGIN, theme.outline); buffer.set(1, y + MARGIN, body[0]); }
      if (rightOpen) { buffer.set(T - 1, y + MARGIN, theme.outline); buffer.set(T - 2, y + MARGIN, body[0]); }
    }
    if (bottomOpen) {
      for (let x = 0; x < T; x++) { buffer.set(x, T - 1 + MARGIN, theme.outline); buffer.set(x, T - 2 + MARGIN, body[0]); }
    }

    // ---- Superficie superior ----
    if (topOpen) {
      const top = theme.top;
      for (let x = 0; x < T; x++) {
        const depth = (theme.topKind === 'stone' ? 5 : 5) + Math.round(smoothNoise(x / 3 + variant * 7, seed) * 3) + (theme.topKind === 'snow' && hashNoise(x, 1, seed) > 0.85 ? 3 : 0);
        for (let y = 0; y < depth; y++) {
          let color;
          if (y === 0) color = top[4];
          else if (y === 1) color = top[3];
          else if (y < depth - 2) color = ditherAt(x, y, 0.5) ? top[2] : top[3];
          else color = y === depth - 1 ? top[0] : top[1];
          if (theme.topKind === 'stone') color = y === 0 ? top[4] : y === depth - 1 ? body[0] : (x % 12 === 11 ? top[0] : top[y < 2 ? 3 : 2]);
          buffer.set(x, y + MARGIN, color);
        }
        // Sombra que deja el borde sobre el bloque
        buffer.set(x, depth + MARGIN, body[0]);
        // Hierba o nieve que sobresale por encima
        if (theme.topKind === 'grass') {
          const blade = hashNoise(x, 7, seed);
          if (blade > 0.55) buffer.set(x, MARGIN - 1, top[3]);
          if (blade > 0.8) buffer.set(x, MARGIN - 2, top[4]);
          if (blade > 0.93) buffer.set(x, MARGIN - 3, top[3]);
        } else if (theme.topKind === 'snow') {
          const bump = Math.round(smoothNoise(x / 4 + variant * 5, seed + 2) * 2);
          for (let y = 1; y <= bump; y++) buffer.set(x, MARGIN - y, top[4]);
        }
      }
      // Flor o seta decorativa en algunas casillas de césped
      if (theme.topKind === 'grass' && variant === 2) {
        const fx = 6 + (seed % 10);
        buffer.set(fx, MARGIN - 1, '#3f9a33');
        buffer.set(fx, MARGIN - 2, '#3f9a33');
        buffer.set(fx - 1, MARGIN - 3, '#ffffff'); buffer.set(fx + 1, MARGIN - 3, '#ffffff');
        buffer.set(fx, MARGIN - 4, '#ffffff'); buffer.set(fx, MARGIN - 3, '#ffd23f');
      }
      // Esquinas redondeadas
      if (leftOpen) { buffer.set(0, MARGIN, 0); buffer.set(0, MARGIN + 1, theme.outline); buffer.set(1, MARGIN, theme.outline); }
      if (rightOpen) { buffer.set(T - 1, MARGIN, 0); buffer.set(T - 1, MARGIN + 1, theme.outline); buffer.set(T - 2, MARGIN, theme.outline); }
    }
    return buffer.toCanvas();
  },

  /* ============================ Plataformas ============================ */

  /**
   * Tramo de plataforma (24x12). part: 'left' | 'middle' | 'right' | 'single'.
   * kind: 'static' | 'moving' | 'crumble'
   */
  getPlatformTile(themeName, part, kind) {
    const key = `platform-${themeName}-${part}-${kind}`;
    if (!this.cache[key]) this.cache[key] = this.buildPlatformTile(themeName, part, kind);
    return this.cache[key];
  },

  buildPlatformTile(themeName, part, kind) {
    const T = 24;
    const H = 12;
    const theme = SCENERY_THEMES[themeName];
    const wood = theme.platform.wood;
    const outline = theme.ground.outline;
    const buffer = new PixelBuffer(T, H);
    const isWood = themeName === 'forest' || themeName === 'ending';
    const roundLeft = part === 'left' || part === 'single';
    const roundRight = part === 'right' || part === 'single';
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < T; x++) {
        let color = wood[2];
        if (isWood) {
          // Vetas de la madera
          const grain = smoothNoise2D(x / 6, y * 1.3, 3);
          color = grain > 0.65 ? wood[3] : grain < 0.25 ? wood[1] : wood[2];
          if (y === 5) color = wood[1];
        } else {
          const noise = hashNoise(x, y, 5);
          color = noise > 0.85 ? wood[3] : noise < 0.15 ? wood[1] : wood[2];
          if (x === 11 || x === 23) color = wood[1];
        }
        if (y === 0) color = wood[3];
        if (y >= H - 3) color = wood[1];
        buffer.set(x, y, color);
      }
    }
    for (let x = 0; x < T; x++) buffer.set(x, H - 1, outline);
    // Remates redondeados en los extremos
    if (roundLeft) {
      for (let y = 0; y < H; y++) { buffer.set(0, y, outline); buffer.set(1, y, wood[1]); }
      buffer.set(0, 0, 0); buffer.set(0, H - 1, 0); buffer.set(1, 0, outline);
    }
    if (roundRight) {
      for (let y = 0; y < H; y++) { buffer.set(T - 1, y, outline); buffer.set(T - 2, y, wood[1]); }
      buffer.set(T - 1, 0, 0); buffer.set(T - 1, H - 1, 0); buffer.set(T - 2, 0, outline);
    }
    // Clavos o remaches
    buffer.set(4, 3, wood[0]); buffer.set(19, 3, wood[0]);
    buffer.set(4, 7, wood[0]); buffer.set(19, 7, wood[0]);
    // Musgo o nieve encima
    const top = theme.platform.top;
    for (let x = 1; x < T - 1; x++) {
      if (hashNoise(x, 3, 11) > (isWood ? 0.55 : 0.2)) buffer.set(x, 0, top[1]);
      if (!isWood && hashNoise(x, 4, 11) > 0.6) buffer.set(x, 1, top[0]);
    }
    if (kind === 'moving') {
      // Bordes dorados: así se distinguen las plataformas que se mueven
      for (let x = 0; x < T; x++) { buffer.set(x, H - 3, '#ffd23f'); buffer.set(x, H - 2, '#c98a00'); }
      if (part === 'middle' || part === 'single') {
        buffer.set(10, 5, '#ffd23f'); buffer.set(11, 4, '#ffd23f'); buffer.set(11, 6, '#ffd23f');
        buffer.set(13, 5, '#ffd23f'); buffer.set(12, 4, '#ffd23f'); buffer.set(12, 6, '#ffd23f');
      }
    } else if (kind === 'crumble') {
      // Grietas
      const crack = [[6, 1], [7, 2], [7, 3], [8, 4], [7, 5], [7, 6], [16, 2], [15, 3], [15, 4], [16, 5], [17, 6], [17, 7]];
      for (const [cx, cy] of crack) buffer.set(cx, cy, outline);
      for (let x = 2; x < T - 2; x += 5) buffer.set(x, H - 2, outline);
    }
    return buffer.toCanvas();
  },

  /* ============================ Peligros ============================ */

  getSpikes() {
    if (this.cache.spikes) return this.cache.spikes;
    const buffer = new PixelBuffer(24, 13);
    const ramp = ['#3d3f52', '#6b6f85', '#a6abc2', '#e6e9f4'];
    for (let spike = 0; spike < 4; spike++) {
      const baseX = spike * 6;
      for (let y = 0; y < 11; y++) {
        const half = Math.floor((y / 11) * 3);
        for (let x = -half; x <= half; x++) {
          const color = x < 0 ? ramp[3] : x === 0 ? ramp[2] : ramp[1];
          buffer.set(baseX + 3 + x, y + 1, color);
        }
      }
    }
    buffer.outline('#1b1828');
    for (let x = 0; x < 24; x++) { buffer.set(x, 12, '#1b1828'); buffer.set(x, 11, ramp[0]); }
    this.cache.spikes = new Sprite(buffer.toCanvas(), 0, 13);
    return this.cache.spikes;
  },

  /** Lava animada: superficie (4 fotogramas) y relleno. */
  getLavaFrames() {
    if (this.cache.lava) return this.cache.lava;
    const ramp = ['#5a0a12', '#8f1414', '#c4261a', '#f05a14', '#ff9a1f', '#ffd23f', '#fff3a0'];
    const frames = [];
    for (let frame = 0; frame < 4; frame++) {
      const surface = new PixelBuffer(24, 24);
      const body = new PixelBuffer(24, 24);
      for (let x = 0; x < 24; x++) {
        const wave = Math.round(Math.sin(((x + frame * 6) / 24) * Math.PI * 2) * 1.5 + 2);
        for (let y = 0; y < 24; y++) {
          const heat = smoothNoise2D((x + frame * 3) / 5, (y + frame * 2) / 5, 7);
          let surfaceColor = null;
          if (y >= wave) {
            const depth = y - wave;
            surfaceColor = depth === 0 ? ramp[6] : depth < 2 ? ramp[5] : depth < 5 ? ramp[4] : ditheredRamp(ramp, 0.35 + heat * 0.35, x, y);
          }
          if (surfaceColor) surface.set(x, y, surfaceColor);
          body.set(x, y, ditheredRamp(ramp, 0.2 + heat * 0.4, x + frame, y));
        }
      }
      // Burbuja que sube
      const bubbleX = 5 + ((frame * 7) % 14);
      const bubbleY = 14 - frame * 3;
      surface.set(bubbleX, bubbleY, ramp[6]); surface.set(bubbleX + 1, bubbleY, ramp[5]);
      surface.set(bubbleX, bubbleY + 1, ramp[5]);
      frames.push({ surface: surface.toCanvas(), body: body.toCanvas() });
    }
    this.cache.lava = frames;
    return frames;
  },

  /** Trampa de fuego: bloque (apagado/encendido) y llama (4 fotogramas). */
  getFireTrap() {
    if (this.cache.fireTrap) return this.cache.fireTrap;
    const makeBlock = (glowing) => {
      const buffer = new PixelBuffer(24, 24);
      const steel = ['#1e1a28', '#3a3448', '#5a5470', '#7d7896'];
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          let color = steel[2];
          if (y < 2 || x < 2) color = steel[3];
          if (y > 21 || x > 21) color = steel[1];
          buffer.set(x, y, color);
        }
      }
      // Rejilla
      for (let slot = 0; slot < 4; slot++) {
        for (let y = 4; y < 11; y++) {
          buffer.set(5 + slot * 4, y, glowing ? (y < 7 ? '#ffd23f' : '#ff7b00') : '#120e1a');
          buffer.set(6 + slot * 4, y, glowing ? '#ff7b00' : '#120e1a');
        }
      }
      // Remaches
      for (const [rx, ry] of [[3, 15], [20, 15], [3, 20], [20, 20]]) { buffer.set(rx, ry, steel[3]); buffer.set(rx + 1, ry + 1, steel[0]); }
      for (let x = 0; x < 24; x++) buffer.set(x, 23, steel[0]);
      return buffer.toCanvas();
    };
    const flameRamp = ['#a8121e', '#e63946', '#fb5607', '#ff9f1c', '#ffd23f', '#fff3b0', '#ffffff'];
    const flames = [];
    for (let frame = 0; frame < 4; frame++) {
      const buffer = new PixelBuffer(22, 70);
      for (let y = 0; y < 70; y++) {
        const t = y / 70; // 0 = arriba, 1 = abajo
        const halfWidth = (2 + t * 8) * (0.85 + 0.25 * Math.sin(y * 0.45 + frame * 1.7));
        const center = 11 + Math.sin(y * 0.2 + frame * 1.3) * (1 - t) * 2.5;
        for (let x = 0; x < 22; x++) {
          const distance = Math.abs(x + 0.5 - center) / halfWidth;
          if (distance > 1) continue;
          if (t < 0.15 && hashNoise(x, y + frame * 70, 3) > t * 6) continue;
          const heat = (1 - distance) * 0.7 + t * 0.4 + (hashNoise(x, y, frame) - 0.5) * 0.15;
          buffer.set(x, y, ditheredRamp(flameRamp, heat, x, y));
        }
      }
      flames.push(new Sprite(buffer.toCanvas(), 11, 70));
    }
    this.cache.fireTrap = { idle: makeBlock(false), glowing: makeBlock(true), flames };
    return this.cache.fireTrap;
  },

  /* ============================ Objetos del nivel ============================ */

  /** Puerta de madera con bandas de hierro y cerradura dorada. */
  getDoor(height) {
    const key = `door-${height}`;
    if (this.cache[key]) return this.cache[key];
    const W = 24;
    const buffer = new PixelBuffer(W, height);
    const wood = ['#2e1a0e', '#4f2f18', '#6e4424', '#8f5d33', '#b07a45'];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < W; x++) {
        const plank = Math.floor((x - 2) / 7);
        const plankX = (x - 2) % 7;
        let color = wood[2 + (plank % 2)];
        if (smoothNoise2D(x / 2, y / 9, plank + 2) > 0.7) color = wood[plank % 2 ? 4 : 3];
        if (plankX === 6) color = wood[1];
        if (x < 2 || x > W - 3) color = wood[0];
        buffer.set(x, y, color);
      }
    }
    // Bandas de hierro con remaches
    for (const bandY of [6, height - 12]) {
      for (let x = 2; x < W - 2; x++) {
        buffer.set(x, bandY, '#9aa1b8');
        buffer.set(x, bandY + 1, '#5a5f73');
        buffer.set(x, bandY + 2, '#2c2f3c');
      }
      for (let x = 4; x < W - 3; x += 6) buffer.set(x, bandY + 1, '#e6e9f4');
    }
    // Cerradura
    const lockY = Math.floor(height / 2) - 6;
    const lock = gridToBuffer(`
.OOOOOO.
OYYYYYyO
OYZYYYyO
OYYOOYyO
OYYOOYyO
OYYYOYyO
OYYYOYyO
OyyyyyyO
.OOOOOO.
`, { O: '#3b2a00', Y: '#ffd23f', y: '#c98a00', Z: '#fff3a0' });
    buffer.blit(lock, 8, lockY);
    for (let y = 0; y < height; y++) { buffer.set(0, y, '#1b1008'); buffer.set(W - 1, y, '#1b1008'); }
    for (let x = 0; x < W; x++) buffer.set(x, 0, '#1b1008');
    this.cache[key] = buffer.toCanvas();
    return this.cache[key];
  },

  /** Cartel de madera con una exclamación. */
  getSign() {
    if (this.cache.sign) return this.cache.sign;
    this.cache.sign = spriteFromGrid(`
.OOOOOOOOOOOOOOOO.
OLLLLLLLLLLLLLLLWO
OLWWWWWWOWWWWWWWdO
OLWWWWWWOWWWWWWWdO
OLWWWWWWOWWWWWWWdO
OLWWWWWWOWWWWWWWdO
OLWWWWWWWWWWWWWWdO
OLWWWWWWOWWWWWWWdO
OddddddddddddddddO
.OOOOOOOOOOOOOOOO.
.......OSsO.......
.......OSsO.......
.......OSsO.......
.......OSsO.......
.......OSsO.......
......OOSsOO......
`, { O: '#2e1a0e', L: '#f2c98a', W: '#d9a566', d: '#a8743e', S: '#8f5d33', s: '#5c3a1e' }, 9, 16);
    return this.cache.sign;
  },

  /** Banderita de punto de control (gris o verde) en 3 fotogramas de ondeo. */
  getCheckpointFlags(active) {
    const key = `checkpoint-${active}`;
    if (this.cache[key]) return this.cache[key];
    const colors = active ? ['#1f6b34', '#3fae49', '#7ee08a', '#ffffff'] : ['#4a4a5a', '#7a7a8a', '#a8a8b8', '#d6d6e0'];
    this.cache[key] = [0, 1, 2].map((frame) => {
      const buffer = new PixelBuffer(16, 12);
      for (let x = 0; x < 14; x++) {
        const wave = Math.round(Math.sin(x * 0.5 - frame * 2) * 1);
        const height = Math.round(10 - x * 0.35);
        for (let y = 0; y < height; y++) {
          const color = y === 0 ? colors[2] : y === height - 1 ? colors[0] : colors[1];
          buffer.set(x + 1, y + wave + 1 + Math.floor((10 - height) / 2), color);
        }
      }
      if (active) { buffer.set(5, 5, colors[3]); buffer.set(6, 5, colors[3]); buffer.set(5, 6, colors[3]); }
      buffer.outline('#1b1828');
      return buffer.toCanvas();
    });
    return this.cache[key];
  },

  /** Bandera de meta naranja con una huella de gato (3 fotogramas). */
  getGoalFlags() {
    if (this.cache.goalFlags) return this.cache.goalFlags;
    const colors = ['#b8501c', '#ff8c42', '#ffb878'];
    this.cache.goalFlags = [0, 1, 2].map((frame) => {
      const buffer = new PixelBuffer(32, 22);
      for (let x = 0; x < 28; x++) {
        const wave = Math.round(Math.sin(x * 0.35 - frame * 2.1) * 1.5);
        const half = Math.round(9 - x * 0.12);
        for (let y = -half; y <= half; y++) {
          const color = y === -half ? colors[2] : y >= half - 1 ? colors[0] : colors[1];
          buffer.set(x + 1, 10 + y + wave, color);
        }
      }
      const paw = gridToBuffer(`
.W.W.
W.W.W
.....
.WWW.
WWWWW
.WWW.
`, { W: '#fff4e6' });
      buffer.blit(paw, 10, 6 + Math.round(Math.sin(12 * 0.35 - frame * 2.1) * 1.5));
      buffer.outline('#3d1c10');
      return buffer.toCanvas();
    });
    return this.cache.goalFlags;
  },

  /** Jaula dorada: cerrada y abierta. */
  getCage(open) {
    const key = `cage-${open}`;
    if (this.cache[key]) return this.cache[key];
    const buffer = new PixelBuffer(40, 46);
    const gold = ['#6b4400', '#c98a00', '#ffd23f', '#fff3a0'];
    // Cúpula
    for (let x = 0; x < 40; x++) {
      const y = Math.round(10 - Math.sqrt(Math.max(0, 1 - Math.pow((x - 19.5) / 19.5, 2))) * 9);
      buffer.set(x, y, gold[2]); buffer.set(x, y + 1, gold[1]);
    }
    buffer.rect(17, 0, 6, 3, gold[1]); buffer.rect(18, 0, 4, 2, gold[3]);
    // Aros superior e inferior
    buffer.rect(0, 10, 40, 3, gold[2]); buffer.rect(0, 10, 40, 1, gold[3]); buffer.rect(0, 12, 40, 1, gold[1]);
    buffer.rect(0, 41, 40, 4, gold[2]); buffer.rect(0, 41, 40, 1, gold[3]); buffer.rect(0, 44, 40, 1, gold[1]);
    // Barrotes
    for (let i = 0; i < 6; i++) {
      if (open && i > 0 && i < 3) continue;
      const barX = 2 + i * 7;
      for (let y = 13; y < 41; y++) { buffer.set(barX, y, gold[3]); buffer.set(barX + 1, y, gold[1]); }
    }
    if (open) {
      // Puerta abierta hacia fuera (a la izquierda)
      for (let y = 13; y < 41; y++) {
        buffer.set(0, y, gold[2]);
        if (y % 9 === 0) buffer.rect(0, y, 2, 1, gold[3]);
      }
    }
    buffer.outline('#3b2a00');
    this.cache[key] = new Sprite(buffer.toCanvas(), 21, 0);
    return this.cache[key];
  },

  /** Antorcha de pared con llama animada y halo de luz tramado. */
  getTorch() {
    if (this.cache.torch) return this.cache.torch;
    const holder = spriteFromGrid(`
OOOOOOO
OSSsSsO
.OSsSO.
..OWO..
..OWO..
..OWO..
..OwO..
..OwO..
..OOO..
`, { O: '#120e1a', S: '#7d7896', s: '#4a4458', W: '#6b4226', w: '#452812' }, 3, 0);
    const flameRamp = ['#c4261a', '#fb5607', '#ff9f1c', '#ffd23f', '#fff3b0'];
    const flames = [0, 1, 2].map((frame) => {
      const buffer = new PixelBuffer(9, 14);
      for (let y = 0; y < 14; y++) {
        const t = y / 13;
        const half = (0.5 + t * 3.6) * (0.9 + 0.2 * Math.sin(y + frame * 2));
        const center = 4.5 + Math.sin(y * 0.6 + frame * 2.2) * (1 - t) * 1.2;
        for (let x = 0; x < 9; x++) {
          const distance = Math.abs(x + 0.5 - center) / half;
          if (distance > 1) continue;
          buffer.set(x, y, ditheredRamp(flameRamp, (1 - distance) * 0.7 + t * 0.35, x, y));
        }
      }
      return new Sprite(buffer.toCanvas(), 4, 14);
    });
    const halo = new PixelBuffer(96, 96);
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const distance = Math.hypot(x - 48, y - 48) / 48;
        if (distance < 1 && ditherAt(x, y, (1 - distance) * 0.55)) halo.set(x, y, distance < 0.45 ? '#ffb347' : '#ff8a3c');
      }
    }
    this.cache.torch = { holder, flames, halo: new Sprite(halo.toCanvas(), 48, 48) };
    return this.cache.torch;
  },

  /** Oscurecimiento tramado para los precipicios sin fondo. */
  getChasm(height) {
    const key = `chasm-${height}`;
    if (this.cache[key]) return this.cache[key];
    const buffer = new PixelBuffer(24, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < 24; x++) {
        const t = y / height;
        if (ditherAt(x, y, t * 1.3)) buffer.set(x, y, t > 0.6 && ditherAt(x + 1, y, t) ? '#05030a' : '#140c22');
      }
    }
    this.cache[key] = buffer.toCanvas();
    return this.cache[key];
  },

  /* ============================ Decoración ============================ */

  /** Árbol frondoso del bosque (con variantes según la semilla). */
  getTree(themeName, seed) {
    const variant = Math.floor(seed * 3);
    const key = `tree-${themeName}-${variant}`;
    if (this.cache[key]) return this.cache[key];
    let sprite;
    if (themeName === 'mountains') sprite = this.buildPine(variant);
    else sprite = this.buildRoundTree(variant, themeName === 'ending');
    this.cache[key] = sprite;
    return sprite;
  },

  buildRoundTree(variant, isSunset) {
    const W = 64;
    const H = 84;
    const buffer = new PixelBuffer(W, H);
    const bark = ['#2e1a0e', '#4f2f18', '#6e4424', '#8f5d33'];
    const leaves = isSunset ? ['#1f4a2c', '#2f6a3a', '#4a8a46', '#79b05a', '#b8d878'] : ['#16492a', '#226a34', '#33893d', '#56ab4a', '#8fd468'];
    // Tronco con raíces
    for (let y = 40; y < H; y++) {
      const flare = y > H - 6 ? Math.round((y - (H - 6)) * 1.2) : 0;
      for (let x = 28 - flare; x <= 35 + flare; x++) {
        const t = (x - (28 - flare)) / (8 + flare * 2);
        let color = t < 0.25 ? bark[3] : t < 0.6 ? bark[2] : bark[1];
        if (hashNoise(x, Math.floor(y / 3), variant) > 0.8) color = bark[1];
        buffer.set(x, y, color);
      }
    }
    // Rama
    buffer.line(32, 52, 22 + variant * 2, 44, bark[2]);
    buffer.line(32, 53, 22 + variant * 2, 45, bark[1]);
    // Copa: varios círculos sombreados como un solo volumen
    const puffs = [[32, 26, 18], [16, 36, 12], [48, 36, 12], [22, 18, 12], [42, 16, 12], [32, 42, 12]];
    const lightness = (x, y) => {
      let best = -1;
      for (const [cx, cy, r] of puffs) {
        const dx = (x - cx) / r;
        const dy = (y - cy) / r;
        const d = dx * dx + dy * dy;
        if (d <= 1) best = Math.max(best, -dx * 0.45 - dy * 0.7 + Math.sqrt(1 - d) * 0.55);
      }
      return best;
    };
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < W; x++) {
        const value = lightness(x + 0.5, y + 0.5 + variant);
        if (value === -1) continue;
        const leafNoise = (hashNoise(x >> 1, y >> 1, variant + 5) - 0.5) * 0.35;
        buffer.set(x, y, ditheredRamp(leaves, clamp(value * 0.75 + 0.25 + leafNoise, 0, 1), x, y));
      }
    }
    // Frutas
    for (let i = 0; i < 4; i++) {
      const fx = 14 + Math.floor(hashNoise(i, variant, 77) * 36);
      const fy = 18 + Math.floor(hashNoise(variant, i, 77) * 26);
      if (lightness(fx, fy) > 0.2) {
        buffer.rect(fx, fy, 3, 3, '#d62839'); buffer.set(fx, fy, '#ff7a85'); buffer.set(fx + 2, fy + 2, '#8f1426');
      }
    }
    buffer.outline('#0e2a16');
    return new Sprite(buffer.toCanvas(), 32, H);
  },

  buildPine(variant) {
    const W = 44;
    const H = 80;
    const buffer = new PixelBuffer(W, H);
    const greens = ['#123323', '#1d4a33', '#2a6246', '#3b7d58'];
    const snow = ['#a9b8de', '#e2ebff', '#ffffff'];
    buffer.rect(19, H - 14, 6, 14, '#4f2f18');
    buffer.rect(19, H - 14, 2, 14, '#6e4424');
    const tiers = 4;
    for (let tier = 0; tier < tiers; tier++) {
      const tierTop = 4 + tier * 15 - variant;
      const tierHeight = 22;
      const tierWidth = 9 + tier * 4;
      for (let y = 0; y < tierHeight; y++) {
        const half = Math.round((y / tierHeight) * tierWidth);
        for (let x = -half; x <= half; x++) {
          const px = 22 + x;
          const py = tierTop + y;
          let color = x < -half * 0.3 ? greens[3] : x < half * 0.3 ? greens[2] : greens[1];
          if (y === tierHeight - 1 || (y > tierHeight - 3 && Math.abs(x) % 3 === 0)) color = greens[0];
          // Nieve sobre las ramas
          if (y < tierHeight * 0.4 && x < half * 0.2 && (y < 3 || ditherAt(px, py, 0.6))) color = x < 0 ? snow[2] : snow[1];
          buffer.set(px, py, color);
        }
      }
    }
    buffer.outline('#0b1a14');
    return new Sprite(buffer.toCanvas(), 22, H);
  },

  getBush(themeName) {
    const key = `bush-${themeName}`;
    if (this.cache[key]) return this.cache[key];
    const buffer = new PixelBuffer(38, 20);
    const leaves = ['#16492a', '#226a34', '#33893d', '#56ab4a', '#8fd468'];
    buffer.shadedEllipse(11, 13, 9, 7, leaves, { ditherNoise: 0.4, seed: 1 });
    buffer.shadedEllipse(26, 13, 10, 7, leaves, { ditherNoise: 0.4, seed: 2 });
    buffer.shadedEllipse(19, 9, 10, 8, leaves, { ditherNoise: 0.4, seed: 3 });
    for (let x = 0; x < 38; x++) buffer.data[19 * 38 + x] = 0;
    for (const [bx, by] of [[12, 8], [22, 6], [28, 11], [17, 13]]) {
      buffer.set(bx, by, '#ff4f9a'); buffer.set(bx + 1, by, '#ffa6c9'); buffer.set(bx, by + 1, '#b8236a');
    }
    buffer.outline('#0e2a16');
    this.cache[key] = new Sprite(buffer.toCanvas(), 19, 19);
    return this.cache[key];
  },

  getFlowers(seed) {
    const variant = Math.floor(seed * 3);
    const key = `flowers-${variant}`;
    if (this.cache[key]) return this.cache[key];
    const palettes = [['#ff6b9a', '#ffc2d6'], ['#ffd23f', '#fff3a0'], ['#a06cd5', '#d4b8ff'], ['#ffffff', '#ffffff']];
    const frames = [0, 1].map((frame) => {
      const buffer = new PixelBuffer(26, 16);
      for (let i = 0; i < 3; i++) {
        const baseX = 4 + i * 8;
        const stemHeight = 7 + ((i + variant) % 3) * 2;
        const sway = frame === 1 && i % 2 === 0 ? 1 : 0;
        for (let y = 0; y < stemHeight; y++) buffer.set(baseX + (y > stemHeight / 2 ? sway : 0), 15 - y, '#2c7a2a');
        buffer.set(baseX - 1, 13, '#4ca43a'); buffer.set(baseX + 1, 12, '#4ca43a');
        const [petal, light] = palettes[(i + variant) % palettes.length];
        const headX = baseX + sway;
        const headY = 15 - stemHeight;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) buffer.set(headX + dx, headY + dy, petal);
        buffer.set(headX - 1, headY - 1, light);
        buffer.set(headX, headY, '#ffb703');
      }
      buffer.outline('#123d1a');
      return new Sprite(buffer.toCanvas(), 13, 16);
    });
    this.cache[key] = frames;
    return frames;
  },

  getRock(themeName) {
    const key = `rock-${themeName}`;
    if (this.cache[key]) return this.cache[key];
    const buffer = new PixelBuffer(30, 18);
    const ramp = themeName === 'castle' ? ['#1e1830', '#3b3258', '#544a7a', '#6e6398'] : ['#3d3a4c', '#5f5b70', '#878399', '#b1adc2', '#d8d5e4'];
    buffer.shadedEllipse(15, 15, 13, 11, ramp, { ditherNoise: 0.2, seed: 4 });
    buffer.shadedEllipse(23, 15, 6, 6, ramp, { seed: 5 });
    for (let x = 0; x < 30; x++) { buffer.data[17 * 30 + x] = 0; }
    buffer.line(12, 8, 15, 12, ramp[0]); buffer.line(15, 12, 14, 15, ramp[0]);
    if (themeName === 'forest') for (let x = 7; x < 18; x++) if (hashNoise(x, 1, 3) > 0.35) buffer.set(x, 5 + (x % 2), '#4ca43a');
    if (themeName === 'mountains') for (let x = 6; x < 22; x++) buffer.set(x, 4 + Math.round(Math.abs(x - 14) / 4), '#f2f7ff');
    buffer.outline('#15121e');
    this.cache[key] = new Sprite(buffer.toCanvas(), 15, 18);
    return this.cache[key];
  }
};
