# Dispatch Rule

1. Boss enters through `ChatAgent` or `WatchAgent`
2. `ChatAgent` structures the request
3. `WatchAgent` approves or rejects the next action
4. Internal agents execute only after approval
5. Internal outputs return to `ChatAgent`
6. Boss-facing responses come only from `ChatAgent` or `WatchAgent`

