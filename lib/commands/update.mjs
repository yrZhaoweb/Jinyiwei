import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig } from "../config.mjs";

// Import step functions from update-steps.mjs
import {
  protectedRelativePaths,
  findProtectedExternalPaths,
  backupProtectedFiles,
  restoreProtectedFiles,
  fetchLatestVersion,
  fetchPackageMetadata,
  detectBreakingChanges,
  discoverAgentsFromFilesystem,
  discoverAgentsFromDir,
  promptBreakingChangesConsent,
  runNpmUpdate,
  checkUpdateAvailable,
} from "./update-steps.mjs";

// Re-export for backward compatibility
export {
  protectedRelativePaths,
  findProtectedExternalPaths,
  backupProtectedFiles,
  restoreProtectedFiles,
  fetchLatestVersion,
  fetchPackageMetadata,
  detectBreakingChanges,
  discoverAgentsFromFilesystem,
  discoverAgentsFromDir,
  promptBreakingChangesConsent,
  runNpmUpdate,
  checkUpdateAvailable,
};

/**
 * Update Jinyiwei to the latest version.
 * @param {string[]} args
 * @returns {number} exit code
 */
export function updateCommand(args) {
  const dryRun = args.includes("--dry-run");
  const isJson = args.includes("--json");
  const skipConfirm = args.includes("--force");

  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const currentVersion = pkg.version;

  if (!isJson) log.banner(currentVersion);

  // Step 1: Check current vs latest version
  if (!isJson) console.log(`  ${log.bold(t("update.checking"))}`);
  const { updateAvailable, latest } = checkUpdateAvailable(currentVersion);

  if (!updateAvailable) {
    if (isJson) {
      console.log(JSON.stringify({ ok: true, upToDate: true, current: currentVersion, latest }, null, 2));
    } else {
      console.log(`  ${log.ok(t("update.upToDate", { version: currentVersion }))}`);
    }
    return ExitCode.OK;
  }

  // Detect breaking changes (before interactive prompt)
  const breaking = detectBreakingChanges(currentVersion, latest);

  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      upToDate: false,
      current: currentVersion,
      latest,
      breakingChanges: breaking.breaking,
      breakingMessages: breaking.messages,
      consentRequired: breaking.breaking,
    }, null, 2));
    if (breaking.breaking) return ExitCode.OK; // need interactive consent
    return ExitCode.OK;
  }

  console.log(`  ${log.dim(`Current: ${currentVersion}  Latest: ${latest}`)}`);
  console.log();

  // Step 2: Protected paths report
  if (!isJson) {
    console.log(`  ${log.bold(t("update.protectedPaths"))}`);
    const externalProtected = findProtectedExternalPaths();
    if (externalProtected.length > 0) {
      for (const p of externalProtected) {
        log.detail(`${p.description}: ${p.path}`);
      }
    } else {
      log.detail(t("update.noExternalProtected"));
    }
    const relProtected = protectedRelativePaths();
    for (const rel of relProtected) {
      const abs = resolve(rel);
      log.detail(`${rel}: ${fs.existsSync(abs) ? abs : t("update.notPresent")}`);
    }
    console.log();
  }

  // Step 3: Confirm if breaking changes exist
  if (breaking.breaking) {
    if (!skipConfirm && !promptBreakingChangesConsent(breaking.messages)) {
      if (isJson) {
        console.log(JSON.stringify({ ok: false, breakingChanges: true, consentDenied: true }, null, 2));
      } else {
        log.info(t("update.aborted"));
      }
      return ExitCode.USER_ERROR;
    }
    if (!isJson) {
      log.info(t("update.breakingAcknowledged"));
    }
  }

  if (dryRun) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: true,
        dryRun: true,
        current: currentVersion,
        latest,
        breakingChanges: breaking.breaking,
        wouldUpdate: true,
      }, null, 2));
    } else {
      console.log(`  ${log.bold(t("update.dryRunSummary", { latest }))}`);
    }
    return ExitCode.OK;
  }

  // Step 5: Backup
  if (!isJson) console.log(`  ${log.bold(t("update.backingUp"))}`);
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-backup-"));
  const backedUp = backupProtectedFiles(backupDir);
  if (!isJson) {
    log.ok(t("update.backingUp"));
    for (const { relativePath } of backedUp) {
      log.detail(relativePath);
    }
  }

  // Step 6: npm update
  if (!isJson) console.log(`  ${log.bold(t("update.runningNpmUpdate"))}`);
  const updateResult = runNpmUpdate(latest);

  if (!updateResult.ok) {
    // Restore backup on failure
    restoreProtectedFiles(backupDir, backedUp);
    if (!isJson) {
      log.fail(t("update.runningNpmUpdate"));
      log.detail(updateResult.stderr?.trim() || "Unknown error");
    }
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "npm install failed", stderr: updateResult.stderr }, null, 2));
    }
    return ExitCode.INSTALL_FAIL;
  }

  // Step 7: Restore protected files
  restoreProtectedFiles(backupDir, backedUp);

  // Step 8: Validate
  if (!isJson) console.log(`  ${log.bold(t("update.validating"))}`);
  const valResult = spawnSync(process.execPath, [resolve("scripts/validate-jinyiwei.mjs")], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
    timeout: 30_000,
  });

  if (!isJson) {
    if (valResult.status === 0) {
      log.ok(t("update.validating"));
    } else {
      log.warn(t("update.validationWarning"));
    }
  }

  // Done
  const newPkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      from: currentVersion,
      to: newPkg.version,
      breakingChanges: breaking.breaking,
      protectedFilesRestored: backedUp.map((b) => b.relativePath),
    }, null, 2));
  } else {
    log.summary("ok", t("update.success", { version: newPkg.version }));
    console.log();
    log.info(t("update.restartReminder"));
  }

  return ExitCode.OK;
}
