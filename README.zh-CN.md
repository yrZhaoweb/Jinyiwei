# Jinyiwei（锦衣卫）

[![npm version](https://img.shields.io/npm/v/@yrzhao/jinyiwei.svg)](https://www.npmjs.com/package/@yrzhao/jinyiwei)
[![CI](https://github.com/yrzhao/Jinyiwei/actions/workflows/validate.yml/badge.svg)](https://github.com/yrzhao/Jinyiwei/actions)
[![license](https://img.shields.io/npm/l/@yrzhao/jinyiwei.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@yrzhao/jinyiwei.svg)](./package.json)

[English](./README.md)

> OpenClaw 的治理、监督与 Markdown 驱动的代理层级控制插件。

## 为什么需要 Jinyiwei？

多代理系统如果缺乏治理，很快就会陷入混乱 — 代理随意与用户对话、绕过审批、做出无法审计的决策。**Jinyiwei**（锦衣卫）通过强制执行严格、可审计的层级结构来解决这个问题：

- **单一入口** — 只有 `ChatAgent` 和 `WatchAgent` 面向 Boss（用户）
- **强制审批** — 每个操作在执行前都必须经过 `WatchAgent` 审批
- **风险分级控制** — 混合审批矩阵自动批准低风险操作，升级高风险操作
- **完整审计追踪** — 每次分发、批准、拒绝和结果都通过结构化模板记录
- **Markdown 即代码** — 所有治理规则、代理章程和模板都是纯 Markdown 文件，可版本控制、CI 校验

## 架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                   👤 Boss                                    │
│                            (用户/飞书/Telegram)                              │
└──────────────────────────────────────────────────────────────────────────────┘
                    │ 请求/响应                             ▲ 告警/阻止
                    ▼                                       │
┌──────────────────────────────────────────────────────────────────────────────┐
│               ChatAgent                               WatchAgent             │
│              (任务拆解)                               (监督审批)             │
└──────────────────────────────────────────────────────────────────────────────┘
                    │ 分发任务                              ▲ 动作审批
                    ▼                                       │
┌──────────────────────────────────────────────────────────────────────────────┐
│ [AgentGroup1] 研发开发      [AgentGroup2] 内容创作      [AgentGroup3] 数据分析   │
│ [AgentGroup4] 市场营销      [AgentGroup5] 财务管理      [AgentGroup6] 人力资源   │
│ [AgentGroup7] 法务合规      [AgentGroup8] 客户服务      [AgentGroup9] 供应链     │
│ [AgentGroup10] 战略规划     [AgentGroupN] 其他职能                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 工作流程

1. **任务分发** — Boss → ChatAgent 拆解任务 → 分发到工作组
2. **动作监督** — 每个 Agent 的动作 → WatchAgent 审批
3. **风险控制** — WatchAgent 评估：
   - ✅ 低风险 → 自动批准
   - ⚠️ 中风险 → 告警 Boss
   - 🛑 高风险 → 立即阻止
4. **结果汇总** — 结果通过 ChatAgent → Boss

## 快速开始

全局安装：

```bash
npm install -g @yrzhao/jinyiwei
jinyiwei install /path/to/openclaw/workspace
```

免安装使用：

```bash
npx @yrzhao/jinyiwei install /path/to/openclaw/workspace
```

## CLI 命令

```
jinyiwei install <workspace>   将 Jinyiwei 安装到 OpenClaw 工作区
jinyiwei uninstall             从 OpenClaw 卸载 Jinyiwei 插件
jinyiwei validate              校验所有治理文件
jinyiwei sync                  同步 skills_list.md -> preinstalled-skills.json
jinyiwei status                显示插件状态和治理概览
jinyiwei init                  交互式治理配置
jinyiwei help                  显示帮助
```

安装选项：

```
--dry-run        仅展示将执行的操作，不做实际变更
--skip-plugin    跳过插件安装/启用步骤
--skip-skills    跳过技能安装
--copy           复制插件文件而非创建符号链接
--fail-fast      遇到第一个错误即停止
--json           输出机器可读的 JSON
```

示例：

```bash
jinyiwei install /path/to/workspace --dry-run    # 预览变更
jinyiwei install /path/to/workspace --skip-skills # 仅安装插件
jinyiwei uninstall                                # 移除插件
jinyiwei validate                                 # 检查治理完整性
jinyiwei status                                   # 查看当前配置
jinyiwei init                                     # 交互式配置
```

## 配置

Jinyiwei 的项目级治理配置位于 `jinyiwei.config.json`。运行 `jinyiwei init` 进行交互式设置，或直接编辑该文件。`openclaw.plugin.json` 仍然负责插件清单和提供给 OpenClaw 的运行时 schema。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `bossTitle` | `string` | `"Boss"` | 代理如何称呼用户 |
| `watchSelfTitle` | `string` | `"锦衣卫"` | WatchAgent 向 Boss 自我介绍的称谓 |
| `approvalMode` | `string` | `"hybrid"` | 审批策略：`strict`、`graded` 或 `hybrid` |
| `externalChannels` | `string[]` | `["feishu", "telegram"]` | 允许的外部通信通道 |
| `models.chat` | `string` | `""` | `ChatAgent` 使用的模型 |
| `models.watch` | `string` | `""` | `WatchAgent` 使用的模型 |
| `models.groups.<name>` | `string` | `""` | 每个内部工作组共享的模型 |

### 本地化

设置 `JINYIWEI_LANG=zh` 使用中文 CLI 输出，`JINYIWEI_LANG=en` 使用英文（默认）。

## 治理规则

- Boss 通过 `ChatAgent` 或 `WatchAgent` 进入系统
- `WatchAgent` 必须审批每个操作
- 内部代理不得直接与 Boss 交流
- `ChatAgent` 和 `WatchAgent` 必须称呼用户为 `Boss`
- `WatchAgent` 必须自称 `锦衣卫`
- 审批策略为 `hybrid`：通道和权限违规被硬阻断，普通工作按风险分级
- `WatchAgent` 使用操作目录对具体操作进行分类后再审批
- `ChatAgent` 必须使用标准分发包模板分派工作
- `WatchAgent` 必须使用标准审批决定模板回应
- `WatchAgent` 必须使用标准拒绝决定模板发出拒绝
- 每个操作必须使用标准审计条目模板记录
- 每个内部代理必须使用各自的响应模板返回工作
- 每个操作必须由 Markdown 控制文件提供依据
- 安装 Jinyiwei 时会同时安装 `skills_list.md` 中列出的技能

## 预装技能

根文件 `skills_list.md` 被解析为 `manifests/preinstalled-skills.json`。当前列表包含 48 个技能，在 OpenClaw 启动时安装。

## 校验

`jinyiwei validate` 检查：

- 必需的插件、技能、章程、规则和模板文件是否存在
- `skills_list.md` 与 `manifests/preinstalled-skills.json` 是否同步
- 插件默认值是否仍然执行 `Boss`、`锦衣卫`、`approvalMode=hybrid` 和外部通道锁定
- 操作目录和分发包模板是否存在并被规则引用
- 审批、拒绝、审计和内部响应模板是否存在并被规则引用
- 代理章程是否仍然遵守仅外部和仅内部的边界

## 开发

```bash
npm test                # 运行单元测试
npm run validate        # 运行治理校验
npm run sync:skills     # 同步 skills_list.md -> 清单
npm run sync:version    # 同步版本到 openclaw.plugin.json
```

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行修改 — 治理文件由 CI 自动校验
4. 运行 `npm test && npm run validate`
5. 提交 Pull Request

## 许可证

MIT
