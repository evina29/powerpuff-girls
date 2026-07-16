# ESKape the Spell

A real-time wizard-duel browser game by **Eskade** (Evina, Shrey and Katy),
designed to be controlled by **ESP32 gesture-recognition magic wands** and
playable today with the keyboard.

Built with **pure HTML + CSS + JavaScript** (Canvas 2D + Web Audio). No
frameworks, no build step, no binary assets — all art, backgrounds, portraits
and sounds are generated procedurally in code.

---

## ▶ How to run

The game opens directly in a browser, but the **webcam** (and later Web
Bluetooth / Web Serial) require a *secure context* — `localhost` or HTTPS.
The easiest way:

```bash
# any static server works; pick whichever you have:
python -m http.server 8000        # then open http://localhost:8000
# or
npx serve .
```

Opening `index.html` via double-click (`file://`) also works — everything runs
except the webcam (the game offers generated portraits as a fallback).

**Recommended browser:** Chrome or Edge (needed later for Web Bluetooth/Serial).

---

## 🎮 Controls

| Spell        | Player 1 | Player 2 | ESP32 wand command |
|--------------|:--------:|:--------:|--------------------|
| 🔥 Fireball  — 20 dmg           | `Q` | `U` | `FIREBALL`  |
| ⚡ Lightning — 15 dmg           | `W` | `I` | `LIGHTNING` |
| ❄ Ice Blast — 12 dmg + slow    | `E` | `O` | `ICE`       |
| 🛡 Shield    — blocks next hit  | `R` | `P` | `SHIELD`    |
| ✚ Heal      — restores 15 HP   | `T` | `[` | `HEAL`      |

`Esc` aborts a battle back to the main menu. Both players start with 100 HP.
15% of unshielded hits are **critical** (×1.5 damage).

---

## 🧭 Game flow

1. **Main menu** — animated floating-castle background, music, Start / Statistics / Settings / Credits / Exit.
2. **Mode select** — Single Player (vs AI) or Two Player (shared keyboard).
3. **Webcam portraits** — each human player photographs themself; the photo is
   circle-cropped and becomes their in-game wizard head. No camera? A portrait
   is generated instead.
4. **AI difficulty** (single player) — Easy / Medium / Hard. The computer picks
   one of six pixel-art heroes: Forest Cleric, Azure Knight, Elf Archer,
   Shadow Rogue, Violet Witch, Sword Hero. Drop your own sprite PNGs into
   `assets/characters/` (see the README there) to replace the generated ones.
5. **Battle** — a random animated arena: Wizard Academy, Enchanted Forest,
   Crystal Cave or Ancient Ruins. Countdown, duel, floating damage numbers,
   screen shake, criticals, shields, slows.
6. **Win screen** — winner's portrait, match statistics, Play Again / Menu.

Statistics (wins, streaks, favorite spell, fastest victory…), settings and the
AI difficulty are auto-saved to `localStorage`.

---

## 🗂 Project structure

```
index.html            page shell: canvas + all UI screens + HUD
css/style.css         fantasy blue/gold theme, animations, HUD layout
js/
  main.js             Game class — state machine, menus, render loop
  battle.js           Battle scene + BattleHUD (health, cooldowns, timer)
  player.js           Player class — HP, cooldowns, statuses, wizard rendering
  spell.js            Spell registry + Projectile & Beam classes
  ai.js               AIController (easy/medium/hard) — emits via InputManager
  input.js            InputManager + InputSource + KeyboardInput  ← core abstraction
  esp32.js            ESP32BluetoothInput / ESP32SerialInput placeholders
  webcam.js           Webcam capture + PortraitFactory (6 AI wizards, fallbacks)
  backgrounds.js      5 procedural animated backgrounds (menu + 4 arenas)
  effects.js          ParticleSystem (fire/ice/lightning/shield/heal/crit/…)
  camera.js           GameCamera — screen shake + flash
  audio.js            AudioManager — synthesized SFX + generative music
  stats.js            lifetime statistics (localStorage)
  settings.js         user settings (localStorage)
  storage.js          safe localStorage wrapper
assets/               drop-in folders for real art/audio later (see assets/README)
```

---

## 🔌 ESP32 wand integration (future hardware)

**The entire game is input-agnostic.** Every spell command flows through
`InputManager` as one of five strings — `FIREBALL`, `LIGHTNING`, `ICE`,
`SHIELD`, `HEAL`. The keyboard, the AI, and the future wands are all just
`InputSource` subclasses; battle logic cannot tell them apart.

The wand firmware only needs to send one line of text per recognized gesture:

```
FIREBALL\n          → casts for that wand's assigned player
P2:LIGHTNING\n      → optional player prefix for multi-wand setups
```

Placeholders ready in `js/esp32.js`:

- `ESP32BluetoothInput.connectBluetooth()` — Web Bluetooth, Nordic UART service (UUIDs included)
- `ESP32SerialInput.connectSerial()` — Web Serial @ 115200 baud
- `receiveSpell(raw)` — chunk buffering
- `parseESP32Data(line)` — wire-format parsing (already implemented & testable)

Try it from the DevTools console right now — the game casts without any code
changes:

```js
game.wandSerial.parseESP32Data('P1:FIREBALL');
```

To finish the integration, uncomment the connection code in `esp32.js` (the
full outline is written in comments) and flash the wands with a sketch that
prints those command strings.

---

## ⚙ Notes & known limits

- Audio starts after the first click (browser autoplay policy).
- Webcam requires localhost/HTTPS; there is always a Skip fallback.
- All visuals/sound are procedural placeholders styled to look finished —
  swap in real assets via the `assets/` folders when available.
