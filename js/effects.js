/* ============================================================
   EFFECTS — reusable particle engine + floating combat text.
   Particle counts scale with Settings.particleQuality.
   Rendered additively ('lighter') for a magical glow.
   ============================================================ */

class Particle {
  constructor(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.life = this.maxLife = o.life || 1;
    this.size = o.size || 4;
    this.endSize = (o.endSize !== undefined) ? o.endSize : this.size * 0.2;
    this.color = o.color || [255, 255, 255];   // [r,g,b]
    this.gravity = o.gravity || 0;
    this.drag = o.drag || 1;
    this.shape = o.shape || 'circle';           // circle | spark | shard | star
    this.spin = o.spin || 0;
    this.angle = o.angle || Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.life -= dt;
    this.vy += this.gravity * dt;
    this.vx *= Math.pow(this.drag, dt * 60);
    this.vy *= Math.pow(this.drag, dt * 60);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    return this.life > 0;
  }

  render(ctx) {
    const t = Math.max(0, this.life / this.maxLife);
    const size = this.endSize + (this.size - this.endSize) * t;
    const [r, g, b] = this.color;
    ctx.globalAlpha = t;
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    switch (this.shape) {
      case 'spark': { // stretched streak along velocity
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        ctx.fillRect(-size * 2.5, -size * 0.4, size * 5, size * 0.8);
        ctx.restore();
        break;
      }
      case 'shard': { // rotating ice crystal
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.6);
        ctx.lineTo(size * 0.6, 0);
        ctx.lineTo(0, size * 1.6);
        ctx.lineTo(-size * 0.6, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'star': { // 4-point sparkle
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rad = (i % 2 === 0) ? size * 1.8 : size * 0.5;
          const a = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      default:
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, size), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() { this.particles = []; }

  get quality() { return Settings.get('particleQuality') || 1; }

  spawn(opts) { this.particles.push(new Particle(opts)); }

  /** Spawn `count * quality` particles from a factory function. */
  emit(count, factory) {
    const n = Math.round(count * this.quality);
    for (let i = 0; i < n; i++) this.spawn(factory(i));
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.update(dt));
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) p.render(ctx);
    ctx.restore();
  }

  clear() { this.particles = []; }

  /* ---------------- Preset emitters ---------------- */

  /** Fire trail puff (call every frame behind a fireball). */
  fireTrail(x, y) {
    this.emit(3, () => ({
      x: x + rand(-6, 6), y: y + rand(-6, 6),
      vx: rand(-30, 30), vy: rand(-50, -10),
      life: rand(0.25, 0.5), size: rand(3, 8),
      color: pick([[255, 140, 30], [255, 90, 20], [255, 200, 60]])
    }));
  }

  /** Fireball explosion. */
  explosion(x, y) {
    this.emit(36, () => {
      const a = Math.random() * Math.PI * 2, sp = rand(60, 380);
      return {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.35, 0.8), size: rand(4, 10), drag: 0.92,
        color: pick([[255, 160, 40], [255, 80, 20], [255, 220, 120], [120, 120, 120]])
      };
    });
  }

  /** Electric sparks along a lightning strike. */
  lightningSparks(x, y) {
    this.emit(20, () => {
      const a = Math.random() * Math.PI * 2, sp = rand(120, 420);
      return {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.15, 0.4), size: rand(2, 4), shape: 'spark', drag: 0.9,
        color: pick([[255, 255, 160], [180, 220, 255], [255, 255, 255]])
      };
    });
  }

  /** Frost trail behind an ice blast. */
  iceTrail(x, y) {
    this.emit(2, () => ({
      x: x + rand(-5, 5), y: y + rand(-5, 5),
      vx: rand(-25, 25), vy: rand(-25, 25),
      life: rand(0.3, 0.7), size: rand(2, 5), shape: 'shard', spin: rand(-6, 6),
      color: pick([[160, 220, 255], [220, 245, 255], [100, 180, 255]])
    }));
  }

  /** Ice impact — shatter of shards. */
  iceShatter(x, y) {
    this.emit(24, () => {
      const a = Math.random() * Math.PI * 2, sp = rand(50, 300);
      return {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.3, 0.7), size: rand(2, 6), shape: 'shard',
        spin: rand(-8, 8), gravity: 300, drag: 0.95,
        color: pick([[170, 225, 255], [235, 250, 255], [110, 190, 255]])
      };
    });
  }

  /** Shield activation shimmer around a wizard. */
  shieldGlow(x, y, radius = 70) {
    this.emit(18, () => {
      const a = Math.random() * Math.PI * 2;
      return {
        x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius,
        vx: Math.cos(a) * 20, vy: Math.sin(a) * 20,
        life: rand(0.4, 0.9), size: rand(2, 5), shape: 'star', spin: 3,
        color: pick([[120, 180, 255], [200, 225, 255], [245, 197, 66]])
      };
    });
  }

  /** Healing sparkles rising around a wizard. */
  heal(x, y) {
    this.emit(22, () => ({
      x: x + rand(-45, 45), y: y + rand(-20, 60),
      vx: rand(-15, 15), vy: rand(-120, -50),
      life: rand(0.5, 1.1), size: rand(2, 5), shape: 'star', spin: 2,
      color: pick([[110, 255, 140], [200, 255, 180], [60, 220, 110]])
    }));
  }

  /** Critical hit — golden starburst. */
  crit(x, y) {
    this.emit(26, () => {
      const a = Math.random() * Math.PI * 2, sp = rand(100, 450);
      return {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.3, 0.7), size: rand(3, 7), shape: 'star',
        spin: rand(-10, 10), drag: 0.9,
        color: pick([[255, 215, 80], [255, 255, 200], [255, 160, 40]])
      };
    });
  }

  /** Victory confetti / fireworks (call repeatedly). */
  victory(w, h) {
    this.emit(4, () => ({
      x: rand(0, w), y: h + 10,
      vx: rand(-40, 40), vy: rand(-500, -280),
      life: rand(1.2, 2.2), size: rand(3, 6), shape: 'star',
      spin: rand(-8, 8), gravity: 220,
      color: pick([[245, 197, 66], [120, 180, 255], [255, 120, 200], [140, 255, 160]])
    }));
  }

  /** Gold star dust trailing the cursor on menu screens. */
  cursorTrail(x, y) {
    this.emit(2, () => ({
      x: x + rand(-4, 4), y: y + rand(-4, 4),
      vx: rand(-25, 25), vy: rand(-40, 10),
      life: rand(0.4, 0.9), size: rand(2, 5), shape: 'star',
      spin: rand(-6, 6), drag: 0.94,
      color: pick([[239, 227, 168], [255, 250, 220], [255, 255, 255]])
    }));
  }

  /** Grand-entry starburst when the main page appears. */
  grandBurst(cx, cy) {
    this.emit(70, () => {
      const a = Math.random() * Math.PI * 2, sp = rand(120, 620);
      return {
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.8, 1.7), size: rand(3, 8), shape: 'star',
        spin: rand(-8, 8), drag: 0.9,
        color: pick([[239, 227, 168], [255, 255, 255], [255, 240, 190], [200, 190, 255]])
      };
    });
  }

  /** Swirling magic portal ring (battle intro). */
  portal(x, y, t) {
    this.emit(3, (i) => {
      const a = t * 4 + i * 2.1;
      const r = 60 + Math.sin(t * 3 + i) * 15;
      return {
        x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.5,
        vx: -Math.sin(a) * 60, vy: Math.cos(a) * 30,
        life: rand(0.3, 0.7), size: rand(2, 5),
        color: pick([[160, 100, 255], [245, 197, 66], [100, 160, 255]])
      };
    });
  }
}

/* ------------------------------------------------------------
   FLOATING COMBAT TEXT — damage numbers, "CRITICAL!", "BLOCKED!"
   ------------------------------------------------------------ */
class FloatingTextSystem {
  constructor() { this.texts = []; }

  add(x, y, text, { color = '#fff', size = 28, life = 1.1 } = {}) {
    this.texts.push({ x, y, text, color, size, life, maxLife: life });
  }

  update(dt) {
    this.texts = this.texts.filter(t => {
      t.life -= dt;
      t.y -= 55 * dt;
      return t.life > 0;
    });
  }

  render(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const a = Math.min(1, t.life / (t.maxLife * 0.4));
      const pop = 1 + Math.max(0, (t.life / t.maxLife) - 0.85) * 4; // pop-in scale
      ctx.globalAlpha = a;
      ctx.font = `800 ${Math.round(t.size * pop * 1.1)}px Manrope, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  clear() { this.texts = []; }
}

/* Tiny shared helpers used across rendering code. */
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

window.Particle = Particle;
window.ParticleSystem = ParticleSystem;
window.FloatingTextSystem = FloatingTextSystem;
window.rand = rand;
window.pick = pick;
