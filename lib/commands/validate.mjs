import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { validateFiles, requiredFiles } from "../validators/files.mjs";
import { validateSkills } from "../validators/skills.mjs";
import { validatePlugin } from "../validators/plugin.mjs";
import { validateGovernanceSkill, validateChatCharter, validateWatchCharter, validateInternalCharters } from "../validators/charters.mjs";
import { validateRules } from "../validators/rules.mjs";
import { validateTemplates } from "../validators/templates.mjs";
import { validateVersion } from "../validators/version.mjs";
import { validateConfigFile } from "../validators/config.mjs";
import { validateGroups } from "../validators/groups.mjs";
import { loadConfig } from "../config.mjs";

/**
 * Validate all governance files.
 * @param {string[]} args - CLI arguments after "validate"
 * @returns {number} exit code
 */
export function validateCommand(args) {
  const isJson = args.includes("--json");

  // Step 1: required files
  const filesResult = validateFiles();
  if (!filesResult.ok) {
    if (isJson) {
      console.error(JSON.stringify({ ok: false, missing: filesResult.missing }, null, 2));
    } else {
      log.fail(t("validate.missingFiles"));
      for (const m of filesResult.missing) {
        log.detail(`missing: ${m}`);
      }
    }
    return ExitCode.VALIDATION_FAIL;
  }

  // Step 2: run all validators
  const validators = [
    validateSkills,
    validatePlugin,
    validateVersion,
    validateConfigFile,
    validateGroups,
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
    errors.push(...result.errors);
  }

  if (errors.length > 0) {
    if (isJson) {
      console.error(JSON.stringify({ ok: false, errors }, null, 2));
    } else {
      log.fail(t("install.validating"));
      for (const e of errors) {
        log.detail(e);
      }
    }
    return ExitCode.VALIDATION_FAIL;
  }

  const config = loadConfig();
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));

  const summary = {
    ok: true,
    skills: manifest.skills.length,
    checkedFiles: requiredFiles.length,
    governance: {
      bossTitle: config.bossTitle,
      watchSelfTitle: config.watchSelfTitle,
      approvalMode: config.approvalMode,
      externalChannels: config.externalChannels,
    },
  };

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log.ok(`${t("install.validating")} — ${manifest.skills.length} skills, ${requiredFiles.length} files`);
  }

  return ExitCode.OK;
}
