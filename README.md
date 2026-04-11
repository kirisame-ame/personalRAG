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
docker compose -f compose.yml -f compose.dev.yml up --build
```

Stop with:

```sh
docker compose -f compose.yml -f compose.dev.yml down
```
