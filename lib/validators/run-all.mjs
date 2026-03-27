import { ALL_VALIDATORS } from "./registry.mjs";

/**
 * @param {{ failFast?: boolean }} [options]
 */
export function runAllValidators(options = {}) {
  const results = [];
  const errors = [];

  for (const { name, fn } of ALL_VALIDATORS) {
    const result = fn();
    const resultErrors = [
      ...(result.errors || []),
      ...((result.missing || []).map((item) => `missing: ${item}`)),
    ];

    if (resultErrors.length > 0) {
      results.push({ name, ok: false, errors: resultErrors });
      errors.push(...resultErrors);
      if (options.failFast) break;
    } else {
      results.push({ name, ok: true, errors: [] });
    }
  }

  return {
    ok: errors.length === 0,
    results,
    errors,
  };
}
