import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  uniqueStrings,
  parseDelimitedList,
  formatChannelList,
  parseOpenClawJson,
  buildBeginnerSummary,
  buildInstallNextSteps,
} from "../lib/lifecycle.mjs";

describe("lifecycle utilities", () => {
  describe("uniqueStrings", () => {
    it("removes duplicates", () => {
      const result = uniqueStrings(["a", "b", "a", "c", "b"]);
      assert.deepStrictEqual(result.sort(), ["a", "b", "c"]);
    });

    it("trims whitespace", () => {
      const result = uniqueStrings(["  a  ", "a", " b"]);
      assert.deepStrictEqual(result.sort(), ["a", "b"]);
    });

    it("filters empty strings", () => {
      const result = uniqueStrings(["a", "", "  ", "b"]);
      assert.deepStrictEqual(result.sort(), ["a", "b"]);
    });

    it("handles null and undefined", () => {
      const result = uniqueStrings(["a", null, undefined, "b"]);
      assert.deepStrictEqual(result.sort(), ["a", "b"]);
    });

    it("returns empty array for empty input", () => {
      const result = uniqueStrings([]);
      assert.deepStrictEqual(result, []);
    });

    it("handles mixed types", () => {
      const result = uniqueStrings([null, "a", undefined, "  b  ", "a"]);
      assert.deepStrictEqual(result.sort(), ["a", "b"]);
    });
  });

  describe("parseDelimitedList", () => {
    it("parses comma-separated string", () => {
      const result = parseDelimitedList("a,b,c");
      assert.deepStrictEqual(result.sort(), ["a", "b", "c"]);
    });

    it("parses newline-separated string", () => {
      const result = parseDelimitedList("a\nb\nc");
      assert.deepStrictEqual(result.sort(), ["a", "b", "c"]);
    });

    it("parses mixed delimiters", () => {
      const result = parseDelimitedList("a,b\nc");
      assert.deepStrictEqual(result.sort(), ["a", "b", "c"]);
    });

    it("dedupes and trims", () => {
      const result = parseDelimitedList("  a , b , a , c ");
      assert.deepStrictEqual(result.sort(), ["a", "b", "c"]);
    });

    it("returns array as-is if already array", () => {
      const result = parseDelimitedList(["a", "b", "c"]);
      assert.deepStrictEqual(result.sort(), ["a", "b", "c"]);
    });

    it("returns empty array for non-string/non-array", () => {
      const result = parseDelimitedList(123);
      assert.deepStrictEqual(result, []);

      const result2 = parseDelimitedList(null);
      assert.deepStrictEqual(result2, []);

      const result3 = parseDelimitedList(undefined);
      assert.deepStrictEqual(result3, []);
    });

    it("filters empty strings from arrays", () => {
      const result = parseDelimitedList(["a", "", "b", "  "]);
      assert.deepStrictEqual(result.sort(), ["a", "b"]);
    });

    it("handles whitespace-only strings", () => {
      const result = parseDelimitedList("  \n  ");
      assert.deepStrictEqual(result, []);
    });
  });

  describe("formatChannelList", () => {
    it("formats non-empty array", () => {
      const result = formatChannelList(["feishu", "telegram"]);
      assert.strictEqual(result, "feishu, telegram");
    });

    it("returns 'local only' for empty array", () => {
      const result = formatChannelList([]);
      assert.strictEqual(result, "local only");
    });

    it("handles single channel", () => {
      const result = formatChannelList(["feishu"]);
      assert.strictEqual(result, "feishu");
    });
  });

  describe("parseOpenClawJson", () => {
    it("extracts JSON object from clean output", () => {
      const input = '{"agents": [{"id": "chat"}], "version": "1.0"}';
      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, { agents: [{ id: "chat" }], version: "1.0" });
    });

    it("extracts JSON array from clean output", () => {
      const input = '[{"id": "chat"}, {"id": "watch"}]';
      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, [{ id: "chat" }, { id: "watch" }]);
    });

    it("extracts JSON from noisy CLI output with prefix", () => {
      const input = `Running openclaw agents list...
{"agents": [{"id": "chat"}]}
Done.`;

      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, { agents: [{ id: "chat" }] });
    });

    it("extracts JSON from noisy CLI output with warnings", () => {
      const input = `2026-03-28 WARNING: Some deprecation notice
{"data": {"agents": []}}
Check the logs above.`;

      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, { data: { agents: [] } });
    });

    it("extracts JSON from output with leading whitespace", () => {
      const input = `

  {"key": "value"}`;

      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, { key: "value" });
    });

    it("returns null for non-JSON input", () => {
      const result = parseOpenClawJson("not json at all");
      assert.strictEqual(result, null);
    });

    it("returns null for empty input", () => {
      const result = parseOpenClawJson("");
      assert.strictEqual(result, null);

      const result2 = parseOpenClawJson(null);
      assert.strictEqual(result2, null);

      const result3 = parseOpenClawJson(undefined);
      assert.strictEqual(result3, null);
    });

    it("extracts nested JSON correctly", () => {
      const input = '{"outer": {"inner": {"deep": 123}}}';
      const result = parseOpenClawJson(input);
      assert.strictEqual(result.outer.inner.deep, 123);
    });

    it("handles JSON with escaped quotes", () => {
      const input = '{"message": "Hello \\"World\\""}';
      const result = parseOpenClawJson(input);
      assert.strictEqual(result.message, 'Hello "World"');
    });

    it("handles JSON with newlines in strings", () => {
      const input = '{"message": "Line1\\nLine2"}';
      const result = parseOpenClawJson(input);
      assert.strictEqual(result.message, "Line1\nLine2");
    });

    it("prevents DoS via deeply nested JSON", () => {
      // Create deeply nested JSON
      let nested = '{"a":{';
      for (let i = 0; i < 2000; i++) {
        nested += '"b":{';
      }
      nested += '"value":1' + "}".repeat(2001) + "}";

      // Should return null due to depth limit
      const result = parseOpenClawJson(nested);
      assert.strictEqual(result, null);
    });

    it("handles array with leading text", () => {
      const input = `Some text before
[1, 2, 3]
Some text after`;

      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, [1, 2, 3]);
    });

    it("handles array with trailing text", () => {
      const input = `[1, 2, 3]
Trailing text`;

      const result = parseOpenClawJson(input);
      assert.deepStrictEqual(result, [1, 2, 3]);
    });
  });
});

describe("buildBeginnerSummary", () => {
  it("includes external agents in summary", () => {
    const summary = buildBeginnerSummary({
      externalAgents: [{ name: "ChatAgent", model: "gpt-4" }],
      groups: {},
      externalChannels: ["feishu"],
      bindings: [],
      needsConfig: false,
    });

    assert.ok(summary.some((line) => line.includes("ChatAgent")));
  });

  it("includes channel information", () => {
    const summary = buildBeginnerSummary({
      externalAgents: [],
      groups: {},
      externalChannels: ["feishu", "telegram"],
      bindings: [],
      needsConfig: false,
    });

    assert.ok(summary.some((line) => line.includes("feishu")));
    assert.ok(summary.some((line) => line.includes("telegram")));
  });

  it("indicates local only when no channels", () => {
    const summary = buildBeginnerSummary({
      externalAgents: [],
      groups: {},
      externalChannels: [],
      bindings: [],
      needsConfig: false,
    });

    assert.ok(summary.some((line) => line.includes("local only")));
  });

  it("includes internal groups", () => {
    const summary = buildBeginnerSummary({
      externalAgents: [],
      groups: {
        dev: { agents: ["CodeAgent"], model: "gpt-4" },
      },
      externalChannels: [],
      bindings: [],
      needsConfig: false,
    });

    assert.ok(summary.some((line) => line.includes("dev")));
    assert.ok(summary.some((line) => line.includes("CodeAgent")));
  });

  it("includes bindings when present", () => {
    const summary = buildBeginnerSummary({
      externalAgents: [],
      groups: {},
      externalChannels: ["feishu"],
      bindings: [{ agent: "ChatAgent", channel: "feishu", accountId: "acc-1" }],
      needsConfig: false,
    });

    assert.ok(summary.some((line) => line.includes("Channel bindings")));
    assert.ok(summary.some((line) => line.includes("feishu")));
  });

  it("includes config hint when needsConfig is true", () => {
    const summary = buildBeginnerSummary({
      externalAgents: [],
      groups: {},
      externalChannels: [],
      bindings: [],
      needsConfig: true,
    });

    assert.ok(summary.some((line) => line.includes("jinyiwei init")));
  });
});

describe("buildInstallNextSteps", () => {
  it("always includes status command", () => {
    const steps = buildInstallNextSteps({
      hasOpenClaw: false,
      hasBindings: false,
      needsConfig: false,
    });

    assert.ok(steps.some((line) => line.includes("jinyiwei status")));
  });

  it("includes init hint when needsConfig is true", () => {
    const steps = buildInstallNextSteps({
      hasOpenClaw: true,
      hasBindings: false,
      needsConfig: true,
    });

    assert.ok(steps.some((line) => line.includes("jinyiwei init")));
  });

  it("includes chat agent hint when config is complete", () => {
    const steps = buildInstallNextSteps({
      hasOpenClaw: true,
      hasBindings: false,
      needsConfig: false,
    });

    assert.ok(steps.some((line) => line.includes("ChatAgent")));
  });
});
