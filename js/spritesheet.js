/* ============================================================
   SPRITE SHEET EXTRACTOR — loads a grid of characters
   from a sprite sheet and extracts individual sprites.
   ============================================================ */

class SpriteSheetExtractor {
  /**
   * Load a sprite sheet and extract individual character sprites.
   * @param {Image} sheetImage - The loaded sprite sheet image
   * @param {number} cols - Number of columns in the grid
   * @param {number} rows - Number of rows in the grid
   * @returns {Array} Array of extracted sprite canvas elements
   */
  static extractSprites(sheetImage, cols = 6, rows = 4) {
    const spriteWidth = sheetImage.width / cols;
    const spriteHeight = sheetImage.height / rows;
    const sprites = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        canvas.width = spriteWidth;
        canvas.height = spriteHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
          sheetImage,
          col * spriteWidth, row * spriteHeight, spriteWidth, spriteHeight,
          0, 0, spriteWidth, spriteHeight
        );

        sprites.push(canvas.toDataURL('image/png'));
      }
    }

    return sprites;
  }

  /**
   * Load a sprite sheet from a URL and extract sprites.
   */
  static loadAndExtract(sheetURL, cols = 6, rows = 4) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const sprites = SpriteSheetExtractor.extractSprites(img, cols, rows);
        resolve(sprites);
      };
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = sheetURL;
    });
  }
}

window.SpriteSheetExtractor = SpriteSheetExtractor;
