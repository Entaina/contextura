#!/usr/bin/env bash
#
# Genera assets/icon.icns desde assets/source/Pi_01.png.
# Pi_01 (557×580) se paddea a 1024×1024 con fondo Marengo (#6c6e72, gris
# corporativo estructural de Entaina) y se expande a las 10 resoluciones
# que Apple requiere para un iconset.
#
# Idempotente. Reejecutable sin efectos colaterales.
#
# Deps: sips + iconutil (ambos nativos de macOS, sin instalar nada).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC="$REPO_ROOT/assets/source/Pi_01.png"
OUT_DIR="$REPO_ROOT/assets"
ICONSET="$OUT_DIR/icon.iconset"
BASE="$OUT_DIR/icon-1024.png"
BG="6C6E72"  # Marengo — gris corporativo estructural del Design System

if [[ ! -f "$SRC" ]]; then
  echo "✗ Source image not found: $SRC" >&2
  exit 1
fi

mkdir -p "$OUT_DIR" "$ICONSET"

echo "→ Pad $SRC to 1024×1024 with bg #$BG"
sips -s format png --padToHeightWidth 1024 1024 --padColor "$BG" \
  "$SRC" --out "$BASE" >/dev/null

echo "→ Generating iconset resolutions"
# name           size
declare -a ENTRIES=(
  "icon_16x16.png|16"
  "icon_16x16@2x.png|32"
  "icon_32x32.png|32"
  "icon_32x32@2x.png|64"
  "icon_128x128.png|128"
  "icon_128x128@2x.png|256"
  "icon_256x256.png|256"
  "icon_256x256@2x.png|512"
  "icon_512x512.png|512"
  "icon_512x512@2x.png|1024"
)
for entry in "${ENTRIES[@]}"; do
  name="${entry%%|*}"
  size="${entry##*|}"
  sips -z "$size" "$size" "$BASE" --out "$ICONSET/$name" >/dev/null
done

echo "→ Compiling to icns"
iconutil -c icns "$ICONSET" -o "$OUT_DIR/icon.icns"

# Cleanup intermediates; keep only the final .icns in source control.
rm -rf "$ICONSET" "$BASE"

SIZE=$(ls -lh "$OUT_DIR/icon.icns" | awk '{print $5}')
echo "✓ Icon generated: $OUT_DIR/icon.icns ($SIZE)"
