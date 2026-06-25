#!/usr/bin/env bash
# install-hooks.sh — git hook'larını etkinleştirir (core.hooksPath=.githooks).
# Klon/çekme sonrası BİR KEZ çalıştır. Hook'lar versiyon kontrollü (.githooks/), .git/hooks değil.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$REPO_ROOT" config core.hooksPath .githooks
chmod +x "$REPO_ROOT"/.githooks/* "$REPO_ROOT"/scripts/*.sh
echo "hook kuruldu: core.hooksPath=.githooks — post-commit auto-bump aktif"
