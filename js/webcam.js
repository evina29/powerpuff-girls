/* ============================================================
   WEBCAM & CHARACTERS
   - Webcam capture with circular crop → dataURL portrait
   - PortraitFactory: six chibi pixel-art RPG characters
     (cleric, knight, archer, rogue, witch, hero) drawn
     procedurally in the classic dark-outline sprite style.
   - OVERRIDES: drop real sprite PNGs into assets/characters/
     named  cleric.png  knight.png  archer.png  rogue.png
     witch.png  hero.png  and they are used automatically
     everywhere (landing page, battle portraits, win screen).
   ============================================================ */

class Webcam {
  constructor() {
    this.stream = null;
    this.video = null;
  }

  /** Start the camera into a <video> element. Throws on failure. */
  async start(videoEl) {
    this.video = videoEl;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    });
    videoEl.srcObject = this.stream;
    await videoEl.play();
  }

  /** Grab a mirrored frame and crop the center into a circle. Returns dataURL. */
  capture(size = 256) {
    const v = this.video;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const vw = v.videoWidth || 640, vh = v.videoHeight || 480;
    const s = Math.min(vw, vh);
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

/* ------------------------------------------------------------
   PORTRAIT FACTORY — chibi pixel sprites + circular badges.
   ------------------------------------------------------------ */
class PortraitFactory {
  static OUTLINE = '#10131f';

  /** The six duel characters (AI opponents & default humans). */
  static CHARACTERS = [
    { id: 'cleric', name: 'Forest Cleric', skin: '#f2c79b', hair: '#8a5a2f', style: 'buns',
      cloth: '#e8e4da', clothDark: '#cbc5b8', trim: '#d9a13b', hat: null, cape: null,
      weapon: 'staff', accent: '#7dff8e' },
    { id: 'knight', name: 'Azure Knight', skin: '#f2c79b', hair: null, style: 'helmet',
      cloth: '#2f6fd6', clothDark: '#1f4fa8', trim: '#ffd75e', hat: '#2f6fd6', cape: null,
      weapon: 'hammer', accent: '#4a9eff' },
    { id: 'archer', name: 'Elf Archer', skin: '#f2c79b', hair: '#ffd75e', style: 'ponytail',
      cloth: '#3a8a3f', clothDark: '#2a6330', trim: '#d9a13b', hat: '#2e7d32', cape: null,
      weapon: 'bow', accent: '#7dff8e' },
    { id: 'rogue', name: 'Shadow Rogue', skin: '#e8b88a', hair: null, style: 'hood',
      cloth: '#5a4632', clothDark: '#463424', trim: '#d9a13b', hat: '#3f8a3f', cape: '#35683a',
      weapon: 'daggers', accent: '#9fdcff' },
    { id: 'witch', name: 'Violet Witch', skin: '#f2c79b', hair: '#e86ca8', style: 'witch',
      cloth: '#6d28d9', clothDark: '#5b21b6', trim: '#d9a13b', hat: '#7c3aed', cape: null,
      weapon: 'staff', accent: '#5ab0ff' },
    { id: 'hero', name: 'Sword Hero', skin: '#f2c79b', hair: '#6b4a2f', style: 'spiky',
      cloth: '#2563eb', clothDark: '#1e40af', trim: '#d9a13b', hat: null, cape: '#c0392b',
      weapon: 'sword', accent: '#ffd75e' }
  ];

  /** Sprite sheet extracted characters (loaded dynamically). */
  static SPRITESHEET_CHARACTERS = [];

  /** All available characters (procedural + spritesheet). */
  static getAllCharacters() {
    return [...PortraitFactory.CHARACTERS, ...PortraitFactory.SPRITESHEET_CHARACTERS];
  }

  /** Real sprite images loaded from assets/characters/ (optional). */
  static overrides = {};

  /**
   * Load a sprite sheet from a file and extract individual character sprites.
   * @param {string} sheetPath - Path to the sprite sheet image
   * @param {number} cols - Number of columns in the grid
   * @param {number} rows - Number of rows in the grid
   */
  static loadSpriteSheet(sheetPath, cols = 6, rows = 4) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const sprites = [];
        const spriteWidth = img.width / cols;
        const spriteHeight = img.height / rows;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const canvas = document.createElement('canvas');
            canvas.width = spriteWidth;
            canvas.height = spriteHeight;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            ctx.drawImage(
              img,
              col * spriteWidth, row * spriteHeight, spriteWidth, spriteHeight,
              0, 0, spriteWidth, spriteHeight
            );

            const charId = `sprite_${row}_${col}`;
            const charName = `Character ${row * cols + col + 1}`;
            
            // Store the sprite as an override
            const spriteImg = new Image();
            spriteImg.src = canvas.toDataURL('image/png');
            PortraitFactory.overrides[charId] = spriteImg;
            
            // Create character definition
            sprites.push({
              id: charId,
              name: charName,
              skin: '#f2c79b',
              hair: '#8a5a2f',
              style: 'spiky',
              cloth: '#2563eb',
              clothDark: '#1e40af',
              trim: '#d9a13b',
              hat: null,
              cape: null,
              weapon: 'sword',
              accent: '#ffd75e'
            });
          }
        }

        PortraitFactory.SPRITESHEET_CHARACTERS = sprites;
        resolve(sprites);
      };
      img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${sheetPath}`));
      img.crossOrigin = 'anonymous';
      img.src = sheetPath;
    });
  }

  /**
   * Try to load user-provided character art. Any file found in
   * assets/characters/{id}.png replaces the procedural sprite.
   */
  static loadOverrides(onLoaded) {
    for (const c of PortraitFactory.CHARACTERS) {
      const img = new Image();
      img.onload = () => {
        PortraitFactory.overrides[c.id] = img;
        if (onLoaded) onLoaded(c.id);
      };
      img.src = `assets/characters/${c.id}.png`;
    }
  }

  static byId(id) {
    const allChars = PortraitFactory.getAllCharacters();
    return allChars.find(c => c.id === id);
  }

  /* -------- chibi sprite renderer (24×26 pixel grid) -------- */
  static drawChibi(c, scale = 6) {
    const GW = 24, GH = 26;
    const cv = document.createElement('canvas');
    cv.width = GW * scale; cv.height = GH * scale;
    const ctx = cv.getContext('2d');
    const px = (x, y, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
    };
    // Filled part with a chunky dark outline
    const part = (x, y, w, h, col) => {
      px(x - 1, y - 1, w + 2, h + 2, PortraitFactory.OUTLINE);
      px(x, y, w, h, col);
    };

    // Cape (behind body)
    if (c.cape) part(15, 13, 4, 8, c.cape);

    // Body / tunic
    part(9, 13, 6, 7, c.cloth);
    px(13, 13, 2, 7, c.clothDark);
    px(9, 17, 6, 1, c.trim); // belt

    // Arms
    part(7, 14, 2, 4, c.cloth);
    part(15, 14, 2, 4, c.cloth);

    // Boots
    part(9, 20, 2, 3, '#4a2f1e');
    part(13, 20, 2, 3, '#4a2f1e');

    // Head
    part(7, 5, 10, 8, c.skin);

    // Hair / headgear
    switch (c.style) {
      case 'spiky':
        part(6, 3, 12, 3, c.hair);
        px(6, 2, 2, 1, c.hair); px(10, 1, 3, 2, c.hair); px(15, 2, 2, 1, c.hair);
        px(6, 6, 1, 2, c.hair); px(17, 6, 1, 2, c.hair);
        break;
      case 'buns':
        part(6, 3, 12, 3, c.hair);
        part(3, 4, 3, 3, c.hair);
        part(18, 4, 3, 3, c.hair);
        px(7, 5, 10, 1, c.hair); // fringe
        break;
      case 'ponytail':
        part(6, 3, 12, 3, c.hair);
        part(18, 4, 3, 9, c.hair);
        px(7, 5, 10, 1, c.hair);
        if (c.hat) { part(6, 2, 12, 2, c.hat); px(16, 0, 1, 3, '#e8ecff'); } // cap + feather
        break;
      case 'hood':
        part(5, 2, 14, 4, c.hat);
        part(5, 6, 2, 7, c.hat);
        part(17, 6, 2, 7, c.hat);
        px(7, 11, 10, 2, c.hat); // mask over mouth
        break;
      case 'witch':
        px(6, 7, 1, 5, c.hair); px(17, 7, 1, 5, c.hair); // hair at sides
        part(4, 7, 16, 2, c.hat);   // brim
        part(9, 4, 8, 3, c.hat);    // crown
        part(11, 1, 4, 3, c.hat);   // tip
        px(9, 6, 8, 1, c.trim);     // band
        break;
      case 'helmet':
        part(6, 3, 12, 5, c.hat);
        part(10, 0, 4, 3, c.trim);        // crest
        px(7, 7, 10, 1, PortraitFactory.OUTLINE); // visor slit
        break;
    }

    // Face
    px(9, 8, 2, 2, '#141824');
    px(13, 8, 2, 2, '#141824');
    if (c.style !== 'hood') px(11, 11, 2, 1, '#c2554a'); // mouth

    // Weapon
    switch (c.weapon) {
      case 'staff':
        part(4, 6, 1, 14, '#8a5a2f');
        part(3, 3, 3, 3, c.accent);
        break;
      case 'sword':
        part(3, 4, 2, 10, '#cdd6e8');
        px(3, 3, 2, 1, '#e8eef8');
        part(2, 14, 4, 1, c.trim);
        part(3, 15, 2, 3, '#5a3a22');
        break;
      case 'bow':
        px(5, 5, 1, 1, '#8a5a2f'); px(4, 6, 1, 2, '#8a5a2f');
        px(3, 8, 1, 8, '#8a5a2f');
        px(4, 16, 1, 2, '#8a5a2f'); px(5, 18, 1, 1, '#8a5a2f');
        px(6, 5, 1, 14, '#dbe7ff'); // string
        break;
      case 'daggers':
        part(4, 14, 1, 5, '#cdd6e8'); px(4, 19, 1, 1, '#5a3a22');
        part(19, 14, 1, 5, '#cdd6e8'); px(19, 19, 1, 1, '#5a3a22');
        break;
      case 'hammer':
        part(4, 9, 1, 10, '#8a5a2f');
        part(2, 6, 5, 4, '#aab4c8');
        px(2, 6, 5, 1, '#8892a8');
        break;
    }

    return cv;
  }

  /** Transparent sprite as a dataURL (uses real art if provided). */
  static spriteURL(char, scale = 6) {
    const override = PortraitFactory.overrides[char.id];
    if (override) {
      const cv = document.createElement('canvas');
      cv.width = 24 * scale; cv.height = 26 * scale;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // Fit the art inside, preserving aspect
      const r = Math.min(cv.width / override.width, cv.height / override.height);
      const w = override.width * r, h = override.height * r;
      ctx.drawImage(override, (cv.width - w) / 2, cv.height - h, w, h);
      return cv.toDataURL();
    }
    return PortraitFactory.drawChibi(char, scale).toDataURL();
  }

  /** 256×256 circular badge portrait (battle HUD / win screen). */
  static characterPortrait(char) {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');

    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    const bg = ctx.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2 + 20);
    bg.addColorStop(0, '#1c2952'); bg.addColorStop(1, '#0a0e1e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

    // Sparse pixel stars behind the character
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(219,231,255,${0.2 + Math.random() * 0.5})`;
      ctx.fillRect(Math.floor(Math.random() * S), Math.floor(Math.random() * S), 3, 3);
    }

    ctx.imageSmoothingEnabled = false;
    const override = PortraitFactory.overrides[char.id];
    if (override) {
      const r = Math.min(200 / override.width, 216 / override.height);
      const w = override.width * r, h = override.height * r;
      ctx.drawImage(override, (S - w) / 2, S - h - 8, w, h);
    } else {
      const sprite = PortraitFactory.drawChibi(char, 8); // 192×208
      ctx.drawImage(sprite, (S - sprite.width) / 2, S - sprite.height - 8);
    }

    // Blue ring
    ctx.strokeStyle = 'rgba(111,183,255,0.9)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); ctx.stroke();

    return cv.toDataURL('image/png');
  }

  /** Random AI opponent. */
  static randomAIWizard() {
    const c = PortraitFactory.CHARACTERS[
      Math.floor(Math.random() * PortraitFactory.CHARACTERS.length)];
    return { name: c.name, portrait: PortraitFactory.characterPortrait(c), id: c.id };
  }

  /** Fallback portrait for a human player without a camera. */
  static defaultHuman(playerIndex) {
    const c = PortraitFactory.byId(playerIndex === 1 ? 'hero' : 'witch');
    return PortraitFactory.characterPortrait(c);
  }
}

window.Webcam = Webcam;
window.PortraitFactory = PortraitFactory;
