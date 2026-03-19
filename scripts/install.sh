#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="${1:-}"

cd "${ROOT}"
node ./scripts/sync-skills-manifest.mjs
node ./scripts/validate-jinyiwei.mjs

if [ -n "${WORKSPACE}" ]; then
  node "${ROOT}/scripts/install-openclaw.mjs" --workspace "${WORKSPACE}"
else
  node "${ROOT}/scripts/install-openclaw.mjs"
fi
