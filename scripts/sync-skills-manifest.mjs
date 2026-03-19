import fs from "node:fs";
import path from "node:path";
import { root, resolve } from "../lib/paths.mjs";
import { parseSkillsList } from "../lib/parse-skills.mjs";

const sourcePath = resolve("skills_list.md");
const outputPath = resolve("manifests/preinstalled-skills.json");

const source = fs.readFileSync(sourcePath, "utf8");
const skills = parseSkillsList(source);

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
