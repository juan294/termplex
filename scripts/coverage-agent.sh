#!/usr/bin/env bash
# Coverage Agent — nightly test + coverage run for termplex.
# Invoked by com.termplex.coverage-agent.plist at 04:45 local time.
# Writes docs/agents/coverage-report.md and exits 0 on GREEN, 1 on RED.
set -euo pipefail

PROJECT_DIR="/Users/juan/code/termplex"
REPORT="$PROJECT_DIR/docs/agents/coverage-report.md"
LOG="$PROJECT_DIR/logs/coverage-agent.log"
DATE=$(date '+%Y-%m-%d')
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

mkdir -p "$(dirname "$LOG")" "$(dirname "$REPORT")"

log() { printf '%s [%s] %s\n' "$TIMESTAMP" "$1" "$2" | tee -a "$LOG"; }

log INFO "=== Coverage Agent starting ($DATE) ==="

cd "$PROJECT_DIR"

# Run tests with coverage, capture output
set +e
output=$(npm run test:coverage --silent 2>&1)
exit_code=$?
set -e

# Parse results
total_tests=$(echo "$output" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1 || echo "0")
failed_tests=$(echo "$output" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | tail -1 || echo "0")
# Parse "All files | % Stmts | % Branch | % Funcs | % Lines" row
all_files_row=$(echo "$output" | grep 'All files' | head -1 || echo "")
stmts=$(echo "$all_files_row" | awk -F'|' '{gsub(/ /,"",$2); print $2}' || echo "0")
branch=$(echo "$all_files_row" | awk -F'|' '{gsub(/ /,"",$3); print $3}' || echo "0")

if [[ $exit_code -eq 0 && "$failed_tests" == "0" ]]; then
  status="GREEN"
  log INFO "Tests passed: $total_tests | Coverage: ${stmts}% stmts / ${branch}% branch"
else
  status="RED"
  log ERROR "Tests FAILED (exit $exit_code): $failed_tests failed / $total_tests passed"
fi

# Write report
cat > "$REPORT" << REPORT
# Coverage Report — $DATE

## Status: $status

| Metric | Value |
|---|---|
| Tests passed | $total_tests |
| Tests failed | $failed_tests |
| Statement coverage | ${stmts}% |
| Branch coverage | ${branch}% |
| Run timestamp | $TIMESTAMP |

## Raw output

\`\`\`
$(echo "$output" | tail -30)
\`\`\`
REPORT

log INFO "Report written to $REPORT"
log INFO "=== Coverage Agent done ($status) ==="

[[ "$status" == "GREEN" ]]
