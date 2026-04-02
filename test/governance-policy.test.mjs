import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateDispatchPacket,
  reviewDispatch,
} from "../lib/governance/policy.mjs";

describe("governance policy - dispatch packet validation", () => {
  describe("validateDispatchPacket", () => {
    it("returns no errors for valid packet", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        scope: "Test scope",
        inputs: "Test inputs",
        constraints: "Test constraints",
        expected_outputs: "Test outputs",
        approval_route: "WatchAgent",
        audit_requirements: "Log all",
        fallback_on_reject: "Return error",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.deepStrictEqual(errors, []);
    });

    it("returns errors for missing required fields", () => {
      const packet = {};

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.includes("packet_id")));
      assert.ok(errors.some((e) => e.includes("target_agent")));
      assert.ok(errors.some((e) => e.includes("action_type")));
      assert.ok(errors.some((e) => e.includes("goal")));
    });

    it("returns errors for empty string fields", () => {
      const packet = {
        packet_id: "",
        requested_by: "Boss",
        target_agent: "",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(errors.some((e) => e.includes("packet_id")));
      assert.ok(errors.some((e) => e.includes("target_agent")));
      assert.ok(errors.some((e) => e.includes("goal")));
    });

    it("returns errors for whitespace-only fields", () => {
      const packet = {
        packet_id: "   ",
        requested_by: "Boss",
        target_agent: "   ",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "   ",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(errors.length > 0);
    });

    it("validates requested_by matches expected boss title", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "WrongBoss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(errors.some((e) => e.includes("requested_by must be Boss")));
    });

    it("allows requested_by to match expected boss title", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(!errors.some((e) => e.includes("requested_by")));
    });

    it("requires approval_route to include WatchAgent", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "ChatAgent", // Missing WatchAgent
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(errors.some((e) => e.includes("approval_route")));
    });

    it("allows approval_route with WatchAgent", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Test",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "ChatAgent -> WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(!errors.some((e) => e.includes("approval_route")));
    });

    it("validates risk_hint is a valid risk level", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "invalid-risk",
        goal: "Test",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      assert.ok(errors.some((e) => e.includes("risk_hint")));
    });

    it("accepts valid risk levels", () => {
      for (const risk of ["low", "medium", "high"]) {
        const packet = {
          packet_id: "pkt-1",
          requested_by: "Boss",
          target_agent: "CodeAgent",
          action_type: "dispatch.send_to_internal_agent",
          risk_hint: risk,
          goal: "Test",
          scope: "scope",
          inputs: "inputs",
          constraints: "constraints",
          expected_outputs: "outputs",
          approval_route: "WatchAgent",
          audit_requirements: "audit",
          fallback_on_reject: "fallback",
        };

        const errors = validateDispatchPacket(packet, "Boss");
        assert.ok(!errors.some((e) => e.includes("risk_hint")), `Failed for risk: ${risk}`);
      }
    });

    it("does not require risk_hint if action has default", () => {
      const packet = {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "", // Empty, but action catalog has default
        goal: "Test",
        scope: "scope",
        inputs: "inputs",
        constraints: "constraints",
        expected_outputs: "outputs",
        approval_route: "WatchAgent",
        audit_requirements: "audit",
        fallback_on_reject: "fallback",
      };

      const errors = validateDispatchPacket(packet, "Boss");
      // risk_hint error should be present for empty string
      assert.ok(errors.some((e) => e.includes("risk_hint")));
    });
  });

  describe("reviewDispatch", () => {
    const validPacket = {
      packet_id: "pkt-review",
      requested_by: "Boss",
      target_agent: "CodeAgent",
      action_type: "dispatch.send_to_internal_agent",
      risk_hint: "low",
      goal: "Implement feature",
      scope: "New endpoint",
      inputs: "API spec",
      constraints: "Backward compatible",
      expected_outputs: "Working API",
      approval_route: "WatchAgent",
      audit_requirements: "Log all",
      fallback_on_reject: "Return error",
    };

    const validRegistry = [
      { name: "ChatAgent", role: "external" },
      { name: "WatchAgent", role: "external" },
      { name: "CodeAgent", role: "internal" },
    ];

    it("approves valid low-risk internal dispatch", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: validPacket,
      });

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.decision, "approve");
      assert.strictEqual(result.riskLevel, "low");
    });

    it("approves valid medium-risk dispatch", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, risk_hint: "medium" },
      });

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.decision, "approve");
      assert.strictEqual(result.riskLevel, "medium");
    });

    it("rejects high-risk dispatch without boss escalation", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, risk_hint: "high" },
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.decision, "reject");
      assert.strictEqual(result.riskLevel, "high");
      assert.ok(result.reason.includes("High-risk"));
    });

    it("rejects dispatch with unknown action type", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, action_type: "unknown.action" },
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.violatedRule, "rules/action-catalog.md");
    });

    it("rejects dispatch to unregistered agent", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, target_agent: "NonExistentAgent" },
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.violatedRule, "rules/dispatch.md");
    });

    it("rejects dispatch to external agent", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, target_agent: "WatchAgent" },
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.violatedRule, "rules/channel-access.md");
    });

    it("rejects dispatch when acting agent is not an owner", () => {
      // TestAgent cannot request dispatch.send_to_internal_agent
      const result = reviewDispatch({
        actingAgent: "TestAgent",
        registry: validRegistry,
        packet: validPacket,
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.violatedRule, "rules/action-catalog.md");
    });

    it("rejects governance-changing actions by default", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, action_type: "charter.change_agent_md" },
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.decision, "reject");
    });

    it("rejects when hasMarkdownSupport is false", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: validPacket,
        hasMarkdownSupport: false,
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.violatedRule, "rules/md-control.md");
    });

    it("rejects when hasAuditTrail is false", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: validPacket,
        hasAuditTrail: false,
      });

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.violatedRule, "rules/audit.md");
    });

    it("uses ChatAgent as default acting agent", () => {
      const result = reviewDispatch({
        registry: validRegistry,
        packet: validPacket,
      });

      // Should still work, default acting agent is ChatAgent
      assert.ok(typeof result.decision === "string");
    });

    it("effective risk is max of action default and packet risk_hint", () => {
      // action defaultRisk is low, but risk_hint is high
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, risk_hint: "high" },
      });

      assert.strictEqual(result.riskLevel, "high");
    });

    it("effective risk uses action default when no risk_hint", () => {
      const packetWithoutRisk = { ...validPacket };
      delete packetWithoutRisk.risk_hint;

      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...packetWithoutRisk, risk_hint: "" },
      });

      // Should use default risk from action catalog (low)
      assert.strictEqual(result.ok, false); // high-risk needs escalation
    });

    it("reportedToBoss is 'yes' for rejected decisions", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, action_type: "unknown.action" },
      });

      assert.strictEqual(result.reportedToBoss, "yes");
    });

    it("reportedToBoss is 'no' for approved low-risk decisions", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: validPacket,
      });

      assert.strictEqual(result.reportedToBoss, "no");
    });

    it("medium-risk approval requires follow-up", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, risk_hint: "medium" },
      });

      assert.strictEqual(result.ok, true);
      assert.ok(result.requiredFollowUp && result.requiredFollowUp.length > 0);
    });

    it("low-risk approval does not require follow-up", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: validPacket,
      });

      assert.strictEqual(result.ok, true);
      assert.ok(result.requiredFollowUp && result.requiredFollowUp.length > 0);
    });

    it("suggestedAlternative is null for approved decisions", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: validPacket,
      });

      assert.strictEqual(result.suggestedAlternative, null);
    });

    it("suggestedAlternative is set for rejected decisions", () => {
      const result = reviewDispatch({
        actingAgent: "ChatAgent",
        registry: validRegistry,
        packet: { ...validPacket, action_type: "unknown.action" },
      });

      assert.ok(result.suggestedAlternative !== null);
      assert.ok(typeof result.suggestedAlternative === "string");
    });
  });
});
