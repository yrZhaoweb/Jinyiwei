import fs from "node:fs";
import { resolve } from "./paths.mjs";
import { inspectOpenClawState } from "./openclaw-state.mjs";

function loadPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(resolve("package.json"), "utf8")).version || "";
  } catch {
    return "";
  }
}

function hasBlockingIssues(state) {
  return state.diagnostics.some((item) => item.severity === "error");
}

function buildChecks(state) {
  const plugin = state.jinyiwei.plugin;
  const currentVersion = loadPackageVersion();
  const pluginVersion = plugin?.version || "";
  const configuredChannels = state.channels.configured || [];
  const runningChannels = state.channels.running || [];

  return [
    {
      id: "openclaw.available",
      label: "OpenClaw CLI available",
      ok: state.available,
      detail: state.available ? (state.version || "available") : "openclaw not found",
    },
    {
      id: "openclaw.config.valid",
      label: "OpenClaw config valid",
      ok: state.config.valid,
      detail: state.config.error || state.config.path || "ok",
    },
    {
      id: "jinyiwei.plugin.present",
      label: "Jinyiwei plugin installed",
      ok: Boolean(plugin),
      detail: plugin ? `${plugin.status || "present"} (${plugin.version || "unknown"})` : "missing",
    },
    {
      id: "jinyiwei.plugin.enabled",
      label: "Jinyiwei plugin enabled",
      ok: Boolean(plugin && plugin.enabled !== false && plugin.status !== "disabled"),
      detail: plugin ? `${plugin.status || "unknown"}` : "missing",
    },
    {
      id: "jinyiwei.agents.present",
      label: "Expected Jinyiwei agents registered",
      ok: state.jinyiwei.missingAgents.length === 0 && state.jinyiwei.agents.length > 0,
      detail: state.jinyiwei.missingAgents.length > 0 ? `missing: ${state.jinyiwei.missingAgents.join(", ")}` : `${state.jinyiwei.agents.length} agents`,
    },
    {
      id: "jinyiwei.entry.aligned",
      label: "Default entry aligned",
      ok: !(state.jinyiwei.defaultAgent?.id === "main" && state.jinyiwei.agents.length > 0),
      detail: state.jinyiwei.defaultAgent?.displayName || "unknown",
    },
    {
      id: "channels.configured",
      label: "Channels configured",
      ok: configuredChannels.length > 0,
      detail: configuredChannels.length > 0 ? configuredChannels.join(", ") : "none",
    },
    {
      id: "channels.running",
      label: "Channels running",
      ok: runningChannels.length > 0 || configuredChannels.length === 0,
      detail: runningChannels.length > 0 ? runningChannels.join(", ") : "none running",
    },
    {
      id: "version.synced",
      label: "Plugin version matches package",
      ok: !plugin || !pluginVersion || !currentVersion || pluginVersion === currentVersion,
      detail: plugin ? `${pluginVersion || "unknown"} vs ${currentVersion || "unknown"}` : "n/a",
    },
  ];
}

/**
 * Build a diagnostic report for the installed Jinyiwei/OpenClaw runtime.
 * @returns {{
 *   state: ReturnType<typeof inspectOpenClawState>,
 *   checks: Array<{ id: string, label: string, ok: boolean, detail: string }>,
 *   ok: boolean,
 *   blocking: string[],
 *   warnings: string[],
 *   guidance: string[],
 * }}
 */
export function buildDiagnosticReport() {
  const state = inspectOpenClawState();
  const checks = buildChecks(state);
  const blocking = state.diagnostics.filter((item) => item.severity === "error").map((item) => item.message);
  const warnings = state.diagnostics.filter((item) => item.severity === "warning").map((item) => item.message);
  const ok = !hasBlockingIssues(state);

  return {
    state,
    checks,
    ok,
    blocking,
    warnings,
    guidance: state.guidance,
  };
}

/**
 * Build a stricter verification report.
 * @returns {{
 *   state: ReturnType<typeof inspectOpenClawState>,
 *   checks: Array<{ id: string, label: string, ok: boolean, detail: string }>,
 *   ok: boolean,
 *   issues: Array<{ severity: "error" | "warning", message: string, detail?: string }>,
 *   guidance: string[],
 * }}
 */
export function buildVerificationReport() {
  const report = buildDiagnosticReport();
  const issues = [
    ...report.state.diagnostics,
  ].map((item) => ({
    severity: item.severity === "warning" ? "warning" : "error",
    message: item.message,
    detail: item.detail,
  }));

  const strictFailures = report.checks.filter(
    (check) => !check.ok
      && check.id !== "jinyiwei.entry.aligned"
      && check.id !== "channels.configured"
      && check.id !== "version.synced"
  );
  const ok = report.ok && strictFailures.length === 0;

  return {
    state: report.state,
    checks: report.checks,
    ok,
    issues,
    guidance: report.guidance,
  };
}
