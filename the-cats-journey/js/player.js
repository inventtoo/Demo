/* =====================================================================
   player.js - El protagonista (Milo) y su bola de energía
   ---------------------------------------------------------------------
   Contiene:
   - drawCat(): dibuja un gato con formas de Canvas. La usan Milo, Luna
     y las escenas de la historia, cambiando colores y postura.
   - Player: controles, física, salud, animaciones y estados de Milo.
   - EnergyBall: el proyectil que Milo lanza con la tecla X.
   ===================================================================== */
'use strict';

/* ======================= Dibujo de un gato ======================= */

// Paletas de colores de los dos gatos protagonistas
const CAT_STYLES = {
  milo: { body: '#ff9a3c', belly: '#ffe0b8', stripes: '#d96a1b', earInner: '#ffb3c1', outline: '#8a4a12', eyes: '#2d6a4f', bow: null },
  luna: { body: '#f2f2f7', belly: '#ffffff', stripes: null, earInner: '#ffb3c1', outline: '#8a8aa0', eyes: '#3a86ff', bow: '#ff4f9a' }
};

/**
 * Dibuja un gato. (x, y) es el punto entre sus patas (en el suelo).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {object} options
 *   style:  'milo' o 'luna'
 *   facing: 1 derecha, -1 izquierda
 *   pose:   'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'hurt' | 'victory' | 'sit' | 'scared'
 *   time:   tiempo para las animaciones
 *   walkCycle: fase de la animación de caminar
 *   scale:  tamaño
 *   squash: deformación al aterrizar (1 = normal)
 */
function drawCat(ctx, x, y, options = {}) {
  const {
    style = 'milo', facing = 1, pose = 'idle', time = 0, walkCycle = 0, scale = 1, squash = 1
  } = options;
  const colors = CAT_STYLES[style];

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale * (2 - squash), scale * squash);

  const isMoving = pose === 'walk' || pose === 'run';
  const legSwing = isMoving ? Math.sin(walkCycle) * (pose === 'run' ? 6 : 4) : 0;
  const bob = isMoving ? Math.abs(Math.sin(walkCycle)) * -2 : Math.sin(time * 2) * 0.6;
  let bodyTilt = 0;
  if (pose === 'jump') bodyTilt = -0.12;
  if (pose === 'fall') bodyTilt = 0.08;
  if (pose === 'hurt') bodyTilt = -0.3;
  if (pose === 'run') bodyTilt = 0.06;

  ctx.translate(0, bob);
  ctx.rotate(bodyTilt);

  // ---- Cola (se mueve suavemente) ----
  const tailWave = Math.sin(time * 4) * 5;
  ctx.strokeStyle = colors.body;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -14);
  if (pose === 'fall' || pose === 'scared') {
    ctx.bezierCurveTo(-22, -18, -26, -34, -20 + tailWave * 0.3, -42);
  } else {
    ctx.bezierCurveTo(-24, -14, -26 + tailWave * 0.3, -28, -18 + tailWave, -34);
  }
  ctx.stroke();
  if (colors.stripes) {
    ctx.strokeStyle = colors.stripes;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-19 + tailWave * 0.8, -31);
    ctx.lineTo(-18 + tailWave, -34);
    ctx.stroke();
  }

  // ---- Patas ----
  ctx.fillStyle = colors.body;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.2;
  const drawLeg = (legX, offset, lift = 0) => {
    ctx.beginPath();
    ctx.ellipse(legX + offset, -4 - lift, 4.2, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  if (pose === 'jump') {
    // Patas recogidas
    drawLeg(-9, -3, 5); drawLeg(-3, -2, 6); drawLeg(5, 2, 6); drawLeg(10, 3, 5);
  } else if (pose === 'fall' || pose === 'scared') {
    // Patas estiradas hacia abajo
    drawLeg(-9, -2, -2); drawLeg(-3, 0, -3); drawLeg(5, 0, -3); drawLeg(10, 2, -2);
  } else if (pose === 'sit') {
    drawLeg(-8, 0, 0); drawLeg(6, 0, 0); drawLeg(10, 0, 0);
  } else {
    drawLeg(-9, legSwing, 0); drawLeg(-3, -legSwing, 0);
    drawLeg(5, -legSwing, 0); drawLeg(10, legSwing, 0);
  }

  // ---- Cuerpo ----
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  if (pose === 'sit') ctx.ellipse(-2, -14, 13, 12, -0.4, 0, Math.PI * 2);
  else ctx.ellipse(0, -13, 15, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.belly;
  ctx.beginPath();
  ctx.ellipse(4, -9, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (colors.stripes) {
    ctx.strokeStyle = colors.stripes;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const stripeX of [-9, -4, 1]) {
      ctx.moveTo(stripeX, -22);
      ctx.quadraticCurveTo(stripeX - 2, -18, stripeX, -15);
    }
    ctx.stroke();
  }

  // ---- Cabeza ----
  ctx.save();
  let headY = -28;
  if (pose === 'victory') headY -= Math.abs(Math.sin(time * 6)) * 2;
  ctx.translate(9, headY);
  if (pose === 'hurt') ctx.rotate(0.2);

  // Orejas
  const earWiggle = pose === 'idle' ? Math.max(0, Math.sin(time * 1.3) - 0.95) * 30 : 0;
  ctx.fillStyle = colors.body;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-11, -6); ctx.lineTo(-10 - earWiggle * 0.1, -20); ctx.lineTo(-2, -11);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, -11); ctx.lineTo(10, -20); ctx.lineTo(12, -6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = colors.earInner;
  ctx.beginPath();
  ctx.moveTo(-9, -8); ctx.lineTo(-9, -16); ctx.lineTo(-4, -11);
  ctx.moveTo(5, -11); ctx.lineTo(9.5, -16); ctx.lineTo(10, -8);
  ctx.fill();

  // Cara
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Hocico claro
  ctx.fillStyle = colors.belly;
  ctx.beginPath();
  ctx.ellipse(4, 5, 6.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rayitas en la frente
  if (colors.stripes) {
    ctx.strokeStyle = colors.stripes;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -11); ctx.lineTo(-1, -7);
    ctx.moveTo(2, -11); ctx.lineTo(2, -7);
    ctx.stroke();
  }

  // Ojos (cambian según la emoción)
  const blinking = (time % 4) > 3.85;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2b1d14';
  if (pose === 'hurt') {
    // Ojos apretados ><
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(-2, -1); ctx.lineTo(-6, 2);
    ctx.moveTo(10, -4); ctx.lineTo(6, -1); ctx.lineTo(10, 2);
    ctx.stroke();
  } else if (pose === 'victory') {
    // Ojos felices ^^
    ctx.beginPath();
    ctx.arc(-3, 0, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.moveTo(5.5, -1);
    ctx.arc(8, 0, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (blinking) {
    ctx.beginPath();
    ctx.moveTo(-6, -1); ctx.lineTo(0, -1);
    ctx.moveTo(5, -1); ctx.lineTo(11, -1);
    ctx.stroke();
  } else {
    const eyeHeight = pose === 'fall' || pose === 'scared' ? 5.5 : 4.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-3, -1, 3.8, eyeHeight, 0, 0, Math.PI * 2);
    ctx.ellipse(8, -1, 3.8, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.eyes;
    ctx.beginPath();
    ctx.ellipse(-2, -0.5, 2.6, eyeHeight - 1, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -0.5, 2.6, eyeHeight - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(-1.6, -0.5, 1.3, eyeHeight - 2, 0, 0, Math.PI * 2);
    ctx.ellipse(9.4, -0.5, 1.3, eyeHeight - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-2.6, -2.5, 1.2, 0, Math.PI * 2);
    ctx.arc(8.4, -2.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    if (style === 'luna') {
      // Pestañas
      ctx.strokeStyle = '#2b1d14';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6.5, -4); ctx.lineTo(-8.5, -6);
      ctx.moveTo(11.5, -4); ctx.lineTo(13.5, -6);
      ctx.stroke();
    }
  }

  // Nariz y boca
  ctx.fillStyle = '#ff7a9a';
  ctx.beginPath();
  ctx.moveTo(2.5, 2.5); ctx.lineTo(6.5, 2.5); ctx.lineTo(4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a3a2a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (pose === 'hurt' || pose === 'scared') {
    ctx.arc(4.5, 9, 2, Math.PI, 0); // boca preocupada
  } else {
    ctx.moveTo(4.5, 5); ctx.quadraticCurveTo(3, 8, 1.5, 6.5);
    ctx.moveTo(4.5, 5); ctx.quadraticCurveTo(6, 8, 7.5, 6.5);
  }
  ctx.stroke();

  // Bigotes
  ctx.strokeStyle = 'rgba(60, 40, 30, 0.7)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(9, 4); ctx.lineTo(19, 2);
  ctx.moveTo(9, 6); ctx.lineTo(19, 7);
  ctx.moveTo(-1, 4); ctx.lineTo(-11, 2);
  ctx.moveTo(-1, 6); ctx.lineTo(-11, 7);
  ctx.stroke();

  // Mejillas sonrosadas
  ctx.fillStyle = 'rgba(255, 120, 150, 0.35)';
  ctx.beginPath();
  ctx.arc(-6, 4, 2.5, 0, Math.PI * 2);
  ctx.arc(12, 4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Lazo de Luna
  if (colors.bow) {
    ctx.fillStyle = colors.bow;
    ctx.save();
    ctx.translate(-8, -12);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-7, -5); ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(7, -5); ctx.lineTo(7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Pata levantada en la victoria
  if (pose === 'victory') {
    ctx.fillStyle = colors.body;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(16, -30 + Math.sin(time * 10) * 3, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/* ========================== Bola de energía ========================== */

class EnergyBall {
  constructor(x, y, direction) {
    this.w = 16;
    this.h = 16;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.vx = direction * 520;
    this.life = 1.1;
    this.alive = true;
    this.time = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.life -= dt;
    this.x += this.vx * dt;
    // Pequeña ondulación vertical
    this.y += Math.sin(this.time * 25) * 0.6;
    if (Math.random() < 0.6) {
      game.particles.emit(this.x + 8, this.y + 8, {
        count: 1, color: ['#7ef9ff', '#c77dff'], speed: 20, size: 3, life: 0.3, gravity: 0
      });
    }
    const hitsWall = game.level.solids.some((solid) => solid.active && !solid.oneWay && rectsOverlap(this, solid));
    if (hitsWall) this.explode(game);
    if (this.life <= 0) this.alive = false;
  }

  explode(game) {
    this.alive = false;
    game.particles.emit(this.x + 8, this.y + 8, { count: 10, color: ['#7ef9ff', '#c77dff', '#ffffff'], speed: 150, size: 3, life: 0.4 });
  }

  draw(ctx) {
    const cx = this.x + 8;
    const cy = this.y + 8;
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.4, '#7ef9ff');
    glow.addColorStop(1, 'rgba(199, 125, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ============================== Jugador ============================== */

// Valores de movimiento: cambiarlos modifica cómo "se siente" el control
const PLAYER_SETTINGS = {
  WALK_SPEED: 230,
  RUN_SPEED: 330,
  GROUND_ACCELERATION: 1800,
  AIR_ACCELERATION: 1200,
  GROUND_FRICTION: 2200,
  JUMP_VELOCITY: 780,
  JUMP_CUT_MULTIPLIER: 0.45,  // al soltar el salto antes de tiempo, se salta menos
  COYOTE_TIME: 0.1,           // margen para saltar justo después de dejar una plataforma
  JUMP_BUFFER_TIME: 0.12,     // margen para pulsar salto justo antes de aterrizar
  STOMP_BOUNCE: 520,
  MAX_HEALTH: 3,
  INVULNERABLE_TIME: 1.4,
  HURT_TIME: 0.35,
  SHOOT_COOLDOWN: 0.55
};

class Player {
  constructor(x, y) {
    this.w = 26;
    this.h = 32;
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
    this.squash = 1;
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
    this.squash = lerp(this.squash, 1, Math.min(1, dt * 12));

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
      this.vx = Math.sign(this.vx) * Math.max(maxSpeed, Math.abs(this.vx) - 900 * dt);
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
      this.squash = 1.15;
      AudioManager.play('jump');
      game.particles.emit(this.centerX, this.y + this.h, { count: 5, color: '#e8dcc8', speed: 60, size: 3, life: 0.35, gravity: -60 });
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
      game.playerProjectiles.push(new EnergyBall(this.centerX + this.facing * 16, this.y + 14, this.facing));
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

    // Efectos al aterrizar
    if (this.onGround && !wasOnGround) {
      if (fallSpeed > 400) {
        this.squash = 0.75;
        game.particles.emit(this.centerX, this.y + this.h, { count: 6, color: '#e8dcc8', speed: 90, size: 3, life: 0.4, gravity: -40, angle: -Math.PI / 2, spread: Math.PI });
      }
    }
    // Avisamos a la plataforma de que la estamos pisando (las que se derrumban lo necesitan)
    if (this.onGround && this.groundPlatform && this.groundPlatform.onStep) this.groundPlatform.onStep();

    // Animación de las patas
    this.walkCycle += Math.abs(this.vx) * dt * 0.06;
  }

  /** Recibe daño desde una posición (para saber hacia dónde salir despedido). */
  takeDamage(amount, sourceX, game) {
    if (this.invulnerableTimer > 0 || this.dead || this.celebrating) return false;
    this.health -= amount;
    this.invulnerableTimer = PLAYER_SETTINGS.INVULNERABLE_TIME;
    this.hurtTimer = PLAYER_SETTINGS.HURT_TIME;
    const pushDirection = this.centerX < sourceX ? -1 : 1;
    this.vx = pushDirection * 240;
    this.vy = -380;
    this.onGround = false;
    this.groundPlatform = null;
    game.camera.shake(5, 0.2);
    game.particles.emit(this.centerX, this.y + 10, { count: 8, color: ['#ff4f6d', '#ffffff'], speed: 160, size: 3, life: 0.5 });
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
    this.squash = 1.2;
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
    this.vy = fellIntoVoid ? 0 : -650;
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
    if (Math.abs(this.vx) > PLAYER_SETTINGS.WALK_SPEED + 20) return 'run';
    if (Math.abs(this.vx) > 15) return 'walk';
    return 'idle';
  }

  draw(ctx) {
    // Parpadeo mientras somos invulnerables tras recibir daño
    if (this.invulnerableTimer > 0 && !this.dead && Math.floor(this.invulnerableTimer * 15) % 2 === 0) return;

    // Sombra suave en el suelo
    if (this.onGround) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.beginPath();
      ctx.ellipse(this.centerX, this.y + this.h, 15, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCat(ctx, this.centerX, this.y + this.h, {
      style: 'milo',
      facing: this.facing,
      pose: this.pose,
      time: this.time,
      walkCycle: this.walkCycle,
      squash: this.squash
    });
  }
}
