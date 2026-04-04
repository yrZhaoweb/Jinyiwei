import { loadConfig } from "./config.mjs";
import { buildAgentRegistry } from "./groups.mjs";
import { t } from "./i18n.mjs";
import {
  agentsListJson,
  channelsStatusJson,
  configValidateJson,
  pluginsListJson,
  version as openclawVersion,
  hasOpenClaw,
} from "./openclaw.mjs";
import { PLUGIN_ID } from "./governance/constants.mjs";

/**
 * @typedef {{
 *   severity: "info" | "warning" | "error",
 *   code: string,
 *   message: string,
 *   detail?: string,
 * }} Diagnostic
 */

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function pluginEntryFromList(payload) {
  const plugins = safeList(payload?.plugins);
  return plugins.find((plugin) => plugin?.id === PLUGIN_ID || plugin?.name === "Jinyiwei");
}

function agentEntryByDefinition(agents, definition) {
  return safeList(agents).find((agent) => (
    agent?.id === definition.id
    || agent?.name === definition.name
  ));
}

function displayAgentLabel(agent) {
  if (!agent || typeof agent !== "object") return null;
  if (typeof agent.name === "string" && agent.name.trim()) return agent.name.trim();
  if (typeof agent.id === "string" && agent.id.trim()) return agent.id.trim();
  return null;
}

function channelNames(payload) {
  return Object.keys(payload?.channels || {});
}

function runningChannelNames(payload) {
  return channelNames(payload).filter((name) => payload.channels?.[name]?.running);
}

function summarizePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    return null;
  }

  return {
    id: plugin.id || null,
    name: plugin.name || null,
    version: plugin.version || null,
    enabled: plugin.enabled !== false,
    status: plugin.status || null,
    origin: plugin.origin || null,
    source: plugin.source || null,
    channelIds: safeList(plugin.channelIds),
    commands: safeList(plugin.commands),
  };
}

/**
 * Inspect the active OpenClaw runtime and derive Jinyiwei-specific diagnostics.
 * @returns {{
 *   available: boolean,
 *   version: string | null,
 *   configFile: string | null,
 *   config: { valid: boolean, path?: string, error?: string | null },
 *   agents: Array<object>,
 *   plugins: Array<object>,
 *   channels: {
 *     list: any,
 *     status: any,
 *     configured: string[],
 *     running: string[],
 *     defaultAccounts: Record<string, string>,
 *   },
 *   jinyiwei: {
 *     plugin: any | null,
 *     agents: Array<object>,
 *     internalAgents: Array<object>,
 *     defaultAgent: any | null,
 *     expectedAgents: string[],
 *     missingAgents: string[],
 *   },
 *   diagnostics: Diagnostic[],
 *   guidance: string[],
 * }}
 */
export function inspectOpenClawState() {
  const available = hasOpenClaw();
  const diagnostics = [];
  const guidance = [];

  if (!available) {
    return {
      available: false,
      version: null,
      configFile: null,
      config: { valid: false, error: t("diagnostic.openclaw.notFound") },
      agents: [],
      plugins: [],
      channels: { list: null, status: null, configured: [], running: [], defaultAccounts: {} },
      jinyiwei: {
        plugin: null,
        agents: [],
        internalAgents: [],
        defaultAgent: null,
        expectedAgents: [],
        missingAgents: [],
      },
      diagnostics: [
        {
          severity: "error",
          code: "openclaw.missing",
          message: t("diagnostic.message.openclaw.missing"),
          detail: t("diagnostic.message.openclaw.missing.detail"),
        },
      ],
      guidance: [
        "diagnostic.guidance.openclaw.missing",
      ],
    };
  }

  const versionResult = openclawVersion();
  const configValidation = configValidateJson();
  const agentsResult = agentsListJson();
  const pluginsResult = pluginsListJson();
  const channelsStatusResult = channelsStatusJson();

  const config = loadConfig();
  const expectedAgents = buildAgentRegistry(config).map((agent) => ({ id: agent.id, name: agent.name, role: agent.role }));
  const agents = safeList(agentsResult.data);
  const plugins = safeList(pluginsResult.data?.plugins).map(summarizePlugin).filter(Boolean);
  const pluginEntry = pluginEntryFromList(pluginsResult.data);
  const defaultAgent = agents.find((agent) => agent?.isDefault) || null;
  const jinyiweiAgents = expectedAgents.map((definition) => agentEntryByDefinition(agents, definition)).filter(Boolean);
  const internalAgentIds = new Set(expectedAgents.filter((agent) => agent.role === "internal").map((agent) => agent.id));
  const internalAgents = jinyiweiAgents.filter((agent) => internalAgentIds.has(agent?.id));
  const missingAgents = expectedAgents.filter((definition) => !agentEntryByDefinition(agents, definition)).map((definition) => definition.name);
  const channelsStatus = channelsStatusResult.data || null;
  const configuredChannels = channelNames(channelsStatus);
  const runningChannels = runningChannelNames(channelsStatus);
  const defaultAccounts = channelsStatus?.channelDefaultAccountId || {};
  const summarizedPluginEntry = summarizePlugin(pluginEntry);

  if (!configValidation.ok) {
    diagnostics.push({
      severity: "error",
      code: "openclaw.config.invalid",
      message: t("diagnostic.openclaw.config.invalid"),
      detail: String(configValidation.stderr || configValidation.stdout || "Unknown config validation failure").trim() || undefined,
    });
  }

  if (!pluginEntry) {
    diagnostics.push({
      severity: "error",
      code: "jinyiwei.plugin.missing",
      message: t("diagnostic.message.plugin.missing"),
      detail: t("diagnostic.message.plugin.missing.detail"),
    });
    guidance.push("diagnostic.guidance.plugin.missing");
  } else {
    if (pluginEntry.enabled === false || pluginEntry.status === "disabled") {
      diagnostics.push({
        severity: "error",
        code: "jinyiwei.plugin.disabled",
        message: t("diagnostic.message.plugin.disabled"),
        detail: t("diagnostic.message.plugin.disabled.detail"),
      });
      guidance.push("diagnostic.guidance.plugin.disabled");
    }
  }

  if (defaultAgent?.id === "main" && jinyiweiAgents.length > 0) {
    diagnostics.push({
      severity: "warning",
      code: "openclaw.default.main",
      message: t("diagnostic.message.default.main"),
      detail: "diagnostic.message.default.main.detail",
    });
    guidance.push("diagnostic.guidance.default.main");
  }

  if (missingAgents.length > 0) {
    diagnostics.push({
      severity: "warning",
      code: "jinyiwei.agents.missing",
      message: t("diagnostic.message.agents.missing"),
      detail: "diagnostic.message.agents.missing.detail",
    });
    guidance.push("diagnostic.guidance.agents.missing");
  }

  if (configuredChannels.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "openclaw.channels.none",
      message: t("diagnostic.message.channels.none"),
      detail: "diagnostic.message.channels.none.detail",
    });
    guidance.push("diagnostic.guidance.channels.none");
  } else if (runningChannels.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "openclaw.channels.stopped",
      message: t("diagnostic.message.channels.stopped"),
      detail: "diagnostic.message.channels.stopped.detail",
    });
    guidance.push("diagnostic.guidance.channels.stopped");
  }

  return {
    available,
    version: versionResult.ok ? String(versionResult.version || "").trim() : null,
    configFile: configValidation.data?.path || null,
    config: {
      valid: Boolean(configValidation.ok),
      path: configValidation.data?.path || undefined,
      error: configValidation.ok ? null : String(configValidation.stderr || configValidation.stdout || "Unknown config validation failure").trim() || null,
    },
    agents,
    plugins,
    channels: {
      list: null,
      status: null,
      configured: configuredChannels,
      running: runningChannels,
      defaultAccounts,
    },
    jinyiwei: {
      plugin: summarizedPluginEntry,
      agents: jinyiweiAgents,
      internalAgents,
      defaultAgent: defaultAgent ? { ...defaultAgent, displayName: displayAgentLabel(defaultAgent) } : null,
      expectedAgents,
      missingAgents,
    },
    diagnostics,
    guidance,
  };
}
