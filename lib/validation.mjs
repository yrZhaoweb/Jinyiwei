import { validateFiles } from "./validators/files.mjs";
import { ALL_VALIDATORS } from "./validators/registry.mjs";

/**
 * @param {{ failFast?: boolean }} [options]
 * @returns {{
 *   files: { ok: boolean, missing: string[] },
 *   results: Array<{ validator: string, ok: boolean, errors: string[] }>,
 *   errors: string[]
 * }}
 */
export function runValidationSuite(options = {}) {
  const failFast = options.failFast ?? false;
  const files = validateFiles();
  const results = [];
  const errors = [];

  if (!files.ok) {
    return { files, results, errors: files.missing.map((item) => `missing: ${item}`) };
  }

  for (const { name, fn } of ALL_VALIDATORS) {
    const outcome = fn();
    const validatorErrors = [...(outcome.errors || []), ...(outcome.missing || []).map((item) => `missing: ${item}`)];
    const ok = validatorErrors.length === 0;

    results.push({
      validator: name,
      ok,
      errors: validatorErrors,
    });

    if (!ok) {
      errors.push(...validatorErrors);
      if (failFast) break;
    }
  }

  return { files, results, errors };
}
