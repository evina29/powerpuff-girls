/* ============================================================
   PLAYER — one duelling wizard (human or AI).
   Owns health, cooldowns, status effects, per-match stats and
   its own rendering (robe + circular portrait head + staff).
   ============================================================ */

class Player {
  static MAX_HP = 100;
  static SLOW_DURATION = 4;      // seconds
  static SLOW_FACTOR = 0.55;     // cooldown recovery speed while slowed
  static SHIELD_DURATION = 6;    // shield expires if unused

  /**
   * @param {number} index 1 or 2
   * @param {string} name display name
   * @param {string} portraitURL dataURL of circular portrait
   * @param {boolean} isAI
   */
  constructor(index, name, portraitURL, isAI = false) {
    this.index = index;
    this.name = name;
    this.isAI = isAI;
    this.portraitURL = portraitURL;
    this.portraitImg = new Image();
    this.portraitImg.src = portraitURL;

    this.hp = Player.MAX_HP;
    this.cooldowns = {};                  // spellId -> seconds remaining
    for (const s of Spell.list()) this.cooldowns[s.id] = 0;

    this.shieldActive = false;
    this.shieldTime = 0;
    this.slowTime = 0;

    // Battle placement (set by Battle)
    this.x = 0; this.y = 0;
    this.facing = 1;                      // 1 → right, -1 → left

    // Animation state
    this.castAnim = 0;                    // lunge on cast
    this.hitAnim = 0;                     // white flash on damage
    this.bobPhase = Math.random() * Math.PI * 2;

    // Per-match statistics
    this.matchStats = {
      damageDealt: 0, damageReceived: 0, spellsCast: 0,
      spellCasts: {}, spellDamage: {}
    };
  }

  get alive() { return this.hp > 0; }
  get slowed() { return this.slowTime > 0; }

  /** Is this spell off cooldown? */
  isReady(spellId) { return (this.cooldowns[spellId] || 0) <= 0; }

  /** Start a spell's cooldown and record the cast. */
  startCooldown(spell) {
    this.cooldowns[spell.id] = spell.cooldown;
    this.matchStats.spellsCast++;
    this.matchStats.spellCasts[spell.id] = (this.matchStats.spellCasts[spell.id] || 0) + 1;
    this.castAnim = 0.25;
  }

  /** Apply incoming damage. Returns actual damage taken (0 if blocked). */
  takeDamage(amount, attacker, spellId) {
    if (this.shieldActive) {
      this.shieldActive = false;      // shield absorbs exactly one attack
      this.shieldTime = 0;
      return 0;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hitAnim = 0.3;
    this.matchStats.damageReceived += amount;
    if (attacker) {
      attacker.matchStats.damageDealt += amount;
      attacker.matchStats.spellDamage[spellId] =
        (attacker.matchStats.spellDamage[spellId] || 0) + amount;
    }
    return amount;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(Player.MAX_HP, this.hp + amount);
    return this.hp - before;
  }

  activateShield() {
    this.shieldActive = true;
    this.shieldTime = Player.SHIELD_DURATION;
  }

  applySlow() { this.slowTime = Player.SLOW_DURATION; }

  update(dt) {
    // Cooldowns tick slower while frozen by an ice blast
    const rate = this.slowed ? Player.SLOW_FACTOR : 1;
    for (const id in this.cooldowns) {
      if (this.cooldowns[id] > 0) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt * rate);
    }
    if (this.slowTime > 0) this.slowTime -= dt;
    if (this.shieldActive) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) this.shieldActive = false;
    }
    if (this.castAnim > 0) this.castAnim -= dt;
    if (this.hitAnim > 0) this.hitAnim -= dt;
  }

  /* ---------------- Rendering ---------------- */

  render(ctx, t) {
    const bob = Math.sin(t * 2 + this.bobPhase) * 4;
    const lunge = this.castAnim > 0 ? this.facing * this.castAnim * 60 : 0;
    const x = this.x + lunge, y = this.y + bob;

    ctx.save();

    // Frozen tint while slowed
    if (this.slowed) {
      ctx.shadowColor = '#7fd4ff';
      ctx.shadowBlur = 24;
    }

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 6, 55, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe (hooded silhouette)
    const robeGrad = ctx.createLinearGradient(x, y - 110, x, y);
    if (this.index === 1) { robeGrad.addColorStop(0, '#2452c4'); robeGrad.addColorStop(1, '#0d1c4a'); }
    else { robeGrad.addColorStop(0, '#a3244a'); robeGrad.addColorStop(1, '#3d0a1e'); }
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(x - 45, y);
    ctx.quadraticCurveTo(x - 38, y - 85, x, y - 105);
    ctx.quadraticCurveTo(x + 38, y - 85, x + 45, y);
    ctx.closePath(); ctx.fill();

    // Blue-steel trim
    ctx.strokeStyle = 'rgba(111,183,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 8);
    ctx.quadraticCurveTo(x, y - 22, x + 40, y - 8);
    ctx.stroke();

    // Staff with glowing orb (in front hand)
    const sx = x + this.facing * 48;
    ctx.strokeStyle = '#6d4d2a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx - this.facing * 8, y);
    ctx.lineTo(sx + this.facing * 6, y - 85);
    ctx.stroke();
    const orbGlow = 0.5 + 0.5 * Math.sin(t * 3) + (this.castAnim > 0 ? 1 : 0);
    const orbGrad = ctx.createRadialGradient(sx + this.facing * 6, y - 92, 1, sx + this.facing * 6, y - 92, 14);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.4, this.index === 1 ? '#6ea8ff' : '#ff6e9a');
    orbGrad.addColorStop(1, 'rgba(110,168,255,0)');
    ctx.globalAlpha = 0.55 + orbGlow * 0.3;
    ctx.fillStyle = orbGrad;
    ctx.beginPath(); ctx.arc(sx + this.facing * 6, y - 92, 14, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Portrait head in a golden ring
    const headR = 34, hx = x, hy = y - 118;
    ctx.save();
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.clip();
    if (this.portraitImg.complete && this.portraitImg.naturalWidth) {
      ctx.drawImage(this.portraitImg, hx - headR, hy - headR, headR * 2, headR * 2);
    } else {
      ctx.fillStyle = '#1a2450'; ctx.fillRect(hx - headR, hy - headR, headR * 2, headR * 2);
    }
    // White flash when hit
    if (this.hitAnim > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.hitAnim * 2.5})`;
      ctx.fillRect(hx - headR, hy - headR, headR * 2, headR * 2);
    }
    ctx.restore();
    ctx.strokeStyle = '#6fb7ff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#6fb7ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Shield bubble
    if (this.shieldActive) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.strokeStyle = `rgba(120,180,255,${0.5 + pulse * 0.4})`;
      ctx.fillStyle = `rgba(90,140,255,${0.10 + pulse * 0.08})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y - 70, 82, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Hex facets
      ctx.strokeStyle = `rgba(160,210,255,${0.25 + pulse * 0.2})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 50, y - 70 + Math.sin(a) * 50, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Frozen snowflake marker while slowed (pixel icon, no emoji)
    if (this.slowed) {
      const flake = IconFactory.image('ice');
      if (flake.complete && flake.naturalWidth) {
        ctx.drawImage(flake, x - 11, y - 184, 22, 22);
      }
    }

    ctx.restore();
  }
}

window.Player = Player;
