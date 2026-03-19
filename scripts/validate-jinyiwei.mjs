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
const channelRule = readText("rules/channel-access.md");

assert(Array.isArray(manifest.skills) && manifest.skills.length > 0, "preinstalled-skills.json has no skills", errors);
assert(
  JSON.stringify(manifest.skills) === JSON.stringify(skillsFromList),
  "skills_list.md and manifests/preinstalled-skills.json are out of sync",
  errors
);
assert(plugin.configSchema?.properties?.bossTitle?.default === "Boss", "plugin bossTitle default must be Boss", errors);
assert(plugin.configSchema?.properties?.watchSelfTitle?.default === "锦衣卫", "plugin watchSelfTitle default must be 锦衣卫", errors);
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
assert(chatCharter.includes("`Boss`"), "ChatAgent charter must require Boss addressing", errors);
assert(chatCharter.includes("externally reachable"), "ChatAgent charter must remain externally reachable", errors);
assert(watchCharter.includes("`Boss`"), "WatchAgent charter must require Boss addressing", errors);
assert(watchCharter.includes("`锦衣卫`"), "WatchAgent charter must require 锦衣卫 self-title", errors);
assert(watchCharter.includes("externally reachable"), "WatchAgent charter must remain externally reachable", errors);

for (const charter of internalCharters) {
  assert(charter.includes("internal only"), "all internal agent charters must state internal only", errors);
  assert(charter.includes("Do not address Boss directly"), "all internal agent charters must forbid direct Boss access", errors);
}

assert(addressingRule.includes("`Boss`"), "addressing rule must include Boss naming", errors);
assert(addressingRule.includes("`锦衣卫`"), "addressing rule must include 锦衣卫 naming", errors);
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
        externalIngressAgents: plugin.configSchema.properties.externalIngressAgents.default,
        externalChannels: plugin.configSchema.properties.externalChannels.default
      }
    },
    null,
    2
  )
);
