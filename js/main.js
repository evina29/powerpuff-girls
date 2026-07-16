/* ============================================================
   MAIN — game bootstrap, state machine and menu flow.

   States: menu → mode → webcam (×1 or ×2) → [difficulty] →
           battle → win → (play again / menu)

   Owns the canvas render loop; delegates per-state rendering
   to the menu background or the active Battle.
   ============================================================ */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = 'menu';
    this.battle = null;
    this.menuBg = new MenuBackground();
    this.fxParticles = new ParticleSystem();  // menu/win overlay effects

    // Pending match configuration built up through the setup screens
    this.setup = { mode: null, portraits: {}, names: {}, difficulty: 'medium', capturing: 1 };

    this.webcam = new Webcam();
    this.audioReady = false;

    Settings.load();
    Stats.load();
    this.setup.difficulty = Settings.get('aiDifficulty') || 'medium';

    this._initInput();
    this._bindUI();
    this._initSettingsUI();
    this._applyPixelIcons();
    this._buildMenuPolaroids();
    // Use real character art from assets/characters/ when present
    PortraitFactory.loadOverrides(() => {
      this._applyPixelIcons();
      this._buildMenuPolaroids();
    });
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Gold star dust follows the cursor on every non-battle screen
    this._lastMouse = { x: -999, y: -999 };
    window.addEventListener('mousemove', (e) => this._onMouseTrail(e));

    this._lastT = performance.now();
    requestAnimationFrame((t) => this._frame(t));

    this._grandEntry(); // sparkle burst on first load
  }

  /** Spawn star dust along the cursor path (menus only, throttled). */
  _onMouseTrail(e) {
    if (this.state === 'battle') return;
    // Convert CSS pixels to canvas pixels (resolution setting scales them)
    const sx = this.canvas.width / window.innerWidth;
    const sy = this.canvas.height / window.innerHeight;
    const x = e.clientX * sx, y = e.clientY * sy;
    const dx = x - this._lastMouse.x, dy = y - this._lastMouse.y;
    if (dx * dx + dy * dy < 36) return; // only when actually moving
    this._lastMouse = { x, y };
    this.fxParticles.cursorTrail(x, y);
  }

  /** Grand entrance: a golden starburst over the main page. */
  _grandEntry() {
    const W = this.canvas.width, H = this.canvas.height;
    this.fxParticles.grandBurst(W / 2, H * 0.42);
    // Two smaller side bursts, slightly delayed for drama
    setTimeout(() => this.fxParticles.grandBurst(W * 0.22, H * 0.3), 180);
    setTimeout(() => this.fxParticles.grandBurst(W * 0.78, H * 0.3), 320);
  }

  /* ---------------- Input wiring ---------------- */

  _initInput() {
    this.inputManager = new InputManager();
    this.keyboard = this.inputManager.addSource(new KeyboardInput());

    // ESP32 wand sources — created up-front, connected on demand.
    this.wandBT = new ESP32BluetoothInput(1);
    this.wandSerial = new ESP32SerialInput(1);
    this.inputManager.addSource(this.wandBT);
    this.inputManager.addSource(this.wandSerial);

    // The ONLY place commands enter game logic:
    this.inputManager.onCommand((player, command) => {
      if (this.battle) this.battle.onCommand(player, command);
    });

    // Escape aborts a battle back to the menu
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state === 'battle') this.toMenu();
    });
  }

  /* ---------------- Audio bootstrap (needs a user gesture) ---------------- */

  _ensureAudio() {
    if (!this.audioReady) {
      AudioManager.init();
      this.audioReady = true;
      const track = AudioManager.currentTrack; // requested before ctx existed
      AudioManager.currentTrack = null;
      AudioManager.playMusic(track || 'menu');
    }
    AudioManager.resume();
  }

  /* ---------------- UI bindings ---------------- */

  _bindUI() {
    // Hover + click sounds on every button-ish element
    document.querySelectorAll('.btn, .mode-card, .nav-link').forEach(el => {
      el.addEventListener('mouseenter', () => AudioManager.play('hover'));
      el.addEventListener('click', () => { this._ensureAudio(); AudioManager.play('click'); });
    });

    // Central data-action dispatch
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this._ensureAudio();
      switch (btn.dataset.action) {
        case 'start':      this.showScreen('screen-mode'); break;
        case 'stats':      this._renderStats(); this.showScreen('screen-stats'); break;
        case 'settings':   this.showScreen('screen-settings'); break;
        case 'credits':    this.showScreen('screen-credits'); break;
        case 'exit':       this._exit(); break;
        case 'back-menu':  this.toMenu(); break;
        case 'play-again': this._startBattle(); break;
      }
    });

    // Mode select
    document.querySelectorAll('.mode-card[data-mode]').forEach(card => {
      card.addEventListener('click', () => {
        this.setup.mode = card.dataset.mode;
        this.setup.portraits = {}; this.setup.names = {};
        this._startCapture(1);
      });
    });

    // Difficulty select
    document.querySelectorAll('.mode-card[data-diff]').forEach(card => {
      card.addEventListener('click', () => {
        this.setup.difficulty = card.dataset.diff;
        Settings.set('aiDifficulty', card.dataset.diff); // auto-saved
        this._startBattle();
      });
    });

    // Webcam controls
    document.getElementById('btn-capture').addEventListener('click', () => this._capture());
    document.getElementById('btn-retake').addEventListener('click', () => this._retake());
    document.getElementById('btn-accept').addEventListener('click', () => this._acceptPortrait());
    document.getElementById('btn-skip-cam').addEventListener('click', () => this._skipCamera());

    // ESP32 wand connections (optional UI — connect from DevTools too:
    // game.wandBT.connectBluetooth() / game.wandSerial.connectSerial())
    const btBtn = document.getElementById('btn-connect-bt');
    if (btBtn) btBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await this._connectWand(this.wandBT.connectBluetooth.bind(this.wandBT), 'Bluetooth');
    });
    const serialBtn = document.getElementById('btn-connect-serial');
    if (serialBtn) serialBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await this._connectWand(this.wandSerial.connectSerial.bind(this.wandSerial), 'Serial');
    });
  }

  /** Fill every <img data-icon> / <img data-char> with generated pixel art. */
  _applyPixelIcons() {
    document.querySelectorAll('img[data-icon]').forEach(img => {
      img.src = IconFactory.url(img.dataset.icon, 48);
    });
    document.querySelectorAll('img[data-char]').forEach(img => {
      const char = PortraitFactory.byId(img.dataset.char);
      if (char) img.src = PortraitFactory.spriteURL(char, 5);
    });
  }

  /**
   * Stack tilted character cards along both screen edges,
   * partially off-screen — Hack-Club hero-photos style.
   */
  _buildMenuPolaroids() {
    const host = document.getElementById('menu-polaroids');
    if (!host) return;
    host.innerHTML = '';
    const spots = [
      { left: '-38px', top: '11%', rot: -9 },  { left: '-55px', top: '40%', rot: 14 },
      { left: '-30px', top: '68%', rot: -13 }, { right: '-38px', top: '10%', rot: 10 },
      { right: '-55px', top: '39%', rot: -15 }, { right: '-30px', top: '67%', rot: 12 }
    ];
    const allChars = PortraitFactory.getAllCharacters();
    allChars.forEach((char, i) => {
      const s = spots[i % spots.length];
      const card = document.createElement('div');
      card.className = 'polaroid';
      if (s.left) card.style.left = s.left; else card.style.right = s.right;
      card.style.top = s.top;
      card.style.setProperty('--rot', s.rot + 'deg');
      card.style.animationDelay = (i * 0.55) + 's';
      card.innerHTML =
        `<img src="${PortraitFactory.spriteURL(char, 7)}" alt="${char.name}">` +
        `<div class="cap">${char.name}</div>`;
      host.appendChild(card);
    });
  }

  async _connectWand(connectFn, label) {
    const status = document.getElementById('wand-status-text');
    try {
      await connectFn();
      if (status) status.textContent = `Wands: ${label} connected`;
    } catch (err) {
      console.warn('[Wand]', err.message);
      if (status) {
        status.textContent = err.message;
        setTimeout(() => { status.textContent = 'Wands: keyboard mode'; }, 4000);
      }
    }
  }

  _exit() {
    AudioManager.stopMusic();
    window.close(); // only works for script-opened windows…
    document.body.innerHTML =
      '<div style="display:flex;height:100vh;align-items:center;justify-content:center;' +
      "font-family:Manrope,sans-serif;font-weight:800;font-size:26px;line-height:1.8;color:#efe3a8;background:#17131f;text-align:center\">" +
      'The spell is broken.<br>You may close this tab.</div>';
  }

  /* ---------------- Screen management ---------------- */

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) document.getElementById(id).classList.add('active');
  }

  toMenu() {
    if (this.battle) { this.battle.destroy(); this.battle = null; }
    this.webcam.stop();
    this.state = 'menu';
    this.showScreen('screen-menu');
    AudioManager.playMusic('menu');
    this._grandEntry(); // sparkle burst every time the main page returns
  }

  /* ---------------- Webcam portrait flow ---------------- */

  async _startCapture(playerIndex) {
    this.setup.capturing = playerIndex;
    this.state = 'setup';
    this.showScreen('screen-webcam');

    document.getElementById('webcam-title').textContent =
      this.setup.mode === 'single'
        ? 'Strike a Heroic Pose!'
        : `Player ${playerIndex} — Strike a Heroic Pose!`;
    // Pre-fill with the name typed on the landing page (Player 1 only)
    const heroName = (document.getElementById('hero-name') || {}).value || '';
    document.getElementById('player-name-input').value =
      (playerIndex === 1 && heroName.trim()) ? heroName.trim() : `Player ${playerIndex}`;

    // Reset capture UI
    document.getElementById('webcam-video').classList.remove('hidden');
    document.getElementById('webcam-preview').classList.add('hidden');
    document.getElementById('btn-capture').classList.remove('hidden');
    document.getElementById('btn-retake').classList.add('hidden');
    document.getElementById('btn-accept').classList.add('hidden');

    const hint = document.getElementById('webcam-hint');
    try {
      if (!Webcam.isSupported()) throw new Error('unsupported');
      await this.webcam.start(document.getElementById('webcam-video'));
      hint.textContent = 'Center your face in the circle, then Capture.';
    } catch (err) {
      hint.textContent = '⚠ Camera unavailable (needs HTTPS/localhost + permission). Use Skip for a generated portrait.';
      document.getElementById('btn-capture').classList.add('hidden');
    }
  }

  _capture() {
    if (!this.webcam.stream) return;
    this._pendingPortrait = this.webcam.capture(256);
    const preview = document.getElementById('webcam-preview');
    preview.width = preview.height = 256;
    const img = new Image();
    img.onload = () => preview.getContext('2d').drawImage(img, 0, 0);
    img.src = this._pendingPortrait;
    preview.classList.remove('hidden');
    document.getElementById('webcam-video').classList.add('hidden');
    document.getElementById('btn-capture').classList.add('hidden');
    document.getElementById('btn-retake').classList.remove('hidden');
    document.getElementById('btn-accept').classList.remove('hidden');
  }

  _retake() {
    this._pendingPortrait = null;
    document.getElementById('webcam-preview').classList.add('hidden');
    document.getElementById('webcam-video').classList.remove('hidden');
    document.getElementById('btn-capture').classList.remove('hidden');
    document.getElementById('btn-retake').classList.add('hidden');
    document.getElementById('btn-accept').classList.add('hidden');
  }

  _skipCamera() {
    this._pendingPortrait = PortraitFactory.defaultHuman(this.setup.capturing);
    this._acceptPortrait();
  }

  _acceptPortrait() {
    const idx = this.setup.capturing;
    const name = document.getElementById('player-name-input').value.trim() || `Player ${idx}`;
    this.setup.portraits[idx] = this._pendingPortrait || PortraitFactory.defaultHuman(idx);
    this.setup.names[idx] = name;
    this._pendingPortrait = null;

    if (this.setup.mode === 'two' && idx === 1) {
      this._startCapture(2);               // Player 2's turn at the camera
    } else {
      this.webcam.stop();
      if (this.setup.mode === 'single') {
        this.showScreen('screen-difficulty');
      } else {
        this._startBattle();
      }
    }
  }

  /* ---------------- Battle lifecycle ---------------- */

  _startBattle() {
    if (this.battle) { this.battle.destroy(); this.battle = null; }
    const s = this.setup;
    if (!s.mode) { this.toMenu(); return; }

    const p1 = new Player(1, s.names[1] || 'Player 1',
                          s.portraits[1] || PortraitFactory.defaultHuman(1));
    let p2;
    if (s.mode === 'single') {
      // Fresh random AI wizard every match
      const wiz = PortraitFactory.randomAIWizard();
      p2 = new Player(2, wiz.name, wiz.portrait, true);
      this.keyboard.setPlayerKeys([1]);        // P2 keys off vs the AI
    } else {
      p2 = new Player(2, s.names[2] || 'Player 2',
                      s.portraits[2] || PortraitFactory.defaultHuman(2));
      this.keyboard.setPlayerKeys([1, 2]);
    }

    this.battle = new Battle(this, { mode: s.mode, players: [p1, p2], difficulty: s.difficulty });
    this.state = 'battle';
    this.showScreen(null);
    AudioManager.playMusic('battle');
  }

  showWinScreen(battle) {
    if (this.state !== 'battle') return;
    const winner = battle.winner;
    const loser = battle.players.find(p => p !== winner);
    const ms = winner.matchStats;

    document.getElementById('win-title').textContent =
      winner.isAI ? 'Defeat…' : 'Victory!';
    document.getElementById('win-portrait').src = winner.portraitURL;
    document.getElementById('win-name').textContent = `${winner.name} wins the duel!`;
    document.getElementById('win-stats').innerHTML = `
      <span class="k">Damage Dealt</span>    <span class="v">${ms.damageDealt}</span>
      <span class="k">Damage Received</span> <span class="v">${ms.damageReceived}</span>
      <span class="k">Spells Cast</span>     <span class="v">${ms.spellsCast}</span>
      <span class="k">Match Duration</span>  <span class="v">${Stats.formatTime(battle.duration)}</span>
      <span class="k">Opponent</span>        <span class="v">${loser.name}</span>
      <span class="k">Arena</span>           <span class="v">${battle.arena.name}</span>`;

    battle.destroy();
    this.battle = null;
    this.state = 'win';
    this.showScreen('screen-win');
  }

  /* ---------------- Statistics screen ---------------- */

  _renderStats() {
    const d = Stats.data;
    const spellName = (id) => id
      ? IconFactory.tag(Spell.get(id).icon, 14) + ' ' + Spell.get(id).name
      : '—';
    const rows = [
      ['Games Played', d.gamesPlayed],
      ['Wins', d.wins],
      ['Losses', d.losses],
      ['Win Rate', Stats.winRate() + '%'],
      ['Favorite Spell', spellName(Stats.favoriteSpell())],
      ['Most Used Spell', spellName(Stats.mostUsedSpell())],
      ['Total Damage', d.totalDamage],
      ['Highest Damage (match)', d.highestDamage],
      ['Fastest Victory', Stats.formatTime(d.fastestVictory)],
      ['Longest Match', Stats.formatTime(d.longestMatch)],
      ['Total Play Time', Stats.formatTime(d.playTime)],
      ['Highest Win Streak', d.highestWinStreak]
    ];
    document.getElementById('stats-grid').innerHTML = rows.map(([label, value]) =>
      `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`
    ).join('');
  }

  /* ---------------- Settings screen ---------------- */

  _initSettingsUI() {
    const music = document.getElementById('set-music');
    const sfx = document.getElementById('set-sfx');
    const res = document.getElementById('set-resolution');
    const parts = document.getElementById('set-particles');
    const anim = document.getElementById('set-anim');

    // Reflect saved settings
    music.value = Settings.get('musicVolume') * 100;
    sfx.value = Settings.get('sfxVolume') * 100;
    res.value = String(Settings.get('resolution'));
    parts.value = String(Settings.get('particleQuality'));
    anim.value = Settings.get('animQuality');

    music.addEventListener('input', () => {
      Settings.set('musicVolume', music.value / 100);
      AudioManager.setMusicVolume(music.value / 100);
    });
    sfx.addEventListener('input', () => {
      Settings.set('sfxVolume', sfx.value / 100);
      AudioManager.setSfxVolume(sfx.value / 100);
    });
    sfx.addEventListener('change', () => AudioManager.play('click')); // preview
    res.addEventListener('change', () => {
      Settings.set('resolution', parseFloat(res.value));
      this._resize();
    });
    parts.addEventListener('change', () => Settings.set('particleQuality', parseFloat(parts.value)));
    anim.addEventListener('change', () => Settings.set('animQuality', anim.value));

    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    });
    document.getElementById('btn-reset-stats').addEventListener('click', () => {
      if (confirm('Erase all statistics? This cannot be undone.')) {
        Stats.reset();
        AudioManager.play('click');
      }
    });
  }

  /* ---------------- Canvas + render loop ---------------- */

  _resize() {
    const scale = Settings.get('resolution') || 1;
    this.canvas.width = Math.round(window.innerWidth * scale);
    this.canvas.height = Math.round(window.innerHeight * scale);
  }

  _frame(now) {
    const dt = Math.min(0.05, (now - this._lastT) / 1000);
    this._lastT = now;
    const t = now / 1000;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    if (this.state === 'battle' && this.battle) {
      this.battle.update(dt);
      // battle may end (showWinScreen) inside update
      if (this.battle) this.battle.render(ctx, W, H, t);
    }

    if (this.state !== 'battle') {
      // Animated menu background behind every non-battle screen
      const lowAnim = Settings.get('animQuality') === 'low';
      this.menuBg.draw(ctx, W, H, lowAnim ? Math.floor(t * 2) / 2 : t);

      if (this.state === 'win') {
        this.fxParticles.victory(W, H);   // fireworks behind the win panel
      }
      this.fxParticles.update(dt);
      this.fxParticles.render(ctx);
    }

    requestAnimationFrame((n) => this._frame(n));
  }
}

/* ---------------- Boot ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
  console.log('%c✦ ESKape the Spell is ready. May your aim be true. ✦',
              'color:#f5c542;font-size:14px');

  // Dev/demo shortcut: open index.html#battle to jump straight into a
  // single-player duel with generated portraits (skips menus/webcam).
  if (location.hash === '#battle') {
    window.game.setup.mode = 'single';
    window.game.setup.portraits = { 1: PortraitFactory.defaultHuman(1) };
    window.game.setup.names = { 1: 'Tester' };
    window.game._startBattle();
  }
});
