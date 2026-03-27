export const PLUGIN_ID = "jinyiwei";

export const DEFAULT_BOSS_TITLE = "Boss";
export const DEFAULT_WATCH_SELF_TITLE = "锦衣卫";
export const DEFAULT_APPROVAL_MODE = "hybrid";

export const APPROVAL_MODES = ["strict", "graded", "hybrid"];
export const DEFAULT_EXTERNAL_CHANNELS = ["feishu", "telegram"];
export const EXTERNAL_AGENT_NAMES = ["ChatAgent", "WatchAgent"];

export const DISPATCH_PACKET_FIELDS = [
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
  "`fallback_on_reject`",
];

export const APPROVAL_DECISION_FIELDS = [
  "`decision_id`",
  "`packet_id`",
  "`action_type`",
  "`risk_level`",
  "`decision`",
  "`reason`",
  "`required_follow_up`",
  "`reported_to_boss`",
];

export const REJECTION_DECISION_FIELDS = [
  "`decision_id`",
  "`packet_id`",
  "`action_type`",
  "`violation_type`",
  "`risk_level`",
  "`decision`",
  "`reason`",
  "`violated_rule`",
  "`remediation`",
  "`reported_to_boss`",
];

export const AUDIT_ENTRY_FIELDS = [
  "`audit_id`",
  "`packet_id`",
  "`decision_id`",
  "`acting_agent`",
  "`action_type`",
  "`risk_level`",
  "`rationale`",
  "`supervising_decision`",
  "`timestamp`",
  "`output_or_rejection`",
];

export const INTERNAL_RESPONSE_FIELDS = [
  "`packet_id`",
  "`source_agent`",
  "`status`",
  "`handoff_to`",
];

export const INTERNAL_RESPONSE_TEMPLATES = [
  ["UIAgent", "templates/responses/ui-agent-response.md"],
  ["CodeAgent", "templates/responses/code-agent-response.md"],
  ["ReviewAgent", "templates/responses/review-agent-response.md"],
  ["TestAgent", "templates/responses/test-agent-response.md"],
];

export const GOVERNANCE_RULE_FILES = [
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
];

export const GOVERNANCE_TEMPLATE_FILES = [
  "templates/approval-decision.md",
  "templates/dispatch-packet.md",
  "templates/audit-entry.md",
  "templates/rejection-decision.md",
  ...INTERNAL_RESPONSE_TEMPLATES.map(([, path]) => path),
];

export const REQUIRED_GOVERNANCE_FILES = [
  "package.json",
  "openclaw.plugin.json",
  "openclaw-plugin.js",
  "jinyiwei.config.json",
  "bin/jinyiwei.mjs",
  "lib/agent-models.mjs",
  "lib/governance.mjs",
  "lib/paths.mjs",
  "lib/parse-skills.mjs",
  "lib/config.mjs",
  "lib/groups.mjs",
  "lib/openclaw.mjs",
  "lib/governance/contracts.mjs",
  "lib/governance/action-catalog.mjs",
  "lib/governance/documents.mjs",
  "lib/governance/policy.mjs",
  "lib/governance/render.mjs",
  "lib/governance/runtime-registry.mjs",
  "lib/governance/summary.mjs",
  "lib/runtime-documents.mjs",
  "lib/validation.mjs",
  "lib/validators/registry.mjs",
  "skills/jinyiwei-governance/SKILL.md",
  "agents/chat/AGENT.md",
  "agents/watch/AGENT.md",
  ...GOVERNANCE_RULE_FILES,
  ...GOVERNANCE_TEMPLATE_FILES,
  "skills_list.md",
  "manifests/preinstalled-skills.json",
];

export const RULE_REFERENCES = {
  actionCatalog: "rules/action-catalog.md",
  approvalMatrix: "rules/approval-matrix.md",
  dispatch: "rules/dispatch.md",
  channelAccess: "rules/channel-access.md",
  audit: "rules/audit.md",
  rejection: "rules/rejection.md",
  responseContract: "rules/response-contract.md",
  markdownControl: "rules/md-control.md",
};
