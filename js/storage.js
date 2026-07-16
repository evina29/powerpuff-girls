/* ============================================================
   STORAGE — thin, safe wrapper around localStorage.
   All persistence (settings, statistics, save data) goes
   through this class so the storage backend can be swapped
   (e.g. IndexedDB, cloud) without touching game code.
   ============================================================ */

class Storage {
  static PREFIX = 'magic_outpost_';

  /** Load and JSON-parse a key. Returns fallback on any failure. */
  static load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(Storage.PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn('[Storage] load failed:', key, e);
      return fallback;
    }
  }

  /** JSON-stringify and save a value. */
  static save(key, value) {
    try {
      localStorage.setItem(Storage.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] save failed:', key, e);
    }
  }

  /** Remove one key. */
  static remove(key) {
    try { localStorage.removeItem(Storage.PREFIX + key); } catch (e) { /* ignore */ }
  }
}

window.Storage = Storage;
