import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";

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
    stdio: "inherit",
  });
  return result.status ?? 1;
}

/**
 * Install Jinyiwei into an OpenClaw workspace.
 * @param {string[]} args - CLI arguments after "install"
 * @returns {number} exit code
 */
export function installCommand(args) {
  const workspace = args.find((a) => !a.startsWith("--"));
  const flags = args.filter((a) => a.startsWith("--"));

  if (!workspace) {
    console.error(t("install.error.workspaceRequired") + "\n");
    console.error("Usage: jinyiwei install <workspace> [--dry-run] [--skip-plugin] [--skip-skills] [--copy] [--fail-fast] [--json]");
    return ExitCode.USER_ERROR;
  }

  const resolvedWorkspace = path.resolve(workspace);
  if (!fs.existsSync(resolvedWorkspace)) {
    console.error(t("install.error.workspaceNotExist", { path: resolvedWorkspace }));
    return ExitCode.USER_ERROR;
  }

  console.log(t("install.syncing"));
  const sync = runQuiet(resolve("scripts/sync-skills-manifest.mjs"));
  if (sync.code !== 0) {
    console.error(sync.stderr || sync.stdout);
    return ExitCode.VALIDATION_FAIL;
  }

  console.log(t("install.validating"));
  const val = runQuiet(resolve("scripts/validate-jinyiwei.mjs"));
  if (val.code !== 0) {
    console.error(val.stderr || val.stdout);
    return ExitCode.VALIDATION_FAIL;
  }

  console.log(`\n${t("install.installing", { path: resolvedWorkspace })}`);
  const installCode = run(resolve("scripts/install-openclaw.mjs"), [
    "--workspace",
    resolvedWorkspace,
    ...flags,
  ]);
  return installCode === 0 ? ExitCode.OK : ExitCode.INSTALL_FAIL;
}
