export const PLUGIN_ID = "jinyiwei";
export const PLUGIN_NAME = "Jinyiwei";

export const DEFAULT_BOSS_TITLE = "Boss";
export const DEFAULT_WATCH_SELF_TITLE = "WatchAgent";
export const DEFAULT_CHAT_AGENT_NAME = "ChatAgent";
export const DEFAULT_WATCH_AGENT_NAME = "WatchAgent";
export const DEFAULT_APPROVAL_MODE = "hybrid";
export const DEFAULT_EXTERNAL_CHANNELS = ["feishu", "telegram"];

export const EXTERNAL_AGENT_IDS = ["chat", "watch"];
export const EXTERNAL_AGENT_NAMES = ["ChatAgent", "WatchAgent"];
export const ALLOWED_EXTERNAL_AGENTS = ["ChatAgent", "WatchAgent"];

export const VALID_APPROVAL_MODES = ["strict", "graded", "hybrid"];
export const VALID_RISK_LEVELS = ["low", "medium", "high"];

export const DISPATCH_REQUIRED_FIELDS = [
  "packet_id",
  "requested_by",
  "target_agent",
  "action_type",
  "risk_hint",
  "goal",
  "scope",
  "inputs",
  "constraints",
  "expected_outputs",
  "approval_route",
  "audit_requirements",
  "fallback_on_reject",
];

export const APPROVAL_REQUIRED_FIELDS = [
  "decision_id",
  "packet_id",
  "action_type",
  "risk_level",
  "decision",
  "reason",
  "required_follow_up",
  "reported_to_boss",
];

export const REJECTION_REQUIRED_FIELDS = [
  "decision_id",
  "packet_id",
  "action_type",
  "risk_level",
  "decision",
  "reason",
  "violation_type",
  "violated_rule",
  "remediation",
  "suggested_alternative",
  "reported_to_boss",
];

export const AUDIT_REQUIRED_FIELDS = [
  "audit_id",
  "packet_id",
  "decision_id",
  "acting_agent",
  "action_type",
  "risk_level",
  "rationale",
  "supervising_decision",
  "output_or_rejection",
  "timestamp",
];

export const INTERNAL_RESPONSE_TEMPLATES = Object.freeze({
  UIAgent: "templates/responses/ui-agent-response.md",
  CodeAgent: "templates/responses/code-agent-response.md",
  ReviewAgent: "templates/responses/review-agent-response.md",
  TestAgent: "templates/responses/test-agent-response.md",
});

export const INTERNAL_RESPONSE_TEMPLATE_ENTRIES = Object.entries(INTERNAL_RESPONSE_TEMPLATES);

export const EXTERNAL_AGENT_DEFINITIONS = Object.freeze([
  { id: "chat", name: "ChatAgent", role: "external", charterPath: "agents/chat/AGENT.md" },
  { id: "watch", name: "WatchAgent", role: "external", charterPath: "agents/watch/AGENT.md" },
]);

export const REQUIRED_RULE_FILES = Object.freeze([
  "rules/addressing.md",
  "rules/action-catalog.md",
  "rules/approval-matrix.md",
  "rules/channel-access.md",
  "rules/md-control.md",
  "rules/response-contract.md",
  "rules/dispatch.md",
  "rules/audit.md",
  "rules/rejection.md",
  "rules/preinstalled-skills.md",
]);

export const REQUIRED_TEMPLATE_FILES = Object.freeze([
  "templates/approval-decision.md",
  "templates/dispatch-packet.md",
  "templates/audit-entry.md",
  "templates/rejection-decision.md",
  ...INTERNAL_RESPONSE_TEMPLATE_ENTRIES.map(([, templatePath]) => templatePath),
]);

export function defaultGovernanceConfig() {
  return {
    bossTitle: DEFAULT_BOSS_TITLE,
    watchSelfTitle: DEFAULT_WATCH_SELF_TITLE,
    chatAgentName: DEFAULT_CHAT_AGENT_NAME,
    watchAgentName: DEFAULT_WATCH_AGENT_NAME,
    approvalMode: DEFAULT_APPROVAL_MODE,
    models: {
      chat: "",
      watch: "",
      groups: {},
    },
    externalChannels: [...DEFAULT_EXTERNAL_CHANNELS],
  };
}
