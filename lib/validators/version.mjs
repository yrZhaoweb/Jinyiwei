import fs from "node:fs";
import { resolve } from "../paths.mjs";

/**
 * Validate that package.json and openclaw.plugin.json versions are in sync.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateVersion() {
  const errors = [];
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));

  if (pkg.version !== plugin.version) {
    errors.push(
      `package.json version (${pkg.version}) does not match openclaw.plugin.json version (${plugin.version})`
    );
  }

  return { ok: errors.length === 0, errors };
}
