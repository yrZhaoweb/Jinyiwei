# Markdown Control Rule

Every governed action must be justified by markdown control files.

Required control files:

- `agents/*/AGENT.md`
- `rules/*.md`
- `templates/*.md`
- `skills/jinyiwei-governance/SKILL.md`
- `manifests/preinstalled-skills.json`

If any required markdown file is missing, contradictory, or ignored, `WatchAgent` must stop the action and report it to Boss.

