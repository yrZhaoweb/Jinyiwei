import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";
import { discoverGroups } from "../groups.mjs";
import { loadConfig } from "../config.mjs";

/**
 * Validate agent group directory structure and charter content.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateGroups() {
  const errors = [];
  const { groups } = discoverGroups();
  const config = loadConfig();

  assert(Object.keys(groups).length > 0, "at least one agent group must exist in agents/groups/", errors);

  for (const [groupName, group] of Object.entries(groups)) {
    assert(group.agents.length > 0, `group '${groupName}' must have at least one agent`, errors);

    for (const agent of group.agents) {
      const fullPath = resolve(agent.charterPath);
      assert(fs.existsSync(fullPath), `${agent.charterPath} must exist`, errors);

      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf8");
        assert(text.includes("## Identity"), `${agent.name} charter must have Identity section`, errors);
        assert(text.includes("## Responsibilities"), `${agent.name} charter must have Responsibilities section`, errors);
        assert(text.includes("## Forbidden"), `${agent.name} charter must have Forbidden section`, errors);
      }
    }

    // Warn if group has no model in config
    if (config.models?.groups && !(groupName in config.models.groups)) {
      errors.push(`group '${groupName}' exists in directory but has no model configured in jinyiwei.config.json`);
    }
  }

  return { ok: errors.length === 0, errors };
}
