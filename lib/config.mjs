import fs from "node:fs";
import { resolve } from "./paths.mjs";

const CONFIG_FILE = "jinyiwei.config.json";

/**
 * @returns {object}
 */
export function defaultConfig() {
  return {
    bossTitle: "Boss",
    watchSelfTitle: "锦衣卫",
    approvalMode: "hybrid",
    models: {
      chat: "",
      watch: "",
      groups: {
        dev: "",
        content: "",
      },
    },
    externalChannels: ["feishu", "telegram"],
  };
}

/**
 * Load config from jinyiwei.config.json, merged with defaults.
 * @returns {object}
 */
export function loadConfig() {
  const defaults = defaultConfig();
  const configPath = resolve(CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return deepMerge(defaults, raw);
  } catch {
    return defaults;
  }
}

/**
 * Write config to jinyiwei.config.json.
 * @param {object} config
 */
export function writeConfig(config) {
  const configPath = resolve(CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

/**
 * Validate config object.
 * @param {object} config
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== "object") {
    errors.push("config must be an object");
    return { ok: false, errors };
  }

  if (typeof config.bossTitle !== "string" || !config.bossTitle.trim()) {
    errors.push("bossTitle must be a non-empty string");
  }

  if (typeof config.watchSelfTitle !== "string" || !config.watchSelfTitle.trim()) {
    errors.push("watchSelfTitle must be a non-empty string");
  }

  const validModes = ["strict", "graded", "hybrid"];
  if (!validModes.includes(config.approvalMode)) {
    errors.push(`approvalMode must be one of: ${validModes.join(", ")}`);
  }

  if (!config.models || typeof config.models !== "object") {
    errors.push("models must be an object");
  } else {
    if (typeof config.models.chat !== "string") {
      errors.push("models.chat must be a string");
    }
    if (typeof config.models.watch !== "string") {
      errors.push("models.watch must be a string");
    }
    if (!config.models.groups || typeof config.models.groups !== "object") {
      errors.push("models.groups must be an object");
    } else {
      for (const [group, model] of Object.entries(config.models.groups)) {
        if (typeof model !== "string") {
          errors.push(`models.groups.${group} must be a string`);
        }
      }
    }
  }

  if (!Array.isArray(config.externalChannels)) {
    errors.push("externalChannels must be an array");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Resolve the model for a given agent.
 * @param {object} config
 * @param {string} agentId - e.g. "chat", "watch", "code"
 * @param {string|null} groupName - e.g. "dev", "content", or null for external agents
 * @returns {string}
 */
export function getModelForAgent(config, agentId, groupName) {
  if (agentId === "chat") return config.models?.chat || "";
  if (agentId === "watch") return config.models?.watch || "";
  if (groupName && config.models?.groups?.[groupName]) {
    return config.models.groups[groupName];
  }
  // fallback to chat model
  return config.models?.chat || "";
}

/**
 * Deep merge source into target (non-destructive).
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
