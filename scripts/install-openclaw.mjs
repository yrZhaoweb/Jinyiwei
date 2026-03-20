import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../lib/paths.mjs";
import { t } from "../lib/i18n.mjs";

function hasCommand(cmd) {
  const result = spawnSync("which", [cmd], {
    stdio: "ignore",
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

/**
 * Recursively copy a directory.
 * @param {string} src
 * @param {string} dst
 */
function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

const AGENTS = [
  { id: "chat",   name: "ChatAgent",   role: "external", dispatches: ["watch"] },
  { id: "watch",  name: "WatchAgent",  role: "external", dispatches: ["code", "ui", "review", "test"] },
  { id: "code",   name: "CodeAgent",   role: "internal", reportsTo: "chat" },
  { id: "review", name: "ReviewAgent", role: "internal", reportsTo: "chat" },
  { id: "test",   name: "TestAgent",   role: "internal", reportsTo: "chat" },
  { id: "ui",     name: "UIAgent",     role: "internal", reportsTo: "chat" },
];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    copyMode: false,
    skipPlugin: false,
    skipSkills: false,
    skipAgents: false,
    failFast: false,
    json: false,
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
    if (arg === "--skip-agents") {
      options.skipAgents = true;
      continue;
    }
    if (arg === "--fail-fast") {
      options.failFast = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--workspace") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        const error = { ok: false, error: "Missing or empty value for --workspace" };
        if (argv.includes("--json")) {
          console.log(JSON.stringify(error, null, 2));
          process.exit(1);
        }
        throw new Error(error.error);
      }
      options.workspace = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function stopIfNeeded(report, result, failFast, jsonMode) {
  if (!failFast || result.ok) {
    return;
  }

  report.summary.failed = true;
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
  process.exit(1);
}

function mark(ok, dryRun) {
  if (dryRun) return t("report.dryRun");
  return ok ? t("report.ok") : t("report.failed");
}

function printReport(report) {
  const s = report.summary;
  const prefix = s.mode === "dry-run" ? `${t("report.dryRun")} ` : "";

  // Validation
  if (report.validation) {
    console.log(`${prefix}${t("report.validation")}  ${mark(report.validation.ok, report.validation.dryRun)}`);
  }

  // Plugin
  if (report.pluginInstall) {
    const method = report.pluginInstall.command?.includes("-l") ? "symlink" : "copy";
    console.log(`${prefix}${t("report.pluginInstall")} ${mark(report.pluginInstall.ok, report.pluginInstall.dryRun)} (${method})`);
  }
  if (report.pluginEnable) {
    console.log(`${prefix}${t("report.pluginEnable")} ${mark(report.pluginEnable.ok, report.pluginEnable.dryRun)}`);
  }

  // Agents
  if (report.agentDeploy && report.agentDeploy.length > 0) {
    const agentOk = report.agentDeploy.filter((a) => a.ok).length;
    const agentTotal = report.agentDeploy.length;
    const agentDry = report.agentDeploy[0]?.dryRun;
    console.log(`${prefix}Agents:     ${mark(agentOk === agentTotal, agentDry)} (${agentOk}/${agentTotal})`);
  }

  // Skills
  if (s.skippedSkills > 0) {
    console.log(`${prefix}${t("report.skills")}  ${t("report.skillsSkipped", { count: s.skippedSkills })}`);
  } else if (report.skills.length > 0) {
    console.log(`${prefix}${t("report.skills")}  ${t("report.skillsInstalled", { success: s.successfulSkills, total: s.requestedSkills })}`);
    if (s.failedSkills > 0) {
      const failed = report.skills.filter((r) => !r.ok);
      for (const f of failed) {
        const reason = f.missing
          ? t("report.commandNotFound", { command: f.missing })
          : f.stderr?.trim() || t("report.exitCode", { code: f.status });
        console.log(`  ${t("report.skillFailed", { skill: f.skill, reason })}`);
      }
    }
  }

  // Summary
  console.log();
  if (s.failed) {
    console.log(`${prefix}${t("report.result")} ${t("report.failed")}`);
  } else {
    console.log(`${prefix}${t("report.result")} ${t("report.ok")}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const validation = run("node", [resolve("scripts/validate-jinyiwei.mjs")]);

const manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
const report = {
  workspace: options.workspace,
  manifestPath: resolve("manifests/preinstalled-skills.json"),
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

stopIfNeeded(report, validation, options.failFast, options.json);

if (!options.skipPlugin) {
  report.pluginInstall = run(
    "openclaw",
    ["plugins", "install", ...(options.copyMode ? [] : ["-l"]), root],
    { dryRun: options.dryRun }
  );
  stopIfNeeded(report, report.pluginInstall, options.failFast, options.json);

  report.pluginEnable = run("openclaw", ["plugins", "enable", "jinyiwei"], {
    dryRun: options.dryRun
  });
  stopIfNeeded(report, report.pluginEnable, options.failFast, options.json);
}

// Agent workspace deployment
report.agentDeploy = [];
if (!options.skipAgents && options.workspace) {
  for (const agent of AGENTS) {
    const agentDir = path.join(options.workspace, "agents", agent.id);
    if (options.dryRun) {
      report.agentDeploy.push({ agent: agent.id, ok: true, dryRun: true, path: agentDir });
      continue;
    }
    try {
      fs.mkdirSync(agentDir, { recursive: true });
      fs.copyFileSync(resolve(`agents/${agent.id}/AGENT.md`), path.join(agentDir, "AGENT.md"));

      const rulesDst = path.join(agentDir, "rules");
      if (!fs.existsSync(rulesDst)) {
        if (options.copyMode) {
          copyDirRecursive(resolve("rules"), rulesDst);
        } else {
          fs.symlinkSync(resolve("rules"), rulesDst);
        }
      }

      const templatesDst = path.join(agentDir, "templates");
      if (!fs.existsSync(templatesDst)) {
        if (options.copyMode) {
          copyDirRecursive(resolve("templates"), templatesDst);
        } else {
          fs.symlinkSync(resolve("templates"), templatesDst);
        }
      }

      report.agentDeploy.push({ agent: agent.id, ok: true, path: agentDir });
    } catch (/** @type {any} */ err) {
      report.agentDeploy.push({ agent: agent.id, ok: false, error: err.message });
    }
  }

  // Write agent registry
  if (!options.dryRun) {
    try {
      const registry = {
        agents: AGENTS.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          workspace: path.join(options.workspace, "agents", a.id),
          ...(a.dispatches ? { dispatches: a.dispatches } : {}),
          ...(a.reportsTo ? { reportsTo: a.reportsTo } : {}),
        })),
      };
      fs.writeFileSync(
        path.join(options.workspace, "openclaw-agents.json"),
        JSON.stringify(registry, null, 2) + "\n",
        "utf8"
      );
    } catch {
      // non-fatal
    }
  }
}

// Skills installation
if (!options.skipSkills) {
  if (!hasCommand("clawhub")) {
    report.summary.skippedSkills = manifest.skills.length;
    report.clawhubMissing = true;
  } else {
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
        stopIfNeeded(report, result, options.failFast, options.json);
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
        stopIfNeeded(report, result, options.failFast, options.json);
      }
    }
  }
} else {
  report.summary.skippedSkills = manifest.skills.length;
}

const agentDeployFailed = report.agentDeploy?.some((a) => !a.ok) ?? false;

if (
  !validation.ok ||
  (report.pluginInstall && !report.pluginInstall.ok) ||
  (report.pluginEnable && !report.pluginEnable.ok) ||
  report.summary.failedSkills > 0 ||
  agentDeployFailed
) {
  report.summary.failed = true;
}

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (report.summary.failed) {
  process.exit(1);
}
