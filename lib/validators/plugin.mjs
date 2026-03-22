import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate openclaw.plugin.json structure.
 * Only checks structural fields — user config is in jinyiwei.config.json.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePlugin() {
  const errors = [];
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));

  assert(typeof plugin.id === "string" && plugin.id.length > 0, "plugin manifest must have a non-empty id", errors);
  assert(typeof plugin.name === "string" && plugin.name.length > 0, "plugin manifest must have a non-empty name", errors);
  assert(typeof plugin.version === "string" && plugin.version.length > 0, "plugin manifest must have a non-empty version", errors);
  assert(Array.isArray(plugin.skills), "plugin manifest must have a skills array", errors);

  return { ok: errors.length === 0, errors };
}
