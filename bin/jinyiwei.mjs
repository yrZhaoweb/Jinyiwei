#!/usr/bin/env node

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../lib/paths.mjs";
import { t } from "../lib/i18n.mjs";
import { ExitCode } from "../lib/exit-codes.mjs";
import { statusCommand } from "../lib/commands/status.mjs";
import { installCommand } from "../lib/commands/install.mjs";
import { uninstallCommand } from "../lib/commands/uninstall.mjs";
import { initCommand } from "../lib/commands/init.mjs";

const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));

function buildUsage() {
  return `
jinyiwei v${pkg.version} — ${t("cli.description")}

${t("cli.usage")}
  jinyiwei install <workspace>   ${t("cli.commands.install")}
  jinyiwei uninstall             ${t("cli.commands.uninstall")}
  jinyiwei validate              ${t("cli.commands.validate")}
  jinyiwei sync                  ${t("cli.commands.sync")}
  jinyiwei status                ${t("cli.commands.status")}
  jinyiwei init                  ${t("cli.commands.init")}
  jinyiwei help                  ${t("cli.commands.help")}

Install options:
  --dry-run        ${t("cli.options.dryRun")}
  --skip-plugin    ${t("cli.options.skipPlugin")}
  --skip-skills    ${t("cli.options.skipSkills")}
  --copy           ${t("cli.options.copy")}
  --fail-fast      ${t("cli.options.failFast")}
  --json           ${t("cli.options.json")}

Examples:
  npx @yrzhao/jinyiwei install /path/to/openclaw/workspace
  npx @yrzhao/jinyiwei install /path/to/workspace --dry-run
  npx @yrzhao/jinyiwei uninstall
  npx @yrzhao/jinyiwei validate
  npx @yrzhao/jinyiwei init
`.trim();
}

/**
 * @param {string} script
 * @param {string[]} args
 * @returns {number}
 */
function runScript(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

const [command, ...args] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  console.log(buildUsage());
  process.exit(ExitCode.OK);
}

if (command === "--version" || command === "-v") {
  console.log(`jinyiwei v${pkg.version}`);
  process.exit(ExitCode.OK);
}

/** @type {number} */
let exitCode;

switch (command) {
  case "validate":
    exitCode = runScript(resolve("scripts/validate-jinyiwei.mjs"));
    break;

  case "sync":
    exitCode = runScript(resolve("scripts/sync-skills-manifest.mjs"));
    break;

  case "status":
    exitCode = statusCommand();
    break;

  case "install":
    exitCode = installCommand(args);
    break;

  case "uninstall":
    exitCode = uninstallCommand(args);
    break;

  case "init":
    exitCode = await initCommand();
    break;

  default:
    console.error(t("error.unknown", { command }) + "\n");
    console.log(buildUsage());
    exitCode = ExitCode.USER_ERROR;
    break;
}

process.exit(exitCode);
