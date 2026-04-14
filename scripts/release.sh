#!/usr/bin/env bash
#
# Release a new version of Contextura — BREAK-GLASS FALLBACK.
#
# ⚠️  PREFER the GitHub Actions release workflow (.github/workflows/release.yml).
#     Use this script ONLY when Actions is unavailable or for bootstrapping.
#     See docs/release.md for the normal flow.
#
# This script does NOT update CHANGELOG.md. If you use it, edit the changelog
# by hand before or after releasing.
#
# Usage:
#   ./scripts/release.sh patch       # 0.1.0 → 0.1.1  (default)
#   ./scripts/release.sh minor       # 0.1.0 → 0.2.0
#   ./scripts/release.sh major       # 0.1.0 → 1.0.0
#   ./scripts/release.sh --no-bump   # Publish current package.json version as-is (used for the very first release)
#
# Prerequisites:
#   - macOS with Xcode Command Line Tools (for git + iconutil)
#   - `security add-generic-password -a contextura -s github-release-token -w <GH_TOKEN>`
#     Token must have `repo` scope and write access to Entaina/contextura
#   - Clean git working tree
#   - node_modules installed (`npm install`)
#   - assets/icon.icns present (run `./scripts/build-icon.sh` once)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

MODE="${1:-patch}"

# --- Sanity checks ---------------------------------------------------------

if [[ -n "$(git status --porcelain .)" ]]; then
  echo "✗ Working tree is not clean."
  echo "  Commit or stash before releasing — electron-builder needs a deterministic snapshot."
  git status --short .
  exit 1
fi

if [[ ! -f assets/icon.icns ]]; then
  echo "✗ assets/icon.icns missing. Run ./scripts/build-icon.sh first."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "✗ node_modules missing. Run 'npm install' first."
  exit 1
fi

# --- Load GH_TOKEN from macOS Keychain ------------------------------------

if ! GH_TOKEN=$(security find-generic-password -a contextura -s github-release-token -w 2>/dev/null); then
  cat >&2 <<'EOF'
✗ GH_TOKEN not found in macOS Keychain.

One-time setup:
  1. Create a personal access token at https://github.com/settings/tokens
     with scope: repo
  2. Store it:
       security add-generic-password \
         -a contextura \
         -s github-release-token \
         -w ghp_xxxxxxxxxxxxxxxxxxxx

Then rerun this script.
EOF
  exit 1
fi
export GH_TOKEN

# --- Bump version ----------------------------------------------------------

if [[ "$MODE" != "--no-bump" ]]; then
  echo "→ Bumping version ($MODE)"
  # Manual bump + commit (instead of `npm version`) so we control the
  # commit message format and avoid npm's default tagging behaviour.
  CURRENT=$(node -p "require('./package.json').version")
  NEXT=$(node -p "
    const semver = require('semver') || null;
    const v='$CURRENT'.split('.').map(Number);
    const [major,minor,patch]=v;
    const m='$MODE';
    const r = m==='major'?[major+1,0,0] : m==='minor'?[major,minor+1,0] : [major,minor,patch+1];
    r.join('.')
  " 2>/dev/null || node -e "
    const v='$CURRENT'.split('.').map(Number);
    const [major,minor,patch]=v;
    const m='$MODE';
    const r = m==='major'?[major+1,0,0] : m==='minor'?[major,minor+1,0] : [major,minor,patch+1];
    console.log(r.join('.'));
  ")

  # Update package.json in place
  node -e "
    const fs=require('fs');
    const p=JSON.parse(fs.readFileSync('package.json','utf-8'));
    p.version='$NEXT';
    fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
  "
  # Also bump package-lock.json root version
  node -e "
    const fs=require('fs');
    const p=JSON.parse(fs.readFileSync('package-lock.json','utf-8'));
    p.version='$NEXT';
    if (p.packages && p.packages['']) p.packages[''].version='$NEXT';
    fs.writeFileSync('package-lock.json', JSON.stringify(p,null,2)+'\n');
  "

  git add package.json package-lock.json
  git commit -m "chore(contextura): release v$NEXT"
  git tag "v$NEXT"
fi

VERSION=$(node -p "require('./package.json').version")
echo ""
echo "→ Releasing Contextura v$VERSION"
echo "  target: https://github.com/Entaina/contextura/releases/tag/v$VERSION"
echo ""

# --- Build + publish -------------------------------------------------------

npm run dist -- --publish always

# --- Push source commit/tag back to the code repo -------------------------

if [[ "$MODE" != "--no-bump" ]]; then
  echo ""
  echo "→ Pushing version commit + tag to origin"
  git push
  git push --tags
fi

cat <<EOF

✓ Released Contextura v$VERSION
  → https://github.com/Entaina/contextura/releases/tag/v$VERSION
  → Installed clients on older versions will auto-update within ~6h
  → For immediate testing, quit and relaunch the installed app
EOF
