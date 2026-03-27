#!/usr/bin/env node

import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";
import { t } from "../lib/i18n.mjs";
import { ExitCode } from "../lib/exit-codes.mjs";
import { statusCommand } from "../lib/commands/status.mjs";
import { installCommand } from "../lib/commands/install.mjs";
import { uninstallCommand } from "../lib/commands/uninstall.mjs";
import { initCommand } from "../lib/commands/init.mjs";
import { validateCommand } from "../lib/commands/validate.mjs";
import { syncCommand } from "../lib/commands/sync.mjs";
import * as log from "../lib/log.mjs";

const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));

function printHelp() {
  log.banner(pkg.version);
  console.log(`  ${log.bold(t("cli.usage"))}`);
  console.log();
  console.log(`    ${log.cyan("jinyiwei install")} ${log.dim("<workspace>")}   ${t("cli.commands.install")}`);
  console.log(`    ${log.cyan("jinyiwei uninstall")}             ${t("cli.commands.uninstall")}`);
  console.log(`    ${log.cyan("jinyiwei validate")}              ${t("cli.commands.validate")}`);
  console.log(`    ${log.cyan("jinyiwei sync")}                  ${t("cli.commands.sync")}`);
  console.log(`    ${log.cyan("jinyiwei status")}                ${t("cli.commands.status")}`);
  console.log(`    ${log.cyan("jinyiwei init")}                  ${t("cli.commands.init")}`);
  console.log(`    ${log.cyan("jinyiwei help")}                  ${t("cli.commands.help")}`);
  console.log();
  console.log(`  ${log.bold(t("cli.installOptions"))}`);
  console.log();
  console.log(`    ${log.yellow("--dry-run")}        ${t("cli.options.dryRun")}`);
  console.log(`    ${log.yellow("--skip-plugin")}    ${t("cli.options.skipPlugin")}`);
  console.log(`    ${log.yellow("--skip-skills")}    ${t("cli.options.skipSkills")}`);
  console.log(`    ${log.yellow("--copy")}           ${t("cli.options.copy")}`);
  console.log(`    ${log.yellow("--fail-fast")}      ${t("cli.options.failFast")}`);
  console.log(`    ${log.yellow("--json")}           ${t("cli.options.json")}`);
  console.log(`    ${log.yellow("--verbose")}        ${t("cli.options.verbose")}`);
  console.log();
  console.log(`  ${log.bold(t("cli.examples"))}`);
  console.log();
  console.log(`    ${log.dim("$")} jinyiwei install /path/to/openclaw/workspace`);
  console.log(`    ${log.dim("$")} jinyiwei install /path/to/workspace --dry-run`);
  console.log(`    ${log.dim("$")} jinyiwei init`);
  console.log();
}

const [command, ...args] = process.argv.slice(2);

// Parse global flags
if (args.includes("--verbose")) {
  log.setLevel("verbose");
}

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(ExitCode.OK);
}

if (!command) {
  log.banner(pkg.version);
  console.log(`  ${log.symbols.arrow} ${t("banner.quickStart")}`);
  console.log(`  ${log.symbols.info} ${t("banner.noCommand")}`);
  console.log();
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
    exitCode = validateCommand(args);
    break;

  case "sync":
    exitCode = syncCommand();
    break;

  case "status":
    exitCode = statusCommand(args);
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
    log.banner(pkg.version);
    log.fail(t("error.unknown", { command }));
    console.log(`  ${log.symbols.info} ${t("banner.noCommand")}`);
    console.log();
    exitCode = ExitCode.USER_ERROR;
    break;
}

process.exit(exitCode);
