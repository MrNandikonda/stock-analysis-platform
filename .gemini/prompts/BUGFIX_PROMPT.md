# Bugfix Prompt

Investigate and fix the reported bug in `stock-analysis-platform`.

Steps:
1. Reproduce or reason from the exact failing path.
2. Inspect the smallest relevant file set first.
3. Identify root cause and affected contracts.
4. Patch the cause, not only the symptom.
5. Add or update a regression test when practical.
6. Validate the affected area.

Pay attention to:
- Async session commit/rollback behavior.
- API payload/type drift between backend and frontend.
- SQLite migration/model mismatches.
- Market provider failures and stale data behavior.
- Scheduler idempotency and overlap.
- AI analysis write boundaries and schema validation.

Final response should lead with the fix and validation results.
