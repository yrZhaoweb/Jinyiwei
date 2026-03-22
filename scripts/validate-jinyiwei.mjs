import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";
import { validateFiles, requiredFiles } from "../lib/validators/files.mjs";
import { validateSkills } from "../lib/validators/skills.mjs";
import { validatePlugin } from "../lib/validators/plugin.mjs";
import { validateGovernanceSkill, validateChatCharter, validateWatchCharter, validateInternalCharters } from "../lib/validators/charters.mjs";
import { validateRules } from "../lib/validators/rules.mjs";
import { validateTemplates } from "../lib/validators/templates.mjs";
import { validateVersion } from "../lib/validators/version.mjs";
import { validateConfigFile } from "../lib/validators/config.mjs";
import { validateGroups } from "../lib/validators/groups.mjs";
import { loadConfig } from "../lib/config.mjs";

// --- Step 1: required files ---
const filesResult = validateFiles();
if (!filesResult.ok) {
  console.error(JSON.stringify({ ok: false, missing: filesResult.missing }, null, 2));
  process.exit(1);
}

// --- Step 2: run all validators ---
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
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

const config = loadConfig();
const manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));

console.log(
  JSON.stringify(
    {
      ok: true,
      skills: manifest.skills.length,
      checkedFiles: requiredFiles.length,
      governance: {
        bossTitle: config.bossTitle,
        watchSelfTitle: config.watchSelfTitle,
        approvalMode: config.approvalMode,
        externalChannels: config.externalChannels,
      },
    },
    null,
    2
  )
);
