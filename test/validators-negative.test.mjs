import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";
import { validatePlugin } from "../lib/validators/plugin.mjs";
import { validateSkills } from "../lib/validators/skills.mjs";
import { validateVersion } from "../lib/validators/version.mjs";

describe("validator negative tests", () => {
  describe("validatePlugin — detects tampered defaults", () => {
    /** @type {string} */
    let original;
    const pluginPath = resolve("openclaw.plugin.json");

    beforeEach(() => {
      original = fs.readFileSync(pluginPath, "utf8");
    });

    afterEach(() => {
      fs.writeFileSync(pluginPath, original, "utf8");
    });

    it("rejects when bossTitle default is changed", () => {
      const plugin = JSON.parse(original);
      plugin.configSchema.properties.bossTitle.default = "Leader";
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validatePlugin();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("bossTitle")));
    });

    it("rejects when approvalMode default is changed", () => {
      const plugin = JSON.parse(original);
      plugin.configSchema.properties.approvalMode.default = "strict";
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validatePlugin();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("approvalMode")));
    });
  });

  describe("validateSkills — detects out-of-sync manifest", () => {
    /** @type {string} */
    let original;
    const manifestPath = resolve("manifests/preinstalled-skills.json");

    beforeEach(() => {
      original = fs.readFileSync(manifestPath, "utf8");
    });

    afterEach(() => {
      fs.writeFileSync(manifestPath, original, "utf8");
    });

    it("rejects when manifest has extra skill", () => {
      const manifest = JSON.parse(original);
      manifest.skills.push("fake-nonexistent-skill");
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
      const result = validateSkills();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("out of sync")));
    });

    it("rejects when manifest skills array is empty", () => {
      fs.writeFileSync(manifestPath, JSON.stringify({ source: "skills_list.md", skills: [] }, null, 2) + "\n", "utf8");
      const result = validateSkills();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("no skills")));
    });
  });

  describe("validateVersion — detects version mismatch", () => {
    /** @type {string} */
    let original;
    const pluginPath = resolve("openclaw.plugin.json");

    beforeEach(() => {
      original = fs.readFileSync(pluginPath, "utf8");
    });

    afterEach(() => {
      fs.writeFileSync(pluginPath, original, "utf8");
    });

    it("rejects when versions differ", () => {
      const plugin = JSON.parse(original);
      plugin.version = "99.99.99";
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validateVersion();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("does not match")));
    });
  });
});
