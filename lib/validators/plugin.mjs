import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

const VALID_APPROVAL_MODES = ["strict", "graded", "hybrid"];
const VALID_INGRESS_AGENTS = ["ChatAgent", "WatchAgent"];
const VALID_CHANNELS = ["feishu", "telegram"];

/**
 * Validate plugin configSchema structure, types, and value constraints.
 * Does NOT enforce specific default values — those are user-customizable via `jinyiwei init`.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePlugin() {
  const errors = [];
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));
  const props = plugin.configSchema?.properties;

  // Required properties must exist
  assert(props?.bossTitle != null, "plugin configSchema missing property: bossTitle", errors);
  assert(props?.watchSelfTitle != null, "plugin configSchema missing property: watchSelfTitle", errors);
  assert(props?.approvalMode != null, "plugin configSchema missing property: approvalMode", errors);
  assert(props?.externalIngressAgents != null, "plugin configSchema missing property: externalIngressAgents", errors);
  assert(props?.externalChannels != null, "plugin configSchema missing property: externalChannels", errors);
  assert(props?.autoInstallListedSkills != null, "plugin configSchema missing property: autoInstallListedSkills", errors);
  assert(props?.listedSkillsManifest != null, "plugin configSchema missing property: listedSkillsManifest", errors);

  // Type constraints
  assert(props?.bossTitle?.type === "string", "plugin bossTitle must be type string", errors);
  assert(props?.watchSelfTitle?.type === "string", "plugin watchSelfTitle must be type string", errors);
  assert(props?.approvalMode?.type === "string", "plugin approvalMode must be type string", errors);
  assert(props?.externalIngressAgents?.type === "array", "plugin externalIngressAgents must be type array", errors);
  assert(props?.externalChannels?.type === "array", "plugin externalChannels must be type array", errors);
  assert(props?.autoInstallListedSkills?.type === "boolean", "plugin autoInstallListedSkills must be type boolean", errors);
  assert(props?.listedSkillsManifest?.type === "string", "plugin listedSkillsManifest must be type string", errors);

  // Default values must be present (but can be any valid value)
  assert(typeof props?.bossTitle?.default === "string" && props.bossTitle.default.length > 0, "plugin bossTitle default must be a non-empty string", errors);
  assert(typeof props?.watchSelfTitle?.default === "string" && props.watchSelfTitle.default.length > 0, "plugin watchSelfTitle default must be a non-empty string", errors);

  // approvalMode default must be one of the valid modes
  assert(
    VALID_APPROVAL_MODES.includes(props?.approvalMode?.default),
    `plugin approvalMode default must be one of: ${VALID_APPROVAL_MODES.join(", ")}`,
    errors
  );

  // externalIngressAgents defaults must be a subset of valid agents
  const ingressDefaults = props?.externalIngressAgents?.default;
  assert(
    Array.isArray(ingressDefaults) && ingressDefaults.length > 0 && ingressDefaults.every((/** @type {string} */ a) => VALID_INGRESS_AGENTS.includes(a)),
    `plugin externalIngressAgents default must be a non-empty subset of: ${VALID_INGRESS_AGENTS.join(", ")}`,
    errors
  );

  // externalChannels defaults must be a subset of valid channels
  const channelDefaults = props?.externalChannels?.default;
  assert(
    Array.isArray(channelDefaults) && channelDefaults.length > 0 && channelDefaults.every((/** @type {string} */ c) => VALID_CHANNELS.includes(c)),
    `plugin externalChannels default must be a non-empty subset of: ${VALID_CHANNELS.join(", ")}`,
    errors
  );

  return { ok: errors.length === 0, errors };
}
