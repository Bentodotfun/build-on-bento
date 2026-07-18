# Icon Placeholders

The Chrome extension requires icons in three sizes:
- 16x16 (toolbar icon)
- 48x48 (extension management page)
- 128x128 (Chrome Web Store)

## To add real icons:

1. Create or generate icons (use a tool like Figma, Canva, or an AI image generator)
2. Save as PNG files with transparent backgrounds
3. Name them: `icon16.png`, `icon48.png`, `icon128.png`
4. Place in the `extension/icons/` directory

## Quick placeholder creation:

For testing, you can create simple colored squares:

```bash
# On macOS/Linux with ImageMagick:
convert -size 16x16 xc:#667eea extension/icons/icon16.png
convert -size 48x48 xc:#667eea extension/icons/icon48.png
convert -size 128x128 xc:#667eea extension/icons/icon128.png

# On Windows with Python + Pillow:
python -c "from PIL import Image; Image.new('RGB', (16,16), '#667eea').save('extension/icons/icon16.png')"
python -c "from PIL import Image; Image.new('RGB', (48,48), '#667eea').save('extension/icons/icon48.png')"
python -c "from PIL import Image; Image.new('RGB', (128,128), '#667eea').save('extension/icons/icon128.png')"
```

## Design suggestions:

The Dibs brand uses a purple gradient (#667eea to #764ba2). Icon should be:
- Simple target/bullseye symbol (represents "truth targeting")
- Or a checkmark + question mark hybrid
- Or a percentage/probability symbol
- Clean, recognizable at small sizes
- Works well against light and dark backgrounds
