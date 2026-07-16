# Assets

**Everything in the game is currently generated procedurally in code** — backgrounds,
wizard portraits, particle art and every sound/music track (Web Audio synthesis).
That means the game runs with these folders empty.

These folders are the drop-in points for real production assets later:

| Folder         | Purpose                                             | Where to hook it up            |
|----------------|-----------------------------------------------------|--------------------------------|
| `backgrounds/` | Painted arena backdrops (1920×1080 PNG/JPG)         | `js/backgrounds.js`            |
| `ai/`          | Illustrated AI wizard portraits (512×512, circular) | `js/webcam.js` PortraitFactory |
| `spells/`      | Spell sprite sheets / flipbooks                     | `js/spell.js`                  |
| `music/`       | Menu / battle / victory tracks (OGG or MP3)         | `js/audio.js` playMusic()      |
| `sounds/`      | Spell, UI and impact SFX (OGG or WAV)               | `js/audio.js` play()           |
| `icons/`       | Spell bar + UI icons (currently emoji)              | `js/spell.js` REGISTRY icons   |
