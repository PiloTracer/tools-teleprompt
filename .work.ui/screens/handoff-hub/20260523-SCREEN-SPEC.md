# Handoff hub — Screen SPEC

**Status:** Approved  
**Slug:** `handoff-hub`  
**Routes:** `/handoff`, `/handoff/create` (index redirects to `create`)  
**UI milestone:** S4  
**Path:** `.work.ui/screens/handoff-hub/20260523-SCREEN-SPEC.md`  
**Components:** `HandoffPage`, `HandoffCreate`, `MultiQrCreate` (`frontend/src/routes/HandoffPage.tsx`, `pairing/HandoffCreate.tsx`, `pairing/MultiQrCreate.tsx`)

---

## 1. Summary

The **handoff hub** is the **send-side** cross-device flow: from a script already in local storage, the app picks a handoff **mode** (single QR → multi-QR → LAN → relay) and presents the right UX to move the script to another device. Entry: nav **Handoff**, `/handoff/create`. This SPEC covers **creation/display on the sending device** only; receive routes (`/handoff/receive`, `/multi`, `/lan/:token`, `/claim/:token`) are separate consume SPECs (may share patterns in S4/S5).

---

## 2. Personas & jobs

| Persona | Job |
|---------|-----|
| **Desktop → phone presenter** | Show QR or link on laptop; scan/open on phone |
| **Same-network user** | Create LAN link when on hotspot/Wi‑Fi |
| **Large script user** | Paginate multi-QR codes; scan in order |
| **Fallback user** | Use relay + OTP when client modes unavailable |

---

## 3. States

| State | Behaviour | Visual |
|-------|-----------|--------|
| **loading script** | Load source + format from storage | `en.handoff.loading` |
| **loading origin** | `resolveHandoffOriginAsync` | `en.handoff.originLoading` |
| **no script** | Empty source | Message + link to editor |
| **mode detecting** | `resolveHandoffMode` | `en.handoff.modeDetecting` |
| **mode — single-qr** | Client-only QR | Generate button → QR image + link |
| **mode — multi-qr** | Embedded `MultiQrCreate` | Generate → paginated QR + progress |
| **mode — lan** | POST LAN API | Create button → LAN URL + expiry |
| **mode — relay** | POST relay API | Create button → claim URL + OTP + expiry |
| **creating / generating** | API or QR in flight | Disabled buttons; progress copy |
| **success — result** | Session/LAN/QR displayed | `.tp-handoff-result` card region |
| **error** | Validation, API, QR, loopback origin | `role="alert"` `.tp-error` |
| **origin blocked** | localhost / unreachable for phones | `en.handoff.originLoopback` alert |

### Mode resolution (link only)

Fallback chain per `resolveHandoffMode` — do not duplicate algorithm here; see `pairing/qrThreshold.ts` and ADR 006.

---

## 4. Layout & hierarchy

### Regions (UIS-01)

| Region | Content |
|--------|---------|
| App shell | `Layout` (S1 styling) |
| **Header block** | Title `en.handoff.createTitle`, hint `en.handoff.createHint` |
| **Origin meta** | Handoff link host — monospace, copy-friendly (upgrade) |
| **Status meta** | Script ready + format; mode hint |
| **Mode panel** | One active mode UI (QR / multi / LAN / relay) |
| **Result card** | QR frame, OTP block, or link — **never** raw wall-of-text URL as sole affordance |
| **Footer nav** | Back to editor |

### Visual upgrade targets (vs `tmp/image copy 2.png`)

- **Card layout:** mode panel and results in `--color-bg-surface` cards with `--radius-lg`, `--shadow-sm`.
- **QR display:** centered frame, max-width min(512px, 90vw); scan hint above; progress “Code N of M” prominent.
- **Links:** truncate display + **Copy link** button; optional “Show full URL” disclosure (see `RISK_REGISTRY` UR3).
- **OTP (relay):** large tabular OTP display; claim URL copy button.
- **Origin host:** badge/chip style; warning callout when loopback.
- **Buttons:** primary per mode (Generate / Create); secondary for multi-QR prev/next.
- **Multi-QR:** merge duplicate headings — today `MultiQrCreate` renders its own `h1` inside `HandoffCreate` (fix in S4: subheading or single title).
- **Spacing:** `--space-*` between sections; mobile full-width CTAs ≥44px.

### Primary action per mode

| Mode | Primary action |
|------|----------------|
| single-qr | Generate QR code |
| multi-qr | Generate multi-QR codes |
| lan | Create LAN handoff link |
| relay | Create relay session |

### Breakpoints

| Viewport | Layout |
|----------|--------|
| **&lt;768px** | Single column; full-width primary CTAs ≥44px; QR max-width 90vw; prev/next stacked or side-by-side with min touch height |
| **≥768px** | Content max-width `--layout-max-width`; QR frame max 512px centered; meta + result cards readable line length |

---

## 5. Content

| Key | Source | Notes |
|-----|--------|-------|
| Title / hint | `en.handoff.createTitle`, `createHint` | |
| Origin | `originLabel`, `originLoading`, `originLoopback` | |
| Mode hints | `modeDetecting`, `modeQr`, `modeMultiQr`, `modeLan`, `modeRelay` | |
| Script empty | `noScript`, `backEditor` | |
| Script ready | `scriptReady` | |
| Single QR | `createQr`, `generatingQr`, `qrScanHint`, `qrImageAlt`, `qrLinkLabel` | |
| LAN | `lanCreateButton`, `lanCreating`, `lanOpenHint`, `lanLinkLabel`, `expires` | |
| Relay | `createRelay`, `creating`, `claimUrl`, `otpLabel`, `expires` | |
| Multi-QR | `MultiQrCreate` copy object | Move to `en.handoff.multi*` in build |
| Errors | `emptyScript`, `createFailed`, `lanCreateFailed`, `qrFailed`, `qrTooLarge` | |

---

## 6. Interactions

| Interaction | Behaviour |
|-------------|-----------|
| Generate QR | `buildHandoffQrUrl` + `generateHandoffQrDataUrl`; show image + link |
| QR too large | Fallback hint; may bump mode to multi-qr |
| Create LAN | `createLanHandoff` → display `lanHandoffPageUrl` |
| Create relay | `createRelaySession` → claim URL + OTP |
| Multi-QR generate | `encodeMultiQrHandoff`; paginate with prev/next |
| Multi-QR prev/next | Update index; regenerate QR data URL for chunk |
| Back to editor | `Link` to `/` |
| Copy link (upgrade) | Clipboard API + toast/status |

### Focus order

Title → origin meta → mode hint → primary CTA → result controls → back link.

### Mobile

QR image scales; prev/next ≥44px; OTP readable at arm's length.

---

## 7. Data dependencies

| Dependency | Link | Use |
|------------|------|-----|
| Pairing API (relay) | `.work/features/pairing-api/20260520-SPEC.md` | `createRelaySession` |
| Pairing amendment (LAN) | `.work/features/pairing-api/20260521-SPEC-amendment-01.md` | `createLanHandoff` |
| Prompter UI R9–R10 | `.work/features/prompter-ui/20260520-SPEC.md` | QR vs relay UX |
| ADR 006 | `.work/decisions/20260521-006-serverless-handoff-modes.md` | Mode chain |
| Client | `pairing/client.ts` | API calls — no schema duplication |
| Origin | `pairing/publicOrigin.ts` | Hotspot/LAN URL |
| QR | `qrEncode.ts`, `qrChunkEncode.ts`, `qrThreshold.ts` | Client-only paths |
| Script storage | `prompter/storage.ts` | Read-only source + format |

**Security:** Do not log handoff URLs with fragments, OTP, or script text (R11).

---

## 8. Tokens & components

| Component | Status | Notes |
|-----------|--------|-------|
| **Button** (`ds-button`) | **done** | Primary per mode; secondary prev/next (multi-QR) |
| **Card** (`ds-card`) | **done** | Mode panel + `.tp-handoff-result` regions |
| **ErrorAlert** (`ds-alert` `data-variant="error"`) | **done** | Loopback + API errors |
| **StatusBanner** (`ds-alert` `data-variant="status"`) | **done** | Copy success / `aria-live` polite |
| **QrFrame** | planned S4 | `components/ds/QrFrame.tsx` — single + multi |
| **HandoffResultCard** | planned S4 | QR / LAN / relay result layout |
| **HandoffStepIndicator** | planned S4 | `N of M` + `aria-live="polite"` |
| **OtpDisplay** | planned S4 | Relay OTP — tabular nums, not color-only |
| **CopyButton** | planned S4 | Truncated URL + clipboard |
| `.tp-handoff-meta`, `.tp-handoff-nav` | brownfield | Tokenize in `handoff.css` (new) — currently unstyled classes in `HandoffCreate.tsx` |

---

## 9. Accessibility

**Target:** WCAG **2.1 AA**.

- QR images: meaningful `alt` (`qrImageAlt`, multi index/total).
- OTP: visible text; not color-only; consider `aria-live` on relay success.
- Errors: `role="alert"`.
- Loopback warning: alert when origin blocks cross-device.
- Buttons: disabled state when no script or origin blocked.
- Link truncation: full URL available to SR or via copy.

---

## 10. Analytics

Optional (no script/OTP/token in payloads):

| Event | When |
|-------|------|
| `handoff.mode.resolved` | Mode enum only |
| `handoff.qr.generated` | single or multi |
| `handoff.lan.created` | |
| `handoff.relay.created` | |

---

## 11. Acceptance criteria

- [ ] `/handoff` redirects to `/handoff/create`.
- [ ] Empty script shows editor link; no create buttons enabled.
- [ ] Mode hint matches resolved mode after load.
- [ ] **single-qr:** QR image + link after generate; blocked on loopback origin.
- [ ] **multi-qr:** progress N of M; prev/next; all chunks scannable (E2E covered).
- [ ] **lan:** LAN URL + expiry after create.
- [ ] **relay:** claim URL + OTP + expiry after create.
- [ ] Oversize script blocked with validation message.
- [ ] S4 visual: card layout, copy buttons, no ugly raw URL wall (truncated + copy).
- [ ] Multi-QR: single page title (no duplicate h1) — **confirmed gap:** `MultiQrCreate` renders second `<h1>`.
- [ ] All mode CTAs use `ds-button` primary/secondary (no native unstyled buttons).
- [ ] Origin host shown as chip/badge; loopback uses `ds-alert` error variant.
- [ ] Regression: handoff E2E specs pass in container.
- [ ] i18n: multi-QR strings moved to `en.ts` (no inline `copy` object in `MultiQrCreate.tsx`).
- [ ] **extractedRules:** QR centered in frame with scan hint; progress “Code N of M” prominent; copy link not sole affordance; primary CTA per mode; elevated result cards.

---

## 12. Concept / UIS registry

| UIS | Applies | Reason | Status |
|-----|---------|--------|--------|
| UIS-01 | yes | Mode panels; QR hierarchy | pending |
| UIS-02 | yes | Mobile scan UX; touch buttons | pending |
| UIS-03 | yes | QR swap transitions; reduced motion | pending |
| UIS-04 | yes | QR contrast; error visibility | pending |
| UIS-05 | yes | Alerts, OTP, pagination focus | pending |
| UIS-06 | yes | Agent S4 implementation | pending |
| UIS-07 | yes | Craft tier refined — cards, QR frame, copy/OTP anatomy | pending |

---

## 13. Visual references

| Field | Value |
|-------|-------|
| **exampleIds** | `mobile/M1`, `mobile-controls/C1`, `dashboards/D1` |
| **manifestPaths** | `.ai.ui/examples/mobile/manifest.md`, `.ai.ui/examples/mobile-controls/manifest.md`, `.ai.ui/examples/dashboards/manifest.md` |
| **craftTier** | refined (foundation 01) |
| **beforeScreenshot** | `tmp/image copy 2.png` |
| **extractedRules** | See below |
| **regionMap** | Header/meta → `D1`; mode CTA cluster → `C1`; QR result → `M1` + `C1`; multi-QR pager → `C1` |

### extractedRules (binding)

- **Mode switch:** distinct chrome per resolved mode; one primary CTA visible (`mobile/M1`)
- **Elevated cards** for mode panel and results; hero QR block centered (`dashboards/D1`)
- **Touch clusters:** prev/next and generate ≥44px; segmented-style control grouping (`mobile-controls/C1`)
- **Copy-friendly links:** truncate display + Copy button; OTP large tabular — not color-only (`dashboards/D1` Pay CTA pattern)
- **Progress:** “Scan code N of M” as primary secondary metric (multi-QR)

| Reference | Path |
|-----------|------|
| Before | `tmp/image copy 2.png` |
| Related consume | `handoff-receive`, `handoff-multi` slugs (future SPECs) |
| Patterns | `.ai.ui/standards/20260523-UI-PATTERNS.md` § forms, mobile-native |

---

## Implementation notes (S4)

- **Files:** `HandoffCreate.tsx`, `MultiQrCreate.tsx`, new handoff CSS, optional small components (`HandoffResultCard`, `CopyLinkButton`).
- **Do not** change mode resolution, API contracts, or QR encoding without domain SPEC/ADR update.
- **PUBLIC_HOST / PUBLIC_ORIGIN:** display and docs only — config in `.env.dev` per deploy README.
- Consider extracting shared result layout for LAN/relay/QR to reduce duplication.

## Out of scope (this slug)

| Route | Component | SPEC |
|-------|-----------|------|
| `/handoff/receive` | `QrConsume` | `handoff-receive` (future) |
| `/handoff/multi` | `MultiQrConsume` | `handoff-multi` (future) |
| `/handoff/lan/:token` | `LanConsume` | `handoff-lan` (future) |
| `/handoff/claim/:token` | `HandoffClaim` | `handoff-claim` (future) |
