# 🎨 Character Art & Sprite Sheets

## Quick Start: Using Your Sprite Sheet

1. Open `sprite-uploader.html` in your browser
2. Drag your sprite sheet image onto it
3. Adjust grid (6 cols × 4 rows for your image)
4. The game will automatically extract and use all sprites!

## Individual Character Overrides

Save pixel-art character images with EXACTLY these names and the game will automatically use them everywhere (landing page cards, battle portraits, win screen) instead of the built-in generated sprites:

| File          | Character     |
|---------------|---------------|
| `cleric.png`  | Forest Cleric (green healer with staff) |
| `knight.png`  | Azure Knight (blue armor, hammer)       |
| `archer.png`  | Elf Archer (bow, green cap)             |
| `rogue.png`   | Shadow Rogue (green hood, daggers)      |
| `witch.png`   | Violet Witch (purple hat, staff)        |
| `hero.png`    | Sword Hero (blue tunic, red cape)       |

PNG with transparent or dark background, roughly square, any size (400–512 px works great). No code changes needed — just refresh the page.

## Sprite Sheet Support

The game now supports extracting sprites from a sprite sheet:

- **Format**: Grid-based (6 columns × 4 rows recommended = 24 characters)
- **File**: Save as `spritesheet.png` in this directory
- **Auto-load**: Sprite sheet automatically extracts on game startup
- **Custom grid**: Use the sprite uploader tool to customize dimensions

## How It Works

✅ All 24 sprites from your sheet become playable characters
✅ Sprites appear on the menu polaroids
✅ Players can select any sprite for their duel
✅ AI opponents choose random sprites
✅ Sprite size: Auto-scaled to fit UI (no resizing needed)

**Note**: The 6 core characters (Cleric, Knight, etc.) are still available as fallbacks if individual PNGs are provided.

