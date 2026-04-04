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
  return sanitizeConfig(withDiscoveredGroups(defaultGovernanceConfig(), discoverGroupNames()));
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
    return sanitizeConfig(withDiscoveredGroups(deepMerge(defaults, raw), discoverGroupNames()));
  } catch (/** @type {any} */ err) {
    // Don't leak file path details in error messages for security
    log.warn(`Failed to parse ${CONFIG_FILE}`);
    return defaults;
  }
}

/**
 * Write config to jinyiwei.config.json.
 * @param {object} config
 */
export function writeConfig(config) {
  const configPath = resolve(CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(sanitizeConfig(config), null, 2) + "\n", "utf8");
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

  if (typeof config.chatAgentName !== "string" || !config.chatAgentName.trim()) {
    errors.push("chatAgentName must be a non-empty string");
  }

  if (typeof config.watchAgentName !== "string" || !config.watchAgentName.trim()) {
    errors.push("watchAgentName must be a non-empty string");
  }

  if (!VALID_APPROVAL_MODES.includes(config.approvalMode)) {
    errors.push(`approvalMode must be one of: ${VALID_APPROVAL_MODES.join(", ")}`);
  }

  if (!config.models || typeof config.models !== "object") {
    errors.push("models must be an object");
  } else {
    // chat/watch can be empty string (not configured) or an object with provider/modelId
    if (typeof config.models.chat !== "string" && !(config.models.chat && typeof config.models.chat === "object")) {
      errors.push("models.chat must be a string or a model object");
    }
    if (typeof config.models.watch !== "string" && !(config.models.watch && typeof config.models.watch === "object")) {
      errors.push("models.watch must be a string or a model object");
    }
    if (!config.models.groups || typeof config.models.groups !== "object") {
      errors.push("models.groups must be an object");
    } else {
      for (const [group, model] of Object.entries(config.models.groups)) {
        if (typeof model !== "string" && !(model && typeof model === "object")) {
          errors.push(`models.groups.${group} must be a string or a model object`);
        }
      }
    }
  }

  if (!Array.isArray(config.externalChannels)) {
    errors.push("externalChannels must be an array");
  } else {
    const validChannelPattern = /^[a-z][a-z0-9_-]*$/;
    for (const channel of config.externalChannels) {
      if (typeof channel !== "string" || !channel.trim()) {
        errors.push("externalChannels must only contain non-empty strings");
        break;
      }
      if (!validChannelPattern.test(channel)) {
        errors.push(`externalChannels: '${channel}' must start with a lowercase letter and contain only letters, numbers, hyphens, or underscores`);
        break;
      }
    }
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

/**
 * Normalize a config object so interactive setup can save cleaner values.
 * @param {object} config
 * @returns {object}
 */
export function sanitizeConfig(config) {
  const normalized = withDiscoveredGroups(deepMerge(defaultGovernanceConfig(), config || {}), discoverGroupNames());

  normalized.bossTitle = typeof normalized.bossTitle === "string" && normalized.bossTitle.trim() ? normalized.bossTitle.trim() : defaultGovernanceConfig().bossTitle;
  normalized.watchSelfTitle = typeof normalized.watchSelfTitle === "string" && normalized.watchSelfTitle.trim()
    ? normalized.watchSelfTitle.trim()
    : defaultGovernanceConfig().watchSelfTitle;
  normalized.chatAgentName = typeof normalized.chatAgentName === "string" && normalized.chatAgentName.trim()
    ? normalized.chatAgentName.trim()
    : defaultGovernanceConfig().chatAgentName;
  normalized.watchAgentName = typeof normalized.watchAgentName === "string" && normalized.watchAgentName.trim()
    ? normalized.watchAgentName.trim()
    : defaultGovernanceConfig().watchAgentName;
  normalized.approvalMode = typeof normalized.approvalMode === "string" && normalized.approvalMode.trim()
    ? normalized.approvalMode.trim()
    : defaultGovernanceConfig().approvalMode;

  normalized.externalChannels = Array.isArray(normalized.externalChannels)
    ? [...new Set(normalized.externalChannels.map((channel) => (typeof channel === "string" ? channel.trim() : "")).filter(Boolean))]
    : [...defaultGovernanceConfig().externalChannels];

  normalized.models = normalized.models && typeof normalized.models === "object" ? normalized.models : { chat: "", watch: "", groups: {} };
  normalized.models.chat = normalized.models.chat && typeof normalized.models.chat === "object" && !Array.isArray(normalized.models.chat)
    ? normalized.models.chat
    : typeof normalized.models.chat === "string" ? normalized.models.chat.trim() : "";
  normalized.models.watch = normalized.models.watch && typeof normalized.models.watch === "object" && !Array.isArray(normalized.models.watch)
    ? normalized.models.watch
    : typeof normalized.models.watch === "string" ? normalized.models.watch.trim() : "";
  normalized.models.groups = normalized.models.groups && typeof normalized.models.groups === "object" ? normalized.models.groups : {};

  for (const [groupName, model] of Object.entries(normalized.models.groups)) {
    normalized.models.groups[groupName] = model && typeof model === "object" && !Array.isArray(model)
      ? model
      : typeof model === "string" ? model.trim() : "";
  }

  for (const groupName of discoverGroupNames()) {
    if (!(groupName in normalized.models.groups)) {
      normalized.models.groups[groupName] = "";
    }
  }

  return normalized;
}
