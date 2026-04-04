import fs from "node:fs";
import readline from "node:readline";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig, writeConfig, validateConfig, sanitizeConfig } from "../config.mjs";
import { discoverGroups } from "../groups.mjs";
import { buildBeginnerSummary } from "../lifecycle.mjs";
import { formatChannelList, parseDelimitedList } from "../utils.mjs";

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
 * @param {readline.Interface} rl
 * @param {string} prompt
 * @param {string[]} options
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function askChoice(rl, prompt, options, fallback) {
  const answer = (await ask(rl, `${prompt} (${options.join("/")}, default: ${fallback}): `)).trim();
  return options.includes(answer) ? answer : fallback;
}

/**
 * @param {readline.Interface} rl
 * @param {string} prompt
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function askOptional(rl, prompt, fallback) {
  const answer = (await ask(rl, `${prompt} (default: ${fallback}): `)).trim();
  return answer || fallback;
}

/**
 * @param {readline.Interface} rl
 * @param {string} prompt
 * @param {string[]} fallback
 * @returns {Promise<string[]>}
 */
async function askDelimitedList(rl, prompt, fallback) {
  const answer = (await ask(rl, `${prompt} (comma-separated, default: ${formatChannelList(fallback)}): `)).trim();
  if (!answer) return [...fallback];
  if (answer.toLowerCase() === "local") return [];
  return parseDelimitedList(answer);
}

/**
 * Interactive governance configuration.
 * @returns {Promise<number>} exit code
 */
export async function initCommand() {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  } catch {
    pkg = { version: "unknown" };
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    log.banner(pkg.version);
    console.log(`  ${log.bold(t("init.welcome"))}`);
    console.log();
    console.log(`  ${log.dim(t("init.wizardIntro"))}`);
    console.log(`  ${log.dim(t("init.pressEnter"))}`);
    console.log();

    const config = loadConfig();
    const { groups } = discoverGroups();

    const setupStyle = await askChoice(rl, t("init.prompt.setupStyle"), ["simple", "advanced"], "simple");

    // Basic governance settings
    const bossTitle = await askOptional(rl, t("init.prompt.bossTitle"), config.bossTitle);
    const watchSelfTitle = await askOptional(rl, t("init.prompt.watchSelfTitle"), config.watchSelfTitle);
    const approvalMode = await askChoice(rl, t("init.prompt.approvalMode"), VALID_MODES, config.approvalMode);

    const externalChannels = await askDelimitedList(rl, t("init.prompt.externalChannelsLabel"), config.externalChannels);

    // Model configuration
    console.log();
    console.log(`  ${log.bold(t("init.modelConfig"))}`);
    console.log();
    console.log(`  ${t("init.label.setupStyle")}: ${log.cyan(setupStyle)}`);
    console.log(`  ${t("init.label.allowedChannels")}: ${log.cyan(formatChannelList(externalChannels))}`);
    console.log();

    const chatModel = await askOptional(rl, t("init.prompt.chatModel", { default: config.models.chat || "none" }), config.models.chat);
    const watchModel = await askOptional(rl, t("init.prompt.watchModel", { default: config.models.watch || "none" }), config.models.watch);

    const groupModels = { ...config.models.groups };

    if (setupStyle === "simple") {
      const sharedModel = await askOptional(rl, t("init.prompt.sharedModel"), chatModel);
      for (const groupName of Object.keys(groups)) {
        groupModels[groupName] = sharedModel || chatModel;
      }
    } else {
      for (const groupName of Object.keys(groups)) {
        const currentModel = config.models.groups?.[groupName] || "";
        const model = await askOptional(
          rl,
          t("init.prompt.groupModel", { group: groupName, default: currentModel || "none" }),
          currentModel
        );
        groupModels[groupName] = model;
      }
    }

    const newConfig = sanitizeConfig({
      bossTitle,
      watchSelfTitle,
      approvalMode,
      models: {
        chat: chatModel,
        watch: watchModel,
        groups: groupModels,
      },
      externalChannels,
    });

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
    console.log(`  ${log.bold(t("init.configurationSummary"))}`);
    console.log(`    bossTitle: ${log.cyan(bossTitle)}`);
    console.log(`    watchSelfTitle: ${log.cyan(watchSelfTitle)}`);
    console.log(`    approvalMode: ${log.cyan(approvalMode)}`);
    console.log(`    ${t("init.label.setupStyle")}: ${log.cyan(setupStyle)}`);
    console.log(`    ${t("init.label.allowedChannels")}: ${formatChannelList(externalChannels)}`);
    console.log(`    models.chat: ${log.cyan(chatModel || t("init.notSet"))}`);
    console.log(`    models.watch: ${log.cyan(watchModel || t("init.notSet"))}`);
    for (const [group, model] of Object.entries(groupModels)) {
      console.log(`    models.groups.${group}: ${log.cyan(model || t("init.notSet"))}`);
    }
    console.log();

    const confirm = (await ask(rl, t("init.savePrompt"))) || "y";
    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
      console.log();
      log.info(t("init.notSaved"));
      console.log();
      return ExitCode.OK;
    }

    writeConfig(newConfig);
    console.log();
    log.summary("ok", t("init.summary.ok"));
    log.info(t("init.saved"));
    log.detail(resolve("jinyiwei.config.json"));
    console.log();
    for (const line of buildBeginnerSummary({
      externalAgents: [
        { name: "ChatAgent", model: newConfig.models.chat },
        { name: "WatchAgent", model: newConfig.models.watch },
      ],
      groups: Object.fromEntries(
        Object.entries(groupModels).map(([groupName, model]) => [
          groupName,
          {
            agents: groups[groupName]?.agents.map((agent) => agent.name) || [],
            model,
          },
        ])
      ),
      externalChannels: newConfig.externalChannels,
      bindings: [],
      needsConfig: !newConfig.models.chat || !newConfig.models.watch,
    })) {
      console.log(`  ${line}`);
    }
    console.log();
    console.log(`  ${log.bold(t("init.finishTitle"))}`);
    console.log(`    ${log.symbols.arrow} ${t("init.finishStatus")}`);
    console.log(`    ${log.symbols.arrow} ${t("init.finishChannels")}`);
    console.log(`    ${log.symbols.arrow} ${t("init.finishFirstTask")}`);
    console.log();
    return ExitCode.OK;
  } finally {
    rl.close();
  }
}
