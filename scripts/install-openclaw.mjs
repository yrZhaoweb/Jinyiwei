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

function parseArgs(argv) {
  const options = {
    dryRun: false,
    copyMode: false,
    skipPlugin: false,
    skipSkills: false,
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
} else {
  report.summary.skippedSkills = manifest.skills.length;
}

if (
  !validation.ok ||
  (report.pluginInstall && !report.pluginInstall.ok) ||
  (report.pluginEnable && !report.pluginEnable.ok) ||
  report.summary.failedSkills > 0
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
