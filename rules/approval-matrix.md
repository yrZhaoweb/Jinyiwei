# Approval Matrix Rule

## Default Policy

Jinyiwei uses the `hybrid` approval mode.

- Channel and permission violations are hard-blocked
- Markdown control violations are hard-blocked
- Ordinary work is evaluated with risk grading

## Hard-Block Actions

The following must be rejected immediately:

- any internal agent attempting Boss-facing communication
- any internal agent attempting Feishu or Telegram access
- any action outside the acting agent's charter
- any action lacking rationale or auditability
- any governance markdown change without explicit approval

## Risk-Graded Actions

### Low Risk

Examples:

- summarizing approved outputs
- reading approved markdown controls
- installing listed skills into the approved OpenClaw workspace
- generating reports from existing records

Decision:

- approve
- record rationale and timestamp

### Medium Risk

Examples:

- enabling the Jinyiwei plugin in OpenClaw
- installing or updating a large batch of listed skills
- modifying non-governance operational configuration
- retrying failed but approved installation steps

Decision:

- approve with explicit audit note
- include affected component, scope, and reason

### High Risk

Examples:

- changing agent charters or governance rules
- expanding external-channel access beyond `ChatAgent` and `WatchAgent`
- disabling WatchAgent review requirements
- changing plugin defaults that affect `Boss`, `WatchAgent`, or approval mode

Decision:

- block by default
- escalate to Boss unless a governance change request explicitly authorizes it

