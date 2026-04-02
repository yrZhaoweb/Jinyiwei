import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolve } from "../lib/paths.mjs";
import {
  loadConfig,
  validateConfig,
  writeConfig,
  defaultConfig,
  getModelForAgent,
} from "../lib/config.mjs";

describe("config", () => {
  const configPath = resolve("jinyiwei.config.json");
  const backup = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : null;

  afterEach(() => {
    if (backup !== null) {
      fs.writeFileSync(configPath, backup, "utf8");
    }
  });

  describe("loadConfig", () => {
    it("loads existing config file", () => {
      const config = loadConfig();
      assert.ok(typeof config === "object");
      assert.ok(typeof config.bossTitle === "string");
      assert.ok(typeof config.watchSelfTitle === "string");
      assert.ok(typeof config.approvalMode === "string");
    });

    it("returns defaults when config file does not exist", () => {
      // Move config file temporarily
      if (fs.existsSync(configPath)) {
        const tmpPath = configPath + ".bak";
        fs.renameSync(configPath, tmpPath);
        try {
          const config = loadConfig();
          assert.strictEqual(config.bossTitle, "Boss");
          assert.strictEqual(config.watchSelfTitle, "锦衣卫");
          assert.strictEqual(config.approvalMode, "hybrid");
        } finally {
          fs.renameSync(tmpPath, configPath);
        }
      }
    });

    it("returns defaults when config file is malformed JSON", () => {
      fs.writeFileSync(configPath, "{ invalid json }", "utf8");
      const config = loadConfig();
      // Should return defaults on parse error
      assert.ok(typeof config === "object");
    });

    it("merges partial config with defaults", () => {
      const partial = {
        bossTitle: "CustomBoss",
      };
      const result = validateConfig({
        ...defaultConfig(),
        ...partial,
      });
      assert.strictEqual(result.ok, true);
    });
  });

  describe("validateConfig", () => {
    it("returns ok for valid config", () => {
      const config = defaultConfig();
      const result = validateConfig(config);
      assert.strictEqual(result.ok, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it("rejects null config", () => {
      const result = validateConfig(null);
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("object")));
    });

    it("rejects undefined config", () => {
      const result = validateConfig(undefined);
      assert.strictEqual(result.ok, false);
    });

    it("rejects non-object config", () => {
      const result = validateConfig("string");
      assert.strictEqual(result.ok, false);
    });

    it("rejects empty bossTitle", () => {
      const result = validateConfig({
        ...defaultConfig(),
        bossTitle: "",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("bossTitle")));
    });

    it("rejects whitespace-only bossTitle", () => {
      const result = validateConfig({
        ...defaultConfig(),
        bossTitle: "   ",
      });
      assert.strictEqual(result.ok, false);
    });

    it("rejects empty watchSelfTitle", () => {
      const result = validateConfig({
        ...defaultConfig(),
        watchSelfTitle: "",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("watchSelfTitle")));
    });

    it("rejects invalid approvalMode", () => {
      const result = validateConfig({
        ...defaultConfig(),
        approvalMode: "invalid",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("approvalMode")));
    });

    it("accepts all valid approval modes", () => {
      for (const mode of ["strict", "graded", "hybrid"]) {
        const result = validateConfig({
          ...defaultConfig(),
          approvalMode: mode,
        });
        assert.strictEqual(result.ok, true, `Failed for mode: ${mode}`);
      }
    });

    it("rejects missing models object", () => {
      const result = validateConfig({
        ...defaultConfig(),
        models: undefined,
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("models")));
    });

    it("rejects non-string chat model", () => {
      const result = validateConfig({
        ...defaultConfig(),
        models: {
          chat: 123,
          watch: "model",
          groups: {},
        },
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("models.chat")));
    });

    it("rejects non-string watch model", () => {
      const result = validateConfig({
        ...defaultConfig(),
        models: {
          chat: "model",
          watch: 456,
          groups: {},
        },
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("models.watch")));
    });

    it("rejects non-object groups", () => {
      const result = validateConfig({
        ...defaultConfig(),
        models: {
          chat: "model",
          watch: "model",
          groups: "not an object",
        },
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("models.groups")));
    });

    it("rejects non-string group model value", () => {
      const result = validateConfig({
        ...defaultConfig(),
        models: {
          chat: "model",
          watch: "model",
          groups: {
            dev: 123,
          },
        },
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("models.groups.dev")));
    });

    it("rejects non-array externalChannels", () => {
      const result = validateConfig({
        ...defaultConfig(),
        externalChannels: "not an array",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("externalChannels")));
    });

    it("rejects externalChannels with empty strings", () => {
      const result = validateConfig({
        ...defaultConfig(),
        externalChannels: ["feishu", ""],
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("externalChannels")));
    });

    it("rejects externalChannels with whitespace-only strings", () => {
      const result = validateConfig({
        ...defaultConfig(),
        externalChannels: ["feishu", "   "],
      });
      assert.strictEqual(result.ok, false);
    });

    it("accepts valid externalChannels", () => {
      const result = validateConfig({
        ...defaultConfig(),
        externalChannels: ["feishu", "telegram"],
      });
      assert.strictEqual(result.ok, true);
    });

    it("returns multiple errors for multiple issues", () => {
      const result = validateConfig({
        bossTitle: "",
        watchSelfTitle: "",
        approvalMode: "invalid",
        models: undefined,
        externalChannels: "invalid",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.length > 1);
    });
  });

  describe("writeConfig", () => {
    it("writes a valid config file", () => {
      try {
        const testConfig = defaultConfig();
        testConfig.bossTitle = "TestBoss";
        testConfig.models.chat = "gpt-4";

        // writeConfig writes to the project's jinyiwei.config.json
        writeConfig(testConfig);

        // Read back and verify
        const written = JSON.parse(fs.readFileSync(configPath, "utf8"));
        assert.strictEqual(written.bossTitle, "TestBoss");
      } finally {
        // Restore original config
        if (backup) {
          fs.writeFileSync(configPath, backup, "utf8");
        }
      }
    });
  });

  describe("defaultConfig", () => {
    it("returns a valid default configuration", () => {
      const config = defaultConfig();
      assert.strictEqual(config.bossTitle, "Boss");
      assert.strictEqual(config.watchSelfTitle, "锦衣卫");
      assert.strictEqual(config.approvalMode, "hybrid");
      assert.deepStrictEqual(config.externalChannels, ["feishu", "telegram"]);
      assert.ok(typeof config.models === "object");
      assert.ok(typeof config.models.chat === "string");
      assert.ok(typeof config.models.watch === "string");
      assert.ok(typeof config.models.groups === "object");
    });

    it("has empty string defaults for models", () => {
      const config = defaultConfig();
      assert.strictEqual(config.models.chat, "");
      assert.strictEqual(config.models.watch, "");
    });
  });

  describe("getModelForAgent", () => {
    it("returns chat model for chat agent", () => {
      const config = defaultConfig();
      config.models.chat = "gpt-4";
      const model = getModelForAgent(config, "chat", null);
      assert.strictEqual(model, "gpt-4");
    });

    it("returns watch model for watch agent", () => {
      const config = defaultConfig();
      config.models.watch = "claude-3";
      const model = getModelForAgent(config, "watch", null);
      assert.strictEqual(model, "claude-3");
    });

    it("returns group model for grouped agent", () => {
      const config = defaultConfig();
      config.models.groups = { dev: "gpt-4o" };
      const model = getModelForAgent(config, "code", "dev");
      assert.strictEqual(model, "gpt-4o");
    });

    it("falls back to chat model when group model is not set", () => {
      const config = defaultConfig();
      config.models.chat = "gpt-4";
      config.models.groups = { dev: "" };
      const model = getModelForAgent(config, "code", "dev");
      assert.strictEqual(model, "gpt-4");
    });

    it("returns empty string when no model is configured", () => {
      const config = defaultConfig();
      config.models.chat = "";
      config.models.watch = "";
      config.models.groups = {};
      const model = getModelForAgent(config, "chat", null);
      assert.strictEqual(model, "");
    });
  });
});
