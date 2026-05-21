# Data Classification — tools-teleprompt

**Status:** v1 foundation (P4)  
**Bootstrap base:** `.ai/standards/20260517-data-classification.md` (template — unchanged)

---

## 1. Classes (project)

| Class | Definition | Examples |
|-------|------------|----------|
| **public** | Safe without auth | Static assets, `/health`, public UI copy |
| **internal** | Operational metadata | `correlation_id`, request counts, Redis key names |
| **user-content** | User-authored scripts | Plain/markdown text in browser or Redis relay |
| **capability** | Short-lived access secrets | OTP (display only), pairing token in URL |
| **credential** | Infrastructure secrets | `REDIS_URL`, TLS private keys |

No **pii** or **financial** classes in v1 (no accounts, no payments).

---

## 2. Handling rules

| Class | At rest | In transit | In logs | In traces |
|-------|---------|------------|---------|-----------|
| public | standard | TLS | allowed | allowed |
| internal | standard | TLS | allowed | allowed |
| user-content | device localStorage; Redis ≤5m | TLS (relay) | **forbidden** | **forbidden** |
| capability | Redis otp_hash; OTP shown once | TLS | **forbidden** | token hash only |
| credential | env / secrets | TLS | **forbidden** | **forbidden** |

---

## 3. Tagging

- SPECs §10 declare class for each field (`pairing-api` Redis JSON, `prompter-ui` storage keys).
- No SQL columns v1.

---

## 4. Retention

| Location | Retention |
|----------|-----------|
| Browser localStorage | Until user clears site data |
| Redis relay | ≤ 300 s TTL; delete-on-read |
| Application logs | ≤ 30 days (operator default) |

---

## 5. Redaction

API logging middleware must strip keys: `text`, `otp`, `script`, `payload`.

---

## 6. Open items

Jurisdiction-specific retention: none identified — track in UNKNOWNS if needed.
