import fs from "node:fs";
import { loadConfig } from "../config.mjs";
import { discoverGroups } from "../groups.mjs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate agent group directory structure and charter content.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateGroups() {
  const errors = [];

  try {
    const { groups } = discoverGroups();
    const config = loadConfig();

    assert(Object.keys(groups).length > 0, "at least one agent group must exist in agents/groups/", errors);

    for (const [groupName, group] of Object.entries(groups)) {
      assert(group.agents.length > 0, `group '${groupName}' must have at least one agent`, errors);

      for (const agent of group.agents) {
        const fullPath = resolve(agent.charterPath);
        assert(fs.existsSync(fullPath), `${agent.charterPath} must exist`, errors);

        if (!fs.existsSync(fullPath)) {
          continue;
        }

        const text = fs.readFileSync(fullPath, "utf8");
        assert(text.includes("## Identity"), `${agent.name} charter must have Identity section`, errors);
        assert(text.includes("## Responsibilities"), `${agent.name} charter must have Responsibilities section`, errors);
        assert(text.includes("## Forbidden"), `${agent.name} charter must have Forbidden section`, errors);
        assert(text.includes("internal only"), `${agent.name} charter must remain internal only`, errors);
        assert(text.includes(`Group: \`${groupName}\``), `${agent.name} charter must declare group '${groupName}'`, errors);
      }
    }

    for (const groupName of Object.keys(config.models?.groups || {})) {
      assert(groupName in groups, `models.groups.${groupName} is configured but no such group exists in agents/groups/`, errors);
    }
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}
