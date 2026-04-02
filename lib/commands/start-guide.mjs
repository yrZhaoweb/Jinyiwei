import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { buildGovernanceSummary } from "../governance/summary.mjs";
import { buildStartGuideLines } from "./onboarding.mjs";

/**
 * Print the first-use guide for beginners.
 * @param {string[]} args
 * @returns {number}
 */
export function startGuideCommand(args = []) {
  const isJson = args.includes("--json");
  const summary = buildGovernanceSummary({ validation: "ok" });
  const guide = buildStartGuideLines({
    workspace: "your OpenClaw workspace",
    installation: null,
    configuration: { config: summary.config },
    validation: summary,
    status: summary,
  });

  if (isJson) {
    console.log(JSON.stringify({
      ok: true,
      version: summary.version,
      guide,
      summary,
    }, null, 2));
    return ExitCode.OK;
  }

  log.banner(summary.version);
  console.log(`  ${log.bold(t("startGuide.title"))}`);
  console.log(`  ${log.dim(t("startGuide.subtitle"))}`);
  console.log();
  for (const line of buildStartGuideLines({
    workspace: "your OpenClaw workspace",
    installation: null,
    configuration: { config: summary.config },
    validation: summary,
    status: summary,
  })) {
    if (!line) {
      console.log();
    } else if (/^\d+\./.test(line) || line.startsWith("- ")) {
      console.log(`  ${line}`);
    } else {
      console.log(`  ${line}`);
    }
  }
  console.log();
  console.log(`  ${log.symbols.info} ${t("banner.quickStart")}`);
  console.log();
  return ExitCode.OK;
}
