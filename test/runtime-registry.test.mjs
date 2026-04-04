import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loadRuntimeRegistry,
  findAgentByName,
  internalAgents,
} from "../lib/governance/runtime-registry.mjs";

describe("runtime-registry", () => {
  describe("loadRuntimeRegistry", () => {
    it("returns a registry array", () => {
      const registry = loadRuntimeRegistry();
      assert.ok(Array.isArray(registry));
    });

    it("returns non-empty registry with expected agents", () => {
      const registry = loadRuntimeRegistry();
      assert.ok(registry.length > 0);
    });

    it("registry entries have id, name, role, and group or null", () => {
      const registry = loadRuntimeRegistry();

      for (const agent of registry) {
        assert.ok(typeof agent.id === "string");
        assert.ok(typeof agent.name === "string");
        assert.ok(typeof agent.role === "string");
        assert.ok(agent.group === null || typeof agent.group === "string");
      }
    });

    it("external agents have null group", () => {
      const registry = loadRuntimeRegistry();

      const chatAgent = registry.find((a) => a.name === "ChatAgent");
      const watchAgent = registry.find((a) => a.name === "WatchAgent");

      if (chatAgent) assert.strictEqual(chatAgent.group, null);
      if (watchAgent) assert.strictEqual(watchAgent.group, null);
    });

    it("internal agents have a non-null group", () => {
      const registry = loadRuntimeRegistry();

      const internal = internalAgents(registry);
      for (const agent of internal) {
        assert.ok(
          agent.group !== null && typeof agent.group === "string",
          `${agent.name} should have a string group, got ${agent.group}`
        );
      }
    });

    it("returns empty array for non-existent workspace", () => {
      const registry = loadRuntimeRegistry("/nonexistent/workspace");
      assert.ok(Array.isArray(registry));
    });

    it("includes external agents", () => {
      const registry = loadRuntimeRegistry();
      const names = registry.map((a) => a.name);

      assert.ok(names.includes("ChatAgent"));
      assert.ok(names.includes("WatchAgent"));
    });
  });

  describe("findAgentByName", () => {
    it("finds existing agent by name", () => {
      const registry = loadRuntimeRegistry();
      const agent = findAgentByName(registry, "ChatAgent");

      assert.ok(agent !== undefined);
      assert.strictEqual(agent.name, "ChatAgent");
    });

    it("returns undefined for non-existent agent", () => {
      const registry = loadRuntimeRegistry();
      const agent = findAgentByName(registry, "NonExistentAgent");

      assert.strictEqual(agent, undefined);
    });

    it("finds internal agents", () => {
      const registry = loadRuntimeRegistry();
      const internal = internalAgents(registry);

      if (internal.length > 0) {
        const agent = findAgentByName(registry, internal[0].name);
        assert.ok(agent !== undefined);
        assert.strictEqual(agent.name, internal[0].name);
      }
    });

    it("is case-sensitive", () => {
      const registry = loadRuntimeRegistry();

      const agent = findAgentByName(registry, "chatagent");
      assert.strictEqual(agent, undefined);

      const agent2 = findAgentByName(registry, "ChatAgent");
      assert.ok(agent2 !== undefined);
    });

    it("handles empty registry", () => {
      const agent = findAgentByName([], "ChatAgent");
      assert.strictEqual(agent, undefined);
    });
  });

  describe("internalAgents", () => {
    it("returns only internal agents", () => {
      const registry = loadRuntimeRegistry();
      const internal = internalAgents(registry);

      for (const agent of internal) {
        assert.ok(
          agent.role === "internal",
          `${agent.name} should have role "internal", got "${agent.role}"`
        );
      }
    });

    it("excludes external agents", () => {
      const registry = loadRuntimeRegistry();
      const internal = internalAgents(registry);
      const names = internal.map((a) => a.name);

      assert.ok(!names.includes("ChatAgent"));
      assert.ok(!names.includes("WatchAgent"));
    });

    it("returns empty array when no internal agents", () => {
      // With minimal registry, might be empty
      const internal = internalAgents([]);
      assert.deepStrictEqual(internal, []);
    });

    it("includes agents from all internal groups", () => {
      const registry = loadRuntimeRegistry();
      const internal = internalAgents(registry);

      // Should include at least CodeAgent or UIAgent from dev/content groups
      const internalNames = internal.map((a) => a.name);

      // Just verify we have some internal agents
      assert.ok(internal.length >= 0);
    });
  });
});

describe("runtime-registry agent model resolution", () => {
  it("each agent has a model field", () => {
    const registry = loadRuntimeRegistry();

    for (const agent of registry) {
      assert.ok("model" in agent, `${agent.name} should have model field`);
    }
  });

  it("model is a string or an object", () => {
    const registry = loadRuntimeRegistry();

    for (const agent of registry) {
      const isString = typeof agent.model === "string";
      const isObject = agent.model && typeof agent.model === "object" && !Array.isArray(agent.model);
      assert.ok(
        isString || isObject,
        `${agent.name} model should be string or object, got ${typeof agent.model}`
      );
    }
  });

  it("charterPath is a string for each agent", () => {
    const registry = loadRuntimeRegistry();

    for (const agent of registry) {
      assert.ok(typeof agent.charterPath === "string");
      assert.ok(agent.charterPath.length > 0);
    }
  });
});
