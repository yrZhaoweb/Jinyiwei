import fs from "node:fs";
import { resolve } from "./paths.mjs";
import * as log from "./log.mjs";
import { defaultGovernanceConfig, VALID_APPROVAL_MODES } from "./governance/constants.mjs";
import { discoverGroups } from "./groups.mjs";
import { resolveAgentModel } from "./agent-models.mjs";

const CONFIG_FILE = "jinyiwei.config.json";

/**
 * @returns {object}
 */
export function defaultConfig() {
  return withDiscoveredGroups(defaultGovernanceConfig(), discoverGroupNames());
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
    return withDiscoveredGroups(deepMerge(defaults, raw), discoverGroupNames());
  } catch (/** @type {any} */ err) {
    log.warn(`Failed to parse ${CONFIG_FILE}: ${err.message}`);
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

  if (!VALID_APPROVAL_MODES.includes(config.approvalMode)) {
    errors.push(`approvalMode must be one of: ${VALID_APPROVAL_MODES.join(", ")}`);
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
  } else if (config.externalChannels.some((channel) => typeof channel !== "string" || !channel.trim())) {
    errors.push("externalChannels must only contain non-empty strings");
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
  return resolveAgentModel(config, agentId, groupName);
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

/**
 * @returns {string[]}
 */
function discoverGroupNames() {
  return Object.keys(discoverGroups().groups);
}

/**
 * @param {object} config
 * @param {string[]} groupNames
 * @returns {object}
 */
function withDiscoveredGroups(config, groupNames) {
  const normalized = deepMerge(defaultGovernanceConfig(), config);
  const groups = { ...(normalized.models?.groups || {}) };

  for (const groupName of groupNames) {
    if (!(groupName in groups)) {
      groups[groupName] = "";
    }
  }

  normalized.models = {
    chat: normalized.models?.chat || "",
    watch: normalized.models?.watch || "",
    groups,
  };

  return normalized;
}
