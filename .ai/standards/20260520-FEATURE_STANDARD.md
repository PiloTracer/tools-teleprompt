# Feature Standard — tools-teleprompt

**Status:** Binding for this repo  
**Base template:** `.ai/standards/20260517-FEATURE_STANDARD.md` (Agent OS — do not edit)

---

## Project addenda

### High-risk SPEC areas (extra review)

| Slug | Risk |
|------|------|
| `pairing-api` | OTP, ephemeral relay, abuse |
| `markdown-render` | XSS, sanitization |
| `prompter-ui` | PWA offline, local storage, QR handoff |

### Feature slugs (v1)

| Slug | Bounded context |
|------|-----------------|
| `prompter-ui` | Editor, player, settings, PWA, QR client |
| `pairing-api` | Session create/claim/expire |
| `markdown-render` | Parse + sanitize pipeline |

### SPEC location

`.work/features/<slug>/YYYYMMDD-SPEC.md` — amendments as sibling `*-amendment-NN.md`.

### Implementation gate

Every PR touching a bounded context must cite the SPEC and list rule IDs (R1…) covered by tests.

### Concept registry (default)

| Concept id | Applies when |
|------------|--------------|
| MOD-06 | AI-assisted implementation sessions |

Cross-boundary changes (frontend + API): run MOD-01 concept prompt per `.ai/concepts/README.md`.
