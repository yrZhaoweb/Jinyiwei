export default {
  // CLI
  "cli.description": "OpenClaw governance plugin CLI",
  "cli.usage": "Usage:",
  "cli.commands.install": "Install Jinyiwei into an OpenClaw workspace",
  "cli.commands.uninstall": "Uninstall Jinyiwei plugin from OpenClaw",
  "cli.commands.validate": "Validate all governance files",
  "cli.commands.sync": "Sync skills_list.md -> preinstalled-skills.json",
  "cli.commands.status": "Show plugin status and governance summary",
  "cli.commands.init": "Interactive governance configuration",
  "cli.commands.help": "Show this help message",
  "cli.options.dryRun": "Show what would be done without making changes",
  "cli.options.skipPlugin": "Skip plugin install/enable steps",
  "cli.options.skipSkills": "Skip skill installation",
  "cli.options.copy": "Copy plugin files instead of symlinking",
  "cli.options.failFast": "Stop on first error",
  "cli.options.json": "Output machine-readable JSON",

  // Install
  "install.error.workspaceRequired": "Error: workspace path is required",
  "install.error.workspaceNotExist": "Error: workspace does not exist: {path}",
  "install.syncing": "Syncing skills manifest...",
  "install.validating": "Validating governance files...",
  "install.installing": "Installing into {path}...",

  // Uninstall
  "uninstall.start": "Uninstalling Jinyiwei plugin from OpenClaw...",
  "uninstall.skillsNote": "(Skills are not removed — uninstall them manually if needed)",
  "uninstall.warnDisable": "Warning: failed to disable plugin (may already be disabled)",
  "uninstall.errorUninstall": "Error: failed to uninstall plugin",
  "uninstall.done": "Jinyiwei plugin uninstalled.",

  // Status
  "status.bossTitle": "Boss title:",
  "status.watchSelfTitle": "Watch self-title:",
  "status.approvalMode": "Approval mode:",
  "status.ingressAgents": "Ingress agents:",
  "status.extChannels": "Ext. channels:",
  "status.skills": "Skills:",
  "status.validation": "Validation:",
  "status.ok": "OK",
  "status.failed": "FAILED",

  // Init
  "init.welcome": "Jinyiwei Governance Configuration",
  "init.prompt.bossTitle": "Boss title (default: Boss): ",
  "init.prompt.watchSelfTitle": "WatchAgent self-title (default: 锦衣卫): ",
  "init.prompt.approvalMode": "Approval mode [strict/graded/hybrid] (default: hybrid): ",
  "init.saved": "Configuration saved to {path}",
  "init.error.invalidMode": "Invalid approval mode. Must be one of: strict, graded, hybrid",

  // Report
  "report.validation": "Validation:",
  "report.pluginInstall": "Plugin install:",
  "report.pluginEnable": "Plugin enable:",
  "report.skills": "Skills:",
  "report.skillsSkipped": "skipped ({count})",
  "report.skillsInstalled": "{success}/{total} installed",
  "report.skillFailed": "FAILED: {skill} — {reason}",
  "report.commandNotFound": "command not found: {command}",
  "report.exitCode": "exit code {code}",
  "report.result": "Result:",
  "report.dryRun": "[dry-run]",
  "report.ok": "OK",
  "report.failed": "FAILED",

  // Validate
  "validate.missingFiles": "Required files are missing",
  "validate.skillsSyncError": "skills_list.md and manifests/preinstalled-skills.json are out of sync",
  "validate.noSkills": "preinstalled-skills.json has no skills",

  // Sync
  "sync.done": "Synced {count} skills to {path}",

  // General
  "error.unknown": "Unknown command: {command}",
};
