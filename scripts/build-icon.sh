#!/usr/bin/env bash
#
# Genera assets/icon.icns desde assets/source/brand-icon.png.
# El logo oficial de Entaina (marco + puntos People/Technology/Innovation,
# idéntico a design-system.entaina.ai/brand/icon.png) se escala a 880px de
# lado mayor, se paddea a 1024×1024 con fondo Golden Tainoi 200 (#f8cf73,
# pilar People del Design System) y se expande a las 10 resoluciones que
# Apple requiere para un iconset.
#
# Idempotente. Reejecutable sin efectos colaterales.
#
# Deps: sips + iconutil (ambos nativos de macOS, sin instalar nada).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC="$REPO_ROOT/assets/source/brand-icon.png"
OUT_DIR="$REPO_ROOT/assets"
ICONSET="$OUT_DIR/icon.iconset"
BASE="$OUT_DIR/icon-1024.png"
RESAMPLED="$OUT_DIR/icon-resampled.png"
BG="F8CF73"  # Golden Tainoi 200 — pilar People del Design System

if [[ ! -f "$SRC" ]]; then
  echo "✗ Source image not found: $SRC" >&2
  exit 1
fi

mkdir -p "$OUT_DIR" "$ICONSET"

echo "→ Resample $SRC to 880px long edge"
sips -s format png --resampleHeightWidthMax 880 \
  "$SRC" --out "$RESAMPLED" >/dev/null

echo "→ Pad to 1024×1024 with bg #$BG"
sips -s format png --padToHeightWidth 1024 1024 --padColor "$BG" \
  "$RESAMPLED" --out "$BASE" >/dev/null

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
rm -rf "$ICONSET" "$BASE" "$RESAMPLED"

SIZE=$(ls -lh "$OUT_DIR/icon.icns" | awk '{print $5}')
echo "✓ Icon generated: $OUT_DIR/icon.icns ($SIZE)"
