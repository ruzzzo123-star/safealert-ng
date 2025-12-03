# SafeAlert NG - PWA Icons

## Required Icons

You need to generate PNG icons in the following sizes:

| File Name | Size | Purpose |
|-----------|------|---------|
| icon-16.png | 16x16 | Favicon |
| icon-32.png | 32x32 | Favicon |
| icon-72.png | 72x72 | Android |
| icon-96.png | 96x96 | Android |
| icon-128.png | 128x128 | Android |
| icon-144.png | 144x144 | Android/MS Tile |
| icon-152.png | 152x152 | iOS |
| icon-167.png | 167x167 | iPad Pro |
| icon-180.png | 180x180 | iOS |
| icon-192.png | 192x192 | Android (required) |
| icon-384.png | 384x384 | Android |
| icon-512.png | 512x512 | Android (required) |

## How to Generate Icons

### Option 1: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net
2. Upload a 512x512 PNG or the icon.svg file
3. Download the generated package
4. Extract to this folder

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# macOS: brew install imagemagick
# Ubuntu: sudo apt install imagemagick

# Generate all sizes from SVG
for size in 16 32 72 96 128 144 152 167 180 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}.png
done
```

### Option 3: Using Figma/Sketch
1. Create a 512x512 artboard
2. Design your icon
3. Export at multiple sizes

## Splash Screens (iOS)

Also needed for iOS splash screens:
- splash-640x1136.png (iPhone SE)
- splash-750x1334.png (iPhone 8)
- splash-1242x2208.png (iPhone 8 Plus)
- splash-1125x2436.png (iPhone X/XS)
- splash-1284x2778.png (iPhone 12/13 Pro Max)

## Quick Generation Script

Save this as `generate-icons.sh` and run it:

```bash
#!/bin/bash

# Requires: imagemagick and svg support
# brew install imagemagick librsvg

SIZES=(16 32 72 96 128 144 152 167 180 192 384 512)

for size in "${SIZES[@]}"; do
  convert -background none -resize ${size}x${size} icon.svg icon-${size}.png
  echo "Generated icon-${size}.png"
done

echo "Done! All icons generated."
```

## Social Media Images

- og-image.png: 1200x630 (Open Graph)
- twitter-image.png: 1200x600 (Twitter Card)

## Tips

1. **Maskable Icons**: For Android adaptive icons, ensure important content is within a "safe zone" (center 80%)
2. **Transparent Background**: iOS will add its own background, Android needs transparency for adaptive icons
3. **Simple Design**: Icons should be recognizable at 16x16 size
