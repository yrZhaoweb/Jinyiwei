# Audit Entry Template

```md
# Jinyiwei Audit Entry

- `audit_id`: JYW-AUD-<YYYYMMDD>-<sequence>
- `packet_id`: JYW-<YYYYMMDD>-<sequence>
- `decision_id`: JYW-DEC-<YYYYMMDD>-<sequence>
- `acting_agent`: <ChatAgent|WatchAgent|UIAgent|CodeAgent|ReviewAgent|TestAgent>
- `action_type`: <see rules/action-catalog.md>
- `risk_level`: <low|medium|high>
- `rationale`: <why this action was taken>
- `supervising_decision`: <approve|reject|escalate>
- `timestamp`: <ISO 8601>
- `output_or_rejection`: <summary of result or rejection reason>
```
