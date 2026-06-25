#!/usr/bin/env bash
# bump-version.sh — command-dsl plugin sürümünü plugin.json + marketplace.json'da SENKRON bumplar.
# Tek doğru kaynak = plugin.json; yeni sürüm İKİSİNE de yazılır (CONVENTIONS.md §8: senkron tutulur).
# Kullanım: scripts/bump-version.sh <major|minor|patch>
#   major → elle çıkış kapağı (post-commit otomatiği major bumplamaz).
set -euo pipefail

LEVEL="${1:-}"
case "$LEVEL" in
  major|minor|patch) ;;
  *) echo "kullanım: $(basename "$0") <major|minor|patch>" >&2; exit 2 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_JSON="$REPO_ROOT/plugins/command-dsl/.claude-plugin/plugin.json"
MARKET_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"

for f in "$PLUGIN_JSON" "$MARKET_JSON"; do
  [ -f "$f" ] || { echo "bump: dosya yok: $f" >&2; exit 1; }
done

CUR="$(grep -Eo '"version"[[:space:]]*:[[:space:]]*"[0-9]+\.[0-9]+\.[0-9]+"' "$PLUGIN_JSON" \
       | head -1 | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' || true)"
[ -n "$CUR" ] || { echo "bump: $PLUGIN_JSON içinde sürüm bulunamadı" >&2; exit 1; }

IFS='.' read -r MA MI PA <<EOF
$CUR
EOF
case "$LEVEL" in
  major) MA=$((MA + 1)); MI=0; PA=0 ;;
  minor) MI=$((MI + 1)); PA=0 ;;
  patch) PA=$((PA + 1)) ;;
esac
NEW="$MA.$MI.$PA"

# Yalnızca sürüm satırını cerrahi olarak değiştir (formatlama/diff korunur; jq tüm dosyayı reformat ederdi).
for f in "$PLUGIN_JSON" "$MARKET_JSON"; do
  NEW="$NEW" perl -i -pe 's/("version"\s*:\s*")\d+\.\d+\.\d+(")/$1 . $ENV{NEW} . $2/e' "$f"
done

# Doğrula: ikisi de yeni sürümde mi?
for f in "$PLUGIN_JSON" "$MARKET_JSON"; do
  grep -q "\"version\"[[:space:]]*:[[:space:]]*\"$NEW\"" "$f" \
    || { echo "bump: $f yazılamadı (beklenen $NEW)" >&2; exit 1; }
done

echo "bump: $CUR -> $NEW ($LEVEL) — plugin.json + marketplace.json senkron"
