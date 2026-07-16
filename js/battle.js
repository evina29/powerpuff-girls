/* ============================================================
   BATTLE — the real-time duel scene.
   Owns the two wizards, projectiles/beams, particle systems,
   camera feedback, the AI controller, the DOM HUD and the
   win condition. Receives ALL spell commands exclusively via
   InputManager (keyboard, AI, or ESP32 wands — it can't tell).
   ============================================================ */

class Battle {
  static CRIT_CHANCE = 0.15;
  static CRIT_MULT = 1.5;

  /**
   * @param {Game} game
   * @param {object} cfg { mode:'single'|'two', players:[Player,Player], difficulty }
   */
  constructor(game, cfg) {
    this.game = game;
    this.mode = cfg.mode;
    this.players = cfg.players;             // [p1, p2]
    this.arena = Backgrounds.randomArena();

    this.state = 'intro';                    // intro | fighting | over
    this.introTime = 3.6;
    this._lastCount = 4;
    this.duration = 0;
    this.overTime = 0;
    this.winner = null;

    this.projectiles = [];
    this.beams = [];
    this.particles = new ParticleSystem();
    this.floats = new FloatingTextSystem();
    this.camera = new GameCamera();

    this.W = 1280; this.H = 720;             // updated every frame from canvas

    // AI opponent (single player) speaks through the InputManager
    this.ai = null;
    if (this.mode === 'single') {
      const aiInput = game.inputManager.addSource(new AIInput());
      this.ai = new AIController(this, this.players[1], this.players[0],
                                 cfg.difficulty, aiInput);
    }

    this.hud = new BattleHUD(this);
    this.hud.show();
  }

  /** Entry point for every spell command (from InputManager). */
  onCommand(playerIndex, command) {
    if (this.state !== 'fighting') return;
    const caster = this.players[playerIndex - 1];
    if (!caster || !caster.alive) return;
    const spell = Spell.get(command);
    if (!spell || !caster.isReady(spell.id)) return;
    this.cast(caster, spell);
  }

  /* ---------------- Casting & combat resolution ---------------- */

  cast(caster, spell) {
    const target = this.players[caster.index === 1 ? 1 : 0];
    caster.startCooldown(spell);
    AudioManager.play(spell.sound);
    this.hud.flashSlot(caster.index, spell.id);

    switch (spell.type) {
      case 'projectile':
        this.projectiles.push(new Projectile(spell, caster, target));
        break;
      case 'beam':
        this.beams.push(new Beam(spell, caster, target));
        this.particles.lightningSparks(caster.x + caster.facing * 55, caster.y - 70);
        break;
      case 'self':
        if (spell.id === 'SHIELD') {
          caster.activateShield();
          this.particles.shieldGlow(caster.x, caster.y - 70);
        } else if (spell.id === 'HEAL') {
          const healed = caster.heal(spell.heal);
          this.particles.heal(caster.x, caster.y - 70);
          this.floats.add(caster.x, caster.y - 170, `+${healed}`,
                          { color: '#2eff8b', size: 30 });
          this.camera.flash('#2eff8b', 0.12, 130);
        }
        break;
    }
  }

  /** A spell connects with its target. */
  applyHit(attacker, target, spell) {
    const wasShielded = target.shieldActive;

    // Critical hits
    let dmg = spell.damage;
    let crit = false;
    if (!wasShielded && Math.random() < Battle.CRIT_CHANCE) {
      dmg = Math.round(dmg * Battle.CRIT_MULT);
      crit = true;
    }

    const taken = target.takeDamage(dmg, attacker, spell.id);
    const hx = target.x, hy = target.y - 90;

    if (wasShielded) {
      // Shield absorbed the blow
      AudioManager.play('shieldBlock');
      this.particles.shieldGlow(target.x, target.y - 70, 80);
      this.floats.add(hx, hy - 40, 'BLOCKED!', { color: '#9ec5ff', size: 26 });
      this.camera.shake(4, 0.2);
      return;
    }

    // Impact visuals per element
    if (spell.id === 'FIREBALL') {
      AudioManager.play('explosion');
      this.particles.explosion(hx, hy);
      this.camera.flash('#ff8c1e', 0.22, 110);
    } else if (spell.id === 'ICE') {
      this.particles.iceShatter(hx, hy);
      this.camera.flash('#7fd4ff', 0.16, 100);
      target.applySlow();
    } else if (spell.id === 'LIGHTNING') {
      AudioManager.play('hit');
      this.particles.lightningSparks(hx, hy);
      this.camera.flash('#ffe94a', 0.18, 90);
    }

    if (crit) {
      AudioManager.play('crit');
      this.particles.crit(hx, hy);
      this.floats.add(hx, hy - 70, 'CRITICAL!', { color: '#ffd94a', size: 24 });
      this.camera.shake(16, 0.45);
    } else {
      this.camera.shake(9, 0.3);
    }
    this.floats.add(hx, hy - 40, `${taken}`,
                    { color: crit ? '#ffd94a' : '#ff6b6b', size: crit ? 40 : 30 });

    if (!target.alive) this.endBattle(attacker);
  }

  endBattle(winner) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.winner = winner;
    this.overTime = 0;
    AudioManager.playVictory();
    this.camera.shake(14, 0.5);

    // Lifetime statistics — recorded from Player 1's perspective
    const p1 = this.players[0];
    Stats.recordMatch({
      p1Won: winner.index === 1,
      damageDealt: p1.matchStats.damageDealt,
      spellCasts: p1.matchStats.spellCasts,
      spellDamage: p1.matchStats.spellDamage,
      duration: this.duration
    });
  }

  /* ---------------- Frame update ---------------- */

  update(dt) {
    const groundY = this.H * 0.8;
    this.players[0].x = this.W * 0.22; this.players[0].y = groundY; this.players[0].facing = 1;
    this.players[1].x = this.W * 0.78; this.players[1].y = groundY; this.players[1].facing = -1;

    this.camera.update(dt);
    this.particles.update(dt);
    this.floats.update(dt);

    if (this.state === 'intro') {
      this.introTime -= dt;
      // Summoning portals swirl around both wizards
      for (const p of this.players) this.particles.portal(p.x, p.y - 70, this.introTime * 2);
      const count = Math.ceil(this.introTime - 0.6);
      if (count !== this._lastCount && count > 0) {
        this._lastCount = count;
        AudioManager.play('countdown');
      }
      if (this.introTime <= 0.6 && this._lastCount !== 0) {
        this._lastCount = 0;
        AudioManager.play('fight');
      }
      if (this.introTime <= 0) this.state = 'fighting';
      this.hud.update(dt);
      return;
    }

    for (const p of this.players) p.update(dt);
    if (this.state === 'fighting') {
      this.duration += dt;
      if (this.ai) this.ai.update(dt);
    }

    // Projectiles — apply hit when they land
    for (const proj of this.projectiles) {
      if (proj.update(dt, this) && this.state !== 'over') {
        this.applyHit(proj.caster, proj.target, proj.spell);
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);

    // Beams — damage lands mid-flash
    for (const beam of this.beams) {
      if (beam.update(dt) && this.state !== 'over') {
        this.applyHit(beam.caster, beam.target, beam.spell);
      }
    }
    this.beams = this.beams.filter(b => !b.dead);

    // Victory celebration, then hand off to the win screen
    if (this.state === 'over') {
      this.overTime += dt;
      this.particles.victory(this.W, this.H);
      if (this.overTime > 2.4) this.game.showWinScreen(this);
    }

    this.hud.update(dt);
  }

  /* ---------------- Frame render ---------------- */

  render(ctx, W, H, t) {
    this.W = W; this.H = H;
    this.arena.draw(ctx, W, H, t);

    this.camera.preRender(ctx);
    for (const p of this.players) p.render(ctx, t);
    for (const proj of this.projectiles) proj.render(ctx);
    for (const beam of this.beams) beam.render(ctx);
    this.particles.render(ctx);
    this.floats.render(ctx);
    this.camera.postRender(ctx);

    // Intro countdown overlay
    if (this.state === 'intro') {
      const count = Math.ceil(this.introTime - 0.6);
      const label = count > 0 ? String(count) : 'FIGHT!';
      const frac = (this.introTime - 0.6) % 1;
      const scale = 1 + (1 - Math.max(0, frac)) * 0.25;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round((count > 0 ? 130 : 100) * scale)}px Manrope, sans-serif`;
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(4,8,20,0.75)';
      ctx.strokeText(label, W / 2, H * 0.42);
      ctx.fillStyle = count > 0 ? '#ffffff' : '#efe3a8';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 30;
      ctx.fillText(label, W / 2, H * 0.42);
      ctx.restore();
    }

    // Arena name watermark
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.font = "italic 600 17px 'Playfair Display', serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#efe3a8';
    ctx.fillText(this.arena.name, W / 2, H - 8);
    ctx.restore();
  }

  destroy() {
    this.hud.hide();
    this.camera.reset();
    this.particles.clear();
    this.floats.clear();
  }
}

/* ============================================================
   BATTLE HUD — DOM overlay (portraits, health, cooldowns,
   spell bars, status chips, timer).
   ============================================================ */
class BattleHUD {
  static KEY_LABELS = {
    1: { FIREBALL: 'Q', LIGHTNING: 'W', ICE: 'E', SHIELD: 'R', HEAL: 'T' },
    2: { FIREBALL: 'U', LIGHTNING: 'I', ICE: 'O', SHIELD: 'P', HEAL: '[' }
  };
  static AI_KEY = 'AI';

  constructor(battle) {
    this.battle = battle;
    this.root = document.getElementById('battle-hud');
    this._build();
  }

  _build() {
    const [p1, p2] = this.battle.players;
    document.getElementById('hud-p1-portrait').src = p1.portraitURL;
    document.getElementById('hud-p2-portrait').src = p2.portraitURL;
    document.getElementById('hud-p1-name').textContent = p1.name;
    document.getElementById('hud-p2-name').textContent = p2.name;

    this.slots = { 1: {}, 2: {} }; // bottom spell bar slots
    this.pips = { 1: {}, 2: {} };  // top cooldown pips

    for (const p of this.battle.players) {
      // Bottom spell bar
      const bar = document.getElementById(`spellbar-p${p.index}`);
      bar.innerHTML = '';
      for (const spell of Spell.list()) {
        const slot = document.createElement('div');
        slot.className = 'spell-slot';
        const key = p.isAI ? BattleHUD.AI_KEY : BattleHUD.KEY_LABELS[p.index][spell.id];
        slot.innerHTML = `<div class="cool"></div>` +
          `<div class="icon">${IconFactory.tag(spell.icon, 26, 'margin-top:7px')}</div>` +
          `<div class="key">${key}</div>`;
        slot.title = spell.name;
        bar.appendChild(slot);
        this.slots[p.index][spell.id] = slot;
      }
      // Top cooldown pips
      const row = document.getElementById(`hud-p${p.index}-cds`);
      row.innerHTML = '';
      for (const spell of Spell.list()) {
        const pip = document.createElement('div');
        pip.className = 'cd-pip';
        pip.innerHTML = `<div class="cd-fill"></div>` +
          `<span class="cd-icon">${IconFactory.tag(spell.icon, 15, 'margin-top:5px')}</span>`;
        row.appendChild(pip);
        this.pips[p.index][spell.id] = pip;
      }
    }
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  /** Brief golden pop on the slot that was just cast. */
  flashSlot(playerIndex, spellId) {
    const slot = this.slots[playerIndex][spellId];
    if (!slot) return;
    slot.classList.remove('flash');
    void slot.offsetWidth; // restart CSS animation
    slot.classList.add('flash');
  }

  update() {
    for (const p of this.battle.players) {
      // Health bar
      const pct = Math.max(0, (p.hp / Player.MAX_HP) * 100);
      const fill = document.getElementById(`hud-p${p.index}-hp`);
      fill.style.width = pct + '%';
      fill.classList.toggle('mid', pct <= 60 && pct > 30);
      fill.classList.toggle('low', pct <= 30);
      document.getElementById(`hud-p${p.index}-hptext`).textContent =
        `${Math.ceil(p.hp)} / ${Player.MAX_HP}`;

      // Cooldown overlays (bottom slots + top pips)
      for (const spell of Spell.list()) {
        const frac = Math.min(1, (p.cooldowns[spell.id] || 0) / spell.cooldown);
        const slot = this.slots[p.index][spell.id];
        slot.querySelector('.cool').style.height = (frac * 100) + '%';
        slot.classList.toggle('ready', frac === 0);
        const pip = this.pips[p.index][spell.id];
        pip.querySelector('.cd-fill').style.height = (frac * 100) + '%';
        pip.classList.toggle('ready', frac === 0);
      }

      // Status effect chips
      const chips = [];
      if (p.shieldActive) chips.push(IconFactory.tag('shield', 13) + ' Shielded');
      if (p.slowed) chips.push(IconFactory.tag('ice', 13) + ' Slowed');
      const row = document.getElementById(`hud-p${p.index}-status`);
      const html = chips.map(c => `<span class="status-chip">${c}</span>`).join('');
      if (row.innerHTML !== html) row.innerHTML = html;
    }

    // Match timer
    document.getElementById('hud-timer').textContent =
      Stats.formatTime(this.battle.duration);
  }
}

window.Battle = Battle;
window.BattleHUD = BattleHUD;
