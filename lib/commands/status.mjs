import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig } from "../config.mjs";
import { buildAgentRegistry, discoverGroups } from "../groups.mjs";
import { validateFiles } from "../validators/files.mjs";
import { validateSkills } from "../validators/skills.mjs";
import { validatePlugin } from "../validators/plugin.mjs";
import { validateGovernanceSkill, validateChatCharter, validateWatchCharter, validateInternalCharters } from "../validators/charters.mjs";
import { validateRules } from "../validators/rules.mjs";
import { validateTemplates } from "../validators/templates.mjs";
import { validateVersion } from "../validators/version.mjs";
import { validateConfigFile } from "../validators/config.mjs";
import { validateGroups } from "../validators/groups.mjs";
import * as openclaw from "../openclaw.mjs";

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

  const config = loadConfig();
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));
  const { groups } = discoverGroups();
  const registry = buildAgentRegistry(config);

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
  } catch {
    manifest = { skills: [] };
  }

  // Run all validators
  const validators = [
    validateFiles,
    validateSkills,
    validatePlugin,
    validateVersion,
    validateConfigFile,
    validateGroups,
    validateGovernanceSkill,
    validateChatCharter,
    validateWatchCharter,
    validateInternalCharters,
    validateRules,
    validateTemplates,
  ];

  const errors = [];
  for (const validate of validators) {
    const result = validate();
    if (result.errors) errors.push(...result.errors);
    if (result.missing) errors.push(...result.missing.map((/** @type {string} */ m) => `missing: ${m}`));
  }
  const validationOk = errors.length === 0;

  // Check registered agents in OpenClaw
  const registeredAgents = openclaw.hasOpenClaw() ? openclaw.agentsList() : [];

  if (isJson) {
    console.log(JSON.stringify({
      version: plugin.version,
      config: {
        bossTitle: config.bossTitle,
        watchSelfTitle: config.watchSelfTitle,
        approvalMode: config.approvalMode,
        externalChannels: config.externalChannels,
      },
      externalAgents: registry.filter((a) => a.role === "external").map((a) => ({ id: a.id, name: a.name, model: a.model })),
      groups: Object.fromEntries(
        Object.entries(groups).map(([name, group]) => [
          name,
          {
            agents: group.agents.map((a) => a.name),
            model: config.models?.groups?.[name] || "",
          },
        ])
      ),
      registeredAgents,
      skills: manifest.skills.length,
      validation: validationOk ? "ok" : "failed",
      errors: validationOk ? undefined : errors,
    }, null, 2));
    return validationOk ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
  }

  log.banner(plugin.version);
  console.log(`  ${log.bold(t("status.header"))}`);
  console.log();

  // Config section
  row(t("status.bossTitle"), log.cyan(config.bossTitle));
  row(t("status.watchSelfTitle"), log.cyan(config.watchSelfTitle));
  row(t("status.approvalMode"), log.cyan(config.approvalMode));
  row(t("status.extChannels"), config.externalChannels.join(", "));

  // External agents
  console.log();
  console.log(`  ${log.bold(t("status.externalAgents"))}`);
  console.log();
  for (const agent of registry.filter((a) => a.role === "external")) {
    row(agent.name, agent.model ? log.cyan(agent.model) : log.dim("no model set"));
  }

  // Agent groups
  console.log();
  console.log(`  ${log.bold(t("status.agentGroups"))}`);
  console.log();
  for (const [groupName, group] of Object.entries(groups)) {
    const model = config.models?.groups?.[groupName] || "";
    row(`${groupName}`, `${group.agents.map((a) => a.name).join(", ")}  ${model ? log.cyan(model) : log.dim("no model set")}`);
  }

  // Skills
  console.log();
  row(t("status.skills"), String(manifest.skills.length));

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
