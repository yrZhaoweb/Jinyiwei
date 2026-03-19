import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { validateFiles } from "../validators/files.mjs";
import { validateSkills } from "../validators/skills.mjs";
import { validatePlugin } from "../validators/plugin.mjs";
import { validateGovernanceSkill, validateChatCharter, validateWatchCharter, validateInternalCharters } from "../validators/charters.mjs";
import { validateRules } from "../validators/rules.mjs";
import { validateTemplates } from "../validators/templates.mjs";
import { validateVersion } from "../validators/version.mjs";

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
 * @param {string[]} [args]
 * @returns {number} exit code
 */
export function statusCommand(args = []) {
  const isJson = args.includes("--json");

  const manifest = JSON.parse(
    fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8")
  );
  const plugin = JSON.parse(
    fs.readFileSync(resolve("openclaw.plugin.json"), "utf8")
  );
  const cfg = plugin.configSchema?.properties ?? {};

  const validators = [
    validateFiles,
    validateSkills,
    validatePlugin,
    validateVersion,
    validateGovernanceSkill,
    validateChatCharter,
    validateWatchCharter,
    validateInternalCharters,
    validateRules,
    validateTemplates,
  ];

  const errors = [];
  for (const validate of validators) {
    const result = validate();
    if (result.errors) errors.push(...result.errors);
    if (result.missing) errors.push(...result.missing.map((/** @type {string} */ m) => `missing: ${m}`));
  }
  const validationOk = errors.length === 0;

  if (isJson) {
    console.log(JSON.stringify({
      version: plugin.version,
      bossTitle: cfg.bossTitle?.default,
      watchSelfTitle: cfg.watchSelfTitle?.default,
      approvalMode: cfg.approvalMode?.default,
      externalIngressAgents: cfg.externalIngressAgents?.default,
      externalChannels: cfg.externalChannels?.default,
      skills: manifest.skills.length,
      validation: validationOk ? "ok" : "failed",
      errors: validationOk ? undefined : errors,
    }, null, 2));
    return validationOk ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
  }

  log.banner(plugin.version);
  console.log(`  ${log.bold(t("status.header"))}`);
  console.log();
  row(t("status.bossTitle"), log.cyan(cfg.bossTitle?.default));
  row(t("status.watchSelfTitle"), log.cyan(cfg.watchSelfTitle?.default));
  row(t("status.approvalMode"), log.cyan(cfg.approvalMode?.default));
  row(t("status.ingressAgents"), (cfg.externalIngressAgents?.default ?? []).join(", "));
  row(t("status.extChannels"), (cfg.externalChannels?.default ?? []).join(", "));
  row(t("status.skills"), String(manifest.skills.length));

  console.log();
  if (validationOk) {
    row(t("status.validation"), log.green(t("status.ok")));
  } else {
    row(t("status.validation"), log.red(t("status.failed")));
    for (const e of errors) {
      log.detail(e);
    }
  }
  console.log();
  return validationOk ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
}
