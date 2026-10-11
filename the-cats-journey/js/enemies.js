/* =====================================================================
   enemies.js - Enemigos y jefe final
   ---------------------------------------------------------------------
   Todos los enemigos heredan de la clase Enemy, que guarda la posición,
   la vida y la lógica común (recibir daño, morir, caminar patrullando).
   Cada tipo de enemigo solo tiene que definir su comportamiento
   (update) y su aspecto (draw).

   Enemigos disponibles (carácter en el mapa del nivel):
     s  Slime     - Patrulla lentamente de un lado a otro.
     m  Seta      - Camina de izquierda a derecha.
     w  Murciélago- Vuela y persigue al jugador si se acerca.
     g  Jabalí    - Embiste cuando ve al jugador.
     n  Caballero - Resistente (2 golpes) y persigue al jugador.
     q  Fantasma  - Flota a través de las paredes y persigue.
     B  Rey Rata  - El jefe final.
   ===================================================================== */
'use strict';

/* ============================ Clase base ============================ */

class Enemy {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = height;
    this.vx = 0;
    this.vy = 0;
    this.hp = 1;
    this.facing = -1;          // -1 izquierda, 1 derecha
    this.alive = true;         // false = se elimina de la lista
    this.dying = false;        // animación de derrota en curso
    this.deathStyle = 'flip';  // 'squash' (aplastado) o 'flip' (sale volando)
    this.deathTimer = 0;
    this.flashTimer = 0;       // parpadeo blanco al recibir daño
    this.time = Math.random() * 10;
    this.onGround = false;
    this.stompable = true;     // ¿se puede derrotar saltando encima?
    this.isBoss = false;
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  /** ¿Hace daño al tocarlo? Los enemigos derrotados ya no hacen daño. */
  get harmful() { return !this.dying; }

  /**
   * Recibe daño. Devuelve true si el golpe ha tenido efecto.
   * @param {number} damage
   * @param {object} game
   * @param {string} source 'stomp' (pisotón) o 'projectile'
   */
  hit(damage, game, source) {
    if (this.dying) return false;
    this.hp -= damage;
    this.flashTimer = 0.2;
    if (this.hp <= 0) {
      this.die(source);
    } else {
      // Pequeño retroceso al recibir un golpe sin morir
      this.vx = -this.facing * 60;
      AudioManager.play('enemyHit');
    }
    return true;
  }

  die(source) {
    this.dying = true;
    this.deathStyle = source === 'stomp' ? 'squash' : 'flip';
    this.deathTimer = source === 'stomp' ? 0.45 : 1.2;
    this.vy = -380;
  }

  /**
   * Actualiza la animación de derrota. Devuelve true mientras el enemigo
   * esté muriendo, para que su update normal no se ejecute.
   */
  updateDying(dt) {
    if (!this.dying) return false;
    this.deathTimer -= dt;
    if (this.deathStyle === 'flip') {
      applyGravity(this, dt);
      this.y += this.vy * dt;
    }
    if (this.deathTimer <= 0) this.alive = false;
    return true;
  }

  /** Gira hacia el jugador. */
  facePlayer(player) {
    this.facing = player.x + player.w / 2 < this.centerX ? -1 : 1;
  }

  /**
   * Movimiento de patrulla por el suelo: camina y se da la vuelta al
   * chocar con una pared o al llegar a un borde (para no caerse).
   * @param {boolean} stopAtEdge Si es true, se queda quieto en el borde en vez de girar
   */
  walk(dt, level, speed, stopAtEdge = false) {
    this.vx = this.facing * speed;
    if (this.onGround && level.isEdgeAhead(this)) {
      if (stopAtEdge) this.vx = 0;
      else {
        this.facing *= -1;
        this.vx = this.facing * speed;
      }
    }
    applyGravity(this, dt);
    const result = moveAndCollide(this, level.solids, dt);
    if ((result.hitLeft && this.facing < 0) || (result.hitRight && this.facing > 0)) {
      this.facing *= -1;
    }
    return result;
  }

  /** Prepara el contexto para dibujar al enemigo (volteo, parpadeo, aplastamiento). */
  beginDraw(ctx) {
    ctx.save();
    const footX = this.centerX;
    const footY = this.y + this.h;
    ctx.translate(footX, footY);
    if (this.dying && this.deathStyle === 'squash') {
      ctx.scale(1.3, 0.35);
      ctx.globalAlpha = clamp(this.deathTimer / 0.45, 0, 1);
    } else if (this.dying) {
      ctx.translate(0, -this.h / 2);
      ctx.scale(1, -1); // boca abajo
      ctx.translate(0, -this.h / 2);
    }
    if (this.flashTimer > 0 && Math.floor(this.flashTimer * 30) % 2 === 0) {
      ctx.globalAlpha *= 0.45;
    }
    ctx.scale(this.facing, 1);
  }

  endDraw(ctx) {
    ctx.restore();
  }

  update() {}
  draw() {}
}

/** Ojos simples reutilizados por varios enemigos. */
function drawEnemyEyes(ctx, x, y, size, angry = false) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - size * 1.2, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 1.2, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x - size * 1.2 + size * 0.35, y + size * 0.15, size * 0.55, 0, Math.PI * 2);
  ctx.arc(x + size * 1.2 + size * 0.35, y + size * 0.15, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (angry) {
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size * 2.2, y - size * 1.4);
    ctx.lineTo(x - size * 0.3, y - size * 0.7);
    ctx.moveTo(x + size * 2.2, y - size * 1.4);
    ctx.lineTo(x + size * 0.3, y - size * 0.7);
    ctx.stroke();
  }
}

/* ============================== Slime ============================== */

class Slime extends Enemy {
  constructor(x, y) {
    super(x, y, 32, 24);
    this.speed = 45;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;
    this.walk(dt, game.level, this.speed);
  }

  draw(ctx) {
    this.beginDraw(ctx);
    // Se estira y encoge al moverse, como una gelatina
    const squish = Math.sin(this.time * 8) * 0.08;
    ctx.scale(1 + squish, 1 - squish);
    ctx.fillStyle = '#3fae49';
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.quadraticCurveTo(-18, -26, 0, -26);
    ctx.quadraticCurveTo(18, -26, 17, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7ee08a';
    ctx.beginPath();
    ctx.ellipse(-6, -18, 5, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    drawEnemyEyes(ctx, 4, -13, 3.5);
    ctx.fillStyle = '#1d5e24';
    ctx.fillRect(1, -6, 8, 2);
    this.endDraw(ctx);
  }
}

/* =========================== Seta andante =========================== */

class Mushroom extends Enemy {
  constructor(x, y) {
    super(x, y, 30, 32);
    this.speed = 70;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;
    this.walk(dt, game.level, this.speed);
  }

  draw(ctx) {
    this.beginDraw(ctx);
    const step = Math.sin(this.time * 12) * 3;
    // Pies
    ctx.fillStyle = '#5b3a29';
    ctx.beginPath();
    ctx.ellipse(-7, -3 + Math.min(0, step), 6, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(7, -3 + Math.min(0, -step), 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tallo
    ctx.fillStyle = '#f5e6c8';
    roundedRectPath(ctx, -10, -18, 20, 15, 5);
    ctx.fill();
    drawEnemyEyes(ctx, 3, -11, 2.6, true);
    // Sombrero rojo con lunares
    ctx.fillStyle = '#d63a3a';
    ctx.beginPath();
    ctx.ellipse(0, -18, 17, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-7, -25, 3.5, 0, Math.PI * 2);
    ctx.arc(5, -28, 3, 0, Math.PI * 2);
    ctx.arc(11, -21, 2.5, 0, Math.PI * 2);
    ctx.fill();
    this.endDraw(ctx);
  }
}

/* ============================ Murciélago ============================ */

class Bat extends Enemy {
  constructor(x, y) {
    super(x, y, 34, 24);
    this.homeX = x;
    this.homeY = y;
    this.chaseSpeed = 125;
    this.detectRange = 250;
    this.chasing = false;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;

    const player = game.player;
    const distance = distanceBetween(this, player);
    // Empieza a perseguir cuando el jugador se acerca y se rinde si se aleja mucho
    if (!player.dead && distance < this.detectRange) this.chasing = true;
    else if (player.dead || distance > this.detectRange * 1.8) this.chasing = false;

    let targetX;
    let targetY;
    let speed;
    if (this.chasing) {
      targetX = player.x + player.w / 2 - this.w / 2;
      targetY = player.y - 4;
      speed = this.chaseSpeed;
    } else {
      // Vuelo tranquilo alrededor de su posición inicial
      targetX = this.homeX + Math.sin(this.time * 0.9) * 80;
      targetY = this.homeY + Math.sin(this.time * 2.3) * 16;
      speed = 80;
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const length = Math.hypot(dx, dy) || 1;
    const desiredVx = (dx / length) * speed;
    const desiredVy = (dy / length) * speed;
    const steering = Math.min(1, dt * 3);
    this.vx += (desiredVx - this.vx) * steering;
    this.vy += (desiredVy - this.vy) * steering;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.abs(this.vx) > 8) this.facing = Math.sign(this.vx);
  }

  draw(ctx) {
    this.beginDraw(ctx);
    const flap = Math.sin(this.time * 18);
    ctx.translate(0, -12);
    // Alas
    ctx.fillStyle = '#4a2c6b';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 6, -2);
      ctx.quadraticCurveTo(side * 18, -14 * flap - 4, side * 24, -6 * flap);
      ctx.quadraticCurveTo(side * 18, 0, side * 14, 4);
      ctx.quadraticCurveTo(side * 10, 2, side * 6, 5);
      ctx.closePath();
      ctx.fill();
    }
    // Cuerpo
    ctx.fillStyle = '#6b3fa0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Orejas
    ctx.beginPath();
    ctx.moveTo(-7, -5); ctx.lineTo(-5, -13); ctx.lineTo(-2, -6);
    ctx.moveTo(7, -5); ctx.lineTo(5, -13); ctx.lineTo(2, -6);
    ctx.fill();
    drawEnemyEyes(ctx, 2, -1, 2.4, this.chasing);
    // Colmillos
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-1, 4); ctx.lineTo(0, 7); ctx.lineTo(1, 4);
    ctx.moveTo(4, 4); ctx.lineTo(5, 7); ctx.lineTo(6, 4);
    ctx.fill();
    this.endDraw(ctx);
  }
}

/* ============================= Fantasma ============================= */

class Ghost extends Bat {
  constructor(x, y) {
    super(x, y);
    this.w = 32;
    this.h = 34;
    this.chaseSpeed = 100;
    this.detectRange = 300;
  }

  draw(ctx) {
    this.beginDraw(ctx);
    ctx.globalAlpha *= 0.85;
    const wobble = Math.sin(this.time * 4) * 2;
    ctx.translate(0, -18 + wobble);
    ctx.fillStyle = '#e8ecff';
    ctx.beginPath();
    ctx.arc(0, -4, 15, Math.PI, 0);
    ctx.lineTo(15, 14);
    // Borde ondulado inferior
    for (let i = 0; i < 5; i++) {
      const waveX = 15 - (i + 1) * 6;
      ctx.lineTo(waveX + 3, 10 + Math.sin(this.time * 10 + i) * 2);
      ctx.lineTo(waveX, 14);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b2d42';
    ctx.beginPath();
    ctx.ellipse(-3, -5, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -5, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, 4, 3, this.chasing ? 4 : 2, 0, 0, Math.PI * 2);
    ctx.fill();
    this.endDraw(ctx);
  }
}

/* ============================== Jabalí ============================== */

class Boar extends Enemy {
  constructor(x, y) {
    super(x, y, 44, 32);
    this.state = 'patrol'; // patrol -> windup -> charge -> rest
    this.stateTimer = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;

    const player = game.player;
    const level = game.level;
    this.stateTimer -= dt;

    if (this.state === 'patrol') {
      this.walk(dt, level, 40);
      const horizontalDistance = Math.abs(player.x + player.w / 2 - this.centerX);
      const verticalDistance = Math.abs(player.y + player.h - (this.y + this.h));
      if (!player.dead && horizontalDistance < 240 && verticalDistance < 50) {
        this.facePlayer(player);
        this.state = 'windup';
        this.stateTimer = 0.5;
      }
    } else if (this.state === 'windup') {
      // Rasca el suelo antes de embestir (aviso para el jugador)
      this.vx = 0;
      applyGravity(this, dt);
      moveAndCollide(this, level.solids, dt);
      if (this.stateTimer <= 0) {
        this.state = 'charge';
        this.stateTimer = 1.6;
      }
    } else if (this.state === 'charge') {
      const result = this.walk(dt, level, 230, true);
      if (this.vx === 0 || result.hitLeft || result.hitRight || this.stateTimer <= 0) {
        this.state = 'rest';
        this.stateTimer = 1.2;
      }
    } else if (this.state === 'rest') {
      this.vx = 0;
      applyGravity(this, dt);
      moveAndCollide(this, level.solids, dt);
      if (this.stateTimer <= 0) this.state = 'patrol';
    }

    if (this.state === 'charge' && Math.random() < 0.3) {
      game.particles.emit(this.centerX - this.facing * 20, this.y + this.h, {
        count: 1, color: '#c9b79c', speed: 60, size: 3, life: 0.4, gravity: -50
      });
    }
  }

  draw(ctx) {
    this.beginDraw(ctx);
    const isCharging = this.state === 'charge';
    const legSpeed = isCharging ? 25 : 10;
    const step = Math.sin(this.time * legSpeed) * 3;
    const shake = this.state === 'windup' ? Math.sin(this.time * 60) * 1.5 : 0;
    ctx.translate(shake, 0);
    // Patas
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(-15, -9 + step, 6, 9 - step);
    ctx.fillRect(-4, -9 - step, 6, 9 + step);
    ctx.fillRect(7, -9 + step, 6, 9 - step);
    // Cuerpo
    ctx.fillStyle = '#8b5a3c';
    ctx.beginPath();
    ctx.ellipse(-2, -18, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cresta de pelo
    ctx.fillStyle = '#5c3a24';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(-16 + i * 6, -26);
      ctx.lineTo(-13 + i * 6, -33);
      ctx.lineTo(-10 + i * 6, -26);
    }
    ctx.fill();
    // Cabeza y hocico
    ctx.fillStyle = '#9c6b4a';
    ctx.beginPath();
    ctx.ellipse(16, -17, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a598';
    ctx.beginPath();
    ctx.ellipse(24, -14, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c3a24';
    ctx.fillRect(23, -16, 1.5, 3);
    ctx.fillRect(25.5, -16, 1.5, 3);
    // Colmillos
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.moveTo(19, -10); ctx.lineTo(23, -18); ctx.lineTo(21, -10);
    ctx.fill();
    // Ojo enfadado
    ctx.fillStyle = isCharging || this.state === 'windup' ? '#ff3b3b' : '#1a1a2e';
    ctx.beginPath();
    ctx.arc(15, -21, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, -26); ctx.lineTo(19, -23);
    ctx.stroke();
    this.endDraw(ctx);
  }
}

/* ============================= Caballero ============================= */

class Knight extends Enemy {
  constructor(x, y) {
    super(x, y, 34, 44);
    this.hp = 2;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;

    const player = game.player;
    const horizontalDistance = Math.abs(player.x + player.w / 2 - this.centerX);
    const verticalDistance = Math.abs(player.y + player.h - (this.y + this.h));
    const isChasing = !player.dead && horizontalDistance < 230 && verticalDistance < 70;

    if (isChasing) {
      this.facePlayer(player);
      this.walk(dt, game.level, 95, true);
    } else {
      this.walk(dt, game.level, 45);
    }
    this.chasing = isChasing;
  }

  draw(ctx) {
    this.beginDraw(ctx);
    const step = Math.sin(this.time * (this.chasing ? 14 : 8)) * 3;
    // Piernas
    ctx.fillStyle = '#5b5f73';
    ctx.fillRect(-10, -12 + Math.max(0, step), 8, 12 - Math.max(0, step));
    ctx.fillRect(2, -12 + Math.max(0, -step), 8, 12 - Math.max(0, -step));
    // Cuerpo con armadura
    ctx.fillStyle = '#8d93ab';
    roundedRectPath(ctx, -13, -32, 26, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#6b2e8a';
    ctx.fillRect(-13, -24, 26, 5); // banda morada del Rey Rata
    // Casco
    ctx.fillStyle = this.hp > 1 ? '#b8bdd1' : '#7d8299';
    ctx.beginPath();
    ctx.arc(0, -36, 12, Math.PI, 0);
    ctx.lineTo(12, -30);
    ctx.lineTo(-12, -30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, -38, 11, 4); // visera
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(5, -37, 3, 2); // ojos brillantes
    if (this.hp > 1) {
      // Penacho (lo pierde tras el primer golpe)
      ctx.fillStyle = '#c1121f';
      ctx.beginPath();
      ctx.moveTo(-2, -48);
      ctx.quadraticCurveTo(-14, -56, -16, -40);
      ctx.quadraticCurveTo(-8, -46, -2, -44);
      ctx.fill();
    }
    // Lanza
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(12, -46, 3, 40);
    ctx.fillStyle = '#d9d9d9';
    ctx.beginPath();
    ctx.moveTo(10, -46); ctx.lineTo(13.5, -56); ctx.lineTo(17, -46);
    ctx.fill();
    this.endDraw(ctx);
  }
}

/* ===================== Proyectiles del jefe ===================== */

/** Bola de fuego mágica lanzada por el Rey Rata. */
class BossFireball {
  constructor(x, y, vx, vy) {
    this.x = x - 9;
    this.y = y - 9;
    this.w = 18;
    this.h = 18;
    this.vx = vx;
    this.vy = vy;
    this.life = 5;
    this.alive = true;
    this.time = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.random() < 0.5) {
      game.particles.emit(this.x + 9, this.y + 9, {
        count: 1, color: ['#b5179e', '#7ef9a0'], speed: 30, size: 3, life: 0.35, gravity: 0
      });
    }
    const hitsWall = game.level.bossSolids.some((solid) => solid.active && rectsOverlap(this, solid));
    if (this.life <= 0 || hitsWall) {
      this.alive = false;
      game.particles.emit(this.x + 9, this.y + 9, { count: 8, color: '#b5179e', speed: 120, size: 3, life: 0.4 });
    }
  }

  draw(ctx) {
    const cx = this.x + 9;
    const cy = this.y + 9;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, '#7ef9a0');
    glow.addColorStop(0.7, 'rgba(181, 23, 158, 0.8)');
    glow.addColorStop(1, 'rgba(181, 23, 158, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 16 + Math.sin(this.time * 20) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Onda expansiva que recorre el suelo cuando el jefe aterriza. */
class Shockwave {
  constructor(x, floorY, direction) {
    this.w = 26;
    this.h = 30;
    this.x = x - this.w / 2;
    this.y = floorY - this.h;
    this.vx = direction * 330;
    this.alive = true;
    this.time = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.x += this.vx * dt;
    const hitsWall = game.level.bossSolids.some((solid) => solid.active && rectsOverlap(this, solid));
    if (hitsWall || this.time > 4) this.alive = false;
  }

  draw(ctx) {
    const baseY = this.y + this.h;
    ctx.save();
    ctx.translate(this.x + this.w / 2, baseY);
    ctx.scale(Math.sign(this.vx), 1);
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.9 - i * 0.25;
      ctx.fillStyle = i === 0 ? '#e0aaff' : '#9d4edd';
      ctx.beginPath();
      ctx.moveTo(-14 - i * 10, 0);
      ctx.quadraticCurveTo(-4 - i * 10, -this.h - Math.sin(this.time * 30) * 4 + i * 8, 8 - i * 10, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ======================= Dibujo del Rey Rata ======================= */

/**
 * Dibuja al villano. Se usa tanto en el combate como en las escenas de
 * la historia. (x, y) es el punto entre sus pies.
 * @param {object} options facing, time, pose, scale, flashing
 */
function drawRatKing(ctx, x, y, options = {}) {
  const { facing = -1, time = 0, pose = 'idle', scale = 1 } = options;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);

  const breathing = Math.sin(time * 3) * 1.5;
  const isTired = pose === 'tired';
  const isWindup = pose === 'windup';
  const isFlying = pose === 'fly';

  if (pose === 'charge') ctx.rotate(0.22);
  if (pose === 'crouch') ctx.scale(1.08, 0.88);

  // Cola larga
  ctx.strokeStyle = '#e39aa6';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, -14);
  ctx.bezierCurveTo(-60, -10, -50, -50 + Math.sin(time * 4) * 8, -78, -40);
  ctx.stroke();

  // Capa
  ctx.fillStyle = '#7b1e2b';
  ctx.beginPath();
  ctx.moveTo(-14, -82);
  ctx.quadraticCurveTo(-46, -40, -40 + Math.sin(time * 3) * 4, -4);
  ctx.lineTo(10, -6);
  ctx.closePath();
  ctx.fill();

  // Pies
  if (!isFlying) {
    ctx.fillStyle = '#e39aa6';
    ctx.beginPath();
    ctx.ellipse(-12, -4, 12, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(16, -4, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cuerpo
  ctx.fillStyle = '#6d6a85';
  ctx.beginPath();
  ctx.ellipse(0, -38 + breathing * 0.5, 30, 34 + breathing * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a7a3c2';
  ctx.beginPath();
  ctx.ellipse(8, -34, 17, 23, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cinturón dorado
  ctx.fillStyle = '#e0a800';
  ctx.fillRect(-28, -30, 56, 6);

  // Cabeza (inclinada si está agotado)
  ctx.save();
  ctx.translate(10, -76 + breathing);
  if (isTired) ctx.rotate(0.35);
  // Orejas
  ctx.fillStyle = '#6d6a85';
  ctx.beginPath();
  ctx.arc(-14, -18, 13, 0, Math.PI * 2);
  ctx.arc(8, -22, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e39aa6';
  ctx.beginPath();
  ctx.arc(-14, -18, 8, 0, Math.PI * 2);
  ctx.arc(8, -22, 7, 0, Math.PI * 2);
  ctx.fill();
  // Cara y hocico
  ctx.fillStyle = '#7d7a98';
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -10);
  ctx.quadraticCurveTo(40, -2, 36, 6);
  ctx.quadraticCurveTo(20, 14, 10, 12);
  ctx.closePath();
  ctx.fill();
  // Nariz
  ctx.fillStyle = '#ff7a9a';
  ctx.beginPath();
  ctx.arc(36, 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Dientes
  ctx.fillStyle = '#fffbe6';
  ctx.fillRect(22, 10, 4, 6);
  ctx.fillRect(27, 9, 4, 6);
  // Bigotes
  ctx.strokeStyle = '#2b2840';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(30, 4); ctx.lineTo(50, -2);
  ctx.moveTo(30, 6); ctx.lineTo(51, 6);
  ctx.moveTo(30, 8); ctx.lineTo(48, 14);
  ctx.stroke();
  // Ojos
  if (isTired) {
    // Ojos en espiral (mareado)
    ctx.strokeStyle = '#2b2840';
    ctx.lineWidth = 1.8;
    for (const eyeX of [2, 15]) {
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 5; angle += 0.4) {
        const radius = angle * 0.4;
        ctx.lineTo(eyeX + Math.cos(angle + time * 8) * radius, -4 + Math.sin(angle + time * 8) * radius);
      }
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(2, -4, 5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(15, -5, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d00000';
    ctx.beginPath();
    ctx.arc(4, -3, 3, 0, Math.PI * 2);
    ctx.arc(17, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Cejas enfadadas
    ctx.strokeStyle = '#2b2840';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -13); ctx.lineTo(8, -9);
    ctx.moveTo(10, -10); ctx.lineTo(22, -14);
    ctx.stroke();
  }
  // Corona
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(-16, -32);
  ctx.lineTo(-8, -24);
  ctx.lineTo(-2, -36);
  ctx.lineTo(4, -24);
  ctx.lineTo(12, -32);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.arc(-2, -20, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Báculo con orbe mágico
  const staffRaise = isWindup ? -22 : 0;
  ctx.fillStyle = '#5c3a24';
  ctx.save();
  ctx.translate(28, -40 + staffRaise);
  ctx.rotate(0.15);
  ctx.fillRect(-2.5, -50, 5, 74);
  const orbPulse = isWindup ? 13 + Math.sin(time * 30) * 3 : 8 + Math.sin(time * 4);
  const orbGlow = ctx.createRadialGradient(0, -56, 1, 0, -56, orbPulse * 2);
  orbGlow.addColorStop(0, '#ffffff');
  orbGlow.addColorStop(0.4, '#7ef9a0');
  orbGlow.addColorStop(1, 'rgba(126, 249, 160, 0)');
  ctx.fillStyle = orbGlow;
  ctx.beginPath();
  ctx.arc(0, -56, orbPulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Brazo que sujeta el báculo
  ctx.fillStyle = '#6d6a85';
  ctx.beginPath();
  ctx.ellipse(22, -42 + staffRaise * 0.6, 9, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Estrellas de mareo
  if (isTired) {
    for (let i = 0; i < 3; i++) {
      const angle = time * 4 + (i * Math.PI * 2) / 3;
      drawStar(ctx, 10 + Math.cos(angle) * 26, -112 + Math.sin(angle) * 7, 6, 2.5, 5, '#ffe066', angle);
    }
  }
  ctx.restore();
}

/* ============================ Jefe final ============================ */

/**
 * El Rey Rata. Sus estados (state) forman una pequeña máquina de estados:
 *   waiting -> intro -> walk -> (ataque) -> tired -> walk -> ...
 * Ataques: lanzar bolas de fuego, embestir contra la pared y saltar
 * provocando ondas expansivas. Solo es vulnerable en el estado "tired"
 * (agotado), que llega después de embestir o de saltar.
 */
class RatKing extends Enemy {
  constructor(x, y) {
    super(x, y, 76, 96);
    this.spawnX = x;
    this.spawnY = y;
    this.isBoss = true;
    this.name = 'Rey Rata';
    this.maxHp = 10;
    this.reset();
  }

  /** Devuelve al jefe a su estado inicial (por ejemplo, si el jugador muere). */
  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.facing = -1;
    this.state = 'waiting';
    this.stateTimer = 0;
    this.attackIndex = 0;
    this.slamsLeft = 0;
    this.invulnerableTimer = 0;
    this.flashTimer = 0;
    this.leftGround = false;
    this.dying = false;
    this.alive = true;
    this.defeatHandled = false;
  }

  /** Fase 2 cuando le queda la mitad de la vida: más rápido y agresivo. */
  get phase() { return this.hp <= this.maxHp / 2 ? 2 : 1; }
  get vulnerable() { return this.state === 'tired'; }
  get harmful() { return !['waiting', 'intro', 'tired', 'defeated'].includes(this.state); }

  activate() {
    this.setState('intro', 1.0);
    AudioManager.play('bossLaugh');
  }

  setState(state, duration = 0) {
    this.state = state;
    this.stateTimer = duration;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.stateTimer -= dt;
    const player = game.player;
    const level = game.level;
    const speedFactor = this.phase === 2 ? 1.35 : 1;

    if (this.state === 'defeated') {
      // Animación de derrota: tiembla y suelta chispas
      this.vx = 0;
      if (Math.random() < 0.4) {
        game.particles.emit(this.x + Math.random() * this.w, this.y + Math.random() * this.h, {
          count: 3, color: ['#ffd23f', '#ffffff', '#9d4edd'], speed: 160, size: 4, life: 0.6, shape: 'star'
        });
      }
      if (this.stateTimer <= 0 && !this.defeatHandled) {
        this.defeatHandled = true;
        this.alive = false;
        game.particles.emit(this.centerX, this.centerY, {
          count: 50, color: ['#ffd23f', '#9d4edd', '#ffffff', '#6d6a85'], speed: 380, size: 6, life: 1.2, shape: 'star'
        });
        game.onBossDefeated();
      }
      return;
    }

    switch (this.state) {
      case 'waiting':
        this.vx = 0;
        break;
      case 'intro':
        this.vx = 0;
        this.facePlayer(player);
        if (this.stateTimer <= 0) this.setState('walk', 1.2);
        break;
      case 'walk':
        this.facePlayer(player);
        this.vx = this.facing * 80 * speedFactor;
        if (this.stateTimer <= 0) this.startNextAttack(player);
        break;
      case 'shootWindup':
        this.vx = 0;
        this.facePlayer(player);
        if (this.stateTimer <= 0) {
          this.shootFireballs(game);
          this.setState('shootRecover', 0.6);
        }
        break;
      case 'shootRecover':
        this.vx = 0;
        if (this.stateTimer <= 0) this.setState('walk', 0.9);
        break;
      case 'chargeWindup':
        this.vx = 0;
        if (this.stateTimer <= 0) this.setState('charge', 3);
        break;
      case 'charge':
        this.vx = this.facing * 430 * speedFactor;
        if (Math.random() < 0.5) {
          game.particles.emit(this.centerX - this.facing * 30, this.y + this.h, {
            count: 1, color: '#9b8fb0', speed: 80, size: 5, life: 0.5, gravity: -40
          });
        }
        if (this.stateTimer <= 0) this.setState('tired', 2.2);
        break;
      case 'jumpWindup':
        this.vx = 0;
        if (this.stateTimer <= 0) {
          // Salta hacia donde está el jugador
          this.facePlayer(player);
          const distanceToPlayer = player.x + player.w / 2 - this.centerX;
          this.vy = -950;
          this.vx = clamp(distanceToPlayer / 0.95, -420, 420);
          this.leftGround = false;
          this.setState('jump', 3);
        }
        break;
      case 'jump':
        if (!this.onGround) this.leftGround = true;
        break;
      case 'tired':
        this.vx = 0;
        if (this.stateTimer <= 0) this.setState('walk', 1.0);
        break;
      default:
        break;
    }

    applyGravity(this, dt);
    const result = moveAndCollide(this, level.bossSolids, dt);

    // Al chocar contra la pared durante la embestida, queda aturdido
    if (this.state === 'charge' && (result.hitLeft || result.hitRight)) {
      game.camera.shake(10, 0.5);
      AudioManager.play('bossSlam');
      game.particles.emit(this.centerX + this.facing * 40, this.centerY, {
        count: 20, color: ['#9b8fb0', '#ffffff'], speed: 250, size: 5, life: 0.6, shape: 'square'
      });
      this.setState('tired', 2.6);
    }

    // Al aterrizar de un salto, crea dos ondas expansivas
    if (this.state === 'jump' && this.leftGround && this.onGround) {
      this.vx = 0;
      const floorY = this.y + this.h;
      game.enemyProjectiles.push(new Shockwave(this.centerX - 40, floorY, -1));
      game.enemyProjectiles.push(new Shockwave(this.centerX + 40, floorY, 1));
      game.camera.shake(12, 0.45);
      AudioManager.play('bossSlam');
      game.particles.emit(this.centerX, floorY, { count: 24, color: '#9b8fb0', speed: 220, size: 5, life: 0.6, angle: -Math.PI / 2, spread: Math.PI });
      this.slamsLeft--;
      if (this.slamsLeft > 0) this.setState('jumpWindup', 0.35);
      else this.setState('tired', 2.0);
    }
  }

  /** Elige el siguiente ataque siguiendo un patrón fijo y reconocible. */
  startNextAttack(player) {
    const pattern = ['shoot', 'charge', 'shoot', 'jump'];
    const attack = pattern[this.attackIndex % pattern.length];
    this.attackIndex++;
    this.facePlayer(player);

    if (attack === 'shoot') {
      this.setState('shootWindup', this.phase === 2 ? 0.45 : 0.7);
    } else if (attack === 'charge') {
      this.setState('chargeWindup', 0.8);
      AudioManager.play('bossCharge');
    } else {
      this.slamsLeft = this.phase === 2 ? 2 : 1;
      this.setState('jumpWindup', 0.5);
    }
  }

  /** Lanza un abanico de bolas de fuego dirigidas al jugador. */
  shootFireballs(game) {
    const player = game.player;
    const originX = this.centerX + this.facing * 36;
    const originY = this.y + 10;
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const baseAngle = Math.atan2(targetY - originY, targetX - originX);
    const count = this.phase === 2 ? 5 : 3;
    const spread = 0.26;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      game.enemyProjectiles.push(new BossFireball(originX, originY, Math.cos(angle) * 270, Math.sin(angle) * 270));
    }
    AudioManager.play('bossShoot');
  }

  /** El jefe solo recibe daño cuando está agotado. */
  hit(damage, game) {
    if (!this.vulnerable || this.invulnerableTimer > 0) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invulnerableTimer = 0.45;
    this.flashTimer = 0.35;
    AudioManager.play('bossHit');
    game.camera.shake(6, 0.25);
    if (this.hp <= 0) {
      this.setState('defeated', 2.4);
      this.dying = true;
      AudioManager.stopMusic();
    }
    return true;
  }

  /** Pose de dibujo según el estado actual. */
  get pose() {
    switch (this.state) {
      case 'shootWindup': return 'windup';
      case 'charge': return 'charge';
      case 'chargeWindup':
      case 'jumpWindup': return 'crouch';
      case 'tired': return 'tired';
      default: return 'idle';
    }
  }

  draw(ctx) {
    ctx.save();
    let shakeX = 0;
    if (this.state === 'chargeWindup' || this.state === 'defeated') shakeX = Math.sin(this.time * 70) * 3;
    if (this.flashTimer > 0 && Math.floor(this.flashTimer * 30) % 2 === 0) ctx.globalAlpha = 0.4;
    drawRatKing(ctx, this.centerX + shakeX, this.y + this.h, {
      facing: this.facing, time: this.time, pose: this.pose, scale: 1
    });
    ctx.restore();
  }
}

/* ========================= Creación de enemigos ========================= */

const ENEMY_TYPES = {
  s: Slime,
  m: Mushroom,
  w: Bat,
  g: Boar,
  n: Knight,
  q: Ghost,
  B: RatKing
};

/**
 * Crea un enemigo a partir de un carácter del mapa. El enemigo se coloca
 * centrado en la casilla y apoyado sobre su borde inferior.
 */
function createEnemy(character, tileX, tileY) {
  const EnemyClass = ENEMY_TYPES[character];
  if (!EnemyClass) return null;
  const enemy = new EnemyClass(0, 0);
  enemy.x = tileX + (CONFIG.TILE_SIZE - enemy.w) / 2;
  enemy.y = tileY + CONFIG.TILE_SIZE - enemy.h;
  if (enemy instanceof Bat) {
    enemy.homeX = enemy.x;
    enemy.homeY = enemy.y;
  }
  if (enemy instanceof RatKing) {
    enemy.spawnX = enemy.x;
    enemy.spawnY = enemy.y;
  }
  return enemy;
}
