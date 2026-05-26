# UIS-07 Surface and control craft — 2026-05-25

**Scope:** Settings + player controls after Toggle migration  
**Craft tier:** refined  
**Recommendation:** ship_with_notes

## Findings (before)

| Area | Gap |
|------|-----|
| Settings grouping | Flat list; C5 expects section clusters |
| Toggles | No row hover; mirror/sync not visually elevated |
| Hierarchy | `h2` title; no fieldset legends |
| Speech sync | Long privacy copy only below fold |
| Range values | Readouts not pill-styled in settings |

## Applied

- `ds-section` fieldsets: Display & layout / Speech sync
- Settings `h1`; loading `aria-busy`
- Toggle rows on elevated surface; hover state
- Speech sync `description` on toggle; privacy in inset callout
- Settings range value pills
- Mic select labels aligned with section typography

## Residual (owner / later)

- Player toolbar: mirror compact switch — verify on device
- Home editor / handoff: no change this pass
- `@ui-visual-verify milestone` screenshots not re-run (stack was host-only tests)
- UIS-06 formal record optional

## Evidence

- FE vitest + lint + typecheck — run at session close
