/**
 * Model provider configuration for Jinyiwei agents.
 * @typedef {{
 *   provider: string,
 *   baseURL?: string,
 *   apiKey?: string,
 *   modelId: string,
 * }} ModelConfig
 */

/**
 * Channel configuration for Feishu.
 * @typedef {{
 *   webhookUrl?: string,
 *   botToken?: string,
 *   appId?: string,
 *   appSecret?: string,
 * }} FeishuConfig
 */

/**
 * Channel configuration for Telegram.
 * @typedef {{
 *   botToken?: string,
 *   apiBase?: string,
 * }} TelegramConfig
 */

/**
 * @typedef {{
 *   feishu?: FeishuConfig,
 *   telegram?: TelegramConfig,
 * }} ChannelsConfig
 */

/**
 * @typedef {{
 *   chat?: ModelConfig,
 *   watch?: ModelConfig,
 *   groups?: Record<string, ModelConfig>,
 * }} ModelsConfig
 */

/**
 * @typedef {{
 *   models: ModelsConfig,
 *   channels: ChannelsConfig,
 * }} ExtendedGovernanceConfig
 */

import { loadConfig, writeConfig } from "./config.mjs";
import * as openclaw from "./openclaw.mjs";
import { t } from "./i18n.mjs";
import * as log from "./log.mjs";

const VALID_PROVIDERS = ["openai", "anthropic", "google", "deepseek", "minimax", "custom"];

/**
 * List all configured models for all agents.
 * @returns {ModelsConfig}
 */
export function listModels() {
  const config = loadConfig();
  return config.models || { chat: undefined, watch: undefined, groups: {} };
}

/**
 * List all configured channels.
 * @returns {ChannelsConfig}
 */
export function listChannels() {
  const config = loadConfig();
  return config.channels || {};
}

/**
 * Validate a model config object.
 * @param {ModelConfig} model
 * @param {string} agentId
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateModel(model, agentId) {
  const errors = [];

  if (!model || typeof model !== "object") {
    return { ok: false, errors: ["model config must be an object"] };
  }

  if (!model.provider || typeof model.provider !== "string") {
    errors.push("provider is required and must be a string");
  } else if (!VALID_PROVIDERS.includes(model.provider)) {
    errors.push(`provider must be one of: ${VALID_PROVIDERS.join(", ")}`);
  }

  if (!model.modelId || typeof model.modelId !== "string") {
    errors.push("modelId is required and must be a string");
  }

  if (model.baseURL !== undefined && typeof model.baseURL !== "string") {
    errors.push("baseURL must be a string");
  }

  if (model.apiKey !== undefined && typeof model.apiKey !== "string") {
    errors.push("apiKey must be a string");
  }

  if (model.provider === "custom" && (!model.baseURL || !model.apiKey)) {
    errors.push("custom provider requires baseURL and apiKey");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate channel config.
 * @param {string} channelType - 'feishu' or 'telegram'
 * @param {object} channel
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateChannel(channelType, channel) {
  const errors = [];

  if (!channel || typeof channel !== "object") {
    return { ok: false, errors: ["channel config must be an object"] };
  }

  if (channelType === "feishu") {
    if (!channel.webhookUrl && !channel.botToken) {
      errors.push("feishu requires at least webhookUrl or botToken");
    }
    if (channel.appId && !channel.appSecret) {
      errors.push("feishu appId requires appSecret");
    }
    if (channel.appSecret && !channel.appId) {
      errors.push("feishu appSecret requires appId");
    }
  } else if (channelType === "telegram") {
    if (!channel.botToken) {
      errors.push("telegram requires botToken");
    }
  } else {
    errors.push(`unknown channel type: ${channelType}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Add or update a model for an agent.
 * @param {string} agentId - 'chat', 'watch', or group name like 'dev'
 * @param {ModelConfig} model
 * @param {{ sync?: boolean }} [options]
 * @returns {{ ok: boolean, errors?: string[], synced?: boolean, warning?: string }}
 */
export function setModel(agentId, model, options = {}) {
  const validation = validateModel(model, agentId);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const config = loadConfig();

  // Check if this model is already used by another agent (warning, not error)
  const existingModels = config.models || {};
  const allAgentIds = [
    ...Object.keys(existingModels).filter((k) => k !== "groups" && k !== agentId),
    ...Object.keys(existingModels.groups || {}).filter((g) => g !== agentId),
  ];
  const modelKey = `${model.provider}:${model.modelId}`;
  const usingAgents = [];
  for (const aid of allAgentIds) {
    const m = aid === "chat" || aid === "watch"
      ? existingModels[aid]
      : existingModels.groups?.[aid];
    if (m && `${m.provider}:${m.modelId}` === modelKey) {
      usingAgents.push(aid);
    }
  }

  // Build new models object (immutable - no mutation of existing config)
  const newModels = {
    chat: config.models?.chat,
    watch: config.models?.watch,
    groups: { ...(config.models?.groups || {}) },
  };
  if (agentId === "chat" || agentId === "watch") {
    newModels[agentId] = {
      provider: model.provider,
      baseURL: model.baseURL || "",
      apiKey: model.apiKey || "",
      modelId: model.modelId,
    };
  } else {
    newModels.groups[agentId] = {
      provider: model.provider,
      baseURL: model.baseURL || "",
      apiKey: model.apiKey || "",
      modelId: model.modelId,
    };
  }

  const newConfig = { ...config, models: newModels };

  try {
    writeConfig(newConfig);
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : "failed to write config"] };
  }

  // Sync to OpenClaw if requested and openclaw is available
  let synced = false;
  if (options.sync !== false && openclaw.hasOpenClaw()) {
    // OpenClaw model config is a simple string ID or object with provider details
    const openclawModel = model.baseURL
      ? `${model.provider}:${model.baseURL}/${model.modelId}`
      : `${model.provider}:${model.modelId}`;

    const result = openclaw.modelSet(openclawModel, agentId);
    synced = result.ok;
  }

  const warning = usingAgents.length > 0
    ? `model ${modelKey} is already used by agent(s): ${usingAgents.join(", ")}`
    : undefined;

  return { ok: true, synced, warning };
}

/**
 * Remove a model for an agent (reset to default/empty).
 * @param {string} agentId
 * @param {{ sync?: boolean }} [options]
 * @returns {{ ok: boolean }}
 */
export function removeModel(agentId, options = {}) {
  const config = loadConfig();

  // Build new models object (immutable)
  const newModels = {
    chat: config.models?.chat,
    watch: config.models?.watch,
    groups: { ...(config.models?.groups || {}) },
  };
  if (agentId === "chat" || agentId === "watch") {
    delete newModels[agentId];
  } else {
    delete newModels.groups[agentId];
  }

  const newConfig = { ...config, models: newModels };

  try {
    writeConfig(newConfig);
  } catch (err) {
    return { ok: false };
  }

  if (options.sync !== false && openclaw.hasOpenClaw()) {
    openclaw.modelSet("", agentId);
  }

  return { ok: true };
}

/**
 * Find which agent is using a given channel type.
 * @param {string} channelType
 * @returns {string|null} agent id or null if not assigned
 */
export function findChannelAgent(channelType) {
  const config = loadConfig();
  return config.channelAgents?.[channelType] || null;
}

/**
 * Add or update a channel configuration for a specific agent.
 * @param {string} channelType - 'feishu' or 'telegram'
 * @param {object} channelConfig
 * @param {string} [agentId] - optional agent id to associate with this channel
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function setChannel(channelType, channelConfig, agentId) {
  const validation = validateChannel(channelType, channelConfig);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const config = loadConfig();

  // Build new channels and channelAgents (immutable)
  const newChannels = { ...(config.channels || {}) };
  const newChannelAgents = { ...(config.channelAgents || {}) };

  if (channelType === "feishu") {
    newChannels.feishu = {
      webhookUrl: channelConfig.webhookUrl || "",
      botToken: channelConfig.botToken || "",
      appId: channelConfig.appId || "",
      appSecret: channelConfig.appSecret || "",
    };
  } else if (channelType === "telegram") {
    newChannels.telegram = {
      botToken: channelConfig.botToken || "",
      apiBase: channelConfig.apiBase || "",
    };
  }

  if (agentId) {
    newChannelAgents[channelType] = agentId;
  }

  const newConfig = { ...config, channels: newChannels, channelAgents: newChannelAgents };

  try {
    writeConfig(newConfig);
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : "failed to write config"] };
  }

  return { ok: true };
}

/**
 * Remove a channel configuration.
 * @param {string} channelType
 * @returns {{ ok: boolean }}
 */
export function removeChannel(channelType) {
  const config = loadConfig();

  const newChannels = { ...(config.channels || {}) };
  const newChannelAgents = { ...(config.channelAgents || {}) };
  delete newChannels[channelType];
  delete newChannelAgents[channelType];

  const newConfig = { ...config, channels: newChannels, channelAgents: newChannelAgents };

  try {
    writeConfig(newConfig);
  } catch (err) {
    return { ok: false };
  }

  return { ok: true };
}

/**
 * Mask sensitive fields in a model config for display.
 * @param {ModelConfig} model
 * @returns {ModelConfig}
 */
export function maskModel(model) {
  if (!model) return model;
  return {
    ...model,
    apiKey: model.apiKey ? "***" + model.apiKey.slice(-4) : "",
  };
}

/**
 * Mask sensitive fields in channel config for display.
 * @param {ChannelsConfig} channels
 * @returns {ChannelsConfig}
 */
export function maskChannels(channels) {
  if (!channels) return channels;
  const masked = { ...channels };
  if (masked.feishu) {
    masked.feishu = {
      ...masked.feishu,
      botToken: masked.feishu.botToken ? "***" + masked.feishu.botToken.slice(-4) : "",
      appSecret: masked.feishu.appSecret ? "***" + masked.feishu.appSecret.slice(-4) : "",
    };
  }
  if (masked.telegram) {
    masked.telegram = {
      ...masked.telegram,
      botToken: masked.telegram.botToken ? "***" + masked.telegram.botToken.slice(-4) : "",
    };
  }
  return masked;
}

export { VALID_PROVIDERS };
