/* ============================================================
   INPUT SYSTEM — the single gateway for ALL player commands.

   Game logic NEVER knows where a command came from. Sources
   (keyboard today, ESP32 Bluetooth/Serial wands tomorrow, and
   the AI controller) all funnel through InputManager.dispatch()
   using the same abstract command strings:

       FIREBALL · LIGHTNING · ICE · SHIELD · HEAL

   To add a new input device, subclass InputSource and call
   this.emit(playerIndex, 'FIREBALL') — nothing else changes.
   ============================================================ */

/** Abstract base class for every input device. */
class InputSource {
  constructor(name) {
    this.name = name;
    this.manager = null; // set by InputManager.addSource()
  }

  /** Forward a spell command into the game. */
  emit(playerIndex, command) {
    if (this.manager) this.manager.dispatch(playerIndex, command, this.name);
  }

  enable() {}
  disable() {}
}

/** Central hub. Game code subscribes with onCommand(). */
class InputManager {
  static COMMANDS = ['FIREBALL', 'LIGHTNING', 'ICE', 'SHIELD', 'HEAL'];

  constructor() {
    this.sources = [];
    this.listeners = [];
  }

  addSource(source) {
    source.manager = this;
    this.sources.push(source);
    source.enable();
    return source;
  }

  /** Subscribe: fn(playerIndex, command, sourceName). */
  onCommand(fn) { this.listeners.push(fn); }

  /** Validate and broadcast a command to all listeners. */
  dispatch(playerIndex, command, sourceName = 'unknown') {
    command = String(command).toUpperCase().trim();
    if (!InputManager.COMMANDS.includes(command)) return;
    this.listeners.forEach(fn => fn(playerIndex, command, sourceName));
  }
}

/* ------------------------------------------------------------
   KEYBOARD SOURCE
   P1: Q/W/E/R/T   P2: U/I/O/P/[
   In single-player mode P2 keys are disabled via setPlayerKeys()
   (an input configuration concern — battle logic is untouched).
   ------------------------------------------------------------ */
class KeyboardInput extends InputSource {
  static MAP = {
    KeyQ: [1, 'FIREBALL'], KeyW: [1, 'LIGHTNING'], KeyE: [1, 'ICE'],
    KeyR: [1, 'SHIELD'],   KeyT: [1, 'HEAL'],
    KeyU: [2, 'FIREBALL'], KeyI: [2, 'LIGHTNING'], KeyO: [2, 'ICE'],
    KeyP: [2, 'SHIELD'],   BracketLeft: [2, 'HEAL']
  };

  constructor() {
    super('keyboard');
    this.enabledPlayers = new Set([1, 2]);
    this._handler = (e) => this._onKey(e);
  }

  enable() { window.addEventListener('keydown', this._handler); }
  disable() { window.removeEventListener('keydown', this._handler); }

  /** Restrict which local players this keyboard controls. */
  setPlayerKeys(players) { this.enabledPlayers = new Set(players); }

  _onKey(e) {
    if (e.repeat) return;
    // Ignore keystrokes while typing a wizard name
    if (document.activeElement && document.activeElement.tagName === 'INPUT' &&
        document.activeElement.type === 'text') return;
    const bind = KeyboardInput.MAP[e.code];
    if (!bind) return;
    const [player, command] = bind;
    if (this.enabledPlayers.has(player)) this.emit(player, command);
  }
}

window.InputSource = InputSource;
window.InputManager = InputManager;
window.KeyboardInput = KeyboardInput;
