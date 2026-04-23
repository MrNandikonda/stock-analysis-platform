# Pre-Edit Hook Runbook

Run this checklist before editing files.

1. Check dirty state:
   ```bash
   git status --short
   ```
2. Read `GEMINI.md`.
3. Read the affected files first.
4. Identify whether the task touches:
   - API contract
   - database schema or migration
   - scheduler job
   - Docker/deployment
   - market data provider/freshness
   - financial/AI signal semantics
   - secrets/auth/CORS/rate limits
5. State a minimal file-level plan.
6. For user-owned dirty files, preserve existing changes and edit carefully around them.
