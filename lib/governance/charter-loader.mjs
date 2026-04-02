import fs from "node:fs";
import { resolve } from "../paths.mjs";

/**
 * Render a charter by replacing placeholders with config values.
 * Placeholders: {{CHAT_AGENT_NAME}}, {{WATCH_AGENT_NAME}}, {{WATCH_SELF_TITLE}}
 * @param {string} charterPath - relative path to charter file
 * @param {object} config - jinyiwei config object
 * @returns {string} rendered charter content
 */
export function renderCharter(charterPath, config) {
  const fullPath = resolve(charterPath);
  if (!fs.existsSync(fullPath)) {
    return "";
  }
  let content = fs.readFileSync(fullPath, "utf8");
  content = content.replace(/\{\{CHAT_AGENT_NAME\}\}/g, config.chatAgentName || "ChatAgent");
  content = content.replace(/\{\{WATCH_AGENT_NAME\}\}/g, config.watchAgentName || "WatchAgent");
  content = content.replace(/\{\{WATCH_SELF_TITLE\}\}/g, config.watchSelfTitle || "WatchAgent");
  return content;
}
