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

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifests", "preinstalled-skills.json"), "utf8"));
if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
  console.error(JSON.stringify({ ok: false, error: "preinstalled-skills.json has no skills" }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, skills: manifest.skills.length }, null, 2));
