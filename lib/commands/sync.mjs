import fs from "node:fs";
import path from "node:path";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { parseSkillsList } from "../parse-skills.mjs";

/**
 * Sync skills_list.md -> preinstalled-skills.json.
 * @param {string[]} [args]
 * @returns {number} exit code
 */
export function syncCommand(args = []) {
  const sourcePath = resolve("skills_list.md");
  const outputPath = resolve("manifests/preinstalled-skills.json");

  if (!fs.existsSync(sourcePath)) {
    log.fail(`skills_list.md not found at ${sourcePath}`);
    return ExitCode.USER_ERROR;
  }

  let source;
  try {
    source = fs.readFileSync(sourcePath, "utf8");
  } catch (/** @type {any} */ err) {
    log.fail(`Failed to read skills_list.md: ${err.message}`);
    return ExitCode.USER_ERROR;
  }

  const skills = parseSkillsList(source);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        source: "skills_list.md",
        skills,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  log.ok(t("sync.done", { count: skills.length, path: outputPath }));
  return ExitCode.OK;
}
