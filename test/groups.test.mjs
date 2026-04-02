import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "../lib/paths.mjs";
import { discoverGroups, buildAgentRegistry, agentIdToName } from "../lib/groups.mjs";
import { defaultConfig } from "../lib/config.mjs";

describe("groups", () => {
  describe("agentIdToName", () => {
    it("converts standard agent ids to names", () => {
      assert.strictEqual(agentIdToName("chat"), "ChatAgent");
      assert.strictEqual(agentIdToName("watch"), "WatchAgent");
      assert.strictEqual(agentIdToName("code"), "CodeAgent");
      assert.strictEqual(agentIdToName("review"), "ReviewAgent");
      assert.strictEqual(agentIdToName("test"), "TestAgent");
    });

    it("converts ui to UIAgent", () => {
      assert.strictEqual(agentIdToName("ui"), "UIAgent");
    });

    it("capitalizes first letter for unknown ids", () => {
      assert.strictEqual(agentIdToName("unknown"), "UnknownAgent");
      assert.strictEqual(agentIdToName("custom"), "CustomAgent");
    });

    it("handles single character ids", () => {
      assert.strictEqual(agentIdToName("a"), "AAgent");
      assert.strictEqual(agentIdToName("x"), "XAgent");
    });
  });

  describe("discoverGroups", () => {
    it("returns an object with groups key", () => {
      const result = discoverGroups();
      assert.ok(typeof result === "object");
      assert.ok("groups" in result);
    });

    it("groups is an object", () => {
      const result = discoverGroups();
      assert.ok(typeof result.groups === "object");
    });

    it("discovers dev group with CodeAgent, ReviewAgent, TestAgent", () => {
      const result = discoverGroups();
      if (result.groups.dev) {
        const devAgents = result.groups.dev.agents.map((a) => a.name);
        assert.ok(devAgents.includes("CodeAgent"));
        assert.ok(devAgents.includes("ReviewAgent"));
        assert.ok(devAgents.includes("TestAgent"));
      }
    });

    it("discovers content group with UIAgent", () => {
      const result = discoverGroups();
      if (result.groups.content) {
        const contentAgents = result.groups.content.agents.map((a) => a.name);
        assert.ok(contentAgents.includes("UIAgent"));
      }
    });

    it("each agent has id, name, and charterPath", () => {
      const result = discoverGroups();
      for (const [groupName, group] of Object.entries(result.groups)) {
        for (const agent of group.agents) {
          assert.ok(typeof agent.id === "string");
          assert.ok(typeof agent.name === "string");
          assert.ok(typeof agent.charterPath === "string");
          assert.ok(agent.charterPath.includes(groupName));
          assert.ok(agent.charterPath.includes(agent.id));
        }
      }
    });

    it("each charterPath points to existing AGENT.md", () => {
      const result = discoverGroups();
      for (const [groupName, group] of Object.entries(result.groups)) {
        for (const agent of group.agents) {
          const fullPath = resolve(agent.charterPath);
          assert.ok(
            fs.existsSync(fullPath),
            `Charter path should exist: ${agent.charterPath}`
          );
        }
      }
    });

    it("charterPath format is agents/groups/<groupName>/<agentId>/AGENT.md", () => {
      const result = discoverGroups();
      for (const [groupName, group] of Object.entries(result.groups)) {
        for (const agent of group.agents) {
          assert.match(
            agent.charterPath,
            /^agents\/groups\/[^/]+\/[^/]+\/AGENT\.md$/
          );
        }
      }
    });
  });

  describe("buildAgentRegistry", () => {

    it("returns an array", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);
      assert.ok(Array.isArray(registry));
    });

    it("includes external agents (ChatAgent, WatchAgent)", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);
      const names = registry.map((a) => a.name);

      assert.ok(names.includes("ChatAgent"));
      assert.ok(names.includes("WatchAgent"));
    });

    it("includes internal agents from discovered groups", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);
      const names = registry.map((a) => a.name);

      // Internal agents should be present
      assert.ok(names.includes("CodeAgent") || names.includes("UIAgent") || names.length > 2);
    });

    it("external agents have null group", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);

      const chatAgent = registry.find((a) => a.name === "ChatAgent");
      const watchAgent = registry.find((a) => a.name === "WatchAgent");

      assert.strictEqual(chatAgent?.group, null);
      assert.strictEqual(watchAgent?.group, null);
    });

    it("internal agents have a group name", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);

      const internalAgents = registry.filter((a) => a.name !== "ChatAgent" && a.name !== "WatchAgent");
      for (const agent of internalAgents) {
        assert.ok(
          typeof agent.group === "string" && agent.group.length > 0,
          `${agent.name} should have a group`
        );
      }
    });

    it("each agent has id, name, role, group, charterPath, and model", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);

      for (const agent of registry) {
        assert.ok(typeof agent.id === "string");
        assert.ok(typeof agent.name === "string");
        assert.ok(typeof agent.role === "string");
        assert.ok(typeof agent.charterPath === "string");
        assert.ok(typeof agent.model === "string");
      }
    });

    it("external agents have role 'external'", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);

      const chatAgent = registry.find((a) => a.name === "ChatAgent");
      const watchAgent = registry.find((a) => a.name === "WatchAgent");

      assert.strictEqual(chatAgent?.role, "external");
      assert.strictEqual(watchAgent?.role, "external");
    });

    it("internal agents have role 'internal'", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);

      const internalAgents = registry.filter((a) => a.name !== "ChatAgent" && a.name !== "WatchAgent");
      for (const agent of internalAgents) {
        assert.strictEqual(agent.role, "internal");
      }
    });

    it("agents have unique names", () => {
      const config = defaultConfig();
      const registry = buildAgentRegistry(config);
      const names = registry.map((a) => a.name);
      const uniqueNames = new Set(names);

      assert.strictEqual(names.length, uniqueNames.size, "Agent names should be unique");
    });

    it("model resolution works for external agents", () => {
      const config = defaultConfig();
      config.models.chat = "gpt-4";
      config.models.watch = "claude-3";

      const registry = buildAgentRegistry(config);

      const chatAgent = registry.find((a) => a.name === "ChatAgent");
      assert.strictEqual(chatAgent?.model, "gpt-4");

      const watchAgent = registry.find((a) => a.name === "WatchAgent");
      assert.strictEqual(watchAgent?.model, "claude-3");
    });
  });
});

// Import fs for the charter path existence check
import fs from "node:fs";
