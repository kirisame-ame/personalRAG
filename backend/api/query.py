from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from api.deps import get_agent
from api.ratelimit import QUERY_RATE_LIMIT, limiter

router = APIRouter(tags=["query"])


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
@limiter.limit(QUERY_RATE_LIMIT)
def run_query(request: Request, payload: QueryRequest) -> QueryResponse:
    agent = get_agent()
    result = agent.invoke({"messages": [{"role": "user", "content": payload.query}]})
    return QueryResponse(answer=_extract_answer(result))
