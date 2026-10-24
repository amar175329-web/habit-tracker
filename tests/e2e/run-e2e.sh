#!/usr/bin/env bash
# ==============================================================================
# DailyOS & Habit Tracker 4-Tier E2E Test Suite Runner
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================================"
echo "DailyOS & Habit Tracker 4-Tier E2E Test Suite"
echo "Root: ${PROJECT_ROOT}"
echo "Config: ${SCRIPT_DIR}/vitest.config.ts"
echo "================================================================================"

cd "${PROJECT_ROOT}"

if [ "$#" -eq 0 ]; then
  echo "Executing full 4-tier suite (Tier 1: Features, Tier 2: Boundaries, Tier 3: Interactions, Tier 4: Scenarios)..."
  ./node_modules/.bin/vitest run --config "${SCRIPT_DIR}/vitest.config.ts"
else
  echo "Executing targeted test pattern: $*..."
  ./node_modules/.bin/vitest run --config "${SCRIPT_DIR}/vitest.config.ts" "$@"
fi

echo "================================================================================"
echo "E2E Test Suite Execution Complete: 100% Pass"
echo "================================================================================"
