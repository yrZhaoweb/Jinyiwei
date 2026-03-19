import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateFiles } from "../lib/validators/files.mjs";
import { validateSkills } from "../lib/validators/skills.mjs";
import { validatePlugin } from "../lib/validators/plugin.mjs";
import { validateGovernanceSkill, validateChatCharter, validateWatchCharter, validateInternalCharters } from "../lib/validators/charters.mjs";
import { validateRules } from "../lib/validators/rules.mjs";
import { validateTemplates } from "../lib/validators/templates.mjs";

describe("validators", () => {
  it("validateFiles — all required files exist", () => {
    const result = validateFiles();
    assert.strictEqual(result.ok, true, `Missing files: ${result.missing.join(", ")}`);
    assert.strictEqual(result.missing.length, 0);
  });

  it("validateSkills — manifest matches skills_list.md", () => {
    const result = validateSkills();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validatePlugin — config defaults are correct", () => {
    const result = validatePlugin();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validateGovernanceSkill — governance skill is valid", () => {
    const result = validateGovernanceSkill();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validateChatCharter — ChatAgent charter is valid", () => {
    const result = validateChatCharter();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validateWatchCharter — WatchAgent charter is valid", () => {
    const result = validateWatchCharter();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validateInternalCharters — internal agent charters are valid", () => {
    const result = validateInternalCharters();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validateRules — all rules are valid", () => {
    const result = validateRules();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });

  it("validateTemplates — all templates are valid", () => {
    const result = validateTemplates();
    assert.strictEqual(result.ok, true, `Errors: ${result.errors.join("; ")}`);
  });
});
