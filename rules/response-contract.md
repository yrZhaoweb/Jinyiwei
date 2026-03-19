# Response Contract Rule

## Approval Decisions

`WatchAgent` must issue approval decisions using `templates/approval-decision.md`.

Required fields:

- `decision_id`
- `packet_id`
- `action_type`
- `risk_level`
- `decision`
- `reason`
- `required_follow_up`
- `reported_to_boss`

## Rejection Decisions

`WatchAgent` must issue rejection decisions using `templates/rejection-decision.md`.

## Audit Entries

Every action must be logged using `templates/audit-entry.md`.

## Internal Agent Responses

Each internal agent must use its assigned template:

- `UIAgent`: `templates/responses/ui-agent-response.md`
- `CodeAgent`: `templates/responses/code-agent-response.md`
- `ReviewAgent`: `templates/responses/review-agent-response.md`
- `TestAgent`: `templates/responses/test-agent-response.md`

## Closed-Loop Requirement

- every internal response must include the originating `packet_id`
- every internal response must identify the `source_agent`
- every internal response must list `handoff_to`
- every internal response must be auditable by `WatchAgent`
