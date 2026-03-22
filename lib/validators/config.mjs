import { loadConfig, validateConfig } from "../config.mjs";

/**
 * Validate jinyiwei.config.json.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateConfigFile() {
  const config = loadConfig();
  return validateConfig(config);
}
