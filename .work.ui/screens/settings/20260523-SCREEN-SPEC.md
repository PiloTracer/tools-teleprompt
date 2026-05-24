# Settings — Screen SPEC

**Status:** Implemented  
**Slug:** `settings`  
**Route:** `/settings`  
**UI milestone:** S3  
**Path:** `.work.ui/screens/settings/20260523-SCREEN-SPEC.md`  
**Components:** `SettingsPage`, `Settings` (`frontend/src/routes/SettingsPage.tsx`, `prompter/Settings.tsx`)

---

## 1. Summary

The **settings** screen lets users configure **default teleprompter display behaviour** persisted in `tp:settings`: scroll speed, font size, side inset, bottom clearance, theme, and mirror. Unlike the player toolbar (live/auto-save), this form uses an explicit **Save** action and a success status message. Entry: nav **Settings**. Values apply to the player on next visit and when saved; S3 upgrade should make controls touch-friendly, token-styled, and optionally sync **app theme** via `data-theme` on `<html>` per foundation doc 02.

---

## 2. Personas & jobs

| Persona | Job |
|---------|-----|
| **Presenter** | Set comfortable defaults before rehearsal (speed, font, padding) |
| **Camera setup user** | Enable mirror; tune bottom clearance for overhead framing |
| **Theme preference** | Choose light/dark for player chrome and (upgrade) app shell |

---

## 3. States

| State | Behaviour | Visual |
|-------|-----------|--------|
| **loading** | `loadSettings()` on mount | Brief — may flash defaults; upgrade: skeleton or disabled form until loaded |
| **dirty** | Any control changed since load/save | Save button enabled; no success message |
| **saved** | After successful `saveSettings` | `role="status"`: `en.settings.saved` |
| **error — storage** | `saveSettings` rejects | `role="alert"` with `en.errors.storage` (add in upgrade if missing) |

**Out of scope:** script content editing, handoff, account settings.

---

## 4. Layout & hierarchy

### Regions (UIS-01)

| Region | Content |
|--------|---------|
| App shell | Shared `Layout` (styled in S1) |
| **Page heading** | `h2` — `en.settings.title` (upgrade: visible `h1` for outline) |
| **Settings form** | Stacked controls in `.tp-settings` |
| **Primary action** | Submit **Save** — one obvious action per viewport (UIS-01) |

### Control list (order preserved)

1. Scroll speed (0.5×–3×, step 0.1)  
2. Font size (14–48 px)  
3. Side padding (0–30 — stored as vw in player; label copy may say “%” today — align in build)  
4. Bottom clearance (0–100 % of viewport height — scroll tail)  
5. Theme (light / dark select)  
6. Mirror (checkbox)  
7. Save button  

### Breakpoints

| Viewport | Layout |
|----------|--------|
| **&lt;768px** | Full-width form; max-width none; controls full bleed with `--space-4` padding; sliders min height 44px touch target |
| **≥768px** | Form max-width ~`28rem`–`32rem` centered or left-aligned in content column; optional two-column grouping for related sliders (future) |

### Visual upgrade targets (vs `tmp/image copy 3.png`)

- Replace default range/select/checkbox chrome with tokenized **ds-** or **tp-** control styles.
- **Save** as primary button (`--color-accent`); full-width on mobile.
- Group each slider: label row + slider + value pill (tabular nums).
- Mirror: larger toggle or checkbox row ≥44px tap area.
- Page background `--color-bg-canvas`; form on `--color-bg-surface` card with `--radius-lg` and `--shadow-sm` (optional).
- Wire theme select to `document.documentElement.dataset.theme` when saving (coordinate with player `.tp-player--dark` in S1/S3).

### Primary action

**Save** — only submits persistence; does not navigate away.

---

## 5. Content

| Key / element | Source | Notes |
|---------------|--------|-------|
| Title | `en.settings.title` | Consider promoting to `h1` |
| Speed | `en.settings.speed` | Display `{n}×` |
| Font size | `en.settings.fontSize` | Display `{n}px` |
| Side padding | `en.settings.sidePadding` | Clarify units in copy (vw) during build |
| Bottom clearance | `en.settings.bottomPadding` | Display `{n}%` |
| Theme | `en.settings.theme`, `themeLight`, `themeDark` | |
| Mirror | `en.settings.mirror` | |
| Save | Add `en.settings.save` — button text currently hardcoded “Save” |
| Saved status | `en.settings.saved` | `role="status"` |

---

## 6. Interactions

| Interaction | Behaviour |
|-------------|-----------|
| Slider change | Updates local state; clears saved flag |
| Theme select | Updates local `theme` |
| Mirror checkbox | Updates local `mirror` |
| Save (submit) | `preventDefault`; `saveSettings(settings)`; show saved status |
| Tab order | Title → speed → font → side → bottom → theme → mirror → Save |
| Keyboard | Enter on form submits Save |

**No live preview** on this screen in v1 (player is preview surface). Optional future: “Preview in player” link to `/play`.

---

## 7. Data dependencies

| Dependency | Link | Use |
|------------|------|-----|
| Prompter UI | `.work/features/prompter-ui/20260520-SPEC.md` | Settings definition §3; R3 defaults |
| Storage | `prompter/storage.ts` | `tp:settings` JSON: `speed`, `fontSize`, `sidePadding`, `bottomPadding`, `theme`, `mirror` |
| Player | `player` SCREEN-SPEC | Same settings object consumed by `Player` / `PlayerControls` |
| Tokens | `foundation/20260523-02-design-tokens.md` | `data-theme` on `<html>` |

**Do not** add new keys without domain SPEC amendment.

---

## 8. Tokens & components

| Item | Notes |
|------|--------|
| `.tp-settings` | Refactor spacing to `--space-*`; remove `max-width: 28rem` hardcode → token |
| Range control | Shared primitive with player (S1 catalog) |
| Select / checkbox | Styled per vanilla-css stack |
| Primary button | Save — from design system when available |

---

## 9. Accessibility

**Target:** WCAG **2.1 AA**.

- Each control has visible `<label>` (not placeholder-only).
- Range inputs: associate label; expose value text; consider `aria-valuetext`.
- Save: clear focus ring `--color-focus-ring`.
- Success: `role="status"` (live region polite) — existing.
- Touch targets ≥44px on mobile (UIS-02).
- Error on save failure: `role="alert"` (add if implemented).

---

## 10. Analytics

Optional:

| Event | When |
|-------|------|
| `settings.saved` | Successful save |
| `settings.theme.changed` | Theme value in saved payload |

No script content in payloads.

---

## 11. Acceptance criteria

- [ ] All six setting fields load from `loadSettings()` on mount.
- [ ] Save persists to `tp:settings`; player reflects values on `/play` after save.
- [ ] Speed 0.5–3, font 14–48, side 0–30, bottom 0–100 enforced by input min/max.
- [ ] Saved message appears after submit; hidden or replaced on next edit.
- [ ] S3 visual: form uses semantic tokens; Save is primary; sliders meet mobile touch size.
- [ ] Theme save sets `data-theme` on `<html>` when upgrade specifies (light → remove, dark → `dark`).
- [ ] No regression: settings-related tests pass in container.
- [ ] Side padding label/units consistent with player behaviour (vw).

---

## 12. Concept / UIS registry

| UIS | Applies | Reason | Status |
|-----|---------|--------|--------|
| UIS-01 | yes | Form hierarchy; primary Save | pending |
| UIS-02 | yes | Mobile slider/toggle sizes | pending |
| UIS-03 | yes | Minimal transitions on save banner | pending |
| UIS-04 | yes | Form text/background contrast | pending |
| UIS-05 | yes | Labels, focus order, status region | pending |
| UIS-06 | yes | Agent S3 implementation | pending |
| UIS-07 | yes | Craft tier refined — C5 settings grouping | pending |

---

## 13. Visual references

| Field | Value |
|-------|-------|
| **exampleIds** | `mobile-controls/C5` |
| **manifestPaths** | `.ai.ui/examples/mobile-controls/manifest.md` |
| **craftTier** | refined |
| **beforeScreenshot** | User settings capture / `tmp/image copy 3.png` |
| **extractedRules** | See below |
| **regionMap** | Form → `C5`; theme → segmented; sliders → `RangeSlider` |

### extractedRules (binding)

- Label + custom slider + unit readout (never bare range) — `C5`
- Group related fields with vertical rhythm — `C5`
- Toggle row ≥44px on mobile — `C5`, UIS-02
- Primary Save button full-width mobile — UIS-01
- Form on elevated `ds-card` surface

| Reference | Path |
|-----------|------|
| Before | `tmp/image copy 3.png` |
| Related | `player` SCREEN-SPEC (shared settings model) |
| Tokens | `frontend/src/styles/tokens.css` |

---

## Implementation notes (S3)

- Implement **after** S1 player control primitives exist (reuse slider/button styles).
- Keep explicit Save semantics — do not auto-save on every slider move unless product decision changes (player differs).
- Add `en.settings.save` and wire i18n for button text.
