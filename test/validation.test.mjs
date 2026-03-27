import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runValidationSuite } from "../lib/validation.mjs";

describe("validation suite", () => {
  it("returns grouped validator results for the current project", () => {
    const result = runValidationSuite();

    assert.strictEqual(result.files.ok, true);
    assert.deepStrictEqual(result.errors, []);
    assert.ok(result.results.length > 0);
    assert.ok(result.results.some((entry) => entry.validator === "plugin"));
    assert.ok(result.results.every((entry) => entry.ok === true));
  });
});
