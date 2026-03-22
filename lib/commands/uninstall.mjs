import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig } from "../config.mjs";
import { buildAgentRegistry } from "../groups.mjs";
import * as openclaw from "../openclaw.mjs";

/**
 * Uninstall Jinyiwei plugin from OpenClaw.
 * @param {string[]} args - CLI arguments after "uninstall"
 * @returns {number} exit code
 */
export function uninstallCommand(args) {
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const dryRun = args.includes("--dry-run");
  const isJson = args.includes("--json");

  if (!isJson) {
    log.banner(pkg.version);
    if (dryRun) log.info(log.yellow("--dry-run mode"));
  }

  const report = { agents: [], plugin: { disable: null, uninstall: null }, ok: true };

  // Step 1: Delete registered agents
  if (!isJson) log.step(1, 3, t("uninstall.deletingAgents"));
  const config = loadConfig();
  const registry = buildAgentRegistry(config);

  for (const agent of registry) {
    const result = openclaw.agentDelete(agent.id, { dryRun });
    report.agents.push({ agent: agent.name, ok: result.ok || result.dryRun, dryRun: result.dryRun ?? false });
    if (!result.ok && !result.dryRun && !isJson) {
      log.verbose(`${agent.name}: delete returned non-zero (may not exist)`);
    }
  }
  if (!isJson) {
    log.ok(t("uninstall.deletingAgents"));
    log.info(log.dim(t("uninstall.agentsNote")));
  }

  // Step 2: Disable plugin
  if (!isJson) log.step(2, 3, t("uninstall.disabling"));
  const disable = openclaw.pluginDisable("jinyiwei", { dryRun });
  report.plugin.disable = { ok: disable.ok || disable.dryRun, dryRun: disable.dryRun ?? false };
  if (!disable.ok && !disable.dryRun) {
    if (!isJson) log.warn(t("uninstall.warnDisable"));
  } else {
    if (!isJson) log.ok(t("uninstall.disabling"));
  }

  // Step 3: Remove plugin
  if (!isJson) log.step(3, 3, t("uninstall.removing"));
  const uninstall = openclaw.pluginUninstall("jinyiwei", { dryRun });
  report.plugin.uninstall = { ok: uninstall.ok || uninstall.dryRun, dryRun: uninstall.dryRun ?? false };
  if (!uninstall.ok && !uninstall.dryRun) {
    report.ok = false;
    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      log.fail(t("uninstall.errorUninstall"));
      log.summary("fail", t("uninstall.errorUninstall"));
    }
    return ExitCode.INSTALL_FAIL;
  }
  if (!isJson) log.ok(t("uninstall.removing"));

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log.summary("ok", t("uninstall.done"));
    log.info(log.dim(t("uninstall.skillsNote")));
  }
  return ExitCode.OK;
}
