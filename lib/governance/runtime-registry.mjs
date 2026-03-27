import fs from "node:fs";
import path from "node:path";
import { buildAgentRegistry } from "../groups.mjs";
import { loadConfig } from "../config.mjs";
import { EXTERNAL_AGENT_NAMES } from "./constants.mjs";

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   role: string,
 *   group: string | null,
 *   model?: string,
 * }} RuntimeAgent
 */

/**
 * @param {string | undefined | null} workspace
 * @returns {RuntimeAgent[]}
 */
export function loadRuntimeRegistry(workspace) {
  if (workspace) {
    const registryPath = path.join(workspace, "openclaw-agents.json");
    if (fs.existsSync(registryPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
        if (Array.isArray(parsed.agents)) {
          return parsed.agents;
        }
      } catch {
        // Fall through to local registry generation.
      }
    }
  }

  return buildAgentRegistry(loadConfig());
}

/**
 * @param {RuntimeAgent[]} registry
 * @param {string} agentName
 * @returns {RuntimeAgent | undefined}
 */
export function findAgentByName(registry, agentName) {
  return registry.find((agent) => agent.name === agentName);
}

/**
 * @param {RuntimeAgent[]} registry
 * @returns {RuntimeAgent[]}
 */
export function internalAgents(registry) {
  return registry.filter((agent) => !EXTERNAL_AGENT_NAMES.includes(agent.name));
}
