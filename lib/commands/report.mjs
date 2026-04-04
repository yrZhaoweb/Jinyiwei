import * as fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { discoverGroups } from "../groups.mjs";
import { listModels, maskModel } from "../models.mjs";
import { hasOpenClaw } from "../openclaw.mjs";
import { execOpenClaw, listOpenClawAgents } from "../lifecycle.mjs";

const EXTERNAL_AGENTS = ["chat", "watch"];

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function reportCommand(args = []) {
  const isJson = args.includes("--json");
  const agentId = args[0];

  if (!agentId || agentId === "help" || agentId === "--help" || agentId === "-h") {
    printReportHelp(isJson);
    return ExitCode.OK;
  }

  const { groups } = discoverGroups();
  const groupNames = Object.keys(groups);
  const validIds = [...EXTERNAL_AGENTS, ...groupNames];

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

  const models = listModels();
  const model = agentId === "chat" || agentId === "watch"
    ? models[agentId]
    : models.groups?.[agentId];

  if (!model || !model.modelId) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("model.error.noModelConfigured") + ": " + agentId }, null, 2));
    } else {
      log.fail(t("model.error.noModelConfigured") + ": " + agentId);
      console.log("  Run 'jinyiwei model add " + agentId + " --provider ... --model-id ...' first.");
    }
    return ExitCode.USER_ERROR;
  }

  return generateReport(agentId, model, isJson);
}

/**
 * @param {string} agentId
 * @param {{ provider: string, modelId: string }} model
 * @param {boolean} isJson
 * @returns {Promise<number>}
 */
async function generateReport(agentId, model, isJson) {
  // Try to get agent info from OpenClaw
  let agentInfo = null;
  let recentHistory = [];

  if (hasOpenClaw()) {
    const agents = listOpenClawAgents();
    agentInfo = agents.find((a) => a.id === agentId);

    // Try to get recent conversation history
    const historyResult = execOpenClaw([
      "agents",
      "history",
      "--agent", agentId,
      "--json",
      "--limit", "20",
    ]);

    if (historyResult.ok && historyResult.stdout) {
      try {
        const parsed = JSON.parse(historyResult.stdout);
        recentHistory = Array.isArray(parsed) ? parsed : parsed?.history || [];
      } catch {
        // Ignore parse errors
      }
    }
  }

  const { groups } = discoverGroups();
  const groupInfo = groups[agentId];
  const agents = groupInfo ? groupInfo.agents : [];

  const report = buildReport(agentId, {
    model,
    agentInfo,
    recentHistory,
    groupAgents: agents,
    hasOpenClaw: hasOpenClaw(),
  });

  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      report,
    }, null, 2));
    return ExitCode.OK;
  }

  printReport(report);
  return ExitCode.OK;
}

/**
 * @param {string} agentId
 * @param {{
 *   model: { provider: string, modelId: string, baseURL?: string },
 *   agentInfo?: object,
 *   recentHistory: Array<object>,
 *   groupAgents: Array<{ name: string }>,
 *   hasOpenClaw: boolean,
 * }} input
 */
function buildReport(agentId, input) {
  const { model, agentInfo, recentHistory, groupAgents, hasOpenClaw } = input;

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 7);

  // Analyze recent history for activity stats
  const actions = recentHistory.filter((h) => {
    try {
      const ts = new Date(h.timestamp || h.created_at || 0);
      return ts >= periodStart;
    } catch {
      return false;
    }
  });

  const actionCount = actions.length;
  const approvals = actions.filter((h) => h.status === "approved" || h.action === "approve").length;
  const rejections = actions.filter((h) => h.status === "rejected" || h.action === "reject").length;

  const maskedModel = maskModel(model);

  return {
    agentId,
    generatedAt: now.toISOString(),
    period: { start: periodStart.toISOString(), end: now.toISOString() },
    model: maskedModel,
    openClawRegistered: !!agentInfo,
    workspace: agentInfo?.workspace || null,
    type: groupAgents.length > 0 ? "group" : "external",
    members: groupAgents.length > 0 ? groupAgents.map((a) => a.name) : [agentId],
    activity: {
      periodDays: 7,
      totalActions: actionCount,
      approvals,
      rejections,
      autoApproved: actionCount - approvals - rejections,
    },
    openClawAvailable: hasOpenClaw,
  };
}

/**
 * @param {object} report
 */
function printReport(report) {
  console.log();
  console.log("  " + log.bold(t("report.title")) + " " + log.cyan(report.agentId));
  console.log("  " + log.dim("Generated: " + new Date(report.generatedAt).toLocaleString()));
  console.log();

  // Model info
  console.log("  " + log.bold(t("report.model")));
  console.log("    " + t("report.provider") + ":  " + report.model.provider);
  console.log("    " + t("report.modelId") + ":  " + report.model.modelId);
  if (report.model.baseURL) {
    console.log("    " + t("report.baseUrl") + ":  " + report.model.baseURL);
  }
  console.log();

  // Agent type
  console.log("  " + log.bold(t("report.agentType")));
  const typeLabel = report.type === "group" ? t("report.internalGroup") : t("report.externalAgent");
  console.log("    " + typeLabel);
  if (report.members.length > 1) {
    console.log("    " + t("report.members") + ": " + report.members.join(", "));
  }
  console.log();

  // OpenClaw status
  console.log("  " + log.bold(t("report.openClaw")));
  console.log("    " + t("report.registered") + ": " + (report.openClawRegistered ? log.green(t("report.yes")) : log.red(t("report.no"))));
  if (report.workspace) {
    console.log("    " + t("report.workspace") + ": " + report.workspace);
  }
  console.log();

  // Activity summary
  if (report.openClawAvailable) {
    const act = report.activity;
    console.log("  " + log.bold(t("report.activityTitle")) + " (" + act.periodDays + " days)");
    console.log("    " + t("report.totalActions") + ":  " + act.totalActions);
    if (act.totalActions > 0) {
      console.log("    " + t("report.approved") + ":      " + log.green(act.approvals));
      console.log("    " + t("report.rejected") + ":      " + (act.rejections > 0 ? log.red(act.rejections) : 0));
      console.log("    " + t("report.autoApproved") + ": " + log.dim(act.autoApproved));
    }
    console.log();
  } else {
    console.log("  " + log.bold(t("report.activityTitle")));
    console.log("    " + log.dim(t("report.openClawRequired")));
    console.log();
  }

  // Tips
  console.log("  " + log.bold(t("report.tips")));
  console.log("    " + log.dim("- " + t("report.tipModelList")));
  console.log("    " + log.dim("- " + t("report.tipChat").replace("{agent}", report.agentId)));
  console.log("    " + log.dim("- " + t("report.tipDoctor")));
  console.log();
}

function printReportHelp(isJson) {
  const groups = discoverGroups();
  const allAgents = [...EXTERNAL_AGENTS, ...Object.keys(groups)];

  if (isJson) {
    console.log(JSON.stringify({
      usage: "jinyiwei report <agent>",
      agents: allAgents,
      examples: [
        "jinyiwei report chat",
        "jinyiwei report watch",
        "jinyiwei report dev",
      ],
    }, null, 2));
    return;
  }

  console.log();
  console.log("  " + log.bold(t("report.helpTitle")));
  console.log();
  console.log("  " + log.cyan("jinyiwei report <agent>") + "  " + t("report.helpGenerate"));
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
  console.log("  " + log.bold(t("report.helpExamples")));
  console.log("    " + log.dim("jinyiwei report chat") + "     " + t("report.helpExampleChat"));
  console.log("    " + log.dim("jinyiwei report dev") + "      " + t("report.helpExampleGroup"));
  console.log();
}
