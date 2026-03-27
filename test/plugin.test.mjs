import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("openclaw-plugin.js", () => {
  it("exports id as 'jinyiwei'", async () => {
    const mod = await import("../openclaw-plugin.js");
    assert.strictEqual(mod.id, "jinyiwei");
  });

  it("exports a default register function", async () => {
    const mod = await import("../openclaw-plugin.js");
    assert.strictEqual(typeof mod.default, "function");
  });

  it("register calls api.registerGatewayMethod with status", async () => {
    const mod = await import("../openclaw-plugin.js");

    /** @type {string | undefined} */
    let registeredMethod;
    /** @type {Function | undefined} */
    let registeredHandler;

    const mockApi = {
      getConfig: () => ({}),
      registerGatewayMethod: (/** @type {string} */ name, /** @type {Function} */ handler) => {
        registeredMethod = name;
        registeredHandler = handler;
      },
      registerTool: () => {},
    };

    mod.default(mockApi);
    assert.strictEqual(registeredMethod, "jinyiwei.status");
    assert.strictEqual(typeof registeredHandler, "function");
  });

  it("register calls api.registerTool for governance tools", async () => {
    const mod = await import("../openclaw-plugin.js");

    /** @type {string[]} */
    const registeredTools = [];

    const mockApi = {
      getConfig: () => ({}),
      registerGatewayMethod: () => {},
      registerTool: (/** @type {{ name: string }} */ tool) => {
        registeredTools.push(tool.name);
      },
    };

    mod.default(mockApi);
    assert.ok(registeredTools.includes("jinyiwei_dispatch"));
    assert.ok(registeredTools.includes("jinyiwei_review"));
    assert.ok(registeredTools.includes("jinyiwei_approve"));
    assert.ok(registeredTools.includes("jinyiwei_reject"));
    assert.ok(registeredTools.includes("jinyiwei_audit"));
  });

  it("review tool rejects unknown action types", async () => {
    const mod = await import("../openclaw-plugin.js");

    /** @type {Record<string, any>} */
    const registeredTools = {};

    const mockApi = {
      getConfig: () => ({}),
      registerGatewayMethod: () => {},
      registerTool: (tool) => {
        registeredTools[tool.name] = tool;
      },
    };

    mod.default(mockApi);

    const result = await registeredTools.jinyiwei_review.execute("1", {
      decision_id: "dec-1",
      packet_id: "pkt-1",
      target_agent: "CodeAgent",
      action_type: "unknown.action",
      risk_hint: "low",
      goal: "Test unknown action",
    });

    assert.match(result.content[0].text, /`decision`: reject/);
    assert.match(result.content[0].text, /rules\/action-catalog\.md/);
  });

  it("status handler responds with config fields", async () => {
    const mod = await import("../openclaw-plugin.js");

    /** @type {Function | undefined} */
    let registeredHandler;

    const mockApi = {
      getConfig: () => ({
        bossTitle: "Chief",
        approvalMode: "strict",
      }),
      registerGatewayMethod: (/** @type {string} */ _name, /** @type {Function} */ handler) => {
        registeredHandler = handler;
      },
      registerTool: () => {},
    };

    mod.default(mockApi);

    /** @type {any} */
    let responseData;
    registeredHandler?.({
      respond: (/** @type {boolean} */ ok, /** @type {any} */ data) => {
        responseData = data;
      },
    });

    assert.strictEqual(responseData.enabled, true);
    assert.strictEqual(responseData.bossTitle, "Chief");
    assert.strictEqual(responseData.approvalMode, "strict");
    assert.strictEqual(responseData.watchSelfTitle, "锦衣卫");
  });

  it("uses defaults when getConfig is undefined", async () => {
    const mod = await import("../openclaw-plugin.js");

    /** @type {Function | undefined} */
    let registeredHandler;

    const mockApi = {
      registerGatewayMethod: (/** @type {string} */ _name, /** @type {Function} */ handler) => {
        registeredHandler = handler;
      },
      registerTool: () => {},
    };

    mod.default(mockApi);

    /** @type {any} */
    let responseData;
    registeredHandler?.({
      respond: (/** @type {boolean} */ _ok, /** @type {any} */ data) => {
        responseData = data;
      },
    });

    assert.strictEqual(responseData.bossTitle, "Boss");
    assert.strictEqual(responseData.watchSelfTitle, "锦衣卫");
    assert.strictEqual(responseData.approvalMode, "hybrid");
  });
});
