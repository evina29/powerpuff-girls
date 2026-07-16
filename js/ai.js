/* ============================================================
   AI OPPONENT — three difficulty levels.
   The AI is just another InputSource: it "casts" by emitting
   the same abstract commands a keyboard or ESP32 wand would,
   so battle logic cannot tell a bot from a human.
   ============================================================ */

class AIInput extends InputSource {
  constructor() { super('ai'); }
}

class AIController {
  static PROFILES = {
    easy: {
      decisionMin: 1.7, decisionMax: 3.0,   // slow, dreamy pacing
      shieldReactChance: 0.12, reactTime: 0.95,
      healThreshold: 25, healChance: 0.5,
      preShieldChance: 0, wastefulChance: 0.35 // sometimes picks silly spells
    },
    medium: {
      decisionMin: 1.0, decisionMax: 1.9,
      shieldReactChance: 0.55, reactTime: 0.45,
      healThreshold: 50, healChance: 0.85,
      preShieldChance: 0.10, wastefulChance: 0.12
    },
    hard: {
      decisionMin: 0.6, decisionMax: 1.1,   // relentless
      shieldReactChance: 0.85, reactTime: 0.22,
      healThreshold: 42, healChance: 1.0,
      preShieldChance: 0.30, wastefulChance: 0.02
    }
  };

  /**
   * @param {Battle} battle
   * @param {Player} me the AI-controlled player
   * @param {Player} enemy the human opponent
   * @param {string} difficulty 'easy' | 'medium' | 'hard'
   * @param {AIInput} input registered InputSource to emit through
   */
  constructor(battle, me, enemy, difficulty, input) {
    this.battle = battle;
    this.me = me;
    this.enemy = enemy;
    this.profile = AIController.PROFILES[difficulty] || AIController.PROFILES.medium;
    this.input = input;
    this.decisionTimer = rand(0.8, 1.6); // opening hesitation
    this.pending = [];                    // [{ delay, command }] reaction queue
    this.reactedProjectiles = new WeakSet();
  }

  cast(command) { this.input.emit(this.me.index, command); }

  update(dt) {
    if (!this.me.alive || !this.enemy.alive) return;
    const p = this.profile;

    // --- Resolve delayed reactions (simulates human reaction time) ---
    this.pending = this.pending.filter(a => {
      a.delay -= dt;
      if (a.delay <= 0) { this.cast(a.command); return false; }
      return true;
    });

    // --- Defensive reaction: incoming projectile spotted ---
    for (const proj of this.battle.projectiles) {
      if (proj.target !== this.me || this.reactedProjectiles.has(proj)) continue;
      this.reactedProjectiles.add(proj);
      const canShield = this.me.isReady('SHIELD') && !this.me.shieldActive;
      if (canShield && Math.random() < p.shieldReactChance) {
        this.pending.push({ delay: p.reactTime, command: 'SHIELD' });
      }
    }

    // --- Periodic strategic decision ---
    this.decisionTimer -= dt;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = rand(p.decisionMin, p.decisionMax);
    this.decide();
  }

  decide() {
    const p = this.profile;
    const ready = Spell.list().filter(s => this.me.isReady(s.id)).map(s => s.id);
    if (ready.length === 0) return;

    // Easy AI occasionally does something pointless (part of its charm)
    if (Math.random() < p.wastefulChance) {
      this.cast(pick(ready));
      return;
    }

    // 1. Survival first: heal when hurt
    if (this.me.hp <= p.healThreshold && ready.includes('HEAL') &&
        Math.random() < p.healChance) {
      this.cast('HEAL');
      return;
    }

    // 2. Predictive defense (hard): pre-shield when the enemy's big
    //    spells are ready and no shield is up
    if (!this.me.shieldActive && ready.includes('SHIELD') &&
        this.enemy.isReady('FIREBALL') && Math.random() < p.preShieldChance) {
      this.cast('SHIELD');
      return;
    }

    // 3. Offense
    const attacks = ready.filter(id => ['FIREBALL', 'LIGHTNING', 'ICE'].includes(id));
    if (attacks.length === 0) return;

    if (this.enemy.shieldActive) {
      // Pop the shield with the cheapest attack, save the big hits
      const cheap = ['ICE', 'LIGHTNING', 'FIREBALL'].find(id => attacks.includes(id));
      if (cheap) this.cast(cheap);
      return;
    }

    // Prefer damage; slow the enemy if they're not already slowed
    if (!this.enemy.slowed && attacks.includes('ICE') && Math.random() < 0.35) {
      this.cast('ICE');
    } else {
      const order = ['FIREBALL', 'LIGHTNING', 'ICE'];
      this.cast(order.find(id => attacks.includes(id)));
    }
  }
}

window.AIInput = AIInput;
window.AIController = AIController;
