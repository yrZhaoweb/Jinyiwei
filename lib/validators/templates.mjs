import fs from "node:fs";
import { resolve } from "../paths.mjs";

/**
 * @param {boolean} condition
 * @param {string} message
 * @param {string[]} errors
 */
function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

/**
 * Validate all template files contain required fields.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateTemplates() {
  const errors = [];

  const dispatchRule = fs.readFileSync(resolve("rules/dispatch.md"), "utf8");
  const dispatchTemplate = fs.readFileSync(resolve("templates/dispatch-packet.md"), "utf8");
  const approvalTemplate = fs.readFileSync(resolve("templates/approval-decision.md"), "utf8");
  const auditTemplate = fs.readFileSync(resolve("templates/audit-entry.md"), "utf8");
  const rejectionTemplate = fs.readFileSync(resolve("templates/rejection-decision.md"), "utf8");

  // Dispatch packet fields
  for (const field of [
    "`packet_id`",
    "`requested_by`",
    "`target_agent`",
    "`action_type`",
    "`risk_hint`",
    "`goal`",
    "`scope`",
    "`inputs`",
    "`constraints`",
    "`expected_outputs`",
    "`approval_route`",
    "`audit_requirements`",
    "`fallback_on_reject`"
  ]) {
    assert(dispatchRule.includes(field), `dispatch rule must require field ${field}`, errors);
    assert(dispatchTemplate.includes(field), `dispatch template must include field ${field}`, errors);
  }

  // Approval decision fields
  for (const field of [
    "`decision_id`",
    "`packet_id`",
    "`action_type`",
    "`risk_level`",
    "`decision`",
    "`reason`",
    "`required_follow_up`",
    "`reported_to_boss`"
  ]) {
    assert(approvalTemplate.includes(field), `approval template must include field ${field}`, errors);
  }

  // Audit entry fields
  for (const field of [
    "`audit_id`",
    "`packet_id`",
    "`decision_id`",
    "`acting_agent`",
    "`action_type`",
    "`risk_level`",
    "`rationale`",
    "`supervising_decision`",
    "`timestamp`",
    "`output_or_rejection`"
  ]) {
    assert(auditTemplate.includes(field), `audit entry template must include field ${field}`, errors);
  }

  // Rejection decision fields
  for (const field of [
    "`decision_id`",
    "`packet_id`",
    "`action_type`",
    "`violation_type`",
    "`risk_level`",
    "`reason`",
    "`violated_rule`",
    "`remediation`",
    "`reported_to_boss`"
  ]) {
    assert(rejectionTemplate.includes(field), `rejection template must include field ${field}`, errors);
  }

  // Internal agent response templates
  const responseTemplates = [
    ["UIAgent", "templates/responses/ui-agent-response.md"],
    ["CodeAgent", "templates/responses/code-agent-response.md"],
    ["ReviewAgent", "templates/responses/review-agent-response.md"],
    ["TestAgent", "templates/responses/test-agent-response.md"]
  ];
  for (const [name, templatePath] of responseTemplates) {
    const template = fs.readFileSync(resolve(templatePath), "utf8");
    for (const field of ["`packet_id`", "`source_agent`", "`status`", "`handoff_to`"]) {
      assert(template.includes(field), `${name} response template must include field ${field}`, errors);
    }
  }

  return { ok: errors.length === 0, errors };
}
