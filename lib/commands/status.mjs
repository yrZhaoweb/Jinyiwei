import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";

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

  console.log(`jinyiwei v${plugin.version}`);
  console.log();
  console.log(`${t("status.bossTitle")}       ${cfg.bossTitle?.default}`);
  console.log(`${t("status.watchSelfTitle")} ${cfg.watchSelfTitle?.default}`);
  console.log(`${t("status.approvalMode")}    ${cfg.approvalMode?.default}`);
  console.log(`${t("status.ingressAgents")}   ${(cfg.externalIngressAgents?.default ?? []).join(", ")}`);
  console.log(`${t("status.extChannels")}    ${(cfg.externalChannels?.default ?? []).join(", ")}`);
  console.log(`${t("status.skills")}           ${manifest.skills.length}`);
  console.log();

  const result = spawnSync(process.execPath, [resolve("scripts/validate-jinyiwei.mjs")], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status === 0) {
    console.log(`${t("status.validation")}       ${t("status.ok")}`);
  } else {
    console.log(`${t("status.validation")}       ${t("status.failed")}`);
    console.error(result.stderr || result.stdout);
  }
  return result.status ?? ExitCode.OK;
}
