import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { root, resolve } from "../paths.mjs";
import { t } from "../i18n.mjs";
import { ExitCode } from "../exit-codes.mjs";
import * as log from "../log.mjs";
import { loadConfig, validateConfig } from "../config.mjs";
import { buildAgentRegistry, discoverGroups } from "../groups.mjs";
import * as openclaw from "../openclaw.mjs";
import {
  bindAgentChannels,
  buildBeginnerSummary,
  buildInstallNextSteps,
  listOpenClawAgents,
  resolveChannelBindings,
} from "../lifecycle.mjs";

/**
 * Recursively copy a directory.
 * @param {string} src
 * @param {string} dst
 */
function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

/**
 * @param {string[]} args
 * @returns {any | null}
 */
function parseJsonFromCliOutput(args) {
  const result = spawnSync("openclaw", args, { stdio: "pipe", encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) return null;

  const text = (result.stdout || "").trim();
  const lines = text.split("\n");
  let start = -1;
  let offset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "{" || trimmed === "[" || trimmed.startsWith('{"') || trimmed.startsWith("[{")) {
      start = offset;
      break;
    }
    offset += line.length + 1;
  }

  if (start < 0) return null;

  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}

/**
 * Install Jinyiwei into an OpenClaw workspace.
 * @param {string[]} args - CLI arguments after "install"
 * @returns {number} exit code
 */
export function installCommand(args) {
  const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const workspace = args.find((a) => !a.startsWith("--"));
  const flags = args.filter((a) => a.startsWith("--"));
  const isDryRun = flags.includes("--dry-run");
  const isJson = flags.includes("--json");
  const isCopy = flags.includes("--copy");
  const skipPlugin = flags.includes("--skip-plugin");
  const skipSkills = flags.includes("--skip-skills");
  const openclawAvailable = openclaw.hasOpenClaw();

  if (isJson && !workspace) {
    console.log(JSON.stringify({ ok: false, error: t("install.error.workspaceRequired") }, null, 2));
    return ExitCode.USER_ERROR;
  }

  if (!isJson) log.banner(pkg.version);

  if (!workspace) {
    log.fail(t("install.error.workspaceRequired"));
    console.log();
    log.info(t("install.error.workspaceHint"));
    console.log();
    return ExitCode.USER_ERROR;
  }

  const resolvedWorkspace = path.resolve(workspace);
  if (!fs.existsSync(resolvedWorkspace)) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: t("install.error.workspaceNotExist", { path: resolvedWorkspace }) }, null, 2));
    } else {
      log.fail(t("install.error.workspaceNotExist", { path: resolvedWorkspace }));
    }
    return ExitCode.USER_ERROR;
  }

  if (!isJson) {
    log.info(t("install.target", { path: log.cyan(resolvedWorkspace) }));
    if (isDryRun) log.info(log.yellow("--dry-run mode"));
  }

  const totalSteps = 8;

  // Step 1: Load and validate config
  if (!isJson) log.step(1, totalSteps, t("install.loadingConfig"));
  const config = loadConfig();
  const configResult = validateConfig(config);
  if (!configResult.ok) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, errors: configResult.errors }, null, 2));
    } else {
      log.fail(t("install.loadingConfig"));
      for (const e of configResult.errors) log.detail(e);
    }
    return ExitCode.VALIDATION_FAIL;
  }
  if (!isJson) log.ok(t("install.loadingConfig"));

  // Step 2: Discover groups and build agent registry
  if (!isJson) log.step(2, totalSteps, t("install.discoveringGroups"));
  const registry = buildAgentRegistry(config);
  const { groups } = discoverGroups();
  if (!isJson) {
    log.ok(t("install.discoveringGroups"));
    for (const [groupName, group] of Object.entries(groups)) {
      log.detail(`${groupName}: ${group.agents.map((a) => a.name).join(", ")}`);
    }
  }

  // Step 3: Sync skills manifest
  if (!isJson) log.step(3, totalSteps, t("install.syncing"));
  const sync = spawnSync(process.execPath, [resolve("scripts/sync-skills-manifest.mjs")], {
    cwd: root, stdio: "pipe", encoding: "utf8", timeout: 30_000,
  });
  if (sync.status !== 0) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "skills sync failed", stderr: sync.stderr }, null, 2));
    } else {
      log.fail(t("install.syncing"));
      log.detail(sync.stderr?.trim() || "Unknown error");
    }
    return ExitCode.VALIDATION_FAIL;
  }
  if (!isJson) log.ok(t("install.syncing"));

  // Step 4: Validate governance files
  if (!isJson) log.step(4, totalSteps, t("install.validating"));
  const val = spawnSync(process.execPath, [resolve("scripts/validate-jinyiwei.mjs")], {
    cwd: root, stdio: "pipe", encoding: "utf8", timeout: 30_000,
  });
  if (val.status !== 0) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: "validation failed", output: val.stderr || val.stdout }, null, 2));
    } else {
      log.fail(t("install.validating"));
      log.detail(val.stderr?.trim() || val.stdout?.trim() || "Unknown error");
    }
    return ExitCode.VALIDATION_FAIL;
  }
  if (!isJson) log.ok(t("install.validating"));

  // Step 5: Install plugin
  if (!isJson) log.step(5, totalSteps, t("install.installingPlugin"));
  if (skipPlugin) {
    if (!isJson) log.info(log.dim("skipped (--skip-plugin)"));
  } else if (!openclawAvailable) {
    if (!isJson) log.warn(t("install.openclawNotFound"));
  } else {
    const pluginResult = openclaw.pluginInstall(root, { link: !isCopy, dryRun: isDryRun });
    if (!pluginResult.ok && !pluginResult.dryRun) {
      if (!isJson) {
        log.fail(t("install.installingPlugin"));
        log.detail(pluginResult.stderr?.trim() || "Unknown error");
      }
      return ExitCode.INSTALL_FAIL;
    }
    openclaw.pluginEnable("jinyiwei", { dryRun: isDryRun });
    if (!isJson) log.ok(t("install.installingPlugin"));
  }

  // Step 6: Register agents with OpenClaw
  if (!isJson) log.step(6, totalSteps, t("install.registeringAgents"));
  let agentsFailed = false;
  const agentResults = [];
  const existingAgentIds = openclawAvailable ? new Set(listOpenClawAgents().map((agent) => agent.id)) : new Set();

  for (const agent of registry) {
    const agentWorkspace = path.join(resolvedWorkspace, "agents", agent.group ? `groups/${agent.group}/${agent.id}` : agent.id);

    if (isDryRun) {
      if (!isJson) log.detail(t("install.agentDryRun", { agent: agent.name, path: agentWorkspace }));
      agentResults.push({ agent: agent.name, ok: true, dryRun: true });
      continue;
    }

    try {
      // Create agent workspace directory
      fs.mkdirSync(agentWorkspace, { recursive: true });

      // Copy charter
      fs.copyFileSync(resolve(agent.charterPath), path.join(agentWorkspace, "AGENT.md"));

      // Symlink/copy rules and templates
      const rulesDst = path.join(agentWorkspace, "rules");
      if (!fs.existsSync(rulesDst)) {
        if (isCopy) {
          copyDirRecursive(resolve("rules"), rulesDst);
        } else {
          fs.symlinkSync(resolve("rules"), rulesDst);
        }
      }

      const templatesDst = path.join(agentWorkspace, "templates");
      if (!fs.existsSync(templatesDst)) {
        if (isCopy) {
          copyDirRecursive(resolve("templates"), templatesDst);
        } else {
          fs.symlinkSync(resolve("templates"), templatesDst);
        }
      }

      // Register agent with OpenClaw (non-fatal if it fails)
      if (openclawAvailable) {
        if (!existingAgentIds.has(agent.id)) {
          openclaw.agentAdd(agent.id, {
            model: agent.model || undefined,
            workspace: agentWorkspace,
            dryRun: isDryRun,
          });
        }

        if (agent.model) {
          openclaw.modelSet(agent.model, agent.id, { dryRun: isDryRun });
        }
      }

      agentResults.push({ agent: agent.name, group: agent.group, model: agent.model, ok: true });
      if (!isJson) log.verbose(t("install.agentRegistered", { agent: agent.name, model: agent.model || "default" }));
    } catch (/** @type {any} */ err) {
      agentsFailed = true;
      agentResults.push({ agent: agent.name, ok: false, error: err.message });
      if (!isJson) log.detail(`${agent.name}: ${err.message}`);
    }
  }

  // Write agent registry
  if (!isDryRun) {
    const registryData = {
      agents: registry.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        group: a.group,
        model: a.model,
      })),
    };
    fs.writeFileSync(
      path.join(resolvedWorkspace, "openclaw-agents.json"),
      JSON.stringify(registryData, null, 2) + "\n",
      "utf8"
    );
  }

  if (!isJson) {
    if (agentsFailed) {
      log.fail(t("install.registeringAgents"));
    } else {
      log.ok(t("install.registeringAgents"));
    }
  }

  // Step 7: Bind external channels where OpenClaw already has accounts configured
  if (!isJson) log.step(7, totalSteps, "Connecting external channels");
  const bindingResults = [];
  let channelBindings = [];
  if (openclawAvailable && !isDryRun && !skipPlugin) {
    channelBindings = resolveChannelBindings(config.externalChannels || []);
    const externalAgents = registry.filter((agent) => agent.role === "external");

    for (const agent of externalAgents) {
      const result = bindAgentChannels(agent.id, channelBindings, { dryRun: isDryRun });
      const ok = result.ok || result.dryRun;
      bindingResults.push({ agent: agent.name, ok, dryRun: result.dryRun ?? false });
      if (!ok) {
        agentsFailed = true;
        if (!isJson) {
          log.detail(`${agent.name}: ${result.stderr?.trim() || "binding failed"}`);
        }
      } else if (!isJson && channelBindings.length > 0) {
        log.detail(`${agent.name}: bound to ${channelBindings.map((binding) => `${binding.channel}:${binding.accountId}`).join(", ")}`);
      }
    }
  } else if (!isJson) {
    if (!openclawAvailable) {
      log.info(log.dim("OpenClaw CLI not available, so channel bindings were skipped."));
    } else if (isDryRun) {
      log.info(log.dim("Channel binding preview only."));
    } else {
      log.info(log.dim("Channel binding skipped because plugin installation was disabled."));
    }
  }
  if (!isJson) log.ok("Connecting external channels");

  // Step 8: Install skills
  if (skipSkills) {
    if (!isJson) {
      log.step(8, totalSteps, t("install.installingSkills", { count: "0" }));
      log.info(log.dim("skipped (--skip-skills)"));
    }
  } else {
    /** @type {{ skills: string[] }} */
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(resolve("manifests/preinstalled-skills.json"), "utf8"));
    } catch {
      manifest = { skills: [] };
    }

    if (!isJson) log.step(8, totalSteps, t("install.installingSkills", { count: String(manifest.skills.length) }));

    let skillsInstalled = 0;
    let skillsFailed = 0;

    for (const skillId of manifest.skills) {
      if (isDryRun) {
        if (!isJson) log.verbose(t("install.agentDryRun", { agent: skillId, path: "skills" }));
        continue;
      }

      if (openclaw.hasOpenClaw()) {
        const result = openclaw.skillInstall(skillId, { dryRun: isDryRun });
        if (result.ok) {
          skillsInstalled++;
        } else {
          skillsFailed++;
          if (!isJson) log.detail(`${skillId}: ${result.stderr?.trim() || "install failed"}`);
        }
      } else {
        // No openclaw CLI — copy skill directory to workspace
        const skillSrc = resolve(`skills/${skillId}`);
        const skillDst = path.join(resolvedWorkspace, "skills", skillId);
        if (fs.existsSync(skillSrc)) {
          try {
            copyDirRecursive(skillSrc, skillDst);
            skillsInstalled++;
          } catch (/** @type {any} */ err) {
            skillsFailed++;
            if (!isJson) log.detail(`${skillId}: ${err.message}`);
          }
        }
      }
    }

    if (!isJson) {
      if (skillsFailed > 0) {
        log.detail(`${skillsInstalled} installed, ${skillsFailed} failed`);
      } else if (!isDryRun) {
        log.ok(t("install.installingSkills", { count: String(skillsInstalled) }));
      }
    }
  }

  // Summary
  if (isJson) {
    console.log(JSON.stringify({
      ok: !agentsFailed,
      workspace: resolvedWorkspace,
      agents: agentResults,
      bindings: bindingResults,
      dryRun: isDryRun,
    }, null, 2));
  } else {
    if (agentsFailed) {
      log.summary("fail", t("install.summary.partialFail"));
    } else if (isDryRun) {
      log.summary("ok", t("install.summary.dryRunOk"));
    } else {
      log.summary("ok", t("install.summary.ok"));
    }

    console.log(`  ${log.bold(t("install.nextSteps"))}`);
    console.log(`    ${log.symbols.arrow} ${t("install.nextStep.status")}`);
    console.log(`    ${log.symbols.arrow} ${t("install.nextStep.init")}`);
    for (const line of buildInstallNextSteps({
      hasOpenClaw: openclawAvailable,
      hasBindings: channelBindings.length > 0,
      needsConfig: !config.models.chat || !config.models.watch || Object.values(config.models.groups || {}).some((model) => !model),
    })) {
      if (!line.startsWith("Next steps")) {
        console.log(`    ${log.symbols.arrow} ${line.replace(/^-\s*/, "")}`);
      }
    }
    console.log();
    for (const line of buildBeginnerSummary({
      externalAgents: registry.filter((agent) => agent.role === "external").map((agent) => ({ name: agent.name, model: agent.model })),
      groups,
      externalChannels: config.externalChannels || [],
      bindings: channelBindings.flatMap((binding) => registry.filter((agent) => agent.role === "external").map((agent) => ({ agent: agent.name, channel: binding.channel, accountId: binding.accountId }))),
      needsConfig: !config.models.chat || !config.models.watch || Object.values(config.models.groups || {}).some((model) => !model),
    })) {
      console.log(`  ${line}`);
    }
    console.log();
  }

  return agentsFailed ? ExitCode.PARTIAL_FAIL : ExitCode.OK;
}
