import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { loadConfig } from "../config.mjs";
import * as log from "../log.mjs";

/**
 * Paths that must never be overwritten during update.
 * Relative to the project root.
 * @returns {string[]}
 */
export function protectedRelativePaths() {
  return [
    "jinyiwei.config.json",
  ];
}

/**
 * Find protected external directories (memory, workspaces).
 * @returns {{ path: string, description: string }[]}
 */
export function findProtectedExternalPaths() {
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
export function backupProtectedFiles(backupDir) {
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
export function restoreProtectedFiles(backupDir, backedUp) {
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
export function fetchLatestVersion() {
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
export function fetchPackageMetadata() {
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
 * Discover agent names from the current filesystem.
 * @returns {string[]}
 */
export function discoverAgentsFromFilesystem() {
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
export function discoverAgentsFromDir(agentsDir) {
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
 * Compare current agent structure with a remote tarball to detect breaking changes.
 * @param {string} currentVersion
 * @param {string} latestVersion
 * @returns {{ breaking: boolean, messages: string[], removedAgents: string[] }}
 */
export function detectBreakingChanges(currentVersion, latestVersion) {
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
 * Prompt user for consent with a breaking changes warning.
 * @param {string[]} messages
 * @returns {boolean}
 */
export function promptBreakingChangesConsent(messages) {
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
export function runNpmUpdate(version, options = {}) {
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
export function checkUpdateAvailable(currentVersion) {
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
