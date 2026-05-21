# Revise — serverless large-script cross-device handoff

**Status:** Approved — owner selected **(2) M7 with LAN + multi-QR** on 2026-05-21  
**Date:** 2026-05-21  
**Trigger:** Owner question — alternatives to Redis relay for big scripts  
**Parent plan:** `.work/plans/full/20260521-full-plan.md` (v1 **Approved**, M1–M6 complete)

---

## Question

Is there a way to pass **large** scripts cross-device **without saving the script on the server** (Redis relay)?

## v1 answer (confirmed — shipped)

| Path | Server stores script body? | Max size (practical) |
|------|----------------------------|----------------------|
| **QR / URL fragment** | **No** | ~2–3 KB compressed in QR symbol; plan threshold 8192 B is upper bound for fragment design, not QR encode limit |
| **Relay + OTP** | **Yes, ≤300s**, delete-on-read | 256 KB |

**Conclusion:** v1 has **no serverless path for large scripts**. Relay is the only in-app option above QR capacity (FR-05 vs FR-06; foundation doc 01 § storage alternatives).

---

## v2 options evaluated

| ID | Option | Script on pairing-api/Redis? | Cross-device | Complexity | Privacy | Recommendation |
|----|--------|------------------------------|--------------|------------|---------|----------------|
| **O1** | **Multi-QR sequence** (chunk payload across N QR codes) | No | Yes | Medium | High | **Preferred v2** if staying web-only, no new infra |
| **O2** | **WebRTC data channel** (P2P) | No (body); signaling metadata only | Yes | High | High | v2.1+; needs ADR; NAT/firewall UX risk |
| **O3** | **LAN one-shot fetch** (desktop serves in-memory blob; phone GET once) | No Redis; ephemeral laptop memory | Same LAN/hotspot only | Medium | High | **Preferred v2** for hotspot use case ( complements O1 ) |
| **O4** | **Encrypted relay** (ciphertext in Redis; key in URL fragment) | Ciphertext briefly | Yes | Medium | Medium | **Reject** — still server retention; adds crypto complexity without true serverless |
| **O5** | **Web Share / clipboard / messaging app** | No | Manual | Low | User-dependent | **Out of product scope** — document as operator workaround |
| **O6** | **Paste/upload on phone** (Flow A) | No | N/A (same user, two steps) | None | High | **Already available** — not “handoff” |
| **O7** | **Raise QR threshold only** | No | Yes | Low | High | **Insufficient** — QR symbol capacity is ~3.3k URL chars (measured); cannot reach 256 KB |
| **O8** | **Filesystem / object storage upload** | Yes, durable | Yes | Medium | Low | **Reject** — violates C1 data-minimization (foundation doc 01) |

---

## Proposed decisions (pending owner)

| ID | Date | Proposal | Rejects |
|----|------|----------|---------|
| **D11** | 2026-05-21 | v1 remains relay-for-large; no change to shipped M5/M6 | Replacing relay in v1 retroactively |
| **D12** | 2026-05-21 | If v2 handoff work approved: implement **O3 LAN one-shot** first (hotspot/LAN); then **O1 multi-QR** for offline-LAN | WebRTC (O2) in same milestone |
| **D13** | 2026-05-21 | O2 WebRTC deferred until ADR + signaling design | In-process WebRTC without signaling |
| **D14** | 2026-05-21 | Clarify U8: distinguish **fragment threshold** (8192 B) vs **QR encode limit** (~2500 B compressed measured) | Single threshold for both |

**Owner decision (2026-05-21):** **(2) M7 approved** — recorded in full plan v1.1, ADR 006, NEXT.md iteration M7.

---

## Proposed v2 requirements (if approved)

| ID | Requirement | Maps to |
|----|-------------|---------|
| FR-11 | LAN handoff: desktop exposes one-time URL; phone fetches script once; no Redis write | O3, G3 |
| FR-12 | Multi-QR: N sequential scans reassemble payload client-side; no API body | O1, G3 |
| NFR-11 | All serverless paths: no script bytes in server logs; fragment/key material not logged | C4 |

---

## Proposed milestone sketch (v2 — not Approved)

### M7: Serverless large handoff (candidate)

| Task | Description | Files (indicative) |
|------|-------------|-------------------|
| M7-T1 | ADR 006 — serverless handoff modes (LAN + multi-QR) | `.work/decisions/` |
| M7-T2 | LAN one-shot: create tokenized URL, in-memory serve, single GET, CORS/LAN bind | `frontend/`, optional tiny `api/` or dev-only route |
| M7-T3 | Multi-QR: chunk encoder/decoder + UX “scan next code” | `frontend/src/pairing/` |
| M7-T4 | Amended prompter-ui SPEC R9/R10 + E2E | SPECs, Playwright |
| M7-T5 | MOD-06 security review | `.work/context/` |

**Estimate:** L–XL (M7-T2 architecture choice: pure frontend LAN server vs minimal API affects scope).

---

## Integrity (Phase 5 subset)

| Check | Result | Notes |
|-------|--------|-------|
| Consistent with G3 privacy goal | pass | O1/O3 align |
| Consistent with C2 no database | pass | No SQL |
| Consistent with ADR 002 | pass | Relay remains; v2 adds paths |
| Scope creep vs v1 Approved plan | pass | v2 additive only |
| Owner approval before M7 | **approved** 2026-05-21 | Full plan v1.1 + ADR 006 |

---

## Owner decision needed

1. **Accept v1 as-is** for large scripts (relay only) — no M7.
2. **Approve v2 M7** with priority: **LAN (O3)** → **multi-QR (O1)** → defer **WebRTC (O2)**.
3. **Approve ADR 006 only** — design spike, no code yet.

---

## References

- `.work/plans/foundation/20260520-01-tools-teleprompt-initial-scope.md` § storage alternatives (A–D)
- `.work/plans/foundation/20260520-04-foundation-architecture.md` §4 handoff modes
- `.work/decisions/20260520-002-ephemeral-redis-store.md`
- `.work/features/prompter-ui/20260520-SPEC.md` R9, R10
