import os
from typing import Union

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from limits.errors import StorageError
from pydantic import BaseModel
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler

from api.ingest import router as ingest_router
from api.admin import router as admin_router
from api.deps import close_checkpointer, delete_all_messages, get_checkpointer
from api.query import router as query_router
from api.ratelimit import limiter
from controllers.vector_store import ensure_indexed


@asynccontextmanager
async def warm_vector_store(app: FastAPI):
    ensure_indexed()
    get_checkpointer()
    try:
        yield
    finally:
        close_checkpointer()


def _get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(lifespan=warm_vector_store)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


async def rate_limit_storage_error(request: Request, exc: StorageError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Rate-limit service is temporarily unavailable"},
    )


app.add_exception_handler(StorageError, rate_limit_storage_error)
cors_origins = _get_cors_origins()
allow_credentials = "*" not in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ingest_router, prefix="/ingest")
app.include_router(admin_router)
app.include_router(query_router, prefix="/query")


class DeleteRequest(BaseModel):
    thread_id: str


@app.post("/delete")
def delete_thread(payload: DeleteRequest):
    delete_all_messages(payload.thread_id)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


if __name__ == "__main__":
    print("yo")
