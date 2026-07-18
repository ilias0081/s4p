# s4p

s4p (Step) is a basic AI workflow automation platform.

# Information

A Docker-first full-stack scaffold for a React frontend and a Node.js/Express backend, backed by Postgres and fronted by nginx.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript + Kysely
- Database: Postgres
- Edge proxy: nginx
- Orchestration: Docker Compose

## Project Layout

```text
.
|-- backend/
|   |-- Dockerfile
|   |-- package.json
|   |-- tsconfig.json
|   `-- src/
|-- frontend/
|   |-- Dockerfile
|   |-- nginx.conf
|   |-- package.json
|   `-- src/
|-- nginx/
|   |-- Dockerfile
|   `-- nginx.conf
|-- docker-compose.yml
`-- .env.example
```

## Services

- `frontend`: Builds the React app and serves the static bundle on `localhost:4173`
- `backend`: Runs the Express API on `localhost:3001`
- `postgres`: Runs the database on `localhost:5432`
- `nginx`: Reverse proxies the frontend and backend on `localhost:8080`

The frontend uses relative `/api` calls, so the app works both on the direct frontend port and through the gateway nginx port.

## Run Modes

This repo supports two distinct workflows.

### Full Production-Style Stack

Use this when you want the full Docker-first setup that mirrors deployment behavior.

Command:

`docker compose up --build`

Open one of these URLs:

- Frontend container: `http://localhost:4173`
- Backend health: `http://localhost:3001/api/health`
- Gateway nginx: `http://localhost:8080`

<!-- ## Frontend Local Dev Mode

For fast frontend iteration, run Vite locally while keeping backend/nginx API behavior equivalent:

1. Start backend and database with Docker from repo root:

   `docker compose up --build backend postgres`

2. In `frontend/`, run `npm install` once.
3. In `frontend/`, run `npm run dev`.
4. Open `http://localhost:4173`.

Notes:

- Frontend API calls should stay relative (for example `/api/health`) so request code is identical in local dev and Docker production mode.
- `vite.config.ts` now proxies `/api/*` to `http://localhost:3001` by default.
- You can override the proxy target with `VITE_API_PROXY_TARGET` if needed. -->

## Docker Dev Override

Use the dev override when you want the frontend to run Vite inside Docker and the backend to expose a Node debugger port without changing the production compose file.

Command:

`docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build frontend backend postgres`

Then:

1. Open the frontend at `http://localhost:4173`.
2. Attach a debugger to backend port `9229` when needed.

Notes:

- The dev override intentionally keeps `nginx` out of the default dev run so it does not proxy to the production-style frontend container setup.
- Backend debug port exposure is dev-only because it lives in `docker-compose.dev.yml`, not the base compose file.
- This backend override exposes the debugger for the compiled backend process; backend TypeScript watch/reload is a separate next step.

## Environment

The root `.env` must define these variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `NGINX_PORT`

Example:

```env
COMPOSE_PROJECT_NAME=s4p
POSTGRES_DB=s4p
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432
BACKEND_PORT=3001
FRONTEND_PORT=4173
NGINX_PORT=8080
```

## Notes

- Postgres is intentionally exposed locally so desktop GUI clients can connect during development.
- The scaffold is production-oriented: containers build the app artifacts and run compiled output rather than relying on host-side dev servers.
- If you later want backend hot reload, add a separate backend development runtime rather than changing the main production-style stack.
