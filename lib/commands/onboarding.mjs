import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Capture console output while running a command function.
 * @param {() => (number | Promise<number>)} fn
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
export async function captureCommand(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const stdout = [];
  const stderr = [];

  console.log = (...args) => {
    stdout.push(args.map((arg) => String(arg)).join(" "));
  };
  console.error = (...args) => {
    stderr.push(args.map((arg) => String(arg)).join(" "));
  };
  console.warn = (...args) => {
    stderr.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    const code = await fn();
    return { code: typeof code === "number" ? code : 0, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

/**
 * Determine the workspace path a beginner should use.
 * @returns {string}
 */
export function defaultWorkspacePath() {
  return path.join(os.homedir(), ".openclaw", "workspace");
}

/**
 * Parse a setup/configure command line.
 * @param {string[]} args
 * @returns {{ workspace: string, workspaceSource: "positional" | "flag" | "default", isJson: boolean, flags: string[] }}
 */
export function parseOnboardingArgs(args) {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const isJson = flags.includes("--json");
  const optionValueFlags = new Set(["--workspace", "--entry", "--set-default-entry"]);

  let workspace = "";
  let workspaceSource = /** @type {"positional" | "flag" | "default"} */ ("default");

  const workspaceFlagIndex = args.indexOf("--workspace");
  if (workspaceFlagIndex >= 0 && args[workspaceFlagIndex + 1] && !args[workspaceFlagIndex + 1].startsWith("--")) {
    workspace = args[workspaceFlagIndex + 1];
    workspaceSource = "flag";
  } else {
    const positionalCandidates = [];
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg.startsWith("--")) {
        if (optionValueFlags.has(arg)) {
          index += 1;
        }
        continue;
      }
      positionalCandidates.push(arg);
    }
    const positional = positionalCandidates[0];
    if (positional) {
      workspace = positional;
      workspaceSource = "positional";
    }
  }

  if (!workspace) {
    workspace = defaultWorkspacePath();
  }

  return { workspace, workspaceSource, isJson, flags };
}

/**
 * Read a named option value from CLI argument list.
 * @param {string[]} args
 * @param {string[]} names
 * @returns {string | null}
 */
export function readOptionValue(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    if (!names.includes(args[index])) continue;
    const value = args[index + 1];
    if (value && !value.startsWith("--")) return value;
  }
  return null;
}

/**
 * Normalize a user-provided entry agent identifier to a canonical form.
 * @param {string} value
 * @returns {"chat" | "watch" | "main" | null}
 */
export function normalizeEntryAgentId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "chat" || normalized === "chatagent") return "chat";
  if (normalized === "watch" || normalized === "watchagent") return "watch";
  if (normalized === "main") return "main";
  return normalized;
}

/**
 * Ensure the default workspace exists for beginner-friendly setup.
 * @param {string} workspace
 * @param {boolean} shouldCreate
 */
export function ensureWorkspace(workspace, shouldCreate) {
  if (shouldCreate && !fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
  }
}

/**
 * Build a concise step-by-step start guide.
 * @param {{ workspace: string, installation: any, configuration: any, entry?: any, validation: any, status: any }} input
 * @returns {string[]}
 */
export function buildStartGuideLines(input) {
  const defaultEntry = input.status?.openclaw?.defaultAgent || input.entry?.defaultEntry || "unknown";
  const lines = [
    "You are ready to use Jinyiwei.",
    "",
    `Workspace: ${input.workspace}`,
    `Default entry: ${defaultEntry}`,
    "",
    "Next actions:",
    "1. Open ChatAgent for user-facing work.",
    "2. Let WatchAgent approve or reject risky actions.",
    "3. Use `jinyiwei status` whenever you want a quick health check.",
    "4. Use `jinyiwei configure` if you want to change models or channels later.",
    "",
    "What Jinyiwei now controls:",
  ];

  const agents = input.status?.externalAgents?.map((agent) => agent.name).filter(Boolean) || [];
  const groups = Object.entries(input.status?.groups || {}).map(([groupName, group]) => {
    const agentNames = Array.isArray(group.agents) ? group.agents.join(", ") : "";
    return `${groupName}: ${agentNames}`;
  });

  if (agents.length > 0) {
    lines.push(`- External agents: ${agents.join(", ")}`);
  }

  if (groups.length > 0) {
    lines.push(`- Internal groups: ${groups.join(" | ")}`);
  }

  lines.push("");
  lines.push(defaultEntry === "main"
    ? "OpenClaw still points at `main`. Switch to ChatAgent, or run `jinyiwei configure --set-default-entry chat`."
    : "OpenClaw is aligned to the Jinyiwei workflow. Start with ChatAgent for Boss-facing work.");

  return lines;
}

/**
 * Build a structured onboarding payload for JSON mode.
 * @param {{ workspace: string, installation: any, configuration: any, entry?: any, validation: any, status: any }} input
 * @returns {object}
 */
export function buildStartGuidePayload(input) {
  return {
    ok: true,
    workspace: input.workspace,
    nextSteps: [
      "Open ChatAgent for user-facing work",
      "Use WatchAgent for approvals and risk checks",
      "Run `jinyiwei status` for a quick health check",
      "Run `jinyiwei configure` to adjust models or channels",
    ],
    installation: input.installation,
    configuration: input.configuration,
    entry: input.entry,
    validation: input.validation,
    status: input.status,
  };
}
