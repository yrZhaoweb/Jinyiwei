# Jinyiwei 使用指南

> 本指南面向已经完成安装的 Boss，解答「装完了之后具体怎么用」的问题。
> 所有 Boss 与系统的对话均使用**中文**。

---

## 目录

1. [前提条件](#1-前提条件)
2. [安装流程](#2-安装流程)
3. [配置渠道](#3-配置渠道)
4. [配置模型 API Key](#4-配置模型-api-key)
5. [日常对话示例](#5-日常对话示例)
6. [WatchAgent 审批流程](#6-watchagent-审批流程)
7. [第一个任务的完整示例](#7-第一个任务的完整示例)
8. [常用命令速查](#8-常用命令速查)
9. [故障排查](#9-故障排查)

---

## 1. 前提条件

### 1.1 什么是 OpenClaw

OpenClaw 是一个多代理运行框架，Jinyiwei 是运行在 OpenClaw 之上的治理插件。没有 OpenClaw，Jinyiwei 无法工作。

### 1.2 安装 OpenClaw

```bash
# Node.js 18+ 已安装的前提下
npm install -g openclaw
```

安装完成后，验证 OpenClaw 可用：

```bash
openclaw --version
```

如果看到版本号，说明 OpenClaw 已就绪。

### 1.3 确认工作区目录

Jinyiwei 需要一个 OpenClaw 工作区目录。所有治理文件、审计日志都会存在这个目录下。

```bash
# 推荐路径
echo $HOME/.openclaw/workspace
```

如果目录不存在，`jinyiwei setup` 会自动创建。

---

## 2. 安装流程

### 2.1 安装 Jinyiwei

```bash
npm install -g @yrzhao/jinyiwei
```

验证安装成功：

```bash
jinyiwei --version
```

### 2.2 运行一键安装

```bash
jinyiwei setup /path/to/openclaw/workspace
```

`setup` 会依次执行以下步骤：

| 步骤 | 说明 |
|------|------|
| 1. 安装并注册代理 | 把 ChatAgent、WatchAgent 注册到 OpenClaw |
| 2. 配置模型和渠道 | 向导询问 Boss 称谓、WatchAgent 自称、审批模式、渠道、模型 |
| 3. 对齐默认入口 | 把 OpenClaw 的默认入口切到 ChatAgent |
| 4. 校验治理文件 | 确保所有规则、模板、章程文件完整 |
| 5. 验证运行时 | 确认 OpenClaw 和 Jinyiwei 插件正常运行 |
| 6. 显示首次使用指南 | 告知第一步该怎么做 |

### 2.3 安装后验证

```bash
jinyiwei status      # 查看配置状态
jinyiwei doctor      # 检查环境健康
jinyiwei verify      # 确认治理流程可用
```

输出中看到 `Jinyiwei plugin: installed` 和 `校验状态: 通过` 即表示安装成功。

---

## 3. 配置渠道

Boss 通过**渠道（Channel）**与系统对话。Jinyiwei 支持飞书（Feishu）和 Telegram 两个渠道。

### 3.1 飞书配置

1. 在 [飞书开放平台](https://open.feishu.cn/) 创建企业自建应用
2. 获取 `App ID` 和 `App Secret`
3. 添加机器人能力
4. 在 OpenClaw 中配置：

```bash
openclaw channels configure feishu \
  --app-id <YOUR_APP_ID> \
  --app-secret <YOUR_APP_SECRET>
```

或者直接编辑 `~/.openclaw/config.json`：

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

### 3.2 Telegram 配置

1. 在 Telegram 上找 [@BotFather](https://t.me/BotFather) 创建机器人
2. 获取 bot token
3. 在 OpenClaw 中配置：

```bash
openclaw channels configure telegram --token <YOUR_BOT_TOKEN>
```

### 3.3 验证渠道

```bash
jinyiwei doctor
```

在输出的 `渠道` 部分应该看到已配置的渠道（`feishu` 或 `telegram`）。

### 3.4 渠道限制

根据 `rules/channel-access.md`，只有 `ChatAgent` 和 `WatchAgent` 可以访问外部渠道。内部代理（CodeAgent、ReviewAgent 等）不允许直接访问外部渠道。

---

## 4. 配置模型 API Key

Jinyiwei 的每个代理都需要一个 LLM 模型来运行。模型配置在 `jinyiwei.config.json` 中。

### 4.1 查看当前配置

```bash
jinyiwei configure --json
```

输出中的 `models` 字段显示当前配置，`""` 表示未填写。

### 4.2 交互式配置

```bash
jinyiwei init
```

向导会依次询问：

- Boss 称谓（默认：`Boss`）
- WatchAgent 自称（默认：`WatchAgent`）
- 审批模式（默认：`hybrid`）
- 允许的外部渠道（默认：`feishu,telegram`）
- ChatAgent 模型
- WatchAgent 模型
- 各内部代理组的模型

### 4.3 支持的模型

Jinyiwei 本身不限制模型，但需要 OpenClaw 所支持的模型 provider。以下是常见配置示例：

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

其他支持的 provider：`anthropic/claude-3-5-sonnet`、`google/gemini-2.0-flash`、`minimax/MiniMax-M2.5` 等，取决于 OpenClaw 的 provider 配置。

### 4.4 环境变量方式

如果不想把 API Key 写在配置文件里，可以通过环境变量传递：

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_API_BASE=https://api.openai.com/v1
```

OpenClaw 会自动读取这些环境变量。

---

## 5. 日常对话示例

> Boss 与 ChatAgent 的所有对话均使用**中文**。

### 5.1 通过飞书对话

在飞书中找到配置好的机器人，直接发送中文消息。

### 5.2 对话示例

**Boss（中文）：**

> 帮我写一个快速排序算法，用 JavaScript 实现

**ChatAgent（中文）：**

```
收到，Boss。

正在为您规划任务并提交审批流程。

目标：将快速排序算法实现为 JavaScript 函数文件
风险评估：低风险
审批状态：已提交 WatchAgent 审批
```

**WatchAgent（中文）：**

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

**ChatAgent（中文）：**

```
审批已通过，开始执行。

CodeAgent 正在实现快速排序...
```

（CodeAgent 完成实现后）

**ChatAgent（中文）：**

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

## 6. WatchAgent 审批流程

### 6.1 为什么需要审批

每个从 ChatAgent 发出的动作都必须经过 WatchAgent 审批。这确保了：

- 高风险操作不会被直接执行
- 所有操作都有审计记录
- Boss 对系统行为有完全的可见性

### 6.2 审批的三种结果

| 决策 | 含义 | Boss 是否收到通知 |
|------|------|------------------|
| `approve` | 批准执行 | 低风险：不通知；高风险：通知 |
| `reject` | 拒绝执行 | 是（总是通知） |
| `escalate` | 需要 Boss 决策 | 是（总是通知） |

### 6.3 审批矩阵（hybrid 模式）

```
风险级别     │ Channel/Permission 违规 │ 普通工作流
────────────┼─────────────────────┼───────────────────
low         │ hard-block           │ approve + record
medium      │ hard-block           │ approve + explicit record
high        │ hard-block           │ block + escalate
```

**hard-block（硬阻断）**：任何 Channel/Permission 违规都会被直接拒绝，无需风险评估。

### 6.4 高风险拒绝示例

**Boss：**

> 让 CodeAgent 直接访问我的飞书频道发消息

**WatchAgent：**

```
# Jinyiwei 拒绝决定

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

## 7. 第一个任务的完整示例

假设你刚完成 `jinyiwei setup`，按照 `jinyiwei start-guide` 的提示开始使用。

### 7.1 第一步：确认状态

```bash
jinyiwei status
```

确认：
- `Jinyiwei 插件: installed`
- `校验状态: 通过`
- `OpenClaw: available`
- `默认入口: ChatAgent`（如果不是，运行 `jinyiwei configure --set-default-entry chat`）

### 7.2 第二步：通过飞书/Telegram 联系 ChatAgent

在飞书/Telegram 中找到 Jinyiwei 机器人，发送：

```
你好，我需要帮助
```

ChatAgent 会用中文回应，确认你们建立了连接。

### 7.3 第三步：提交第一个任务

```
帮我创建一个简单的 HTTP 服务器，用 Node.js 实现
```

### 7.4 系统内部发生了什么

```
Boss 消息
    ↓
ChatAgent 接收（channel.receive_boss_message）
    ↓
ChatAgent 创建分发包（dispatch.send_to_internal_agent）
    ↓
WatchAgent 审批（approval.review_action）
    ↓
    ├─ 低风险 → 批准 → CodeAgent 执行
    ├─ 中风险 → 批准（记录） → CodeAgent 执行
    └─ 高风险 → 拒绝 → 通知 Boss
    ↓
CodeAgent 实现代码
    ↓
ReviewAgent 代码审查
    ↓
TestAgent 验证
    ↓
ChatAgent 汇总结果 → Boss
```

### 7.5 治理审计日志

所有操作都会被记录。在 OpenClaw workspace 目录下查看：

```bash
cat ~/.openclaw/workspace/jinyiwei-audit.md
```

日志条目格式：

```md
# Jinyiwei Audit Entry

- audit_id: JYW-AUD-20260402-001
- packet_id: JYW-20260402-001
- decision_id: JYW-DEC-20260402-001
- acting_agent: CodeAgent
- action_type: code.implement
- risk_level: low
- supervising_decision: approve
- rationale: 快速排序实现符合规范
- output: function quickSort(arr) {...}
```

---

## 8. 常用命令速查

| 场景 | 命令 |
|------|------|
| 安装/重装 Jinyiwei | `jinyiwei setup /path/to/workspace` |
| 查看配置状态 | `jinyiwei status` |
| 排查环境问题 | `jinyiwei doctor` |
| 确认治理就绪 | `jinyiwei verify` |
| 查看首次使用指南 | `jinyiwei start-guide` |
| 修改模型/渠道配置 | `jinyiwei init` |
| 修改默认入口 | `jinyiwei configure --set-default-entry chat` |
| 切换回 main | `jinyiwei configure --keep-main` |
| 校验治理完整性 | `jinyiwei validate` |
| 卸载 Jinyiwei | `jinyiwei uninstall` |

---

## 9. 故障排查

### 问题：`Jinyiwei plugin: 缺失`

**原因**：`jinyiwei install` 没有成功执行，或者在错误的 workspace 上执行了。

**解决**：

```bash
jinyiwei install /path/to/openclaw/workspace
```

### 问题：ChatAgent 回复「无法处理」

**原因**：OpenClaw 的模型配置不正确，或者 API Key 无效。

**解决**：

1. 确认 OpenClaw 能连通模型 API：
   ```bash
   openclaw models list
   ```
2. 检查 `jinyiwei.config.json` 中的模型 ID 是否正确
3. 确认 API Key 环境变量已设置

### 问题：WatchAgent 拒绝了所有请求

**原因**：请求的动作类型不在 `rules/action-catalog.md` 中，或者请求了高风险操作。

**解决**：查看拒绝决定中的 `violated_rule` 和 `remediation` 字段，按建议修改请求。

### 问题：飞书/Telegram 无法连接

**原因**：渠道配置不完整，或者 Bot token 过期。

**解决**：

```bash
jinyiwei doctor
```

检查 `渠道` 部分是否显示已配置的渠道。确认飞书/Telegram bot 的 token 有权限接收和发送消息。

### 问题：`jinyiwei status` 显示 `no model set`

**原因**：`jinyiwei.config.json` 中的模型字段为空。

**解决**：

```bash
jinyiwei init
```

按照向导填入模型 ID，或直接编辑 `jinyiwei.config.json`：

```json
{
  "models": {
    "chat": "openai/gpt-4o",
    "watch": "openai/gpt-4o"
  }
}
```

---

## 附录：治理规则速查

| 规则文件 | 作用 |
|---------|------|
| `rules/addressing.md` | 如何称呼 Boss（必须叫「Boss」） |
| `rules/action-catalog.md` | 所有动作类型清单及默认风险级别 |
| `rules/approval-matrix.md` | 审批决策矩阵（hard-block / approve / escalate） |
| `rules/channel-access.md` | 哪些代理可以通过哪些渠道通信 |
| `rules/dispatch.md` | 分发包的格式要求 |
| `rules/audit.md` | 审计日志格式要求 |

| 模板文件 | 用途 |
|---------|------|
| `templates/dispatch-packet.md` | ChatAgent 向内部代理发任务的格式 |
| `templates/approval-decision.md` | WatchAgent 批准决定的格式 |
| `templates/rejection-decision.md` | WatchAgent 拒绝决定的格式 |
| `templates/audit-entry.md` | 审计日志条目的格式 |
