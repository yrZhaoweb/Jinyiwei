import * as readline from "node:readline";
import * as fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { discoverGroups } from "../groups.mjs";
import { listModels } from "../models.mjs";
import { hasOpenClaw } from "../openclaw.mjs";
import { execOpenClaw } from "../lifecycle.mjs";

const EXTERNAL_AGENTS = ["chat", "watch"];
const INTERNAL_GROUPS = Object.keys(discoverGroups());

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function chatCommand(args = []) {
  const agentId = args[0];
  const isJson = args.includes("--json");

  if (!agentId || agentId === "help" || agentId === "--help" || agentId === "-h") {
    printChatHelp(isJson);
    return ExitCode.OK;
  }

  const validIds = [...EXTERNAL_AGENTS, ...INTERNAL_GROUPS];

  if (!validIds.includes(agentId)) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: "unknown agent: " + agentId,
        validAgents: validIds,
      }, null, 2));
    } else {
      log.fail("Unknown agent: " + agentId);
      console.log("  Valid agents: " + validIds.join(", "));
    }
    return ExitCode.USER_ERROR;
  }

  if (!hasOpenClaw()) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "openclaw CLI not available" }, null, 2));
    } else {
      log.fail(t("chat.error.openclawRequired"));
    }
    return ExitCode.INSTALL_FAIL;
  }

  // Check if agent is registered in OpenClaw
  const agentsList = execOpenClaw(["agents", "list", "--json"]);
  let agents = [];
  try {
    const parsed = JSON.parse(agentsList.stdout || "{}");
    agents = Array.isArray(parsed) ? parsed : parsed?.agents || [];
  } catch {
    agents = [];
  }

  const knownIds = new Set(agents.map((a) => a.id));
  if (!knownIds.has(agentId)) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "agent '" + agentId + "' is not registered in OpenClaw" }, null, 2));
    } else {
      log.fail("Agent '" + agentId + "' is not registered in OpenClaw.");
      const registered = validIds.filter((id) => knownIds.has(id));
      console.log("  Run 'jinyiwei install' first, or use one of: " + (registered.join(", ") || "none registered"));
    }
    return ExitCode.INSTALL_FAIL;
  }

  const models = listModels();
  const model = agentId === "chat" || agentId === "watch"
    ? models[agentId]
    : models.groups?.[agentId];

  if (!model || !model.modelId) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "no model configured for agent '" + agentId + "'" }, null, 2));
    } else {
      log.fail("No model configured for agent '" + agentId + "'.");
      console.log("  Run 'jinyiwei model add " + agentId + " --provider ... --model-id ...' to set a model first.");
    }
    return ExitCode.INSTALL_FAIL;
  }

  // Launch interactive chat via OpenClaw
  return launchChat(agentId, model, isJson);
}

/**
 * @param {string} agentId
 * @param {{ provider: string, modelId: string, baseURL?: string, apiKey?: string }} model
 * @param {boolean} isJson
 * @returns {Promise<number>}
 */
async function launchChat(agentId, model, isJson) {
  if (!isJson) {
    console.log();
    console.log("  " + log.bold(t("chat.title")) + " " + log.cyan(agentId));
    console.log("  " + log.dim("Model: " + model.provider + ":" + model.modelId));
    console.log();
    console.log("  " + log.dim(t("chat.typeQuit")));
    console.log();
  }

  // Try to open OpenClaw web UI for chat
  const webUrlResult = execOpenClaw(["chat", "--agent", agentId, "--print-url"]);
  let chatUrl = null;
  if (webUrlResult.ok && webUrlResult.stdout) {
    const urlMatch = webUrlResult.stdout.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      chatUrl = urlMatch[0];
    }
  }

  if (chatUrl) {
    // Open the browser
    if (!isJson) {
      console.log("  " + t("chat.openingBrowser"));
      console.log("  " + log.cyan(chatUrl));
      console.log();
    }
    try {
      const { exec: execSync } = await import("node:child_process");
      execSync("open", [chatUrl], { stdio: "ignore" });
    } catch {
      // Fallback: just print URL
    }

    if (isJson) {
      console.log(JSON.stringify({
        ok: true,
        agentId,
        chatUrl,
        instructions: "Open the URL in a browser to start chatting",
      }, null, 2));
    } else {
      console.log("  " + log.dim(t("chat.browserOpened")));
    }
    return ExitCode.OK;
  }

  // Fallback: interactive CLI chat using readline
  if (isJson) {
    console.log(JSON.stringify({
      ok: false,
      error: "OpenClaw web chat not available. Set up channel configuration in OpenClaw first.",
    }, null, 2));
    return ExitCode.USER_ERROR;
  }

  log.warn(t("chat.webNotAvailable"));
  console.log("  " + log.dim(t("chat.cliMode")));
  console.log();

  return cliChatLoop(agentId, model);
}

/**
 * @param {string} agentId
 * @param {{ provider: string, modelId: string }} model
 * @returns {Promise<number>}
 */
async function cliChatLoop(agentId, model) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

  console.log("  " + log.dim("---"));
  console.log();

  while (true) {
    const input = await question("  " + log.cyan("you") + ": ");

    if (!input || input.trim().toLowerCase() === "exit" || input.trim().toLowerCase() === "quit" || input.trim() === "q") {
      rl.close();
      console.log();
      console.log("  " + log.dim(t("chat.sessionEnded")));
      console.log();
      return ExitCode.OK;
    }

    if (!input.trim()) {
      continue;
    }

    // Send to OpenClaw agent
    const result = execOpenClaw([
      "chat",
      "--agent", agentId,
      "--model", model.provider + ":" + model.modelId,
      "--message", input,
      "--json",
    ]);

    if (result.ok && result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout);
        const response = parsed.response || parsed.message || parsed.text || JSON.stringify(parsed, null, 2);
        console.log();
        console.log("  " + log.green(agentId) + ": " + response);
        console.log();
      } catch {
        console.log();
        console.log("  " + log.green(agentId) + ": " + result.stdout.substring(0, 500));
        console.log();
      }
    } else {
      console.log();
      console.log("  " + log.red("error") + ": " + (result.stderr || "failed to get response"));
      console.log();
    }
  }
}

function printChatHelp(isJson) {
  const groups = discoverGroups();
  const allAgents = [...EXTERNAL_AGENTS, ...Object.keys(groups)];

  if (isJson) {
    console.log(JSON.stringify({
      usage: "jinyiwei chat <agent>",
      agents: allAgents,
      examples: [
        "jinyiwei chat chat",
        "jinyiwei chat watch",
        "jinyiwei chat dev",
      ],
    }, null, 2));
    return;
  }

  console.log();
  console.log("  " + log.bold(t("chat.helpTitle")));
  console.log();
  console.log("  " + log.cyan("jinyiwei chat <agent>") + "   " + t("chat.helpStart"));
  console.log();
  console.log("  " + log.bold("Available agents:"));
  for (const id of EXTERNAL_AGENTS) {
    console.log("    " + log.cyan(id.padEnd(16)) + "  external");
  }
  for (const [group, info] of Object.entries(groups)) {
    const agentNames = (info.agents || []).map((a) => a.name).join(", ");
    console.log("    " + log.cyan(group.padEnd(16)) + "  " + log.dim("group: " + (agentNames || "(empty)")));
  }
  console.log();
  console.log("  " + log.bold(t("chat.helpExamples")));
  console.log("    " + log.dim("jinyiwei chat chat") + "        " + t("chat.helpExampleChat"));
  console.log("    " + log.dim("jinyiwei chat dev") + "         " + t("chat.helpExampleGroup"));
  console.log();
}
