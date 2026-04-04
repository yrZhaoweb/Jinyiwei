import * as readline from "node:readline";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import {
  listModels,
  setModel,
  removeModel,
  maskModel,
  validateModel,
  VALID_PROVIDERS,
} from "../models.mjs";
import { discoverGroups } from "../groups.mjs";

const AGENT_IDS = ["chat", "watch"];

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function modelCommand(args = []) {
  const isJson = args.includes("--json");
  const subCommand = args[0];

  if (!subCommand || subCommand === "list") {
    return listModelsCmd(args, isJson);
  }

  if (subCommand === "add" || subCommand === "set") {
    return setOrAddModelCmd(args, isJson);
  }

  if (subCommand === "remove" || subCommand === "rm" || subCommand === "delete") {
    return removeModelCmd(args, isJson);
  }

  if (subCommand === "help" || subCommand === "--help" || subCommand === "-h") {
    printModelHelp(isJson);
    return ExitCode.OK;
  }

  if (isJson) {
    console.log(JSON.stringify({ ok: false, error: t("model.error.unknownSubCommand") + ": " + subCommand }, null, 2));
  } else {
    log.fail(t("model.error.unknownSubCommand") + ": " + subCommand);
    printModelHelp(false);
  }
  return ExitCode.USER_ERROR;
}

function listModelsCmd(args, isJson) {
  const models = listModels();
  const { groups } = discoverGroups();
  const groupNames = Object.keys(groups);

  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      models: {
        chat: maskModel(models.chat) || null,
        watch: maskModel(models.watch) || null,
        groups: Object.fromEntries(
          Object.entries(models.groups || {}).map(([k, v]) => [k, maskModel(v) || null])
        ),
      },
    }, null, 2));
    return ExitCode.OK;
  }

  console.log();
  console.log(`  ${log.bold(t("model.title"))}`);
  console.log();

  // Built-in agents
  for (const agentId of AGENT_IDS) {
    const model = models[agentId];
    if (model) {
      printModelRow(agentId, model);
    } else {
      console.log(`  ${log.cyan(agentId.padEnd(16))}  ${log.dim(t("model.notSet"))}`);
    }
  }

  // Group agents
  if (groupNames.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("model.groups"))}`);
    console.log();
    for (const groupName of groupNames) {
      const model = models.groups?.[groupName];
      if (model) {
        printModelRow(`${groupName}*`, model);
        console.log(`    ${log.dim(t("model.groupLabel"))}`);
      } else {
        console.log(`  ${log.cyan((groupName + "*").padEnd(16))}  ${log.dim(t("model.notSet"))}`);
        console.log(`    ${log.dim(t("model.groupLabel"))}`);
      }
    }
  }

  console.log();
  console.log(`  ${log.dim("* " + t("model.inheritNote"))}`);
  console.log();
  return ExitCode.OK;
}

/**
 * @param {string[]} args
 * @param {boolean} isJson
 * @returns {Promise<number>}
 */
async function setOrAddModelCmd(args, isJson) {
  // Parse: model [add|set] <agentId> [--provider <p>] [--base-url <u>] [--api-key <k>] [--model-id <m>]
  // Or:     model <agentId> [--provider <p>] [--base-url <u>] [--api-key <k>] [--model-id <m>]
  let agentId;
  let subCmd;
  const remaining = [];

  if (args[0] === "add" || args[0] === "set") {
    subCmd = args[0];
    agentId = args[1];
    remaining.push(...args.slice(2));
  } else {
    subCmd = "set";
    agentId = args[0];
    remaining.push(...args.slice(1));
  }

  if (!agentId || agentId.startsWith("--")) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("model.error.agentRequired") }, null, 2));
    } else {
      log.fail(t("model.error.agentRequired"));
    }
    return ExitCode.USER_ERROR;
  }

  const { groups } = discoverGroups();
  const groupNames = Object.keys(groups);
  const validAgentIds = [...AGENT_IDS, ...groupNames];

  if (!validAgentIds.includes(agentId)) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: t("model.error.invalidAgent") + ": " + agentId,
        validIds: validAgentIds,
      }, null, 2));
    } else {
      log.fail(t("model.error.invalidAgent") + ": " + agentId);
      console.log("  " + t("model.error.validAgents") + ": " + validAgentIds.join(", "));
    }
    return ExitCode.USER_ERROR;
  }

  // Parse flags
  const flags = parseFlags(remaining);
  const provider = flags.provider || flags.p;
  const baseURL = flags["base-url"] || flags.baseurl || flags.u;
  const apiKey = flags["api-key"] || flags.apikey || flags.k;
  const modelId = flags["model-id"] || flags["modelid"] || flags.m || flags["model"];

  if (!provider || !modelId) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "--provider and --model-id are required" }, null, 2));
    } else {
      log.fail(t("model.error.providerAndModelIdRequired"));
    }
    return ExitCode.USER_ERROR;
  }

  if (!VALID_PROVIDERS.includes(provider)) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: t("model.error.invalidProvider") + ": " + provider,
        validProviders: VALID_PROVIDERS,
      }, null, 2));
    } else {
      log.fail(t("model.error.invalidProvider") + ": " + provider);
      console.log("  " + t("model.error.validProviders") + ": " + VALID_PROVIDERS.join(", "));
    }
    return ExitCode.USER_ERROR;
  }

  const modelConfig = {
    provider,
    baseURL: baseURL || "",
    apiKey: apiKey || "",
    modelId,
  };

  const validation = validateModel(modelConfig, agentId);
  if (!validation.ok) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, errors: validation.errors }, null, 2));
    } else {
      log.fail(t("model.error.validationFailed"));
      for (const err of validation.errors) {
        log.detail(err);
      }
    }
    return ExitCode.USER_ERROR;
  }

  const result = setModel(agentId, modelConfig, { sync: true });

  if (isJson) {
    console.log(JSON.stringify({
      ok: result.ok,
      agentId,
      model: maskModel(modelConfig),
      synced: result.synced,
      errors: result.errors || undefined,
      warning: result.warning || undefined,
    }, null, 2));
    return result.ok ? ExitCode.OK : ExitCode.INSTALL_FAIL;
  }

  if (result.ok) {
    log.ok(t("model.setOk") + " " + log.cyan(agentId) + " (" + provider + ":" + modelId + ")");
    if (result.warning) {
      log.warn(result.warning);
    }
    if (result.synced) {
      log.info(t("model.syncedToOpenClaw"));
    }
  } else {
    log.fail(t("model.error.setFailed"));
    for (const err of (result.errors || [])) {
      log.detail(err);
    }
  }
  return result.ok ? ExitCode.OK : ExitCode.INSTALL_FAIL;
}

function removeModelCmd(args, isJson) {
  // model remove <agentId>
  const agentId = args[1];
  const { groups } = discoverGroups();
  const groupNames = Object.keys(groups);
  const validAgentIds = [...AGENT_IDS, ...groupNames];

  if (!agentId || agentId.startsWith("--")) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("model.error.agentRequired") }, null, 2));
    } else {
      log.fail(t("model.error.agentRequired"));
    }
    return ExitCode.USER_ERROR;
  }

  if (!validAgentIds.includes(agentId)) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: t("model.error.invalidAgent") + ": " + agentId,
        validIds: validAgentIds,
      }, null, 2));
    } else {
      log.fail(t("model.error.invalidAgent") + ": " + agentId);
      console.log("  " + t("model.error.validAgents") + ": " + validAgentIds.join(", "));
    }
    return ExitCode.USER_ERROR;
  }

  const models = listModels();
  const current = agentId === "chat" || agentId === "watch"
    ? models[agentId]
    : models.groups?.[agentId];

  if (!current) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("model.error.noModelConfigured") + ": " + agentId }, null, 2));
    } else {
      log.warn(t("model.error.noModelConfigured") + ": " + agentId);
    }
    return ExitCode.USER_ERROR;
  }

  const result = removeModel(agentId, { sync: true });

  if (isJson) {
    console.log(JSON.stringify({
      ok: result.ok,
      agentId,
      previousModel: maskModel(current),
    }, null, 2));
  } else {
    log.ok(`${t("model.removed")} ${log.cyan(agentId)}`);
  }

  return result.ok ? ExitCode.OK : ExitCode.INSTALL_FAIL;
}

function printModelRow(agentId, model) {
  const masked = maskModel(model);
  console.log(`  ${log.cyan(agentId.padEnd(16))}  ${masked.provider}:${masked.modelId}`);
  if (masked.baseURL) {
    console.log(`    ${log.dim("baseURL: " + masked.baseURL)}`);
  }
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.replace(/^--+/, "");
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      const key = arg.replace(/^-+/, "");
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function printModelHelp(isJson) {
  if (isJson) {
    console.log(JSON.stringify({
      usage: "jinyiwei model [list|add|set|remove|help] [agentId] [flags]",
      subCommands: ["list", "add", "set", "remove"],
      examples: [
        "jinyiwei model list",
        "jinyiwei model add chat --provider anthropic --model-id claude-sonnet-4-6",
        "jinyiwei model set watch --provider openai --model-id gpt-4o --api-key sk-... --base-url https://api.openai.com/v1",
        "jinyiwei model remove dev",
      ],
      flags: {
        "--provider, --p": "Provider name (openai, anthropic, google, deepseek, minimax, custom)",
        "--base-url, --u": "API base URL (required for custom provider)",
        "--api-key, --k": "API key for the provider",
        "--model-id, --m": "Model identifier (required)",
      },
    }, null, 2));
    return;
  }

  console.log();
  console.log(`  ${log.bold(t("model.helpTitle"))}`);
  console.log();
  console.log(`  ${log.cyan("jinyiwei model list")}               ${t("model.helpList")}`);
  console.log(`  ${log.cyan("jinyiwei model add <agentId>")}      ${t("model.helpAdd")}`);
  console.log(`  ${log.cyan("jinyiwei model set <agentId>")}      ${t("model.helpSet")}`);
  console.log(`  ${log.cyan("jinyiwei model remove <agentId>")}   ${t("model.helpRemove")}`);
  console.log();
  console.log(`  ${log.bold("Flags:")}`);
  console.log(`    ${log.yellow("--provider")}, ${log.yellow("-p")}    ${t("model.flagProvider")}`);
  console.log(`    ${log.yellow("--base-url")}, ${log.yellow("-u")}   ${t("model.flagBaseUrl")}`);
  console.log(`    ${log.yellow("--api-key")}, ${log.yellow("-k")}    ${t("model.flagApiKey")}`);
  console.log(`    ${log.yellow("--model-id")}, ${log.yellow("-m")}    ${t("model.flagModelId")}`);
  console.log();
  console.log(`  ${log.bold(t("model.helpExamples"))}`);
  console.log(`    ${log.dim("jinyiwei model add chat --provider anthropic --model-id claude-sonnet-4-6")}`);
  console.log(`    ${log.dim("jinyiwei model set dev --provider deepseek --model-id deepseek-chat --api-key sk-...")}`);
  console.log(`    ${log.dim("jinyiwei model remove watch")}`);
  console.log();
}
