#!/usr/bin/env bash
# Regenerate the static Open Graph cards from assets/og/_template.svg.
#
# Why static PNGs and not next/og: the authority pages are fully static (○ in the
# build output) and deploy to Cloudflare Workers via OpenNext. Committing the
# rendered cards keeps the edge bundle free of satori/resvg and makes the social
# preview byte-identical across deploys.
#
# Requires: rsvg-convert (brew install librsvg)
set -euo pipefail

cd "$(dirname "$0")/.."
TPL="assets/og/_template.svg"
OUT="public/assets/og"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

# name|kicker|line1|line2|subline|footer
CARDS=(
"og-default|STANAG 6001 / SLP|Stop guessing.|Start measuring.|Reading · Listening · Writing · Speaking, at Levels 2 and 3.|Independent educational platform. Not NATO. Not an official exam."
"og-stanag|THE STANDARD|What STANAG 6001|actually is.|A NATO proficiency standard — not one official exam paper.|Independent educational platform. Not NATO. Not an official exam."
"og-levels|LEVELS 2 AND 3|A profile is four|digits, not an average.|Listening · Speaking · Reading · Writing, measured separately.|Independent educational platform. Not NATO. Not an official exam."
"og-guides|GUIDES|Good English.|Wrong task. Zero.|What SLP examiners rate, and where candidates lose marks.|Independent educational platform. Not NATO. Not an official exam."
"og-es|EXAMEN SLP|Deja de suponer.|Empieza a medir.|Comprensión, expresión oral, lectura y escritura. Niveles 2 y 3.|Recurso independiente. No afiliado a la OTAN ni a ningún organismo oficial."
)

for card in "${CARDS[@]}"; do
  IFS='|' read -r name kicker line1 line2 sub foot <<< "$card"
  sed -e "s|__KICKER__|${kicker}|g" \
      -e "s|__LINE1__|${line1}|g" \
      -e "s|__LINE2__|${line2}|g" \
      -e "s|__SUB__|${sub}|g" \
      -e "s|__FOOT__|${foot}|g" \
      "$TPL" > "$TMP/$name.svg"
  rsvg-convert -w 1200 -h 630 "$TMP/$name.svg" -o "$OUT/$name.png"
  echo "  built $OUT/$name.png"
done

echo "Open Graph cards rebuilt (1200x630)."
