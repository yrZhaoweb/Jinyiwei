import fs from "node:fs";
import { defaultConfig, validateConfig } from "../config.mjs";
import { resolve } from "../paths.mjs";

/**
 * Validate jinyiwei.config.json.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateConfigFile() {
  const configPath = resolve("jinyiwei.config.json");

  if (!fs.existsSync(configPath)) {
    return validateConfig(defaultConfig());
  }

  try {
    const defaults = defaultConfig();
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const config = {
      ...defaults,
      ...raw,
      models: {
        ...defaults.models,
        ...(raw?.models && typeof raw.models === "object" ? raw.models : {}),
        groups: {
          ...defaults.models.groups,
          ...(raw?.models?.groups && typeof raw.models.groups === "object" ? raw.models.groups : {}),
        },
      },
    };

    return validateConfig(config);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
