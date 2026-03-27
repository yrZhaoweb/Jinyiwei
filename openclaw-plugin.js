import { loadActionCatalog } from "./lib/governance/action-catalog.mjs";
import {
  DEFAULT_APPROVAL_MODE,
  DEFAULT_BOSS_TITLE,
  DEFAULT_WATCH_SELF_TITLE,
  PLUGIN_ID,
} from "./lib/governance/constants.mjs";
import { reviewDispatch } from "./lib/governance/policy.mjs";
import {
  appendAuditLog,
  buildApprovalDecision,
  buildAuditEntry,
  buildDispatchPacket,
  buildRejectionDecision,
} from "./lib/runtime-documents.mjs";
import { loadRuntimeRegistry } from "./lib/governance/runtime-registry.mjs";

export const id = PLUGIN_ID;

/**
 * @param {any} api
 * @returns {{ bossTitle: string, watchSelfTitle: string, approvalMode: string }}
 */
function runtimeConfig(api) {
  const cfg = api.getConfig?.() ?? {};
  return {
    bossTitle: cfg.bossTitle ?? DEFAULT_BOSS_TITLE,
    watchSelfTitle: cfg.watchSelfTitle ?? DEFAULT_WATCH_SELF_TITLE,
    approvalMode: cfg.approvalMode ?? DEFAULT_APPROVAL_MODE,
  };
}

/**
 * @param {any} api
 * @returns {{ workspace: string | undefined, registry: Array<{ id: string, name: string, role: string }> }}
 */
function runtimeState(api) {
  const workspace = api.getWorkspace?.();
  return {
    workspace,
    registry: loadRuntimeRegistry(workspace),
  };
}

/**
 * @param {Record<string, any>} params
 * @param {string} bossTitle
 * @returns {Record<string, string>}
 */
function buildPacket(params, bossTitle) {
  return {
    packet_id: params.packet_id,
    requested_by: bossTitle,
    target_agent: params.target_agent,
    action_type: params.action_type,
    risk_hint: params.risk_hint,
    goal: params.goal,
    scope: params.scope || "N/A",
    inputs: params.inputs || "N/A",
    constraints: params.constraints || "N/A",
    expected_outputs: params.expected_outputs || "N/A",
    approval_route: "WatchAgent",
    audit_requirements: "standard",
    fallback_on_reject: "return to ChatAgent",
  };
}

export default function register(api) {
  const config = runtimeConfig(api);

  api.registerGatewayMethod(`${PLUGIN_ID}.status`, ({ respond }) => {
    const { registry } = runtimeState(api);
    respond(true, {
      id: PLUGIN_ID,
      enabled: true,
      bossTitle: config.bossTitle,
      watchSelfTitle: config.watchSelfTitle,
      approvalMode: config.approvalMode,
      actionCatalogSize: loadActionCatalog().length,
      agents: registry.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        group: agent.group ?? null,
      })),
      message: `Jinyiwei governance is active. Approval mode: ${config.approvalMode}.`,
    });
  });

  api.registerTool({
    name: "jinyiwei_dispatch",
    description: "ChatAgent: create a structured dispatch packet for an internal agent. WatchAgent review is still required before execution.",
    parameters: {
      type: "object",
      properties: {
        packet_id: { type: "string", description: "Unique packet identifier" },
        target_agent: { type: "string", description: "Internal agent to dispatch to" },
        action_type: { type: "string", description: "Action type from the action catalog" },
        risk_hint: { type: "string", enum: ["low", "medium", "high"], description: "Estimated risk level" },
        goal: { type: "string", description: "Primary goal of the request" },
        scope: { type: "string", description: "Scope and boundaries of the work" },
        inputs: { type: "string", description: "Input data or references" },
        constraints: { type: "string", description: "Constraints on execution" },
        expected_outputs: { type: "string", description: "Expected deliverables" },
      },
      required: ["packet_id", "target_agent", "action_type", "risk_hint", "goal"],
    },
    async execute(_id, params) {
      return {
        content: [{
          type: "text",
          text: buildDispatchPacket({
            ...buildPacket(params, config.bossTitle),
            approval_route: "ChatAgent -> WatchAgent -> target_agent",
            audit_requirements: "- log packet_id\n- log action_type\n- log risk level\n- log approval decision",
            fallback_on_reject: "- return rejection reason to ChatAgent",
          }),
        }],
      };
    },
  }, { optional: true });

  api.registerTool({
    name: "jinyiwei_review",
    description: "WatchAgent: review a dispatch packet against the Jinyiwei action catalog, approval matrix, and agent registry.",
    parameters: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "Unique decision identifier" },
        acting_agent: { type: "string", description: "Agent requesting approval", default: "ChatAgent" },
        packet_id: { type: "string", description: "Dispatch packet identifier" },
        target_agent: { type: "string", description: "Target internal agent" },
        action_type: { type: "string", description: "Action type from the action catalog" },
        risk_hint: { type: "string", enum: ["low", "medium", "high"], description: "Risk hinted by ChatAgent" },
        goal: { type: "string", description: "Request goal" },
        scope: { type: "string", description: "Scope and boundaries" },
        inputs: { type: "string", description: "Input data or references" },
        constraints: { type: "string", description: "Execution constraints" },
        expected_outputs: { type: "string", description: "Expected deliverables" },
        has_markdown_support: { type: "boolean", description: "Whether the request cites markdown control files" },
        has_audit_trail: { type: "boolean", description: "Whether the request can be audited" },
      },
      required: ["decision_id", "packet_id", "target_agent", "action_type", "risk_hint", "goal"],
    },
    async execute(_id, params) {
      const { registry } = runtimeState(api);
      const packet = buildPacket(params, config.bossTitle);
      const review = reviewDispatch({
        actingAgent: params.acting_agent || "ChatAgent",
        packet,
        registry,
        hasMarkdownSupport: params.has_markdown_support,
        hasAuditTrail: params.has_audit_trail,
        bossTitle: config.bossTitle,
      });

      if (review.ok) {
        return {
          content: [{
            type: "text",
            text: buildApprovalDecision({
              decision_id: params.decision_id,
              packet_id: packet.packet_id,
              action_type: packet.action_type,
              risk_level: review.riskLevel,
              decision: review.decision,
              reason: review.reason,
              required_follow_up: review.requiredFollowUp,
              reported_to_boss: review.reportedToBoss,
            }),
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: buildRejectionDecision({
            decision_id: params.decision_id,
            packet_id: packet.packet_id,
            action_type: packet.action_type,
            risk_level: review.riskLevel,
            reason: review.reason,
            violation_type: review.violationType,
            violated_rule: review.violatedRule,
            remediation: review.requiredFollowUp,
            reported_to_boss: review.reportedToBoss,
          }),
        }],
      };
    },
  }, { optional: true });

  api.registerTool({
    name: "jinyiwei_approve",
    description: "WatchAgent: emit a manual approval decision that still conforms to the standard approval template.",
    parameters: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "Unique decision identifier" },
        packet_id: { type: "string", description: "The dispatch packet being reviewed" },
        action_type: { type: "string", description: "Action type from the packet" },
        risk_level: { type: "string", enum: ["low", "medium", "high"], description: "Assessed risk level" },
        reason: { type: "string", description: "Rationale for approval" },
        required_follow_up: { type: "string", description: "Any follow-up actions required" },
      },
      required: ["decision_id", "packet_id", "action_type", "risk_level", "reason"],
    },
    async execute(_id, params) {
      return {
        content: [{
          type: "text",
          text: buildApprovalDecision({
            ...params,
            decision: "approve",
            reported_to_boss: params.risk_level === "high" ? "yes" : "no",
          }),
        }],
      };
    },
  }, { optional: true });

  api.registerTool({
    name: "jinyiwei_reject",
    description: "WatchAgent: emit a manual rejection decision that conforms to the standard rejection template.",
    parameters: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "Unique decision identifier" },
        packet_id: { type: "string", description: "The dispatch packet being rejected" },
        action_type: { type: "string", description: "Action type from the packet" },
        risk_level: { type: "string", enum: ["low", "medium", "high"], description: "Assessed risk level" },
        reason: { type: "string", description: "Rationale for rejection" },
        violation_type: { type: "string", description: "Type of rule violated" },
        violated_rule: { type: "string", description: "Specific rule that was violated" },
        remediation: { type: "string", description: "Suggested remediation steps" },
        suggested_alternative: { type: "string", description: "Suggested alternative approach" },
      },
      required: ["decision_id", "packet_id", "action_type", "risk_level", "reason", "violated_rule"],
    },
    async execute(_id, params) {
      return {
        content: [{
          type: "text",
          text: buildRejectionDecision({
            ...params,
            reported_to_boss: "yes",
          }),
        }],
      };
    },
  }, { optional: true });

  api.registerTool({
    name: "jinyiwei_audit",
    description: "Record an audit entry for any governance-relevant action taken by an agent.",
    parameters: {
      type: "object",
      properties: {
        audit_id: { type: "string", description: "Unique audit entry identifier" },
        packet_id: { type: "string", description: "Related dispatch packet" },
        decision_id: { type: "string", description: "Related approval or rejection decision" },
        acting_agent: { type: "string", description: "Agent that performed the action" },
        action_type: { type: "string", description: "Action that was performed" },
        risk_level: { type: "string", enum: ["low", "medium", "high"], description: "Risk level of the action" },
        rationale: { type: "string", description: "Why this action was taken" },
        supervising_decision: { type: "string", description: "approve, reject, or escalate" },
        output_or_rejection: { type: "string", description: "Summary of output or rejection" },
      },
      required: ["audit_id", "acting_agent", "action_type", "output_or_rejection"],
    },
    async execute(_id, params) {
      const entry = buildAuditEntry({
        ...params,
        packet_id: params.packet_id || "N/A",
        decision_id: params.decision_id || "N/A",
        risk_level: params.risk_level || "N/A",
        rationale: params.rationale || "N/A",
        supervising_decision: params.supervising_decision || "N/A",
      });
      const { workspace } = runtimeState(api);

      if (workspace) {
        try {
          appendAuditLog(workspace, entry);
        } catch {
          // Best-effort persistence.
        }
      }

      return {
        content: [{
          type: "text",
          text: entry,
        }],
      };
    },
  }, { optional: true });
}
