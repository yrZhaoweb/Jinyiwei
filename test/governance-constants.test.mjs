import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PLUGIN_ID,
  PLUGIN_NAME,
  DEFAULT_BOSS_TITLE,
  DEFAULT_WATCH_SELF_TITLE,
  DEFAULT_APPROVAL_MODE,
  DEFAULT_EXTERNAL_CHANNELS,
  EXTERNAL_AGENT_IDS,
  EXTERNAL_AGENT_NAMES,
  ALLOWED_EXTERNAL_AGENTS,
  VALID_APPROVAL_MODES,
  VALID_RISK_LEVELS,
  DISPATCH_REQUIRED_FIELDS,
  APPROVAL_REQUIRED_FIELDS,
  REJECTION_REQUIRED_FIELDS,
  AUDIT_REQUIRED_FIELDS,
  INTERNAL_RESPONSE_TEMPLATES,
  EXTERNAL_AGENT_DEFINITIONS,
  REQUIRED_RULE_FILES,
  REQUIRED_TEMPLATE_FILES,
  defaultGovernanceConfig,
} from "../lib/governance/constants.mjs";

describe("governance constants", () => {
  it("PLUGIN_ID is 'jinyiwei'", () => {
    assert.strictEqual(PLUGIN_ID, "jinyiwei");
  });

  it("PLUGIN_NAME is 'Jinyiwei'", () => {
    assert.strictEqual(PLUGIN_NAME, "Jinyiwei");
  });

  it("DEFAULT_BOSS_TITLE is 'Boss'", () => {
    assert.strictEqual(DEFAULT_BOSS_TITLE, "Boss");
  });

  it("DEFAULT_WATCH_SELF_TITLE is '锦衣卫'", () => {
    assert.strictEqual(DEFAULT_WATCH_SELF_TITLE, "锦衣卫");
  });

  it("DEFAULT_APPROVAL_MODE is 'hybrid'", () => {
    assert.strictEqual(DEFAULT_APPROVAL_MODE, "hybrid");
  });

  it("DEFAULT_EXTERNAL_CHANNELS is ['feishu', 'telegram']", () => {
    assert.deepStrictEqual(DEFAULT_EXTERNAL_CHANNELS, ["feishu", "telegram"]);
  });

  it("EXTERNAL_AGENT_IDS is ['chat', 'watch']", () => {
    assert.deepStrictEqual(EXTERNAL_AGENT_IDS, ["chat", "watch"]);
  });

  it("EXTERNAL_AGENT_NAMES is ['ChatAgent', 'WatchAgent']", () => {
    assert.deepStrictEqual(EXTERNAL_AGENT_NAMES, ["ChatAgent", "WatchAgent"]);
  });

  it("ALLOWED_EXTERNAL_AGENTS equals EXTERNAL_AGENT_NAMES", () => {
    assert.deepStrictEqual(ALLOWED_EXTERNAL_AGENTS, EXTERNAL_AGENT_NAMES);
  });

  it("VALID_APPROVAL_MODES contains strict, graded, hybrid", () => {
    assert.deepStrictEqual(VALID_APPROVAL_MODES, ["strict", "graded", "hybrid"]);
  });

  it("VALID_RISK_LEVELS contains low, medium, high", () => {
    assert.deepStrictEqual(VALID_RISK_LEVELS, ["low", "medium", "high"]);
  });
});

describe("dispatch required fields", () => {
  it("DISPATCH_REQUIRED_FIELDS is an array of field names", () => {
    assert.ok(Array.isArray(DISPATCH_REQUIRED_FIELDS));
    assert.ok(DISPATCH_REQUIRED_FIELDS.length > 0);
  });

  it("includes packet_id", () => {
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("packet_id"));
  });

  it("includes target_agent and action_type", () => {
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("target_agent"));
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("action_type"));
  });

  it("includes goal and scope", () => {
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("goal"));
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("scope"));
  });

  it("includes risk_hint", () => {
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("risk_hint"));
  });

  it("includes approval_route and audit_requirements", () => {
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("approval_route"));
    assert.ok(DISPATCH_REQUIRED_FIELDS.includes("audit_requirements"));
  });
});

describe("approval required fields", () => {
  it("APPROVAL_REQUIRED_FIELDS is an array", () => {
    assert.ok(Array.isArray(APPROVAL_REQUIRED_FIELDS));
  });

  it("includes decision_id and packet_id", () => {
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("decision_id"));
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("packet_id"));
  });

  it("includes action_type, risk_level, and decision", () => {
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("action_type"));
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("risk_level"));
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("decision"));
  });

  it("includes reason and required_follow_up", () => {
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("reason"));
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("required_follow_up"));
  });

  it("includes reported_to_boss", () => {
    assert.ok(APPROVAL_REQUIRED_FIELDS.includes("reported_to_boss"));
  });
});

describe("rejection required fields", () => {
  it("REJECTION_REQUIRED_FIELDS is an array", () => {
    assert.ok(Array.isArray(REJECTION_REQUIRED_FIELDS));
    assert.ok(REJECTION_REQUIRED_FIELDS.length > APPROVAL_REQUIRED_FIELDS.length);
  });

  it("includes violation_type and violated_rule", () => {
    assert.ok(REJECTION_REQUIRED_FIELDS.includes("violation_type"));
    assert.ok(REJECTION_REQUIRED_FIELDS.includes("violated_rule"));
  });

  it("includes remediation and suggested_alternative", () => {
    assert.ok(REJECTION_REQUIRED_FIELDS.includes("remediation"));
    assert.ok(REJECTION_REQUIRED_FIELDS.includes("suggested_alternative"));
  });
});

describe("audit required fields", () => {
  it("AUDIT_REQUIRED_FIELDS is an array", () => {
    assert.ok(Array.isArray(AUDIT_REQUIRED_FIELDS));
  });

  it("includes audit_id", () => {
    assert.ok(AUDIT_REQUIRED_FIELDS.includes("audit_id"));
  });

  it("includes acting_agent and action_type", () => {
    assert.ok(AUDIT_REQUIRED_FIELDS.includes("acting_agent"));
    assert.ok(AUDIT_REQUIRED_FIELDS.includes("action_type"));
  });

  it("includes output_or_rejection and timestamp", () => {
    assert.ok(AUDIT_REQUIRED_FIELDS.includes("output_or_rejection"));
    assert.ok(AUDIT_REQUIRED_FIELDS.includes("timestamp"));
  });
});

describe("internal response templates", () => {
  it("INTERNAL_RESPONSE_TEMPLATES is an object", () => {
    assert.ok(typeof INTERNAL_RESPONSE_TEMPLATES === "object");
  });

  it("has entries for UIAgent, CodeAgent, ReviewAgent, TestAgent", () => {
    assert.ok("UIAgent" in INTERNAL_RESPONSE_TEMPLATES);
    assert.ok("CodeAgent" in INTERNAL_RESPONSE_TEMPLATES);
    assert.ok("ReviewAgent" in INTERNAL_RESPONSE_TEMPLATES);
    assert.ok("TestAgent" in INTERNAL_RESPONSE_TEMPLATES);
  });

  it("each template path starts with templates/responses/", () => {
    for (const [, templatePath] of Object.entries(INTERNAL_RESPONSE_TEMPLATES)) {
      assert.ok(templatePath.startsWith("templates/responses/"), `${templatePath} should start with templates/responses/`);
      assert.ok(templatePath.endsWith(".md"), `${templatePath} should end with .md`);
    }
  });
});

describe("external agent definitions", () => {
  it("EXTERNAL_AGENT_DEFINITIONS is an array", () => {
    assert.ok(Array.isArray(EXTERNAL_AGENT_DEFINITIONS));
  });

  it("has entries for chat and watch", () => {
    assert.strictEqual(EXTERNAL_AGENT_DEFINITIONS.length, 2);
  });

  it("chat agent has correct structure", () => {
    const chat = EXTERNAL_AGENT_DEFINITIONS.find((a) => a.id === "chat");
    assert.ok(chat !== undefined);
    assert.strictEqual(chat.name, "ChatAgent");
    assert.strictEqual(chat.role, "external");
    assert.ok(chat.charterPath.includes("agents/chat/"));
  });

  it("watch agent has correct structure", () => {
    const watch = EXTERNAL_AGENT_DEFINITIONS.find((a) => a.id === "watch");
    assert.ok(watch !== undefined);
    assert.strictEqual(watch.name, "WatchAgent");
    assert.strictEqual(watch.role, "external");
    assert.ok(watch.charterPath.includes("agents/watch/"));
  });
});

describe("required governance files", () => {
  it("REQUIRED_RULE_FILES is an array", () => {
    assert.ok(Array.isArray(REQUIRED_RULE_FILES));
    assert.ok(REQUIRED_RULE_FILES.length > 0);
  });

  it("all rule files start with rules/", () => {
    for (const file of REQUIRED_RULE_FILES) {
      assert.ok(file.startsWith("rules/"), `${file} should start with rules/`);
      assert.ok(file.endsWith(".md"), `${file} should end with .md`);
    }
  });

  it("includes addressing, action-catalog, approval-matrix rules", () => {
    assert.ok(REQUIRED_RULE_FILES.includes("rules/addressing.md"));
    assert.ok(REQUIRED_RULE_FILES.includes("rules/action-catalog.md"));
    assert.ok(REQUIRED_RULE_FILES.includes("rules/approval-matrix.md"));
  });

  it("REQUIRED_TEMPLATE_FILES is an array", () => {
    assert.ok(Array.isArray(REQUIRED_TEMPLATE_FILES));
    assert.ok(REQUIRED_TEMPLATE_FILES.length > 0);
  });

  it("all template files start with templates/", () => {
    for (const file of REQUIRED_TEMPLATE_FILES) {
      assert.ok(file.startsWith("templates/"), `${file} should start with templates/`);
      assert.ok(file.endsWith(".md"), `${file} should end with .md`);
    }
  });

  it("includes dispatch-packet and approval-decision templates", () => {
    assert.ok(REQUIRED_TEMPLATE_FILES.includes("templates/dispatch-packet.md"));
    assert.ok(REQUIRED_TEMPLATE_FILES.includes("templates/approval-decision.md"));
    assert.ok(REQUIRED_TEMPLATE_FILES.includes("templates/audit-entry.md"));
    assert.ok(REQUIRED_TEMPLATE_FILES.includes("templates/rejection-decision.md"));
  });
});

describe("defaultGovernanceConfig", () => {
  it("returns an object", () => {
    const config = defaultGovernanceConfig();
    assert.ok(typeof config === "object");
  });

  it("has correct bossTitle", () => {
    const config = defaultGovernanceConfig();
    assert.strictEqual(config.bossTitle, DEFAULT_BOSS_TITLE);
  });

  it("has correct watchSelfTitle", () => {
    const config = defaultGovernanceConfig();
    assert.strictEqual(config.watchSelfTitle, DEFAULT_WATCH_SELF_TITLE);
  });

  it("has correct approvalMode", () => {
    const config = defaultGovernanceConfig();
    assert.strictEqual(config.approvalMode, DEFAULT_APPROVAL_MODE);
  });

  it("has models object with chat, watch, and groups", () => {
    const config = defaultGovernanceConfig();
    assert.ok(typeof config.models === "object");
    assert.ok(typeof config.models.chat === "string");
    assert.ok(typeof config.models.watch === "string");
    assert.ok(typeof config.models.groups === "object");
  });

  it("chat and watch models are empty strings by default", () => {
    const config = defaultGovernanceConfig();
    assert.strictEqual(config.models.chat, "");
    assert.strictEqual(config.models.watch, "");
  });

  it("groups object is empty by default", () => {
    const config = defaultGovernanceConfig();
    assert.deepStrictEqual(config.models.groups, {});
  });

  it("has correct externalChannels", () => {
    const config = defaultGovernanceConfig();
    assert.deepStrictEqual(config.externalChannels, DEFAULT_EXTERNAL_CHANNELS);
  });

  it("externalChannels is a copy, not a reference", () => {
    const config = defaultGovernanceConfig();
    config.externalChannels.push("extra");
    assert.deepStrictEqual(DEFAULT_EXTERNAL_CHANNELS, ["feishu", "telegram"]);
  });
});
