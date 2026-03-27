import fs from "node:fs";
import { loadConfig } from "../config.mjs";
import { buildAgentRegistry, discoverGroups } from "../groups.mjs";
import { resolve } from "../paths.mjs";
import { loadActionCatalog } from "./action-catalog.mjs";

/**
 * @param {{ validation: string, errors?: string[], registeredAgents?: Array<object> }} input
 */
export function buildGovernanceSummary(input) {
  const config = loadConfig();
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
  const { groups } = discoverGroups();
  const registry = buildAgentRegistry(config);
  const actionCatalog = loadActionCatalog();

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
  };
}
