import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { uninstallCommand } from "../lib/commands/uninstall.mjs";
import { ExitCode } from "../lib/exit-codes.mjs";

describe("uninstallCommand", () => {
  it("returns a numeric exit code", () => {
    // Dry run without OpenClaw should return INSTALL_FAIL
    const code = uninstallCommand(["--dry-run"]);
    assert.ok(typeof code === "number");
    assert.ok(code === ExitCode.OK || code === ExitCode.INSTALL_FAIL);
  });

  it("returns OK or INSTALL_FAIL when openclaw is not available (dry-run)", () => {
    const code = uninstallCommand(["--dry-run"]);
    // Without openclaw, uninstall may gracefully succeed or fail
    assert.ok(code === ExitCode.OK || code === ExitCode.INSTALL_FAIL);
  });

  it("handles --dry-run flag without throwing", () => {
    assert.doesNotThrow(() => {
      uninstallCommand(["--dry-run"]);
    });
  });

  it("handles --json flag without throwing", () => {
    const originalLog = console.log;
    console.log = () => {};
    try {
      assert.doesNotThrow(() => {
        uninstallCommand(["--json", "--dry-run"]);
      });
    } finally {
      console.log = originalLog;
    }
  });

  it("outputs JSON when --json is specified", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      uninstallCommand(["--json", "--dry-run"]);
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
    } finally {
      console.log = originalLog;
    }
  });

  it("JSON output contains ok, agents, and plugin fields", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      uninstallCommand(["--json", "--dry-run"]);
      const parsed = JSON.parse(output);
      assert.ok(typeof parsed.ok === "boolean");
      assert.ok(Array.isArray(parsed.agents));
      assert.ok(parsed.plugin !== undefined);
      assert.ok(typeof parsed.plugin === "object");
    } finally {
      console.log = originalLog;
    }
  });

  it("agents array contains expected fields per agent", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      uninstallCommand(["--json", "--dry-run"]);
      const parsed = JSON.parse(output);
      for (const agent of parsed.agents) {
        assert.ok(typeof agent.agent === "string");
        assert.ok(typeof agent.ok === "boolean");
        assert.ok(typeof agent.dryRun === "boolean");
      }
    } finally {
      console.log = originalLog;
    }
  });

  it("plugin object contains disable and uninstall results", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      uninstallCommand(["--json", "--dry-run"]);
      const parsed = JSON.parse(output);
      assert.ok(typeof parsed.plugin.disable === "object");
      assert.ok(typeof parsed.plugin.uninstall === "object");
      assert.ok(typeof parsed.plugin.disable.ok === "boolean");
      assert.ok(typeof parsed.plugin.uninstall.ok === "boolean");
    } finally {
      console.log = originalLog;
    }
  });

  it("handles unknown flags gracefully", () => {
    assert.doesNotThrow(() => {
      uninstallCommand(["--unknown"]);
    });
  });

  it("returns OK or INSTALL_FAIL without openclaw even with --json", () => {
    const originalLog = console.log;
    console.log = () => {};
    try {
      const code = uninstallCommand(["--json"]);
      assert.ok(code === ExitCode.OK || code === ExitCode.INSTALL_FAIL);
    } finally {
      console.log = originalLog;
    }
  });
});
