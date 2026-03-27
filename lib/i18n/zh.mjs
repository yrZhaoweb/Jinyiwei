export default {
  // CLI
  "cli.description": "OpenClaw 治理插件命令行工具",
  "cli.usage": "用法：",
  "cli.commands.install": "将 Jinyiwei 安装到 OpenClaw 工作区",
  "cli.commands.uninstall": "从 OpenClaw 卸载 Jinyiwei 插件",
  "cli.commands.validate": "校验所有治理文件",
  "cli.commands.sync": "同步 skills_list.md -> preinstalled-skills.json",
  "cli.commands.status": "显示插件状态和治理概览",
  "cli.commands.init": "交互式治理配置",
  "cli.commands.help": "显示帮助信息",
  "cli.options.dryRun": "仅展示将执行的操作，不做实际变更",
  "cli.options.skipPlugin": "跳过插件安装/启用步骤",
  "cli.options.skipSkills": "跳过技能安装",
  "cli.options.copy": "复制插件文件而非创建符号链接",
  "cli.options.failFast": "遇到第一个错误即停止",
  "cli.options.json": "输出机器可读的 JSON",
  "cli.options.verbose": "显示详细输出",
  "cli.installOptions": "安装选项：",
  "cli.examples": "示例：",

  // Install
  "install.error.workspaceRequired": "需要提供工作区路径",
  "install.error.workspaceNotExist": "工作区不存在：{path}",
  "install.error.workspaceHint": "用法：jinyiwei install <工作区路径> [选项]",
  "install.loadingConfig": "加载配置",
  "install.discoveringGroups": "发现代理分组",
  "install.syncing": "同步技能清单",
  "install.validating": "校验治理文件",
  "install.installingPlugin": "将插件安装到工作区",
  "install.registeringAgents": "向 OpenClaw 注册代理",
  "install.agentRegistered": "已注册 {agent}（模型：{model}）",
  "install.installingSkills": "安装 {count} 个技能",
  "install.target": "工作区：{path}",
  "install.summary.ok": "Jinyiwei 安装成功！",
  "install.summary.fail": "安装失败",
  "install.summary.partialFail": "插件已安装，但部分步骤失败",
  "install.summary.dryRunOk": "模拟运行完成 — 未做任何变更",
  "install.deployingAgents": "部署代理工作区",
  "install.agentDryRun": "将在 {path} 创建 {agent} 工作区",
  "install.openclawNotFound": "未找到 openclaw CLI — 跳过插件安装",
  "install.skillProgress": "正在安装 {skill}...",
  "install.skillsResult": "{success}/{total} 个技能已安装",
  "install.nextSteps": "后续步骤：",
  "install.nextStep.status": "运行 `jinyiwei status` 验证安装",
  "install.nextStep.init": "运行 `jinyiwei init` 自定义治理配置",

  // Uninstall
  "uninstall.start": "正在从 OpenClaw 卸载 Jinyiwei 插件",
  "uninstall.deletingAgents": "删除已注册的代理",
  "uninstall.agentsNote": "代理工作区已保留 — 如需删除请手动操作",
  "uninstall.disabling": "禁用插件",
  "uninstall.removing": "移除插件",
  "uninstall.skillsNote": "技能不会被移除 — 如需卸载请手动操作",
  "uninstall.warnDisable": "禁用插件失败（可能已经禁用）",
  "uninstall.errorUninstall": "卸载插件失败",
  "uninstall.done": "Jinyiwei 插件已卸载",

  // Status
  "status.header": "治理状态",
  "status.bossTitle": "Boss 称谓",
  "status.watchSelfTitle": "Watch 自称",
  "status.approvalMode": "审批模式",
  "status.ingressAgents": "入口代理",
  "status.extChannels": "外部通道",
  "status.externalAgents": "外部代理",
  "status.agentGroups": "代理分组",
  "status.skills": "预装技能",
  "status.validation": "校验状态",
  "status.ok": "通过",
  "status.failed": "失败",

  // Init
  "init.welcome": "Jinyiwei 治理配置",
  "init.modelConfig": "模型配置",
  "init.prompt.bossTitle": "Boss 称谓（默认：Boss）：",
  "init.prompt.watchSelfTitle": "WatchAgent 自称（默认：锦衣卫）：",
  "init.prompt.approvalMode": "审批模式 [strict/graded/hybrid]（默认：hybrid）：",
  "init.prompt.externalChannels": "外部通道（逗号分隔，默认：feishu,telegram）：",
  "init.prompt.chatModel": "ChatAgent 模型（默认：{default}）：",
  "init.prompt.watchModel": "WatchAgent 模型（默认：{default}）：",
  "init.prompt.groupModel": "'{group}' 分组模型（默认：{default}）：",
  "init.saved": "配置已保存",
  "init.error.invalidMode": "无效的审批模式，必须是：strict、graded 或 hybrid",
  "init.summary.ok": "治理配置成功！",

  // Config
  "config.invalid": "配置验证失败",

  // Validate
  "validate.missingFiles": "缺少必需文件",
  "validate.skillsSyncError": "skills_list.md 与 manifests/preinstalled-skills.json 不同步",
  "validate.noSkills": "preinstalled-skills.json 中没有技能",

  // Sync
  "sync.done": "已同步 {count} 个技能到 {path}",

  // Banner
  "banner.noCommand": "运行 `jinyiwei help` 查看可用命令",
  "banner.quickStart": "快速开始：jinyiwei install <工作区路径>",

  // Version
  "validate.versionMismatch": "package.json 版本（{pkgVersion}）与 openclaw.plugin.json 版本（{pluginVersion}）不一致",

  // General
  "error.unknown": "未知命令：{command}",
};
