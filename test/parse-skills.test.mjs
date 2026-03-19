import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSkillsList } from "../lib/parse-skills.mjs";

describe("parseSkillsList", () => {
  it("extracts skill names from a standard markdown table", () => {
    const md = `
| 技能 | 功能 |
|------|------|
| search | Tavily LLM优化搜索 |
| weather | 天气查询 |
`;
    assert.deepStrictEqual(parseSkillsList(md), ["search", "weather"]);
  });

  it("works with English headers", () => {
    const md = `
| Skill | Description |
|-------|-------------|
| search | Tavily search |
| weather | Weather query |
`;
    assert.deepStrictEqual(parseSkillsList(md), ["search", "weather"]);
  });

  it("deduplicates skills across multiple tables", () => {
    const md = `
| 技能 | 功能 |
|------|------|
| search | 搜索 |
| weather | 天气 |

| 技能 | 功能 |
|------|------|
| search | 搜索(重复) |
| telegram | 消息 |
`;
    assert.deepStrictEqual(parseSkillsList(md), ["search", "weather", "telegram"]);
  });

  it("skips rows that are not valid skill identifiers", () => {
    const md = `
| 类别 | 数量 |
|------|------|
| 信息获取 | 7 |
| **总计** | **48** |
`;
    assert.deepStrictEqual(parseSkillsList(md), []);
  });

  it("handles skills with hyphens and underscores", () => {
    const md = `
| Skill | Desc |
|-------|------|
| crypto-ta-analyzer | analyzer |
| data_analysis | analysis |
`;
    assert.deepStrictEqual(parseSkillsList(md), ["crypto-ta-analyzer", "data_analysis"]);
  });

  it("returns empty array for empty input", () => {
    assert.deepStrictEqual(parseSkillsList(""), []);
  });

  it("ignores non-table content", () => {
    const md = `
# Title

Some paragraph text.

- bullet point
- another point

| Skill | Desc |
|-------|------|
| search | desc |
`;
    assert.deepStrictEqual(parseSkillsList(md), ["search"]);
  });

  it("handles separator variations (colons for alignment)", () => {
    const md = `
| Skill | Desc |
|:------|-----:|
| memory | store |
`;
    assert.deepStrictEqual(parseSkillsList(md), ["memory"]);
  });
});
