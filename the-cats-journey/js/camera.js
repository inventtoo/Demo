/* =====================================================================
   camera.js - Cámara con desplazamiento (scroll)
   ---------------------------------------------------------------------
   La cámara decide qué parte del nivel se ve en pantalla. Sigue al
   jugador suavemente, no se sale de los límites del nivel, puede
   "bloquearse" en una zona (la sala del jefe) y puede temblar.
   ===================================================================== */
'use strict';

class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.worldWidth = width;
    this.worldHeight = height;
    this.lockedArea = null;     // {minX, maxX} cuando la cámara está fija
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  /** Indica el tamaño del nivel actual. */
  setWorldSize(width, height) {
    this.worldWidth = width;
    this.worldHeight = height;
    this.lockedArea = null;
  }

  /** Limita la cámara a una zona horizontal concreta (por ejemplo, la sala del jefe). */
  lockTo(minX, maxX) {
    this.lockedArea = { minX, maxX };
  }

  unlock() {
    this.lockedArea = null;
  }

  /**
   * Mueve la cámara hacia el objetivo (normalmente el jugador).
   * @param {object} target  Objeto con x, y, w, h y facing (1 o -1)
   * @param {number} dt      Tiempo transcurrido
   * @param {boolean} instant Si es true, la cámara salta directamente
   */
  follow(target, dt, instant = false) {
    // Miramos un poco hacia donde mira el jugador para ver lo que viene
    const lookAhead = (target.facing || 1) * 70;
    let targetX = target.x + target.w / 2 - this.width / 2 + lookAhead;
    let targetY = target.y + target.h / 2 - this.height * 0.55;

    const minX = this.lockedArea ? this.lockedArea.minX : 0;
    const maxX = this.lockedArea ? this.lockedArea.maxX - this.width : this.worldWidth - this.width;
    targetX = clamp(targetX, minX, Math.max(minX, maxX));
    targetY = clamp(targetY, 0, Math.max(0, this.worldHeight - this.height));

    if (instant) {
      this.x = targetX;
      this.y = targetY;
    } else {
      // Suavizado exponencial: independiente de los FPS
      const smoothing = 1 - Math.exp(-6 * dt);
      this.x += (targetX - this.x) * smoothing;
      this.y += (targetY - this.y) * smoothing;
    }

    this.updateShake(dt);
  }

  /** Hace temblar la cámara (golpes fuertes, ataques del jefe...). */
  shake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  updateShake(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      if (this.shakeTime <= 0) this.shakeIntensity = 0;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /** Desplaza el contexto de dibujo para que el mundo se vea desde la cámara. */
  applyTransform(ctx) {
    ctx.translate(-Math.round(this.x + this.shakeOffsetX), -Math.round(this.y + this.shakeOffsetY));
  }

  /** Indica si un rectángulo está dentro de la pantalla (con un margen). */
  isVisible(x, y, w, h, margin = 80) {
    return x + w > this.x - margin && x < this.x + this.width + margin &&
           y + h > this.y - margin && y < this.y + this.height + margin;
  }
}
