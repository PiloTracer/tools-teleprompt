#!/usr/bin/env bash
# Agent OS framework verification - run locally or in CI.
# Usage: bash scripts/framework-verify.sh   (from repo root)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

failures=0
note() { echo "==> $*"; }
ok() { echo "    OK: $*"; }
die() { echo "    FAIL: $*" >&2; failures=$((failures + 1)); }

note "Agent OS framework-verify (root=${REPO_ROOT})"

# --- 1. Self-hosted layout (this repo IS the .ai tree) ---
note "Self-hosted layout"
for f in START_HERE.md README.md skills/README.md skills/SKILL_DEPENDENCIES.md templates/bootstrap.sh; do
  if [[ -f "${REPO_ROOT}/${f}" ]]; then
    ok "${f}"
  else
    die "missing ${f}"
  fi
done

skill_count="$(find skills -mindepth 1 -maxdepth 1 -type d ! -name '.*' 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${skill_count}" -eq 12 ]]; then
  ok "12 skill directories"
else
  die "expected 12 skill directories, found ${skill_count}"
fi

for s in skills/*/skill.md; do
  [[ -f "${s}" ]] || die "missing ${s}"
done
ok "all skill.md files present"

# --- 2. Consumer bootstrap smoke ---
note "Consumer bootstrap smoke"
SMOKE_ROOT="$(mktemp -d)"
trap 'rm -rf "${SMOKE_ROOT}"' EXIT

mkdir -p "${SMOKE_ROOT}/.ai"
rsync -a \
  --exclude='.git' \
  --exclude='.work' \
  --exclude='.github' \
  --exclude='.private' \
  --exclude='.credentials' \
  --exclude='scripts/smoke-consumer.sh' \
  "${REPO_ROOT}/" "${SMOKE_ROOT}/.ai/"

(
  cd "${SMOKE_ROOT}"
  git init -q
  bash .ai/templates/bootstrap.sh >/dev/null
  for f in .work/context/HANDOFF.md .work/plans/NEXT.md .cursorrules DOCS_TECH_STACK.md; do
    if [[ -f "${f}" ]]; then
      ok "consumer created ${f}"
    else
      die "consumer missing ${f}"
    fi
  done
  if [[ -d .ai/.work ]]; then
    die "bootstrap placed .work inside .ai/ (expected repo root)"
  fi
)

# --- 3. Removed vendor integration paths ---
note "No stale vendor integration paths"
if grep -rqE 'docs/integration/(hacienda|oidc|xades)' --include='*.md' . 2>/dev/null; then
  die "found reference to removed docs/integration vendor paths"
else
  ok "no hacienda/oidc/xades integration paths in markdown"
fi

# --- 4. Template placeholders present ---
note "REPLACE: token hygiene"
if grep -rq 'REPLACE:PROJECT_NAME' templates/cursorrules.template templates/work/ 2>/dev/null; then
  ok "REPLACE:PROJECT_NAME in templates"
else
  die "REPLACE:PROJECT_NAME missing from templates/"
fi
if grep -rq 'REPLACE:' standards/ 2>/dev/null; then
  ok "REPLACE: tokens in standards/"
else
  die "REPLACE: tokens missing from standards/"
fi

# --- 5. Markdown relative link check ---
note "Markdown relative links"
while IFS= read -r -d '' md; do
  dir="$(dirname "${md}")"
  while IFS= read -r link; do
    [[ -z "${link}" ]] && continue
    [[ "${link}" =~ ^https?:// ]] && continue
    [[ "${link}" =~ ^# ]] && continue
    target="${link%%#*}"
    target="${target%%\?*}"
    [[ -z "${target}" ]] && continue
    resolved="${dir}/${target}"
    if [[ ! -e "${resolved}" ]]; then
      die "broken link in ${md}: (${link}) -> ${resolved}"
    fi
  done < <(rg -o '\]\([^)]+\)' "${md}" 2>/dev/null | sed 's/^(//' | sed 's/)$//' | grep -v '^https\?://' | grep -v '^#' || true)
done < <(find . -name '*.md' ! -path './.git/*' ! -path './.work/*' -print0 2>/dev/null)

ok "markdown link scan complete"

if [[ "${failures}" -gt 0 ]]; then
  echo ""
  echo "framework-verify: ${failures} check(s) failed" >&2
  exit 1
fi

echo ""
echo "framework-verify: all checks passed"
