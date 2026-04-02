import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig } from "../config.mjs";
import * as openclaw from "../openclaw.mjs";
import { inspectOpenClawState } from "../openclaw-state.mjs";

/**
 * Paths that must never be overwritten during update.
 * Relative to the project root.
 * @returns {string[]}
 */
function protectedRelativePaths() {
  return [
    "jinyiwei.config.json",
  ];
}

/**
 * Find protected external directories (memory, workspaces).
 * @returns {{ path: string, description: string }[]}
 */
function findProtectedExternalPaths() {
  const protected_ = [];

  // Project memory directory
  const memoryBase = path.join(os.homedir(), ".claude", "projects");
  const projectMemoryDir = path.join(memoryBase, "-Users-yrzhao-myspace-Jinyiwei", "memory");
  if (fs.existsSync(projectMemoryDir)) {
    protected_.push({ path: projectMemoryDir, description: "Jinyiwei memory (project memory)" });
  }

  // OpenClaw workspace from config
  try {
    const config = loadConfig();
    const workspacePath = config?._workspace;
    if (workspacePath && fs.existsSync(workspacePath)) {
      protected_.push({ path: workspacePath, description: "OpenClaw workspace" });
    }
  } catch {
    // config unavailable — skip
  }

  return protected_;
}

/**
 * Backup protected files to a temp directory.
 * @param {string} backupDir
 * @returns {{ path: string, relativePath: string }[]}
 */
function backupProtectedFiles(backupDir) {
  const backedUp = [];
  const relPaths = protectedRelativePaths();
  for (const rel of relPaths) {
    const src = resolve(rel);
    if (fs.existsSync(src)) {
      const dst = path.join(backupDir, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      backedUp.push({ path: src, relativePath: rel });
    }
  }
  return backedUp;
}

/**
 * Restore protected files from backup.
 * @param {string} backupDir
 * @param {{ path: string, relativePath: string }[]} backedUp
 */
function restoreProtectedFiles(backupDir, backedUp) {
  for (const { path: dst, relativePath } of backedUp) {
    const src = path.join(backupDir, relativePath);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    }
  }
}

/**
 * Fetch latest version from npm registry.
 * @returns {{ version: string, ok: boolean, error?: string }}
 */
function fetchLatestVersion() {
  const result = spawnSync("npm", ["view", "@yrzhao/jinyiwei", "version", "--json"], {
    stdio: "pipe",
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0) {
    return { ok: false, version: "", error: result.stderr?.trim() || "npm view failed" };
  }
  try {
    const version = JSON.parse(result.stdout.trim());
    return { ok: true, version: String(version) };
  } catch {
    return { ok: false, version: "", error: "Failed to parse npm response" };
  }
}

/**
 * Fetch full package metadata from npm registry.
 * @returns {{ ok: boolean, data?: any, error?: string }}
 */
function fetchPackageMetadata() {
  const result = spawnSync("npm", ["view", "@yrzhao/jinyiwei", "--json"], {
    stdio: "pipe",
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0) {
    return { ok: false, error: result.stderr?.trim() || "npm view failed" };
  }
  try {
    return { ok: true, data: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, error: "Failed to parse npm response" };
  }
}

/**
 * Compare current agent structure with a remote tarball to detect breaking changes.
 * @param {string} currentVersion
 * @param {string} latestVersion
 * @returns {{ breaking: boolean, messages: string[], removedAgents: string[] }}
 */
function detectBreakingChanges(currentVersion, latestVersion) {
  const messages = [];
  const removedAgents = [];

  // Parse current agents from filesystem
  const currentAgents = discoverAgentsFromFilesystem();

  // Download latest package.json to compare
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinyiwei-update-"));
  try {
    const tarballResult = spawnSync("npm", ["pack", "@yrzhao/jinyiwei", `--dry-run`], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 30_000,
    });
    // Fallback: use npm pack to get tarball URL, then inspect
    const viewResult = spawnSync("npm", ["view", "@yrzhao/jinyiwei", "--json"], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 15_000,
    });
    if (viewResult.status !== 0) {
      return { breaking: false, messages: [], removedAgents: [] };
    }

    // We can detect breaking changes by comparing the current package
    // with the remote. Since we can't easily inspect the remote tarball
    // without downloading, we rely on the version diff approach:
    // - Major version bump = breaking
    // - If remote has different agent list (requires download — skip for simplicity)
    //
    // We use npm show to get dist-tags
    const distResult = spawnSync("npm", ["view", "@yrzhao/jinyiwei", "dist-tags", "--json"], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 15_000,
    });

    if (distResult.status !== 0) {
      return { breaking: false, messages: [], removedAgents: [] };
    }

    // Compare major versions
    const currentMajor = parseInt(currentVersion.split(".")[0], 10);
    const latestMajor = parseInt(latestVersion.split(".")[0], 10);
    if (latestMajor > currentMajor) {
      messages.push(`Breaking: major version bump ${currentVersion} → ${latestVersion} (${latestMajor}.x.x)`);
      return { breaking: true, messages, removedAgents: [] };
    }

    // Compare agent list: download latest package to inspect agents/
    const extractDir = path.join(tmpDir, "latest");
    fs.mkdirSync(extractDir, { recursive: true });
    const packResult = spawnSync("npm", ["pack", `@yrzhao/jinyiwei@${latestVersion}`, "--pack-destination", tmpDir], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 30_000,
    });

    if (packResult.status === 0) {
      // Find the tarball
      const tarballName = (packResult.stdout || "").trim().split("\n").find((l) => l.endsWith(".tgz"));
      if (tarballName) {
        const tarballPath = path.join(tmpDir, tarballName);
        const extractResult = spawnSync("tar", ["xzf", tarballPath, "-C", extractDir, "--strip-components=1"], {
          encoding: "utf8",
          timeout: 15_000,
        });
        if (extractResult.status === 0) {
          const latestAgents = discoverAgentsFromDir(path.join(extractDir, "package", "agents"));
          const removed = currentAgents.filter((a) => !latestAgents.includes(a));
          if (removed.length > 0) {
            removedAgents.push(...removed);
            messages.push(`Breaking: agent(s) removed in ${latestVersion}: ${removed.join(", ")}`);
          }
        }
      }
    }
  } finally {
  }

  return {
    breaking: messages.length > 0,
    messages,
    removedAgents,
  };
}

/**
 * Discover agent names from the current filesystem.
 * @returns {string[]}
 */
function discoverAgentsFromFilesystem() {
  const agentsDir = resolve("agents");
  if (!fs.existsSync(agentsDir)) return [];
  const names = [];
  const scanDir = (dir) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "AGENT.md") {
          // parent dir is agent or group/agent
          const parent = path.basename(path.dirname(dir));
          names.push(parent);
        } else if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name));
        }
      }
    } catch {
      // ignore inaccessible dirs
    }
  };
  scanDir(agentsDir);
  return [...new Set(names)];
}

/**
 * Discover agent names from a directory.
 * @param {string} agentsDir
 * @returns {string[]}
 */
function discoverAgentsFromDir(agentsDir) {
  if (!fs.existsSync(agentsDir)) return [];
  const names = [];
  const scanDir = (dir) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "AGENT.md") {
          const parent = path.basename(path.dirname(dir));
          names.push(parent);
        } else if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name));
        }
      }
    } catch {
      // ignore
    }
  };
  scanDir(agentsDir);
  return [...new Set(names)];
}

/**
 * Prompt user for consent with a breaking changes warning.
 * @param {string[]} messages
 * @returns {boolean}
 */
function promptBreakingChangesConsent(messages) {
  console.log();
  log.warn("⚠  Breaking changes detected:");
  for (const msg of messages) {
    log.detail(msg);
  }
  console.log();
  process.stdout.write("Continue with update anyway? [y/N] ");
  const answer = String(fs.readFileSync("/dev/stdin", "utf8")).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

/**
 * Run npm install to update the package to a specific version.
 * @param {string} version
 * @param {{ dryRun?: boolean }} options
 * @returns {{ ok: boolean, stderr?: string, stdout?: string }}
 */
function runNpmUpdate(version, options = {}) {
  const args = ["install", "--save", `@yrzhao/jinyiwei@${version}`];
  if (options.dryRun) args.push("--dry-run");

  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env },
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/**
 * Check if an update is available.
 * @param {string} currentVersion
 * @returns {{ updateAvailable: boolean, current: string, latest: string }}
 */
function checkUpdateAvailable(currentVersion) {
  const latestResult = fetchLatestVersion();
  if (!latestResult.ok) {
    return { updateAvailable: false, current: currentVersion, latest: currentVersion };
  }
  const latest = latestResult.version;
  const current = currentVersion;
  // Simple semver compare
  const curParts = current.split(".").map(Number);
  const latParts = latest.split(".").map(Number);
  const updateAvailable =
    latParts[0] > curParts[0] ||
    (latParts[0] === curParts[0] && latParts[1] > curParts[1]) ||
    (latParts[0] === curParts[0] && latParts[1] === curParts[1] && latParts[2] > curParts[2]);
  return { updateAvailable, current, latest };
}

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
