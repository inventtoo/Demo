/* =====================================================================
   collectibles.js - Objetos coleccionables
   ---------------------------------------------------------------------
   Monedas, corazones, estrellas y llaves. Cada objeto flota con una
   pequeña animación de pixel art y desaparece al ser recogido. Los
   efectos de recogerlos (sumar monedas, curar...) se aplican en main.js.
   ===================================================================== */
'use strict';

// Relación entre los caracteres del mapa y el tipo de objeto
const COLLECTIBLE_TYPES = {
  o: 'coin',
  h: 'heart',
  '*': 'star',
  k: 'key'
};

// Tamaño de la caja de colisión de cada tipo (en píxeles de arte)
const COLLECTIBLE_SIZES = {
  coin: 12,
  heart: 12,
  star: 14,
  key: 14
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
    // Flotación arriba y abajo (en pasos de píxel entero)
    this.y = this.baseY + Math.round(Math.sin(this.time * 3) * 2);
  }

  draw(ctx) {
    const centerX = Math.round(this.x + this.w / 2);
    const centerY = Math.round(this.y + this.h / 2);

    switch (this.type) {
      case 'coin': {
        // La moneda gira mostrando sus 4 fotogramas
        const frames = SPRITES.coin;
        frames[Math.floor(this.time * 8) % frames.length].draw(ctx, centerX, centerY);
        break;
      }
      case 'heart': {
        // Late: cada poco se dibuja un píxel más arriba
        const beat = Math.sin(this.time * 6) > 0.6 ? -1 : 0;
        SPRITES.heart.draw(ctx, centerX, centerY + beat);
        break;
      }
      case 'star': {
        SPRITES.star.draw(ctx, centerX, centerY);
        // Destello que recorre la estrella
        const sparkle = Math.floor(this.time * 4) % 6;
        if (sparkle < 3) {
          const sx = centerX - 6 + sparkle * 5;
          const sy = centerY - 7 + sparkle * 2;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx, sy - 1, 1, 3);
          ctx.fillRect(sx - 1, sy, 3, 1);
        }
        break;
      }
      case 'key': {
        SPRITES.key.draw(ctx, centerX, centerY);
        if (Math.floor(this.time * 3) % 4 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(centerX - 6, centerY - 3, 1, 1);
        }
        break;
      }
      default:
        break;
    }
  }
}
