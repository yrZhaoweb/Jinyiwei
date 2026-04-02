import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolve } from "../lib/paths.mjs";
import { configureCommand } from "../lib/commands/configure.mjs";
import { ExitCode } from "../lib/exit-codes.mjs";
import { parseOnboardingArgs, readOptionValue, normalizeEntryAgentId } from "../lib/commands/onboarding.mjs";

describe("configureCommand", () => {
  it("returns OK with --json when openclaw is not available", async () => {
    // When openclaw is not available, configure --json should still return OK
    // with snapshot mode
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = await configureCommand(["--json"]);
      // Should return OK even without openclaw
      assert.strictEqual(code, ExitCode.OK);

      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.ok, true);
      assert.strictEqual(parsed.mode, "snapshot");
    } finally {
      console.log = originalLog;
    }
  });

  it("JSON output contains config and groups", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      await configureCommand(["--json"]);
      const parsed = JSON.parse(output);

      assert.ok(parsed.config !== undefined);
      assert.ok(typeof parsed.config.bossTitle === "string");
      assert.ok(typeof parsed.config.watchSelfTitle === "string");
      assert.ok(typeof parsed.config.approvalMode === "string");
      assert.ok(typeof parsed.config.models === "object");
      assert.ok(typeof parsed.groups === "object");
    } finally {
      console.log = originalLog;
    }
  });

  it("JSON output contains defaultEntry", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      await configureCommand(["--json"]);
      const parsed = JSON.parse(output);

      assert.ok("defaultEntry" in parsed);
    } finally {
      console.log = originalLog;
    }
  });

  it("JSON output contains guidance", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      await configureCommand(["--json"]);
      const parsed = JSON.parse(output);

      assert.ok(Array.isArray(parsed.guidance));
      assert.ok(parsed.guidance.length > 0);
    } finally {
      console.log = originalLog;
    }
  });

  it("returns INSTALL_FAIL when setting entry without openclaw", async () => {
    // Without openclaw, trying to set entry should fail
    const code = await configureCommand(["--set-default-entry", "chat"]);
    assert.strictEqual(code, ExitCode.INSTALL_FAIL);
  });

  it("returns INSTALL_FAIL with --json when setting entry without openclaw", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = await configureCommand(["--json", "--set-default-entry", "chat"]);
      assert.strictEqual(code, ExitCode.INSTALL_FAIL);

      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.ok, false);
      assert.ok(parsed.error !== undefined);
    } finally {
      console.log = originalLog;
    }
  });

  it("handles --keep-main flag", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = await configureCommand(["--keep-main"]);
      // configure may succeed or fail depending on openclaw availability
      assert.ok(typeof code === "number");
    } finally {
      console.log = originalLog;
    }
  });

  it("handles --set-default-entry with invalid agent gracefully", async () => {
    // Without openclaw, even valid agent names should fail
    const code = await configureCommand(["--set-default-entry", "invalidagent"]);
    assert.strictEqual(code, ExitCode.INSTALL_FAIL);
  });

  it("handles unknown flags without throwing", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = await configureCommand(["--unknown-flag", "--json"]);
      // Should still return OK with snapshot
      assert.strictEqual(code, ExitCode.OK);
    } finally {
      console.log = originalLog;
    }
  });
});

describe("configureCommand onboarding helpers", () => {
  it("normalizeEntryAgentId handles chat", () => {
    assert.strictEqual(normalizeEntryAgentId("chat"), "chat");
  });

  it("normalizeEntryAgentId handles watch", () => {
    assert.strictEqual(normalizeEntryAgentId("watch"), "watch");
  });

  it("normalizeEntryAgentId handles main", () => {
    assert.strictEqual(normalizeEntryAgentId("main"), "main");
  });

  it("normalizeEntryAgentId normalizes case", () => {
    assert.strictEqual(normalizeEntryAgentId("Chat"), "chat");
    assert.strictEqual(normalizeEntryAgentId("WATCH"), "watch");
  });

  it("normalizeEntryAgentId returns null for undefined", () => {
    assert.strictEqual(normalizeEntryAgentId(undefined), null);
  });

  it("normalizeEntryAgentId returns null for empty string", () => {
    assert.strictEqual(normalizeEntryAgentId(""), null);
  });

  it("readOptionValue finds option in args", () => {
    const args = ["--entry", "chat", "other"];
    const value = readOptionValue(args, ["--entry"]);
    assert.strictEqual(value, "chat");
  });

  it("readOptionValue returns null when not found", () => {
    const args = ["--other", "value"];
    const value = readOptionValue(args, ["--entry"]);
    assert.strictEqual(value, null);
  });

  it("readOptionValue uses first matching option", () => {
    const args = ["--set-default-entry", "watch", "--entry", "chat"];
    const value = readOptionValue(args, ["--entry", "--set-default-entry"]);
    assert.strictEqual(value, "watch");
  });

  it("parseOnboardingArgs extracts workspace and flags", () => {
    const args = ["/workspace/path", "--dry-run", "--verbose"];
    const result = parseOnboardingArgs(args);

    assert.strictEqual(result.workspace, "/workspace/path");
    assert.ok(result.flags.includes("--dry-run"));
    assert.ok(result.flags.includes("--verbose"));
    assert.strictEqual(result.workspaceSource, "positional");
  });

  it("parseOnboardingArgs handles empty args with default workspace", () => {
    const result = parseOnboardingArgs([]);

    // Empty args gets the default workspace path
    assert.ok(typeof result.workspace === "string");
    assert.strictEqual(result.workspaceSource, "default");
    assert.strictEqual(result.isJson, false);
    assert.ok(Array.isArray(result.flags));
  });

  it("parseOnboardingArgs identifies --json", () => {
    const result = parseOnboardingArgs(["--json"]);

    assert.strictEqual(result.isJson, true);
  });
});
