# ASSUMPTIONS — UI planning registry

> Created by bootstrap; maintained by **`ui-*` skills**.

**Updated:** 2026-05-23

Label every entry: **Confirmed** | **Inference** | **Unverified** | **Rejected**

| ID | Assumption | Label | Source | Notes |
|----|------------|-------|--------|-------|
| UA1 | Archetype `mobile-app` · complexity **M** | Confirmed | `@ui-project-approach` | Foundation 01 |
| UA2 | Active style stack `vanilla-css` | Confirmed | `@ui-style-stack` | HANDOFF_UI |
| UA3 | Class prefix `tp-` retained during migration; `ds-` for new primitives later | Confirmed | Foundation 03 | Brownfield |
| UA4 | WCAG **AA** achievable for player light/dark after token migration | Unverified | Foundation 02 | Needs `@ui-accessibility-audit` |
| UA5 | Bottom nav on viewports &lt;768px; top nav on desktop unless SPEC overrides | Inference | mobile-app archetype | Screen SPEC S1 |
| UA6 | `data-theme` on `<html>` will drive app shell; player `.tp-player--dark` converges in S1 | Inference | Foundation 02 | Implementation detail |

## Rejected

| ID | Assumption | Reason |
|----|------------|--------|
| - | (none) | |
