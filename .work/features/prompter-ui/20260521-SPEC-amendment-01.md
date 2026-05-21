# Prompter UI — SPEC Amendment 01 (multi-QR + LAN handoff)

**Status:** Approved  
**Amends:** `.work/features/prompter-ui/20260520-SPEC.md`  
**ADR:** 006  
**Milestone:** M7-T6 · FR-11, FR-12

---

## Summary

Extends cross-device handoff with **multi-QR** (client-only, sequential scans) and **LAN one-shot** (API GET once). Clarifies existing R9–R10 and adds new rules **R13–R16** (R11/R12 in base SPEC remain: direct mobile entry and keyboard shortcuts).

---

## 2. In scope (additions)

- Multi-QR generate/consume UI (`/handoff/multi`, fragment `#tp=m1.*`)
- LAN handoff create UI + mobile consume route (`/handoff/lan/{token}`)
- Handoff mode auto-selection and fallback chain

---

## 3. Domain language (additions)

| Term | Definition |
|------|------------|
| Single-QR handoff | One QR encodes full payload in URL fragment `#tp=v1.*` |
| Multi-QR handoff | N QRs; each fragment `#tp=m1.{id}.{i}.{n}.{chunk}`; phone reassembles |
| LAN handoff | Desktop POST → phone opens SPA URL → API GET once |

---

## 4. Behavioural spec

### Clarifications (base SPEC)

- **R9 (clarified).** Single-QR handoff when compressed payload fits **one** QR URL at `PUBLIC_ORIGIN` (≤ `QR_MAX_URL_CHARS` measured); no server POST.
- **R10 (clarified).** Relay handoff when script exceeds 256 KB **or** when selected as last fallback after serverless modes; calls `pairing-api` relay endpoints.

### New rules

- **R13.** Multi-QR: desktop splits compressed payload into chunks; each chunk encodes to a scannable QR; phone reassembles **entirely client-side** via `sessionStorage`; **no API call** for script body on consume path.
- **R14.** Multi-QR UX shows progress **“Scan code i of n”** with previous/next on desktop; total raw script ≤ 256 KB.
- **R15.** LAN handoff: desktop calls `POST /api/v1/handoff/lan`; UI displays SPA link `resolveHandoffOrigin()/handoff/lan/{token}` for phone; mobile route fetches script via single GET then saves locally and opens player.
- **R16.** Handoff mode resolution order (auto): **single QR → multi-QR → LAN → relay** (`resolveHandoffMode()`); user sees mode hint before action.
- **R17.** QR sizing uses two limits (D14): `QR_FRAGMENT_THRESHOLD_BYTES` (8192 B compressed heuristic) and `QR_MAX_URL_CHARS` (3360 URL chars measured); mode detection must use **URL capacity**, not fragment bytes alone.

---

## 6. APIs (additions)

Consumes pairing-api additions per `pairing-api/20260521-SPEC-amendment-01.md`:

- `POST /api/v1/handoff/lan`
- `GET /api/v1/handoff/lan/{token}` (via frontend client / Caddy proxy)

Multi-QR: **no** pairing-api body endpoints.

---

## 7. Invariants (additions)

- **I3.** Multi-QR chunk payloads in `sessionStorage` cleared after successful reassembly.
- **I4.** LAN mobile link uses frontend origin (`VITE_PUBLIC_ORIGIN` / `PUBLIC_HOST`), not localhost, when configured.

---

## 9. Observability (additions)

Optional client metrics (no script content): `handoff.mode.single_qr`, `handoff.mode.multi_qr`, `handoff.mode.lan`, `handoff.mode.relay`.

---

## 11. Test plan (additions)

| Rule | Test |
|------|------|
| R13–R14 | vitest: chunk encode/decode round-trip; multi progress UI |
| R15 | vitest: LanConsume mock GET; Playwright LAN journey (M7-T7) |
| R16 | vitest: `resolveHandoffMode` + HandoffCreate mode hints |
| R17 | vitest: `qrConstants` / threshold helpers |
| R9–R10 | existing QR + relay tests remain valid |

---

## 12. Rollout and rollback

Feature ships with static frontend + API deploy. Rollback: force relay-only UI (hide multi/LAN buttons) via config if needed; relay path unchanged.
