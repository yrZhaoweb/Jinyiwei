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
function runQuiet(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

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

  // JSON mode: delegate directly to install-openclaw.mjs (no colored output)
  if (isJson) {
    const result = spawnSync(process.execPath, [
      resolve("scripts/install-openclaw.mjs"),
      "--workspace", workspace ? path.resolve(workspace) : "",
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

  const totalSteps = 4;

  // Step 1: Sync
  log.step(1, totalSteps, t("install.syncing"));
  const sync = runQuiet(resolve("scripts/sync-skills-manifest.mjs"));
  if (sync.code !== 0) {
    log.fail(t("install.syncing"));
    log.detail(sync.stderr?.trim() || sync.stdout?.trim() || "Unknown error");
    log.summary("fail", t("install.summary.fail"));
    return ExitCode.VALIDATION_FAIL;
  }
  log.ok(t("install.syncing"));

  // Step 2: Validate
  log.step(2, totalSteps, t("install.validating"));
  const val = runQuiet(resolve("scripts/validate-jinyiwei.mjs"));
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
  const manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
  const installResult = run(resolve("scripts/install-openclaw.mjs"), [
    "--workspace", resolvedWorkspace,
    "--skip-skills",
    ...flags,
  ]);
  if (installResult.code !== 0) {
    log.fail(t("install.installingPlugin"));
    log.detail(installResult.stderr?.trim() || installResult.stdout?.trim() || "Unknown error");
    log.summary("fail", t("install.summary.fail"));
    return ExitCode.INSTALL_FAIL;
  }
  log.ok(t("install.installingPlugin"));

  // Step 4: Install skills
  const skipSkills = flags.includes("--skip-skills");
  if (skipSkills) {
    log.step(4, totalSteps, t("install.installingSkills", { count: manifest.skills.length }));
    log.info(log.dim("skipped (--skip-skills)"));
  } else {
    log.step(4, totalSteps, t("install.installingSkills", { count: manifest.skills.length }));
    const skillResult = run(resolve("scripts/install-openclaw.mjs"), [
      "--workspace", resolvedWorkspace,
      "--skip-plugin",
      ...flags.filter((f) => f !== "--skip-skills"),
    ]);
    if (skillResult.code !== 0) {
      log.warn(t("install.installingSkills", { count: manifest.skills.length }) + " — partial failure");
      log.detail(skillResult.stderr?.trim() || skillResult.stdout?.trim() || "Some skills failed to install");
    } else {
      log.ok(t("install.installingSkills", { count: manifest.skills.length }));
    }
  }

  // Summary
  if (isDryRun) {
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
