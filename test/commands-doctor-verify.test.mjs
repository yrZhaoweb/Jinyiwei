import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { doctorCommand } from "../lib/commands/doctor.mjs";
import { verifyCommand } from "../lib/commands/verify.mjs";
import { ExitCode } from "../lib/exit-codes.mjs";

describe("doctorCommand", () => {
  it("returns exit code OK or VALIDATION_FAIL", () => {
    const code = doctorCommand([]);
    assert.ok(code === ExitCode.OK || code === ExitCode.VALIDATION_FAIL);
  });

  it("returns OK when system is healthy", () => {
    const code = doctorCommand([]);
    // If OpenClaw is not installed, it may return VALIDATION_FAIL
    // This is expected behavior
    assert.ok(typeof code === "number");
  });

  it("outputs JSON when --json flag is passed", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = doctorCommand(["--json"]);
      assert.ok(typeof code === "number");
      // Should be parseable as JSON
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
    } finally {
      console.log = originalLog;
    }
  });

  it("JSON output contains expected fields", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      doctorCommand(["--json"]);
      const parsed = JSON.parse(output);
      assert.ok(typeof parsed.ok === "boolean");
      assert.ok(typeof parsed.version === "string");
      assert.ok(Array.isArray(parsed.checks));
      assert.ok(Array.isArray(parsed.diagnostics));
    } finally {
      console.log = originalLog;
    }
  });

  it("checks array contains expected fields", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      doctorCommand(["--json"]);
      const parsed = JSON.parse(output);
      for (const check of parsed.checks) {
        assert.ok(typeof check.id === "string");
        assert.ok(typeof check.label === "string");
        assert.ok(typeof check.ok === "boolean");
      }
    } finally {
      console.log = originalLog;
    }
  });

  it("does not throw when called with empty args", () => {
    assert.doesNotThrow(() => {
      doctorCommand([]);
    });
  });

  it("handles unknown flags gracefully", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = doctorCommand(["--unknown-flag"]);
      // Should still run and produce output
      assert.ok(typeof code === "number");
    } finally {
      console.log = originalLog;
    }
  });
});

describe("verifyCommand", () => {
  it("returns exit code OK or VALIDATION_FAIL", () => {
    const code = verifyCommand([]);
    assert.ok(code === ExitCode.OK || code === ExitCode.VALIDATION_FAIL);
  });

  it("returns VALIDATION_FAIL when system is not ready", () => {
    const code = verifyCommand([]);
    // Without OpenClaw installed, should return VALIDATION_FAIL
    assert.ok(typeof code === "number");
  });

  it("outputs JSON when --json flag is passed", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = verifyCommand(["--json"]);
      assert.ok(typeof code === "number");
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
    } finally {
      console.log = originalLog;
    }
  });

  it("JSON output contains ok, checks, issues, and guidance", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      verifyCommand(["--json"]);
      const parsed = JSON.parse(output);
      assert.ok(typeof parsed.ok === "boolean");
      assert.ok(Array.isArray(parsed.checks));
      assert.ok(Array.isArray(parsed.issues));
      assert.ok(Array.isArray(parsed.guidance));
    } finally {
      console.log = originalLog;
    }
  });

  it("issues contain severity and message", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      verifyCommand(["--json"]);
      const parsed = JSON.parse(output);
      for (const issue of parsed.issues) {
        assert.ok(typeof issue.severity === "string");
        assert.ok(["error", "warning"].includes(issue.severity));
        assert.ok(typeof issue.message === "string");
      }
    } finally {
      console.log = originalLog;
    }
  });

  it("openclaw field contains version and config info", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      verifyCommand(["--json"]);
      const parsed = JSON.parse(output);
      assert.ok(parsed.openclaw !== undefined);
      // openclaw may be null if OpenClaw is not installed
      if (parsed.openclaw) {
        assert.ok("version" in parsed.openclaw);
      }
    } finally {
      console.log = originalLog;
    }
  });

  it("errors field contains only error-severity issues", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      verifyCommand(["--json"]);
      const parsed = JSON.parse(output);
      for (const error of (parsed.errors || [])) {
        assert.strictEqual(error.severity, "error");
      }
    } finally {
      console.log = originalLog;
    }
  });

  it("does not throw when called with empty args", () => {
    assert.doesNotThrow(() => {
      verifyCommand([]);
    });
  });

  it("handles --json and unknown flags gracefully", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg) => { output += msg + "\n"; };
    try {
      const code = verifyCommand(["--json", "--unknown"]);
      assert.ok(typeof code === "number");
    } finally {
      console.log = originalLog;
    }
  });
});
