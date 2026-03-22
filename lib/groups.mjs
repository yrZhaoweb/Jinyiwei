import fs from "node:fs";
import { resolve } from "./paths.mjs";
import { getModelForAgent } from "./config.mjs";

/**
 * External agents (face the user directly).
 */
export const EXTERNAL_AGENTS = [
  { id: "chat", name: "ChatAgent", role: "external", charterPath: "agents/chat/AGENT.md" },
  { id: "watch", name: "WatchAgent", role: "external", charterPath: "agents/watch/AGENT.md" },
];

/**
 * Convert agent id to display name.
 * @param {string} id - e.g. "code"
 * @returns {string} - e.g. "CodeAgent"
 */
export function agentIdToName(id) {
  return id.charAt(0).toUpperCase() + id.slice(1) + "Agent";
}

/**
 * Discover agent groups from agents/groups/<groupName>/<agentName>/AGENT.md.
 * @returns {{ groups: Record<string, { agents: Array<{ id: string, name: string, charterPath: string }> }> }}
 */
export function discoverGroups() {
  const groupsDir = resolve("agents/groups");
  const result = { groups: {} };

  if (!fs.existsSync(groupsDir)) {
    return result;
  }

  const groupEntries = fs.readdirSync(groupsDir, { withFileTypes: true });

  for (const groupEntry of groupEntries) {
    if (!groupEntry.isDirectory()) continue;

    const groupName = groupEntry.name;
    const groupPath = resolve(`agents/groups/${groupName}`);
    const agentEntries = fs.readdirSync(groupPath, { withFileTypes: true });
    const agents = [];

    for (const agentEntry of agentEntries) {
      if (!agentEntry.isDirectory()) continue;

      const agentId = agentEntry.name;
      const charterPath = `agents/groups/${groupName}/${agentId}/AGENT.md`;

      if (fs.existsSync(resolve(charterPath))) {
        agents.push({
          id: agentId,
          name: agentIdToName(agentId),
          charterPath,
        });
      }
    }

    if (agents.length > 0) {
      result.groups[groupName] = { agents };
    }
  }

  return result;
}

/**
 * Build a complete agent registry from external agents + discovered groups + config.
 * @param {object} config - loaded jinyiwei config
 * @returns {Array<{ id: string, name: string, role: string, group: string|null, charterPath: string, model: string }>}
 */
export function buildAgentRegistry(config) {
  const registry = [];

  // External agents
  for (const agent of EXTERNAL_AGENTS) {
    registry.push({
      ...agent,
      group: null,
      model: getModelForAgent(config, agent.id, null),
    });
  }

  // Group agents
  const { groups } = discoverGroups();
  for (const [groupName, group] of Object.entries(groups)) {
    for (const agent of group.agents) {
      registry.push({
        ...agent,
        role: "internal",
        group: groupName,
        model: getModelForAgent(config, agent.id, groupName),
      });
    }
  }

  return registry;
}
