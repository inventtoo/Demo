/* =====================================================================
   enemies.js - Enemigos y jefe final
   ---------------------------------------------------------------------
   Todos los enemigos heredan de la clase Enemy, que guarda la posición,
   la vida y la lógica común (recibir daño, morir, caminar patrullando).
   Cada tipo de enemigo solo define su comportamiento (update) y qué
   fotograma de pixel art mostrar (currentSprite). Los dibujos están en
   sprites.js.

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
    this.flashTimer = 0;       // destello blanco al recibir daño
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
      this.vx = -this.facing * 36;
      AudioManager.play('enemyHit');
    }
    return true;
  }

  die(source) {
    this.dying = true;
    this.deathStyle = source === 'stomp' ? 'squash' : 'flip';
    this.deathTimer = source === 'stomp' ? 0.45 : 1.2;
    this.vy = -228;
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

  /** Sprite que corresponde al fotograma actual (lo define cada enemigo). */
  get currentSprite() { return null; }

  /**
   * Dibuja el sprite actual apoyado en el borde inferior del enemigo.
   * Los sprites miran a la derecha; si el enemigo mira a la izquierda se voltean.
   */
  draw(ctx) {
    const sprite = this.currentSprite;
    if (!sprite) return;
    const flip = this.facing < 0;
    const footX = Math.round(this.centerX);
    const footY = Math.round(this.y + this.h);

    if (this.dying && this.deathStyle === 'squash') {
      // Aplastado: el sprite se dibuja con la mitad de altura y parpadea
      if (Math.floor(this.deathTimer * 20) % 2 === 0) return;
      const height = Math.max(2, Math.round(sprite.height * 0.45));
      const anchorX = flip ? sprite.width - sprite.anchorX : sprite.anchorX;
      ctx.drawImage(flip ? sprite.getFlipped() : sprite.image, footX - anchorX, footY - height, sprite.width, height);
      return;
    }
    if (this.dying) {
      // Derrotado por un proyectil: boca abajo mientras cae
      ctx.save();
      ctx.translate(footX, footY - Math.round(sprite.height / 2));
      ctx.scale(1, -1);
      sprite.draw(ctx, 0, Math.round(sprite.height / 2), flip);
      ctx.restore();
      return;
    }
    if (this.flashTimer > 0 && Math.floor(this.flashTimer * 30) % 2 === 0) {
      sprite.drawSilhouette(ctx, footX, footY, flip);
      return;
    }
    sprite.draw(ctx, footX, footY, flip);
  }

  update() {}
}

/* ============================== Slime ============================== */

class Slime extends Enemy {
  constructor(x, y) {
    super(x, y, 18, 13);
    this.speed = 27;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;
    this.walk(dt, game.level, this.speed);
  }

  // Se aplasta y se estira como una gelatina
  get currentSprite() { return SPRITES.slime[[0, 1, 0, 2][Math.floor(this.time * 6) % 4]]; }
}

/* =========================== Seta andante =========================== */

class Mushroom extends Enemy {
  constructor(x, y) {
    super(x, y, 16, 18);
    this.speed = 42;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;
    this.walk(dt, game.level, this.speed);
  }

  get currentSprite() { return SPRITES.mushroom[Math.floor(this.time * 8) % 2]; }
}

/* ============================ Murciélago ============================ */

class Bat extends Enemy {
  constructor(x, y) {
    super(x, y, 18, 12);
    this.homeX = x;
    this.homeY = y;
    this.chaseSpeed = 75;
    this.detectRange = 150;
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
      targetY = player.y - 2;
      speed = this.chaseSpeed;
    } else {
      // Vuelo tranquilo alrededor de su posición inicial
      targetX = this.homeX + Math.sin(this.time * 0.9) * 48;
      targetY = this.homeY + Math.sin(this.time * 2.3) * 10;
      speed = 48;
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
    if (Math.abs(this.vx) > 5) this.facing = Math.sign(this.vx);
  }

  // Aleteo: arriba, medio, abajo, medio
  get currentSprite() { return SPRITES.bat[[0, 1, 2, 1][Math.floor(this.time * 12) % 4]]; }
}

/* ============================= Fantasma ============================= */

class Ghost extends Bat {
  constructor(x, y) {
    super(x, y);
    this.w = 15;
    this.h = 15;
    this.chaseSpeed = 60;
    this.detectRange = 180;
  }

  get currentSprite() { return SPRITES.ghost[Math.floor(this.time * 5) % 2]; }

  draw(ctx) {
    // Semitransparente y flotando arriba y abajo
    ctx.save();
    ctx.globalAlpha = 0.85;
    const bob = Math.round(Math.sin(this.time * 4));
    ctx.translate(0, bob);
    super.draw(ctx);
    ctx.restore();
  }
}

/* ============================== Jabalí ============================== */

class Boar extends Enemy {
  constructor(x, y) {
    super(x, y, 26, 18);
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
      this.walk(dt, level, 24);
      const horizontalDistance = Math.abs(player.x + player.w / 2 - this.centerX);
      const verticalDistance = Math.abs(player.y + player.h - (this.y + this.h));
      if (!player.dead && horizontalDistance < 144 && verticalDistance < 30) {
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
      const result = this.walk(dt, level, 138, true);
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

    if ((this.state === 'charge' || this.state === 'windup') && Math.random() < 0.3) {
      game.particles.emit(this.centerX - this.facing * 12, this.y + this.h - 1, {
        count: 1, color: ['#c9b79c', '#8a7a64'], speed: 36, size: 2, life: 0.4, gravity: -30
      });
    }
  }

  get currentSprite() {
    if (this.state === 'charge') return SPRITES.boar.charge[Math.floor(this.time * 14) % 2];
    if (this.state === 'windup') return SPRITES.boar.charge[Math.floor(this.time * 20) % 2];
    if (this.state === 'rest') return SPRITES.boar.walk[0];
    return SPRITES.boar.walk[Math.floor(this.time * 6) % 2];
  }
}

/* ============================= Caballero ============================= */

class Knight extends Enemy {
  constructor(x, y) {
    super(x, y, 18, 26);
    this.hp = 2;
  }

  update(dt, game) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.updateDying(dt)) return;

    const player = game.player;
    const horizontalDistance = Math.abs(player.x + player.w / 2 - this.centerX);
    const verticalDistance = Math.abs(player.y + player.h - (this.y + this.h));
    const isChasing = !player.dead && horizontalDistance < 138 && verticalDistance < 42;

    if (isChasing) {
      this.facePlayer(player);
      this.walk(dt, game.level, 57, true);
    } else {
      this.walk(dt, game.level, 27);
    }
    this.chasing = isChasing;
  }

  // Tras el primer golpe pierde el penacho y la armadura se oscurece
  get currentSprite() {
    const frames = this.hp > 1 ? SPRITES.knight.walk : SPRITES.knight.damaged;
    return frames[Math.floor(this.time * (this.chasing ? 9 : 5)) % 2];
  }
}

/* ===================== Proyectiles del jefe ===================== */

/** Bola de fuego mágica lanzada por el Rey Rata. */
class BossFireball {
  constructor(x, y, vx, vy) {
    this.x = x - 5;
    this.y = y - 5;
    this.w = 10;
    this.h = 10;
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
      game.particles.emit(this.x + 5, this.y + 5, {
        count: 1, color: ['#b5179e', '#7ef9a0'], speed: 18, size: 2, life: 0.35, gravity: 0
      });
    }
    const hitsWall = game.level.bossSolids.some((solid) => solid.active && rectsOverlap(this, solid));
    if (this.life <= 0 || hitsWall) {
      this.alive = false;
      game.particles.emit(this.x + 5, this.y + 5, { count: 8, color: ['#b5179e', '#e0aaff'], speed: 72, size: 2, life: 0.4 });
    }
  }

  draw(ctx) {
    SPRITES.fireball[Math.floor(this.time * 12) % 2].draw(ctx, this.x + 5, this.y + 5);
  }
}

/** Onda expansiva que recorre el suelo cuando el jefe aterriza. */
class Shockwave {
  constructor(x, floorY, direction) {
    this.w = 14;
    this.h = 16;
    this.x = x - this.w / 2;
    this.y = floorY - this.h;
    this.vx = direction * 198;
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
    SPRITES.shockwave[Math.floor(this.time * 14) % 2].draw(ctx, this.x + this.w / 2, this.y + this.h, this.vx < 0);
  }
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
    super(x, y, 46, 58);
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
          count: 3, color: ['#ffd23f', '#ffffff', '#9d4edd'], speed: 96, size: 3, life: 0.6
        });
      }
      if (this.stateTimer <= 0 && !this.defeatHandled) {
        this.defeatHandled = true;
        this.alive = false;
        game.particles.emit(this.centerX, this.centerY, {
          count: 40, color: ['#ffd23f', '#9d4edd', '#ffffff', '#6d6a85'], speed: 230, size: 4, life: 1.2
        });
        game.particles.emit(this.centerX, this.centerY, { count: 10, speed: 160, life: 1.4, shape: 'star', gravity: 200 });
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
        this.vx = this.facing * 48 * speedFactor;
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
        this.vx = this.facing * 258 * speedFactor;
        if (Math.random() < 0.5) {
          game.particles.emit(this.centerX - this.facing * 18, this.y + this.h - 1, {
            count: 1, color: ['#9b8fb0', '#6d6a85'], speed: 48, size: 3, life: 0.5, gravity: -24
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
          this.vy = -570;
          this.vx = clamp(distanceToPlayer / 0.95, -252, 252);
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
      game.camera.shake(5, 0.5);
      AudioManager.play('bossSlam');
      game.particles.emit(this.centerX + this.facing * 24, this.centerY, {
        count: 20, color: ['#9b8fb0', '#ffffff', '#5a5470'], speed: 150, size: 3, life: 0.6
      });
      this.setState('tired', 2.6);
    }

    // Al aterrizar de un salto, crea dos ondas expansivas
    if (this.state === 'jump' && this.leftGround && this.onGround) {
      this.vx = 0;
      const floorY = this.y + this.h;
      game.enemyProjectiles.push(new Shockwave(this.centerX - 24, floorY, -1));
      game.enemyProjectiles.push(new Shockwave(this.centerX + 24, floorY, 1));
      game.camera.shake(6, 0.45);
      AudioManager.play('bossSlam');
      game.particles.emit(this.centerX, floorY, { count: 24, color: ['#9b8fb0', '#d6d1e6'], speed: 132, size: 3, life: 0.6, angle: -Math.PI / 2, spread: Math.PI });
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

  /** Lanza un abanico de bolas de fuego dirigidas al jugador desde el orbe del báculo. */
  shootFireballs(game) {
    const player = game.player;
    const originX = this.centerX + this.facing * 20;
    const originY = this.y - 8;
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const baseAngle = Math.atan2(targetY - originY, targetX - originX);
    const count = this.phase === 2 ? 5 : 3;
    const spread = 0.26;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      game.enemyProjectiles.push(new BossFireball(originX, originY, Math.cos(angle) * 162, Math.sin(angle) * 162));
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
    game.camera.shake(3, 0.25);
    if (this.hp <= 0) {
      this.setState('defeated', 2.4);
      this.dying = true;
      AudioManager.stopMusic();
    }
    return true;
  }

  get currentSprite() {
    const frames = SPRITES.ratKing;
    const pick = (list, speed) => list[Math.floor(this.time * speed) % list.length];
    switch (this.state) {
      case 'shootWindup': return pick(frames.windup, 10);
      case 'charge': return pick(frames.charge, 12);
      case 'chargeWindup':
      case 'jumpWindup': return frames.crouch[0];
      case 'jump': return this.vy < 0 ? frames.walk[1] : frames.crouch[0];
      case 'tired': return pick(frames.tired, 3);
      case 'walk': return pick(frames.walk, 5);
      case 'defeated': return frames.tired[0];
      default: return pick(frames.idle, 2);
    }
  }

  draw(ctx) {
    const sprite = this.currentSprite;
    const flip = this.facing < 0;
    let shakeX = 0;
    if (this.state === 'chargeWindup' || this.state === 'defeated') shakeX = Math.round(Math.sin(this.time * 70) * 2);
    const footX = Math.round(this.centerX) + shakeX;
    const footY = Math.round(this.y + this.h);
    if (this.flashTimer > 0 && Math.floor(this.flashTimer * 30) % 2 === 0) sprite.drawSilhouette(ctx, footX, footY, flip);
    else sprite.draw(ctx, footX, footY, flip);

    // Estrellitas girando sobre la cabeza cuando está mareado
    if (this.state === 'tired') {
      const headX = footX + (flip ? -6 : 6);
      const headY = footY - 76;
      for (let i = 0; i < 3; i++) {
        const angle = this.time * 4 + (i * Math.PI * 2) / 3;
        SPRITES.icons.star.draw(ctx, Math.round(headX + Math.cos(angle) * 16) - 3, Math.round(headY + Math.sin(angle) * 4));
      }
    }
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
