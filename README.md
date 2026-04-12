# personalRAG

## Overview

A starter personal RAG (retrieval-augmented generation) project with a small FastAPI backend and a React frontend.

## Tech stack

- Backend: Python 3.13, FastAPI, ChromaDB
- Frontend: React, TypeScript, Vite
- Containerization: Docker (separate Dockerfiles for backend and frontend)

## Structure

- backend/: FastAPI app and vector store setup
- frontend/: React app built with Vite

## Docker dev

Hot reload for both services using a compose override.

```sh
docker compose --profile dev -f compose.yml -f compose.dev.yml up -d --build
```

Stop with:

```sh
docker compose --profile dev -f compose.yml -f compose.dev.yml down
```

### Makefile shortcuts

```sh
make dev
make dev-build
make dev-down
```

## Environment variables

Backend (FastAPI):

- Copy backend/.env.example to backend/.env and set keys locally
- In Docker, pass `OPENROUTER_API_KEY` and `GOOGLE_API_KEY` as runtime env vars

Frontend (Vite):

- Copy frontend/.env.example to frontend/.env.local for local dev
- For production Docker builds, pass `VITE_API_BASE_URL` as a build arg

Example:

```sh
docker build -f frontend/Dockerfile \
	--build-arg VITE_API_BASE_URL=https://api.your-domain.com \
	-t personalrag-frontend ./frontend
```

## Docker prod

```sh
docker compose -f compose.yml up -d --build
```

## Frontend API configuration

The frontend reads the API base URL from Vite env files:

- frontend/.env.development: uses /api (Vite proxy)
- frontend/.env.production: replace with your API domain
