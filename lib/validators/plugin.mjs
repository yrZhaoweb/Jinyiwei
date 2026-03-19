import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";

/**
 * Validate plugin config defaults.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePlugin() {
  const errors = [];
  const plugin = JSON.parse(fs.readFileSync(resolve("openclaw.plugin.json"), "utf8"));

  assert(plugin.configSchema?.properties?.bossTitle?.default === "Boss", "plugin bossTitle default must be Boss", errors);
  assert(plugin.configSchema?.properties?.watchSelfTitle?.default === "锦衣卫", "plugin watchSelfTitle default must be 锦衣卫", errors);
  assert(plugin.configSchema?.properties?.approvalMode?.default === "hybrid", "plugin approvalMode default must be hybrid", errors);
  assert(
    JSON.stringify(plugin.configSchema?.properties?.externalIngressAgents?.default) === JSON.stringify(["ChatAgent", "WatchAgent"]),
    "plugin externalIngressAgents default must be [ChatAgent, WatchAgent]",
    errors
  );
  assert(
    JSON.stringify(plugin.configSchema?.properties?.externalChannels?.default) === JSON.stringify(["feishu", "telegram"]),
    "plugin externalChannels default must be [feishu, telegram]",
    errors
  );

  return { ok: errors.length === 0, errors };
}
