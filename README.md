# Jinyiwei

Jinyiwei is an OpenClaw-only governance plugin and markdown charter pack.

Its job is to configure OpenClaw with a strict hierarchy:

- `ChatAgent` and `WatchAgent` are the only Boss-facing agents
- both `ChatAgent` and `WatchAgent` must call the user `Boss`
- `WatchAgent` must call itself `锦衣卫`
- only `ChatAgent` and `WatchAgent` may connect to Feishu, Telegram, or other Boss-facing channels
- all other agents are internal-only and governed by markdown charters

## Project Layout

- `openclaw.plugin.json`: OpenClaw plugin manifest
- `openclaw-plugin.js`: plugin runtime entry
- `skills/jinyiwei-governance/SKILL.md`: top-level governance skill
- `agents/*/AGENT.md`: per-agent charter files
- `rules/*.md`: global enforcement rules
- `skills_list.md`: source list of bundled skills
- `manifests/preinstalled-skills.json`: generated install manifest
- `scripts/install.sh`: install Jinyiwei into OpenClaw

## Install Into OpenClaw

Install the plugin and auto-install the listed skills into an OpenClaw workspace:

```bash
./scripts/install.sh /path/to/openclaw/workspace
```

Dry-run the generated install plan:

```bash
node ./scripts/install-openclaw.mjs --dry-run --workspace /path/to/openclaw/workspace
```

Refresh the skills manifest from `skills_list.md`:

```bash
node ./scripts/sync-skills-manifest.mjs
```

Validate the required markdown and manifest files:

```bash
node ./scripts/validate-jinyiwei.mjs
```

## Governance Rules

- Boss enters through `ChatAgent` or `WatchAgent`
- `WatchAgent` must approve every action
- internal agents may not address Boss directly
- every action must be justified by markdown control files
- installing Jinyiwei also installs the skills listed in `skills_list.md`

## Preinstalled Skills

The root file `skills_list.md` is parsed into `manifests/preinstalled-skills.json`. The current list contains 48 skills and is installed during OpenClaw bootstrap.

