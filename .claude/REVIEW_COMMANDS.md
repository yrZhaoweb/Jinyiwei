# 快速审查命令卡

## 每日验证（每次 PR 前必做）

```bash
npm test                    # 94 tests, must pass
npm run validate            # must show ok: true
```

---

## 阶段 1：安全审查（ECC → security-reviewer）

**扫描范围**：
- `lib/openclaw.mjs` — 命令注入、路径安全
- `lib/config.mjs` — 配置验证、注入风险
- `openclaw-plugin.js` — 工具注册、参数验证

**触发命令**：
```
/agent security-reviewer
审查 Jinyiwei 项目安全，重点关注：
1. spawnSync 命令注入（openclaw.mjs）
2. path.join 路径遍历（config.mjs, install.mjs）
3. JSON.parse 拒绝服务（parseOpenClawJson in lifecycle.mjs）
4. registerTool 参数验证（openclaw-plugin.js）
```

---

## 阶段 2：代码质量（ECC → typescript-reviewer）

**扫描范围**：
- `lib/commands/` — 所有命令模块
- `lib/governance/` — governance 子系统

**触发命令**：
```
/agent typescript-reviewer
审查 lib/commands/ 和 lib/governance/ 的代码质量：
1. 错误处理不完整的地方
2. JSDoc 类型标注缺失
3. 函数过大（建议 >50 行）
4. any 类型滥用
5. 可抽象的重复逻辑
```

---

## 阶段 3：重构分析（ECC → refactor-cleaner）

**触发命令**：
```
/agent refactor-cleaner
分析 lib/ 目录的重构机会：
1. 未使用的 export 函数
2. 重复的验证逻辑
3. 过大的模块（>200行）
4. 可提取的共享工具
5. 循环依赖检测
```

---

## 阶段 4：测试覆盖率（ECC → tdd-guide）

**触发命令**：
```
/agent tdd-guide
为 Jinyiwei 项目制定测试改进计划：
1. 分析现有测试覆盖率（node --test --experimental-test-coverage）
2. 识别测试盲区（doctor, verify, configure, setup 命令）
3. 制定达到 80% 覆盖率的路线图
4. 推荐测试隔离策略（mock openclaw CLI）
```

---

## 阶段 5：文档同步（ECC → doc-updater）

**触发命令**：
```
/agent doc-updater
审查并更新 Jinyiwei 文档：
1. CLAUDE.md 与实际代码对比
2. AGENTS.md 与 CLAUDE.md 合并建议
3. 命令帮助文本完整性
4. README 是否需要更新
```

---

## 阶段 6：CI/CD 优化（ECC → devops-automator）

**触发命令**：
```
/agent devops-automator
审查 .github/workflows/validate.yml：
1. 是否覆盖 Node 18, 20, 22
2. 依赖缓存策略
3. 并行 job 可能性
4. prepublishOnly 健壮性
```

---

## 手动检查清单

### 安全检查
```bash
# 检查硬编码 secrets
grep -rE "password|secret|token|api.?key" lib/ --include="*.mjs"

# 检查路径遍历风险
grep -rE "readFileSync|writeFileSync|statSync" lib/ | grep -v "resolve\("
```

### 代码质量检查
```bash
# 检查大文件（>300行）
wc -l lib/**/*.mjs | sort -rn | head -10

# 检查未使用导出
node --check lib/commands/install.mjs
```

### 测试覆盖率
```bash
# Node.js 22+ 覆盖率
node --test --experimental-test-coverage test/*.test.mjs 2>&1 | grep -E " coverage"
```

---

## 报告输出位置

| 报告 | 文件位置 |
|------|---------|
| 完整审查流程 | `.claude/ECC_REVIEW_PROCESS.md` |
| 基线数据 | `.claude/BASELINE.md` |
| 本次快速审查 | `.claude/REVIEW_COMMANDS.md` |

---

*使用说明：按顺序执行阶段 1-6，或根据需要选择特定阶段*
