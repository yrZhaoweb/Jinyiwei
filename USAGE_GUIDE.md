# Jinyiwei Usage Guide

> This guide is for Bosses who have completed installation and need to understand how to actually use the system day-to-day.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Channel Configuration](#3-channel-configuration)
4. [Model Configuration](#4-model-configuration)
5. [Daily Conversation Examples](#5-daily-conversation-examples)
6. [WatchAgent Approval Flow](#6-watchagent-approval-flow)
7. [Complete First-Task Example](#7-complete-first-task-example)
8. [Quick Command Reference](#8-quick-command-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### 1.1 What is OpenClaw

OpenClaw is a multi-agent runtime framework. Jinyiwei is a governance plugin that runs on top of OpenClaw. Without OpenClaw, Jinyiwei cannot function.

### 1.2 Install OpenClaw

```bash
npm install -g openclaw
```

Verify:

```bash
openclaw --version
```

### 1.3 Workspace Directory

Jinyiwei needs an OpenClaw workspace directory. All governance files and audit logs are stored there.

```bash
# Default path
echo $HOME/.openclaw/workspace
```

If the directory does not exist, `jinyiwei setup` will create it automatically.

---

## 2. Installation

### 2.1 Install Jinyiwei

```bash
npm install -g @yrzhao/jinyiwei
```

Verify:

```bash
jinyiwei --version
```

### 2.2 Run One-Step Setup

```bash
jinyiwei setup /path/to/openclaw/workspace
```

`setup` runs these steps in order:

| Step | Description |
|------|-------------|
| 1. Install and register agents | Register ChatAgent, WatchAgent with OpenClaw |
| 2. Configure models and channels | Wizard asks for Boss title, WatchAgent self-title, approval mode, channels, models |
| 3. Align default entry | Switch OpenClaw default entry to ChatAgent |
| 4. Validate governance files | Ensure all rules, templates, charter files are present |
| 5. Verify runtime | Confirm OpenClaw and Jinyiwei plugin are running |
| 6. Show first-use guide | Tell you what to do first |

### 2.3 Post-Install Verification

```bash
jinyiwei status      # Check config status
jinyiwei doctor      # Check environment health
jinyiwei verify      # Confirm governance flow is ready
```

Look for `Jinyiwei plugin: installed` and `Validation: OK` in the output.

---

## 3. Channel Configuration

Channels are how Boss communicates with the system. Jinyiwei supports Feishu and Telegram.

### 3.1 Feishu Configuration

1. Create an enterprise self-built app at [Feishu Open Platform](https://open.feishu.cn/)
2. Get `App ID` and `App Secret`
3. Add bot capability
4. Configure in OpenClaw:

```bash
openclaw channels configure feishu \
  --app-id <YOUR_APP_ID> \
  --app-secret <YOUR_APP_SECRET>
```

Or edit `~/.openclaw/config.json` directly:

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "bot-name": "Jinyiwei",
      "app-id": "<YOUR_APP_ID>",
      "app-secret": "<YOUR_APP_SECRET>"
    }
  }
}
```

### 3.2 Telegram Configuration

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Get the bot token
3. Configure in OpenClaw:

```bash
openclaw channels configure telegram --token <YOUR_BOT_TOKEN>
```

### 3.3 Verify Channels

```bash
jinyiwei doctor
```

The `Channels` section should show your configured channels (`feishu` or `telegram`).

### 3.4 Channel Restrictions

Per `rules/channel-access.md`, only `ChatAgent` and `WatchAgent` can access external channels. Internal agents (CodeAgent, ReviewAgent, etc.) are not permitted to access external channels directly.

---

## 4. Model Configuration

Every Jinyiwei agent needs an LLM model. Models are configured in `jinyiwei.config.json`.

### 4.1 View Current Config

```bash
jinyiwei configure --json
```

The `models` field shows current settings. `""` means not configured.

### 4.2 Interactive Configuration

```bash
jinyiwei init
```

The wizard asks for:
- Boss title (default: `Boss`)
- WatchAgent self-title (default: `锦衣卫`)
- Approval mode (default: `hybrid`)
- Allowed external channels (default: `feishu,telegram`)
- ChatAgent model
- WatchAgent model
- Model per internal agent group

### 4.3 Supported Models

Jinyiwei does not restrict models, but requires models supported by OpenClaw. Example configurations:

```json
{
  "models": {
    "chat": "openai/gpt-4o",
    "watch": "openai/gpt-4o",
    "groups": {
      "dev": "openai/gpt-4o-mini",
      "content": "openai/gpt-4o-mini"
    }
  }
}
```

Other supported providers: `anthropic/claude-3-5-sonnet`, `google/gemini-2.0-flash`, `minimax/MiniMax-M2.5`, etc. — depending on OpenClaw's provider configuration.

### 4.4 Environment Variable Approach

To avoid putting API keys in config files:

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_API_BASE=https://api.openai.com/v1
```

OpenClaw reads these automatically.

---

## 5. Daily Conversation Examples

> **All Boss-to-system conversation is in Chinese.**

### 5.1 Via Feishu

Find the configured Jinyiwei bot in Feishu and send messages directly in Chinese.

### 5.2 Example Conversation

**Boss (Chinese):**

> 帮我写一个快速排序算法，用 JavaScript 实现

**ChatAgent (Chinese):**

```
收到，Boss。

正在为您规划任务并提交审批流程。

目标：将快速排序算法实现为 JavaScript 函数文件
风险评估：低风险
审批状态：已提交 WatchAgent 审批
```

**WatchAgent (Chinese):**

```
# Jinyiwei 审批决定

- decision_id: JYW-DEC-20260402-001
- packet_id: JYW-20260402-001
- action_type: dispatch.send_to_internal_agent
- risk_level: low
- decision: approve

## 原因

请求实现标准算法，风险低。动作类型在操作目录中，无需额外限制。

## 后续步骤

1. CodeAgent 实现快速排序代码
2. ReviewAgent 检查代码质量
3. TestAgent 验证算法正确性

## 上报 Boss

否（低风险，批准即可执行）
```

**ChatAgent (Chinese):**

```
审批已通过，开始执行。

CodeAgent 正在实现快速排序...
```

(After CodeAgent completes)

**ChatAgent (Chinese):**

```
Boss，快速排序已完成。

代码如下：

```javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
```

ReviewAgent 和 TestAgent 已完成审核，测试通过。
```

---

## 6. WatchAgent Approval Flow

### 6.1 Why Approval is Required

Every action from ChatAgent must pass through WatchAgent's approval. This ensures:

- High-risk actions are not executed directly
- All actions have audit records
- Boss has full visibility into system behavior

### 6.2 Three Possible Outcomes

| Decision | Meaning | Boss Notified |
|---------|---------|---------------|
| `approve` | Approved to execute | Low risk: no; High risk: yes |
| `reject` | Rejected | Yes (always) |
| `escalate` | Needs Boss decision | Yes (always) |

### 6.3 Approval Matrix (hybrid mode)

```
Risk Level    │ Channel/Permission Violation │ Normal Workflow
─────────────┼──────────────────────────────┼────────────────────
low           │ hard-block                  │ approve + record
medium        │ hard-block                  │ approve + explicit record
high          │ hard-block                  │ block + escalate
```

**hard-block**: Any Channel/Permission violation is rejected immediately, regardless of risk level.

### 6.4 High-Risk Rejection Example

**Boss:**

> 让 CodeAgent 直接访问我的飞书频道发消息

**WatchAgent:**

```
# Jinyiwei Rejection Decision

- decision_id: JYW-DEC-20260402-002
- packet_id: JYW-20260402-002
- action_type: channel.expand_external_access
- risk_level: high
- decision: reject
- violation_type: channel
- reason: 内部代理不允许直接访问外部渠道，违反 rules/channel-access.md
- violated_rule: rules/channel-access.md
- remediation: 如需飞书通知，由 ChatAgent 或 WatchAgent 代理执行
- reported_to_boss: yes
```

---

## 7. Complete First-Task Example

Assume you just finished `jinyiwei setup` and are following `jinyiwei start-guide`.

### 7.1 Step 1: Verify Status

```bash
jinyiwei status
```

Confirm:
- `Jinyiwei plugin: installed`
- `Validation: OK`
- `OpenClaw: available`
- `Default entry: ChatAgent` (if not, run `jinyiwei configure --set-default-entry chat`)

### 7.2 Step 2: Contact ChatAgent via Feishu/Telegram

Find the Jinyiwei bot in Feishu/Telegram and send:

```
你好，我需要帮助
```

ChatAgent responds in Chinese, confirming the connection.

### 7.3 Step 3: Submit First Task

```
帮我创建一个简单的 HTTP 服务器，用 Node.js 实现
```

### 7.4 What Happens Internally

```
Boss Message
    ↓
ChatAgent receives (channel.receive_boss_message)
    ↓
ChatAgent creates dispatch packet (dispatch.send_to_internal_agent)
    ↓
WatchAgent reviews (approval.review_action)
    ↓
    ├─ Low risk  → approve → CodeAgent executes
    ├─ Medium   → approve (recorded) → CodeAgent executes
    └─ High     → reject → notify Boss
    ↓
CodeAgent implements code
    ↓
ReviewAgent reviews code
    ↓
TestAgent verifies
    ↓
ChatAgent summarizes → Boss
```

### 7.5 Governance Audit Log

All actions are logged. View in OpenClaw workspace:

```bash
cat ~/.openclaw/workspace/jinyiwei-audit.md
```

---

## 8. Quick Command Reference

| Scenario | Command |
|----------|---------|
| Install/reinstall Jinyiwei | `jinyiwei setup /path/to/workspace` |
| View config status | `jinyiwei status` |
| Troubleshoot environment | `jinyiwei doctor` |
| Confirm governance ready | `jinyiwei verify` |
| View first-use guide | `jinyiwei start-guide` |
| Modify models/channels | `jinyiwei init` |
| Switch default entry | `jinyiwei configure --set-default-entry chat` |
| Switch back to main | `jinyiwei configure --keep-main` |
| Validate governance | `jinyiwei validate` |
| Uninstall Jinyiwei | `jinyiwei uninstall` |

---

## 9. Troubleshooting

### Problem: `Jinyiwei plugin: missing`

**Cause**: `jinyiwei install` did not run successfully, or ran against the wrong workspace.

**Fix**:

```bash
jinyiwei install /path/to/openclaw/workspace
```

### Problem: ChatAgent says "cannot process"

**Cause**: OpenClaw model configuration is incorrect, or API Key is invalid.

**Fix**:

1. Confirm OpenClaw can reach the model API:
   ```bash
   openclaw models list
   ```
2. Check that model IDs in `jinyiwei.config.json` are correct
3. Confirm API Key environment variables are set

### Problem: WatchAgent rejects all requests

**Cause**: Requested action type is not in `rules/action-catalog.md`, or request is high-risk.

**Fix**: Check the `violated_rule` and `remediation` fields in the rejection decision and modify the request accordingly.

### Problem: Feishu/Telegram cannot connect

**Cause**: Channel configuration is incomplete, or bot token has expired.

**Fix**:

```bash
jinyiwei doctor
```

Check the `Channels` section. Confirm the Feishu/Telegram bot has permission to receive and send messages.

### Problem: `jinyiwei status` shows `no model set`

**Cause**: Model fields in `jinyiwei.config.json` are empty.

**Fix**:

```bash
jinyiwei init
```

Or edit `jinyiwei.config.json` directly:

```json
{
  "models": {
    "chat": "openai/gpt-4o",
    "watch": "openai/gpt-4o"
  }
}
```

---

## Appendix: Governance Rules Quick Reference

| Rule File | Purpose |
|-----------|---------|
| `rules/addressing.md` | How to address Boss (must call them "Boss") |
| `rules/action-catalog.md` | Complete list of action types and default risk levels |
| `rules/approval-matrix.md` | Approval decision matrix (hard-block / approve / escalate) |
| `rules/channel-access.md` | Which agents can use which channels |
| `rules/dispatch.md` | Dispatch packet format requirements |
| `rules/audit.md` | Audit log format requirements |

| Template File | Purpose |
|--------------|---------|
| `templates/dispatch-packet.md` | Format for ChatAgent dispatching tasks to internal agents |
| `templates/approval-decision.md` | Format for WatchAgent approval decisions |
| `templates/rejection-decision.md` | Format for WatchAgent rejection decisions |
| `templates/audit-entry.md` | Format for audit log entries |
