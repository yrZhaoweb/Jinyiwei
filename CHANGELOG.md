# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-03-20

### Added

- **i18n support** — CLI output in English (`en`) and Chinese (`zh`), controlled by `JINYIWEI_LANG` env variable
- **`jinyiwei init` command** — interactive governance configuration (bossTitle, watchSelfTitle, approvalMode)
- **Unit tests** — 23 tests using `node:test` covering `parseSkillsList`, `i18n`, and all validators
- **Modular validators** — split monolithic `validate-jinyiwei.mjs` into `lib/validators/*.mjs` modules
- **CLI command modules** — extracted `install`, `uninstall`, `status`, `init` into `lib/commands/*.mjs`
- **Exit code constants** — standardized exit codes (`lib/exit-codes.mjs`)
- **Version sync** — `scripts/sync-version.mjs` + `prepublishOnly` hook to keep `openclaw.plugin.json` in sync with `package.json`
- **README.zh-CN.md** — full Chinese documentation
- **CHANGELOG.md** — this file
- **Mermaid architecture diagram** in README
- **Configuration table** in README documenting all `configSchema` parameters
- **Badges** — npm version, CI status, license, Node.js version

### Changed

- **`openclaw-plugin.js`** — reads config from `api.getConfig()` instead of hardcoding values
- **`parse-skills.mjs`** — structural header detection (separator-based) instead of Chinese string matching
- **`bin/jinyiwei.mjs`** — slimmed down to a dispatcher; logic moved to `lib/commands/`
- **`scripts/validate-jinyiwei.mjs`** — now composes modular validators instead of inline assertions
- **README.md** — corrected package name to `@yrzhao/jinyiwei`, added Why/Architecture/Configuration/Contributing sections

### Fixed

- **Quick Start** in README referenced wrong package name (`jinyiwei` instead of `@yrzhao/jinyiwei`)

## [0.3.0] - 2026-03-19

### Added

- Initial public release on npm
- CLI with `install`, `uninstall`, `validate`, `sync`, `status` commands
- OpenClaw plugin manifest and runtime entry
- Full governance rule set, agent charters, and structured templates
- 48 preinstalled skills
- GitHub Actions CI validation
