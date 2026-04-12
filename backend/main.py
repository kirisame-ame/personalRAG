from typing import Union

from fastapi import FastAPI
from contextlib import asynccontextmanager

from api.ingest import router as ingest_router
from api.query import router as query_router
from controllers.vector_store import ensure_indexed


@asynccontextmanager
async def warm_vector_store(app: FastAPI):
    ensure_indexed()
    yield


app = FastAPI(lifespan=warm_vector_store)
app.include_router(ingest_router)
app.include_router(query_router)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


if __name__ == "__main__":
    print("yo")
