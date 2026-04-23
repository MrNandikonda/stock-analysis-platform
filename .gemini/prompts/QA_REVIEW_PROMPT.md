# QA Review Prompt

Review the current changes for correctness, safety, and regression risk.

Checklist:
- `git status --short`
- `git diff --check`
- API contracts aligned across backend schemas, services, `frontend/src/lib/api.ts`, and `frontend/src/lib/types.ts`
- Migrations additive and ORM-aligned
- Scheduler jobs bounded and idempotent
- Market data fallback/stale behavior honest
- No secrets in repo
- Financial language remains research-oriented
- Relevant backend tests/builds/frontend builds run or explicitly documented

Final response format:
1. Findings by severity, with file references.
2. Validation run and results.
3. Residual risks or not-run checks.
