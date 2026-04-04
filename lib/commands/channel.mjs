import * as readline from "node:readline";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import {
  listChannels,
  setChannel,
  removeChannel,
  maskChannels,
  validateChannel,
  findChannelAgent,
} from "../models.mjs";

const CHANNEL_TYPES = ["feishu", "telegram"];

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function channelCommand(args = []) {
  const isJson = args.includes("--json");
  const subCommand = args[0];

  if (!subCommand || subCommand === "list") {
    return listChannelsCmd(args, isJson);
  }

  if (subCommand === "add" || subCommand === "set") {
    return setOrAddChannelCmd(args, isJson);
  }

  if (subCommand === "remove" || subCommand === "rm" || subCommand === "delete") {
    return removeChannelCmd(args, isJson);
  }

  if (subCommand === "help" || subCommand === "--help" || subCommand === "-h") {
    printChannelHelp(isJson);
    return ExitCode.OK;
  }

  if (isJson) {
    console.log(JSON.stringify({ ok: false, error: `unknown sub-command: ${subCommand}` }, null, 2));
  } else {
    log.fail(`Unknown sub-command: ${subCommand}`);
    printChannelHelp(false);
  }
  return ExitCode.USER_ERROR;
}

function listChannelsCmd(args, isJson) {
  const channels = listChannels();

  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      channels: maskChannels(channels),
      channelAgents: {
        feishu: findChannelAgent("feishu"),
        telegram: findChannelAgent("telegram"),
      },
    }, null, 2));
    return ExitCode.OK;
  }

  console.log();
  console.log("  " + log.bold(t("channel.title")));
  console.log();

  if (!channels.feishu && !channels.telegram) {
    console.log("  " + log.dim(t("channel.noneConfigured")));
    console.log();
    return ExitCode.OK;
  }

  if (channels.feishu) {
    const f = channels.feishu;
    const feishuAgent = findChannelAgent("feishu");
    console.log("  " + log.bold(t("channel.feishu")));
    if (feishuAgent) {
      console.log("    " + log.dim(t("channel.assignedTo", { agent: feishuAgent })));
    }
    if (f.webhookUrl) {
      console.log("    webhookUrl: " + log.cyan(f.webhookUrl));
    }
    if (f.botToken) {
      console.log("    botToken:   " + maskStr(f.botToken));
    }
    if (f.appId) {
      console.log("    appId:      " + f.appId);
    }
    if (f.appSecret) {
      console.log("    appSecret:  " + maskStr(f.appSecret));
    }
    console.log();
  }

  if (channels.telegram) {
    const tg = channels.telegram;
    const telegramAgent = findChannelAgent("telegram");
    console.log("  " + log.bold(t("channel.telegram")));
    if (telegramAgent) {
      console.log("    " + log.dim(t("channel.assignedTo", { agent: telegramAgent })));
    }
    if (tg.botToken) {
      console.log(`    botToken: ${maskStr(tg.botToken)}`);
    }
    if (tg.apiBase) {
      console.log(`    apiBase:  ${tg.apiBase}`);
    }
    console.log();
  }

  return ExitCode.OK;
}

/**
 * @param {string[]} args
 * @param {boolean} isJson
 * @returns {Promise<number>}
 */
async function setOrAddChannelCmd(args, isJson) {
  // channel [add|set] <type> [--agent <agentId>] [--flag value]...
  let channelType;
  let remaining;

  if (args[0] === "add" || args[0] === "set") {
    channelType = args[1];
    remaining = args.slice(2);
  } else {
    channelType = args[0];
    remaining = args.slice(1);
  }

  if (!channelType || !CHANNEL_TYPES.includes(channelType)) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: t("channel.error.channelTypeRequired") + " (" + CHANNEL_TYPES.join("|") + ")",
        validTypes: CHANNEL_TYPES,
      }, null, 2));
    } else {
      log.fail(t("channel.error.channelTypeRequired") + " (" + CHANNEL_TYPES.join(", ") + ")");
    }
    return ExitCode.USER_ERROR;
  }

  const flags = parseFlags(remaining);
  const agentId = flags.agent || flags.a;

  if (!agentId) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("channel.agentRequired") }, null, 2));
    } else {
      log.fail(t("channel.agentRequired"));
    }
    return ExitCode.USER_ERROR;
  }

  const config = channelType === "feishu" ? {
    webhookUrl: flags["webhook-url"] || flags.webhookurl || flags.w || "",
    botToken: flags["bot-token"] || flags.bottoken || flags.t || "",
    appId: flags["app-id"] || flags.appid || flags.i || "",
    appSecret: flags["app-secret"] || flags.appsecret || flags.s || "",
  } : {
    botToken: flags["bot-token"] || flags.bottoken || flags.t || "",
    apiBase: flags["api-base"] || flags.apibase || flags.b || "",
  };

  const validation = validateChannel(channelType, config);
  if (!validation.ok) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, errors: validation.errors }, null, 2));
    } else {
      log.fail(t("channel.error.validationFailed"));
      for (const err of validation.errors) {
        log.detail(err);
      }
    }
    return ExitCode.USER_ERROR;
  }

  // Check for channel conflict (channel already assigned to another agent)
  const currentAgent = findChannelAgent(channelType);
  if (currentAgent && currentAgent !== agentId) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: t("channel.conflictWarning", { channel: channelType, agent: currentAgent }),
        conflict: { channel: channelType, currentAgent, requestedAgent: agentId },
      }, null, 2));
      return ExitCode.USER_ERROR;
    } else {
      log.warn(t("channel.conflictWarning", { channel: channelType, agent: currentAgent }));
      const confirmed = await confirmOverwrite(channelType, currentAgent);
      if (!confirmed) {
        log.info(t("channel.cancelled"));
        return ExitCode.OK;
      }
      log.info(t("channel.overwriteConfirmed", { channel: channelType, fromAgent: currentAgent }));
    }
  }

  const result = setChannel(channelType, config, agentId);

  if (isJson) {
    console.log(JSON.stringify({
      ok: result.ok,
      channelType,
      agentId,
      errors: result.errors || undefined,
    }, null, 2));
  } else if (result.ok) {
    log.ok(t("channel.setOk") + " " + log.cyan(channelType) + " (" + agentId + ")");
  } else {
    log.fail(t("channel.error.setFailed"));
    for (const err of (result.errors || [])) {
      log.detail(err);
    }
  }

  return result.ok ? ExitCode.OK : ExitCode.INSTALL_FAIL;
}

/**
 * Prompt user for channel overwrite confirmation.
 * @param {string} channelType
 * @param {string} currentAgent
 * @returns {Promise<boolean>}
 */
function confirmOverwrite(channelType, currentAgent) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const prompt = t("channel.conflictPrompt", { channel: channelType, agent: currentAgent });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

function removeChannelCmd(args, isJson) {
  const channelType = args[1];

  if (!channelType || !CHANNEL_TYPES.includes(channelType)) {
    if (isJson) {
      console.log(JSON.stringify({
        ok: false,
        error: t("channel.error.channelTypeRequired") + " (" + CHANNEL_TYPES.join("|") + ")",
        validTypes: CHANNEL_TYPES,
      }, null, 2));
    } else {
      log.fail(t("channel.error.channelTypeRequired") + " (" + CHANNEL_TYPES.join(", ") + ")");
    }
    return ExitCode.USER_ERROR;
  }

  const channels = listChannels();
  const current = channels[channelType];

  if (!current) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("channel.error.notConfigured", { channel: channelType }) }, null, 2));
    } else {
      log.warn(t("channel.error.notConfigured", { channel: channelType }));
    }
    return ExitCode.USER_ERROR;
  }

  const result = removeChannel(channelType);

  if (isJson) {
    console.log(JSON.stringify({
      ok: result.ok,
      channelType,
      previousConfig: maskChannels({ [channelType]: current })[channelType],
    }, null, 2));
  } else {
    log.ok(`${t("channel.removed")} ${log.cyan(channelType)}`);
  }

  return result.ok ? ExitCode.OK : ExitCode.INSTALL_FAIL;
}

function maskStr(str) {
  if (!str) return log.dim("(empty)");
  if (str.length <= 4) return "***";
  return "***" + str.slice(-4);
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

function printChannelHelp(isJson) {
  if (isJson) {
    console.log(JSON.stringify({
      usage: "jinyiwei channel [list|add|set|remove|help] <type> [--agent <id>] [flags]",
      subCommands: ["list", "add", "set", "remove"],
      channelTypes: CHANNEL_TYPES,
      examples: [
        "jinyiwei channel list",
        "jinyiwei channel add feishu --agent chat --webhook-url https://open.feishu.cn/...",
        "jinyiwei channel add telegram --agent watch --bot-token 123456:ABC-...",
        "jinyiwei channel remove feishu",
      ],
      flags: {
        "--agent, -a": "Agent ID to assign this channel to (required)",
        // Feishu
        "--webhook-url, -w": "Feishu incoming webhook URL",
        "--bot-token, -t": "Feishu/Telegram bot token",
        "--app-id, -i": "Feishu app ID",
        "--app-secret, -s": "Feishu app secret",
        // Telegram
        "--api-base, -b": "Telegram API base URL (optional, for proxies)",
      },
    }, null, 2));
    return;
  }

  console.log();
  console.log("  " + log.bold(t("channel.helpTitle")));
  console.log();
  console.log("  " + log.cyan("jinyiwei channel list") + "              " + t("channel.helpList"));
  console.log("  " + log.cyan("jinyiwei channel add <type>") + "      " + t("channel.helpAdd"));
  console.log("  " + log.cyan("jinyiwei channel set <type>") + "       " + t("channel.helpSet"));
  console.log("  " + log.cyan("jinyiwei channel remove <type>") + "    " + t("channel.helpRemove"));
  console.log();
  console.log("  " + log.bold("Common flags:"));
  console.log("    " + log.yellow("--agent") + ", " + log.yellow("-a") + "        " + t("channel.flagAgent"));
  console.log();
  console.log("  " + log.bold(t("channel.feishuFlags")));
  console.log("    " + log.yellow("--webhook-url") + ", " + log.yellow("-w") + "   " + t("channel.flagWebhookUrl"));
  console.log("    " + log.yellow("--bot-token") + ", " + log.yellow("-t") + "     " + t("channel.flagBotToken"));
  console.log("    " + log.yellow("--app-id") + ", " + log.yellow("-i") + "        " + t("channel.flagAppId"));
  console.log("    " + log.yellow("--app-secret") + ", " + log.yellow("-s") + "   " + t("channel.flagAppSecret"));
  console.log();
  console.log("  " + log.bold(t("channel.telegramFlags")));
  console.log("    " + log.yellow("--bot-token") + ", " + log.yellow("-t") + "     " + t("channel.flagBotToken"));
  console.log("    " + log.yellow("--api-base") + ", " + log.yellow("-b") + "      " + t("channel.flagApiBase"));
  console.log();
  console.log("  " + log.bold(t("channel.helpExamples")));
  console.log("    " + log.dim("jinyiwei channel add feishu --agent chat --webhook-url https://open.feishu.cn/..."));
  console.log("    " + log.dim("jinyiwei channel add telegram --agent watch --bot-token 123456:ABC-Def"));
  console.log("    " + log.dim("jinyiwei channel remove feishu"));
  console.log();
}
