#!/usr/bin/env bash
# Build the installable extension zip (same layout as `gnome-extensions pack`)
# without needing GNOME Shell installed — used locally and by the release workflow.
set -euo pipefail
cd "$(dirname "$0")/.."

UUID="$(python3 -c 'import json; print(json.load(open("extension/metadata.json"))["uuid"])')"
OUT="dist/${UUID}.shell-extension.zip"

mkdir -p dist
rm -f "$OUT"
(
    cd extension
    zip -q -r "../$OUT" \
        metadata.json extension.js prefs.js stylesheet.css \
        schemas \
        lib \
        -x '*/.*' 'schemas/gschemas.compiled'
)
echo "$OUT"
