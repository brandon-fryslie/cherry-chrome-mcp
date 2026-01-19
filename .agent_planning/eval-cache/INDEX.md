# Eval Cache Index

This directory contains reusable evaluation findings that persist across work-evaluator runs.

## Cache Files

### Runtime Behavior Findings
- **runtime-console-log-freshness.md** - Console log freshness tracking behavior
  - Navigation tracking, HMR detection, message tagging
  - Freshness delta logic and edge cases
  - Type safety and performance characteristics
  - Last updated: 2026-01-18

- **runtime-error-handling.md** - Error handling system behavior
  - Three-level error differentiation (connection, debugger, execution state)
  - Validation order and Single Enforcer pattern compliance
  - Tool error handling patterns (DOM vs debugger, legacy vs consolidated)
  - Edge cases and type safety characteristics
  - Last updated: 2026-01-18

- **runtime-smart-suggestions.md** - Smart element suggestions for zero results
  - Trigger condition (only on zero matches)
  - Search term extraction and fuzzy matching strategy
  - Output format and error handling
  - Edge cases and performance characteristics
  - Last updated: 2026-01-18

## Usage

Work-evaluator checks this cache before deep evaluation. Cache entries save time by documenting:
- Verified runtime behavior patterns
- Break-it test results for specific components
- Data flow verification outcomes
- Edge case behavior

Cache entries are updated when new runtime knowledge is discovered.
