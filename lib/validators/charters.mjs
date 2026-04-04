import fs from "node:fs";
import { INTERNAL_RESPONSE_TEMPLATES } from "../governance/constants.mjs";
import { resolve } from "../paths.mjs";
import { assert } from "./assert.mjs";
import { discoverGroups } from "../groups.mjs";

/**
 * Validate governance skill content.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateGovernanceSkill() {
  const errors = [];
  try {
    const text = fs.readFileSync(resolve("skills/jinyiwei-governance/SKILL.md"), "utf8");

    assert(text.includes("`Boss`"), "governance skill must require Boss addressing", errors);
    assert(text.includes("`WatchAgent`"), "governance skill must require WatchAgent self-title", errors);
    assert(text.includes("rules/addressing.md"), "governance skill must load rules/addressing.md", errors);
    assert(text.includes("rules/action-catalog.md"), "governance skill must load rules/action-catalog.md", errors);
    assert(text.includes("rules/approval-matrix.md"), "governance skill must load rules/approval-matrix.md", errors);
    assert(text.includes("rules/response-contract.md"), "governance skill must load rules/response-contract.md", errors);
    assert(text.includes("hybrid approval matrix"), "governance skill must reference hybrid approval matrix", errors);
    assert(text.includes("dispatch packet"), "governance skill must require dispatch packets", errors);
    assert(text.includes("approval template"), "governance skill must require approval template outputs", errors);
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate ChatAgent charter.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateChatCharter() {
  const errors = [];
  try {
    const text = fs.readFileSync(resolve("agents/chat/AGENT.md"), "utf8");

    assert(text.includes("`Boss`"), "ChatAgent charter must require Boss addressing", errors);
    assert(text.includes("externally reachable"), "ChatAgent charter must remain externally reachable", errors);
    assert(text.includes("standard dispatch packet"), "ChatAgent charter must require standard dispatch packets", errors);
    assert(text.includes("templates/dispatch-packet.md"), "ChatAgent charter must reference templates/dispatch-packet.md", errors);
    assert(text.includes("`action_type`"), "ChatAgent charter must require action_type in packets", errors);
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate WatchAgent charter.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateWatchCharter() {
  const errors = [];
  try {
    const text = fs.readFileSync(resolve("agents/watch/AGENT.md"), "utf8");

    assert(text.includes("`Boss`"), "WatchAgent charter must require Boss addressing", errors);
    assert(text.includes("{{WATCH_SELF_TITLE}}"), "WatchAgent charter must require WatchAgent self-title", errors);
    assert(text.includes("externally reachable"), "WatchAgent charter must remain externally reachable", errors);
    assert(text.includes("hybrid approval matrix"), "WatchAgent charter must require hybrid approval matrix use", errors);
    assert(text.includes("Low risk: approve and record"), "WatchAgent charter must define low-risk handling", errors);
    assert(text.includes("Medium risk: approve with explicit record and rationale"), "WatchAgent charter must define medium-risk handling", errors);
    assert(text.includes("High risk: block and escalate to Boss"), "WatchAgent charter must define high-risk handling", errors);
    assert(text.includes("templates/approval-decision.md"), "WatchAgent charter must reference approval decision template", errors);
    assert(text.includes("`decision_id`"), "WatchAgent charter must require decision_id", errors);
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate all internal agent charters (discovered from groups).
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateInternalCharters() {
  const errors = [];
  try {
    const { groups } = discoverGroups();
    const templatesByAgent = new Map(Object.entries(INTERNAL_RESPONSE_TEMPLATES));

    for (const [groupName, group] of Object.entries(groups)) {
      for (const agent of group.agents) {
        const charter = fs.readFileSync(resolve(agent.charterPath), "utf8");
        const label = `${agent.name} (${groupName})`;
        const templatePath = templatesByAgent.get(agent.name);
        assert(charter.includes("internal only"), `${label} charter must state internal only`, errors);
        assert(charter.includes("Do not address Boss directly"), `${label} charter must forbid direct Boss access`, errors);
        assert(charter.includes("Response Template"), `${label} charter must define a response template`, errors);
        assert(charter.includes("Do not return work without the required response fields"), `${label} charter must require response fields`, errors);
        assert(charter.includes(`Group: \`${groupName}\``), `${label} charter must declare its group`, errors);
        if (templatePath) {
          assert(charter.includes(templatePath), `${label} charter must reference ${templatePath}`, errors);
        }
      }
    }
  } catch (/** @type {any} */ err) {
    return { ok: false, errors: [err.message] };
  }

  return { ok: errors.length === 0, errors };
}
