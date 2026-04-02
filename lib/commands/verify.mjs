import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { buildVerificationReport } from "../diagnostics.mjs";

function printIssue(issue) {
  const prefix = issue.severity === "error" ? log.symbols.cross : log.symbols.warn;
  const label = issue.severity === "error" ? log.red(issue.message) : log.yellow(issue.message);
  console.log(`  ${prefix} ${label}`);
  if (issue.detail) {
    log.detail(issue.detail);
  }
}

function printCheck(check) {
  const prefix = check.ok ? log.symbols.tick : log.symbols.cross;
  const label = check.ok ? log.green(check.label) : log.red(check.label);
  console.log(`  ${prefix} ${label}`);
  if (check.detail) {
    log.detail(check.detail);
  }
}

/**
 * Strictly verify whether the active OpenClaw runtime can use Jinyiwei correctly.
 * @param {string[]} [args]
 * @returns {number}
 */
export function verifyCommand(args = []) {
  const isJson = args.includes("--json");
  const report = buildVerificationReport();
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  } catch {
    pkg = { version: "unknown" };
  }

  if (isJson) {
    const errors = report.issues.filter((item) => item.severity === "error");
    console.log(JSON.stringify({
      ok: report.ok,
      version: pkg.version,
      checks: report.checks,
      issues: report.issues,
      guidance: report.guidance,
      openclaw: {
        version: report.state.version,
        configFile: report.state.configFile,
        defaultAgent: report.state.jinyiwei.defaultAgent?.name || null,
        plugin: report.state.jinyiwei.plugin,
        agents: report.state.jinyiwei.agents,
        channels: report.state.channels,
      },
      errors,
    }, null, 2));
    return report.ok ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
  }

  log.banner(pkg.version);
  console.log(`  ${log.bold(t("verify.title"))}`);
  console.log();

  for (const check of report.checks) {
    printCheck(check);
  }

  if (report.issues.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("verify.issues"))}`);
    console.log();
    for (const issue of report.issues) {
      printIssue(issue);
    }
  }

  if (report.guidance.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("verify.guidance"))}`);
    console.log();
    for (const item of report.guidance) {
      log.detail(item);
    }
  }

  console.log();
  log.summary(report.ok ? "ok" : "fail", report.ok ? t("verify.readyOk") : t("verify.readyFail"));
  return report.ok ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
}
