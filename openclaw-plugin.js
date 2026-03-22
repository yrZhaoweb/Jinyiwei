const PLUGIN_ID = "jinyiwei";

export const id = PLUGIN_ID;

export default function register(api) {
  const cfg = api.getConfig?.() ?? {};

  const bossTitle = cfg.bossTitle ?? "Boss";
  const watchSelfTitle = cfg.watchSelfTitle ?? "锦衣卫";
  const approvalMode = cfg.approvalMode ?? "hybrid";

  // Status gateway
  api.registerGatewayMethod(`${PLUGIN_ID}.status`, ({ respond }) => {
    respond(true, {
      id: PLUGIN_ID,
      enabled: true,
      bossTitle,
      watchSelfTitle,
      approvalMode,
      message: `Jinyiwei governance is active. Approval mode: ${approvalMode}.`,
    });
  });

  // Governance tools
  api.registerTool({
    name: "jinyiwei_dispatch",
    description: "ChatAgent: create a structured dispatch packet to request work from an internal agent. Must be reviewed by WatchAgent before execution.",
    parameters: {
      type: "object",
      properties: {
        packet_id: { type: "string", description: "Unique packet identifier" },
        target_agent: { type: "string", description: "Internal agent to dispatch to (e.g. CodeAgent, UIAgent)" },
        action_type: { type: "string", description: "Action type from action-catalog" },
        risk_hint: { type: "string", enum: ["low", "medium", "high"], description: "Estimated risk level" },
        goal: { type: "string", description: "What the dispatch should accomplish" },
        scope: { type: "string", description: "Scope and boundaries of the work" },
        inputs: { type: "string", description: "Input data or references" },
        constraints: { type: "string", description: "Any constraints on execution" },
        expected_outputs: { type: "string", description: "Expected deliverables" },
      },
      required: ["packet_id", "target_agent", "action_type", "risk_hint", "goal"],
    },
    async execute(_id, params) {
      const packet = [
        "## Dispatch Packet",
        "",
        `- **packet_id**: ${params.packet_id}`,
        `- **requested_by**: ChatAgent`,
        `- **target_agent**: ${params.target_agent}`,
        `- **action_type**: ${params.action_type}`,
        `- **risk_hint**: ${params.risk_hint}`,
        `- **goal**: ${params.goal}`,
        `- **scope**: ${params.scope || "N/A"}`,
        `- **inputs**: ${params.inputs || "N/A"}`,
        `- **constraints**: ${params.constraints || "N/A"}`,
        `- **expected_outputs**: ${params.expected_outputs || "N/A"}`,
        `- **approval_route**: WatchAgent`,
        `- **audit_requirements**: standard`,
        `- **fallback_on_reject**: return to ChatAgent`,
      ].join("\n");
      return { content: [{ type: "text", text: packet }] };
    },
  }, { optional: true });

  api.registerTool({
    name: "jinyiwei_approve",
    description: "WatchAgent: approve a dispatch packet after reviewing risk level and compliance with governance rules.",
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
      const decision = [
        "## Approval Decision",
        "",
        `- **decision_id**: ${params.decision_id}`,
        `- **packet_id**: ${params.packet_id}`,
        `- **action_type**: ${params.action_type}`,
        `- **risk_level**: ${params.risk_level}`,
        `- **decision**: APPROVED`,
        `- **reason**: ${params.reason}`,
        `- **required_follow_up**: ${params.required_follow_up || "none"}`,
        `- **reported_to_boss**: ${params.risk_level === "high" ? "yes" : "no"}`,
      ].join("\n");
      return { content: [{ type: "text", text: decision }] };
    },
  }, { optional: true });

  api.registerTool({
    name: "jinyiwei_reject",
    description: "WatchAgent: reject a dispatch packet that violates governance rules or exceeds risk tolerance.",
    parameters: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "Unique decision identifier" },
        packet_id: { type: "string", description: "The dispatch packet being rejected" },
        action_type: { type: "string", description: "Action type from the packet" },
        reason: { type: "string", description: "Rationale for rejection" },
        violation_type: { type: "string", description: "Type of rule violated" },
        suggested_alternative: { type: "string", description: "Suggested alternative approach" },
      },
      required: ["decision_id", "packet_id", "action_type", "reason"],
    },
    async execute(_id, params) {
      const decision = [
        "## Rejection Decision",
        "",
        `- **decision_id**: ${params.decision_id}`,
        `- **packet_id**: ${params.packet_id}`,
        `- **action_type**: ${params.action_type}`,
        `- **decision**: REJECTED`,
        `- **reason**: ${params.reason}`,
        `- **violation_type**: ${params.violation_type || "N/A"}`,
        `- **suggested_alternative**: ${params.suggested_alternative || "N/A"}`,
        `- **reported_to_boss**: yes`,
      ].join("\n");
      return { content: [{ type: "text", text: decision }] };
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
        agent: { type: "string", description: "Agent that performed the action" },
        action_type: { type: "string", description: "Action that was performed" },
        decision: { type: "string", description: "Approval decision reference" },
        outcome: { type: "string", description: "Result of the action" },
        anomalies: { type: "string", description: "Any anomalies detected" },
      },
      required: ["audit_id", "agent", "action_type", "outcome"],
    },
    async execute(_id, params) {
      const entry = [
        "## Audit Entry",
        "",
        `- **audit_id**: ${params.audit_id}`,
        `- **packet_id**: ${params.packet_id || "N/A"}`,
        `- **agent**: ${params.agent}`,
        `- **action_type**: ${params.action_type}`,
        `- **decision**: ${params.decision || "N/A"}`,
        `- **outcome**: ${params.outcome}`,
        `- **anomalies**: ${params.anomalies || "none"}`,
        `- **timestamp**: ${new Date().toISOString()}`,
      ].join("\n");
      return { content: [{ type: "text", text: entry }] };
    },
  }, { optional: true });
}
