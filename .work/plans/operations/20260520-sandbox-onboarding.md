# Sandbox onboarding — tools-teleprompt

**Status:** N/A · **Created:** 2026-05-20

---

## Summary

**No external vendor sandbox** is required for v1.

Foundation doc 02 (integrations) was skipped: `p1-integrations: none`. The application has no payment, government, or third-party API dependencies.

---

## Cross-device testing (manual)

| Flow | How to verify locally |
|------|------------------------|
| Relay + OTP | Desktop browser → create session → mobile browser or emulator → claim |
| QR handoff | Desktop shows QR → scan with phone camera |
| PWA offline | DevTools → Application → Service Workers; offline mode |

No API keys or sandbox credentials needed.

---

## When this doc needs revision

- Adding external integration (doc 02) → create vendor-specific sandbox runbook sibling
- CAPTCHA on session create → document Turnstile/hCaptcha test keys

---

## Reference

- `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md` (doc 02 skipped)
- `.work/plans/operations/20260520-docker-compose-proposal.md`
