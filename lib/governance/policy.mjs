import {
  ALLOWED_EXTERNAL_AGENTS,
  DEFAULT_BOSS_TITLE,
  DISPATCH_REQUIRED_FIELDS,
  VALID_RISK_LEVELS,
} from "./constants.mjs";
import { findActionDefinition } from "./action-catalog.mjs";
import { findAgentByName } from "./runtime-registry.mjs";

/**
 * @param {Record<string, any>} packet
 * @param {string} [expectedBossTitle]
 * @returns {string[]}
 */
export function validateDispatchPacket(packet, expectedBossTitle = DEFAULT_BOSS_TITLE) {
  const errors = [];

  for (const field of DISPATCH_REQUIRED_FIELDS) {
    if (typeof packet[field] !== "string" || packet[field].trim() === "") {
      errors.push(`dispatch packet field '${field}' is required`);
    }
  }

  if (packet.requested_by && packet.requested_by !== expectedBossTitle) {
    errors.push(`dispatch packet requested_by must be ${expectedBossTitle}`);
  }

  if (packet.approval_route && !packet.approval_route.includes("WatchAgent")) {
    errors.push("dispatch packet approval_route must route through WatchAgent");
  }

  if (packet.risk_hint && !VALID_RISK_LEVELS.includes(packet.risk_hint)) {
    errors.push("dispatch packet risk_hint must be one of low, medium, or high");
  }

  return errors;
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {string}
 */
function maxRisk(left, right) {
  const order = { low: 0, medium: 1, high: 2 };
  return order[left] >= order[right] ? left : right;
}

/**
 * @param {{
 *   actingAgent?: string,
 *   packet: Record<string, any>,
 *   registry: Array<{ name: string, role: string }>,
 *   hasMarkdownSupport?: boolean,
 *   hasAuditTrail?: boolean,
 *   bossTitle?: string,
 * }} input
 */
export function reviewDispatch(input) {
  const actingAgent = input.actingAgent || "ChatAgent";
  const packet = input.packet;
  const registry = input.registry;
  const hasMarkdownSupport = input.hasMarkdownSupport !== false;
  const hasAuditTrail = input.hasAuditTrail !== false;

  const expectedBossTitle = input.bossTitle || DEFAULT_BOSS_TITLE;
  const packetErrors = validateDispatchPacket(packet, expectedBossTitle);
  if (packetErrors.length > 0) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: packetErrors.join("; "),
      violationType: "dispatch",
      violatedRule: "rules/dispatch.md",
      remediation: "Provide a complete dispatch packet before requesting approval.",
      suggestedAlternative: "Return the task to ChatAgent for a corrected packet.",
    });
  }

  const action = findActionDefinition(packet.action_type);
  if (!action) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: `Unknown action_type '${packet.action_type}'.`,
      violationType: "catalog",
      violatedRule: "rules/action-catalog.md",
      remediation: "Use an action_type defined in the action catalog.",
      suggestedAlternative: "Select the most specific catalog entry that matches the request.",
    });
  }

  const targetAgent = findAgentByName(registry, packet.target_agent);
  if (!targetAgent) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: `Target agent '${packet.target_agent}' is not registered.`,
      violationType: "registry",
      violatedRule: "rules/dispatch.md",
      remediation: "Dispatch only to registered internal agents.",
      suggestedAlternative: "Refresh the agent registry and retry with a valid internal agent.",
    });
  }

  if (ALLOWED_EXTERNAL_AGENTS.includes(targetAgent.name)) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: "Dispatch packets may not target externally reachable agents.",
      violationType: "channel",
      violatedRule: "rules/channel-access.md",
      remediation: "Send internal work only to internal agents.",
      suggestedAlternative: "Use WatchAgent only for approval and ChatAgent only for Boss-facing responses.",
    });
  }

  if (!action.owners.includes(actingAgent)) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: `${actingAgent} is not permitted to request '${packet.action_type}'.`,
      violationType: "charter",
      violatedRule: "rules/action-catalog.md",
      remediation: "Route this action through an owning external agent.",
      suggestedAlternative: "Have ChatAgent issue the dispatch or adjust the workflow before retrying.",
    });
  }

  if (!hasMarkdownSupport) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: "The request is not justified by markdown control files.",
      violationType: "markdown-control",
      violatedRule: "rules/md-control.md",
      remediation: "Reference the governing charter, rule, and template files.",
      suggestedAlternative: "Pause execution until the markdown basis is attached.",
    });
  }

  if (!hasAuditTrail) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: "The request cannot be audited.",
      violationType: "audit",
      violatedRule: "rules/audit.md",
      remediation: "Ensure packet and decision identifiers can be logged.",
      suggestedAlternative: "Reject the request and return it for re-submission with audit data.",
    });
  }

  if (action.className === "governance-change" || action.defaultDecision.includes("block")) {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: "Governance-changing actions are blocked by default and require explicit Boss approval.",
      violationType: "governance-change",
      violatedRule: "rules/approval-matrix.md",
      remediation: "Escalate the request to Boss with an explicit governance change proposal.",
      suggestedAlternative: "Keep the existing governance boundary and pursue a lower-risk operational change instead.",
    });
  }

  const effectiveRisk = maxRisk(action.defaultRisk, packet.risk_hint || action.defaultRisk);
  if (effectiveRisk === "high") {
    return rejectDecision({
      packet,
      riskLevel: "high",
      reason: "High-risk actions must be escalated to Boss before execution.",
      violationType: "approval",
      violatedRule: "rules/approval-matrix.md",
      remediation: "Escalate the packet to Boss with rationale and risk context.",
      suggestedAlternative: "Reduce scope or split the request into lower-risk approved actions.",
    });
  }

  const reason =
    effectiveRisk === "medium"
      ? `Approved with record: ${packet.action_type} is medium risk and requires an explicit audit note.`
      : `Approved: ${packet.action_type} is permitted under the current governance rules.`;

  return {
    ok: true,
    decision: "approve",
    riskLevel: effectiveRisk,
    reason,
    requiredFollowUp: effectiveRisk === "medium" ? "Record affected component, scope, and reason." : "Record rationale and timestamp.",
    reportedToBoss: "no",
    violatedRule: null,
    violationType: null,
    suggestedAlternative: null,
  };
}

/**
 * @param {{
 *   packet: Record<string, any>,
 *   riskLevel: string,
 *   reason: string,
 *   violationType: string,
 *   violatedRule: string,
 *   remediation: string,
 *   suggestedAlternative: string,
 * }} input
 */
function rejectDecision(input) {
  return {
    ok: false,
    decision: "reject",
    riskLevel: input.riskLevel,
    reason: input.reason,
    requiredFollowUp: input.remediation,
    reportedToBoss: "yes",
    violatedRule: input.violatedRule,
    violationType: input.violationType,
    suggestedAlternative: input.suggestedAlternative,
  };
}
