/* ============================================================
   SETTINGS — user preferences, auto-saved to localStorage.
   Other systems read from Settings.current (audio volumes,
   particle/animation quality, canvas resolution).
   ============================================================ */

class Settings {
  static DEFAULTS = {
    musicVolume: 0.6,       // 0..1
    sfxVolume: 0.8,         // 0..1
    resolution: 1,          // canvas scale: 0.75 | 1 | 1.5
    particleQuality: 1,     // particle count multiplier
    animQuality: 'high',    // 'low' | 'high'
    aiDifficulty: 'medium', // remembered between sessions
    lastArena: null         // last battle background used
  };

  static current = { ...Settings.DEFAULTS };
  static listeners = [];

  static load() {
    Settings.current = { ...Settings.DEFAULTS, ...(Storage.load('settings', {}) || {}) };
  }

  static save() {
    Storage.save('settings', Settings.current);
  }

  /** Set one setting, persist, and notify listeners. */
  static set(key, value) {
    Settings.current[key] = value;
    Settings.save();
    Settings.listeners.forEach(fn => fn(key, value));
  }

  static get(key) { return Settings.current[key]; }

  static onChange(fn) { Settings.listeners.push(fn); }
}

window.Settings = Settings;
