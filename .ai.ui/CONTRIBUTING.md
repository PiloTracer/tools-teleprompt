# Contributing to UI Design OS

1. **Never** add skills without the `ui-` prefix.
2. **Never** duplicate Agent OS skill ids or MOD concept ids in this repo.
3. Update [`skills/SKILL_DEPENDENCIES.md`](skills/SKILL_DEPENDENCIES.md) when adding gates.
4. Update [`COHABITATION.md`](COHABITATION.md) when a skill touches `.work/` or `.cursorrules`.
5. Run `bash scripts/framework-verify.sh` before opening a PR.

Skill shape: `skill.md` with YAML frontmatter (`name` matches folder), modes table, hard rules, completion checklist.

Standards: `YYYYMMDD-*.md` templates with `REPLACE:UI_*` tokens only.
