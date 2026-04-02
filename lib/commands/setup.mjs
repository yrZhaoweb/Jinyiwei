import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { installCommand } from "./install.mjs";
import { validateCommand } from "./validate.mjs";
import { statusCommand } from "./status.mjs";
import { configureCommand } from "./configure.mjs";
import { verifyCommand } from "./verify.mjs";
import * as openclaw from "../openclaw.mjs";
import {
  buildStartGuideLines,
  buildStartGuidePayload,
  captureCommand,
  ensureWorkspace,
  parseOnboardingArgs,
  readOptionValue,
  normalizeEntryAgentId,
} from "./onboarding.mjs";

/**
 * Read a JSON payload emitted by a child command.
 * @param {string} text
 * @returns {any}
 */
function readJson(text) {
  if (!text.trim()) return null;
  return JSON.parse(text);
}

/**
 * Format a compact summary for non-JSON setup output.
 * @param {any} installResult
 * @param {any} configurationResult
 * @param {any} entryResult
 * @param {any} governanceValidationResult
 * @param {any} verificationResult
 * @param {any} statusResult
 */
function printCompactSummary(installResult, configurationResult, entryResult, governanceValidationResult, verificationResult, statusResult) {
  log.summary("ok", t("setup.compactReady"));
  console.log(`  ${log.bold(t("setup.installation"))}`);
  console.log(`    ${log.symbols.arrow} ${installResult.dryRun ? t("setup.dryRunCompleted") : t("setup.installedIntoWorkspace")}`);
  if (Array.isArray(installResult.agents) && installResult.agents.length > 0) {
    console.log(`    ${log.symbols.arrow} ${t("setup.agents")}: ${installResult.agents.map((agent) => agent.agent).join(", ")}`);
  }

  console.log();
  console.log(`  ${log.bold(t("setup.configuration"))}`);
  console.log(`    ${log.symbols.arrow} Boss title: ${configurationResult?.config?.bossTitle || statusResult?.config?.bossTitle || "Boss"}`);
  console.log(`    ${log.symbols.arrow} Approval mode: ${configurationResult?.config?.approvalMode || statusResult?.config?.approvalMode || "hybrid"}`);
  console.log(`    ${log.symbols.arrow} External channels: ${(configurationResult?.config?.externalChannels || statusResult?.config?.externalChannels || []).join(", ") || "none"}`);
  console.log(`    ${log.symbols.arrow} Default entry: ${entryResult?.defaultEntry || statusResult?.openclaw?.defaultAgent || "unknown"}`);

  console.log();
  console.log(`  ${log.bold(t("setup.verification"))}`);
  console.log(`    ${log.symbols.arrow} ${t("setup.governanceFilesLabel")}: ${governanceValidationResult?.ok ? "ok" : "failed"}`);
  console.log(`    ${log.symbols.arrow} ${t("setup.runtimeReadiness")}: ${verificationResult?.ok ? "ready" : "needs attention"}`);
  console.log(`    ${log.symbols.arrow} ${t("setup.agentsRegistered")}: ${Array.isArray(statusResult?.registeredAgents) ? statusResult.registeredAgents.length : 0}`);
}

/**
 * Productized one-shot onboarding flow.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function setupCommand(args = []) {
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const { workspace, workspaceSource, isJson, flags } = parseOnboardingArgs(args);
  const installFlags = flags.filter((flag) => ["--dry-run", "--skip-plugin", "--skip-skills", "--copy", "--verbose"].includes(flag));
  const isDryRun = installFlags.includes("--dry-run");
  const shouldCreateDefaultWorkspace = workspaceSource === "default" && !isDryRun;
  const requestedEntry = flags.includes("--keep-main")
    ? "main"
    : normalizeEntryAgentId(readOptionValue(args, ["--entry", "--set-default-entry"])) || "chat";

  if (!isJson) {
    log.banner(pkg.version);
    console.log(`  ${log.bold(t("setup.title"))}`);
    console.log(`  ${log.dim(t("setup.description"))}`);
    console.log();
  }

  ensureWorkspace(workspace, shouldCreateDefaultWorkspace);

  if (!isJson) {
    log.step(1, 5, t("setup.step.install"));
  }
  const installRun = await captureCommand(() => installCommand([workspace, ...installFlags, "--json"]));
  let installJson;
  try {
    installJson = readJson(installRun.stdout);
  } catch (error) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "install", error: String(error) }, null, 2));
    } else {
      log.fail(t("setupFailedInstall"));
      log.detail(String(error));
    }
    return ExitCode.INSTALL_FAIL;
  }

  if (installRun.code !== ExitCode.OK || !installJson?.ok) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "install", result: installJson }, null, 2));
    } else {
      log.fail(t("setup.stepFailed"));
      log.detail(`Workspace: ${workspace}`);
    }
    return installRun.code || ExitCode.INSTALL_FAIL;
  }

  let configurationRun;
  let configurationJson = null;
  if (isJson || isDryRun) {
    configurationRun = await captureCommand(() => configureCommand(["--json"]));
    try {
      configurationJson = readJson(configurationRun.stdout);
    } catch {
      configurationJson = null;
    }
  } else {
    console.log();
    console.log(`  ${log.bold(t("setup.step.configure"))}`);
    console.log(`  ${log.dim(t("setup.step.configureDesc"))}`);
    console.log();
    configurationRun = { code: await configureCommand([]), stdout: "", stderr: "" };
  }

  if (configurationRun.code !== ExitCode.OK) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "configure" }, null, 2));
    } else {
      log.fail(t("setup.stepFailedConfigure"));
    }
    return configurationRun.code || ExitCode.USER_ERROR;
  }

  let entryResult = {
    ok: false,
    defaultEntry: requestedEntry,
    skipped: true,
  };

  if (!isJson) {
    log.step(3, 6, "Align the default entry");
  }

  if (!isDryRun && openclaw.hasOpenClaw()) {
    const result = openclaw.setDefaultAgent(requestedEntry);
    entryResult = {
      ok: result.ok,
      defaultEntry: requestedEntry,
      skipped: false,
      error: result.ok ? undefined : result.stderr || "Failed to update the default entry",
    };

    if (!result.ok) {
      if (isJson) {
        console.log(JSON.stringify({ ok: false, step: "entry", result: entryResult }, null, 2));
      } else {
        log.fail(t("setupDefaultEntryFailed"));
        log.detail(entryResult.error || "Unknown error");
      }
      return ExitCode.INSTALL_FAIL;
    }
  } else {
    entryResult = {
      ok: !isDryRun,
      defaultEntry: requestedEntry,
      skipped: true,
      reason: isDryRun ? "dry-run" : t("setupEntrySkipped"),
    };
  }

  if (!isJson) {
    log.step(4, 6, t("setup.step.validate"));
  }
  const governanceValidationRun = await captureCommand(() => validateCommand(["--json"]));
  let governanceValidationJson;
  try {
    governanceValidationJson = readJson(governanceValidationRun.stdout || governanceValidationRun.stderr);
  } catch (error) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "validate", error: String(error) }, null, 2));
    } else {
      log.fail(t("setup.stepFailedValidate"));
      log.detail(String(error));
    }
    return ExitCode.VALIDATION_FAIL;
  }

  if (governanceValidationRun.code !== ExitCode.OK || !governanceValidationJson?.ok) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "validate", result: governanceValidationJson }, null, 2));
    } else {
      log.fail(t("setup.stepFailedValidate"));
      if (governanceValidationJson?.errors) {
        for (const error of governanceValidationJson.errors) log.detail(error);
      }
    }
    return governanceValidationRun.code || ExitCode.VALIDATION_FAIL;
  }

  if (!isJson) {
    log.step(5, 6, t("setup.step.verify"));
  }
  const verificationRun = await captureCommand(() => verifyCommand(["--json"]));
  let verificationJson;
  try {
    verificationJson = readJson(verificationRun.stdout || verificationRun.stderr);
  } catch (error) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "verify", error: String(error) }, null, 2));
    } else {
      log.fail(t("setup.stepFailedVerify"));
      log.detail(String(error));
    }
    return ExitCode.VALIDATION_FAIL;
  }

  if (verificationRun.code !== ExitCode.OK || !verificationJson?.ok) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "verify", result: verificationJson }, null, 2));
    } else {
      log.fail(t("setup.stepFailedVerify"));
      for (const issue of verificationJson?.issues || []) {
        log.detail(issue.message || String(issue));
      }
    }
    return verificationRun.code || ExitCode.VALIDATION_FAIL;
  }

  if (!isJson) {
    log.step(6, 6, t("setup.step.showGuide"));
  }
  const statusRun = await captureCommand(() => statusCommand(["--json"]));
  let statusJson;
  try {
    statusJson = readJson(statusRun.stdout);
  } catch (error) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "status", error: String(error) }, null, 2));
    } else {
      log.fail(t("setup.stepFailedStatus"));
      log.detail(String(error));
    }
    return ExitCode.VALIDATION_FAIL;
  }

  if (statusRun.code !== ExitCode.OK || !statusJson?.version) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, step: "status", result: statusJson }, null, 2));
    } else {
      log.fail(t("setup.stepFailedStatus"));
    }
    return statusRun.code || ExitCode.VALIDATION_FAIL;
  }

  const startGuidePayload = buildStartGuidePayload({
    workspace,
    installation: installJson,
    configuration: configurationJson,
    validation: verificationJson,
    status: statusJson,
  });

  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      workspace,
      installation: installJson,
      configuration: configurationJson,
      entry: entryResult,
      governanceValidation: governanceValidationJson,
      verification: verificationJson,
      status: statusJson,
      startGuide: startGuidePayload,
    }, null, 2));
    return ExitCode.OK;
  }

  printCompactSummary(installJson, configurationJson, entryResult, governanceValidationJson, verificationJson, statusJson);
  console.log();
  console.log(`  ${log.bold("First-use guide")}`);
  for (const line of buildStartGuideLines({
    workspace,
    installation: installJson,
    configuration: configurationJson,
    entry: entryResult,
    validation: verificationJson,
    status: statusJson,
  })) {
    if (!line) {
      console.log();
    } else if (/^\d+\./.test(line) || line.startsWith("- ")) {
      console.log(`    ${line}`);
    } else {
      console.log(`  ${line}`);
    }
  }
  console.log();
  return ExitCode.OK;
}
