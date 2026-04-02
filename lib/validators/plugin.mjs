import fs from "node:fs";
import { resolve } from "../paths.mjs";
import {
  DEFAULT_APPROVAL_MODE,
  DEFAULT_BOSS_TITLE,
  DEFAULT_CHAT_AGENT_NAME,
  DEFAULT_EXTERNAL_CHANNELS,
  DEFAULT_WATCH_AGENT_NAME,
  DEFAULT_WATCH_SELF_TITLE,
  PLUGIN_ID,
} from "../governance/constants.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate openclaw.plugin.json structure and runtime-facing config schema.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePlugin() {
  const errors = [];

  try {
    const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));
    const schema = plugin.configSchema || {};
    const props = schema.properties || {};

    assert(plugin.id === PLUGIN_ID, `plugin manifest id must be '${PLUGIN_ID}'`, errors);
    assert(typeof plugin.name === "string" && plugin.name.length > 0, "plugin manifest must have a non-empty name", errors);
    assert(typeof plugin.version === "string" && plugin.version.length > 0, "plugin manifest must have a non-empty version", errors);
    assert(Array.isArray(plugin.skills) && plugin.skills.length > 0, "plugin manifest must have a non-empty skills array", errors);

    assert(schema.type === "object", "plugin configSchema must describe an object", errors);
    assert(props.bossTitle?.default === DEFAULT_BOSS_TITLE, "plugin configSchema must default bossTitle to Boss", errors);
    assert(props.watchSelfTitle?.default === DEFAULT_WATCH_SELF_TITLE, "plugin configSchema must default watchSelfTitle to WatchAgent", errors);
    assert(props.chatAgentName?.default === DEFAULT_CHAT_AGENT_NAME, "plugin configSchema must default chatAgentName to ChatAgent", errors);
    assert(props.watchAgentName?.default === DEFAULT_WATCH_AGENT_NAME, "plugin configSchema must default watchAgentName to WatchAgent", errors);
    assert(props.approvalMode?.default === DEFAULT_APPROVAL_MODE, "plugin configSchema must default approvalMode to hybrid", errors);
    assert(
      Array.isArray(props.approvalMode?.enum) && props.approvalMode.enum.includes(DEFAULT_APPROVAL_MODE),
      "plugin configSchema approvalMode enum must include hybrid",
      errors
    );
    assert(props.externalChannels?.type === "array", "plugin configSchema must define externalChannels as an array", errors);
    assert(
      Array.isArray(props.externalChannels?.default) &&
        props.externalChannels.default.join(",") === DEFAULT_EXTERNAL_CHANNELS.join(","),
      "plugin configSchema must default externalChannels to feishu,telegram",
      errors
    );
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}
