import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  validateModel,
  validateChannel,
  maskModel,
  maskChannels,
  VALID_PROVIDERS,
} from "../lib/models.mjs";
import { setLocale, getLocale } from "../lib/i18n.mjs";

// Force English locale for deterministic test assertions
let savedLocale;
before(() => { savedLocale = getLocale(); setLocale("en"); });
after(() => { setLocale(savedLocale); });

describe("validateModel", () => {
  it("returns ok when model is valid", () => {
    const result = validateModel({
      provider: "openai",
      modelId: "gpt-4o",
    }, "chat");
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("returns ok with optional fields", () => {
    const result = validateModel({
      provider: "anthropic",
      baseURL: "https://api.anthropic.com",
      apiKey: "sk-ant-...",
      modelId: "claude-sonnet-4-6",
    }, "chat");
    assert.strictEqual(result.ok, true);
  });

  it("returns error when provider is missing", () => {
    const result = validateModel({ modelId: "gpt-4o" }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("provider")));
  });

  it("returns error when provider is invalid", () => {
    const result = validateModel({ provider: "unknown", modelId: "gpt-4o" }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("provider")));
  });

  it("returns error when modelId is missing", () => {
    const result = validateModel({ provider: "openai" }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("modelId")));
  });

  it("returns error when modelId is not a string", () => {
    const result = validateModel({ provider: "openai", modelId: 123 }, "chat");
    assert.strictEqual(result.ok, false);
  });

  it("returns error when baseURL is not a string", () => {
    const result = validateModel({ provider: "openai", modelId: "gpt-4o", baseURL: 123 }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("baseURL")));
  });

  it("returns error when apiKey is not a string", () => {
    const result = validateModel({ provider: "openai", modelId: "gpt-4o", apiKey: 123 }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("apiKey")));
  });

  it("returns error when custom provider lacks baseURL", () => {
    const result = validateModel({ provider: "custom", modelId: "llama-3" }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("custom")));
  });

  it("returns error when custom provider lacks apiKey", () => {
    const result = validateModel({ provider: "custom", baseURL: "https://api.example.com", modelId: "llama-3" }, "chat");
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("custom")));
  });

  it("accepts all valid providers", () => {
    const providers = ["openai", "anthropic", "google", "deepseek", "minimax", "custom"];
    for (const provider of providers) {
      const model = { provider, modelId: "test-model" };
      if (provider === "custom") {
        model.baseURL = "https://api.example.com";
        model.apiKey = "sk-test";
      }
      const result = validateModel(model, "chat");
      assert.strictEqual(result.ok, true, `provider ${provider} should be valid`);
    }
  });
});

describe("validateChannel", () => {
  it("returns ok for valid feishu with webhookUrl", () => {
    const result = validateChannel("feishu", { webhookUrl: "https://open.feishu.cn/..." });
    assert.strictEqual(result.ok, true);
  });

  it("returns ok for valid feishu with botToken", () => {
    const result = validateChannel("feishu", { botToken: "test-token" });
    assert.strictEqual(result.ok, true);
  });

  it("returns ok for valid feishu with all fields", () => {
    const result = validateChannel("feishu", {
      webhookUrl: "https://open.feishu.cn/...",
      botToken: "test-token",
      appId: "app-123",
      appSecret: "secret-456",
    });
    assert.strictEqual(result.ok, true);
  });

  it("returns error when feishu has neither webhookUrl nor botToken", () => {
    const result = validateChannel("feishu", {});
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("webhookUrl") || e.includes("botToken")));
  });

  it("returns error when feishu appId without appSecret", () => {
    const result = validateChannel("feishu", { webhookUrl: "https://...", appId: "app-123" });
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("appId")));
  });

  it("returns error when feishu appSecret without appId", () => {
    const result = validateChannel("feishu", { webhookUrl: "https://...", appSecret: "secret" });
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("appSecret")));
  });

  it("returns ok for valid telegram with botToken", () => {
    const result = validateChannel("telegram", { botToken: "123456:ABC-Def" });
    assert.strictEqual(result.ok, true);
  });

  it("returns ok for valid telegram with botToken and apiBase", () => {
    const result = validateChannel("telegram", { botToken: "123456:ABC-Def", apiBase: "https://api.telegram.org" });
    assert.strictEqual(result.ok, true);
  });

  it("returns error when telegram has no botToken", () => {
    const result = validateChannel("telegram", {});
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("botToken")));
  });

  it("returns error for unknown channel type", () => {
    const result = validateChannel("slack", { botToken: "x" });
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("unknown")));
  });

  it("returns error when channel is not an object", () => {
    const result = validateChannel("feishu", null);
    assert.strictEqual(result.ok, false);
  });
});

describe("maskModel", () => {
  it("returns null when model is null", () => {
    assert.strictEqual(maskModel(null), null);
  });

  it("masks apiKey showing only last 4 chars", () => {
    const result = maskModel({ provider: "openai", modelId: "gpt-4o", apiKey: "sk-abcdefghijklmnop" });
    assert.strictEqual(result.apiKey, "***mnop");
  });

  it("returns empty string for missing apiKey", () => {
    const result = maskModel({ provider: "openai", modelId: "gpt-4o" });
    assert.strictEqual(result.apiKey, "");
  });

  it("does not modify provider or modelId", () => {
    const result = maskModel({ provider: "anthropic", modelId: "claude-3", apiKey: "sk-ant" });
    assert.strictEqual(result.provider, "anthropic");
    assert.strictEqual(result.modelId, "claude-3");
  });
});

describe("maskChannels", () => {
  it("returns null when channels is null", () => {
    assert.strictEqual(maskChannels(null), null);
  });

  it("masks feishu botToken and appSecret", () => {
    const result = maskChannels({
      feishu: {
        webhookUrl: "https://open.feishu.cn/...",
        botToken: "feishu-bot-token-abcdef",
        appId: "app-123",
        appSecret: "feishu-secret-xyz",
      },
    });
    assert.strictEqual(result.feishu.webhookUrl, "https://open.feishu.cn/...");
    assert.strictEqual(result.feishu.botToken, "***cdef");
    assert.strictEqual(result.feishu.appId, "app-123");
    // slice(-4) of "feishu-secret-xyz" = "y-zx" -> "feishu-secret-xyz".slice(-4) = "-xyz"
    assert.strictEqual(result.feishu.appSecret, "***-xyz");
  });

  it("masks telegram botToken", () => {
    const result = maskChannels({
      telegram: { botToken: "123456:ABC-Def-Ghi" },
    });
    // slice(-4) of "123456:ABC-Def-Ghi" = "ef-Ghi".slice(-4) = "-Ghi"
    assert.strictEqual(result.telegram.botToken, "***-Ghi");
  });

  it("returns empty string for missing botToken", () => {
    const result = maskChannels({
      feishu: { webhookUrl: "https://..." },
    });
    assert.strictEqual(result.feishu.botToken, "");
  });
});

describe("VALID_PROVIDERS", () => {
  it("contains expected providers", () => {
    assert.ok(VALID_PROVIDERS.includes("openai"));
    assert.ok(VALID_PROVIDERS.includes("anthropic"));
    assert.ok(VALID_PROVIDERS.includes("google"));
    assert.ok(VALID_PROVIDERS.includes("deepseek"));
    assert.ok(VALID_PROVIDERS.includes("minimax"));
    assert.ok(VALID_PROVIDERS.includes("custom"));
  });

  it("has 6 providers", () => {
    assert.strictEqual(VALID_PROVIDERS.length, 6);
  });
});
