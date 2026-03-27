import { buildGovernanceSummary } from "../lib/governance/summary.mjs";
import { requiredFiles } from "../lib/validators/files.mjs";
import { runValidationSuite } from "../lib/validation.mjs";

const validation = runValidationSuite();

if (!validation.files.ok) {
  console.error(JSON.stringify({ ok: false, missing: validation.files.missing }, null, 2));
  process.exit(1);
}

if (validation.errors.length > 0) {
  console.error(JSON.stringify({ ok: false, errors: validation.errors }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedFiles: requiredFiles().length,
      ...buildGovernanceSummary({ validation: "ok" }),
    },
    null,
    2
  )
);
