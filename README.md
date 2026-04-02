# Jinyiwei

[![npm version](https://img.shields.io/npm/v/@yrzhao/jinyiwei.svg)](https://www.npmjs.com/package/@yrzhao/jinyiwei)
[![CI](https://github.com/yrzhao/Jinyiwei/actions/workflows/validate.yml/badge.svg)](https://github.com/yrzhao/Jinyiwei/actions)
[![license](https://img.shields.io/npm/l/@yrzhao/jinyiwei.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@yrzhao/jinyiwei.svg)](./package.json)

[中文文档](./README.zh-CN.md)

> Governance, supervision, and markdown-controlled agent hierarchy for OpenClaw.

## Why Jinyiwei?

Multi-agent systems without governance quickly become chaotic — agents talk to users freely, bypass approval, and make unauditable decisions. **Jinyiwei** (锦衣卫, the imperial secret police) solves this by enforcing a strict, auditable hierarchy:

- **Single entry point** — only `ChatAgent` and `WatchAgent` face the Boss (user)
- **Mandatory approval** — every action passes through `WatchAgent` before execution
- **Risk-graded control** — a hybrid approval matrix auto-approves low-risk work and escalates high-risk actions
- **Full audit trail** — every dispatch, approval, rejection, and result is logged with structured templates
- **Markdown-as-code** — all governance rules, agent charters, and templates are plain markdown files, version-controlled and validated by CI

## Beginner Path

If you do not know OpenClaw yet, use Jinyiwei like this:

```bash
npm install -g @yrzhao/jinyiwei
jinyiwei setup /path/to/openclaw/workspace
```

After setup, the recommended next commands are:

```bash
jinyiwei status
jinyiwei doctor
jinyiwei verify
jinyiwei start-guide
```

`setup` is the beginner-friendly path. `install` still exists for advanced or scripted installs.
By default, `setup` aligns the OpenClaw entry to `ChatAgent` so beginners can start there immediately. If you want to switch later, run `jinyiwei configure --set-default-entry chat`, `jinyiwei configure --set-default-entry watch`, or `jinyiwei configure --keep-main`.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                   👤 Boss                                    │
│                          (User / Feishu / Telegram)                          │
└──────────────────────────────────────────────────────────────────────────────┘
                    │ Request/Response                     ▲ Alert/Block
                    ▼                                      │
┌──────────────────────────────────────────────────────────────────────────────┐
│               ChatAgent                              WatchAgent              │
│          (Task Decomposition)                        (Supervision)           │
└──────────────────────────────────────────────────────────────────────────────┘
                    │ Dispatch                             ▲ Action Approval
                    ▼                                      │
┌──────────────────────────────────────────────────────────────────────────────┐
│ [AgentGroup1] R&D / Dev       [AgentGroup2] Content       [AgentGroup3] Data │
│ [AgentGroup4] Marketing       [AgentGroup5] Finance       [AgentGroup6] HR   │
│ [AgentGroup7] Legal           [AgentGroup8] Customer Svc  [AgentGroup9] Supp │
│ [AgentGroup10] Strategy       [AgentGroupN] Other                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Workflow

1. **Task Dispatch** — Boss → ChatAgent decomposes tasks → dispatches to Work Groups
2. **Action Supervision** — Each Agent's action → WatchAgent for approval
3. **Risk Control** — WatchAgent evaluates:
   - ✅ Low risk → Auto-approve
   - ⚠️ Medium risk → Alert Boss
   - 🛑 High risk → Block immediately
4. **Result Aggregation** — Results flow back through ChatAgent → Boss

## Quick Start

Install globally:

```bash
npm install -g @yrzhao/jinyiwei
jinyiwei setup /path/to/openclaw/workspace
```

Or use without installing:

```bash
npx @yrzhao/jinyiwei setup /path/to/openclaw/workspace
```

## CLI Commands

```
jinyiwei setup                 Beginner-friendly install + configure + verify flow
jinyiwei configure             Configure Jinyiwei models, channels, and entry points
jinyiwei doctor                Diagnose installation, agents, plugin, and channels
jinyiwei verify                Verify the governance flow is ready to use
jinyiwei start-guide           Show the first-run guide after setup
jinyiwei install <workspace>   Install Jinyiwei into an OpenClaw workspace
jinyiwei uninstall             Uninstall Jinyiwei plugin from OpenClaw
jinyiwei validate              Validate all governance files
jinyiwei sync                  Sync skills_list.md -> preinstalled-skills.json
jinyiwei status                Show plugin status and governance summary
jinyiwei init                  Interactive governance configuration
jinyiwei help                  Show help
```

Install options:

```
--dry-run        Show what would be done without making changes
--skip-plugin    Skip plugin install/enable steps
--skip-skills    Skip skill installation
--copy           Copy plugin files instead of symlinking
--fail-fast      Stop on first error
--json           Output machine-readable JSON
```

Examples:

```bash
jinyiwei setup /path/to/workspace                # recommended first run
jinyiwei doctor                                  # troubleshoot OpenClaw integration
jinyiwei verify                                  # confirm the governance flow
jinyiwei configure --set-default-entry chat      # switch the default OpenClaw entry to ChatAgent
jinyiwei install /path/to/workspace --dry-run    # preview changes
jinyiwei install /path/to/workspace --skip-skills # plugin only
jinyiwei uninstall                                # remove plugin
jinyiwei validate                                 # check governance integrity
jinyiwei status                                   # show current config
jinyiwei init                                     # configure interactively
jinyiwei start-guide                              # learn the first use flow
```

## Configuration

Jinyiwei's project-level governance config lives in `jinyiwei.config.json`. Run `jinyiwei setup` for the beginner-friendly path, `jinyiwei configure` or `jinyiwei init` for interactive changes, or edit the file directly. `openclaw.plugin.json` remains the plugin manifest and runtime schema exposed to OpenClaw.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `bossTitle` | `string` | `"Boss"` | How agents address the user |
| `watchSelfTitle` | `string` | `"锦衣卫"` | How WatchAgent introduces itself to Boss |
| `approvalMode` | `string` | `"hybrid"` | Approval policy: `strict`, `graded`, or `hybrid` |
| `externalChannels` | `string[]` | `["feishu", "telegram"]` | Allowed external communication channels |
| `models.chat` | `string` | `""` | Model used by `ChatAgent` |
| `models.watch` | `string` | `""` | Model used by `WatchAgent` |
| `models.groups.<name>` | `string` | `""` | Shared model per internal agent group |

### Localization

Set `JINYIWEI_LANG=zh` for Chinese CLI output, or `JINYIWEI_LANG=en` for English (default).

## Project Layout

```
bin/jinyiwei.mjs                  CLI entry point (slim dispatcher)
lib/
  commands/                       CLI command modules
    install.mjs                   install command
    uninstall.mjs                 uninstall command
    status.mjs                    status command
    init.mjs                      interactive init command
  validators/                     Modular validation logic
    files.mjs                     Required file checks
    skills.mjs                    Skills manifest sync check
    plugin.mjs                    Plugin config defaults check
    charters.mjs                  Agent charter validations
    rules.mjs                     Rule file validations
    templates.mjs                 Template field validations
  i18n.mjs                        i18n entry (en / zh)
  i18n/en.mjs                     English locale
  i18n/zh.mjs                     Chinese locale
  exit-codes.mjs                  Standard exit codes
  paths.mjs                       Shared path resolution
  parse-skills.mjs                skills_list.md parser
openclaw.plugin.json              OpenClaw plugin manifest
openclaw-plugin.js                Plugin runtime entry
skills/jinyiwei-governance/       Top-level governance skill
agents/*/AGENT.md                 Per-agent charter files
rules/*.md                        Global enforcement rules
templates/                        Structured output templates
  dispatch-packet.md              ChatAgent dispatch packet
  approval-decision.md            WatchAgent approval output
  rejection-decision.md           WatchAgent rejection output
  audit-entry.md                  Audit log entry
  responses/*.md                  Internal agent response templates
skills_list.md                    Source list of bundled skills
manifests/preinstalled-skills.json  Generated install manifest
test/                             Unit tests (node:test)
```

## Governance Rules

- Boss enters through `ChatAgent` or `WatchAgent`
- `WatchAgent` must approve every action
- Internal agents may not address Boss directly
- `ChatAgent` and `WatchAgent` must call the user `Boss`
- `WatchAgent` must call itself `锦衣卫`
- Approval policy is `hybrid`: channel and permission violations are hard-blocked, ordinary work is risk-graded
- `WatchAgent` uses an action catalog to classify concrete actions before approval
- `ChatAgent` must dispatch work with the standard dispatch packet template
- `WatchAgent` must respond with the standard approval decision template
- `WatchAgent` must issue rejections with the standard rejection decision template
- Every action must be logged with the standard audit entry template
- Every internal agent must return work with its own response template
- Every action must be justified by markdown control files
- Installing Jinyiwei also installs the skills listed in `skills_list.md`

## What Happens After Setup

Jinyiwei creates a visible governance layer around OpenClaw:

- `ChatAgent` receives user requests, breaks them down, and dispatches work
- `WatchAgent` reviews each dispatch and blocks unsafe or unsupported actions
- `CodeAgent`, `ReviewAgent`, `TestAgent`, and `UIAgent` stay internal and do not face the user directly
- `doctor` tells you what is misconfigured
- `verify` tells you whether the flow is ready for real use
- `start-guide` explains what to ask first if you are new
- `configure --set-default-entry chat` lets you bring OpenClaw back to the Jinyiwei entry flow at any time

For a complete usage guide from installation through daily operation, see **[USAGE_GUIDE.md](./USAGE_GUIDE.md)**.

## Preinstalled Skills

The root file `skills_list.md` is parsed into `manifests/preinstalled-skills.json`. The current list contains 48 skills and is installed during OpenClaw bootstrap.

## Validation

`jinyiwei validate` checks:

- Required plugin, skill, charter, rule, and template files exist
- `skills_list.md` matches `manifests/preinstalled-skills.json`
- Plugin defaults still enforce `Boss`, `锦衣卫`, `approvalMode=hybrid`, and external channel lockdown
- Action catalog and dispatch packet template remain present and referenced by rules
- Approval, rejection, audit, and internal response templates remain present and referenced by rules
- Agent charters still respect external-only and internal-only boundaries

## Development

```bash
npm test                # run unit tests
npm run validate        # run governance validation
npm run sync:skills     # sync skills_list.md -> manifest
npm run sync:version    # sync version to openclaw.plugin.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes — governance files are validated by CI
4. Run `npm test && npm run validate`
5. Open a pull request

## License

MIT
