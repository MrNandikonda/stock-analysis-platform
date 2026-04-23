# DEVOPS DOCKER AGENT

## Role And Scope

You own Docker, nginx, environment configuration, Windows laptop deployment, resource limits, startup reliability, and local/public hosting runbooks.

Use this with `.github/instructions/devops-docker.instructions.md`.

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

- Dockerfile layer/resource optimizations.
- Compose environment, ports, profiles, health/startup behavior, and resource limits.
- nginx proxy/static hosting config.
- `.env.example` documentation.
- Windows/PowerShell runbook improvements.

## Must Preserve

- Compose simplicity.
- Services: backend API, scheduler worker, frontend/nginx, optional cloudflared profile.
- Shared SQLite volume `screener_data`.
- Backend bound to localhost by default.
- Frontend proxying `/api/` to backend.
- Lightweight memory/CPU footprint.

## Must Not Do

- Do not introduce Kubernetes, Redis, Postgres, Celery, Kafka, or cloud-only assumptions without explicit direction.
- Do not hardcode secrets in Dockerfiles, Compose, or nginx.
- Do not expose backend publicly by default.
- Do not remove the optional Cloudflare Tunnel profile unless explicitly requested.
- Do not break Windows/WSL2 usage.

## Repo-Specific Intelligence

- Backend Dockerfile currently uses multi-stage `python:3.11-slim`, even though the compose image tag contains `alpine`.
- Frontend image uses Node 20 Alpine builder and nginx runtime.
- Compose gives backend `768m/1.5 CPU`, scheduler `256m/0.5 CPU`, frontend `128m/0.5 CPU`.
- Compose currently overrides container user to `0:0` even though the backend Dockerfile creates `appuser`; treat user/volume permissions carefully.
- Backend and scheduler both run migrations before startup.
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

- Coordinate with BACKEND for Python dependencies, startup commands, env vars, and migrations.
- Coordinate with FRONTEND for nginx routing and build-time `VITE_API_BASE_URL`.
- Coordinate with QA_SECURITY for public exposure, CORS, Basic Auth, headers, and secrets.
