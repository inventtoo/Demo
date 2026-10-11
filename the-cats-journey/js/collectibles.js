/* =====================================================================
   collectibles.js - Objetos coleccionables
   ---------------------------------------------------------------------
   Monedas, corazones, estrellas y llaves. Cada objeto flota con una
   pequeña animación y desaparece al ser recogido. Los efectos de
   recogerlos (sumar monedas, curar...) se aplican en main.js.
   También incluye funciones de dibujo reutilizables (corazón, estrella).
   ===================================================================== */
'use strict';

/* ------------------- Funciones de dibujo reutilizables ------------------- */

/** Dibuja un corazón centrado en (x, y). */
function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  ctx.fill();
  ctx.restore();
}

/** Dibuja una estrella de varias puntas centrada en (x, y). */
function drawStar(ctx, x, y, outerRadius, innerRadius, points, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Dibuja una llave dorada centrada en (x, y). */
function drawKey(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#a87400';
  ctx.lineWidth = 2;
  // Anillo
  ctx.beginPath();
  ctx.arc(-6, 0, 7, 0, Math.PI * 2);
  ctx.arc(-6, 0, 3, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.stroke();
  // Vástago y dientes
  ctx.fillRect(0, -2.5, 15, 5);
  ctx.fillRect(9, 2, 3, 5);
  ctx.fillRect(13, 2, 3, 4);
  ctx.restore();
}

/** Rectángulo con esquinas redondeadas (compatible con navegadores antiguos). */
function roundedRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ------------------------- Coleccionables ------------------------- */

// Relación entre los caracteres del mapa y el tipo de objeto
const COLLECTIBLE_TYPES = {
  o: 'coin',
  h: 'heart',
  '*': 'star',
  k: 'key'
};

// Tamaño de la caja de colisión de cada tipo
const COLLECTIBLE_SIZES = {
  coin: 22,
  heart: 26,
  star: 30,
  key: 30
};

class Collectible {
  /**
   * @param {string} type  'coin' | 'heart' | 'star' | 'key'
   * @param {number} tileX Posición x de la casilla del mapa
   * @param {number} tileY Posición y de la casilla del mapa
   */
  constructor(type, tileX, tileY) {
    const size = COLLECTIBLE_SIZES[type];
    this.type = type;
    this.w = size;
    this.h = size;
    this.x = tileX + (CONFIG.TILE_SIZE - size) / 2;
    this.baseY = tileY + (CONFIG.TILE_SIZE - size) / 2;
    this.y = this.baseY;
    this.time = Math.random() * Math.PI * 2; // Desfase para que no se muevan todos igual
    this.collected = false;
  }

  update(dt) {
    this.time += dt;
    // Movimiento de flotación (arriba y abajo)
    this.y = this.baseY + Math.sin(this.time * 3) * 4;
  }

  draw(ctx) {
    const centerX = this.x + this.w / 2;
    const centerY = this.y + this.h / 2;

    switch (this.type) {
      case 'coin': {
        // La moneda "gira" estrechándose horizontalmente
        const spin = Math.abs(Math.cos(this.time * 3));
        const radiusX = Math.max(2, (this.w / 2) * spin);
        ctx.fillStyle = '#d99a00';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffc93c';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.max(1, radiusX - 3), this.h / 2 - 3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (spin > 0.4) {
          ctx.fillStyle = '#fff6c2';
          ctx.fillRect(centerX - 1.5 * spin, centerY - 5, 3 * spin, 10);
        }
        break;
      }
      case 'heart': {
        const pulse = 1 + Math.sin(this.time * 6) * 0.08;
        drawHeart(ctx, centerX, centerY + 2, 14 * pulse, '#c9184a');
        drawHeart(ctx, centerX, centerY + 1, 12 * pulse, '#ff4f6d');
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(centerX - 5, centerY - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'star': {
        // Halo brillante + estrella que gira
        const glow = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 26);
        glow.addColorStop(0, 'rgba(255, 240, 150, 0.8)');
        glow.addColorStop(1, 'rgba(255, 240, 150, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
        ctx.fill();
        const rotation = Math.sin(this.time * 2) * 0.4;
        drawStar(ctx, centerX, centerY, 17, 8, 5, '#e0a800', rotation);
        drawStar(ctx, centerX, centerY, 14, 6.5, 5, '#ffe066', rotation);
        ctx.fillStyle = '#5a3d00';
        ctx.fillRect(centerX - 4, centerY - 3, 2, 4);
        ctx.fillRect(centerX + 2, centerY - 3, 2, 4);
        break;
      }
      case 'key': {
        const glow = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 24);
        glow.addColorStop(0, 'rgba(255, 220, 90, 0.6)');
        glow.addColorStop(1, 'rgba(255, 220, 90, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.sin(this.time * 2) * 0.3);
        drawKey(ctx, -2, 0, 1.1);
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }
}
