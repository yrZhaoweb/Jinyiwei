/**
 * Parse skills_list.md markdown table and extract unique skill names.
 * Header rows and separator rows are detected structurally:
 *   - a separator is any row matching /^\|[\s-:|]+\|$/
 *   - the row immediately before a separator is treated as a header
 * @param {string} markdown - raw markdown content
 * @returns {string[]} deduplicated skill names in order of appearance
 */
export function parseSkillsList(markdown) {
  const lines = markdown.split(/\r?\n/).map((l) => l.trim());
  const separatorPattern = /^\|[\s\-:|]+\|$/;

  // Collect indices of header rows (the row right before each separator)
  const headerIndices = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (separatorPattern.test(lines[i]) && i > 0) {
      headerIndices.add(i - 1);
      headerIndices.add(i);
    }
  }

  const seen = new Set();
  const skills = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (headerIndices.has(i) || !line.startsWith("|")) {
      continue;
    }
    const parts = line
      .slice(1, -1)
      .split("|")
      .map((part) => part.trim());
    if (parts.length < 2) {
      continue;
    }
    const skill = parts[0];
    if (/^[A-Za-z0-9_-]+$/.test(skill) && !seen.has(skill)) {
      seen.add(skill);
      skills.push(skill);
    }
  }
  return skills;
}
