# Traceability matrix — tools-teleprompt full plan

**Plan:** `.work/plans/full/20260521-full-plan.md`  
**Created:** 2026-05-21

---

## Goal → FR → ADR → SPEC → Task → Test → Acceptance

| Goal | FR/NFR | ADR | SPEC | Task(s) | Test | Acceptance |
|------|--------|-----|------|---------|------|------------|
| G1 | FR-01 | 001 | prompter-ui | M3-T2 | vitest upload | AC-1 |
| G1 | FR-02 | 005 | markdown-render | M2-T1, M2-T3 | M2-T5 | AC-4 |
| G1 | FR-03 | 001 | prompter-ui | M3-T4 | vitest storage | AC-1 |
| G1 | FR-04 | 001 | prompter-ui | M4-T1, M4-T2, M4-T3 | M4-T7 | AC-1 |
| G1 | FR-07 | 004 | prompter-ui | M3-T1, M5-T8 | manual | AC-1 |
| G1 | FR-10 | 001 | prompter-ui | M3-T7 | viewport test | AC-1 |
| G2 | FR-05 | 002 | pairing-api | M5-T2, M5-T4, M5-T8 | M5-T7, M6-T4 | AC-2 |
| G2 | FR-06 | 001 | prompter-ui | M6-T1, M6-T2, M6-T3 | M6-T4 | AC-3 |
| G3 | FR-08 | 002 | pairing-api, prompter-ui | M3-T6, M5-T2 | unit tests | AC-5 |
| G3 | NFR-01 | 002,004 | pairing-api | M5-T4, M5-T5 | log grep | AC-6 |
| G4 | FR-09 | 001 | prompter-ui | M4-T4, M4-T5 | M4-T7 | AC-7 |
| G4 | NFR-04 | 001 | prompter-ui | M4-T4 | Playwright offline | AC-7 |
| G5 | NFR-03 | 005 | markdown-render | M2-T2, M6-T5 | M2-T5, CSP check | AC-4 |
| G6 | NFR-05 | 003 | — | M1-T4, M6-T7 | compose up | AC-9 |
| G6 | NFR-06 | 003 | pairing-api | M1-T3, M5-T1 | health check | AC-9 |
| G6 | NFR-10 | — | pairing-api | M5-T6 | metrics smoke | AC-8 |

---

## FR coverage

| FR | Task(s) | Status |
|----|---------|--------|
| FR-01 | M3-T2, M3-T3 | pending |
| FR-02 | M2-T1–T4, M3-T3 | pending |
| FR-03 | M3-T4, M3-T5 | pending |
| FR-04 | M4-T1–T3, M4-T6 | pending |
| FR-05 | M5-T2, M5-T4, M5-T8 | pending |
| FR-06 | M6-T1–T3 | pending |
| FR-07 | M3-T1, M5-T8 | pending |
| FR-08 | M3-T6, M5-T2 | pending |
| FR-09 | M4-T4, M4-T5 | pending |
| FR-10 | M3-T7, M4-T2 | pending |

**Coverage:** 10/10 FR traced (100%).

---

## NFR coverage

| NFR | Task(s) |
|-----|---------|
| NFR-01 | M5-T4, M5-T5, M6-T3 |
| NFR-02 | M4-T1 |
| NFR-03 | M2-T2, M5-T3, M6-T5 |
| NFR-04 | M4-T4, M4-T5 |
| NFR-05 | M1-T1, M1-T2, M1-T4 |
| NFR-06 | M1-T3, M6-T7 |
| NFR-07 | M4-T6 |
| NFR-08 | M1-T4 |
| NFR-09 | M3-T8 |
| NFR-10 | M1-T6, M5-T6 |

**Coverage:** 10/10 NFR traced (100%).

---

## High-risk task validation

| Task | Risk | Validation |
|------|------|------------|
| M2-T5 | R6 XSS | xss-fixtures.json vitest |
| M5-T2 | R4 token | pytest entropy + integration |
| M5-T3 | R5 abuse | pytest rate limit |
| M5-T4 | R4 OTP | pytest lockout + delete-on-read |
| M6-T1 | R9 QR size | unit threshold + E2E fallback |
| M4-T5 | R10 SW stale | Playwright + manual update UX |
