import fs from "node:fs";
import readline from "node:readline";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig, writeConfig, validateConfig } from "../config.mjs";
import { discoverGroups } from "../groups.mjs";

const VALID_MODES = ["strict", "graded", "hybrid"];

/**
 * @param {readline.Interface} rl
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function ask(rl, prompt) {
  return new Promise((res) => rl.question(`    ${log.symbols.arrow} ${prompt}`, res));
}

/**
 * Interactive governance configuration.
 * @returns {Promise<number>} exit code
 */
export async function initCommand() {
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    log.banner(pkg.version);
    console.log(`  ${log.bold(t("init.welcome"))}`);
    console.log();

    const config = loadConfig();

    // Basic governance settings
    const bossTitle = (await ask(rl, t("init.prompt.bossTitle"))) || config.bossTitle;
    const watchSelfTitle = (await ask(rl, t("init.prompt.watchSelfTitle"))) || config.watchSelfTitle;
    const approvalMode = (await ask(rl, t("init.prompt.approvalMode"))) || config.approvalMode;

    if (!VALID_MODES.includes(approvalMode)) {
      console.log();
      log.fail(t("init.error.invalidMode"));
      console.log();
      return ExitCode.USER_ERROR;
    }

    const channelsRaw = (await ask(rl, t("init.prompt.externalChannels"))) || config.externalChannels.join(",");
    const externalChannels = channelsRaw.split(",").map((/** @type {string} */ c) => c.trim()).filter(Boolean);

    // Model configuration
    console.log();
    console.log(`  ${log.bold(t("init.modelConfig"))}`);
    console.log();

    const chatModel = (await ask(rl, t("init.prompt.chatModel", { default: config.models.chat || "none" }))) || config.models.chat;
    const watchModel = (await ask(rl, t("init.prompt.watchModel", { default: config.models.watch || "none" }))) || config.models.watch;

    // Discover groups and prompt model per group
    const { groups } = discoverGroups();
    const groupModels = { ...config.models.groups };

    for (const groupName of Object.keys(groups)) {
      const currentModel = config.models.groups?.[groupName] || "";
      const model = (await ask(rl, t("init.prompt.groupModel", { group: groupName, default: currentModel || "none" }))) || currentModel;
      groupModels[groupName] = model;
    }

    const newConfig = {
      bossTitle,
      watchSelfTitle,
      approvalMode,
      models: {
        chat: chatModel,
        watch: watchModel,
        groups: groupModels,
      },
      externalChannels,
    };

    const validation = validateConfig(newConfig);
    if (!validation.ok) {
      console.log();
      log.fail(t("config.invalid"));
      for (const e of validation.errors) log.detail(e);
      console.log();
      return ExitCode.VALIDATION_FAIL;
    }

    // Confirmation
    console.log();
    console.log(`  ${log.bold("Configuration summary:")}`);
    console.log(`    bossTitle: ${log.cyan(bossTitle)}`);
    console.log(`    watchSelfTitle: ${log.cyan(watchSelfTitle)}`);
    console.log(`    approvalMode: ${log.cyan(approvalMode)}`);
    console.log(`    externalChannels: ${externalChannels.join(", ")}`);
    console.log(`    models.chat: ${log.cyan(chatModel || "(not set)")}`);
    console.log(`    models.watch: ${log.cyan(watchModel || "(not set)")}`);
    for (const [group, model] of Object.entries(groupModels)) {
      console.log(`    models.groups.${group}: ${log.cyan(model || "(not set)")}`);
    }
    console.log();

    const confirm = (await ask(rl, "Save this configuration? [Y/n]: ")) || "y";
    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
      console.log();
      log.info("Configuration not saved.");
      console.log();
      return ExitCode.OK;
    }

    writeConfig(newConfig);
    console.log();
    log.summary("ok", t("init.summary.ok"));
    log.info(t("init.saved"));
    log.detail(resolve("jinyiwei.config.json"));
    console.log();
    return ExitCode.OK;
  } finally {
    rl.close();
  }
}
