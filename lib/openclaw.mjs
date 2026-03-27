import { spawnSync } from "node:child_process";

let cachedAvailability;

/**
 * Execute an openclaw CLI command.
 * @param {string[]} args
 * @param {{ dryRun?: boolean, cwd?: string }} [options]
 * @returns {{ ok: boolean, dryRun?: boolean, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
function exec(args, options = {}) {
  const command = ["openclaw", ...args];

  if (options.dryRun) {
    return { ok: true, dryRun: true, command };
  }

  const result = spawnSync("openclaw", args, {
    cwd: options.cwd,
    stdio: "pipe",
    encoding: "utf8",
    timeout: 30_000,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
    command,
  };
}

/**
 * Check if openclaw CLI is available on PATH.
 * @returns {boolean}
 */
export function hasOpenClaw() {
  if (typeof cachedAvailability === "boolean") {
    return cachedAvailability;
  }

  const result = spawnSync("which", ["openclaw"], { stdio: "ignore", timeout: 5_000 });
  cachedAvailability = result.status === 0;
  return cachedAvailability;
}

/**
 * Add a new isolated agent.
 * @param {string} name
 * @param {{ model?: string, workspace?: string, dryRun?: boolean }} [options]
 */
export function agentAdd(name, options = {}) {
  const args = ["agents", "add", name, "--non-interactive", "--json"];
  if (options.model) args.push("--model", options.model);
  if (options.workspace) args.push("--workspace", options.workspace);
  return exec(args, { dryRun: options.dryRun });
}

/**
 * Delete an agent.
 * @param {string} id
 * @param {{ dryRun?: boolean }} [options]
 */
export function agentDelete(id, options = {}) {
  return exec(["agents", "delete", id, "--force", "--json"], { dryRun: options.dryRun });
}

/**
 * List all configured agents.
 * @returns {Array<object>}
 */
export function agentsList() {
  const result = exec(["agents", "list", "--json"]);
  if (!result.ok) return [];
  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) ? parsed : parsed.agents || [];
  } catch {
    return [];
  }
}

/**
 * Set the default model for an agent.
 * @param {string} model
 * @param {string} agentId
 * @param {{ dryRun?: boolean }} [options]
 */
export function modelSet(model, agentId, options = {}) {
  return exec(["models", "set", model, "--agent", agentId], { dryRun: options.dryRun });
}

/**
 * Install a plugin.
 * @param {string} pluginPath
 * @param {{ link?: boolean, dryRun?: boolean }} [options]
 */
export function pluginInstall(pluginPath, options = {}) {
  const args = ["plugins", "install"];
  if (options.link) args.push("--link");
  args.push(pluginPath);
  return exec(args, { dryRun: options.dryRun });
}

/**
 * Enable a plugin.
 * @param {string} pluginId
 * @param {{ dryRun?: boolean }} [options]
 */
export function pluginEnable(pluginId, options = {}) {
  return exec(["plugins", "enable", pluginId], { dryRun: options.dryRun });
}

/**
 * Disable a plugin.
 * @param {string} pluginId
 * @param {{ dryRun?: boolean }} [options]
 */
export function pluginDisable(pluginId, options = {}) {
  return exec(["plugins", "disable", pluginId], { dryRun: options.dryRun });
}

/**
 * Uninstall a plugin.
 * @param {string} pluginId
 * @param {{ dryRun?: boolean }} [options]
 */
export function pluginUninstall(pluginId, options = {}) {
  return exec(["plugins", "uninstall", pluginId], { dryRun: options.dryRun });
}

/**
 * Install a skill.
 * @param {string} skillId
 * @param {{ dryRun?: boolean }} [options]
 */
export function skillInstall(skillId, options = {}) {
  return exec(["skills", "install", skillId], { dryRun: options.dryRun });
}
