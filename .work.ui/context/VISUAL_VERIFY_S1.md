# Visual verify — S1 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-visual-verify milestone`  
**Milestone:** S1 (`player` + app shell)  
**Verdict:** **pass with gaps**

---

## Checks

| # | Check | Result | Evidence |
|---|--------|--------|----------|
| 1 | UI visual / structural e2e | **pass** | `frontend/tests/e2e/s1-player-visual.spec.ts` — 2/2 pass vs `http://127.0.0.1:9173` (dev stack) |
| 2 | Production UI build | **pass** | `npm run build` in frontend container — exit 0 |
| 3 | Token changes reviewed | **pass** | S1 tokens in `tokens.css`, `themes/player-dark.css`; player chrome uses `var(--color-*)`. Editor drop-zone hex in `prompter.css` deferred to S2 |
| 4 | Storybook | **n/a** | v1 deferred per `DOCS_UI_STACK.md` |
| 5 | UIS registry (visual) | **pass** | UIS-01, UIS-02 satisfied on `/play`; UIS-04 pending `@ui-accessibility-audit` |

---

## Baseline comparison

| Reference | Route | Assessment |
|-----------|-------|--------------|
| `tmp/image copy.png` (before) | `/play` | **Materially improved:** primary Play, tokenized toolbar, styled ranges, segmented theme, light shell canvas |
| `tmp/playwright-results/s1-player-desktop-light.png` (after) | `/play` | Captured 2026-05-23 — matches S1 targets |
| `tmp/playwright-results/s1-player-mobile-portrait.png` (after) | `/play` mobile | Bottom nav visible; page title SR-only (`width: 1px`) |
| `tmp/after_some_changes.png` | `/` editor | **Out of S1 scope** — editor column layout still broken (S2) |

### Player deltas (before → after)

- Play: default white button → **blue primary** (`data-variant="primary"`)
- Theme: native `<select>` → **segmented** Light/Dark control
- Toolbar: flat grey box → **elevated** surface with token borders/shadows
- Shell: dark header strip (baseline) → **tokenized light** header + nav active state
- Mobile: no bottom nav → **`.ds-mobile-nav`** on &lt;768px

---

## Artifacts

| File | Purpose |
|------|---------|
| `frontend/tests/e2e/s1-player-visual.spec.ts` | Repeatable S1 visual smoke + screenshots |
| `frontend/playwright.s1-visual.config.ts` | Config for dev URL (`PLAYWRIGHT_BASE_URL`) or preview |
| `tmp/playwright-results/s1-player-*.png` | Milestone captures |

**Run (dev stack on port 9173):**

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 npx playwright test --config=playwright.s1-visual.config.ts
```

---

## Gaps / waivers

| Gap | Severity | Owner action |
|-----|----------|--------------|
| No pixel-diff vs `tmp/image copy.png` | low | Optional: add Playwright `toHaveScreenshot` baseline in CI later |
| Playwright browsers missing in **frontend container** | medium | Run visual e2e on host or add browser deps to Dockerfile for CI |
| Full `npm run test:e2e` not re-run this session | low | Run before merge if handoff flows touched |
| Editor layout (`tmp/after_some_changes.png`) | medium | **S2** `home-editor` — not blocking S1 player sign-off |

---

## Sign-off

S1 **player** visual milestone: **approved with gaps above**. Proceed to `@ui-accessibility-audit milestone`, then `@ui-component-build complete`.
