# NEXT - planning backlog

**Updated:** 2026-05-21 (session closed — commit push)

---

## Recommended next

**`@concept-run - MOD-06`** then **`@code-implementation complete`** (M3).

---

## Current iteration — M3: Prompter UI core

**Milestone ref:** M3 · `.work/plans/full/20260521-full-plan.md` §19  
**Status:** in-progress  
**Started:** 2026-05-21  
**Target SPEC:** `.work/features/prompter-ui/20260520-SPEC.md`

### In scope

- React Router shell: `/`, `/play`, `/settings`, `/handoff/*`
- Script editor (paste, type, drag-drop `.txt`/`.md`)
- Format selector + preview via `markdown-render` (`SanitizedHtml` only — MOD-06 M2 condition)
- localStorage + IndexedDB fallback persistence (SPEC §5 keys)
- Settings panel (speed, font, theme, mirror defaults — stored, player UI in M4)
- Client max size validation (256 KB default, U1)
- Responsive layout shell + mobile-first CSS
- English i18n string stub (NFR-09)

### Out of scope (explicit)

- Player scroll engine, wake lock, fullscreen controls (M4)
- PWA manifest / service worker (M4)
- Pairing API integration, OTP, relay handoff UI (M5)
- QR encode/decode (M5/M6)
- Markdown pipeline changes (M2 complete)

### Tasks

| ID | Description | Files | Status | Notes |
|----|-------------|-------|--------|-------|
| M3-T1 | React Router routes: `/`, `/play`, `/settings`, `/handoff/*` | `frontend/src/App.tsx`, `frontend/src/routes/`, `frontend/src/main.tsx`, `frontend/package.json`, `frontend/package-lock.json` | done 2026-05-21 | react-router-dom ^7 approved; BrowserRouter in main.tsx |
| M3-T2 | Script editor: paste, type, drag-drop upload `.txt`/`.md` | `frontend/src/prompter/Editor.tsx`, `frontend/src/routes/HomePage.tsx` | done 2026-05-21 | SPEC R1; wired on home |
| M3-T3 | Format selector `plain` \| `markdown`; preview via markdown-render | `frontend/src/prompter/Preview.tsx`, `frontend/src/routes/HomePage.tsx` | done 2026-05-21 | SanitizedHtml only (R6) |
| M3-T4 | localStorage persistence + IndexedDB fallback; keys per SPEC §5 | `frontend/src/prompter/storage.ts` | done 2026-05-21 | idb fallback when localStorage unavailable |
| M3-T5 | Settings panel: speed, font, theme, mirror defaults | `frontend/src/prompter/Settings.tsx`, `frontend/src/routes/SettingsPage.tsx` | done 2026-05-21 | |
| M3-T6 | Client-side max size validation (256 KB default) | `frontend/src/prompter/limits.ts` | done 2026-05-21 | 262144 bytes default |
| M3-T7 | Responsive layout shell; mobile-first CSS | `frontend/src/prompter/Layout.tsx`, `frontend/src/styles/prompter.css`, route pages | done 2026-05-21 | |
| M3-T8 | i18n string externalization stub (English) | `frontend/src/lib/i18n/en.ts` | done 2026-05-21 | Used across prompter UI |

### Acceptance criteria

- [ ] prompter-ui SPEC **R1, R2, R7, R11** covered by tests (per master plan M3)
- [ ] Preview uses `SanitizedHtml` only — no raw `dangerouslySetInnerHTML` (MOD-06 M2 condition)
- [ ] Storage keys match SPEC §5; reload restores script + format
- [ ] Oversize script blocked with UX message (limits.ts)
- [ ] Task gate: FE `npm test`, `npm run lint`, `npm run typecheck` exit 0 in container

### Validation steps

- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm test"`
- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run lint"`
- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run typecheck"`
- [ ] Manual: mobile viewport check (editor + routes navigable)

### Owner blockers

- none (react-router-dom approved 2026-05-21)

### Cross-LLM verification

- **Triggered:** no (M3 UI — defer formal review to M6-T6 per W3)
- **Focus:** Preview/markdown integration, storage keys

### Concept / NFR registry (this iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-01 | yes | done 2026-05-21 | prompter-ui imports markdown-render only via Preview |
| MOD-02 | no | n/a | Client-only |
| MOD-03 | no | n/a | No new billable units |
| MOD-04 | no | n/a | No ops impact |
| MOD-05 | no | n/a | Monolith SPA |
| MOD-06 | yes | pending | Required before `@code-implementation complete` |

---

## Done

| Item | Date |
|------|------|
| Foundation P0–P6 | 2026-05-20 |
| Master plan Approved | 2026-05-21 |
| M1 platform scaffold | 2026-05-21 |
| M1 formal complete | 2026-05-21 |
| M2 markdown render pipeline | 2026-05-21 |
| M2 formal complete | 2026-05-21 |
| Compose approved + committed | 2026-05-21 |
| MOD-06 (M1, M2) | 2026-05-21 |

---

## Done — M2 iteration (archived)

| Task | Completed | Notes |
|------|-----------|-------|
| M2-T1 … M2-T6 | 2026-05-21 | renderScript + sanitize + SanitizedHtml; 19 FE tests pass |
| MOD-06 | 2026-05-21 | Evidence: `.work/context/20260521-MOD-06-M2.md` |

---

## Done — M1 iteration (archived)

| Task | Completed | Notes |
|------|-----------|-------|
| M1-T1 … M1-T8 | 2026-05-21 | Docker-first gates pass in container |
| MOD-06 | 2026-05-21 | Evidence: `.work/context/20260521-MOD-06-M1.md` |

---

## Blocked on owner

| Item | Notes |
|------|------|
| U1 / U6 / U8 defaults | Plan defaults apply (W2); M3-T6 uses 256 KB (U1) |

---

## Waivers

- W3 cross-model review — M6-T6 (formal)
- W2 U1/U6/U8 — defaults in plan
