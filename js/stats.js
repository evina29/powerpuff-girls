/* ============================================================
   STATISTICS — lifetime player records, saved to localStorage.
   Wins/losses/streaks are tracked from Player 1's perspective
   (in single player: the human; in two player: Player 1).
   ============================================================ */

class Stats {
  static DEFAULTS = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    totalDamage: 0,          // lifetime damage dealt by P1
    highestDamage: 0,        // most damage dealt in one match
    fastestVictory: null,    // seconds
    longestMatch: 0,         // seconds
    playTime: 0,             // total battle seconds
    winStreak: 0,            // current streak
    highestWinStreak: 0,
    spellCasts: {},          // { FIREBALL: n, ... } — cast counts
    spellDamage: {}          // { FIREBALL: dmg, ... } — damage totals
  };

  static data = { ...Stats.DEFAULTS };

  static load() {
    Stats.data = { ...Stats.DEFAULTS, ...(Storage.load('stats', {}) || {}) };
  }

  static save() { Storage.save('stats', Stats.data); }

  static reset() {
    Stats.data = JSON.parse(JSON.stringify(Stats.DEFAULTS));
    Stats.save();
  }

  /**
   * Record a finished match.
   * @param {object} m — { p1Won, damageDealt, spellCasts, spellDamage, duration }
   */
  static recordMatch(m) {
    const d = Stats.data;
    d.gamesPlayed++;
    d.playTime += m.duration;
    d.totalDamage += m.damageDealt;
    d.highestDamage = Math.max(d.highestDamage, m.damageDealt);
    d.longestMatch = Math.max(d.longestMatch, m.duration);

    if (m.p1Won) {
      d.wins++;
      d.winStreak++;
      d.highestWinStreak = Math.max(d.highestWinStreak, d.winStreak);
      if (d.fastestVictory === null || m.duration < d.fastestVictory) {
        d.fastestVictory = m.duration;
      }
    } else {
      d.losses++;
      d.winStreak = 0;
    }

    for (const [spell, n] of Object.entries(m.spellCasts || {})) {
      d.spellCasts[spell] = (d.spellCasts[spell] || 0) + n;
    }
    for (const [spell, dmg] of Object.entries(m.spellDamage || {})) {
      d.spellDamage[spell] = (d.spellDamage[spell] || 0) + dmg;
    }
    Stats.save();
  }

  /** Spell cast the most often. */
  static mostUsedSpell() {
    return Stats._maxKey(Stats.data.spellCasts);
  }

  /** Spell that has dealt the most total damage. */
  static favoriteSpell() {
    return Stats._maxKey(Stats.data.spellDamage);
  }

  static _maxKey(obj) {
    let best = null, bestVal = -1;
    for (const [k, v] of Object.entries(obj || {})) {
      if (v > bestVal) { best = k; bestVal = v; }
    }
    return best;
  }

  static winRate() {
    const games = Stats.data.wins + Stats.data.losses;
    return games === 0 ? 0 : Math.round((Stats.data.wins / games) * 100);
  }

  static formatTime(sec) {
    if (sec === null || sec === undefined) return '—';
    sec = Math.round(sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}

window.Stats = Stats;
