# Markdown Render — SPEC amendment 01 (adaptive meta blockquote)

**Base SPEC:** `.work/features/markdown-render/20260520-SPEC.md`  
**Triggered by:** `.work/features/adaptive-teleprompter/20260523-SPEC.md` (Q6)  
**Status:** Approved  
**Approved:** 2026-05-23 (co-approved with adaptive-teleprompter SPEC)  
**Date:** 2026-05-23

---

## Purpose of amendment

Support **adaptive teleprompter** line classification: markdown blockquotes (`> …`) represent **meta** (stage directions, non-spoken cues). Rendered blockquotes must be identifiable in the DOM for scroll-position detection and optional distinct styling, without weakening XSS controls.

---

## Binding changes

1. **R9 (new).** When rendering markdown for teleprompter display, wrap blockquote output with class **`tp-meta`** on the `<blockquote>` element (e.g. `<blockquote class="tp-meta">`). Plain-text format unchanged.

2. **R10 (new).** Export or document a shared helper `isMetaSourceLine(line: string): boolean` in `frontend/src/markdown/` (or re-export from adaptive parser) so adaptive line classification and markdown render stay aligned on `> ` prefix rules.

3. **Allowlist unchanged.** `blockquote` remains on the DOMPurify allowlist (existing R5). Adding a class does not expand tag surface.

4. **CSS (non-blocking).** Optional `.tp-meta` styling in `prompter.css` (muted/italic) — visual only; adaptive scroll multiplier is behavioural (adaptive SPEC R14).

5. **XSS regression.** Existing R8 corpus must pass with `class="tp-meta"` present on blockquote fixtures.

---

## SPEC sections affected

| Base section | Change |
|--------------|--------|
| §4 Behavioural spec | Add R9, R10 |
| §11 Test plan | Add blockquote class assertion + XSS re-run |
| §12 Rollout | Ship with adaptive feature or earlier (class is harmless when adaptive off) |

---

## Evidence

- Owner decision Q6 (2026-05-23): blockquote-as-meta via `markdown-render`.
- Adaptive SPEC [Markup syntax table](../adaptive-teleprompter/20260523-SPEC.md#markup-syntax-v1-binding).

---

## Open items

None. Approved with adaptive teleprompter SPEC 2026-05-23.
