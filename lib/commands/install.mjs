import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";

/**
 * @param {string} script
 * @param {string[]} args
 */
function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

/**
 * Check if a CLI command is available on the system.
 * @param {string} cmd
 * @returns {boolean}
 */
function hasCommand(cmd) {
  const result = spawnSync("which", [cmd], { stdio: "ignore" });
  return result.status === 0;
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

/**
 * Install Jinyiwei into an OpenClaw workspace.
 * @param {string[]} args - CLI arguments after "install"
 * @returns {number} exit code
 */
export function installCommand(args) {
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const workspace = args.find((a) => !a.startsWith("--"));
  const flags = args.filter((a) => a.startsWith("--"));
  const isDryRun = flags.includes("--dry-run");
  const isJson = flags.includes("--json");
  const isCopy = flags.includes("--copy");

  // JSON mode: delegate directly to install-openclaw.mjs (no colored output)
  if (isJson) {
    if (!workspace) {
      console.log(JSON.stringify({ ok: false, error: t("install.error.workspaceRequired") }, null, 2));
      return ExitCode.USER_ERROR;
    }
    const result = spawnSync(process.execPath, [
      resolve("scripts/install-openclaw.mjs"),
      "--workspace", path.resolve(workspace),
      ...flags,
    ], { cwd: root, stdio: "inherit" });
    return result.status === 0 ? ExitCode.OK : ExitCode.INSTALL_FAIL;
  }

  log.banner(pkg.version);

  if (!workspace) {
    log.fail(t("install.error.workspaceRequired"));
    console.log();
    log.info(t("install.error.workspaceHint"));
    console.log();
    console.log(`    ${log.dim("$")} jinyiwei install /path/to/openclaw/workspace`);
    console.log(`    ${log.dim("$")} jinyiwei install /path/to/workspace --dry-run`);
    console.log();
    return ExitCode.USER_ERROR;
  }

  const resolvedWorkspace = path.resolve(workspace);
  if (!fs.existsSync(resolvedWorkspace)) {
    log.fail(t("install.error.workspaceNotExist", { path: resolvedWorkspace }));
    console.log();
    return ExitCode.USER_ERROR;
  }

  log.info(t("install.target", { path: log.cyan(resolvedWorkspace) }));
  if (isDryRun) {
    log.info(log.yellow("--dry-run mode"));
  }

  const totalSteps = 5;

  // Step 1: Sync
  log.step(1, totalSteps, t("install.syncing"));
  const sync = run(resolve("scripts/sync-skills-manifest.mjs"));
  if (sync.code !== 0) {
    log.fail(t("install.syncing"));
    log.detail(sync.stderr?.trim() || sync.stdout?.trim() || "Unknown error");
    log.summary("fail", t("install.summary.fail"));
    return ExitCode.VALIDATION_FAIL;
  }
  log.ok(t("install.syncing"));

  // Step 2: Validate
  log.step(2, totalSteps, t("install.validating"));
  const val = run(resolve("scripts/validate-jinyiwei.mjs"));
  if (val.code !== 0) {
    log.fail(t("install.validating"));
    try {
      const parsed = JSON.parse(val.stderr || val.stdout);
      if (parsed.errors) {
        for (const e of parsed.errors) {
          log.detail(e);
        }
      } else if (parsed.missing) {
        for (const m of parsed.missing) {
          log.detail(`missing: ${m}`);
        }
      }
    } catch {
      log.detail(val.stderr?.trim() || val.stdout?.trim() || "Unknown error");
    }
    log.summary("fail", t("install.summary.fail"));
    return ExitCode.VALIDATION_FAIL;
  }
  log.ok(t("install.validating"));

  // Step 3: Install plugin
  log.step(3, totalSteps, t("install.installingPlugin"));
  /** @type {{ skills: string[] }} */
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
  } catch (/** @type {any} */ err) {
    log.fail(t("install.installingPlugin"));
    log.detail(err.message);
    log.summary("fail", t("install.summary.fail"));
    return ExitCode.INSTALL_FAIL;
  }
  const installResult = run(resolve("scripts/install-openclaw.mjs"), [
    "--workspace", resolvedWorkspace,
    "--skip-skills",
    "--skip-agents",
    ...flags,
  ]);
  if (installResult.code !== 0) {
    log.fail(t("install.installingPlugin"));
    log.detail(installResult.stderr?.trim() || installResult.stdout?.trim() || "Unknown error");
    log.summary("fail", t("install.summary.fail"));
    return ExitCode.INSTALL_FAIL;
  }
  log.ok(t("install.installingPlugin"));

  // Step 4: Deploy agent workspaces
  log.step(4, totalSteps, t("install.deployingAgents"));
  let agentDeployFailed = false;
  try {
    for (const agent of AGENTS) {
      const agentDir = path.join(resolvedWorkspace, "agents", agent.id);

      if (isDryRun) {
        log.detail(t("install.agentDryRun", { agent: agent.name, path: agentDir }));
        continue;
      }

      fs.mkdirSync(agentDir, { recursive: true });
      fs.copyFileSync(resolve(`agents/${agent.id}/AGENT.md`), path.join(agentDir, "AGENT.md"));

      const rulesDst = path.join(agentDir, "rules");
      if (!fs.existsSync(rulesDst)) {
        if (isCopy) {
          copyDirRecursive(resolve("rules"), rulesDst);
        } else {
          fs.symlinkSync(resolve("rules"), rulesDst);
        }
      }

      const templatesDst = path.join(agentDir, "templates");
      if (!fs.existsSync(templatesDst)) {
        if (isCopy) {
          copyDirRecursive(resolve("templates"), templatesDst);
        } else {
          fs.symlinkSync(resolve("templates"), templatesDst);
        }
      }

      log.verbose(`${agent.name} -> ${agentDir}`);
    }

    // Write agent registry
    if (!isDryRun) {
      const registry = {
        agents: AGENTS.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          workspace: path.join(resolvedWorkspace, "agents", a.id),
          ...(a.dispatches ? { dispatches: a.dispatches } : {}),
          ...(a.reportsTo ? { reportsTo: a.reportsTo } : {}),
        })),
      };
      fs.writeFileSync(
        path.join(resolvedWorkspace, "openclaw-agents.json"),
        JSON.stringify(registry, null, 2) + "\n",
        "utf8"
      );
    }

    log.ok(t("install.deployingAgents"));
  } catch (/** @type {any} */ err) {
    agentDeployFailed = true;
    log.fail(t("install.deployingAgents"));
    log.detail(err.message);
  }

  // Step 5: Install skills
  const skipSkills = flags.includes("--skip-skills");
  const clawhubAvailable = hasCommand("clawhub");
  let skillsFailed = false;

  if (skipSkills) {
    log.step(5, totalSteps, t("install.installingSkills", { count: manifest.skills.length }));
    log.info(log.dim("skipped (--skip-skills)"));
  } else if (!clawhubAvailable) {
    log.step(5, totalSteps, t("install.installingSkills", { count: manifest.skills.length }));
    log.warn(t("install.clawhubNotFound"));
    log.info(log.dim(t("install.clawhubSkipped")));
  } else {
    log.step(5, totalSteps, t("install.installingSkills", { count: manifest.skills.length }));
    let successCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < manifest.skills.length; i++) {
      const skill = manifest.skills[i];
      const current = i + 1;
      log.progress(current, manifest.skills.length, t("install.skillProgress", { skill }));

      if (isDryRun) {
        successCount++;
        continue;
      }

      const result = spawnSync("clawhub", ["install", skill], {
        cwd: resolvedWorkspace,
        stdio: "pipe",
        encoding: "utf8",
      });

      if (result.status === 0) {
        successCount++;
      } else {
        failCount++;
        failures.push({ skill, stderr: result.stderr?.trim() });
      }
    }

    log.clearProgress();

    if (failCount > 0) {
      skillsFailed = true;
      log.fail(t("install.skillsResult", { success: successCount, total: manifest.skills.length }));
      for (const f of failures) {
        log.detail(`${f.skill}: ${f.stderr || "unknown error"}`);
      }
    } else {
      log.ok(t("install.skillsResult", { success: successCount, total: manifest.skills.length }));
    }
  }

  // Summary
  if (skillsFailed || agentDeployFailed) {
    log.summary("fail", t("install.summary.partialFail"));
    console.log();
    return ExitCode.PARTIAL_FAIL;
  } else if (isDryRun) {
    log.summary("ok", t("install.summary.dryRunOk"));
  } else {
    log.summary("ok", t("install.summary.ok"));
  }

  console.log(`  ${log.bold(t("install.nextSteps"))}`);
  console.log(`    ${log.symbols.arrow} ${t("install.nextStep.status")}`);
  console.log(`    ${log.symbols.arrow} ${t("install.nextStep.init")}`);
  console.log();

  return ExitCode.OK;
}
