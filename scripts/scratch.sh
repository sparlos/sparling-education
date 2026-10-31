#!/usr/bin/env bash
# Warm scratch copy of the repo for the Linux sandbox. See AGENTS.md.
#
#   scripts/scratch.sh                 sync source, install only if the lockfile changed
#   scripts/scratch.sh <cmd...>        sync, then run <cmd> inside the copy
#   scripts/scratch.sh --clean         delete the copy and store (frees ~1 GB)
#
# The copy lives outside the repo, under $SCRATCH_ROOT (default ~/scratch/edtech),
# and survives between sessions. Never run from the Mac host.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="${SCRATCH_ROOT:-$HOME/scratch/edtech}"
COPY="$ROOT/repo"
STORE="$ROOT/store"
STAMP="$ROOT/.lockfile-hash"

if [ "${1:-}" = "--clean" ]; then
  rm -rf "$ROOT"
  echo "removed $ROOT"
  exit 0
fi

if [ "$(uname -s)" != "Linux" ]; then
  echo "scratch.sh is for the Linux sandbox only (running on $(uname -s))" >&2
  exit 1
fi

mkdir -p "$COPY"
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude .turbo --exclude dist \
  --exclude .next --exclude .venv \
  "$SRC/" "$COPY/"

want="$(sha256sum "$SRC/pnpm-lock.yaml" | cut -d' ' -f1)"
have="$(cat "$STAMP" 2>/dev/null || true)"
if [ ! -d "$COPY/node_modules" ] || [ "$want" != "$have" ]; then
  echo "installing (lockfile changed or first run)..." >&2
  (cd "$COPY" && pnpm install --frozen-lockfile --store-dir "$STORE")
  echo "$want" > "$STAMP"
fi

if [ $# -gt 0 ]; then
  cd "$COPY"
  exec "$@"
fi
echo "$COPY"
