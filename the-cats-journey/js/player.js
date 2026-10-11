/* =====================================================================
   player.js - El protagonista (Milo) y su bola de energía
   ---------------------------------------------------------------------
   Contiene:
   - drawCatSprite(): elige y dibuja el fotograma de pixel art de un gato
     (Milo o Luna) según su postura. La usan el jugador, la jaula de
     Luna y las escenas de la historia.
   - Player: controles, física, salud, animaciones y estados de Milo.
   - EnergyBall: el proyectil que Milo lanza con la tecla X.
   ===================================================================== */
'use strict';

/* ======================= Dibujo de un gato ======================= */

/**
 * Dibuja un gato en pixel art. (x, y) es el punto entre sus patas.
 * @param {string} style  'milo' o 'luna'
 * @param {string} pose   'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'hurt' | 'victory' | 'sit' | 'scared'
 * @param {number} time   tiempo para las animaciones de reposo
 * @param {number} walkCycle fase de la animación de caminar
 */
function drawCatSprite(ctx, style, pose, x, y, facing = 1, time = 0, walkCycle = 0) {
  const animations = SPRITES[style];
  let frames = animations[pose] || animations.idle;
  let frameIndex = 0;
  if (pose === 'walk' || pose === 'run') {
    frameIndex = Math.floor(walkCycle) % frames.length;
  } else if (pose === 'idle' || pose === 'sit') {
    // Respira despacio y parpadea de vez en cuando
    const blinking = (time % 4) > 3.8;
    frameIndex = blinking ? 2 : Math.floor(time * 1.5) % 2;
  } else {
    frameIndex = Math.floor(time * 4) % frames.length;
  }
  frames[frameIndex].draw(ctx, Math.round(x), Math.round(y), facing < 0);
}

/* ========================== Bola de energía ========================== */

class EnergyBall {
  constructor(x, y, direction) {
    this.w = 8;
    this.h = 8;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.vx = direction * 312;
    this.life = 1.1;
    this.alive = true;
    this.time = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.life -= dt;
    this.x += this.vx * dt;
    if (Math.random() < 0.7) {
      game.particles.emit(this.x + 4, this.y + 4, {
        count: 1, color: ['#7ef9ff', '#c77dff', '#ffffff'], speed: 12, size: 2, life: 0.3, gravity: 0
      });
    }
    const hitsWall = game.level.solids.some((solid) => solid.active && !solid.oneWay && rectsOverlap(this, solid));
    if (hitsWall) this.explode(game);
    if (this.life <= 0) this.alive = false;
  }

  explode(game) {
    this.alive = false;
    game.particles.emit(this.x + 4, this.y + 4, { count: 10, color: ['#7ef9ff', '#c77dff', '#ffffff'], speed: 90, size: 2, life: 0.4 });
  }

  draw(ctx) {
    SPRITES.energyBall[Math.floor(this.time * 16) % 2].draw(ctx, this.x + 4, this.y + 4);
  }
}

/* ============================== Jugador ============================== */

// Valores de movimiento (en píxeles de arte): cambiarlos modifica cómo "se siente" el control
const PLAYER_SETTINGS = {
  WALK_SPEED: 138,
  RUN_SPEED: 198,
  GROUND_ACCELERATION: 1080,
  AIR_ACCELERATION: 720,
  GROUND_FRICTION: 1320,
  JUMP_VELOCITY: 468,
  JUMP_CUT_MULTIPLIER: 0.45,  // al soltar el salto antes de tiempo, se salta menos
  COYOTE_TIME: 0.1,           // margen para saltar justo después de dejar una plataforma
  JUMP_BUFFER_TIME: 0.12,     // margen para pulsar salto justo antes de aterrizar
  STOMP_BOUNCE: 312,
  MAX_HEALTH: 3,
  INVULNERABLE_TIME: 1.4,
  HURT_TIME: 0.35,
  SHOOT_COOLDOWN: 0.55
};

class Player {
  constructor(x, y) {
    this.w = 16;
    this.h = 20;
    this.maxHealth = PLAYER_SETTINGS.MAX_HEALTH;
    this.reset(x, y);
  }

  /** Coloca al jugador en una posición con la salud completa. */
  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.groundPlatform = null;
    this.health = this.maxHealth;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isJumping = false;
    this.invulnerableTimer = 0;
    this.hurtTimer = 0;
    this.shootCooldown = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.celebrating = false;
    this.controlsLocked = false;
    this.walkCycle = 0;
    this.time = 0;
    this.previousBottom = y + this.h;
  }

  get centerX() { return this.x + this.w / 2; }

  /**
   * Actualiza al jugador.
   * @param {number} dt
   * @param {object} input  Objeto con isDown(acción) / wasPressed(acción)
   * @param {object} game   Referencia al juego (nivel, partículas...)
   */
  update(dt, input, game) {
    this.time += dt;
    this.previousBottom = this.y + this.h;
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);

    // ---- Animación de muerte: salta y cae fuera de la pantalla ----
    if (this.dead) {
      this.deathTimer -= dt;
      applyGravity(this, dt);
      this.y += this.vy * dt;
      return;
    }

    const level = game.level;

    // ---- Acompañar a la plataforma móvil sobre la que estamos ----
    if (this.groundPlatform && this.groundPlatform.active) {
      this.x += this.groundPlatform.dx || 0;
      this.y += this.groundPlatform.dy || 0;
    }

    // ---- Entrada horizontal ----
    let direction = 0;
    const canControl = !this.controlsLocked && this.hurtTimer <= 0;
    if (canControl) {
      if (input.isDown('left')) direction -= 1;
      if (input.isDown('right')) direction += 1;
    }

    const maxSpeed = input.isDown('run') ? PLAYER_SETTINGS.RUN_SPEED : PLAYER_SETTINGS.WALK_SPEED;
    const acceleration = this.onGround ? PLAYER_SETTINGS.GROUND_ACCELERATION : PLAYER_SETTINGS.AIR_ACCELERATION;
    if (direction !== 0) {
      this.vx += direction * acceleration * dt;
      this.vx = clamp(this.vx, -maxSpeed, maxSpeed);
      // Al cambiar de dirección giramos más rápido
      if (Math.sign(this.vx) !== direction) this.vx += direction * acceleration * dt;
      this.facing = direction;
    } else if (this.hurtTimer <= 0) {
      // Fricción: frenamos poco a poco
      const friction = PLAYER_SETTINGS.GROUND_FRICTION * (this.onGround ? 1 : 0.35) * dt;
      if (Math.abs(this.vx) <= friction) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * friction;
    }
    // Si dejamos de correr, volvemos suavemente a la velocidad de paseo
    if (Math.abs(this.vx) > maxSpeed && this.onGround) {
      this.vx = Math.sign(this.vx) * Math.max(maxSpeed, Math.abs(this.vx) - 540 * dt);
    }

    // ---- Salto (con "coyote time" y "jump buffer") ----
    this.coyoteTimer = this.onGround ? PLAYER_SETTINGS.COYOTE_TIME : this.coyoteTimer - dt;
    if (canControl && input.wasPressed('jump')) this.jumpBufferTimer = PLAYER_SETTINGS.JUMP_BUFFER_TIME;
    else this.jumpBufferTimer -= dt;

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = -PLAYER_SETTINGS.JUMP_VELOCITY;
      this.isJumping = true;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.onGround = false;
      this.groundPlatform = null;
      AudioManager.play('jump');
      game.particles.emit(this.centerX, this.y + this.h - 1, { count: 5, color: ['#e8dcc8', '#bfae94'], speed: 36, size: 2, life: 0.35, gravity: -36 });
    }
    // Salto variable: si se suelta el botón mientras subimos, cortamos el salto
    if (this.isJumping && this.vy < 0 && !input.isDown('jump')) {
      this.vy *= PLAYER_SETTINGS.JUMP_CUT_MULTIPLIER;
      this.isJumping = false;
    }
    if (this.vy >= 0) this.isJumping = false;

    // ---- Ataque: bola de energía ----
    if (canControl && input.wasPressed('attack') && this.shootCooldown <= 0) {
      this.shootCooldown = PLAYER_SETTINGS.SHOOT_COOLDOWN;
      game.playerProjectiles.push(new EnergyBall(this.centerX + this.facing * 12, this.y + 8, this.facing));
      AudioManager.play('shoot');
    }

    // ---- Física y colisiones ----
    const wasOnGround = this.onGround;
    const fallSpeed = this.vy;
    applyGravity(this, dt);
    const result = moveAndCollide(this, level.solids, dt);
    if (result.hitLeft || result.hitRight) this.vx = 0;
    this.groundPlatform = result.landedOn;

    // No podemos salir por la izquierda ni por la derecha del nivel
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x + this.w > level.width) { this.x = level.width - this.w; this.vx = 0; }

    // Polvo al aterrizar de una caída fuerte
    if (this.onGround && !wasOnGround && fallSpeed > 240) {
      game.particles.emit(this.centerX, this.y + this.h - 1, { count: 6, color: ['#e8dcc8', '#bfae94'], speed: 54, size: 2, life: 0.4, gravity: -24, angle: -Math.PI / 2, spread: Math.PI });
    }
    // Avisamos a la plataforma de que la estamos pisando (las que se derrumban lo necesitan)
    if (this.onGround && this.groundPlatform && this.groundPlatform.onStep) this.groundPlatform.onStep();

    // Animación de las patas: avanza según la distancia recorrida
    this.walkCycle += Math.abs(this.vx) * dt * 0.09;
  }

  /** Recibe daño desde una posición (para saber hacia dónde salir despedido). */
  takeDamage(amount, sourceX, game) {
    if (this.invulnerableTimer > 0 || this.dead || this.celebrating) return false;
    this.health -= amount;
    this.invulnerableTimer = PLAYER_SETTINGS.INVULNERABLE_TIME;
    this.hurtTimer = PLAYER_SETTINGS.HURT_TIME;
    const pushDirection = this.centerX < sourceX ? -1 : 1;
    this.vx = pushDirection * 144;
    this.vy = -228;
    this.onGround = false;
    this.groundPlatform = null;
    game.camera.shake(2, 0.2);
    game.particles.emit(this.centerX, this.y + 6, { count: 8, color: ['#ff4f6d', '#ffffff'], speed: 96, size: 2, life: 0.5 });
    if (this.health <= 0) {
      this.die();
    } else {
      AudioManager.play('hurt');
    }
    return true;
  }

  /** Rebote tras pisar a un enemigo. Si se mantiene el salto, se bota más alto. */
  bounce(input) {
    this.vy = -(input.isDown('jump') ? PLAYER_SETTINGS.JUMP_VELOCITY * 0.9 : PLAYER_SETTINGS.STOMP_BOUNCE);
    this.isJumping = input.isDown('jump');
    this.onGround = false;
    this.groundPlatform = null;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** Inicia la animación de derrota. main.js decide qué pasa después. */
  die(fellIntoVoid = false) {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.deathTimer = 1.6;
    this.vx = 0;
    this.vy = fellIntoVoid ? 0 : -390;
    this.groundPlatform = null;
    AudioManager.play('lifeLost');
  }

  /** Animación de celebración al terminar un nivel o rescatar a Luna. */
  celebrate() {
    this.celebrating = true;
    this.controlsLocked = true;
  }

  /** Decide qué animación mostrar según el estado actual. */
  get pose() {
    if (this.dead || this.hurtTimer > 0) return 'hurt';
    if (this.celebrating && this.onGround) return 'victory';
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (Math.abs(this.vx) > PLAYER_SETTINGS.WALK_SPEED + 12) return 'run';
    if (Math.abs(this.vx) > 9) return 'walk';
    return 'idle';
  }

  draw(ctx) {
    // Parpadeo mientras somos invulnerables tras recibir daño
    if (this.invulnerableTimer > 0 && !this.dead && Math.floor(this.invulnerableTimer * 15) % 2 === 0) return;

    const footX = Math.round(this.centerX);
    const footY = Math.round(this.y + this.h);
    // Sombra de píxeles bajo los pies
    if (this.onGround) {
      ctx.fillStyle = 'rgba(20, 10, 30, 0.3)';
      ctx.fillRect(footX - 9, footY - 1, 18, 1);
      ctx.fillRect(footX - 7, footY, 14, 1);
    }
    drawCatSprite(ctx, 'milo', this.pose, footX, footY, this.facing, this.time, this.walkCycle);
  }
}
