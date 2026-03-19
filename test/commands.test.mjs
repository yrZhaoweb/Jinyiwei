import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ExitCode } from "../lib/exit-codes.mjs";
import { validateCommand } from "../lib/commands/validate.mjs";
import { syncCommand } from "../lib/commands/sync.mjs";
import { statusCommand } from "../lib/commands/status.mjs";

describe("validateCommand", () => {
  it("returns OK when all governance files are valid", () => {
    const code = validateCommand([]);
    assert.strictEqual(code, ExitCode.OK);
  });

  it("returns OK with --json flag and outputs valid JSON", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg; };
    try {
      const code = validateCommand(["--json"]);
      assert.strictEqual(code, ExitCode.OK);
      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.ok, true);
      assert.strictEqual(typeof parsed.skills, "number");
    } finally {
      console.log = originalLog;
    }
  });
});

describe("syncCommand", () => {
  it("returns OK and syncs skills manifest", () => {
    const code = syncCommand();
    assert.strictEqual(code, ExitCode.OK);
  });
});

describe("statusCommand", () => {
  it("always returns OK even if validation passes", () => {
    const code = statusCommand([]);
    assert.strictEqual(code, ExitCode.OK);
  });

  it("returns OK with --json flag and outputs valid JSON", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg; };
    try {
      const code = statusCommand(["--json"]);
      assert.strictEqual(code, ExitCode.OK);
      const parsed = JSON.parse(output);
      assert.strictEqual(typeof parsed.version, "string");
      assert.strictEqual(typeof parsed.skills, "number");
      assert.ok(parsed.validation === "ok" || parsed.validation === "failed");
    } finally {
      console.log = originalLog;
    }
  });
});
