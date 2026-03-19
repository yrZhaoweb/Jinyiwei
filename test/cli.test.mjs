import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "../lib/paths.mjs";

/**
 * @param {string[]} args
 * @returns {{ code: number | null, stdout: string, stderr: string }}
 */
function cli(args) {
  const result = spawnSync(process.execPath, [resolve("bin/jinyiwei.mjs"), ...args], {
    cwd: resolve("."),
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("CLI smoke tests", () => {
  it("help exits 0 and prints usage", () => {
    const r = cli(["help"]);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes("jinyiwei install"));
    assert.ok(r.stdout.includes("jinyiwei validate"));
  });

  it("--help exits 0", () => {
    const r = cli(["--help"]);
    assert.strictEqual(r.code, 0);
  });

  it("--version exits 0 and prints version", () => {
    const r = cli(["--version"]);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes("jinyiwei v"));
  });

  it("-v exits 0 and prints version", () => {
    const r = cli(["-v"]);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes("jinyiwei v"));
  });

  it("validate exits 0 on valid project", () => {
    const r = cli(["validate"]);
    assert.strictEqual(r.code, 0);
  });

  it("validate --json outputs valid JSON", () => {
    const r = cli(["validate", "--json"]);
    assert.strictEqual(r.code, 0);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(typeof parsed.skills, "number");
  });

  it("status exits 0", () => {
    const r = cli(["status"]);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes("Boss"));
  });

  it("status --json outputs valid JSON", () => {
    const r = cli(["status", "--json"]);
    assert.strictEqual(r.code, 0);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(typeof parsed.version, "string");
    assert.strictEqual(parsed.validation, "ok");
  });

  it("sync exits 0", () => {
    const r = cli(["sync"]);
    assert.strictEqual(r.code, 0);
  });

  it("unknown command exits non-zero", () => {
    const r = cli(["nonexistent"]);
    assert.ok(r.code !== 0);
  });

  it("no command exits 0 and shows banner", () => {
    const r = cli([]);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes("Jinyiwei"));
  });

  it("install without workspace exits non-zero", () => {
    const r = cli(["install"]);
    assert.ok(r.code !== 0);
  });

  it("install --json without workspace exits non-zero and returns structured JSON", () => {
    const r = cli(["install", "--json"]);
    assert.ok(r.code !== 0);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(typeof parsed.error, "string");
  });

  it("install --dry-run with fake workspace exits non-zero", () => {
    const r = cli(["install", "/tmp/nonexistent-workspace-path", "--dry-run"]);
    assert.ok(r.code !== 0);
  });
});
