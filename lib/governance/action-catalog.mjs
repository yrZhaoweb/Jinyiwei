import fs from "node:fs";
import { resolve } from "../paths.mjs";

/**
 * @typedef {{
 *   actionType: string,
 *   owners: string[],
 *   className: string,
 *   defaultRisk: string,
 *   defaultDecision: string,
 * }} ActionDefinition
 */

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeCell(value) {
  return value.trim().replace(/^`|`$/g, "");
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitTableLine(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * @param {string} markdown
 * @returns {ActionDefinition[]}
 */
export function parseActionCatalog(markdown) {
  const lines = markdown.split("\n");
  const tableLines = lines.filter((line) => line.trim().startsWith("|"));

  if (tableLines.length < 3) {
    return [];
  }

  const rows = [];

  for (const line of tableLines.slice(2)) {
    const cells = splitTableLine(line);
    if (cells.length < 5) continue;

    rows.push({
      actionType: normalizeCell(cells[0]),
      owners: normalizeCell(cells[1]).split(",").map((owner) => owner.trim()).filter(Boolean),
      className: normalizeCell(cells[2]),
      defaultRisk: normalizeCell(cells[3]),
      defaultDecision: normalizeCell(cells[4]),
    });
  }

  return rows;
}

/**
 * @returns {ActionDefinition[]}
 */
export function loadActionCatalog() {
  const text = fs.readFileSync(resolve("rules/action-catalog.md"), "utf8");
  return parseActionCatalog(text);
}

/**
 * @param {string} actionType
 * @returns {ActionDefinition | undefined}
 */
export function findActionDefinition(actionType) {
  return loadActionCatalog().find((entry) => entry.actionType === actionType);
}
