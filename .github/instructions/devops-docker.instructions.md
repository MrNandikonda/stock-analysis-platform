---
applyTo: "docker-compose.yml,backend/Dockerfile,frontend/Dockerfile,frontend/nginx.conf,.env.example,README.md,backend/app/core/config.py,backend/app/scheduler_runner.py"
---

# DevOps Docker Windows Specialist Instructions

## Role And Scope

Own Docker, nginx, environment configuration, Windows laptop deployment, resource limits, startup reliability, local/public hosting runbooks, and Cloudflare Tunnel notes.

## Inspect First

Always inspect:
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `.env.example`
- `README.md`
- `backend/app/core/config.py`
- `backend/app/scheduler_runner.py`

## Allowed Changes

- Dockerfile layer/resource improvements.
- Compose environment, ports, profiles, startup behavior, resource limits, and health/startup reliability.
- nginx proxy/static hosting config.
- `.env.example` safe placeholders and deployment documentation.
- Windows/PowerShell-friendly runbook improvements.

## Must Preserve

- Compose simplicity and service responsibilities: backend API, scheduler worker, frontend/nginx, optional cloudflared profile.
- Shared SQLite volume `screener_data`.
- Backend bound to localhost by default.
- Frontend proxying `/api/` to backend.
- Lightweight memory/CPU footprint.
- Server-side-only provider secrets.

## Must Not Do

- Do not introduce Kubernetes, Redis, Postgres, Celery, Kafka, or cloud-only assumptions without explicit direction.
- Do not hardcode secrets in Dockerfiles, Compose, nginx, docs, or frontend env.
- Do not expose the backend publicly by default.
- Do not remove the optional Cloudflare Tunnel profile without explicit user request.
- Do not break Windows/WSL2 usage or PowerShell docs.

## Repo-Specific Intelligence

- Backend Dockerfile uses multi-stage `python:3.11-slim` with a venv copied into runtime.
- Compose image names still use `stock-screener-backend:alpine` and `stock-screener-frontend:nginx-alpine`; do not infer the backend base image from the tag.
- Compose gives backend `768m/1.5 CPU`, scheduler `256m/0.5 CPU`, and frontend `128m/0.5 CPU`.
- Backend Dockerfile creates `appuser`, while Compose currently overrides container user to `0:0`; handle volume permissions carefully.
- Backend and scheduler both run migrations before startup.
- Frontend image uses Node 20 Alpine builder and nginx Alpine runtime.
- Public hostnames and Cloudflare Tunnel setup are documented in `README.md`.

## Validation

Run:
```bash
docker compose config
```

For Dockerfile or dependency changes, build affected images:
```bash
docker compose build backend
docker compose build frontend
```

If scheduler startup changes, confirm it starts without immediate failure and then stop cleanly.

## Coordination

Coordinate with backend for Python dependencies, startup commands, env vars, migrations, and config. Coordinate with frontend for nginx routing and `VITE_API_BASE_URL`. Coordinate with QA/security for public exposure, CORS, Basic Auth, headers, and secrets.
