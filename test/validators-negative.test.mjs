import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";
import { validatePlugin } from "../lib/validators/plugin.mjs";
import { validateSkills } from "../lib/validators/skills.mjs";
import { validateVersion } from "../lib/validators/version.mjs";
import { validateConfigFile } from "../lib/validators/config.mjs";

describe("validator negative tests", () => {
  describe("validatePlugin — detects structural violations", () => {
    /** @type {string} */
    let original;
    const pluginPath = resolve("openclaw.plugin.json");

    beforeEach(() => {
      original = fs.readFileSync(pluginPath, "utf8");
    });

    afterEach(() => {
      fs.writeFileSync(pluginPath, original, "utf8");
    });

    it("rejects when id is missing", () => {
      const plugin = JSON.parse(original);
      delete plugin.id;
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validatePlugin();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("id")));
    });

    it("rejects when name is missing", () => {
      const plugin = JSON.parse(original);
      delete plugin.name;
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validatePlugin();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("name")));
    });

    it("rejects when version is missing", () => {
      const plugin = JSON.parse(original);
      delete plugin.version;
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validatePlugin();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("version")));
    });

    it("rejects when skills is not an array", () => {
      const plugin = JSON.parse(original);
      plugin.skills = "not-an-array";
      fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      const result = validatePlugin();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("skills")));
    });
  });

  describe("validateConfigFile — detects config violations", () => {
    /** @type {string} */
    let original;
    const configPath = resolve("jinyiwei.config.json");

    beforeEach(() => {
      original = fs.readFileSync(configPath, "utf8");
    });

    afterEach(() => {
      fs.writeFileSync(configPath, original, "utf8");
    });

    it("rejects when approvalMode is invalid", () => {
      const config = JSON.parse(original);
      config.approvalMode = "permissive";
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
      const result = validateConfigFile();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("approvalMode")));
    });

    it("rejects when bossTitle is empty", () => {
      const config = JSON.parse(original);
      config.bossTitle = "";
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
      const result = validateConfigFile();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("bossTitle")));
    });

    it("rejects when externalChannels is not an array", () => {
      const config = JSON.parse(original);
      config.externalChannels = "feishu";
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
      const result = validateConfigFile();
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.some((e) => e.includes("externalChannels")));
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
