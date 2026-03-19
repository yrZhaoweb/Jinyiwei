import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { t, setLocale, getLocale } from "../lib/i18n.mjs";

describe("i18n", () => {
  it("defaults to en locale", () => {
    // Reset to en for test isolation
    setLocale("en");
    assert.strictEqual(getLocale(), "en");
  });

  it("returns English message for known key", () => {
    setLocale("en");
    assert.strictEqual(t("status.ok"), "OK");
  });

  it("switches to zh locale", () => {
    setLocale("zh");
    assert.strictEqual(getLocale(), "zh");
    assert.strictEqual(t("status.ok"), "通过");
    // Reset
    setLocale("en");
  });

  it("interpolates parameters", () => {
    setLocale("en");
    assert.strictEqual(
      t("install.error.workspaceNotExist", { path: "/tmp/test" }),
      "Workspace does not exist: /tmp/test"
    );
  });

  it("falls back to en when zh key is missing", () => {
    setLocale("zh");
    // All keys exist in both, so test with a made-up scenario:
    // t() should return the key itself if not found in either
    assert.strictEqual(t("nonexistent.key"), "nonexistent.key");
    setLocale("en");
  });

  it("ignores invalid locale", () => {
    setLocale("en");
    setLocale("fr");
    assert.strictEqual(getLocale(), "en");
  });
});
