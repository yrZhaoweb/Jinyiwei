#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="${1:-}"
shift_count=0
if [ $# -gt 0 ]; then
  shift_count=1
fi

cd "${ROOT}"
node ./scripts/sync-skills-manifest.mjs
node ./scripts/validate-jinyiwei.mjs

if [ -n "${WORKSPACE}" ]; then
  shift "${shift_count}"
  node "${ROOT}/scripts/install-openclaw.mjs" --workspace "${WORKSPACE}" "$@"
else
  node "${ROOT}/scripts/install-openclaw.mjs" "$@"
fi
