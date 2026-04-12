from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from api.deps import get_agent

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str


def _extract_answer(result: Any) -> str:
    if isinstance(result, dict):
        messages = result.get("messages")
        if messages:
            last = messages[-1]
            if isinstance(last, dict):
                return str(last.get("content", ""))
            return str(getattr(last, "content", last))
        output = result.get("output")
        if output is not None:
            return str(output)
    return str(result)


@router.post("", response_model=QueryResponse)
def run_query(payload: QueryRequest) -> QueryResponse:
    agent = get_agent()
    result = agent.invoke({"messages": [{"role": "user", "content": payload.query}]})
    return QueryResponse(answer=_extract_answer(result))
