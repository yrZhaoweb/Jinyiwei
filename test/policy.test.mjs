import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadActionCatalog } from "../lib/governance/action-catalog.mjs";
import { reviewDispatch } from "../lib/governance/policy.mjs";

describe("governance policy", () => {
  it("loads action catalog rows from markdown", () => {
    const catalog = loadActionCatalog();
    assert.ok(catalog.length > 0);
    assert.ok(catalog.some((entry) => entry.actionType === "dispatch.send_to_internal_agent"));
  });

  it("approves a valid internal dispatch", () => {
    const review = reviewDispatch({
      actingAgent: "ChatAgent",
      registry: [
        { name: "ChatAgent", role: "external" },
        { name: "WatchAgent", role: "external" },
        { name: "CodeAgent", role: "internal" },
      ],
      packet: {
        packet_id: "pkt-1",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Implement an approved change",
        scope: "Single file change",
        inputs: "N/A",
        constraints: "Keep behavior stable",
        expected_outputs: "Patch",
        approval_route: "WatchAgent",
        audit_requirements: "standard",
        fallback_on_reject: "return to ChatAgent",
      },
    });

    assert.strictEqual(review.ok, true);
    assert.strictEqual(review.decision, "approve");
    assert.strictEqual(review.riskLevel, "low");
  });

  it("rejects unknown action types", () => {
    const review = reviewDispatch({
      actingAgent: "ChatAgent",
      registry: [
        { name: "ChatAgent", role: "external" },
        { name: "CodeAgent", role: "internal" },
      ],
      packet: {
        packet_id: "pkt-2",
        requested_by: "Boss",
        target_agent: "CodeAgent",
        action_type: "unknown.action",
        risk_hint: "low",
        goal: "Unknown request",
        scope: "N/A",
        inputs: "N/A",
        constraints: "N/A",
        expected_outputs: "N/A",
        approval_route: "WatchAgent",
        audit_requirements: "standard",
        fallback_on_reject: "return to ChatAgent",
      },
    });

    assert.strictEqual(review.ok, false);
    assert.strictEqual(review.violatedRule, "rules/action-catalog.md");
  });

  it("rejects dispatches to external agents", () => {
    const review = reviewDispatch({
      actingAgent: "ChatAgent",
      registry: [
        { name: "ChatAgent", role: "external" },
        { name: "WatchAgent", role: "external" },
      ],
      packet: {
        packet_id: "pkt-3",
        requested_by: "Boss",
        target_agent: "WatchAgent",
        action_type: "dispatch.send_to_internal_agent",
        risk_hint: "low",
        goal: "Bypass internal boundary",
        scope: "N/A",
        inputs: "N/A",
        constraints: "N/A",
        expected_outputs: "N/A",
        approval_route: "WatchAgent",
        audit_requirements: "standard",
        fallback_on_reject: "return to ChatAgent",
      },
    });

    assert.strictEqual(review.ok, false);
    assert.strictEqual(review.violatedRule, "rules/channel-access.md");
  });
});
