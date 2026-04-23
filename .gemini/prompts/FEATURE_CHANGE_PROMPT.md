# Feature Change Prompt

Implement the requested feature in `stock-analysis-platform` using existing repo patterns.

Required workflow:
1. Inspect affected frontend page/component, `frontend/src/lib/api.ts`, and `frontend/src/lib/types.ts` for UI changes.
2. Inspect affected backend router/service/schema/model/migration files for API or persistence changes.
3. Confirm the current API contract before editing.
4. Make the smallest cohesive patch.
5. Keep new data fields backward-compatible where possible.
6. Add or update tests when business logic, schema behavior, or AI contracts change.

Guardrails:
- No heavy infrastructure.
- No silent mocks for live market data.
- No financial advice language.
- No unrelated refactors.

Validation:
- Backend changes: `cd backend && python -m compileall app && python -m pytest -q`.
- Frontend changes: `cd frontend && npm run build`.
- Migration changes: clean `DB_PATH` migration apply plus re-run.
