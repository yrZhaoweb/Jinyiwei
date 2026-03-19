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
  "rules/approval-matrix.md",
  "rules/channel-access.md",
  "rules/md-control.md",
  "rules/dispatch.md",
  "rules/audit.md",
  "rules/rejection.md",
  "rules/preinstalled-skills.md",
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
const approvalMatrixRule = readText("rules/approval-matrix.md");
const channelRule = readText("rules/channel-access.md");

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
assert(governanceSkill.includes("rules/approval-matrix.md"), "governance skill must load rules/approval-matrix.md", errors);
assert(governanceSkill.includes("hybrid approval matrix"), "governance skill must reference hybrid approval matrix", errors);
assert(chatCharter.includes("`Boss`"), "ChatAgent charter must require Boss addressing", errors);
assert(chatCharter.includes("externally reachable"), "ChatAgent charter must remain externally reachable", errors);
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
assert(approvalMatrixRule.includes("`hybrid`"), "approval matrix rule must declare hybrid mode", errors);
assert(approvalMatrixRule.includes("### Low Risk"), "approval matrix rule must define low risk", errors);
assert(approvalMatrixRule.includes("### Medium Risk"), "approval matrix rule must define medium risk", errors);
assert(approvalMatrixRule.includes("### High Risk"), "approval matrix rule must define high risk", errors);
assert(approvalMatrixRule.includes("hard-blocked"), "approval matrix rule must define hard-block behavior", errors);
assert(channelRule.includes("`ChatAgent`"), "channel access rule must include ChatAgent", errors);
assert(channelRule.includes("`WatchAgent`"), "channel access rule must include WatchAgent", errors);
assert(channelRule.includes("Feishu"), "channel access rule must include Feishu", errors);
assert(channelRule.includes("Telegram"), "channel access rule must include Telegram", errors);

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
