# Changelog

All notable changes to Agent OS are documented here. Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once tagged.

## [Unreleased]

### Added
- **`code-implementation continue` batch targets:** `- N` (e.g. `- 5`), `- until blocked`, `- M{N}-T{a}..T{b}`; default `continue` = 1 task. All modes stop on task gate fail or blocker; progress lines `Batch k/N: M4-T4 done`; mandatory batch summary.

### Changed
- **Invocation punctuation:** Skills, workflows, and command examples use ASCII hyphen `-` (not em dash `—`) between verb and argument (e.g. `@code-implementation plan - M1`). Documented in `SKILL_DEPENDENCIES.md` and `skills/README.md`.

### Added
- **Framework CI** - `.github/workflows/framework-verify.yml` runs `scripts/framework-verify.sh` and `scripts/smoke-consumer.sh` on push/PR.
- **`scripts/framework-verify.sh`** - self-hosted layout, consumer bootstrap smoke, stale integration path grep, template `REPLACE:` check, markdown relative link scan.
- **`scripts/smoke-consumer.sh`** - local consumer adoption smoke with next-step hints.
- **`docs/adoption/minimal-adoption.md`** - lite vs full adoption paths.
- **README / START_HERE / templates/README** - path convention table (nested `.ai/` vs self-hosted git root).
- `README.md` discoverability: hook rewrite, badges, comparison table, "Skills at a glance".
- `LICENSE` (MIT).
- `CONTRIBUTING.md` and this `CHANGELOG.md`.
- "Template - your repo's HANDOFF.md will be filled by `@session-control`" notes on demo `.work/` artifacts so visitors don't mistake them for real project content.
- **`SKILL_DEPENDENCIES.md § Canonical command vocabulary`** - single source of truth for the verbs every skill uses (`status`, `init`, `start`, `continue`, `plan`, `complete`, `verify`, `create`, …).
- **`SKILL_DEPENDENCIES.md § Blocked report shape`** - uniform "blocked (prerequisite)" report that every skill emits when a gate stops execution.
- **`dev-stack`** gains `status` and `init` modes plus a brownfield gate that refuses to silently overwrite an existing `bin/start.sh`.

### Changed
- **`code-implementation`** mode renamed: **`plan-iteration` → `plan`** (legacy `plan-iteration` kept as alias - both invocations work). Updated across `code-implementation/skill.md`, `reference.md`, `README.md`, `START_HERE.md`, `SKILL_DEPENDENCIES.md`, `process-router/reference.md`, demo `.work/plans/NEXT.md`, `templates/work/plans/NEXT.md.template`, `concepts/README.md`, and 8 workflow guides under `docs/guides/workflows/`.
- **`plan-master`** mode renamed: **`task` → `show`** (legacy `task` kept as alias). Updated in `plan-master/skill.md`, `reference.md`, `code-implementation/reference.md`.
- **`process-router`** parse-invocation table promotes the explicit **`route`** token so `@process-router route - <question>` is documented alongside the no-verb fallback.
- **Unified "blocked (prerequisite)" report shape** now used by `plan-foundation` (GF0/CF0), `plan-master` (PG1), `code-implementation` (PI1/ST0), `code-verify` (M0), `feature-spec` (CR0), `db-migration` (mutating gate). Every gate emits the same `Required / Detected / Run first` block - operators learn the format once.
- **`db-migration`** I5 long FastAPI lifespan code blocks moved from `skill.md` to `reference.md § Application startup wiring`; `skill.md` now lists the framework variants by name and links.

### Added (gates and brownfield)
- **G1** `code-implementation plan` (was `plan-iteration`) PI1 now stops with the unified blocked-report shape on missing/Draft plan without HANDOFF waiver.
- **G2** `feature-spec create` adds CR0: hard-stops on existing slug folder; warns (and proceeds on confirm) when `plan-master-ready: no`.
- **G3** `db-migration create`/`add`/`run`/`verify` now require `db-migration init` to have run (runner + `001_init.sql` baseline); emits unified blocked-report shape otherwise.
- **G4** `code-verify milestone` M0 gate stops with the unified shape if the requested milestone is not defined in master plan §19 or active in `NEXT.md`.
- **B1** `project-bootstrap init` adds B0 brownfield detection (inventory existing `.work/`, `.cursorrules`, `REPLACE:TECH_STACK_DOC`; prompt overwrite-all / overwrite-missing / keep / abort).
- **B2** `db-migration init` adds IB0 brownfield detection (inventory existing runner + baseline SQL; prompt keep / overwrite-runner / overwrite-all / abort).
- **B3** `feature-spec create` CR0 already covers brownfield (above).
- **`dev-stack`** `status` mode for `bin/start.sh` health-check; `init` adds a brownfield gate that refuses to overwrite an existing customized script silently.

### Removed
- *(none yet - bloat trim was kept conservative: long FastAPI code from `db-migration/skill.md` moved to `reference.md`; plan-foundation/plan-master phase content was left in place because it is unique operator guidance, not duplicated boilerplate.)*

## [0.1.0] - 2026-05-19

First public-ready cut of Agent OS as a portable framework.

### Added
- **`project-bootstrap`** skill plus `templates/bootstrap.sh` + `templates/work/` skeleton (one-command adoption into any repo).
- **`skills/SKILL_DEPENDENCIES.md`** registry: explicit prerequisite gates between skills (foundation → certify → master plan → status → implementation).
- **Prerequisite-gate enforcement** in `plan-foundation`, `plan-master`, `code-implementation`, `session-control` - agents now **stop** with a redirect if an upstream step was skipped.
- **README bird's-eye flow** (`@project-bootstrap init` → … → `@code-implementation continue`) and "Skills at a glance" table covering all 11 skills.
- **Standards templates** (`20260517-CONVENTIONS`, `FEATURE_STANDARD`, `DIRECTORY_MAP`, `observability-spec`, `api-style-guide`, `threat-model`, `data-classification`) generalized with `REPLACE:` tokens.
- **Demo `.work/` skeleton** at repo root so pointer links resolve when Agent OS is the git root.

### Changed
- Skill/router invocation syntax standardized to hyphen (e.g. `@feature-spec create - <slug>`) instead of em dash.
- Workflow guides under `docs/guides/workflows/` generalized; vendor specifics removed.

### Removed
- All project-specific integration artifacts under `docs/integration/` (Costa Rica Hacienda, OIDC, XAdES bundles) - replaced with agnostic `MANIFEST.template.txt` + `README.md`.

[Unreleased]: https://github.com/PiloTracer/.ai/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/PiloTracer/.ai/releases/tag/v0.1.0
