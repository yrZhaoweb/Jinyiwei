import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";

/**
 * @param {string} label
 * @param {string} value
 */
function row(label, value) {
  const padded = label.padEnd(20);
  console.log(`    ${log.dim(padded)} ${value}`);
}

/**
 * Show plugin status and governance summary.
 * @returns {number} exit code
 */
export function statusCommand() {
  const manifest = JSON.parse(
    fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8")
  );
  const plugin = JSON.parse(
    fs.readFileSync(resolve("openclaw.plugin.json"), "utf8")
  );
  const cfg = plugin.configSchema?.properties ?? {};

  log.banner(plugin.version);
  console.log(`  ${log.bold(t("status.header"))}`);
  console.log();
  row(t("status.bossTitle"), log.cyan(cfg.bossTitle?.default));
  row(t("status.watchSelfTitle"), log.cyan(cfg.watchSelfTitle?.default));
  row(t("status.approvalMode"), log.cyan(cfg.approvalMode?.default));
  row(t("status.ingressAgents"), (cfg.externalIngressAgents?.default ?? []).join(", "));
  row(t("status.extChannels"), (cfg.externalChannels?.default ?? []).join(", "));
  row(t("status.skills"), String(manifest.skills.length));

  const result = spawnSync(process.execPath, [resolve("scripts/validate-jinyiwei.mjs")], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });

  console.log();
  if (result.status === 0) {
    row(t("status.validation"), log.green(t("status.ok")));
  } else {
    row(t("status.validation"), log.red(t("status.failed")));
    try {
      const parsed = JSON.parse(result.stderr || result.stdout);
      if (parsed.errors) {
        for (const e of parsed.errors) {
          log.detail(e);
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  console.log();
  return result.status ?? ExitCode.OK;
}
