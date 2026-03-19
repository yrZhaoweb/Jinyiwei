#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT}"
node ./scripts/sync-skills-manifest.mjs
node ./scripts/validate-jinyiwei.mjs

node "${ROOT}/scripts/install-openclaw.mjs" "$@"
