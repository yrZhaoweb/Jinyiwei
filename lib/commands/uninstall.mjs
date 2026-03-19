import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} options
 */
function runCommand(command, args = [], options = {}) {
  if (options.dryRun) {
    return { ok: true, dryRun: true };
  }
  const result = spawnSync(command, args, {
    stdio: "pipe",
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
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const dryRun = args.includes("--dry-run");

  log.banner(pkg.version);

  if (dryRun) {
    log.info(log.yellow("--dry-run mode"));
  }
  log.warn(t("uninstall.skillsNote"));

  log.step(1, 2, t("uninstall.disabling"));
  const disable = runCommand("openclaw", ["plugins", "disable", "jinyiwei"], { dryRun });
  if (!disable.ok && !disable.dryRun) {
    log.warn(t("uninstall.warnDisable"));
  } else {
    log.ok(t("uninstall.disabling"));
  }

  log.step(2, 2, t("uninstall.removing"));
  const uninstall = runCommand("openclaw", ["plugins", "uninstall", "jinyiwei"], { dryRun });
  if (!uninstall.ok && !uninstall.dryRun) {
    log.fail(t("uninstall.errorUninstall"));
    log.summary("fail", t("uninstall.errorUninstall"));
    return ExitCode.INSTALL_FAIL;
  }
  log.ok(t("uninstall.removing"));

  log.summary("ok", t("uninstall.done"));
  return ExitCode.OK;
}
