import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendAuditLog,
  renderApprovalDecision,
  renderAuditEntry,
  renderDispatchPacket,
  renderRejectionDecision,
} from "../lib/governance/documents.mjs";

describe("runtime documents", () => {
  it("renders governance packet and decision documents", () => {
    const packet = renderDispatchPacket({
      packet_id: "pkt-1",
      requested_by: "Boss",
      target_agent: "CodeAgent",
      action_type: "dispatch.send_to_internal_agent",
      risk_hint: "low",
      goal: "Implement a change",
      scope: "One file",
      inputs: "Spec",
      constraints: "No regressions",
      expected_outputs: "Patch",
      approval_route: "WatchAgent",
      audit_requirements: "standard",
      fallback_on_reject: "return to ChatAgent",
    });
    const approval = renderApprovalDecision({
      decision_id: "dec-1",
      packet_id: "pkt-1",
      action_type: "dispatch.send_to_internal_agent",
      risk_level: "low",
      decision: "APPROVED",
      reason: "Safe change",
      required_follow_up: "Record rationale",
      reported_to_boss: "no",
    });
    const rejection = renderRejectionDecision({
      decision_id: "dec-2",
      packet_id: "pkt-1",
      action_type: "dispatch.send_to_internal_agent",
      risk_level: "high",
      decision: "REJECTED",
      reason: "Missing approval",
      violation_type: "governance-change",
      violated_rule: "rules/approval-matrix.md",
      remediation: "Escalate to Boss",
      suggested_alternative: "Keep scope unchanged",
      reported_to_boss: "yes",
    });

    assert.match(packet, /Dispatch Packet/);
    assert.match(packet, /CodeAgent/);
    assert.match(approval, /APPROVED/);
    assert.match(rejection, /rules\/approval-matrix\.md/);
  });

  it("appends rendered audit entries to the workspace audit log", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-audit-"));
    const entry = renderAuditEntry({
      audit_id: "audit-1",
      packet_id: "pkt-1",
      decision_id: "dec-1",
      acting_agent: "WatchAgent",
      action_type: "approval.review_action",
      risk_level: "low",
      rationale: "Approved for execution",
      supervising_decision: "approve",
      output_or_rejection: "Approved packet",
      timestamp: "2026-03-28T00:00:00.000Z",
    });

    appendAuditLog(workspace, entry);

    const logPath = path.join(workspace, "audit-log.md");
    const content = fs.readFileSync(logPath, "utf8");

    assert.match(content, /Jinyiwei Audit Log/);
    assert.match(content, /audit-1/);
    assert.match(content, /approval.review_action/);
  });
});
