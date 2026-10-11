/* =====================================================================
   physics.js - Constantes, colisiones y partículas
   ---------------------------------------------------------------------
   Aquí está la "física" del juego:
   - Las constantes generales (tamaño de pantalla, gravedad...).
   - Funciones matemáticas de ayuda.
   - La detección y resolución de colisiones entre rectángulos (AABB).
   - Un sistema de partículas sencillo para efectos visuales.
   ===================================================================== */
'use strict';

const CONFIG = {
  VIEW_WIDTH: 640,        // Resolución del arte: 640x360 píxeles de pixel art...
  VIEW_HEIGHT: 360,
  OUTPUT_WIDTH: 1280,     // ...que se amplían x2 a una imagen final de 1280x720 (720p)
  OUTPUT_HEIGHT: 720,
  TILE_SIZE: 24,          // Tamaño de cada casilla de los mapas de nivel
  GRAVITY: 1140,          // Aceleración de la gravedad (px/s²)
  MAX_FALL_SPEED: 570,    // Velocidad máxima de caída (px/s)
  MAX_PHYSICS_STEP: 1 / 120 // Paso máximo de simulación para colisiones precisas
};

/* ----------------------- Funciones de ayuda ----------------------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Comprueba si dos rectángulos {x, y, w, h} se solapan. */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Distancia entre los centros de dos rectángulos. */
function distanceBetween(a, b) {
  const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
  const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Aplica la gravedad a un cuerpo con propiedad vy, limitando la caída. */
function applyGravity(body, dt, gravityScale = 1) {
  body.vy = Math.min(body.vy + CONFIG.GRAVITY * gravityScale * dt, CONFIG.MAX_FALL_SPEED);
}

/**
 * Mueve un cuerpo según su velocidad y lo separa de los sólidos.
 *
 * Se resuelve primero el eje X y después el eje Y. Separar los ejes es
 * la forma más sencilla de conseguir colisiones estables en un juego de
 * plataformas.
 *
 * Tipos de sólidos:
 *  - Normales: bloquean desde todos los lados (suelo, paredes, puertas).
 *  - oneWay (de un solo sentido): solo bloquean al caer sobre ellos desde
 *    arriba, así se pueden atravesar saltando desde abajo.
 *
 * @param {object} body   Objeto con x, y, w, h, vx, vy
 * @param {Array} solids  Lista de sólidos {x, y, w, h, oneWay, active}
 * @param {number} dt     Tiempo del paso en segundos
 * @returns {object} Información de lo que ha ocurrido en el movimiento
 */
function moveAndCollide(body, solids, dt) {
  const result = { hitLeft: false, hitRight: false, hitCeiling: false, landedOn: null };

  // ---- Eje horizontal ----
  body.x += body.vx * dt;
  for (const solid of solids) {
    if (!solid.active || solid.oneWay) continue;
    if (!rectsOverlap(body, solid)) continue;
    // Empujamos hacia el lado más cercano al centro del cuerpo
    if (body.x + body.w / 2 < solid.x + solid.w / 2) {
      body.x = solid.x - body.w;
      result.hitRight = true;
    } else {
      body.x = solid.x + solid.w;
      result.hitLeft = true;
    }
  }

  // ---- Eje vertical ----
  const previousBottom = body.y + body.h; // borde inferior antes de moverse en Y
  body.y += body.vy * dt;
  body.onGround = false;

  for (const solid of solids) {
    if (!solid.active) continue;
    if (!rectsOverlap(body, solid)) continue;

    if (solid.oneWay) {
      // Solo aterrizamos si veníamos de arriba. La tolerancia incluye lo
      // que la plataforma haya subido en este paso (plataformas móviles).
      const tolerance = 2 + Math.max(0, -(solid.dy || 0));
      if (body.vy >= 0 && previousBottom <= solid.y + tolerance) {
        body.y = solid.y - body.h;
        body.vy = 0;
        body.onGround = true;
        result.landedOn = solid;
      }
      continue;
    }

    const bodyIsAbove = body.y + body.h / 2 < solid.y + solid.h / 2;
    if (body.vy > 0 || (body.vy === 0 && bodyIsAbove)) {
      body.y = solid.y - body.h;
      body.vy = 0;
      body.onGround = true;
      result.landedOn = solid;
    } else {
      body.y = solid.y + solid.h;
      if (body.vy < 0) body.vy = 0;
      result.hitCeiling = true;
    }
  }

  return result;
}

/* ----------------------- Sistema de partículas ----------------------- */

/**
 * Las partículas son pequeños objetos con velocidad, gravedad y tiempo
 * de vida. Se usan para polvo, chispas, corazones, explosiones...
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /**
   * Crea varias partículas en una posición.
   * @param {number} x
   * @param {number} y
   * @param {object} options color, count, speed, life, size, gravity, shape, angle, spread
   */
  emit(x, y, options = {}) {
    const {
      count = 8, color = '#ffffff', speed = 150, life = 0.6, size = 4,
      gravity = 600, shape = 'circle', angle = -Math.PI / 2, spread = Math.PI * 2
    } = options;
    const colors = Array.isArray(color) ? color : [color];

    for (let i = 0; i < count; i++) {
      const direction = angle + (Math.random() - 0.5) * spread;
      const particleSpeed = speed * randomRange(0.4, 1);
      this.particles.push({
        x, y,
        vx: Math.cos(direction) * particleSpeed,
        vy: Math.sin(direction) * particleSpeed,
        life: life * randomRange(0.7, 1.2),
        maxLife: life,
        size: size * randomRange(0.7, 1.3),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity,
        shape,
        rotation: Math.random() * Math.PI
      });
    }
  }

  update(dt) {
    for (const particle of this.particles) {
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.rotation += dt * 4;
    }
    // Eliminamos las partículas que ya han terminado su vida
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  /** Las partículas se dibujan como píxeles cuadrados (o mini sprites de corazón/estrella). */
  draw(ctx) {
    for (const particle of this.particles) {
      const lifeRatio = clamp(particle.life / particle.maxLife, 0, 1);
      const x = Math.round(particle.x);
      const y = Math.round(particle.y);
      if (particle.shape === 'heart' || particle.shape === 'star') {
        // Parpadean al final de su vida en lugar de volverse transparentes
        if (lifeRatio < 0.3 && Math.floor(particle.life * 20) % 2 === 0) continue;
        const icon = particle.shape === 'heart' ? SPRITES.icons.heart : SPRITES.icons.star;
        icon.draw(ctx, x - 3, y - 3);
        continue;
      }
      const size = Math.max(1, Math.round(particle.size * (0.4 + lifeRatio * 0.6)));
      ctx.fillStyle = particle.color;
      ctx.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
    }
  }

  clear() {
    this.particles = [];
  }
}
