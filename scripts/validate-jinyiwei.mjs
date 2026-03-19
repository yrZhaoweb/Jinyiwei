import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "package.json",
  "openclaw.plugin.json",
  "openclaw-plugin.js",
  "skills/jinyiwei-governance/SKILL.md",
  "agents/chat/AGENT.md",
  "agents/watch/AGENT.md",
  "agents/code/AGENT.md",
  "agents/review/AGENT.md",
  "agents/test/AGENT.md",
  "agents/ui/AGENT.md",
  "rules/addressing.md",
  "rules/action-catalog.md",
  "rules/approval-matrix.md",
  "rules/channel-access.md",
  "rules/md-control.md",
  "rules/dispatch.md",
  "rules/audit.md",
  "rules/rejection.md",
  "rules/preinstalled-skills.md",
  "templates/dispatch-packet.md",
  "skills_list.md",
  "manifests/preinstalled-skills.json"
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseSkillsList(markdown) {
  const skills = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || line.startsWith("|------")) {
      continue;
    }
    const parts = line
      .slice(1, -1)
      .split("|")
      .map((part) => part.trim());
    if (parts.length < 2) {
      continue;
    }
    const skill = parts[0];
    if (["技能", "类别", "**总计**"].includes(skill)) {
      continue;
    }
    if (/^[A-Za-z0-9_-]+$/.test(skill) && !skills.includes(skill)) {
      skills.push(skill);
    }
  }
  return skills;
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

const errors = [];
const manifest = readJson("manifests/preinstalled-skills.json");
const skillsFromList = parseSkillsList(readText("skills_list.md"));
const plugin = readJson("openclaw.plugin.json");
const governanceSkill = readText("skills/jinyiwei-governance/SKILL.md");
const chatCharter = readText("agents/chat/AGENT.md");
const watchCharter = readText("agents/watch/AGENT.md");
const internalCharters = [
  readText("agents/code/AGENT.md"),
  readText("agents/review/AGENT.md"),
  readText("agents/test/AGENT.md"),
  readText("agents/ui/AGENT.md")
];
const addressingRule = readText("rules/addressing.md");
const actionCatalogRule = readText("rules/action-catalog.md");
const approvalMatrixRule = readText("rules/approval-matrix.md");
const channelRule = readText("rules/channel-access.md");
const dispatchRule = readText("rules/dispatch.md");
const dispatchTemplate = readText("templates/dispatch-packet.md");

assert(Array.isArray(manifest.skills) && manifest.skills.length > 0, "preinstalled-skills.json has no skills", errors);
assert(
  JSON.stringify(manifest.skills) === JSON.stringify(skillsFromList),
  "skills_list.md and manifests/preinstalled-skills.json are out of sync",
  errors
);
assert(plugin.configSchema?.properties?.bossTitle?.default === "Boss", "plugin bossTitle default must be Boss", errors);
assert(plugin.configSchema?.properties?.watchSelfTitle?.default === "锦衣卫", "plugin watchSelfTitle default must be 锦衣卫", errors);
assert(plugin.configSchema?.properties?.approvalMode?.default === "hybrid", "plugin approvalMode default must be hybrid", errors);
assert(
  JSON.stringify(plugin.configSchema?.properties?.externalIngressAgents?.default) === JSON.stringify(["ChatAgent", "WatchAgent"]),
  "plugin externalIngressAgents default must be [ChatAgent, WatchAgent]",
  errors
);
assert(
  JSON.stringify(plugin.configSchema?.properties?.externalChannels?.default) === JSON.stringify(["feishu", "telegram"]),
  "plugin externalChannels default must be [feishu, telegram]",
  errors
);
assert(governanceSkill.includes("`Boss`"), "governance skill must require Boss addressing", errors);
assert(governanceSkill.includes("`锦衣卫`"), "governance skill must require 锦衣卫 self-title", errors);
assert(governanceSkill.includes("rules/addressing.md"), "governance skill must load rules/addressing.md", errors);
assert(governanceSkill.includes("rules/action-catalog.md"), "governance skill must load rules/action-catalog.md", errors);
assert(governanceSkill.includes("rules/approval-matrix.md"), "governance skill must load rules/approval-matrix.md", errors);
assert(governanceSkill.includes("hybrid approval matrix"), "governance skill must reference hybrid approval matrix", errors);
assert(governanceSkill.includes("dispatch packet"), "governance skill must require dispatch packets", errors);
assert(chatCharter.includes("`Boss`"), "ChatAgent charter must require Boss addressing", errors);
assert(chatCharter.includes("externally reachable"), "ChatAgent charter must remain externally reachable", errors);
assert(chatCharter.includes("standard dispatch packet"), "ChatAgent charter must require standard dispatch packets", errors);
assert(chatCharter.includes("templates/dispatch-packet.md"), "ChatAgent charter must reference templates/dispatch-packet.md", errors);
assert(chatCharter.includes("`action_type`"), "ChatAgent charter must require action_type in packets", errors);
assert(watchCharter.includes("`Boss`"), "WatchAgent charter must require Boss addressing", errors);
assert(watchCharter.includes("`锦衣卫`"), "WatchAgent charter must require 锦衣卫 self-title", errors);
assert(watchCharter.includes("externally reachable"), "WatchAgent charter must remain externally reachable", errors);
assert(watchCharter.includes("hybrid approval matrix"), "WatchAgent charter must require hybrid approval matrix use", errors);
assert(watchCharter.includes("Low risk: approve and record"), "WatchAgent charter must define low-risk handling", errors);
assert(watchCharter.includes("Medium risk: approve with explicit record and rationale"), "WatchAgent charter must define medium-risk handling", errors);
assert(watchCharter.includes("High risk: block and escalate to Boss"), "WatchAgent charter must define high-risk handling", errors);

for (const charter of internalCharters) {
  assert(charter.includes("internal only"), "all internal agent charters must state internal only", errors);
  assert(charter.includes("Do not address Boss directly"), "all internal agent charters must forbid direct Boss access", errors);
}

assert(addressingRule.includes("`Boss`"), "addressing rule must include Boss naming", errors);
assert(addressingRule.includes("`锦衣卫`"), "addressing rule must include 锦衣卫 naming", errors);
assert(actionCatalogRule.includes("`channel.receive_boss_message`"), "action catalog must include channel.receive_boss_message", errors);
assert(actionCatalogRule.includes("`dispatch.send_to_internal_agent`"), "action catalog must include dispatch.send_to_internal_agent", errors);
assert(actionCatalogRule.includes("`charter.change_agent_md`"), "action catalog must include charter.change_agent_md", errors);
assert(actionCatalogRule.includes("Any `action_type` not listed here must be rejected"), "action catalog must reject unknown action types", errors);
assert(approvalMatrixRule.includes("`hybrid`"), "approval matrix rule must declare hybrid mode", errors);
assert(approvalMatrixRule.includes("### Low Risk"), "approval matrix rule must define low risk", errors);
assert(approvalMatrixRule.includes("### Medium Risk"), "approval matrix rule must define medium risk", errors);
assert(approvalMatrixRule.includes("### High Risk"), "approval matrix rule must define high risk", errors);
assert(approvalMatrixRule.includes("hard-blocked"), "approval matrix rule must define hard-block behavior", errors);
assert(channelRule.includes("`ChatAgent`"), "channel access rule must include ChatAgent", errors);
assert(channelRule.includes("`WatchAgent`"), "channel access rule must include WatchAgent", errors);
assert(channelRule.includes("Feishu"), "channel access rule must include Feishu", errors);
assert(channelRule.includes("Telegram"), "channel access rule must include Telegram", errors);
assert(dispatchRule.includes("templates/dispatch-packet.md"), "dispatch rule must require dispatch template", errors);
assert(dispatchRule.includes("rules/action-catalog.md"), "dispatch rule must require action catalog", errors);
for (const field of [
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
  "`fallback_on_reject`"
]) {
  assert(dispatchRule.includes(field), `dispatch rule must require field ${field}`, errors);
  assert(dispatchTemplate.includes(field), `dispatch template must include field ${field}`, errors);
}

if (errors.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        errors
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      skills: manifest.skills.length,
      checkedFiles: requiredFiles.length,
      governance: {
        bossTitle: plugin.configSchema.properties.bossTitle.default,
        watchSelfTitle: plugin.configSchema.properties.watchSelfTitle.default,
        approvalMode: plugin.configSchema.properties.approvalMode.default,
        externalIngressAgents: plugin.configSchema.properties.externalIngressAgents.default,
        externalChannels: plugin.configSchema.properties.externalChannels.default
      }
    },
    null,
    2
  )
);
