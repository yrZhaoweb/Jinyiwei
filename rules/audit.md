# Audit Rule

Every action must be logged using `templates/audit-entry.md`.

Required fields:

- acting agent
- requested action
- action type
- packet id
- decision id
- risk level
- rationale
- supervising decision
- timestamp
- output or rejection note

If an action cannot be logged, it must not run.
