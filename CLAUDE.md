# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Jinyiwei

Jinyiwei (WatchAgent) is a governance plugin for OpenClaw multi-agent systems. It enforces a strict, auditable agent hierarchy where ChatAgent and WatchAgent face the user, internal agents are organized into groups (dev, content, etc.), all actions require approval via WatchAgent, and governance rules are defined as markdown files validated by CI.

## Commands

```bash
npm test                    # Run all tests (node:test, sequential)
npm run validate            # Run all validators (files, skills, plugin, config, groups, charters, rules, templates, version)
npm run sync:skills         # Parse skills_list.md → manifests/preinstalled-skills.json
npm run sync:version        # Sync version from package.json → openclaw.plugin.json
node bin/jinyiwei.mjs <cmd> # Run CLI directly (see below)
```

CLI commands: `install`, `setup` (beginner-friendly), `configure`, `doctor`, `verify`, `start-guide`, `uninstall`, `validate`, `sync`, `status`, `init`, `help`.

Run a single test file:
```bash
node --test test/validators.test.mjs
```

## Architecture

**Zero external dependencies.** Pure ES Modules (`"type": "module"`), Node.js 18+.

### Path resolution

All file access uses `resolve(relativePath)` from `lib/paths.mjs`, which resolves relative to the project root (via `import.meta.url`). Never use `process.cwd()` for locating project files.

### Agent hierarchy

- **External agents** (`agents/chat/`, `agents/watch/`) — face the user, not grouped
- **Internal agent groups** (`agents/groups/<groupName>/<agentId>/AGENT.md`) — organized by business domain
  - `dev` group: CodeAgent, ReviewAgent, TestAgent
  - `content` group: UIAgent
  - New groups are added by creating directories under `agents/groups/`

### Configuration

User configuration lives in `jinyiwei.config.json` (not in `openclaw.plugin.json`). Key fields:
- `bossTitle`, `watchSelfTitle`, `approvalMode`
- `models.chat`, `models.watch` — LLM model per external agent
- `models.groups.<name>` — LLM model per agent group
- `externalChannels` — which channels external agents can access

`lib/config.mjs` handles loading, validation, writing, and model resolution.

### CLI flow

`bin/jinyiwei.mjs` → dispatches to command modules in `lib/commands/` → commands use validators from `lib/validators/` and utilities from `lib/`. All user-facing strings go through `t("key", {params})` from `lib/i18n.mjs` (flat dot-notation keys, `{param}` interpolation).

### Key modules

- **`lib/config.mjs`** — loads/validates/writes `jinyiwei.config.json`, resolves model per agent
- **`lib/groups.mjs`** — discovers agent groups from directory structure, builds agent registry
- **`lib/openclaw.mjs`** — wraps all `openclaw` CLI calls (agents add/delete/bind, models set, plugins install/enable/disable/uninstall)
- **`lib/commands/`** — install (8-step: config→groups→sync→validate→plugin→agents→channels→skills), uninstall, validate, sync, status, init (interactive), setup (beginner-friendly), configure (models/channels/entry), doctor (diagnostics), verify (governance readiness), start-guide (first-run)
- **`lib/validators/`** — modular validators each returning `{ ok, errors/missing }`: files, skills, plugin, config, groups, charters, rules, templates, version. Validators use a custom `assert(condition, message, errors)` (in `validators/assert.mjs`) that pushes to an errors array instead of throwing — this is how the "collect all errors" pattern works. **`lib/validators/registry.mjs`** registers all validators; **`lib/validators/run-all.mjs`** runs them in collection mode.
- **`lib/governance/`** — governance engine: **`action-catalog.mjs`** (parse/load action definitions), **`constants.mjs`** (field schemas, required files, default config), **`contracts.mjs`** (required governance files), **`policy.mjs`** (dispatch packet validation and review), **`runtime-registry.mjs`** (runtime agent registry), **`documents.mjs`** / **`render.mjs`** (template loading and rendering), **`summary.mjs`** (governance summary).
- **`lib/i18n.mjs`** + **`lib/i18n/`** — locale detection (JINYIWEI_LANG > LC_ALL > LANG), `t("key", {params})` interpolation, en/zh locales
- **`lib/log.mjs`** — zero-dep colored output, respects NO_COLOR/FORCE_COLOR
- **`lib/paths.mjs`** — path resolution via `import.meta.url`
- **`lib/exit-codes.mjs`** — OK=0, VALIDATION_FAIL=1, INSTALL_FAIL=2, USER_ERROR=3, PARTIAL_FAIL=4
- **`lib/parse-skills.mjs`** — parses markdown table from `skills_list.md`
- **`lib/lifecycle.mjs`** — OpenClaw lifecycle utilities: `listOpenClawAgents()`, `loadOpenClawChannelState()`, `resolveChannelBindings()`, `bindAgentChannels()`, `unbindAgentChannels()`, `buildBeginnerSummary()`, `buildInstallNextSteps()`
- **`lib/openclaw-state.mjs`** — OpenClaw state management
- **`lib/diagnostics.mjs`** — diagnostic checks for doctor command
- **`lib/runtime-documents.mjs`** — runtime governance document handling
- **`lib/agent-models.mjs`** — agent model resolution

### OpenClaw integration

Install calls real OpenClaw CLI commands via `lib/openclaw.mjs`:
- `openclaw agents add <name> --model <id> --workspace <dir> --non-interactive` — registers each agent
- `openclaw models set <model> --agent <id>` — configures LLM model per agent
- `openclaw plugins install/enable` — registers the Jinyiwei plugin

### Plugin runtime

- **`openclaw.plugin.json`** — minimal manifest (id, name, version, skills)
- **`openclaw-plugin.js`** — runtime entry point, registers governance tools via `api.registerTool()`:
  - `jinyiwei_dispatch` — ChatAgent creates dispatch packets
  - `jinyiwei_approve` — WatchAgent approves packets
  - `jinyiwei_reject` — WatchAgent rejects packets
  - `jinyiwei_audit` — records audit entries

### Governance content (markdown-as-code)

- **`agents/`** — agent charters (AGENT.md files for chat, watch, and grouped internal agents)
- **`rules/`** — governance rules (addressing, action-catalog, approval-matrix, etc.)
- **`templates/`** — structured output templates (dispatch packets, approvals, rejections, audit entries)
- **`skills/`** — bundled OpenClaw skills (jinyiwei-governance)

## Conventions

- All commands support `--json` for machine-readable output
- install/uninstall support `--dry-run` and `--fail-fast`
- install has 8 steps: config→groups→sync→validate→plugin→agents→channels→skills (step 7 binds external channels where OpenClaw has accounts)
- Validators collect all errors before reporting (never fail-fast by default); use `--fail-fast` to stop on first error
- Version must stay in sync between `package.json` and `openclaw.plugin.json` (enforced by `version` validator)
- Skills manifest (`manifests/preinstalled-skills.json`) is auto-generated — edit `skills_list.md` instead
- `prepublishOnly` runs sync:version → sync:skills → validate — CI and `npm publish` both enforce consistency
- CI ordering matters: sync must run before validate (sync generates the manifest that validate checks)
- Tests use `node:test` with `assert` — no test framework dependencies
- CI runs on Node 18, 20, 22 via `.github/workflows/validate.yml`
- New agent groups are added by creating `agents/groups/<name>/<agentId>/AGENT.md` directories — `discoverGroups()` picks them up automatically
- Model assignments are per-group, not per-agent — all agents in a group share the same model
- `--set-default-entry <agent>` and `--keep-main` are install/setup options to control the OpenClaw default entry point

## Project Review Process

See `.claude/ECC_REVIEW_PROCESS.md` for the full review workflow. Quick reference:

```bash
# Baseline check (before any review)
npm test && npm run validate
```

| Jinyiwei Agent | ECC Agent | Focus Area |
|---------------|-----------|------------|
| ChatAgent | `planner` / `architect` | Architecture & planning |
| WatchAgent | `security-reviewer` | Security & risk |
| CodeAgent | `code-reviewer` | Code quality |
| ReviewAgent | `refactor-cleaner` | Refactoring |
| TestAgent | `tdd-guide` | Test coverage |
| — | `devops-automator` | CI/CD |
| — | `doc-updater` | Documentation |

Quick review commands: see `.claude/REVIEW_COMMANDS.md`
