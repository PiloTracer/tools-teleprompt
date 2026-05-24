# RISK_REGISTRY — UI planning registry

**Updated:** 2026-05-23

Status: **Open** | **Mitigated** | **Accepted** | **Closed**

| ID | Risk | Category | Likelihood | Impact | Mitigation | Status | Owner |
|----|------|----------|------------|--------|------------|--------|-------|
| UR1 | Token migration breaks player scroll/layout | design | M | H | S1 scoped to player; visual verify + existing unit tests | Open | eng |
| UR2 | Mobile nav change confuses desktop users | UX | L | M | Responsive shell: top nav ≥768px per UA5 | Open | owner |
| UR3 | Handoff URL hidden too aggressively (support/debug) | UX | L | M | “Copy link” + optional “Show technical URL” in SPEC | Open | eng |
| UR4 | Dual theme systems (`data-theme` vs `.tp-player--dark`) diverge | tech | M | M | Converge in S1/S3 per foundation 02 migration table | Open | eng |
