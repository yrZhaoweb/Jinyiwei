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
  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      command: [command, ...args]
    };
  }

  if (!hasCommand(command)) {
    return {
      ok: false,
      missing: command,
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

function parseArgs(argv) {
  const options = {
    dryRun: false,
    copyMode: false,
    skipPlugin: false,
    skipSkills: false,
    failFast: false,
    workspace: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--copy") {
      options.copyMode = true;
      continue;
    }
    if (arg === "--skip-plugin") {
      options.skipPlugin = true;
      continue;
    }
    if (arg === "--skip-skills") {
      options.skipSkills = true;
      continue;
    }
    if (arg === "--fail-fast") {
      options.failFast = true;
      continue;
    }
    if (arg === "--workspace") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --workspace");
      }
      options.workspace = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function stopIfNeeded(report, result, failFast) {
  if (!failFast || result.ok) {
    return;
  }

  report.summary.failed = true;
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const options = parseArgs(process.argv.slice(2));
const validation = run("node", [path.join(root, "scripts", "validate-jinyiwei.mjs")]);

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifests", "preinstalled-skills.json"), "utf8"));
const report = {
  workspace: options.workspace,
  manifestPath: path.join(root, "manifests", "preinstalled-skills.json"),
  validation,
  pluginInstall: null,
  pluginEnable: null,
  skills: [],
  summary: {
    mode: options.dryRun ? "dry-run" : "apply",
    requestedSkills: manifest.skills.length,
    successfulSkills: 0,
    failedSkills: 0,
    skippedSkills: 0,
    failed: false
  }
};

stopIfNeeded(report, validation, options.failFast);

if (!options.skipPlugin) {
  report.pluginInstall = run(
    "openclaw",
    ["plugins", "install", ...(options.copyMode ? [] : ["-l"]), root],
    { dryRun: options.dryRun }
  );
  stopIfNeeded(report, report.pluginInstall, options.failFast);

  report.pluginEnable = run("openclaw", ["plugins", "enable", "jinyiwei"], {
    dryRun: options.dryRun
  });
  stopIfNeeded(report, report.pluginEnable, options.failFast);
}

if (!options.skipSkills) {
  for (const skill of manifest.skills) {
    if (!options.workspace) {
      const result = {
        ok: false,
        skill,
        missing: "workspace",
        hint: "Pass --workspace /path/to/openclaw/workspace so clawhub installs into the right OpenClaw workspace."
      };
      report.skills.push(result);
      report.summary.failedSkills += 1;
      stopIfNeeded(report, result, options.failFast);
      continue;
    }

    const result = run("clawhub", ["install", skill], {
      cwd: options.workspace,
      dryRun: options.dryRun
    });
    result.skill = skill;
    report.skills.push(result);
    if (result.ok) {
      report.summary.successfulSkills += 1;
    } else {
      report.summary.failedSkills += 1;
      stopIfNeeded(report, result, options.failFast);
    }
  }
} else {
  report.summary.skippedSkills = manifest.skills.length;
}

if (
  (report.pluginInstall && !report.pluginInstall.ok) ||
  (report.pluginEnable && !report.pluginEnable.ok) ||
  report.summary.failedSkills > 0
) {
  report.summary.failed = true;
}

console.log(JSON.stringify(report, null, 2));
