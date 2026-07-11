# s4p

s4p is a basic AI workflow automation platform.

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

## Local Setup

This repo is intended to be run through Docker from WSL so local Node/npm installs are not required.

1. Create a root `.env` file by copying `.env.example` in the repo root.
2. Fill in all required values in the root `.env`. Docker Compose now treats these variables as required and will error if they are missing.
3. From your WSL shell in the repo root, run `docker compose up --build`
4. Open one of these URLs:
	- Frontend only: `http://localhost:4173`
	- Backend health: `http://localhost:3001/api/health`
	- Gateway nginx: `http://localhost:8080`

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
- If you later want a hot-reload workflow, add a separate development compose override rather than changing the main production-style stack.
