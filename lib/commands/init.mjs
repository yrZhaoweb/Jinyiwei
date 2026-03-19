import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";

const VALID_MODES = ["strict", "graded", "hybrid"];

/**
 * @param {readline.Interface} rl
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

/**
 * Interactive governance configuration.
 * @returns {Promise<number>} exit code
 */
export async function initCommand() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`\n  ${t("init.welcome")}\n`);

    const bossTitle = (await ask(rl, t("init.prompt.bossTitle"))) || "Boss";
    const watchSelfTitle = (await ask(rl, t("init.prompt.watchSelfTitle"))) || "锦衣卫";
    const approvalMode = (await ask(rl, t("init.prompt.approvalMode"))) || "hybrid";

    if (!VALID_MODES.includes(approvalMode)) {
      console.error(t("init.error.invalidMode"));
      return ExitCode.USER_ERROR;
    }

    const pluginPath = resolve("openclaw.plugin.json");
    const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));

    plugin.configSchema.properties.bossTitle.default = bossTitle;
    plugin.configSchema.properties.watchSelfTitle.default = watchSelfTitle;
    plugin.configSchema.properties.approvalMode.default = approvalMode;

    fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
    console.log("\n" + t("init.saved", { path: pluginPath }));
    return ExitCode.OK;
  } finally {
    rl.close();
  }
}
