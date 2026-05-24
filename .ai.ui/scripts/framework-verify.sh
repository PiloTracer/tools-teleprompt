#!/usr/bin/env bash
# Verify UI Design OS framework structure (run from .ai.ui root or repo with .ai.ui/)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

check() {
  if [[ -e "${ROOT}/$1" ]]; then
    echo "ok: $1"
  else
    echo "MISSING: $1"
    FAIL=1
  fi
}

echo "UI Design OS framework-verify"
echo "ROOT=${ROOT}"
echo ""

for p in \
  README.md START_HERE.md COHABITATION.md APPROACH.md \
  .work.ui/README.md .work.ui/context/HANDOFF_UI.md .work.ui/plans/NEXT_UI.md \
  skills/README.md skills/SKILL_DEPENDENCIES.md \
  concepts/README.md \
  templates/bootstrap.sh templates/cursorrules.ui.template templates/cursorrules.ui.snippet.template \
  templates/DOCS_UI_STACK.md.template scripts/cursorrules-ui.sh \
  docs/adoption/FROM_AGENT_OS.md \
  style-stacks/README.md examples/INDEX.md resources/control-platforms.md \
  standards/20260523-SURFACE-AND-CONTROL-CRAFT.md \
  standards/20260523-UI-PATTERNS.md \
  standards/20260523-SCREEN_SPEC_STANDARD.md \
  standards/20260523-DESIGN_TOKENS_STANDARD.md \
  standards/20260523-COMPONENT_STANDARD.md \
  standards/20260523-ACCESSIBILITY_STANDARD.md \
  standards/20260523-UI-CONVENTIONS.md \
  standards/20260523-FRONTEND_DIRECTORY_MAP.md \
  examples/dashboards/manifest.md examples/mobile-controls/manifest.md \
  examples/mobile/manifest.md examples/websites/manifest.md examples/websites-tecnology/manifest.md; do
  check "$p"
done

for skill in ui-bootstrap ui-project-approach ui-style-stack ui-design-foundation \
  ui-screen-spec ui-component-build ui-visual-verify ui-accessibility-audit \
  ui-design-system ui-concept-run ui-process-router; do
  check "skills/${skill}/skill.md"
done

# No Agent OS skill name collisions under .ai.ui/skills
FORBIDDEN="plan-foundation plan-master code-implementation session-control process-router concept-run project-bootstrap"
for name in $FORBIDDEN; do
  if [[ -d "${ROOT}/skills/${name}" ]]; then
    echo "COLLISION: skills/${name} must not exist in .ai.ui (use ui-* prefix)"
    FAIL=1
  fi
done

# UIS concepts present
for id in visual-hierarchy responsive-layout motion-design color-contrast interaction-patterns ai-visual-quality surface-control-craft; do
  check "concepts/${id}/prompt.md"
done

# S0 before S1 in onboarding templates
for f in README.md templates/work.ui/plans/NEXT_UI.md.template .work.ui/plans/NEXT_UI.md; do
  if [[ -f "${ROOT}/${f}" ]] && grep -q 'plan - S1' "${ROOT}/${f}" && ! grep -q 'plan - S0' "${ROOT}/${f}"; then
    echo "WARN: ${f} mentions S1 but not S0 (craft tier refined path)"
  fi
done

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "framework-verify: PASS"
else
  echo "framework-verify: FAIL"
  exit 1
fi
