/**
 * Resolve the model for a given agent.
 * @param {object} config
 * @param {string} agentId
 * @param {string | null} groupName
 * @returns {string}
 */
export function resolveAgentModel(config, agentId, groupName) {
  if (agentId === "chat") return config.models?.chat || "";
  if (agentId === "watch") return config.models?.watch || "";
  if (groupName && config.models?.groups?.[groupName]) {
    return config.models.groups[groupName];
  }
  return config.models?.chat || "";
}
