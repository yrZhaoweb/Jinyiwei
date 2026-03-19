import { spawnSync } from "node:child_process";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} options
 */
function runCommand(command, args = [], options = {}) {
  if (options.dryRun) {
    console.log(`[dry-run] would run: ${command} ${args.join(" ")}`);
    return { ok: true, dryRun: true };
  }
  const result = spawnSync(command, args, {
    stdio: "inherit",
    encoding: "utf8",
  });
  return { ok: result.status === 0, status: result.status };
}

/**
 * Uninstall Jinyiwei plugin from OpenClaw.
 * @param {string[]} args - CLI arguments after "uninstall"
 * @returns {number} exit code
 */
export function uninstallCommand(args) {
  const dryRun = args.includes("--dry-run");

  console.log(t("uninstall.start"));
  console.log(t("uninstall.skillsNote") + "\n");

  const disable = runCommand("openclaw", ["plugins", "disable", "jinyiwei"], { dryRun });
  if (!disable.ok && !disable.dryRun) {
    console.error(t("uninstall.warnDisable"));
  }

  const uninstall = runCommand("openclaw", ["plugins", "uninstall", "jinyiwei"], { dryRun });
  if (!uninstall.ok && !uninstall.dryRun) {
    console.error(t("uninstall.errorUninstall"));
    return ExitCode.INSTALL_FAIL;
  }

  console.log("\n" + t("uninstall.done"));
  return ExitCode.OK;
}
