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
    };

    mod.default(mockApi);
    assert.strictEqual(registeredMethod, "jinyiwei.status");
    assert.strictEqual(typeof registeredHandler, "function");
  });

  it("status handler responds with all config fields", async () => {
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
    assert.ok(Array.isArray(responseData.externalIngressAgents));
    assert.ok(Array.isArray(responseData.externalChannels));
    assert.strictEqual(typeof responseData.autoInstallListedSkills, "boolean");
    assert.strictEqual(typeof responseData.listedSkillsManifest, "string");
  });

  it("uses defaults when getConfig is undefined", async () => {
    const mod = await import("../openclaw-plugin.js");

    /** @type {Function | undefined} */
    let registeredHandler;

    const mockApi = {
      registerGatewayMethod: (/** @type {string} */ _name, /** @type {Function} */ handler) => {
        registeredHandler = handler;
      },
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
    assert.deepStrictEqual(responseData.externalIngressAgents, ["ChatAgent", "WatchAgent"]);
    assert.deepStrictEqual(responseData.externalChannels, ["feishu", "telegram"]);
    assert.strictEqual(responseData.autoInstallListedSkills, true);
    assert.strictEqual(responseData.listedSkillsManifest, "manifests/preinstalled-skills.json");
  });
});
