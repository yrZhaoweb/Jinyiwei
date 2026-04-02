import fs from "node:fs";
import { resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { buildDiagnosticReport } from "../diagnostics.mjs";

function printCheck(check) {
  const symbol = check.ok ? log.symbols.tick : log.symbols.cross;
  const label = check.ok ? log.green(check.label) : log.red(check.label);
  console.log(`  ${symbol} ${label}`);
  if (check.detail) {
    log.detail(check.detail);
  }
}

/**
 * Run a beginner-friendly health check for Jinyiwei + OpenClaw.
 * @param {string[]} [args]
 * @returns {number}
 */
export function doctorCommand(args = []) {
  const isJson = args.includes("--json");
  const report = buildDiagnosticReport();
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  } catch {
    pkg = { version: "unknown" };
  }

  if (isJson) {
    console.log(JSON.stringify({
      ok: report.ok,
      version: pkg.version,
      checks: report.checks,
      diagnostics: report.state.diagnostics,
      guidance: report.guidance,
      openclaw: {
        version: report.state.version,
        configFile: report.state.configFile,
        defaultAgent: report.state.jinyiwei.defaultAgent?.name || null,
        channels: report.state.channels,
      },
    }, null, 2));
    return report.ok ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
  }

  log.banner(pkg.version);
  console.log(`  ${log.bold(t("doctor.title"))}`);
  console.log();
  console.log(`  ${log.bold(t("doctor.checks"))}`);
  console.log();
  for (const check of report.checks) {
    printCheck(check);
  }

  if (report.state.diagnostics.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("doctor.diagnostics"))}`);
    console.log();
    for (const item of report.state.diagnostics) {
      const line = `${item.severity.toUpperCase()}: ${item.message}`;
      if (item.severity === "error") {
        log.fail(line);
      } else {
        log.warn(line);
      }
      if (item.detail) {
        log.detail(item.detail);
      }
    }
  }

  if (report.guidance.length > 0) {
    console.log();
    console.log(`  ${log.bold(t("doctor.guidance"))}`);
    console.log();
    for (const item of report.guidance) {
      log.detail(item);
    }
  }

  console.log();
  log.summary(report.ok ? "ok" : "fail", report.ok ? t("doctor.healthy") : t("doctor.needsAttention"));
  return report.ok ? ExitCode.OK : ExitCode.VALIDATION_FAIL;
}
