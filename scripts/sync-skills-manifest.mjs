import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "skills_list.md");
const outputPath = path.join(root, "manifests", "preinstalled-skills.json");

const source = fs.readFileSync(sourcePath, "utf8");
const skills = [];

for (const rawLine of source.split(/\r?\n/)) {
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

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      source: "skills_list.md",
      skills
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(`Synced ${skills.length} skills to ${outputPath}`);

