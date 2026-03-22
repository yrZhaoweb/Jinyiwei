# Jinyiwei v0.6.0 完整重写计划

> 生成日期：2026-03-23

## 1. 背景与问题分析

Jinyiwei 在 OpenClaw 上部署后无法运行。经过对 OpenClaw 真实 API（`~/.openclaw/` 安装目录、`openclaw` CLI、Plugin SDK 源码）的深入分析，确认以下核心问题：

| # | 问题 | 说明 |
|---|------|------|
| 1 | **未集成 OpenClaw Agent 系统** | 当前 install 只创建文件目录、拷贝 markdown，从未调用 `openclaw agents add` 注册真实 agent |
| 2 | **无模型配置能力** | 无法为不同角色（ChatAgent、WatchAgent、内部 agent）指定不同的 LLM 模型 |
| 3 | **无 Agent 分组概念** | 4 个内部 agent（Code、Review、Test、UI）是扁平列表，缺少按业务领域分组的机制 |
| 4 | **插件运行时是空壳** | `openclaw-plugin.js` 只注册了一个 `jinyiwei.status` gateway 方法，未注册治理工具（approve/reject/audit） |
| 5 | **配置存储位置错误** | 用户配置嵌入在 `openclaw.plugin.json` 的 JSON Schema default 中，而非独立配置文件 |

### OpenClaw 真实 API（通过读取本机安装发现）

```
# Agent 管理
openclaw agents add <name> --model <id> --workspace <dir> --non-interactive
openclaw agents delete <name>
openclaw agents bind --agent <id> --bind <channel[:accountId]>
openclaw agents list --json

# 模型配置
openclaw models set <model> --agent <id>

# 插件管理
openclaw plugins install [-l] <path>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>

# Plugin SDK（运行时）
api.registerTool({ name, description, parameters, execute })
api.registerGatewayMethod(name, handler)
api.registerChannel({ plugin })
api.registerPluginHttpRoute(path, handler)
```

---

## 2. 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Agent 分组机制 | **目录结构 + 配置文件结合** | 目录定义默认分组和 charter，配置文件覆盖模型等参数 |
| 模型配置 | **独立 `jinyiwei.config.json`** | 脱离 `openclaw.plugin.json` 的 JSON Schema，简洁直观 |
| 重写范围 | **完整重写一步到位** | 当前实现基本不可用，渐进式改造收益不大 |
| 架构方向 | **保持不变** | ChatAgent + WatchAgent 面向用户，内部 Agent 分组执行，WatchAgent 审批 |

### 新目录结构

```
agents/
  chat/AGENT.md              # 外部 agent（面向用户）
  watch/AGENT.md             # 外部 agent（监督审批）
  groups/                    # 新增：分组目录
    dev/                     # 研发组
      code/AGENT.md
      review/AGENT.md
      test/AGENT.md
    content/                 # 内容组
      ui/AGENT.md
```

### 新配置文件 `jinyiwei.config.json`

```json
{
  "bossTitle": "Boss",
  "watchSelfTitle": "锦衣卫",
  "approvalMode": "hybrid",
  "models": {
    "chat": "",
    "watch": "",
    "groups": {
      "dev": "",
      "content": ""
    }
  },
  "externalChannels": ["feishu", "telegram"]
}
```

模型字段默认为空，由 `jinyiwei init` 交互式设置。

---

## 3. 实施计划

### Phase 0: 基础设施模块（新建 3 个核心模块）

#### 0.1 `lib/config.mjs` — 配置管理

取代 `openclaw.plugin.json` 中的 configSchema.default 存储方式。

导出：
- `defaultConfig()` — 返回默认配置对象
- `loadConfig()` — 从 `jinyiwei.config.json` 读取并与默认值合并
- `writeConfig(config)` — 写入配置文件
- `validateConfig(config)` — 验证配置，返回 `{ ok, errors }`
- `getModelForAgent(config, agentId, groupName)` — 解析 agent 应使用的模型

#### 0.2 `lib/groups.mjs` — Agent 分组发现

扫描 `agents/groups/<groupName>/<agentName>/AGENT.md` 目录，动态构建 agent 注册表。

导出：
- `EXTERNAL_AGENTS` — 常量数组（ChatAgent、WatchAgent）
- `discoverGroups()` — 扫描目录返回分组结构
- `buildAgentRegistry(config)` — 合并外部 agent + 分组 agent + 模型分配
- `agentIdToName(id)` — `"code"` → `"CodeAgent"`

#### 0.3 `lib/openclaw.mjs` — OpenClaw CLI 封装

封装所有 `openclaw` CLI 调用，便于测试时 mock。

导出：
- `hasOpenClaw()` — 检查 PATH
- `agentAdd(name, { model, workspace, nonInteractive, dryRun })`
- `agentDelete(name, { dryRun })`
- `agentBind(agentId, channel, { dryRun })`
- `agentsList()` — 解析 JSON 返回
- `modelSet(model, agentId, { dryRun })`
- `pluginInstall(path, { link, dryRun })`
- `pluginEnable(id, { dryRun })` / `pluginDisable` / `pluginUninstall`

#### 0.4 创建默认 `jinyiwei.config.json`

---

### Phase 1: 重组 Agent 目录结构

#### 1.1 移动内部 agent 到分组目录

| 原路径 | 新路径 |
|--------|--------|
| `agents/code/AGENT.md` | `agents/groups/dev/code/AGENT.md` |
| `agents/review/AGENT.md` | `agents/groups/dev/review/AGENT.md` |
| `agents/test/AGENT.md` | `agents/groups/dev/test/AGENT.md` |
| `agents/ui/AGENT.md` | `agents/groups/content/ui/AGENT.md` |
| `agents/chat/AGENT.md` | **保持不变** |
| `agents/watch/AGENT.md` | **保持不变** |

#### 1.2 更新 charter 内容

每个内部 agent 的 AGENT.md 在 Identity 段增加 `Group` 字段：

```markdown
## Identity
- Agent name: `CodeAgent`
- Group: `dev`
- Channel status: internal only
```

#### 1.3 更新 `skills/jinyiwei-governance/SKILL.md`

更新 agent charter 引用路径，增加分组概念说明。

---

### Phase 2: 重写核心命令

#### 2.1 `lib/commands/install.mjs` — 完全重写

新安装流程（7 步）：

```
Step 1: 加载配置 — loadConfig() + validateConfig()
Step 2: 发现分组 — buildAgentRegistry(config)
Step 3: 同步技能清单
Step 4: 验证治理文件
Step 5: 安装插件 — openclaw plugins install + enable
Step 6: 注册 Agent — openclaw agents add + 拷贝 charter/rules/templates + 绑定渠道
Step 7: 安装技能
```

**关键变化**：Step 6 调用 `openclaw agents add` 创建真实 OpenClaw agent，调用 `openclaw models set --agent <id>` 配置模型，调用 `openclaw agents bind` 绑定外部渠道。

#### 2.2 `lib/commands/uninstall.mjs` — 重写

新流程：
1. `buildAgentRegistry()` 获取 agent 列表
2. 对每个 agent 调用 `openclaw agents delete`
3. `openclaw plugins disable/uninstall`

#### 2.3 `lib/commands/init.mjs` — 重写

新增模型配置交互：
1. 加载现有配置或默认值
2. 提示 bossTitle、watchSelfTitle、approvalMode、externalChannels
3. **新增**：提示 ChatAgent 模型
4. **新增**：提示 WatchAgent 模型
5. **新增**：发现所有分组，逐组提示模型
6. 验证并写入 `jinyiwei.config.json`

#### 2.4 `lib/commands/status.mjs` — 重写

新输出：Config 信息、外部 Agent（模型）、Agent 分组（模型）、OpenClaw 已注册 Agent、验证状态。

#### 2.5 `lib/commands/validate.mjs` — 更新

加入 config 验证器、groups 验证器。移除旧的 plugin config-default 验证。

#### 2.6 `lib/commands/sync.mjs` — 无结构性变化

---

### Phase 3: 重写验证器

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/validators/files.mjs` | 更新 | 更新必需文件列表为新路径 |
| `lib/validators/charters.mjs` | 更新 | 使用 group 路径，新增动态分组验证 |
| `lib/validators/plugin.mjs` | 简化 | 只验证 `openclaw.plugin.json` 结构字段 |
| `lib/validators/config.mjs` | **新建** | 验证 `jinyiwei.config.json` |
| `lib/validators/groups.mjs` | **新建** | 验证分组目录结构、AGENT.md 内容 |
| `lib/validators/templates.mjs` | 更新 | 动态发现 response 模板 |
| `lib/validators/rules.mjs` | 最小变更 | |

---

### Phase 4: 重写插件运行时

#### 4.1 `openclaw-plugin.js` — 完全重写

```js
export const id = "jinyiwei";
export default function register(api) {
  // 保留 status gateway
  api.registerGatewayMethod(`${id}.status`, ({ respond }) => { ... });

  // 新增 4 个治理工具
  api.registerTool({
    name: "jinyiwei_dispatch",
    description: "ChatAgent: create a dispatch packet for internal agent",
    parameters: { /* target_agent, action_type, goal, scope, risk_hint */ },
    async execute(_id, params) { /* 返回 dispatch-packet 模板 */ }
  });

  api.registerTool({
    name: "jinyiwei_approve",
    description: "WatchAgent: approve a dispatch packet",
    parameters: { /* packet_id, action_type, risk_level, reason */ },
    async execute(_id, params) { /* 返回 approval-decision 模板 */ }
  });

  api.registerTool({
    name: "jinyiwei_reject",
    description: "WatchAgent: reject a dispatch packet",
    parameters: { /* packet_id, action_type, reason */ },
    async execute(_id, params) { /* 返回 rejection-decision 模板 */ }
  });

  api.registerTool({
    name: "jinyiwei_audit",
    description: "Record an audit entry",
    parameters: { /* action_type, agent, decision, reason */ },
    async execute(_id, params) { /* 返回 audit-entry 模板 */ }
  });
}
```

#### 4.2 简化 `openclaw.plugin.json`

```json
{
  "id": "jinyiwei",
  "name": "Jinyiwei",
  "version": "0.6.0",
  "description": "Governance, supervision, and markdown-controlled agent hierarchy for OpenClaw.",
  "skills": ["skills/jinyiwei-governance"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

---

### Phase 5: 更新支撑模块

| 文件 | 操作 |
|------|------|
| `lib/i18n/en.mjs` + `lib/i18n/zh.mjs` | 添加分组、模型配置、agent 注册相关 i18n key |
| `bin/jinyiwei.mjs` | 支持 async 命令（install/uninstall） |
| `scripts/install-openclaw.mjs` | **删除**（功能合并到 install.mjs + openclaw.mjs） |
| `scripts/validate-jinyiwei.mjs` | 加入新验证器（config、groups） |
| `package.json` | files 加入 `jinyiwei.config.json`，移除废弃 scripts，版本升至 `0.6.0` |

---

### Phase 6: 更新治理内容（Markdown）

规则文件（`rules/*.md`）和模板文件（`templates/*.md`）引用 agent 名称而非文件路径，无需大量修改。
更新 `skills/jinyiwei-governance/SKILL.md` 中的 agent charter 路径引用和分组说明。

---

### Phase 7: 重写测试

#### 新测试文件
- `test/config.test.mjs` — 配置加载、验证、模型解析
- `test/groups.test.mjs` — 分组发现、注册表构建
- `test/openclaw.test.mjs` — CLI 封装（dryRun 模式）

#### 更新现有测试
| 文件 | 变更 |
|------|------|
| `test/validators.test.mjs` | 使用新路径和新验证器 |
| `test/validators-negative.test.mjs` | 新的负面测试（config 无效、分组缺失等） |
| `test/commands.test.mjs` | 适配新命令行为 |
| `test/plugin.test.mjs` | 测试 registerTool 调用 |
| `test/cli.test.mjs` | 更新 install dry-run 等 |
| `test/i18n.test.mjs` | 基本不变 |
| `test/log.test.mjs` | 不变 |
| `test/parse-skills.test.mjs` | 不变 |

---

### Phase 8: 收尾

- 更新 `CLAUDE.md` 反映新架构
- 更新 `README.md` 和 `README.zh-CN.md`
- 运行 `npm run sync:version` 同步版本
- 运行 `npm test && npm run validate` 全量验证

---

## 4. 执行顺序与依赖关系

```
Phase 0 (基础模块: config.mjs, groups.mjs, openclaw.mjs)
    ↓
Phase 1 (目录重组: agents/groups/)  ← 可与 Phase 0 并行
    ↓
Phase 3 (验证器重写)  ← 可独立测试
Phase 2 (命令重写)    ← 依赖 Phase 0 + 1
Phase 4 (插件运行时)  ← 独立于 Phase 2/3
    ↓
Phase 5 (支撑模块更新)
Phase 6 (治理内容更新)
    ↓
Phase 7 (测试重写)
    ↓
Phase 8 (收尾验证)
```

---

## 5. 关键文件变更清单

| 操作 | 文件 |
|------|------|
| **新建** | `lib/config.mjs`, `lib/groups.mjs`, `lib/openclaw.mjs`, `jinyiwei.config.json` |
| **新建** | `lib/validators/config.mjs`, `lib/validators/groups.mjs` |
| **新建** | `test/config.test.mjs`, `test/groups.test.mjs`, `test/openclaw.test.mjs` |
| **重写** | `lib/commands/install.mjs`, `lib/commands/uninstall.mjs`, `lib/commands/init.mjs`, `lib/commands/status.mjs` |
| **重写** | `openclaw-plugin.js`, `openclaw.plugin.json` |
| **更新** | `lib/commands/validate.mjs`, `lib/validators/files.mjs`, `lib/validators/charters.mjs`, `lib/validators/plugin.mjs`, `lib/validators/templates.mjs` |
| **更新** | `lib/i18n/en.mjs`, `lib/i18n/zh.mjs`, `bin/jinyiwei.mjs`, `package.json` |
| **移动** | `agents/code/` → `agents/groups/dev/code/` 等 4 个内部 agent |
| **删除** | `scripts/install-openclaw.mjs` |
| **保留** | `lib/paths.mjs`, `lib/log.mjs`, `lib/exit-codes.mjs`, `lib/parse-skills.mjs`, `lib/validators/assert.mjs` |

---

## 6. 验证方式

```bash
# 单元测试
npm test

# 治理验证
npm run validate

# CLI 烟雾测试
node bin/jinyiwei.mjs help
node bin/jinyiwei.mjs status
node bin/jinyiwei.mjs validate

# 真实 OpenClaw 集成测试
node bin/jinyiwei.mjs install ~/.openclaw/workspace --dry-run
node bin/jinyiwei.mjs install ~/.openclaw/workspace
openclaw agents list --json  # 验证 agent 已注册
```
