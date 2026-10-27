#!/usr/bin/env bash
# Caveat, SIL OFL 1.1. Requires curl and fontTools with Brotli support.
set -euo pipefail
cd "$(dirname "$0")/.."
font_tmp=$(mktemp -d)
trap 'rm -rf "$font_tmp"' EXIT
curl -fL 'https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/caveat/Caveat%5Bwght%5D.ttf' -o "$font_tmp/Caveat.ttf"
curl -fL 'https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/caveat/OFL.txt' -o assets/fonts/OFL.txt
# Only the two accent lines need this face; the heart uses the system font.
fonttools varLib.instancer "$font_tmp/Caveat.ttf" wght=600 --output "$font_tmp/Caveat-600.ttf"
pyftsubset "$font_tmp/Caveat-600.ttf" --text='hi there!thanks for stopping by' --layout-features='kern,liga' --flavor=woff2 --output-file=assets/fonts/caveat-latin.woff2
