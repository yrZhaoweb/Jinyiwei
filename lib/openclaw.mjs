import { spawnSync } from "node:child_process";
import { parseOpenClawJson } from "./lifecycle.mjs";

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
 * Execute an openclaw CLI command and parse JSON output when possible.
 * @param {string[]} args
 * @param {{ dryRun?: boolean, cwd?: string }} [options]
 * @returns {{ ok: boolean, dryRun?: boolean, stdout?: string, stderr?: string, status?: number, command: string[], json?: any }}
 */
function execJson(args, options = {}) {
  const result = exec(args, options);
  if (!result.ok || !result.stdout) {
    return result;
  }

  const json = parseOpenClawJson(result.stdout);
  if (json == null) {
    return result;
  }

  return { ...result, json };
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
 * @returns {{ ok: boolean, status?: number, stdout?: string, stderr?: string, command: string[], version?: string }}
 */
export function version() {
  const result = spawnSync("openclaw", ["--version"], {
    stdio: "pipe",
    encoding: "utf8",
    timeout: 10_000,
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    command: ["openclaw", "--version"],
    version: result.status === 0 ? String(result.stdout || "").trim() : undefined,
  };
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
  const result = execJson(["agents", "list", "--json"]);
  if (!result.ok) return [];
  const parsed = result.json;
  return Array.isArray(parsed) ? parsed : parsed?.agents || [];
}

/**
 * Get the raw JSON payload for agent list inspection.
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function agentsListJson() {
  const result = execJson(["agents", "list", "--json"]);
  return { ...result, data: result.json };
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
 * List discovered plugins as JSON.
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function pluginsListJson() {
  const result = execJson(["plugins", "list", "--json"]);
  return { ...result, data: result.json };
}

/**
 * Fetch plugin details by id.
 * @param {string} pluginId
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function pluginInfoJson(pluginId) {
  const result = execJson(["plugins", "info", pluginId, "--json"]);
  return { ...result, data: result.json };
}

/**
 * List configured channels as JSON.
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function channelsListJson() {
  const result = execJson(["channels", "list", "--json"]);
  return { ...result, data: result.json };
}

/**
 * Fetch current channel runtime status as JSON.
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function channelsStatusJson() {
  const result = execJson(["channels", "status", "--json"]);
  return { ...result, data: result.json };
}

/**
 * Read a config value as JSON.
 * @param {string} configPath
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function configGetJson(configPath) {
  const result = execJson(["config", "get", configPath, "--json"]);
  return { ...result, data: result.json };
}

/**
 * Set a config value.
 * @param {string} configPath
 * @param {string} value
 * @param {{ strictJson?: boolean, dryRun?: boolean }} [options]
 */
export function configSet(configPath, value, options = {}) {
  const args = ["config", "set", configPath, value];
  if (options.strictJson) {
    args.push("--strict-json");
  }
  return exec(args, { dryRun: options.dryRun });
}

/**
 * Validate the active OpenClaw config.
 * @returns {{ ok: boolean, data?: any, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function configValidateJson() {
  const result = execJson(["config", "validate", "--json"]);
  return { ...result, data: result.json };
}

/**
 * Return the active config file path.
 * @returns {{ ok: boolean, path?: string, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function configFile() {
  const result = exec(["config", "file"]);
  if (!result.ok) return result;
  const lines = String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const pathLine = lines.find((line) => /^(\/|[A-Za-z]:\\).+/.test(line))
    || lines.find((line) => /\.(json|jsonc|toml|ya?ml)$/i.test(line))
    || lines[lines.length - 1]
    || "";
  return {
    ...result,
    path: pathLine || undefined,
  };
}

/**
 * Update OpenClaw's explicit agent list so one agent becomes the default entry.
 * @param {string} agentId
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ ok: boolean, dryRun?: boolean, stdout?: string, stderr?: string, status?: number, command: string[], entries?: any[] }}
 */
export function setDefaultAgent(agentId, options = {}) {
  const agents = agentsList();
  const normalizedAgentId = String(agentId || "").trim().toLowerCase();
  if (!normalizedAgentId) {
    return {
      ok: false,
      stderr: "agent id is required",
      command: ["openclaw", "config", "set", "agents.list"],
    };
  }

  const knownIds = new Set(agents.map((agent) => String(agent.id || "").trim().toLowerCase()).filter(Boolean));
  if (!knownIds.has(normalizedAgentId)) {
    return {
      ok: false,
      stderr: `agent not found: ${normalizedAgentId}`,
      command: ["openclaw", "config", "set", "agents.list"],
    };
  }

  const configAgents = configGetJson("agents.list");
  const existingEntries = Array.isArray(configAgents.data) ? configAgents.data : [];
  const byId = new Map();

  for (const entry of existingEntries) {
    const id = String(entry?.id || "").trim().toLowerCase();
    if (id) byId.set(id, { ...entry });
  }

  for (const agent of agents) {
    const id = String(agent?.id || "").trim().toLowerCase();
    if (!id || byId.has(id)) continue;

    const nextEntry = { id };
    if (typeof agent.workspace === "string" && agent.workspace.trim()) {
      nextEntry.workspace = agent.workspace.trim();
    }
    if (typeof agent.model === "string" && agent.model.trim()) {
      nextEntry.model = { primary: agent.model.trim() };
    }
    byId.set(id, nextEntry);
  }

  const entries = [...byId.values()].map((entry) => ({
    ...entry,
    default: String(entry.id || "").trim().toLowerCase() === normalizedAgentId,
  }));

  const result = configSet("agents.list", JSON.stringify(entries), {
    strictJson: true,
    dryRun: options.dryRun,
  });

  return { ...result, entries };
}

/**
 * Install a skill.
 * @param {string} skillId
 * @param {{ dryRun?: boolean }} [options]
 */
export function skillInstall(skillId, options = {}) {
  return exec(["skills", "install", skillId], { dryRun: options.dryRun });
}
