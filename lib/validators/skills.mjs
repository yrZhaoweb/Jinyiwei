import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { parseSkillsList } from "../parse-skills.mjs";

/**
 * Validate skills manifest is in sync with skills_list.md.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateSkills() {
  const errors = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
    const skillsFromList = parseSkillsList(fs.readFileSync(resolve("skills_list.md"), "utf8"));

    if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
      errors.push("preinstalled-skills.json has no skills");
    }

    if (JSON.stringify(manifest.skills) !== JSON.stringify(skillsFromList)) {
      errors.push("skills_list.md and manifests/preinstalled-skills.json are out of sync");
    }
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}
