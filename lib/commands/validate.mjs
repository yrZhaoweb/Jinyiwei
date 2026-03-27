import fs from "node:fs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { buildGovernanceSummary } from "../governance/summary.mjs";
import { requiredFiles } from "../validators/files.mjs";
import { runValidationSuite } from "../validation.mjs";

/**
 * Validate all governance files.
 * @param {string[]} args - CLI arguments after "validate"
 * @returns {number} exit code
 */
export function validateCommand(args) {
  const isJson = args.includes("--json");
  const failFast = args.includes("--fail-fast");
  const validation = runValidationSuite({ failFast });

  if (!validation.files.ok) {
    if (isJson) {
      console.error(JSON.stringify({ ok: false, missing: validation.files.missing }, null, 2));
    } else {
      log.fail(t("validate.missingFiles"));
      for (const m of validation.files.missing) {
        log.detail(`missing: ${m}`);
      }
    }
    return ExitCode.VALIDATION_FAIL;
  }

  if (!isJson) {
    for (const result of validation.results) {
      if (result.ok) {
        log.ok(result.validator);
      } else {
        log.fail(result.validator);
        for (const error of result.errors) {
          log.detail(error);
        }
      }
    }
  }

  if (validation.errors.length > 0) {
    if (isJson) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            validators: validation.results.filter((result) => !result.ok).map(({ validator, errors }) => ({ validator, errors })),
            errors: validation.errors,
          },
          null,
          2
        )
      );
    }
    return ExitCode.VALIDATION_FAIL;
  }

  const summary = {
    ok: true,
    checkedFiles: requiredFiles().length,
    ...buildGovernanceSummary({ validation: "ok" }),
  };

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log.ok(`${t("install.validating")} — ${summary.skills} skills, ${summary.checkedFiles} files`);
  }

  return ExitCode.OK;
}
