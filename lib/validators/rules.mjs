import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate all governance rule files.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateRules() {
  const errors = [];

  const addressingRule = fs.readFileSync(resolve("rules/addressing.md"), "utf8");
  const actionCatalogRule = fs.readFileSync(resolve("rules/action-catalog.md"), "utf8");
  const approvalMatrixRule = fs.readFileSync(resolve("rules/approval-matrix.md"), "utf8");
  const channelRule = fs.readFileSync(resolve("rules/channel-access.md"), "utf8");
  const responseContractRule = fs.readFileSync(resolve("rules/response-contract.md"), "utf8");
  const dispatchRule = fs.readFileSync(resolve("rules/dispatch.md"), "utf8");
  const auditRule = fs.readFileSync(resolve("rules/audit.md"), "utf8");
  const rejectionRule = fs.readFileSync(resolve("rules/rejection.md"), "utf8");

  // Addressing
  assert(addressingRule.includes("`Boss`"), "addressing rule must include Boss naming", errors);
  assert(addressingRule.includes("`锦衣卫`"), "addressing rule must include 锦衣卫 naming", errors);

  // Action catalog
  assert(actionCatalogRule.includes("`channel.receive_boss_message`"), "action catalog must include channel.receive_boss_message", errors);
  assert(actionCatalogRule.includes("`dispatch.send_to_internal_agent`"), "action catalog must include dispatch.send_to_internal_agent", errors);
  assert(actionCatalogRule.includes("`charter.change_agent_md`"), "action catalog must include charter.change_agent_md", errors);
  assert(actionCatalogRule.includes("Any `action_type` not listed here must be rejected"), "action catalog must reject unknown action types", errors);

  // Approval matrix
  assert(approvalMatrixRule.includes("`hybrid`"), "approval matrix rule must declare hybrid mode", errors);
  assert(approvalMatrixRule.includes("### Low Risk"), "approval matrix rule must define low risk", errors);
  assert(approvalMatrixRule.includes("### Medium Risk"), "approval matrix rule must define medium risk", errors);
  assert(approvalMatrixRule.includes("### High Risk"), "approval matrix rule must define high risk", errors);
  assert(approvalMatrixRule.includes("hard-blocked"), "approval matrix rule must define hard-block behavior", errors);

  // Channel access
  assert(channelRule.includes("`ChatAgent`"), "channel access rule must include ChatAgent", errors);
  assert(channelRule.includes("`WatchAgent`"), "channel access rule must include WatchAgent", errors);
  assert(channelRule.includes("Feishu"), "channel access rule must include Feishu", errors);
  assert(channelRule.includes("Telegram"), "channel access rule must include Telegram", errors);

  // Response contract
  assert(responseContractRule.includes("templates/approval-decision.md"), "response contract must require approval decision template", errors);
  assert(responseContractRule.includes("templates/audit-entry.md"), "response contract must require audit entry template", errors);
  assert(responseContractRule.includes("templates/responses/ui-agent-response.md"), "response contract must reference UIAgent response template", errors);
  assert(responseContractRule.includes("templates/responses/code-agent-response.md"), "response contract must reference CodeAgent response template", errors);
  assert(responseContractRule.includes("templates/responses/review-agent-response.md"), "response contract must reference ReviewAgent response template", errors);
  assert(responseContractRule.includes("templates/responses/test-agent-response.md"), "response contract must reference TestAgent response template", errors);

  // Dispatch
  assert(dispatchRule.includes("templates/dispatch-packet.md"), "dispatch rule must require dispatch template", errors);
  assert(dispatchRule.includes("rules/action-catalog.md"), "dispatch rule must require action catalog", errors);
  assert(dispatchRule.includes("templates/approval-decision.md"), "dispatch rule must require approval decision template", errors);
  assert(dispatchRule.includes("response templates"), "dispatch rule must require response templates", errors);

  // Audit
  assert(auditRule.includes("templates/audit-entry.md"), "audit rule must reference audit entry template", errors);

  // Rejection
  assert(rejectionRule.includes("templates/rejection-decision.md"), "rejection rule must reference rejection decision template", errors);

  return { ok: errors.length === 0, errors };
}
