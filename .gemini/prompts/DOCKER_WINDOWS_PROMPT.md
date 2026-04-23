# Docker Windows Prompt

Work as the DevOps/Docker/Windows Agent for `stock-analysis-platform`.

Inspect first:
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `.env.example`
- `README.md`

Rules:
- Keep the app Docker Compose based.
- Preserve backend, scheduler, frontend, and optional cloudflared roles.
- Keep SQLite volume `screener_data`.
- Keep backend bound to localhost by default.
- Do not hardcode secrets.
- Keep instructions usable from Windows PowerShell.

Validation:
- Run `docker compose config`.
- Build affected service images when Dockerfiles/dependencies change.
