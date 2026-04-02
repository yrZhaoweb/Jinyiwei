import { spawnSync } from "node:child_process";

/**
 * Remove empty items, trim whitespace, and dedupe strings.
 * @param {Array<string | null | undefined>} values
 * @returns {string[]}
 */
export function uniqueStrings(values) {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];
}

/**
 * Parse a comma/newline separated list into unique strings.
 * @param {string | string[] | undefined | null} value
 * @returns {string[]}
 */
export function parseDelimitedList(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  return uniqueStrings(value.split(/[\n,]/g));
}

/**
 * @param {string[]} channels
 * @returns {string}
 */
export function formatChannelList(channels) {
  return channels.length > 0 ? channels.join(", ") : "local only";
}

/**
 * @param {string | undefined} text
 * @returns {number}
 */
function jsonStartIndex(text) {
  if (!text) return -1;
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const leadingWhitespace = line.length - trimmed.length;
    const first = trimmed[0];
    const second = trimmed[1] || "";
    const objectStart = first === "{" && (second === "" || second === "\"" || second === "}" || /\s/.test(second));
    const arrayStart = first === "[" && (second === "" || "[{\"-0123456789tfn]".includes(second) || /\s/.test(second));

    if (objectStart || arrayStart) {
      return offset + leadingWhitespace;
    }

    offset += line.length + 1;
  }

  return -1;
}

/**
 * Extract the first complete JSON value from noisy CLI output.
 * @param {string} text
 * @param {number} [maxDepth=1000]
 * @returns {string | null}
 */
function extractJsonPayload(text, maxDepth = 1000) {
  const start = jsonStartIndex(text);
  if (start < 0) return null;

  const opening = text[start];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      if (depth > maxDepth) return null; // Prevent DoS
      continue;
    }

    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

/**
 * Parse the first JSON payload embedded in noisy CLI output.
 * @param {string} text
 * @returns {any | null}
 */
export function parseOpenClawJson(text) {
  const payload = extractJsonPayload(text);
  if (!payload) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Execute an OpenClaw CLI command.
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ ok: boolean, dryRun?: boolean, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function execOpenClaw(args, options = {}) {
  const command = ["openclaw", ...args];
  if (options.dryRun) {
    return { ok: true, dryRun: true, command };
  }

  const result = spawnSync("openclaw", args, {
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
 * Load a JSON payload from an OpenClaw command.
 * @param {string[]} args
 * @returns {{ ok: boolean, data?: any, stderr?: string }}
 */
export function loadOpenClawJson(args) {
  const result = execOpenClaw(args);
  if (!result.ok) {
    return { ok: false, stderr: result.stderr };
  }

  const data = parseOpenClawJson(result.stdout || "");
  if (data == null) {
    return { ok: false, stderr: result.stdout || result.stderr || "Unable to parse JSON output" };
  }

  return { ok: true, data };
}

/**
 * @returns {Array<{ id: string, workspace?: string, model?: string, bindings?: number, isDefault?: boolean, routes?: string[] }>}
 */
export function listOpenClawAgents() {
  const result = loadOpenClawJson(["agents", "list", "--json"]);
  return result.ok && Array.isArray(result.data) ? result.data : [];
}

/**
 * @returns {{
 *   channelAccounts: Record<string, Array<{ accountId: string, enabled?: boolean, configured?: boolean, running?: boolean }>>,
 *   channelDefaultAccountId: Record<string, string>,
 *   channels: Record<string, { configured?: boolean, running?: boolean }>
 * }}
 */
export function loadOpenClawChannelState() {
  const result = loadOpenClawJson(["channels", "list", "--json"]);
  if (!result.ok || !result.data || typeof result.data !== "object") {
    return { channelAccounts: {}, channelDefaultAccountId: {}, channels: {} };
  }

  return {
    channelAccounts: result.data.channelAccounts || {},
    channelDefaultAccountId: result.data.channelDefaultAccountId || {},
    channels: result.data.channels || {},
  };
}

/**
 * Build a list of channel bindings from configured OpenClaw channels.
 * @param {string[]} allowedChannels
 * @returns {Array<{ channel: string, accountId: string }>}
 */
export function resolveChannelBindings(allowedChannels) {
  const channelState = loadOpenClawChannelState();
  const bindings = [];

  for (const channel of allowedChannels) {
    const accounts = channelState.channelAccounts[channel] || [];
    const defaultAccountId = channelState.channelDefaultAccountId[channel] || accounts[0]?.accountId || "";
    const configured = channelState.channels[channel]?.configured === true || accounts.length > 0;

    if (configured && defaultAccountId) {
      bindings.push({ channel, accountId: defaultAccountId });
    }
  }

  return bindings;
}

/**
 * Execute `openclaw agents bind` for one agent.
 * @param {string} agentId
 * @param {Array<{ channel: string, accountId: string }>} bindings
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ ok: boolean, dryRun?: boolean, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function bindAgentChannels(agentId, bindings, options = {}) {
  if (bindings.length === 0) {
    return { ok: true, dryRun: options.dryRun, command: ["openclaw", "agents", "bind"] };
  }

  const args = ["agents", "bind", "--agent", agentId];
  for (const binding of bindings) {
    args.push("--bind", `${binding.channel}:${binding.accountId}`);
  }
  args.push("--json");
  return execOpenClaw(args, options);
}

/**
 * Execute `openclaw agents unbind --all` for one agent.
 * @param {string} agentId
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ ok: boolean, dryRun?: boolean, stdout?: string, stderr?: string, status?: number, command: string[] }}
 */
export function unbindAgentChannels(agentId, options = {}) {
  return execOpenClaw(["agents", "unbind", "--agent", agentId, "--all", "--json"], options);
}

/**
 * Render a beginner-friendly summary of installed agents and channels.
 * @param {{
 *   externalAgents: Array<{ name: string, model?: string }>,
 *   groups: Record<string, { agents: string[], model?: string }>,
 *   externalChannels: string[],
 *   bindings: Array<{ agent: string, channel: string, accountId: string }>,
 *   needsConfig: boolean,
 * }} input
 * @returns {string[]}
 */
export function buildBeginnerSummary(input) {
  const lines = [
    "What Jinyiwei gives you:",
    "- ChatAgent is the user-facing entry for requests",
    "- WatchAgent reviews actions before execution",
    "- Internal agents do the work and stay off external channels",
  ];

  lines.push(`- Allowed external channels: ${formatChannelList(input.externalChannels)}`);

  if (input.externalAgents.length > 0) {
    lines.push("- External agents:");
    for (const agent of input.externalAgents) {
      lines.push(`  - ${agent.name}${agent.model ? ` (model: ${agent.model})` : ""}`);
    }
  }

  const groupNames = Object.keys(input.groups);
  if (groupNames.length > 0) {
    lines.push("- Internal groups:");
    for (const [groupName, group] of Object.entries(input.groups)) {
      lines.push(`  - ${groupName}: ${group.agents.join(", ")}${group.model ? ` (model: ${group.model})` : ""}`);
    }
  }

  if (input.bindings.length > 0) {
    lines.push("- Channel bindings:");
    for (const binding of input.bindings) {
      lines.push(`  - ${binding.agent} -> ${binding.channel}:${binding.accountId}`);
    }
  }

  if (input.needsConfig) {
    lines.push("- Some models are still unset. Run `jinyiwei init` to finish configuration.");
  }

  return lines;
}

/**
 * Build a short set of next-step hints after install.
 * @param {{ hasOpenClaw: boolean, hasBindings: boolean, needsConfig: boolean }} input
 * @returns {string[]}
 */
export function buildInstallNextSteps(input) {
  const lines = [
    "Next steps:",
    "- Run `jinyiwei status` to inspect the installed agents and governance state.",
  ];

  if (input.needsConfig) {
    lines.push("- Run `jinyiwei init` to set model and channel preferences.");
  } else {
    lines.push("- You can start by talking to ChatAgent.");
  }

  if (input.hasOpenClaw) {
    lines.push("- In OpenClaw, choose ChatAgent instead of the default `main` entry when you want the Jinyiwei workflow.");
  }

  if (input.hasBindings) {
    lines.push("- External channel bindings were created for the allowed channels already configured in OpenClaw.");
  }

  return lines;
}
