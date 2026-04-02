# ECC + Jinyiwei 项目审查与优化流程

## 概述

本文档定义了一套基于 ECC (Enterprise Claude Code) 生态的 Jinyiwei 项目审查与优化流程。通过将 ECC 开发者代理与 Jinyiwei 内部代理配对，实现可落地、可执行的项目质量保障。

---

## 一、代理配对矩阵

| Jinyiwei 内部代理 | ECC 开发者代理 | 职责领域 |
|-------------------|---------------|---------|
| **ChatAgent** | `planner` / `architect` | 项目规划、架构设计 |
| **WatchAgent** | `security-reviewer` | 安全审查、风险评估 |
| **CodeAgent** | `code-reviewer` / `typescript-reviewer` | 代码质量审查 |
| **ReviewAgent** | `refactor-cleaner` | 重构优化、死代码清理 |
| **TestAgent** | `tdd-guide` | 测试覆盖率、测试策略 |
| **UIAgent** | `frontend-developer` / `ui-designer` | 交互优化、界面改进 |
| — | `devops-automator` | CI/CD 优化、自动化 |
| — | `document-generator` / `doc-updater` | 文档完善 |

---

## 二、审查流程（分阶段）

### 阶段 1：基线检查（ChatAgent + planner）

**目标**：建立项目当前状态基线

```
执行步骤：
1. 运行完整测试套件 → 记录覆盖率基线
2. 运行 npm run validate → 记录所有警告
3. 运行 npm test -- --coverage → 获取精确覆盖率数据
4. 执行 npm run lint（如果有）→ 记录 lint 错误
5. 统计代码行数、模块数量、依赖数量
```

**产出**：
- `baseline-report.json`：测试覆盖率、lint 错误、依赖健康度
- `baseline-issues.md`：问题优先级排序

---

### 阶段 2：安全与治理审查（WatchAgent + security-reviewer）

**目标**：确保 governance 机制健壮性

```
审查项：
1. openclaw-plugin.js
   - 所有 registerTool() 调用是否正确暴露
   - 工具参数是否完整验证
   - 错误处理是否泄露敏感信息

2. 治理规则完整性
   - rules/ 目录下所有 .md 文件是否被正确引用
   - approval-matrix.md 是否覆盖所有风险等级
   - channel-access.md 是否正确限制外部通道

3. 配置安全
   - jinyiwei.config.json 是否正确验证必填字段
   - 模型配置是否防止注入

4. 敏感信息检查
   - grep -r "password\|secret\|token\|key" lib/ → 确认无硬编码
```

**ECC Agent 执行命令**：
```
使用 security-reviewer agent 扫描：
- lib/openclaw.mjs
- lib/config.mjs
- lib/validators/
- openclaw-plugin.js
```

**产出**：
- `security-report.md`
- `governance-audit.md`

---

### 阶段 3：代码质量审查（CodeAgent + code-reviewer/typescript-reviewer）

**目标**：提升代码质量、发现潜在缺陷

```
审查维度：

1. 错误处理完整性
   - 所有 spawnSync 调用是否检查 status
   - 所有 fs 操作是否 try/catch
   - 错误消息是否用户友好

2. 路径安全
   - 所有 resolve() 调用是否防止路径遍历
   - 用户输入是否经过验证

3. 模块耦合度
   - 检查循环依赖：madge lib/ --format esm
   - 检查未使用的导出
   - 检查过大的模块（>500 行）

4. 类型安全
   - 所有函数是否有 JSDoc 类型标注
   - 是否有 any 类型滥用

5. i18n 完整性
   - 所有用户可见字符串是否通过 t() 翻译
   - 新增命令是否同步 i18n key
```

**ECC Agent 执行命令**：
```
使用 typescript-reviewer agent 扫描所有 .mjs 文件：
- lib/commands/
- lib/validators/
- lib/governance/
```

**产出**：
- `code-quality-report.md`
- `refactoring-candidates.md`

---

### 阶段 4：测试策略审查（TestAgent + tdd-guide）

**目标**：确保 80%+ 测试覆盖率，识别测试盲区

```
审查维度：

1. 覆盖率分析
   - 哪些文件/函数完全没有测试
   - 边界条件是否被覆盖
   - 错误路径是否有测试

2. 测试质量
   - 是否有测试隔离（不依赖外部状态）
   - 是否有合理的 mock
   - 断言是否足够精确

3. 新功能测试
   - doctor 命令是否有测试
   - verify 命令是否有测试
   - configure 命令是否有测试
   - setup 命令是否有测试

4. 集成测试
   - install 命令的 8 个步骤是否有集成测试
   - 与 OpenClaw CLI 的交互是否被 mock
```

**执行命令**：
```bash
node --test --test-concurrency=1 test/*.test.mjs
npm run validate
```

**产出**：
- `test-coverage-report.md`
- `test-improvement-plan.md`

---

### 阶段 5：重构与优化（ReviewAgent + refactor-cleaner）

**目标**：清理死代码、优化模块结构

```
审查维度：

1. 死代码检测
   - 未使用的函数导出
   - 未被调用的内部函数
   - 注释掉的废弃代码

2. 重复代码
   - 相似逻辑是否可抽象
   - 是否有重复的验证逻辑

3. 模块职责
   - lib/ 是否职责过于集中
   - 是否需要拆分过大的命令模块

4. 配置驱动
   - 硬编码值是否应移至配置

5. 性能检查
   - 是否有不必要的文件 I/O
   - 是否有同步阻塞操作可改为异步
```

**执行命令**：
```bash
# 检测未使用的导出
node --check lib/commands/install.mjs
grep -r "export.*function\|export.*const" lib/ | cut -d: -f2 | sort -u

# 检测重复代码
cloc lib/ --by-file --csv
```

**产出**：
- `refactoring-plan.md`
- `dead-code-report.md`

---

### 阶段 6：DevOps 与 CI 优化（DevOps Automator）

**目标**：提升 CI 效率，完善自动化

```
审查维度：

1. CI 配置
   - .github/workflows/validate.yml 是否覆盖所有 Node 版本
   - 是否使用缓存加速依赖安装
   - 是否有并行 job 优化

2. 脚本完整性
   - prepublishOnly 是否足够健壮
   - 是否有 rollback 机制

3. 发布流程
   - npm publish 前的检查清单
   - 版本号同步是否自动化

4. 监控与日志
   - 关键路径是否有日志
   - 错误是否被正确上报
```

**产出**：
- `devops-optimization.md`
- `.github/workflows/` 改进建议

---

### 阶段 7：文档完善（Doc Updater）

**目标**：确保文档与代码同步

```
审查维度：

1. CLAUDE.md / AGENTS.md 同步
   - 命令列表是否最新
   - 模块描述是否准确
   - 新增模块是否已记录

2. 命令文档
   - --help 输出是否完整
   - --json 输出是否有说明

3. 示例与教程
   - README 是否需要更新
   - 是否有 CHANGELOG 更新流程

4. 架构图更新
   - ASCII 架构图是否反映最新结构
```

**产出**：
- `documentation-gap-analysis.md`
- CLAUDE.md / AGENTS.md 更新草案

---

## 三、执行流程

### 完整审查流程（建议每月一次）

```
Week 1: Phase 1-2（基线 + 安全）
Week 2: Phase 3-4（代码 + 测试）
Week 3: Phase 5-6（重构 + DevOps）
Week 4: Phase 7 + 汇总报告 + 实施优化
```

### 快速审查流程（PR 合并前）

```
必做检查（< 30 分钟）：
1. npm test → 必须通过
2. npm run validate → 必须通过
3. security-reviewer 扫描新代码
4. typescript-reviewer 扫描新代码
```

---

## 四、输出模板

### 问题报告格式

```markdown
## [P0/P1/P2] 问题标题

**发现位置**：`lib/xxx.mjs:行号`
**问题类型**：安全/质量/性能/文档
**描述**：具体问题描述
**建议修复**：具体修复方案
**工时估计**：X 小时
**优先级**：P0（必须修复）/ P1（下次发布前）/ P2（后续迭代）
```

### 优化项格式

```markdown
## [HIGH/MEDIUM/LOW] 优化项标题

**当前状态**：描述
**优化目标**：描述
**实施步骤**：1. 2. 3.
**预期收益**：性能提升 X%/ 代码减少 X 行/ 覆盖率提升 X%
**依赖项**：其他优化项或外部依赖
```

---

## 五、ECC Agent 快速调用指南

```bash
# 1. 安全审查
agent: security-reviewer
prompt: 扫描 lib/openclaw.mjs, lib/config.mjs, openclaw-plugin.js 的安全漏洞

# 2. 代码质量审查
agent: code-reviewer
prompt: 审查 lib/commands/ 目录下所有命令模块的代码质量

# 3. TypeScript/类型审查
agent: typescript-reviewer
prompt: 审查 lib/governance/ 目录下所有 .mjs 文件的类型安全

# 4. 重构建议
agent: refactor-cleaner
prompt: 分析 lib/ 目录，找出死代码、重复代码、重构机会

# 5. 测试策略
agent: tdd-guide
prompt: 分析现有测试覆盖率，提出达到 80% 覆盖率的测试改进计划

# 6. 架构审查
agent: architect
prompt: 审查整个项目架构，提出模块化改进建议

# 7. DevOps 优化
agent: devops-automator
prompt: 审查 .github/workflows/ 和 npm scripts，提出 CI/CD 优化建议

# 8. 文档审查
agent: doc-updater
prompt: 对比 CLAUDE.md 和实际代码，列出需要更新的文档内容
```

---

## 六、验收标准

每次审查完成后，以下指标必须达标：

| 指标 | 目标值 | 验收方法 |
|------|--------|---------|
| 测试通过率 | 100% | `npm test` 退出码 0 |
| 验证通过率 | 100% | `npm run validate` 退出码 0 |
| 安全漏洞 | 0 个 P0 | security-reviewer 报告 |
| 代码覆盖率 | ≥ 80% | node --test --experimental-test-coverage |
| Lint 错误 | 0 个 | ESLint/TSErrors |
| 文档同步率 | 100% | CLAUDE.md 与代码一致 |

---

## 七、持续优化机制

1. **周报**：每周生成 `review-week-N.md`，记录发现与修复
2. **月度审查**：每月一次完整 Phase 1-7 审查
3. **PR 前检查**：所有 PR 必须通过快速审查流程
4. **版本发布前**：必须完成所有 P0/P1 问题修复

---

*最后更新：2026-04-01*
