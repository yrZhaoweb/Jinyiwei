import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";
import en from "../lib/i18n/en.mjs";
import zh from "../lib/i18n/zh.mjs";
import { parseOnboardingArgs } from "../lib/commands/onboarding.mjs";

const requiredCommands = [
  "setup",
  "configure",
  "doctor",
  "verify",
  "start-guide",
];

function read(file) {
  return fs.readFileSync(resolve(file), "utf8");
}

describe("onboarding", () => {
  it("documents the beginner path in English README", () => {
    const text = read("README.md");

    assert.match(text, /jinyiwei setup/i);
    assert.match(text, /jinyiwei doctor/i);
    assert.match(text, /jinyiwei verify/i);
    assert.match(text, /jinyiwei start-guide/i);
    assert.match(text, /Beginner Path/i);
  });

  it("documents the beginner path in Chinese README", () => {
    const text = read("README.zh-CN.md");

    assert.match(text, /jinyiwei setup/i);
    assert.match(text, /jinyiwei doctor/i);
    assert.match(text, /jinyiwei verify/i);
    assert.match(text, /jinyiwei start-guide/i);
    assert.match(text, /新手路径/);
  });

  it("exposes localization strings for the productized command surface", () => {
    for (const command of requiredCommands) {
      const key = `cli.commands.${command.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())}`;
      assert.strictEqual(typeof en[key], "string", `missing English key ${key}`);
      assert.strictEqual(typeof zh[key], "string", `missing Chinese key ${key}`);
      assert.ok(en[key].length > 0);
      assert.ok(zh[key].length > 0);
    }

    assert.match(en["cli.beginnerTitle"], /beginner/i);
    assert.match(zh["cli.beginnerTitle"], /新手/);
    assert.match(en["banner.quickStart"], /setup/);
    assert.match(zh["banner.quickStart"], /setup/);
  });

  it("does not treat entry option values as workspace paths", () => {
    const parsed = parseOnboardingArgs(["--entry", "watch", "/tmp/demo-workspace"]);
    assert.strictEqual(parsed.workspace, "/tmp/demo-workspace");
    assert.strictEqual(parsed.workspaceSource, "positional");
  });
});
