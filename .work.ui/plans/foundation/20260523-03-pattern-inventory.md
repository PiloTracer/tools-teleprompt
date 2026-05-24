# tools-teleprompt — Pattern inventory

**Doc:** UI foundation **03** · **Created:** 2026-05-23

## Existing (in repo today)

| Pattern | Location | Reuse? |
|---------|----------|--------|
| App shell (header + nav) | `prompter/Layout.tsx`, `.tp-layout`, `.tp-header`, `.tp-nav` | **refactor** — mobile bottom nav / compact header |
| Script editor + drop zone | `prompter/Editor.tsx`, `.tp-editor`, `.tp-drop-zone` | **refactor** — width, touch, tokenized inputs |
| Format + preview | `prompter/Preview.tsx`, `.tp-format-fieldset`, `.tp-preview` | **refactor** — preview panel styling |
| Player viewport + scroll | `prompter/Player.tsx`, `.tp-player*`, `useScroll.ts` | **refactor** — hero surface; tokenize themes |
| Player controls (range, theme, mirror) | `prompter/PlayerControls.tsx`, `.tp-player-control*` | **replace** — custom sliders, 44px targets |
| Settings form | `prompter/Settings.tsx`, `.tp-settings` | **refactor** — grouped sections, save affordance |
| Keyboard help overlay | `prompter/Help.tsx`, `.tp-player-help*` | **refactor** — sheet on mobile |
| Handoff create (mode router) | `pairing/HandoffCreate.tsx` | **refactor** — card layout, hide raw URL |
| Single QR consume | `pairing/QrConsume.tsx` | **refactor** |
| Multi-QR create/consume | `pairing/MultiQrCreate.tsx`, `MultiQrConsume.tsx` | **refactor** — pagination UX |
| LAN consume | `pairing/LanConsume.tsx` | **refactor** |
| Relay claim | `pairing/HandoffClaim.tsx` | **refactor** |
| Sanitized HTML render | `markdown/SanitizedHtml.tsx` | **yes** — style via tokens in preview/player |
| PWA SW update banner | `pwa/registerSW.ts`, `.tp-sw-update` | **refactor** |
| i18n strings | `lib/i18n/en.ts` | **yes** — extend for new copy |
| Storage keys | `prompter/storage.ts` | **yes** — no UI change |
| Global CSS (legacy literals) | `styles/prompter.css` | **refactor** — migrate to tokens |
| Reset | `index.css` | **refactor** — align with tokens |

## Needed (net-new)

| Pattern | Tier | Priority | Screen(s) |
|---------|------|----------|-----------|
| Design token layer wired to Settings theme | primitive | P0 | all |
| Mobile primary nav (bottom bar ≤4 items) | layout | P0 | shell |
| Player immersive chrome (fullscreen toolbar) | layout | P0 | player |
| Custom range control (`role="slider"`) | primitive | P0 | player, settings |
| Button variants (primary / secondary / ghost) | primitive | P0 | all |
| Icon button + `aria-label` | primitive | P0 | player, handoff |
| Bottom sheet / drawer for secondary controls | layout | P1 | settings (mobile), help |
| Handoff step indicator (code N of M) | composite | P1 | handoff-create |
| QR display frame + scan hints | composite | P1 | handoff-create, handoff-receive |
| Copy-to-clipboard for handoff URL (not raw wall of text) | composite | P1 | handoff-create |
| Empty / loading / error states (styled) | composite | P0 | all |
| Skip link (app shell) | a11y | P1 | shell |

## Catalog

Detailed component rows: `.work.ui/design-system/CATALOG.md` (populate via `@ui-design-system init` after this foundation).

## UI-PATTERNS sections to apply

- All screens (baseline)
- Mobile-native patterns
- Navigation (mobile & desktop)
- Forms
- App shell (selective: active nav, page title)
