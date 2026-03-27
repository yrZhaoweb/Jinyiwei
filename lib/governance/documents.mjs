import fs from "node:fs";
import path from "node:path";

function listSection(name, value) {
  return [`## \`${name}\``, "", value];
}

function normalizeList(value, fallback = "none") {
  if (Array.isArray(value)) {
    const items = value.filter(Boolean);
    return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return `- ${fallback}`;
}

/**
 * @param {{
 *   packet_id: string,
 *   requested_by?: string,
 *   target_agent: string,
 *   action_type: string,
 *   risk_hint: string,
 *   goal: string,
 *   scope?: string,
 *   inputs?: string,
 *   constraints?: string,
 *   expected_outputs?: string,
 *   approval_route?: string,
 *   audit_requirements?: string,
 *   fallback_on_reject?: string
 * }} params
 */
export function buildDispatchPacket(params) {
  return [
    "# Jinyiwei Dispatch Packet",
    "",
    `- \`packet_id\`: ${params.packet_id}`,
    `- \`requested_by\`: ${params.requested_by || "Boss"}`,
    `- \`target_agent\`: ${params.target_agent}`,
    `- \`action_type\`: ${params.action_type}`,
    `- \`risk_hint\`: ${params.risk_hint}`,
    "",
    ...listSection("goal", params.goal),
    "",
    ...listSection("scope", params.scope || "N/A"),
    "",
    ...listSection("inputs", params.inputs || "N/A"),
    "",
    ...listSection("constraints", params.constraints || "N/A"),
    "",
    ...listSection("expected_outputs", params.expected_outputs || "N/A"),
    "",
    ...listSection("approval_route", params.approval_route || "ChatAgent -> WatchAgent -> target_agent"),
    "",
    ...listSection("audit_requirements", params.audit_requirements || "- log packet_id\n- log action_type\n- log risk level\n- log approval decision"),
    "",
    ...listSection("fallback_on_reject", params.fallback_on_reject || "- return rejection reason to ChatAgent"),
  ].join("\n");
}

/**
 * @param {{
 *   decision_id: string,
 *   packet_id: string,
 *   action_type: string,
 *   risk_level: string,
 *   decision: string,
 *   reason: string,
 *   required_follow_up?: string | string[],
 *   reported_to_boss?: string
 * }} params
 */
export function buildApprovalDecision(params) {
  return [
    "# Jinyiwei Approval Decision",
    "",
    `- \`decision_id\`: ${params.decision_id}`,
    `- \`packet_id\`: ${params.packet_id}`,
    `- \`action_type\`: ${params.action_type}`,
    `- \`risk_level\`: ${params.risk_level}`,
    `- \`decision\`: ${params.decision}`,
    "",
    ...listSection("reason", params.reason),
    "",
    ...listSection("required_follow_up", normalizeList(params.required_follow_up)),
    "",
    ...listSection("reported_to_boss", params.reported_to_boss || "no"),
  ].join("\n");
}

/**
 * @param {{
 *   decision_id: string,
 *   packet_id: string,
 *   action_type: string,
 *   violation_type: string,
 *   risk_level: string,
 *   reason: string,
 *   violated_rule: string,
 *   remediation?: string,
 *   reported_to_boss?: string
 * }} params
 */
export function buildRejectionDecision(params) {
  return [
    "# Jinyiwei Rejection Decision",
    "",
    `- \`decision_id\`: ${params.decision_id}`,
    `- \`packet_id\`: ${params.packet_id}`,
    `- \`action_type\`: ${params.action_type}`,
    `- \`violation_type\`: ${params.violation_type}`,
    `- \`risk_level\`: ${params.risk_level}`,
    `- \`decision\`: reject`,
    `- \`reason\`: ${params.reason}`,
    `- \`violated_rule\`: ${params.violated_rule}`,
    `- \`remediation\`: ${params.remediation || "N/A"}`,
    `- \`reported_to_boss\`: ${params.reported_to_boss || "yes"}`,
  ].join("\n");
}

/**
 * @param {{
 *   audit_id: string,
 *   packet_id?: string,
 *   decision_id?: string,
 *   acting_agent: string,
 *   action_type: string,
 *   risk_level?: string,
 *   rationale?: string,
 *   supervising_decision?: string,
 *   output_or_rejection: string,
 *   timestamp?: string
 * }} params
 */
export function buildAuditEntry(params) {
  return [
    "# Jinyiwei Audit Entry",
    "",
    `- \`audit_id\`: ${params.audit_id}`,
    `- \`packet_id\`: ${params.packet_id || "N/A"}`,
    `- \`decision_id\`: ${params.decision_id || "N/A"}`,
    `- \`acting_agent\`: ${params.acting_agent}`,
    `- \`action_type\`: ${params.action_type}`,
    `- \`risk_level\`: ${params.risk_level || "N/A"}`,
    `- \`rationale\`: ${params.rationale || "N/A"}`,
    `- \`supervising_decision\`: ${params.supervising_decision || "N/A"}`,
    `- \`timestamp\`: ${params.timestamp || new Date().toISOString()}`,
    `- \`output_or_rejection\`: ${params.output_or_rejection}`,
  ].join("\n");
}

/**
 * @param {string} workspace
 * @param {string} auditEntry
 */
export function appendAuditLog(workspace, auditEntry) {
  const logPath = path.join(workspace, "audit-log.md");
  const header = "# Jinyiwei Audit Log\n\n";

  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, header, "utf8");
  }

  fs.appendFileSync(logPath, `${auditEntry}\n\n---\n\n`, "utf8");
}

export const renderDispatchPacket = buildDispatchPacket;
export const renderApprovalDecision = buildApprovalDecision;
export const renderRejectionDecision = buildRejectionDecision;
export const renderAuditEntry = buildAuditEntry;
