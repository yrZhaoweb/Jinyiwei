import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig } from "../config.mjs";
import { discoverGroups } from "../groups.mjs";
import * as openclaw from "../openclaw.mjs";
import { initCommand } from "./init.mjs";
import { readOptionValue, normalizeEntryAgentId } from "./onboarding.mjs";

/**
 * Beginner-facing configuration wizard.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function configureCommand(args = []) {
  const isJson = args.includes("--json");
  const requestedEntry = args.includes("--keep-main")
    ? "main"
    : normalizeEntryAgentId(readOptionValue(args, ["--set-default-entry", "--entry"]));

  if (requestedEntry) {
    if (!openclaw.hasOpenClaw()) {
      if (isJson) {
        console.log(JSON.stringify({ ok: false, error: "openclaw CLI not found" }, null, 2));
      } else {
        log.fail("OpenClaw CLI not found");
      }
      return ExitCode.INSTALL_FAIL;
    }

    const result = openclaw.setDefaultAgent(requestedEntry);
    if (isJson) {
      console.log(JSON.stringify({
        ok: result.ok,
        defaultEntry: requestedEntry,
        error: result.ok ? undefined : result.stderr || "Failed to update the default entry",
      }, null, 2));
    } else if (result.ok) {
      log.ok(`Default entry is now ${requestedEntry === "chat" ? "ChatAgent" : requestedEntry === "watch" ? "WatchAgent" : requestedEntry}`);
    } else {
      log.fail(result.stderr || "Failed to update the default entry");
    }
    return result.ok ? ExitCode.OK : ExitCode.INSTALL_FAIL;
  }

  if (isJson) {
    const config = loadConfig();
    const { groups } = discoverGroups();

    console.log(JSON.stringify({
      ok: true,
      mode: "snapshot",
      defaultEntry: openclaw.hasOpenClaw()
        ? (openclaw.agentsList().find((agent) => agent?.isDefault)?.id || null)
        : null,
      config,
      groups: Object.fromEntries(
        Object.entries(groups).map(([name, group]) => [
          name,
          { agents: group.agents.map((agent) => agent.name) },
        ])
      ),
      guidance: [
        "Use this command without --json for the interactive setup wizard.",
        "Keep ChatAgent for user-facing work and WatchAgent for approvals.",
      ],
    }, null, 2));

    return ExitCode.OK;
  }

  console.log();
  console.log(`  ${log.bold("Configure Jinyiwei")}`);
  console.log(`  ${log.dim("A friendly wizard for titles, approval mode, model choices, and channels.")}`);
  console.log();
  console.log(`  ${log.symbols.arrow} ${t("init.welcome")}`);
  console.log();

  return initCommand();
}
