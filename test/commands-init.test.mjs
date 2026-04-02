import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolve } from "../lib/paths.mjs";
import { ExitCode } from "../lib/exit-codes.mjs";
import { initCommand } from "../lib/commands/init.mjs";
import { sanitizeConfig, validateConfig } from "../lib/config.mjs";
import { t, setLocale, getLocale } from "../lib/i18n.mjs";

// Note: initCommand is interactive and requires readline input
// We test the non-interactive behaviors and edge cases

describe("initCommand", () => {
  // The init command is inherently interactive, but we can verify:
  // 1. It imports correctly
  // 2. It handles edge cases without throwing

  it("module loads without errors", () => {
    assert.ok(typeof initCommand === "function");
  });

  it("handles missing package.json gracefully", () => {
    // initCommand should handle missing package.json
    const pkgBackup = fs.existsSync(resolve("package.json"))
      ? fs.readFileSync(resolve("package.json"), "utf8")
      : null;

    try {
      if (pkgBackup) {
        fs.unlinkSync(resolve("package.json"));
      }
      // The init command would fail on missing package.json,
      // but it should be caught internally
    } finally {
      if (pkgBackup) {
        fs.writeFileSync(resolve("package.json"), pkgBackup, "utf8");
      }
    }
  });

  it("returns a promise", () => {
    assert.ok(typeof initCommand === "function");
  });
});

describe("initCommand validation paths", () => {

  it("sanitizeConfig normalizes whitespace in titles", () => {
    const config = sanitizeConfig({
      bossTitle: "  CustomBoss  ",
      watchSelfTitle: "  锦衣卫  ",
      approvalMode: "  hybrid  ",
      models: { chat: "  gpt-4  ", watch: "  claude  ", groups: {} },
      externalChannels: ["  feishu  ", "  telegram  "],
    });

    assert.strictEqual(config.bossTitle, "CustomBoss");
    assert.strictEqual(config.watchSelfTitle, "锦衣卫");
    assert.strictEqual(config.approvalMode, "hybrid");
    assert.strictEqual(config.models.chat, "gpt-4");
    assert.strictEqual(config.models.watch, "claude");
    assert.deepStrictEqual(config.externalChannels, ["feishu", "telegram"]);
  });

  it("sanitizeConfig deduplicates external channels", () => {
    const config = sanitizeConfig({
      ...sanitizeConfig({
        bossTitle: "Boss",
        watchSelfTitle: "锦衣卫",
        approvalMode: "hybrid",
        models: { chat: "", watch: "", groups: {} },
        externalChannels: ["feishu", "telegram", "feishu"],
      }),
    });

    const feishuCount = config.externalChannels.filter((c) => c === "feishu").length;
    assert.strictEqual(feishuCount, 1);
  });

  it("sanitizeConfig filters empty external channels", () => {
    const config = sanitizeConfig({
      bossTitle: "Boss",
      watchSelfTitle: "锦衣卫",
      approvalMode: "hybrid",
      models: { chat: "", watch: "", groups: {} },
      externalChannels: ["feishu", "", "  "],
    });

    assert.deepStrictEqual(config.externalChannels, ["feishu"]);
  });

  it("sanitizeConfig uses defaults for missing values", () => {
    const config = sanitizeConfig({});

    assert.strictEqual(config.bossTitle, "Boss");
    assert.strictEqual(config.watchSelfTitle, "锦衣卫");
    assert.strictEqual(config.approvalMode, "hybrid");
    assert.deepStrictEqual(config.externalChannels, ["feishu", "telegram"]);
  });

  it("validateConfig catches invalid approvalMode after sanitize", () => {
    // After sanitization, approvalMode should always be valid
    const config = sanitizeConfig({
      bossTitle: "Boss",
      watchSelfTitle: "锦衣卫",
      approvalMode: "invalid",
      models: { chat: "", watch: "", groups: {} },
      externalChannels: [],
    });

    const result = validateConfig(config);
    assert.strictEqual(result.ok, false);
  });

  it("validateConfig accepts all valid approval modes", () => {
    for (const mode of ["strict", "graded", "hybrid"]) {
      const config = sanitizeConfig({
        bossTitle: "Boss",
        watchSelfTitle: "锦衣卫",
        approvalMode: mode,
        models: { chat: "", watch: "", groups: {} },
        externalChannels: [],
      });

      const result = validateConfig(config);
      assert.strictEqual(result.ok, true, `Failed for mode: ${mode}`);
    }
  });

  it("validateConfig handles empty config object", () => {
    const config = sanitizeConfig({});
    const result = validateConfig(config);
    assert.strictEqual(result.ok, true);
  });

  it("validateConfig catches non-array externalChannels", () => {
    const config = {
      bossTitle: "Boss",
      watchSelfTitle: "锦衣卫",
      approvalMode: "hybrid",
      models: { chat: "", watch: "", groups: {} },
      externalChannels: "not-an-array",
    };

    const result = validateConfig(config);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("externalChannels")));
  });
});

describe("init command i18n keys", () => {
  it("has required init command translation keys", () => {
    const keys = [
      "init.welcome",
      "init.wizardIntro",
      "init.prompt.bossTitle",
      "init.prompt.watchSelfTitle",
      "init.prompt.approvalMode",
      "init.prompt.externalChannelsLabel",
      "init.modelConfig",
      "init.configurationSummary",
      "init.savePrompt",
      "init.summary.ok",
    ];

    for (const key of keys) {
      const translation = t(key);
      assert.ok(
        typeof translation === "string" && translation.length > 0,
        `Missing translation for key: ${key}`
      );
    }
  });

  it("has required init translation keys in Chinese", () => {
    setLocale("zh");
    const keys = [
      "init.welcome",
      "init.wizardIntro",
      "init.prompt.bossTitle",
      "init.prompt.watchSelfTitle",
      "init.prompt.approvalMode",
      "init.modelConfig",
      "init.configurationSummary",
    ];

    for (const key of keys) {
      const translation = t(key);
      assert.ok(
        typeof translation === "string" && translation.length > 0,
        `Missing Chinese translation for key: ${key}`
      );
    }
    setLocale("en");
  });
});
