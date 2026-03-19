import fs from "node:fs";
import readline from "node:readline";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";

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

    const bossTitle = (await ask(rl, t("init.prompt.bossTitle"))) || "Boss";
    const watchSelfTitle = (await ask(rl, t("init.prompt.watchSelfTitle"))) || "锦衣卫";
    const approvalMode = (await ask(rl, t("init.prompt.approvalMode"))) || "hybrid";

    if (!VALID_MODES.includes(approvalMode)) {
      console.log();
      log.fail(t("init.error.invalidMode"));
      console.log();
      return ExitCode.USER_ERROR;
    }

    const pluginPath = resolve("openclaw.plugin.json");
    const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));

    plugin.configSchema.properties.bossTitle.default = bossTitle;
    plugin.configSchema.properties.watchSelfTitle.default = watchSelfTitle;
    plugin.configSchema.properties.approvalMode.default = approvalMode;

    fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
    log.summary("ok", t("init.summary.ok"));
    log.info(t("init.saved"));
    log.detail(pluginPath);
    console.log();
    return ExitCode.OK;
  } finally {
    rl.close();
  }
}
