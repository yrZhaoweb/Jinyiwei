import fs from "node:fs";
import { resolve } from "../paths.mjs";

/** @type {string[]} */
export const requiredFiles = [
  "package.json",
  "openclaw.plugin.json",
  "openclaw-plugin.js",
  "jinyiwei.config.json",
  "bin/jinyiwei.mjs",
  "lib/paths.mjs",
  "lib/parse-skills.mjs",
  "lib/config.mjs",
  "lib/groups.mjs",
  "lib/openclaw.mjs",
  "skills/jinyiwei-governance/SKILL.md",
  "agents/chat/AGENT.md",
  "agents/watch/AGENT.md",
  "agents/groups/dev/code/AGENT.md",
  "agents/groups/dev/review/AGENT.md",
  "agents/groups/dev/test/AGENT.md",
  "agents/groups/content/ui/AGENT.md",
  "rules/addressing.md",
  "rules/action-catalog.md",
  "rules/approval-matrix.md",
  "rules/channel-access.md",
  "rules/md-control.md",
  "rules/response-contract.md",
  "rules/dispatch.md",
  "rules/audit.md",
  "rules/rejection.md",
  "rules/preinstalled-skills.md",
  "templates/approval-decision.md",
  "templates/dispatch-packet.md",
  "templates/audit-entry.md",
  "templates/rejection-decision.md",
  "templates/responses/ui-agent-response.md",
  "templates/responses/code-agent-response.md",
  "templates/responses/review-agent-response.md",
  "templates/responses/test-agent-response.md",
  "skills_list.md",
  "manifests/preinstalled-skills.json"
];

/**
 * Validate that all required files exist.
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateFiles() {
  const missing = requiredFiles.filter((file) => !fs.existsSync(resolve(file)));
  return { ok: missing.length === 0, missing };
}
