#!/bin/sh
# Renders scripts/team-icon.html to team/icons/*.png with headless Chrome at 512px, then sips
# downsamples the smaller sizes. Run from anywhere: sh scripts/team-icon.sh
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=team/icons; mkdir -p "$OUT"
# The wordmark comes from Google Fonts. Offline, Chrome would quietly fall back to a generic
# serif and still write a screenshot, so refuse to render rather than ship a different icon.
curl -fsS -o /dev/null "https://fonts.googleapis.com/css2?family=DM+Serif+Display" \
  || { echo "team-icon.sh: cannot reach fonts.googleapis.com — DM Serif Display would fall back. Aborting." >&2; exit 1; }
shot() { # $1 = hash ('' or '#maskable'), $2 = output
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=512,512 \
    --virtual-time-budget=4000 --screenshot="$2" "file://$PWD/scripts/team-icon.html$1" 2>/dev/null
}
shot ''          "$OUT/icon-512.png"
shot '#maskable' "$OUT/maskable-512.png"
for n in 192 180; do sips -Z $n "$OUT/icon-512.png" --out "$OUT/icon-$n.png" >/dev/null; done
ls -la "$OUT"
