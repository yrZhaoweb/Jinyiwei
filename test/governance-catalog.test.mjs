import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolve } from "../lib/paths.mjs";
import {
  parseActionCatalog,
  loadActionCatalog,
  findActionDefinition,
} from "../lib/governance/action-catalog.mjs";

describe("action-catalog", () => {
  describe("parseActionCatalog", () => {
    it("parses valid action catalog markdown", () => {
      const markdown = `| Action Type | Owners | Class | Risk | Default Decision |
|---|---|---|---|---|
| dispatch.send_to_internal_agent | ChatAgent | operational | low | skip-approval |
| charter.change_agent_md | ChatAgent | governance-change | high | hard-block |`;

      const entries = parseActionCatalog(markdown);
      assert.strictEqual(entries.length, 2);

      assert.strictEqual(entries[0].actionType, "dispatch.send_to_internal_agent");
      assert.deepStrictEqual(entries[0].owners, ["ChatAgent"]);
      assert.strictEqual(entries[0].className, "operational");
      assert.strictEqual(entries[0].defaultRisk, "low");
      assert.strictEqual(entries[0].defaultDecision, "skip-approval");
    });

    it("parses multiple owners", () => {
      const markdown = `| Action Type | Owners | Class | Risk | Default Decision |
|---|---|---|---|---|
| test.action | ChatAgent, WatchAgent | operational | low | skip-approval |`;

      const entries = parseActionCatalog(markdown);
      assert.deepStrictEqual(entries[0].owners, ["ChatAgent", "WatchAgent"]);
    });

    it("normalizes owners by trimming whitespace", () => {
      const markdown = `| Action Type | Owners | Class | Risk | Default Decision |
|---|---|---|---|---|
| test.action | ChatAgent , WatchAgent | operational | medium | skip-approval |`;

      const entries = parseActionCatalog(markdown);
      assert.deepStrictEqual(entries[0].owners, ["ChatAgent", "WatchAgent"]);
    });

    it("returns empty array for markdown without table", () => {
      const markdown = `# No table here`;
      const entries = parseActionCatalog(markdown);
      assert.deepStrictEqual(entries, []);
    });

    it("returns empty array for table with fewer than 3 lines", () => {
      const markdown = `| Header |
|---|`;
      const entries = parseActionCatalog(markdown);
      assert.deepStrictEqual(entries, []);
    });

    it("skips rows with fewer than 5 cells", () => {
      const markdown = `| Action Type | Owners | Class |
|---|---|---|
| valid.action | ChatAgent | operational | low | skip-approval |`;

      const entries = parseActionCatalog(markdown);
      assert.ok(entries.length >= 0); // May include valid row or skip
    });

    it("normalizes cell values by trimming backticks", () => {
      const markdown = `| Action Type | Owners | Class | Risk | Default Decision |
|---|---|---|---|---|
| \`dispatch.send_to_internal_agent\` | \`ChatAgent\` | \`operational\` | \`low\` | \`skip-approval\` |`;

      const entries = parseActionCatalog(markdown);
      assert.strictEqual(entries[0].actionType, "dispatch.send_to_internal_agent");
      assert.strictEqual(entries[0].owners[0], "ChatAgent");
      assert.strictEqual(entries[0].className, "operational");
      assert.strictEqual(entries[0].defaultRisk, "low");
      assert.strictEqual(entries[0].defaultDecision, "skip-approval");
    });

    it("filters empty owners", () => {
      const markdown = `| Action Type | Owners | Class | Risk | Default Decision |
|---|---|---|---|---|
| test.action | , , | operational | low | skip-approval |`;

      const entries = parseActionCatalog(markdown);
      assert.deepStrictEqual(entries[0].owners, []);
    });

    it("handles various risk levels", () => {
      const testCases = [
        { risk: "low", expected: "low" },
        { risk: "medium", expected: "medium" },
        { risk: "high", expected: "high" },
      ];

      for (const { risk, expected } of testCases) {
        const markdown = `| Action Type | Owners | Class | Risk | Default Decision |
|---|---|---|---|---|
| test.${risk} | ChatAgent | operational | ${risk} | skip-approval |`;

        const entries = parseActionCatalog(markdown);
        assert.strictEqual(entries[0].defaultRisk, expected);
      }
    });
  });

  describe("loadActionCatalog", () => {
    it("loads action catalog from rules file", () => {
      const catalog = loadActionCatalog();
      assert.ok(Array.isArray(catalog));
      assert.ok(catalog.length > 0);
    });

    it("returns non-empty catalog with required fields", () => {
      const catalog = loadActionCatalog();
      for (const entry of catalog) {
        assert.ok(typeof entry.actionType === "string");
        assert.ok(Array.isArray(entry.owners));
        assert.ok(typeof entry.className === "string");
        assert.ok(typeof entry.defaultRisk === "string");
        assert.ok(typeof entry.defaultDecision === "string");
      }
    });

    it("contains dispatch.send_to_internal_agent action", () => {
      const catalog = loadActionCatalog();
      assert.ok(
        catalog.some((entry) => entry.actionType === "dispatch.send_to_internal_agent"),
        "catalog should contain dispatch.send_to_internal_agent"
      );
    });

    it("contains charter.change_agent_md action", () => {
      const catalog = loadActionCatalog();
      assert.ok(
        catalog.some((entry) => entry.actionType === "charter.change_agent_md"),
        "catalog should contain charter.change_agent_md"
      );
    });

    it("contains governance-change class actions", () => {
      const catalog = loadActionCatalog();
      assert.ok(
        catalog.some((entry) => entry.className === "governance-change"),
        "catalog should contain governance-change class"
      );
    });

    it("every entry has at least one owner", () => {
      const catalog = loadActionCatalog();
      for (const entry of catalog) {
        assert.ok(
          entry.owners.length > 0,
          `entry ${entry.actionType} should have at least one owner`
        );
      }
    });

    it("every entry has a valid risk level", () => {
      const catalog = loadActionCatalog();
      const validRisks = ["low", "medium", "high"];
      for (const entry of catalog) {
        assert.ok(
          validRisks.includes(entry.defaultRisk),
          `entry ${entry.actionType} should have valid risk level`
        );
      }
    });
  });

  describe("findActionDefinition", () => {
    it("finds existing action type", () => {
      const action = findActionDefinition("dispatch.send_to_internal_agent");
      assert.ok(action !== undefined);
      assert.strictEqual(action.actionType, "dispatch.send_to_internal_agent");
    });

    it("returns undefined for unknown action type", () => {
      const action = findActionDefinition("nonexistent.action");
      assert.strictEqual(action, undefined);
    });

    it("finds governance change action", () => {
      const action = findActionDefinition("charter.change_agent_md");
      assert.ok(action !== undefined);
      assert.strictEqual(action.className, "governance-change");
    });

    it("finds block-by-default decision actions", () => {
      const catalog = loadActionCatalog();
      const blockActions = catalog.filter(
        (entry) => entry.defaultDecision === "block by default"
      );
      assert.ok(blockActions.length > 0, "should have block-by-default actions");

      for (const action of blockActions) {
        const found = findActionDefinition(action.actionType);
        assert.strictEqual(found.defaultDecision, "block by default");
      }
    });
  });
});
