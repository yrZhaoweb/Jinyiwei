import fs from "node:fs";
import {
  APPROVAL_DECISION_FIELDS,
  AUDIT_ENTRY_FIELDS,
  DISPATCH_PACKET_FIELDS,
  INTERNAL_RESPONSE_FIELDS,
  INTERNAL_RESPONSE_TEMPLATES,
  REJECTION_DECISION_FIELDS,
} from "../governance/contracts.mjs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate all template files contain required fields.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateTemplates() {
  const errors = [];

  try {
  const dispatchRule = fs.readFileSync(resolve("rules/dispatch.md"), "utf8");
  const dispatchTemplate = fs.readFileSync(resolve("templates/dispatch-packet.md"), "utf8");
  const approvalTemplate = fs.readFileSync(resolve("templates/approval-decision.md"), "utf8");
  const auditTemplate = fs.readFileSync(resolve("templates/audit-entry.md"), "utf8");
  const rejectionTemplate = fs.readFileSync(resolve("templates/rejection-decision.md"), "utf8");

  // Dispatch packet fields
  for (const field of DISPATCH_PACKET_FIELDS) {
    assert(dispatchRule.includes(field), `dispatch rule must require field ${field}`, errors);
    assert(dispatchTemplate.includes(field), `dispatch template must include field ${field}`, errors);
  }

  // Approval decision fields
  for (const field of APPROVAL_DECISION_FIELDS) {
    assert(approvalTemplate.includes(field), `approval template must include field ${field}`, errors);
  }

  // Audit entry fields
  for (const field of AUDIT_ENTRY_FIELDS) {
    assert(auditTemplate.includes(field), `audit entry template must include field ${field}`, errors);
  }

  // Rejection decision fields
  for (const field of REJECTION_DECISION_FIELDS.filter((field) => field !== "`decision`")) {
    assert(rejectionTemplate.includes(field), `rejection template must include field ${field}`, errors);
  }

  // Internal agent response templates
  for (const [name, templatePath] of INTERNAL_RESPONSE_TEMPLATES) {
    const template = fs.readFileSync(resolve(templatePath), "utf8");
    for (const field of INTERNAL_RESPONSE_FIELDS) {
      assert(template.includes(field), `${name} response template must include field ${field}`, errors);
    }
  }
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}
