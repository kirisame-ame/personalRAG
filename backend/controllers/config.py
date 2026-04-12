from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = str(BASE_DIR / "data")
CHROMA_DIR = str(BASE_DIR / "chroma_langchain_db")
COLLECTION_NAME = "main_collection"
