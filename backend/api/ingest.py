from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from controllers.config import DATA_DIR
from controllers.vector_store import (
    add_pdf_documents,
    delete_by_hash,
    delete_by_source,
    file_hash_exists,
    hash_bytes,
    list_sources,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestResponse(BaseModel):
    files_received: int
    files_indexed: int
    files_skipped: int
    chunks_added: int
    added_hashes: list[str]
    skipped_hashes: list[str]


class DeleteResponse(BaseModel):
    file_hash: str
    chunks_deleted: int


class DeleteBySourceResponse(BaseModel):
    source_file: str
    chunks_deleted: int


class SourceEntry(BaseModel):
    source_file: str
    file_hash: str


class ListSourcesResponse(BaseModel):
    items: list[SourceEntry]


@router.post("/", response_model=IngestResponse)
async def ingest(files: list[UploadFile] = File(...)) -> IngestResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    data_path = Path(DATA_DIR)
    data_path.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    hash_map: dict[Path, str] = {}
    skipped_hashes: list[str] = []
    pdf_files_received = 0
    for file in files:
        name = Path(file.filename or "").name
        if not name.lower().endswith(".pdf"):
            continue

        pdf_files_received += 1

        target = data_path / name
        if target.exists():
            base = target.stem
            suffix = target.suffix
            counter = 1
            while target.exists():
                target = data_path / f"{base}_{counter}{suffix}"
                counter += 1

        content = await file.read()
        if not content:
            continue

        file_hash = hash_bytes(content)
        if file_hash_exists(file_hash):
            skipped_hashes.append(file_hash)
            continue

        target.write_bytes(content)
        saved_paths.append(target)
        hash_map[target] = file_hash

    if not saved_paths and not skipped_hashes:
        raise HTTPException(status_code=400, detail="No valid PDF files uploaded")

    result = add_pdf_documents(saved_paths, hashes=hash_map)
    added_hashes = result["added_hashes"]
    skipped_hashes = skipped_hashes + result["skipped_hashes"]
    return IngestResponse(
        files_received=pdf_files_received,
        files_indexed=len(added_hashes),
        files_skipped=len(skipped_hashes),
        chunks_added=int(result["chunks_added"]),
        added_hashes=added_hashes,
        skipped_hashes=skipped_hashes,
    )


@router.delete("/{file_hash}", response_model=DeleteResponse)
def delete_ingested(file_hash: str, remove_file: bool = False) -> DeleteResponse:
    chunks_deleted = delete_by_hash(file_hash, remove_files=remove_file)
    if chunks_deleted == 0:
        raise HTTPException(status_code=404, detail="Hash not found")
    return DeleteResponse(file_hash=file_hash, chunks_deleted=chunks_deleted)


@router.delete("/source/{source_file}", response_model=DeleteBySourceResponse)
def delete_by_source_file(
    source_file: str, remove_file: bool = False
) -> DeleteBySourceResponse:
    chunks_deleted = delete_by_source(source_file, remove_files=remove_file)
    if chunks_deleted == 0:
        raise HTTPException(status_code=404, detail="Source file not found")
    return DeleteBySourceResponse(
        source_file=source_file, chunks_deleted=chunks_deleted
    )


@router.get("/files", response_model=ListSourcesResponse)
def list_ingested_sources() -> ListSourcesResponse:
    return ListSourcesResponse(items=list_sources())
