# Changelog

## [0.4.3] - 2026-05-23

### Changed (audit / lean)

- Onboarding aligned: S0 primitives before S1 in README, NEXT_UI template, demo `.work.ui`
- `framework-verify.sh`: all 11 skills, all 8 standards, all 5 example manifests; S0/S1 drift warning
- `examples/INDEX.md`: honest partial rating for mobile; PNG gitignore documented
- Trimmed README skills table + extending bullets; fixed START_HERE §8 numbering
- `FROM_AGENT_OS.md` UIS-07; workflows guide stub trimmed

## [0.4.2] - 2026-05-23

### Added

- [`resources/control-platforms.md`](resources/control-platforms.md) — MIT/Apache OSS behavior platforms; one-page adoption guide
- CATALOG **Behavior source** column in template; router + SURFACE related link

## [0.4.1] - 2026-05-23

### Changed (bloat control)

- Trimmed duplicate playbook prose from SURFACE-AND-CONTROL-CRAFT, START_HERE, README, skills — canonical path: `examples/INDEX.md`
- Added **Implementation priority** to SURFACE-AND-CONTROL-CRAFT §4 (pixels before paperwork)
- Merged duplicate craft rows in `ui-process-router/reference.md`
- `framework-verify.sh` now checks SURFACE standard, UIS-07, mobile-controls manifest

## [0.4.0] - 2026-05-23

### Added

- [`standards/20260523-SURFACE-AND-CONTROL-CRAFT.md`](standards/20260523-SURFACE-AND-CONTROL-CRAFT.md) — surfaces, controls, native-vs-custom, verify checklist
- **UIS-07** — [`concepts/surface-control-craft/`](concepts/surface-control-craft/README.md) positive craft review
- Example manifests — full row schema (surfaces, controls, extractedRules, primitives) for mobile-controls, dashboards, websites, websites-tecnology
- [`examples/INDEX.md`](examples/INDEX.md) — example → foundation → catalog → SPEC → verify playbook
- Screen SPEC §13 binding shape (exampleIds, extractedRules, regionMap)
- Primitive-first milestone ordering in `ui-component-build`; craft gates in `ui-screen-spec`, `ui-visual-verify`, `ui-design-foundation`

### Changed

- UI-PATTERNS § forms + mobile-native — craft pointers
- Foundation + screen SPEC templates — craft tier, surface tokens, example id column
- START_HERE, APPROACH, README, concepts registry — UIS-01…07

## [0.3.0] - 2026-05-23

### Added

- [`APPROACH.md`](APPROACH.md) — archetypes, skill chains (replaces bloated decision-engine tree)
- [`standards/20260523-UI-PATTERNS.md`](standards/20260523-UI-PATTERNS.md) — forms, nav, data, mobile checklists
- [`style-stacks/`](style-stacks/README.md) — tailwind, css-modules, vanilla-css, styled-components
- [`examples/INDEX.md`](examples/INDEX.md) + per-folder `manifest.md` (annotated samples)
- Skills: `ui-project-approach`, `ui-style-stack`
- README rewrite — 60-second human + agent path

### Rejected (by design)

- 12 single-purpose skills from feedback (`ui-landing-page`, `ui-data-display`, …) — see APPROACH §6

## [0.2.0] - 2026-05-23

### Added

- Full `templates/cursorrules.ui.template` (Core Principles 1–7, UI completion gate, skills, Docker, verification)
- `scripts/cursorrules-ui.sh` — create-full / merge-block / status
- `@ui-bootstrap` cursorrules modes: `init merge-cursorrules`, `create-cursorrules`, brownfield gates
- `docs/adoption/FROM_AGENT_OS.md` — what to adapt from Agent OS vs avoid
- `templates/DOCS_UI_STACK.md.template`
- Substantive framework `.cursorrules` and richer `work.ui` HANDOFF/NEXT templates

## [0.1.0] - 2026-05-23

### Added

- Demo **`.work.ui/`** skeleton at framework repo root (mirrors Agent OS `.work/`)
- Pointer READMEs under `.ai.ui/plans/`, `screens/`, `context/`, `decisions/`, `design-system/`
- Expanded `templates/work.ui/` (foundation 01–04, registries, screen SPEC example)
- **Work tree path resolution** in `skills/SKILL_DEPENDENCIES.md` — all skill outputs at `<repo-root>/.work.ui/`
- Initial UI Design OS framework structure
- Nine `ui-*` skills with dependency graph
- Six UIS concept prompts (visual hierarchy through AI visual quality)
- Six binding standard templates (conventions, screen SPEC, components, tokens, a11y, directory map)
- `.work.ui/` bootstrap templates and `cursorrules.ui.snippet` for coexistence with Agent OS
- [`COHABITATION.md`](COHABITATION.md) boundary contract with `.ai/`
