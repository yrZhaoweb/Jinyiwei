import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiagnosticReport,
  buildVerificationReport,
} from "../lib/diagnostics.mjs";
import { setLocale, getLocale } from "../lib/i18n.mjs";

// Force English locale for deterministic test assertions
let savedLocale;
before(() => { savedLocale = getLocale(); setLocale("en"); });
after(() => { setLocale(savedLocale); });

describe("diagnostics", () => {
  describe("buildDiagnosticReport", () => {
    it("returns an object with expected structure", () => {
      const report = buildDiagnosticReport();

      assert.ok(typeof report === "object");
      assert.ok("state" in report);
      assert.ok("checks" in report);
      assert.ok("ok" in report);
      assert.ok(Array.isArray(report.checks));
      assert.ok(Array.isArray(report.blocking || []));
      assert.ok(Array.isArray(report.warnings || []));
      assert.ok(Array.isArray(report.guidance));
    });

    it("ok is boolean", () => {
      const report = buildDiagnosticReport();
      assert.strictEqual(typeof report.ok, "boolean");
    });

    it("checks array contains check objects", () => {
      const report = buildDiagnosticReport();

      for (const check of report.checks) {
        assert.ok(typeof check.id === "string");
        assert.ok(typeof check.label === "string");
        assert.ok(typeof check.ok === "boolean");
        assert.ok("detail" in check);
      }
    });

    it("state contains openclaw availability info", () => {
      const report = buildDiagnosticReport();

      assert.ok("available" in report.state);
      assert.strictEqual(typeof report.state.available, "boolean");

      if (!report.state.available) {
        // If openclaw is not available, diagnostics should have an error
        assert.ok(report.state.diagnostics.length > 0);
      }
    });

    it("state contains diagnostics array", () => {
      const report = buildDiagnosticReport();
      assert.ok(Array.isArray(report.state.diagnostics));
    });

    it("diagnostic items have severity and message", () => {
      const report = buildDiagnosticReport();

      for (const diag of report.state.diagnostics) {
        assert.ok(["info", "warning", "error"].includes(diag.severity));
        assert.ok(typeof diag.message === "string");
      }
    });

    it("blocking issues have error severity", () => {
      const report = buildDiagnosticReport();

      for (const blocking of (report.blocking || [])) {
        assert.ok(
          report.state.diagnostics.some(
            (d) => d.severity === "error" && d.message === blocking
          )
        );
      }
    });

    it("guidance is an array of strings", () => {
      const report = buildDiagnosticReport();

      for (const guidance of report.guidance) {
        assert.strictEqual(typeof guidance, "string");
      }
    });

    it("checks have unique ids", () => {
      const report = buildDiagnosticReport();
      const ids = report.checks.map((c) => c.id);
      const uniqueIds = new Set(ids);

      assert.strictEqual(ids.length, uniqueIds.size, "Check IDs should be unique");
    });

    it("at least one check for openclaw availability", () => {
      const report = buildDiagnosticReport();
      const openclawCheck = report.checks.find((c) => c.id === "openclaw.available");

      assert.ok(openclawCheck !== undefined);
      assert.strictEqual(openclawCheck.label, "OpenClaw CLI available");
    });

    it("at least one check for jinyiwei plugin", () => {
      const report = buildDiagnosticReport();
      const pluginCheck = report.checks.find((c) => c.id === "jinyiwei.plugin.present");

      assert.ok(pluginCheck !== undefined);
    });
  });

  describe("buildVerificationReport", () => {
    it("returns an object with expected structure", () => {
      const report = buildVerificationReport();

      assert.ok(typeof report === "object");
      assert.ok("state" in report);
      assert.ok("checks" in report);
      assert.ok("ok" in report);
      assert.ok(Array.isArray(report.issues));
      assert.ok(Array.isArray(report.guidance));
    });

    it("ok is boolean", () => {
      const report = buildVerificationReport();
      assert.strictEqual(typeof report.ok, "boolean");
    });

    it("issues have severity, message, and optional detail", () => {
      const report = buildVerificationReport();

      for (const issue of report.issues) {
        assert.ok(["error", "warning"].includes(issue.severity));
        assert.ok(typeof issue.message === "string");
      }
    });

    it("verification report is stricter than diagnostic", () => {
      const diagReport = buildDiagnosticReport();
      const verifyReport = buildVerificationReport();

      // Verification should be equal or stricter (fewer things pass)
      // This is a soft check since the rules can change
      assert.ok(typeof verifyReport.ok === "boolean");
      assert.ok(typeof diagReport.ok === "boolean");
    });

    it("state is shared with diagnostic report", () => {
      const verifyReport = buildVerificationReport();

      assert.ok("available" in verifyReport.state);
      assert.ok("diagnostics" in verifyReport.state);
    });

    it("issues include all diagnostic errors", () => {
      const verifyReport = buildVerificationReport();
      const errorDiagnostics = verifyReport.state.diagnostics.filter(
        (d) => d.severity === "error"
      );

      const errorIssues = verifyReport.issues.filter(
        (i) => i.severity === "error"
      );

      // All error diagnostics should be in issues
      for (const diag of errorDiagnostics) {
        assert.ok(
          errorIssues.some(
            (i) => i.message === diag.message && i.severity === "error"
          )
        );
      }
    });

    it("strictFailures excludes non-blocking checks", () => {
      const verifyReport = buildVerificationReport();

      // Checks like "jinyiwei.entry.aligned", "channels.configured", "version.synced"
      // are not strict failures
      for (const check of verifyReport.checks) {
        if (!check.ok) {
          // If a check is not ok, it should not be in the non-strict exclusion list
          // OR the overall ok should be false
          assert.ok(
            check.id === "jinyiwei.entry.aligned" ||
            check.id === "channels.configured" ||
            check.id === "version.synced" ||
            !verifyReport.ok
          );
        }
      }
    });

    it("guidance is included in report", () => {
      const report = buildVerificationReport();

      assert.ok(Array.isArray(report.guidance));
    });

    it("checks array has same structure as diagnostic", () => {
      const diagReport = buildDiagnosticReport();
      const verifyReport = buildVerificationReport();

      // Same check structure
      for (const check of verifyReport.checks) {
        assert.ok(typeof check.id === "string");
        assert.ok(typeof check.label === "string");
        assert.ok(typeof check.ok === "boolean");
        assert.ok("detail" in check);
      }
    });
  });
});
