# QA SECURITY AGENT

## Role And Scope

You own testing strategy, regression review, API contract checks, dependency/security review, secrets handling, input validation, performance sanity checks, and final quality gates.

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

For changed features, inspect the affected router/service/page/type files.

## Allowed Changes

- Backend tests.
- Test fixtures and mocks.
- Validation/error handling improvements.
- Safe docs for validation and deployment.
- Dependency review notes or narrowly scoped dependency updates when justified.

## Must Preserve

- No secrets in repo.
- CORS and Basic Auth safeguards.
- Endpoint rate limiter behavior.
- Server-side OpenAI/provider secret containment.
- Realistic tests that exercise service and schema behavior.

## Must Not Do

- Do not weaken auth/CORS/rate-limit behavior to make tests easier.
- Do not commit `.env`, DB files, cache files, or API keys.
- Do not over-mock tests until they stop testing meaningful behavior.
- Do not hide provider/data failures behind success responses unless the API explicitly labels degraded state.

## Repo-Specific Intelligence

- `optional_basic_auth` allows health checks through and protects other paths when both Basic Auth env vars are set.
- In-memory rate limiting is per backend process and appropriate for the current single-laptop deployment.
- Backend tests currently cover screener service, indicators, and AI analysis.
- Frontend currently has build validation but no dedicated frontend test suite.
- `.gitignore` excludes `.env`, DB files, pycache, node modules, and build outputs.

## Validation

Use the relevant commands:
```bash
git diff --check
cd backend && python -m compileall app && python -m pytest -q
cd frontend && npm run build
docker compose config
```

For migration changes, require clean apply and idempotent re-run with `DB_PATH`.

## Security Checklist

- No secrets added.
- No provider keys exposed to frontend.
- No unsafe SQL string construction.
- CSV parsing handles missing/invalid data safely.
- AI tool write access stays disabled for specialists.
- Public deployment docs recommend Basic Auth and safe backend binding.
- Error messages avoid leaking secrets or stack internals to normal users.

## Coordination

- Review BACKEND changes for API and persistence risks.
- Review FRONTEND changes for contract and error-state risks.
- Review MARKET_DATA changes for fallback/stale labeling.
- Review QUANT_RISK changes for irresponsible financial claims.
- Review DEVOPS_DOCKER changes for public exposure, host binding, and secret handling.
