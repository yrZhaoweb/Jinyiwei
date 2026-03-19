# Dispatch Rule

1. Boss enters through `ChatAgent` or `WatchAgent`
2. `ChatAgent` structures the request
3. `ChatAgent` emits a dispatch packet based on `templates/dispatch-packet.md`
4. `WatchAgent` classifies the packet's `action_type` using `rules/action-catalog.md`
5. `WatchAgent` approves or rejects the next action
6. Internal agents execute only after approval
7. Internal outputs return to `ChatAgent`
8. Boss-facing responses come only from `ChatAgent` or `WatchAgent`

## Required Dispatch Packet Fields

- `packet_id`
- `requested_by`
- `target_agent`
- `action_type`
- `risk_hint`
- `goal`
- `scope`
- `inputs`
- `constraints`
- `expected_outputs`
- `approval_route`
- `audit_requirements`
- `fallback_on_reject`
