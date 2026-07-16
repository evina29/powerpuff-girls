/* ============================================================
   ICONS — procedural pixel-art icon factory (replaces emoji).
   Each icon is a 12×12 pixel map rendered to a crisp dataURL.
   Drop real PNGs into assets/icons/ later if preferred.
   ============================================================ */

class IconFactory {
  // '.' = transparent; letters index into each icon's color table
  static MAPS = {
    fire: {
      colors: { r: '#d63b1f', o: '#ff8c1e', y: '#ffd75e', w: '#fff7d0' },
      rows: [
        '.....r......',
        '....rr......',
        '....rro.....',
        '...rroo.....',
        '...roooo....',
        '..roooyo....',
        '..royyyor...',
        '.royyyyyor..',
        '.royywyyor..',
        '..royyyyr...',
        '...ryyyr....',
        '....rrr.....'
      ]
    },
    lightning: {
      colors: { y: '#ffe94a' },
      rows: [
        '......yy....',
        '.....yyy....',
        '.....yy.....',
        '....yyy.....',
        '...yyyyyyy..',
        '....yyyy....',
        '...yyyy.....',
        '...yyy......',
        '..yyy.......',
        '..yy........',
        '.yy.........',
        '.y..........'
      ]
    },
    ice: {
      colors: { b: '#9fdcff' },
      rows: [
        '.....b......',
        '.b...b...b..',
        '..b..b..b...',
        '...b.b.b....',
        '....bbb.....',
        'bbbbbbbbbbb.',
        '....bbb.....',
        '...b.b.b....',
        '..b..b..b...',
        '.b...b...b..',
        '.....b......',
        '............'
      ]
    },
    shield: {
      colors: { k: '#1e3a8a', b: '#5aa7ff', w: '#dbeafe' },
      rows: [
        '.kkkkkkkkk..',
        '.kbbbbbbbk..',
        '.kbbwwbbbk..',
        '.kbbwwbbbk..',
        '.kbbbbbbbk..',
        '.kbbbbbbbk..',
        '..kbbbbbk...',
        '..kbbbbbk...',
        '...kbbbk....',
        '....kbk.....',
        '.....k......',
        '............'
      ]
    },
    heal: {
      colors: { g: '#0f9d58', G: '#7dffb0' },
      rows: [
        '............',
        '....gggg....',
        '....gGGg....',
        '....gGGg....',
        '.ggggGGgggg.',
        '.gGGGGGGGGg.',
        '.gGGGGGGGGg.',
        '.ggggGGgggg.',
        '....gGGg....',
        '....gGGg....',
        '....gggg....',
        '............'
      ]
    },
    wand: {
      colors: { y: '#ffe94a', s: '#a8703c' },
      rows: [
        '.........y..',
        '........yyy.',
        '.........y..',
        '........s...',
        '.......s....',
        '......s.....',
        '.....s......',
        '....s.......',
        '...s........',
        '..s.........',
        '.ss.........',
        '............'
      ]
    },
    flag: {
      colors: { k: '#8a93ad', b: '#5aa7ff' },
      rows: [
        '.kk.........',
        '.kkbbbbbbb..',
        '.kkbbbbbbbb.',
        '.kkbbbbbbb..',
        '.kkbbbbb....',
        '.kk.........',
        '.kk.........',
        '.kk.........',
        '.kk.........',
        '.kk.........',
        '.kk.........',
        '............'
      ]
    },
    star: {
      colors: { y: '#ffe94a' },
      rows: [
        '.....yy.....',
        '.....yy.....',
        '....yyyy....',
        '.yyyyyyyyyy.',
        '..yyyyyyyy..',
        '....yyyy....',
        '...yy..yy...',
        '..yy....yy..',
        '.y........y.',
        '............',
        '............',
        '............'
      ]
    },
    moon: {
      colors: { m: '#cfe0ff' },
      rows: [
        '....mmmm....',
        '..mmmmm.....',
        '.mmmm.......',
        '.mmm........',
        '.mmm........',
        '.mmm........',
        '.mmmm.......',
        '..mmmmm.....',
        '....mmmm....',
        '............',
        '............',
        '............'
      ]
    },
    skull: {
      colors: { k: '#0b0f1e', w: '#e8ecff', b: '#0b0f1e' },
      rows: [
        '...kkkkkk...',
        '..kwwwwwwk..',
        '.kwwwwwwwwk.',
        '.kwbbwwbbwk.',
        '.kwbbwwbbwk.',
        '.kwwwwwwwwk.',
        '..kwwwwwwk..',
        '...kwwwwk...',
        '...kwkwwk...',
        '....kkkk....',
        '............',
        '............'
      ]
    }
  };

  static _urlCache = {};
  static _imgCache = {};

  /** Render an icon to a canvas (transparent background). */
  static canvas(name, size = 48) {
    const map = IconFactory.MAPS[name];
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    if (!map) return cv;
    const ctx = cv.getContext('2d');
    const grid = map.rows.length;
    const px = size / grid;
    map.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = map.colors[row[x]];
        if (!c) continue;
        ctx.fillStyle = c;
        // Overlap a hair to avoid sub-pixel seams
        ctx.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px));
      }
    });
    return cv;
  }

  /** dataURL for an icon (cached). */
  static url(name, size = 48) {
    const key = name + '@' + size;
    if (!IconFactory._urlCache[key]) {
      IconFactory._urlCache[key] = IconFactory.canvas(name, size).toDataURL();
    }
    return IconFactory._urlCache[key];
  }

  /** Cached HTMLImageElement (for drawing onto game canvases). */
  static image(name, size = 48) {
    const key = name + '@' + size;
    if (!IconFactory._imgCache[key]) {
      const img = new Image();
      img.src = IconFactory.url(name, size);
      IconFactory._imgCache[key] = img;
    }
    return IconFactory._imgCache[key];
  }

  /** Inline <img> HTML tag for UI templates. */
  static tag(name, size = 16, style = '') {
    return `<img class="pix-icon" src="${IconFactory.url(name, 48)}" ` +
           `style="width:${size}px;height:${size}px;${style}" alt="${name}">`;
  }
}

window.IconFactory = IconFactory;
