# Dispatch Packet Template

```md
# Jinyiwei Dispatch Packet

- `packet_id`: JYW-<YYYYMMDD>-<sequence>
- `requested_by`: Boss
- `target_agent`: <ChatAgent|WatchAgent|UIAgent|CodeAgent|ReviewAgent|TestAgent>
- `action_type`: <see rules/action-catalog.md>
- `risk_hint`: <low|medium|high>

## `goal`

<one clear objective>

## `scope`

- in scope: <items>
- out of scope: <items>

## `inputs`

- source_message: <summary>
- referenced_rules:
  - rules/addressing.md
  - rules/action-catalog.md
  - rules/approval-matrix.md
  - rules/dispatch.md
- referenced_charters:
  - <target charter path>

## `constraints`

- Boss-facing communication allowed: <yes/no>
- external channels allowed: <yes/no>
- governance markdown changes allowed: <yes/no>
- must pass WatchAgent before execution: yes

## `expected_outputs`

- primary: <artifact>
- secondary: <artifact>

## `approval_route`

- ChatAgent -> WatchAgent -> <target_agent>

## `audit_requirements`

- log packet_id
- log action_type
- log risk level
- log approval decision

## `fallback_on_reject`

- return rejection reason to ChatAgent
- escalate to Boss if policy violation or governance conflict
```
