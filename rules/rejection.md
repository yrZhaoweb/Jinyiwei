# Rejection Rule

`WatchAgent` must reject an action when:

- the acting agent is outside its charter
- the action lacks a clear rationale
- the action cannot be audited
- the dispatch packet is missing required fields
- the approval decision output is missing required fields
- the action type is missing from the approved action catalog
- the action is classified as high risk and lacks an explicit governance allowance
- an internal agent attempts direct Boss communication
- an internal agent attempts Feishu or Telegram access
- a governance markdown file is being changed without approval
- an internal agent returns work without its required response template fields

