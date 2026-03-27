import fs from "node:fs";
import { buildRequiredProjectFiles } from "../governance.mjs";
import { discoverGroups } from "../groups.mjs";
import { resolve } from "../paths.mjs";

/**
 * @returns {string[]}
 */
export function requiredFiles() {
  const discoveredCharters = [];
  const { groups } = discoverGroups();

  for (const group of Object.values(groups)) {
    for (const agent of group.agents) {
      discoveredCharters.push(agent.charterPath);
    }
  }

  return buildRequiredProjectFiles(discoveredCharters);
}

/**
 * Validate that all required files exist.
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateFiles() {
  const missing = requiredFiles().filter((file) => !fs.existsSync(resolve(file)));
  return { ok: missing.length === 0, missing };
}
