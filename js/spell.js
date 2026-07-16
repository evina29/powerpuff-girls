/* ============================================================
   SPELLS — definitions, projectiles and beams.
   The five duel spells. Data-driven so adding a spell means
   adding one registry entry (and a keyboard/wand binding).
   ============================================================ */

class Spell {
  // `icon` is an IconFactory pixel-art icon id (see js/icons.js)
  static REGISTRY = {
    FIREBALL:  { id: 'FIREBALL',  name: 'Fireball',  icon: 'fire', damage: 20, cooldown: 3.0,
                 type: 'projectile', speed: 560, sound: 'fireball', color: '#ff8c1e' },
    LIGHTNING: { id: 'LIGHTNING', name: 'Lightning', icon: 'lightning', damage: 15, cooldown: 2.5,
                 type: 'beam', sound: 'lightning', color: '#ffe94a' },
    ICE:       { id: 'ICE',       name: 'Ice Blast', icon: 'ice', damage: 12, cooldown: 2.0,
                 type: 'projectile', speed: 430, applies: 'slow', sound: 'ice', color: '#7fd4ff' },
    SHIELD:    { id: 'SHIELD',    name: 'Shield',    icon: 'shield', cooldown: 5.0,
                 type: 'self', sound: 'shield', color: '#4a7dff' },
    HEAL:      { id: 'HEAL',      name: 'Heal',      icon: 'heal', heal: 15, cooldown: 6.0,
                 type: 'self', sound: 'heal', color: '#2eff8b' }
  };

  static get(id) { return Spell.REGISTRY[id]; }
  static list() { return Object.values(Spell.REGISTRY); }
}

/* ------------------------------------------------------------
   PROJECTILE — fireball / ice blast flying across the arena.
   ------------------------------------------------------------ */
class Projectile {
  constructor(spell, caster, target) {
    this.spell = spell;
    this.caster = caster;
    this.target = target;
    this.x = caster.x + caster.facing * 55;
    this.y = caster.y - 60; // staff height
    this.dir = caster.facing;
    this.dead = false;
    this.age = 0;
    this.wobblePhase = Math.random() * Math.PI * 2;
  }

  /** Returns true when the projectile reaches its target. */
  update(dt, battle) {
    this.age += dt;
    this.x += this.spell.speed * this.dir * dt;
    // Slight magical wobble
    this.y = (this.target.y - 60) +
      Math.sin(this.age * 9 + this.wobblePhase) * 7 +
      (this.caster.y - 60 - (this.target.y - 60)) * Math.max(0, 1 - this.age * 2);

    // Trail particles
    if (this.spell.id === 'FIREBALL') battle.particles.fireTrail(this.x, this.y);
    else if (this.spell.id === 'ICE') battle.particles.iceTrail(this.x, this.y);

    // Collision with target wizard
    if (Math.abs(this.x - this.target.x) < 42 && !this.dead) {
      this.dead = true;
      return true;
    }
    // Flew off screen
    if (this.x < -80 || this.x > battle.W + 80) this.dead = true;
    return false;
  }

  render(ctx) {
    ctx.save();
    if (this.spell.id === 'FIREBALL') {
      // Blazing orb with hot core
      const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 22);
      grad.addColorStop(0, '#fff7d0');
      grad.addColorStop(0.35, '#ffb03a');
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, Math.PI * 2); ctx.fill();
    } else { // ICE — spinning crystal shard
      ctx.translate(this.x, this.y);
      ctx.rotate(this.age * 10 * this.dir);
      ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#bfeaff';
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(0, 7); ctx.lineTo(-16, 0); ctx.lineTo(0, -7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e9f8ff';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------
   BEAM — instant lightning strike (jagged polyline, brief life).
   Damage lands shortly after the flash starts.
   ------------------------------------------------------------ */
class Beam {
  static DURATION = 0.35;
  static HIT_DELAY = 0.12;

  constructor(spell, caster, target) {
    this.spell = spell;
    this.caster = caster;
    this.target = target;
    this.age = 0;
    this.hitDone = false;
    this.dead = false;
    this.segments = this._jag();
  }

  /** Build a jagged path from caster's staff to the target. */
  _jag() {
    const x1 = this.caster.x + this.caster.facing * 55, y1 = this.caster.y - 70;
    const x2 = this.target.x, y2 = this.target.y - 55;
    const pts = [[x1, y1]];
    const steps = 9;
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      pts.push([
        x1 + (x2 - x1) * f + rand(-26, 26),
        y1 + (y2 - y1) * f + rand(-30, 30)
      ]);
    }
    pts.push([x2, y2]);
    return pts;
  }

  /** Returns true on the frame damage should be applied. */
  update(dt) {
    this.age += dt;
    if (this.age > Beam.DURATION) this.dead = true;
    // Re-jag every few frames for a crackling look
    if (Math.random() < 0.4) this.segments = this._jag();
    if (!this.hitDone && this.age >= Beam.HIT_DELAY) {
      this.hitDone = true;
      return true;
    }
    return false;
  }

  render(ctx) {
    const alpha = Math.max(0, 1 - this.age / Beam.DURATION);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    // Outer glow pass, then hot white core
    for (const [width, color] of [[9, `rgba(120,160,255,${alpha * 0.5})`],
                                   [4, `rgba(255,240,150,${alpha * 0.9})`],
                                   [1.5, `rgba(255,255,255,${alpha})`]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < this.segments.length; i++) {
        const [x, y] = this.segments[i];
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

window.Spell = Spell;
window.Projectile = Projectile;
window.Beam = Beam;
