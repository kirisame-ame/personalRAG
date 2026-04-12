from langchain_chroma import Chroma

try:
    from vector_store import ensure_indexed
except ModuleNotFoundError:
    from controllers.vector_store import ensure_indexed


def load_chunk_persist_pdf() -> Chroma:
    return ensure_indexed()
