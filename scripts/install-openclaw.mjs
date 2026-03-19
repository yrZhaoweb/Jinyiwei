import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function hasCommand(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    stdio: "ignore"
  });
  return result.status === 0;
}

function run(command, args, options = {}) {
  if (!hasCommand(command)) {
    return {
      ok: false,
      missing: command,
      command: [command, ...args]
    };
  }

  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      command: [command, ...args]
    };
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: "pipe",
    encoding: "utf8"
  });

  return {
    ok: result.status === 0,
    command: [command, ...args],
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status
  };
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const copyMode = args.includes("--copy");
const workspaceFlagIndex = args.indexOf("--workspace");
const workspace =
  workspaceFlagIndex >= 0 && args[workspaceFlagIndex + 1]
    ? path.resolve(args[workspaceFlagIndex + 1])
    : null;

run("node", [path.join(root, "scripts", "sync-skills-manifest.mjs")], { dryRun });

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifests", "preinstalled-skills.json"), "utf8"));

const report = {
  pluginInstall: run(
    "openclaw",
    ["plugins", "install", ...(copyMode ? [] : ["-l"]), root],
    { dryRun }
  ),
  pluginEnable: run("openclaw", ["plugins", "enable", "jinyiwei"], { dryRun }),
  skills: []
};

for (const skill of manifest.skills) {
  if (!workspace) {
    report.skills.push({
      ok: false,
      skill,
      missing: "workspace",
      hint: "Pass --workspace /path/to/openclaw/workspace so clawhub installs into the right OpenClaw workspace."
    });
    continue;
  }

  const result = run("clawhub", ["install", skill], {
    cwd: workspace,
    dryRun
  });
  result.skill = skill;
  report.skills.push(result);
}

console.log(JSON.stringify(report, null, 2));
