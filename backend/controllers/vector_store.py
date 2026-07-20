import hashlib
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb

try:
    from config import CHROMA_DIR, COLLECTION_NAME, DATA_DIR
except ModuleNotFoundError:
    from controllers.config import CHROMA_DIR, COLLECTION_NAME, DATA_DIR

load_dotenv()


@lru_cache(maxsize=1)
def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")


@lru_cache(maxsize=1)
def get_vector_store() -> Chroma:
    chroma_host = os.getenv("CHROMA_HOST", "").strip()
    if chroma_host:
        client = chromadb.HttpClient(
            host=chroma_host,
            port=int(os.getenv("CHROMA_PORT", "8000")),
            ssl=os.getenv("CHROMA_SSL", "false").lower() == "true",
        )
        client.heartbeat()
        return Chroma(
            client=client,
            collection_name=COLLECTION_NAME,
            embedding_function=_get_embeddings(),
        )

    return Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_DIR,
        embedding_function=_get_embeddings(),
    )


def ensure_indexed() -> Chroma:
    vector_store = get_vector_store()
    try:
        existing_count = vector_store._collection.count()
    except Exception:
        existing_count = 0

    if existing_count > 0:
        return vector_store

    docs = []
    data_path = Path(DATA_DIR)
    if not data_path.exists():
        return vector_store

    for file in data_path.iterdir():
        if file.suffix.lower() == ".pdf":
            file_hash = _hash_file(file)
            loader = PyPDFLoader(str(file))
            file_docs = loader.load()
            _attach_file_metadata(file_docs, file, file_hash)
            docs.extend(file_docs)

    if not docs:
        return vector_store

    all_splits = _split_documents(docs)
    vector_store.add_documents(documents=all_splits)
    return vector_store


def _split_documents(docs) -> List:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200, add_start_index=True
    )
    return text_splitter.split_documents(docs)


def hash_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _attach_file_metadata(docs, file_path: Path, file_hash: str) -> None:
    for doc in docs:
        metadata = doc.metadata or {}
        metadata["file_hash"] = file_hash
        metadata["source_file"] = file_path.name
        doc.metadata = metadata


def _get_ids_for_hash(vector_store: Chroma, file_hash: str) -> List[str]:
    try:
        result = vector_store._collection.get(
            where={"file_hash": file_hash}, include=[]
        )
    except Exception:
        return []
    ids = result.get("ids") if isinstance(result, dict) else None
    return list(ids or [])


def _get_ids_for_source(vector_store: Chroma, source_file: str) -> List[str]:
    try:
        result = vector_store._collection.get(
            where={"source_file": source_file}, include=[]
        )
    except Exception:
        return []
    ids = result.get("ids") if isinstance(result, dict) else None
    return list(ids or [])


def file_hash_exists(file_hash: str) -> bool:
    vector_store = get_vector_store()
    return len(_get_ids_for_hash(vector_store, file_hash)) > 0


def add_pdf_documents(
    pdf_paths: Iterable[Path], hashes: Dict[Path, str] | None = None
) -> Dict[str, object]:
    vector_store = get_vector_store()
    added_hashes: List[str] = []
    skipped_hashes: List[str] = []
    chunks_added = 0

    for path in pdf_paths:
        file_hash = hashes.get(path) if hashes else None
        if not file_hash:
            file_hash = _hash_file(path)

        if _get_ids_for_hash(vector_store, file_hash):
            skipped_hashes.append(file_hash)
            continue

        loader = PyPDFLoader(str(path))
        file_docs = loader.load()
        _attach_file_metadata(file_docs, path, file_hash)
        if not file_docs:
            continue

        splits = _split_documents(file_docs)
        ids = vector_store.add_documents(documents=splits)
        chunks_added += len(ids)
        added_hashes.append(file_hash)

    return {
        "chunks_added": chunks_added,
        "added_hashes": added_hashes,
        "skipped_hashes": skipped_hashes,
    }


def delete_by_hash(file_hash: str, remove_files: bool = False) -> int:
    vector_store = get_vector_store()
    ids = _get_ids_for_hash(vector_store, file_hash)
    if not ids:
        return 0

    vector_store.delete(ids=ids)

    if remove_files:
        data_path = Path(DATA_DIR)
        if data_path.exists():
            for file in data_path.iterdir():
                if file.suffix.lower() != ".pdf":
                    continue
                if _hash_file(file) == file_hash:
                    file.unlink(missing_ok=True)

    return len(ids)


def delete_by_source(source_file: str, remove_files: bool = False) -> int:
    vector_store = get_vector_store()
    ids = _get_ids_for_source(vector_store, source_file)
    if not ids:
        return 0

    vector_store.delete(ids=ids)

    if remove_files:
        data_path = Path(DATA_DIR)
        if data_path.exists():
            for file in data_path.iterdir():
                if file.suffix.lower() != ".pdf":
                    continue
                if file.name == source_file:
                    file.unlink(missing_ok=True)

    return len(ids)


def list_sources() -> List[Dict[str, str]]:
    vector_store = get_vector_store()
    try:
        result = vector_store._collection.get(include=["metadatas"])
    except Exception:
        return []

    metadatas = result.get("metadatas") if isinstance(result, dict) else None
    if not metadatas:
        return []

    seen = set()
    items: List[Dict[str, str]] = []
    for metadata in metadatas:
        if not metadata:
            continue
        source_file = metadata.get("source_file")
        file_hash = metadata.get("file_hash")
        if not source_file or not file_hash:
            continue
        key = (source_file, file_hash)
        if key in seen:
            continue
        seen.add(key)
        items.append({"source_file": source_file, "file_hash": file_hash})

    items.sort(key=lambda item: (item["source_file"], item["file_hash"]))
    return items
