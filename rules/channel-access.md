# Channel Access Rule

Only these agents may connect to external Boss-facing channels:

- `ChatAgent`
- `WatchAgent`

All other agents are internal-only and must be blocked if they attempt direct access to:

- Feishu
- Telegram
- any other Boss-facing ingress or egress channel

