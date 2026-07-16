/* ============================================================
   BACKGROUNDS — fully procedural animated scenes (Canvas 2D).
   Each background exposes draw(ctx, W, H, t) where t = seconds.
   Static layout elements are randomized once in the constructor
   so every match looks slightly different.
   ============================================================ */

/** Shared starfield helper. */
function drawStars(ctx, stars, W, H, t) {
  for (const s of stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = 0.25 + 0.6 * tw;
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x * W, s.y * H, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function makeStars(n) {
  return Array.from({ length: n }, () => ({
    x: Math.random(), y: Math.random() * 0.7,
    size: rand(1, 2.5), speed: rand(0.5, 2), phase: rand(0, 6.28)
  }));
}

/* ---------------- MAIN MENU: deep space (Stardance style) ----------------
   If assets/backgrounds/menu.png exists it is used as the backdrop
   (drawn pixel-crisp, cover-cropped). Otherwise: a quiet starfield
   with soft nebula streaks and twinkling gold four-point sparkles. */
class MenuBackground {
  constructor() {
    this.name = 'Deep Space';
    // Optional real background image (drop the file in, refresh — done)
    this.image = new Image();
    this.imageReady = false;
    this.image.onload = () => { this.imageReady = true; };
    this.image.src = 'assets/backgrounds/menu.png';

    this.stars = Array.from({ length: 130 }, () => ({
      x: Math.random(), y: Math.random(),
      size: rand(0.8, 2.2), speed: rand(0.4, 1.8), phase: rand(0, 6.28)
    }));
    // Gold four-point sparkles
    this.sparkles = Array.from({ length: 9 }, () => ({
      x: rand(0.05, 0.95), y: rand(0.06, 0.9),
      size: rand(6, 16), speed: rand(0.6, 1.4), phase: rand(0, 6.28)
    }));
    // Soft nebula blobs, drifting extremely slowly
    this.nebulas = Array.from({ length: 5 }, () => ({
      x: Math.random(), y: Math.random(), r: rand(0.25, 0.5),
      hue: pick([[120, 90, 200], [90, 70, 160], [150, 90, 170]]),
      drift: rand(0.002, 0.006), phase: rand(0, 6.28)
    }));
  }

  /** One four-point star, Stardance style. */
  _sparkle(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#efe3a8';
    ctx.shadowColor = '#efe3a8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.14, -size * 0.14, size, 0);
    ctx.quadraticCurveTo(size * 0.14, size * 0.14, 0, size);
    ctx.quadraticCurveTo(-size * 0.14, size * 0.14, -size, 0);
    ctx.quadraticCurveTo(-size * 0.14, -size * 0.14, 0, -size);
    ctx.fill();
    ctx.restore();
  }

  draw(ctx, W, H, t) {
    // Real background image (cover-cropped, crisp pixels)
    if (this.imageReady) {
      const iw = this.image.width, ih = this.image.height;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.image, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
      return;
    }

    // Deep space base
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#120e1b');
    sky.addColorStop(0.5, '#17131f');
    sky.addColorStop(1, '#1c1526');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Faint nebula streaks
    for (const n of this.nebulas) {
      const nx = ((n.x + t * n.drift) % 1.4 - 0.2) * W;
      const ny = n.y * H + Math.sin(t * 0.1 + n.phase) * 20;
      const r = n.r * Math.max(W, H);
      const [cr, cg, cb] = n.hue;
      const g = ctx.createRadialGradient(nx, ny, r * 0.1, nx, ny, r);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},0.07)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill();
    }

    // Thin elegant arc lines (like the Stardance connector strokes)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-40, H * 0.28);
    ctx.bezierCurveTo(W * 0.3, H * 0.12, W * 0.6, H * 0.34, W + 40, H * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-40, H * 0.78);
    ctx.bezierCurveTo(W * 0.35, H * 0.92, W * 0.7, H * 0.7, W + 40, H * 0.86);
    ctx.stroke();

    // Starfield
    drawStars(ctx, this.stars, W, H, t);

    // Twinkling gold sparkles
    for (const s of this.sparkles) {
      const a = 0.35 + 0.6 * Math.max(0, Math.sin(t * s.speed + s.phase));
      const size = s.size * (0.85 + 0.2 * Math.sin(t * s.speed * 1.7 + s.phase));
      this._sparkle(ctx, s.x * W, s.y * H, size, a);
    }
  }
}

/* ---------------- ARENA: Wizard Academy ---------------- */
class WizardAcademy {
  constructor() {
    this.name = 'Wizard Academy';
    this.candles = Array.from({ length: 7 }, (_, i) => ({
      x: 0.08 + i * 0.14, phase: rand(0, 6.28)
    }));
  }

  draw(ctx, W, H, t) {
    const groundY = H * 0.8;
    // Hall wall
    const wall = ctx.createLinearGradient(0, 0, 0, groundY);
    wall.addColorStop(0, '#171225'); wall.addColorStop(1, '#2c2440');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, groundY);

    // Arched windows with moonlight
    for (let i = 0; i < 4; i++) {
      const wx = W * (0.14 + i * 0.24), wy = H * 0.16, ww = W * 0.07, wh = H * 0.3;
      ctx.fillStyle = 'rgba(120,150,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(wx, wy + wh);
      ctx.lineTo(wx, wy + ww);
      ctx.arc(wx + ww / 2, wy + ww, ww / 2, Math.PI, 0);
      ctx.lineTo(wx + ww, wy + wh);
      ctx.closePath(); ctx.fill();
    }

    // Stone floor with perspective joints
    const floor = ctx.createLinearGradient(0, groundY, 0, H);
    floor.addColorStop(0, '#4a4258'); floor.addColorStop(1, '#241e30');
    ctx.fillStyle = floor; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * W;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(W / 2 + (x - W / 2) * 1.8, H);
      ctx.stroke();
    }

    // Glowing spell circle at center of the floor
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    ctx.save();
    ctx.translate(W / 2, groundY + (H - groundY) * 0.45);
    ctx.scale(1, 0.32);
    ctx.strokeStyle = `rgba(245,197,66,${0.35 + 0.3 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, W * 0.13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, W * 0.09, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.rotate(t * 0.4);
    ctx.beginPath(); // rotating triangle rune
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * W * 0.09, Math.sin(a) * W * 0.09);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Candles with flickering flames
    for (const c of this.candles) {
      const cx = c.x * W, cy = groundY - 46;
      ctx.fillStyle = '#d8cfc0';
      ctx.fillRect(cx - 4, cy, 8, 40);
      const flick = Math.sin(t * 11 + c.phase) * 2;
      const glow = ctx.createRadialGradient(cx, cy - 8, 2, cx, cy - 8, 26);
      glow.addColorStop(0, 'rgba(255,190,80,0.8)'); glow.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy - 8, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.ellipse(cx + flick * 0.4, cy - 10, 4, 8 + flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ---------------- ARENA: Enchanted Forest ---------------- */
class EnchantedForest {
  constructor() {
    this.name = 'Enchanted Forest';
    this.trees = Array.from({ length: 5 }, (_, i) => ({
      x: 0.05 + i * 0.22 + rand(-0.03, 0.03), w: rand(0.05, 0.09), glow: rand(0, 6.28)
    }));
    this.shrooms = Array.from({ length: 9 }, () => ({
      x: Math.random(), size: rand(8, 20), hue: pick([[120, 255, 190], [190, 130, 255], [110, 200, 255]])
    }));
    this.fireflies = Array.from({ length: 22 }, () => ({
      x: Math.random(), y: rand(0.3, 0.75), r: rand(20, 70), speed: rand(0.3, 1), phase: rand(0, 6.28)
    }));
  }

  draw(ctx, W, H, t) {
    const groundY = H * 0.8;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#02140c'); sky.addColorStop(0.7, '#07301c'); sky.addColorStop(1, '#0b3d22');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Giant glowing trees
    for (const tr of this.trees) {
      const tx = tr.x * W, tw = tr.w * W;
      ctx.fillStyle = '#04180d';
      ctx.fillRect(tx, H * 0.18, tw, groundY - H * 0.18);
      // Root flare
      ctx.beginPath();
      ctx.moveTo(tx - tw * 0.5, groundY);
      ctx.quadraticCurveTo(tx + tw * 0.5, groundY - tw, tx + tw * 1.5, groundY);
      ctx.closePath(); ctx.fill();
      // Bioluminescent canopy
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + tr.glow);
      const cg = ctx.createRadialGradient(tx + tw / 2, H * 0.16, 10, tx + tw / 2, H * 0.16, tw * 2.6);
      cg.addColorStop(0, `rgba(90,255,170,${0.35 + 0.25 * pulse})`);
      cg.addColorStop(1, 'rgba(90,255,170,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(tx + tw / 2, H * 0.16, tw * 2.6, 0, Math.PI * 2); ctx.fill();
    }

    // Mossy ground
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, '#12522e'); g.addColorStop(1, '#04180d');
    ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);

    // Glowing mushrooms
    for (const m of this.shrooms) {
      const mx = m.x * W, my = groundY + 12;
      const [r, gg, b] = m.hue;
      ctx.fillStyle = '#cfc4ae';
      ctx.fillRect(mx - m.size * 0.14, my - m.size * 0.55, m.size * 0.28, m.size * 0.55);
      ctx.shadowColor = `rgb(${r},${gg},${b})`; ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(${r},${gg},${b},0.9)`;
      ctx.beginPath();
      ctx.ellipse(mx, my - m.size * 0.55, m.size * 0.6, m.size * 0.38, 0, Math.PI, 0);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Wandering fireflies
    for (const f of this.fireflies) {
      const fx = f.x * W + Math.cos(t * f.speed + f.phase) * f.r;
      const fy = f.y * H + Math.sin(t * f.speed * 1.4 + f.phase) * f.r * 0.5;
      const a = 0.35 + 0.55 * Math.sin(t * 3 + f.phase);
      ctx.fillStyle = `rgba(220,255,140,${Math.max(0, a)})`;
      ctx.shadowColor = '#dcff8c'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

/* ---------------- ARENA: Crystal Cave ---------------- */
class CrystalCave {
  constructor() {
    this.name = 'Crystal Cave';
    this.crystals = Array.from({ length: 12 }, () => ({
      x: Math.random(), size: rand(30, 110), tilt: rand(-0.5, 0.5),
      up: Math.random() > 0.4, phase: rand(0, 6.28)
    }));
    this.sparkles = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(), phase: rand(0, 6.28), speed: rand(1, 3)
    }));
  }

  drawCrystal(ctx, x, y, size, tilt, up, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const dir = up ? -1 : 1;
    const grad = ctx.createLinearGradient(0, 0, 0, dir * size);
    grad.addColorStop(0, `rgba(70,120,220,${0.9 * glow})`);
    grad.addColorStop(1, `rgba(160,220,255,${glow})`);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 22 * glow;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, 0);
    ctx.lineTo(-size * 0.14, dir * size * 0.75);
    ctx.lineTo(0, dir * size);
    ctx.lineTo(size * 0.16, dir * size * 0.7);
    ctx.lineTo(size * 0.3, 0);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  draw(ctx, W, H, t) {
    const groundY = H * 0.8;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#020618'); bg.addColorStop(0.55, '#0a1436'); bg.addColorStop(1, '#12234f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Cave ceiling silhouette
    ctx.fillStyle = '#01030c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= 10; i++) {
      ctx.lineTo((i / 10) * W, (i % 2 === 0 ? 0.06 : 0.16) * H);
    }
    ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();

    // Rocky floor
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, '#1b2c5e'); g.addColorStop(1, '#060a1e');
    ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);

    // Pulsing crystal clusters (floor + ceiling)
    for (const c of this.crystals) {
      const glow = 0.55 + 0.45 * Math.sin(t * 1.4 + c.phase);
      const x = c.x * W;
      const y = c.up ? groundY + 10 : H * (c.x % 0.5 > 0.2 ? 0.12 : 0.06);
      this.drawCrystal(ctx, x, y, c.size, c.tilt, c.up, glow);
    }

    // Air sparkles
    for (const s of this.sparkles) {
      const a = Math.max(0, Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = `rgba(170,225,255,${a * 0.8})`;
      const x = s.x * W, y = s.y * H * 0.75;
      ctx.fillRect(x - 1, y - 4, 2, 8);
      ctx.fillRect(x - 4, y - 1, 8, 2);
    }
  }
}

/* ---------------- ARENA: Ancient Ruins ---------------- */
class AncientRuins {
  constructor() {
    this.name = 'Ancient Ruins';
    this.rocks = Array.from({ length: 7 }, () => ({
      x: Math.random(), y: rand(0.12, 0.5), size: rand(20, 60),
      bobSpeed: rand(0.4, 1), phase: rand(0, 6.28)
    }));
    this.runes = Array.from({ length: 6 }, (_, i) => ({
      x: 0.12 + i * 0.15, glyph: pick(['ᚠ', 'ᚹ', 'ᛟ', 'ᛝ', 'ᚱ', 'ᛞ', 'ᛉ']), phase: rand(0, 6.28)
    }));
    this.stars = makeStars(50);
  }

  draw(ctx, W, H, t) {
    const groundY = H * 0.8;
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#1a0a2e'); sky.addColorStop(0.6, '#3d1d54'); sky.addColorStop(1, '#7a3a5e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
    drawStars(ctx, this.stars, W, H * 0.6, t);

    // Broken columns
    for (const [cx, ch] of [[0.12, 0.34], [0.3, 0.2], [0.7, 0.26], [0.88, 0.38]]) {
      const x = cx * W, h = ch * H, w = W * 0.035;
      ctx.fillStyle = '#241a38';
      ctx.fillRect(x - w / 2, groundY - h, w, h);
      ctx.fillRect(x - w * 0.75, groundY - h, w * 1.5, h * 0.08); // capital
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x - w / 2, groundY - h, w * 0.3, h);
    }

    // Floating rocks with rune glow
    for (const r of this.rocks) {
      const bob = Math.sin(t * r.bobSpeed + r.phase) * 12;
      const x = r.x * W, y = r.y * H + bob;
      ctx.fillStyle = '#2c2244';
      ctx.beginPath();
      ctx.moveTo(x - r.size, y);
      ctx.lineTo(x - r.size * 0.4, y - r.size * 0.55);
      ctx.lineTo(x + r.size * 0.6, y - r.size * 0.45);
      ctx.lineTo(x + r.size, y + r.size * 0.15);
      ctx.lineTo(x, y + r.size * 0.7);
      ctx.closePath(); ctx.fill();
      const a = 0.4 + 0.4 * Math.sin(t * 2 + r.phase);
      ctx.fillStyle = `rgba(120,240,200,${a})`;
      ctx.shadowColor = '#78f0c8'; ctx.shadowBlur = 10;
      ctx.font = `${r.size * 0.5}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ᛝ', x, y + r.size * 0.15);
      ctx.shadowBlur = 0;
    }

    // Cracked ground
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, '#3a2c52'); g.addColorStop(1, '#160e24');
    ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);

    // Glowing ground runes
    ctx.textAlign = 'center';
    for (const rn of this.runes) {
      const a = 0.35 + 0.45 * Math.sin(t * 1.8 + rn.phase);
      ctx.fillStyle = `rgba(120,240,200,${Math.max(0.1, a)})`;
      ctx.shadowColor = '#78f0c8'; ctx.shadowBlur = 12;
      ctx.font = `${H * 0.045}px serif`;
      ctx.fillText(rn.glyph, rn.x * W, groundY + (H - groundY) * 0.55);
    }
    ctx.shadowBlur = 0;
  }
}

/* ---------------- Registry ---------------- */
class Backgrounds {
  static ARENAS = [WizardAcademy, EnchantedForest, CrystalCave, AncientRuins];

  /** Random battle arena (avoids repeating the saved last one when possible). */
  static randomArena() {
    const last = Settings.get('lastArena');
    let pool = Backgrounds.ARENAS;
    if (last && pool.length > 1) {
      const filtered = pool.filter(A => A.name !== last);
      if (filtered.length) pool = filtered;
    }
    const ArenaClass = pool[Math.floor(Math.random() * pool.length)];
    Settings.set('lastArena', ArenaClass.name);
    return new ArenaClass();
  }
}

window.MenuBackground = MenuBackground;
window.Backgrounds = Backgrounds;
