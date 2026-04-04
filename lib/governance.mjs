import { REQUIRED_GOVERNANCE_FILES as REQUIRED_FILES } from "./governance/contracts.mjs";

export {
  PLUGIN_ID,
  PLUGIN_NAME,
  DEFAULT_BOSS_TITLE,
  DEFAULT_WATCH_SELF_TITLE,
  DEFAULT_APPROVAL_MODE,
  DEFAULT_EXTERNAL_CHANNELS,
  EXTERNAL_AGENT_IDS,
  EXTERNAL_AGENT_NAMES,
  ALLOWED_EXTERNAL_AGENTS,
  EXTERNAL_AGENT_DEFINITIONS,
  VALID_APPROVAL_MODES,
  VALID_RISK_LEVELS,
  DISPATCH_REQUIRED_FIELDS,
  APPROVAL_REQUIRED_FIELDS,
  REJECTION_REQUIRED_FIELDS,
  AUDIT_REQUIRED_FIELDS,
  INTERNAL_RESPONSE_TEMPLATES as CONSTANT_RESPONSE_TEMPLATES,
  REQUIRED_RULE_FILES,
  REQUIRED_TEMPLATE_FILES,
  defaultGovernanceConfig,
} from "./governance/constants.mjs";

export {
  APPROVAL_MODES,
  DEFAULT_EXTERNAL_CHANNELS as GOVERNANCE_EXTERNAL_CHANNELS,
  DISPATCH_PACKET_FIELDS,
  APPROVAL_DECISION_FIELDS,
  REJECTION_DECISION_FIELDS,
  AUDIT_ENTRY_FIELDS,
  INTERNAL_RESPONSE_FIELDS,
  GOVERNANCE_RULE_FILES,
  GOVERNANCE_TEMPLATE_FILES,
  REQUIRED_GOVERNANCE_FILES,
  RULE_REFERENCES,
} from "./governance/contracts.mjs";

export { parseActionCatalog, loadActionCatalog, findActionDefinition } from "./governance/action-catalog.mjs";
export { validateDispatchPacket, reviewDispatch } from "./governance/policy.mjs";
export { loadRuntimeRegistry, findAgentByName, internalAgents } from "./governance/runtime-registry.mjs";

export function buildRequiredProjectFiles(groupCharterPaths = []) {
  return [...new Set([...REQUIRED_FILES, ...groupCharterPaths])];
}
