# Action Catalog Rule

## Purpose

`WatchAgent` must classify every requested action with this catalog before applying the approval matrix.

## Action Types

| action_type | owner | class | default risk | default decision |
|---|---|---|---|---|
| `channel.receive_boss_message` | ChatAgent | channel | medium | approve with record |
| `channel.send_boss_update` | ChatAgent, WatchAgent | channel | medium | approve with record |
| `approval.review_action` | WatchAgent | governance | low | approve and record |
| `audit.record_event` | WatchAgent | governance | low | approve and record |
| `report.generate_summary` | ChatAgent, WatchAgent | reporting | low | approve and record |
| `plugin.install_jinyiwei` | ChatAgent | installation | medium | approve with record |
| `plugin.enable_jinyiwei` | ChatAgent | installation | medium | approve with record |
| `skill.install_single` | ChatAgent | installation | low | approve and record |
| `skill.install_batch` | ChatAgent | installation | medium | approve with record |
| `config.update_operational` | ChatAgent | configuration | medium | approve with record |
| `dispatch.send_to_internal_agent` | ChatAgent | workflow | low | approve and record |
| `charter.change_agent_md` | ChatAgent | governance-change | high | block by default |
| `rule.change_governance_md` | ChatAgent | governance-change | high | block by default |
| `channel.expand_external_access` | ChatAgent | governance-change | high | block by default |
| `watch.disable_review_gate` | ChatAgent | governance-change | high | block by default |

## Enforcement

- Any `action_type` not listed here must be rejected
- `WatchAgent` may not downgrade a listed high-risk governance-change action
- `ChatAgent` should choose the most specific action type available

