import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildDispatchPacket,
  buildApprovalDecision,
  buildRejectionDecision,
  buildAuditEntry,
  appendAuditLog,
} from "../lib/governance/documents.mjs";

describe("governance documents - edge cases", () => {
  describe("buildDispatchPacket", () => {
    it("uses default values when optional fields are missing", () => {
      const minimal = buildDispatchPacket({
        packet_id: "pkt-min",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test goal",
      });

      assert.ok(minimal.includes("`packet_id`: pkt-min"));
      assert.ok(minimal.includes("`requested_by`: Boss")); // default
      assert.ok(minimal.includes("`target_agent`: CodeAgent"));
      assert.ok(minimal.includes("goal"));
      assert.ok(minimal.includes("scope"));
      assert.ok(minimal.includes("N/A")); // default for scope
    });

    it("includes all required dispatch packet fields", () => {
      const packet = buildDispatchPacket({
        packet_id: "pkt-full",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "medium",
        goal: "Implement feature",
        scope: "New endpoint",
        inputs: "API spec",
        constraints: "Backward compatible",
        expected_outputs: "Working API",
        approval_route: "ChatAgent -> WatchAgent -> CodeAgent",
        audit_requirements: "Log all",
        fallback_on_reject: "Return error",
      });

      // Check all required fields are present
      assert.ok(packet.includes("`packet_id`"));
      assert.ok(packet.includes("`requested_by`"));
      assert.ok(packet.includes("`target_agent`"));
      assert.ok(packet.includes("`action_type`"));
      assert.ok(packet.includes("`risk_hint`"));
      assert.ok(packet.includes("`goal`"));
      assert.ok(packet.includes("`scope`"));
      assert.ok(packet.includes("`inputs`"));
      assert.ok(packet.includes("`constraints`"));
      assert.ok(packet.includes("`expected_outputs`"));
      assert.ok(packet.includes("`approval_route`"));
      assert.ok(packet.includes("`audit_requirements`"));
      assert.ok(packet.includes("`fallback_on_reject`"));
    });

    it("uses custom approval_route when provided", () => {
      const packet = buildDispatchPacket({
        packet_id: "pkt-1",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        approval_route: "CustomRoute",
      });

      assert.ok(packet.includes("CustomRoute"));
    });

    it("uses custom audit_requirements when provided", () => {
      const packet = buildDispatchPacket({
        packet_id: "pkt-1",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        audit_requirements: "Custom audit requirements",
      });

      assert.ok(packet.includes("Custom audit requirements"));
    });

    it("returns a string", () => {
      const packet = buildDispatchPacket({
        packet_id: "pkt-1",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
      });

      assert.strictEqual(typeof packet, "string");
      assert.ok(packet.length > 0);
    });

    it("escapes special characters in goal", () => {
      const packet = buildDispatchPacket({
        packet_id: "pkt-1",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test with `backticks` and | pipes",
      });

      assert.ok(packet.includes("Test with"));
    });
  });

  describe("buildApprovalDecision", () => {
    it("uses defaults for optional fields", () => {
      const decision = buildApprovalDecision({
        decision_id: "dec-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        risk_level: "low",
        decision: "approve",
        reason: "Test reason",
      });

      assert.ok(decision.includes("`decision_id`: dec-1"));
      assert.ok(decision.includes("reported_to_boss")); // default section present
    });

    it("accepts array for required_follow_up", () => {
      const decision = buildApprovalDecision({
        decision_id: "dec-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        risk_level: "medium",
        decision: "approve",
        reason: "Test reason",
        required_follow_up: ["Step 1", "Step 2"],
      });

      assert.ok(decision.includes("- Step 1"));
      assert.ok(decision.includes("- Step 2"));
    });

    it("accepts string for required_follow_up", () => {
      const decision = buildApprovalDecision({
        decision_id: "dec-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        risk_level: "low",
        decision: "approve",
        reason: "Test reason",
        required_follow_up: "Single follow-up item",
      });

      assert.ok(decision.includes("Single follow-up item"));
    });

    it("uses fallback for empty required_follow_up", () => {
      const decision = buildApprovalDecision({
        decision_id: "dec-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        risk_level: "low",
        decision: "approve",
        reason: "Test reason",
        required_follow_up: "",
      });

      assert.ok(decision.includes("- none"));
    });

    it("uses provided reported_to_boss value", () => {
      const decision = buildApprovalDecision({
        decision_id: "dec-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        risk_level: "high",
        decision: "approve",
        reason: "Escalated",
        reported_to_boss: "yes",
      });

      assert.ok(decision.includes("reported_to_boss"));
      assert.ok(decision.includes("yes"));
    });
  });

  describe("buildRejectionDecision", () => {
    it("uses defaults for remediation", () => {
      const decision = buildRejectionDecision({
        decision_id: "dec-rej-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        violation_type: "catalog",
        risk_level: "high",
        reason: "Unknown action type",
        violated_rule: "rules/action-catalog.md",
      });

      assert.ok(decision.includes("`remediation`: N/A")); // default
      assert.ok(decision.includes("`reported_to_boss`: yes")); // default
    });

    it("includes all required rejection fields", () => {
      const decision = buildRejectionDecision({
        decision_id: "dec-rej-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        violation_type: "catalog",
        risk_level: "high",
        reason: "Unknown action type",
        violated_rule: "rules/action-catalog.md",
        remediation: "Use known action type",
        reported_to_boss: "yes",
      });

      assert.ok(decision.includes("`decision`: reject")); // always reject
      assert.ok(decision.includes("`violation_type`: catalog"));
      assert.ok(decision.includes("`violated_rule`: rules/action-catalog.md"));
    });

    it("returns a string", () => {
      const decision = buildRejectionDecision({
        decision_id: "dec-rej-1",
        packet_id: "pkt-1",
        action_type: "test.action",
        violation_type: "catalog",
        risk_level: "high",
        reason: "Unknown",
        violated_rule: "rules/test.md",
      });

      assert.strictEqual(typeof decision, "string");
      assert.ok(decision.length > 0);
    });
  });

  describe("buildAuditEntry", () => {
    it("uses defaults for optional fields", () => {
      const entry = buildAuditEntry({
        audit_id: "audit-1",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        output_or_rejection: "approved",
      });

      assert.ok(entry.includes("`audit_id`: audit-1"));
      assert.ok(entry.includes("`packet_id`: N/A")); // default
      assert.ok(entry.includes("`decision_id`: N/A")); // default
      assert.ok(entry.includes("`acting_agent`: WatchAgent"));
      assert.ok(entry.includes("`risk_level`: N/A")); // default
      assert.ok(entry.includes("`rationale`: N/A")); // default
      assert.ok(entry.includes("`supervising_decision`: N/A")); // default
    });

    it("uses provided timestamp", () => {
      const entry = buildAuditEntry({
        audit_id: "audit-ts",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        output_or_rejection: "approved",
        timestamp: "2026-03-28T12:00:00.000Z",
      });

      assert.ok(entry.includes("2026-03-28T12:00:00.000Z"));
    });

    it("includes all required audit fields", () => {
      const entry = buildAuditEntry({
        audit_id: "audit-full",
        packet_id: "pkt-1",
        decision_id: "dec-1",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        risk_level: "medium",
        rationale: "All criteria met",
        supervising_decision: "approve",
        output_or_rejection: "approved",
        timestamp: "2026-03-28T12:00:00.000Z",
      });

      assert.ok(entry.includes("`audit_id`"));
      assert.ok(entry.includes("`packet_id`"));
      assert.ok(entry.includes("`decision_id`"));
      assert.ok(entry.includes("`acting_agent`"));
      assert.ok(entry.includes("`action_type`"));
      assert.ok(entry.includes("`risk_level`"));
      assert.ok(entry.includes("`rationale`"));
      assert.ok(entry.includes("`supervising_decision`"));
      assert.ok(entry.includes("`timestamp`"));
      assert.ok(entry.includes("`output_or_rejection`"));
    });
  });

  describe("appendAuditLog", () => {
    it("creates audit log file if it does not exist", () => {
      const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-audit-"));
      const entry = buildAuditEntry({
        audit_id: "audit-new",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        output_or_rejection: "approved",
      });

      appendAuditLog(workspace, entry);

      const logPath = path.join(workspace, "audit-log.md");
      assert.ok(fs.existsSync(logPath));
      assert.ok(fs.readFileSync(logPath, "utf8").includes("Jinyiwei Audit Log"));
      assert.ok(fs.readFileSync(logPath, "utf8").includes("audit-new"));

      // Cleanup
      fs.rmSync(workspace, { recursive: true });
    });

    it("appends to existing audit log", () => {
      const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-audit-"));

      const entry1 = buildAuditEntry({
        audit_id: "audit-1",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        output_or_rejection: "approved",
      });

      const entry2 = buildAuditEntry({
        audit_id: "audit-2",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        output_or_rejection: "approved",
      });

      appendAuditLog(workspace, entry1);
      appendAuditLog(workspace, entry2);

      const logPath = path.join(workspace, "audit-log.md");
      const content = fs.readFileSync(logPath, "utf8");
      assert.ok(content.includes("audit-1"));
      assert.ok(content.includes("audit-2"));
      assert.ok(content.split("---").length >= 3); // Multiple entries separated by hr

      // Cleanup
      fs.rmSync(workspace, { recursive: true });
    });

    it("adds proper separator between entries", () => {
      const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-audit-"));

      const entry1 = buildAuditEntry({
        audit_id: "audit-sep",
        acting_agent: "WatchAgent",
        action_type: "approval.review",
        output_or_rejection: "approved",
      });

      appendAuditLog(workspace, entry1);
      appendAuditLog(workspace, entry1);

      const logPath = path.join(workspace, "audit-log.md");
      const content = fs.readFileSync(logPath, "utf8");

      // Should have at least one separator
      assert.ok(content.includes("---"));

      // Cleanup
      fs.rmSync(workspace, { recursive: true });
    });

    it("handles empty acting_agent gracefully", () => {
      const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-audit-"));

      const entry = buildAuditEntry({
        audit_id: "audit-empty",
        acting_agent: "",
        action_type: "",
        output_or_rejection: "",
      });

      assert.doesNotThrow(() => {
        appendAuditLog(workspace, entry);
      });

      // Cleanup
      fs.rmSync(workspace, { recursive: true });
    });
  });
});
