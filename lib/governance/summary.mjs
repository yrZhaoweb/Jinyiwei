import fs from "node:fs";
import { loadConfig } from "../config.mjs";
import { buildAgentRegistry, discoverGroups } from "../groups.mjs";
import { resolve } from "../paths.mjs";
import { loadActionCatalog } from "./action-catalog.mjs";
import { inspectOpenClawState } from "../openclaw-state.mjs";

/**
 * @param {{ validation: string, errors?: string[], registeredAgents?: Array<object> }} input
 */
export function buildGovernanceSummary(input) {
  const config = loadConfig();
  let plugin;
  let manifest;
  try {
    plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));
  } catch {
    plugin = { version: "0.0.0" };
  }
  try {
    manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
  } catch {
    manifest = { skills: [] };
  }
  const { groups } = discoverGroups();
  const registry = buildAgentRegistry(config);
  const actionCatalog = loadActionCatalog();
  const openclaw = inspectOpenClawState();
  const blockingIssues = openclaw.diagnostics.filter((item) => item.severity === "error");
  const warningIssues = openclaw.diagnostics.filter((item) => item.severity === "warning");

  return {
    version: plugin.version,
    config: {
      bossTitle: config.bossTitle,
      watchSelfTitle: config.watchSelfTitle,
      approvalMode: config.approvalMode,
      externalChannels: config.externalChannels,
    },
    actionCatalogSize: actionCatalog.length,
    externalAgents: registry
      .filter((agent) => agent.role === "external")
      .map((agent) => ({ id: agent.id, name: agent.name, model: agent.model })),
    groups: Object.fromEntries(
      Object.entries(groups).map(([name, group]) => [
        name,
        {
          agents: group.agents.map((agent) => agent.name),
          model: config.models?.groups?.[name] || "",
        },
      ])
    ),
    skills: manifest.skills.length,
    validation: input.validation,
    errors: input.errors,
    registeredAgents: input.registeredAgents || [],
    openclaw: {
      available: openclaw.available,
      version: openclaw.version,
      configFile: openclaw.configFile,
      defaultAgent: openclaw.jinyiwei.defaultAgent?.displayName || openclaw.agents.find((agent) => agent?.isDefault)?.name || openclaw.agents.find((agent) => agent?.isDefault)?.id || null,
      agents: openclaw.agents,
      plugins: openclaw.plugins,
      channels: openclaw.channels,
      jinyiwei: openclaw.jinyiwei,
      diagnostics: openclaw.diagnostics,
      guidance: openclaw.guidance,
      ready: blockingIssues.length === 0,
      blockingIssues: blockingIssues.map((item) => item.message),
      warnings: warningIssues.map((item) => item.message),
    },
  };
}
