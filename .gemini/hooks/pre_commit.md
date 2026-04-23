# Pre-Commit Hook Runbook

Run this checklist before finalizing changes.

1. Inspect the diff:
   ```bash
   git diff --check
   git diff --stat
   ```
2. Run relevant validation from `GEMINI.md`.
3. Confirm no secrets were added:
   ```bash
   git diff -- . ':!frontend/package-lock.json' | rg -i "api_key|secret|password|token|OPENAI_API_KEY" || true
   ```
4. Confirm docs are accurate and do not claim unimplemented features.
5. Confirm financial language is research-oriented and data freshness is not overstated.
6. Note any checks not run and why.
