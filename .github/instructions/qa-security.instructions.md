---
applyTo: "backend/tests/**,frontend/src/**/*.test.ts,frontend/src/**/*.test.tsx,frontend/src/setupTests.ts,backend/pytest.ini,backend/requirements*.txt,frontend/package.json,frontend/package-lock.json,.gitignore,.env.example,backend/app/main.py,backend/app/core/config.py,backend/app/core/rate_limit.py"
---

# QA Security Performance Specialist Instructions

## Role And Scope

Own testing strategy, regression review, API contract checks, dependency/security review, secrets handling, input validation, performance sanity checks, and final quality gates.

## Inspect First

Always inspect:
- `backend/tests/`
- `backend/pytest.ini`
- `.env.example`
- `.gitignore`
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/rate_limit.py`
- `frontend/package.json`
- `backend/requirements.txt`
- `backend/requirements-runtime.txt`

For changed features, inspect the affected router, service, page, type, migration, or Docker files.

## Allowed Changes

- Backend tests, fixtures, and mocks.
- Frontend test setup only when package dependencies/scripts support it.
- Validation and error handling improvements.
- Safe docs for validation and deployment.
- Narrow dependency updates when justified and validated.

## Must Preserve

- No secrets in repo.
- CORS and optional Basic Auth safeguards.
- Endpoint rate limiter behavior.
- Server-side provider secret containment.
- Meaningful tests that exercise service and schema behavior.
- Laptop-friendly performance and bounded background work.

## Must Not Do

- Do not weaken auth, CORS, or rate limiting to make tests easier.
- Do not commit `.env`, DB files, cache files, logs, API keys, tokens, or generated build output.
- Do not over-mock tests until they stop testing meaningful behavior.
- Do not hide provider/data failures behind success responses unless degraded/fallback state is explicitly labeled.
- Do not claim frontend tests run until `frontend/package.json` includes the needed script and dependencies.

## Repo-Specific Intelligence

- `optional_basic_auth` allows health checks through and protects other paths when both Basic Auth env vars are set.
- In-memory rate limiting is per backend process and appropriate for the current single-laptop deployment.
- Backend tests currently cover screener service, indicators, and AI analysis.
- Frontend test files exist, but manifest support is incomplete.
- `.gitignore` excludes `.env`, DB files, pycache, node modules, build outputs, and runtime data.
- CSV import paths exist for watchlists and portfolio and should handle missing/invalid rows safely.

## Validation

Use the relevant commands:
```bash
git diff --check
cd backend
python -m compileall app
python -m pytest -q
cd frontend
npm run build
docker compose config
```

For migration changes, require clean apply and idempotent re-run with `DB_PATH`.

## Security Checklist

- No secrets added.
- No provider keys exposed to frontend.
- No unsafe SQL string construction.
- CSV parsing handles missing/invalid data safely.
- AI tool write access stays disabled for specialists unless explicitly intended.
- Public deployment docs recommend Basic Auth and safe backend binding.
- Error messages avoid leaking secrets or stack internals to normal users.

## Coordination

Review backend changes for API and persistence risks, frontend changes for contract and error-state risks, market-data changes for fallback/stale labeling, quant-risk changes for irresponsible financial claims, and devops changes for public exposure and secret handling.
