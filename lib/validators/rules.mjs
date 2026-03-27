import fs from "node:fs";
import { loadActionCatalog } from "../governance/action-catalog.mjs";
import {
  DISPATCH_PACKET_FIELDS,
  EXTERNAL_AGENT_NAMES,
  INTERNAL_RESPONSE_TEMPLATES,
} from "../governance/contracts.mjs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate all governance rule files.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateRules() {
  const errors = [];

  try {
    const addressingRule = fs.readFileSync(resolve("rules/addressing.md"), "utf8");
    const actionCatalogRule = fs.readFileSync(resolve("rules/action-catalog.md"), "utf8");
    const approvalMatrixRule = fs.readFileSync(resolve("rules/approval-matrix.md"), "utf8");
    const channelRule = fs.readFileSync(resolve("rules/channel-access.md"), "utf8");
    const responseContractRule = fs.readFileSync(resolve("rules/response-contract.md"), "utf8");
    const dispatchRule = fs.readFileSync(resolve("rules/dispatch.md"), "utf8");
    const auditRule = fs.readFileSync(resolve("rules/audit.md"), "utf8");
    const rejectionRule = fs.readFileSync(resolve("rules/rejection.md"), "utf8");
    const catalog = loadActionCatalog();

    assert(addressingRule.includes("`Boss`"), "addressing rule must include Boss naming", errors);
    assert(addressingRule.includes("`锦衣卫`"), "addressing rule must include 锦衣卫 naming", errors);

    assert(catalog.length > 0, "action catalog must contain at least one catalog row", errors);
    assert(actionCatalogRule.includes("Any `action_type` not listed here must be rejected"), "action catalog must reject unknown action types", errors);
    assert(catalog.some((entry) => entry.actionType === "dispatch.send_to_internal_agent"), "action catalog must include dispatch.send_to_internal_agent", errors);
    assert(catalog.some((entry) => entry.actionType === "charter.change_agent_md"), "action catalog must include charter.change_agent_md", errors);
    assert(catalog.every((entry) => entry.owners.length > 0), "every action catalog row must declare at least one owner", errors);
    assert(catalog.every((entry) => ["low", "medium", "high"].includes(entry.defaultRisk)), "every action catalog row must use a valid default risk", errors);

    assert(approvalMatrixRule.includes("`hybrid`"), "approval matrix rule must declare hybrid mode", errors);
    assert(approvalMatrixRule.includes("### Low Risk"), "approval matrix rule must define low risk", errors);
    assert(approvalMatrixRule.includes("### Medium Risk"), "approval matrix rule must define medium risk", errors);
    assert(approvalMatrixRule.includes("### High Risk"), "approval matrix rule must define high risk", errors);
    assert(approvalMatrixRule.includes("hard-blocked"), "approval matrix rule must define hard-block behavior", errors);

    for (const agentName of EXTERNAL_AGENT_NAMES) {
      assert(channelRule.includes(`\`${agentName}\``), `channel access rule must include ${agentName}`, errors);
    }
    assert(channelRule.includes("Feishu"), "channel access rule must include Feishu", errors);
    assert(channelRule.includes("Telegram"), "channel access rule must include Telegram", errors);

    assert(responseContractRule.includes("templates/approval-decision.md"), "response contract must require approval decision template", errors);
    assert(responseContractRule.includes("templates/rejection-decision.md"), "response contract must require rejection decision template", errors);
    assert(responseContractRule.includes("templates/audit-entry.md"), "response contract must require audit entry template", errors);
    for (const [agentName, templatePath] of INTERNAL_RESPONSE_TEMPLATES) {
      assert(responseContractRule.includes(templatePath), `response contract must reference ${agentName} response template`, errors);
    }

    assert(dispatchRule.includes("templates/dispatch-packet.md"), "dispatch rule must require the dispatch template", errors);
    assert(dispatchRule.includes("rules/action-catalog.md"), "dispatch rule must require the action catalog", errors);
    assert(dispatchRule.includes("templates/approval-decision.md"), "dispatch rule must require the approval decision template", errors);
    for (const field of DISPATCH_PACKET_FIELDS) {
      assert(dispatchRule.includes(field), `dispatch rule must require field ${field}`, errors);
    }

    assert(auditRule.includes("templates/audit-entry.md"), "audit rule must reference audit entry template", errors);
    assert(auditRule.includes("must not run"), "audit rule must block unauditable actions", errors);

    assert(rejectionRule.includes("templates/rejection-decision.md"), "rejection rule must reference rejection decision template", errors);
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}
