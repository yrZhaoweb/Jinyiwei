import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { buildGovernanceSummary } from "../governance/summary.mjs";
import { discoverGroups } from "../groups.mjs";
import * as openclaw from "../openclaw.mjs";
import { runValidationSuite } from "../validation.mjs";

/**
 * @param {string} label
 * @param {string} value
 */
function row(label, value) {
  const padded = label.padEnd(20);
  console.log(`    ${log.dim(padded)} ${value}`);
}

/**
 * Show plugin status and governance summary.
 * @param {string[]} [args]
 * @returns {number} exit code
 */
export function statusCommand(args = []) {
  const isJson = args.includes("--json");

  const { groups } = discoverGroups();
  const validation = runValidationSuite();
  const validationOk = validation.errors.length === 0 && validation.files.ok;
  const errors = validation.files.ok ? validation.errors : validation.files.missing.map((item) => `missing: ${item}`);

  // Check registered agents in OpenClaw
  const registeredAgents = openclaw.hasOpenClaw() ? openclaw.agentsList() : [];
  const summary = buildGovernanceSummary({
    validation: validationOk ? "ok" : "failed",
    errors: validationOk ? undefined : errors,
    registeredAgents,
  });

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
    return validationOk ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
  }

  log.banner(summary.version);
  console.log(`  ${log.bold(t("status.header"))}`);
  console.log();

  // Config section
  row(t("status.bossTitle"), log.cyan(summary.config.bossTitle));
  row(t("status.watchSelfTitle"), log.cyan(summary.config.watchSelfTitle));
  row(t("status.approvalMode"), log.cyan(summary.config.approvalMode));
  row(t("status.extChannels"), summary.config.externalChannels.join(", "));
  row(t("status.actionCatalog"), String(summary.actionCatalogSize));
  row(t("status.openClaw"), summary.openclaw.available ? log.cyan(summary.openclaw.version || t("status.available")) : log.red(t("status.notFound")));
  row(t("status.defaultEntry"), summary.openclaw.defaultAgent ? log.cyan(summary.openclaw.defaultAgent) : log.dim("unknown"));
  row(t("status.jinyiweiPlugin"), summary.openclaw.jinyiwei.plugin ? log.cyan(summary.openclaw.jinyiwei.plugin.status || t("status.installed")) : log.red(t("status.missing")));
  row(t("status.jinyiweiAgents"), String(summary.openclaw.jinyiwei.agents.length));
  row(t("status.channels"), summary.openclaw.channels.configured.length > 0 ? summary.openclaw.channels.configured.join(", ") : log.dim("none"));

  // External agents
  console.log();
  console.log(`  ${log.bold(t("status.externalAgents"))}`);
  console.log();
  for (const agent of summary.externalAgents) {
    row(agent.name, agent.model ? log.cyan(agent.model) : log.dim(t("status.noModelSet")));
  }

  // Agent groups
  console.log();
  console.log(`  ${log.bold(t("status.agentGroups"))}`);
  console.log();
  for (const [groupName, group] of Object.entries(groups)) {
    const model = summary.groups[groupName]?.model || "";
    row(`${groupName}`, `${group.agents.map((a) => a.name).join(", ")}  ${model ? log.cyan(model) : log.dim(t("status.noModelSet"))}`);
  }

  // Skills
  console.log();
  row(t("status.skills"), String(summary.skills));

  // Registered agents (from OpenClaw)
  if (registeredAgents.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("status.registeredAgentsOpenClaw"))}`);
    console.log();
    for (const agent of registeredAgents) {
      row(agent.name || agent.id, agent.model ? log.cyan(agent.model) : log.dim(t("status.noModelSet")));
    }
  }

  if (summary.openclaw.guidance.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("doctor.guidance"))}`);
    console.log();
    for (const item of summary.openclaw.guidance) {
      log.detail(item);
    }
  }

  // Validation
  console.log();
  if (validationOk) {
    row(t("status.validation"), log.green(t("status.ok")));
  } else {
    row(t("status.validation"), log.red(t("status.failed")));
    for (const e of errors) {
      log.detail(e);
    }
  }
  console.log();
  return validationOk ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
}
