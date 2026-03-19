import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as log from "../lib/log.mjs";

describe("log", () => {
  /** @type {string[]} */
  let captured;
  /** @type {typeof console.log} */
  let origLog;
  /** @type {typeof console.error} */
  let origError;

  beforeEach(() => {
    captured = [];
    origLog = console.log;
    origError = console.error;
    console.log = (/** @type {string[]} */ ...args) => captured.push(args.join(" "));
    console.error = (/** @type {string[]} */ ...args) => captured.push(args.join(" "));
    log.setLevel("normal");
  });

  afterEach(() => {
    console.log = origLog;
    console.error = origError;
    log.setLevel("normal");
  });

  it("ok prints a message", () => {
    log.ok("test pass");
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes("test pass"));
  });

  it("fail prints to stderr", () => {
    log.fail("test fail");
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes("test fail"));
  });

  it("info prints a message", () => {
    log.info("test info");
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes("test info"));
  });

  it("warn prints a message", () => {
    log.warn("test warn");
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes("test warn"));
  });

  it("detail prints indented message", () => {
    log.detail("test detail");
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes("test detail"));
  });

  it("step prints counter and message", () => {
    log.step(1, 3, "step msg");
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes("1"));
    assert.ok(captured[0].includes("3"));
    assert.ok(captured[0].includes("step msg"));
  });

  it("banner prints version", () => {
    log.banner("1.2.3");
    const all = captured.join("\n");
    assert.ok(all.includes("1.2.3"));
    assert.ok(all.includes("Jinyiwei"));
  });

  it("summary prints ok box", () => {
    log.summary("ok", "all good");
    const all = captured.join("\n");
    assert.ok(all.includes("all good"));
  });

  it("summary prints fail box", () => {
    log.summary("fail", "something broke");
    const all = captured.join("\n");
    assert.ok(all.includes("something broke"));
  });

  describe("log levels", () => {
    it("quiet suppresses info, detail, and banner", () => {
      log.setLevel("quiet");
      log.info("hidden info");
      log.detail("hidden detail");
      log.banner("1.0.0");
      assert.strictEqual(captured.length, 0);
    });

    it("quiet still shows ok, fail, warn", () => {
      log.setLevel("quiet");
      log.ok("visible ok");
      log.fail("visible fail");
      log.warn("visible warn");
      assert.strictEqual(captured.length, 3);
    });

    it("verbose shows verbose messages", () => {
      log.setLevel("verbose");
      log.verbose("debug line");
      assert.strictEqual(captured.length, 1);
      assert.ok(captured[0].includes("debug line"));
    });

    it("normal hides verbose messages", () => {
      log.setLevel("normal");
      log.verbose("hidden debug");
      assert.strictEqual(captured.length, 0);
    });

    it("getLevel returns current level", () => {
      log.setLevel("verbose");
      assert.strictEqual(log.getLevel(), "verbose");
      log.setLevel("quiet");
      assert.strictEqual(log.getLevel(), "quiet");
    });
  });

  describe("color helpers", () => {
    it("bold wraps text", () => {
      const result = log.bold("test");
      assert.ok(result.includes("test"));
    });

    it("dim wraps text", () => {
      const result = log.dim("test");
      assert.ok(result.includes("test"));
    });

    it("green wraps text", () => {
      const result = log.green("test");
      assert.ok(result.includes("test"));
    });

    it("red wraps text", () => {
      const result = log.red("test");
      assert.ok(result.includes("test"));
    });

    it("cyan wraps text", () => {
      const result = log.cyan("test");
      assert.ok(result.includes("test"));
    });

    it("yellow wraps text", () => {
      const result = log.yellow("test");
      assert.ok(result.includes("test"));
    });
  });

  describe("symbols", () => {
    it("has all required symbol keys", () => {
      for (const key of ["tick", "cross", "arrow", "info", "warn", "step", "bullet"]) {
        assert.ok(typeof log.symbols[key] === "string", `symbols.${key} should be a string`);
      }
    });
  });
});
