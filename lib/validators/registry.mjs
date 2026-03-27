import { validateFiles } from "./files.mjs";
import { validateSkills } from "./skills.mjs";
import { validatePlugin } from "./plugin.mjs";
import { validateVersion } from "./version.mjs";
import { validateConfigFile } from "./config.mjs";
import { validateGroups } from "./groups.mjs";
import { validateGovernanceSkill, validateChatCharter, validateWatchCharter, validateInternalCharters } from "./charters.mjs";
import { validateRules } from "./rules.mjs";
import { validateTemplates } from "./templates.mjs";

/** @type {{ name: string, fn: () => { ok: boolean, errors?: string[], missing?: string[] } }[]} */
export const ALL_VALIDATORS = [
  { name: "skills", fn: validateSkills },
  { name: "plugin", fn: validatePlugin },
  { name: "version", fn: validateVersion },
  { name: "config", fn: validateConfigFile },
  { name: "groups", fn: validateGroups },
  { name: "governance skill", fn: validateGovernanceSkill },
  { name: "chat charter", fn: validateChatCharter },
  { name: "watch charter", fn: validateWatchCharter },
  { name: "internal charters", fn: validateInternalCharters },
  { name: "rules", fn: validateRules },
  { name: "templates", fn: validateTemplates },
];
