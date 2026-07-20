from collections.abc import Iterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.deps import get_agent
from api.ratelimit import QUERY_RATE_LIMIT, limiter

router = APIRouter(tags=["query"])
STREAM_ERROR_PREFIX = "__RAG_STREAM_ERROR__:"
STREAM_DONE_MARKER = "__RAG_STREAM_DONE__"


class QueryRequest(BaseModel):
    query: str
    thread_id: str


def _text_from_chunk(chunk) -> str:
    content = getattr(chunk, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return ""


def _message_content(message) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return str(content)


def stream_answer(query: str, thread_id) -> Iterator[str]:
    try:
        agent = get_agent()
        config = {"configurable": {"thread_id": thread_id}}
        stream = agent.stream(
            {"messages": [{"role": "user", "content": query}]},
            config=config,
            stream_mode="messages",
            version="v2",
        )
        for event in stream:
            if event["type"] != "messages":
                continue
            token, metadata = event["data"]
            if metadata.get("langgraph_node") != "model":
                continue
            text = _text_from_chunk(token)
            if text:
                yield text
        yield STREAM_DONE_MARKER
    except Exception as error:
        print(f"RAG streaming error: {error}")
        yield f"{STREAM_ERROR_PREFIX}The model is currently busy. Please try again in a moment."


@router.post("")
@limiter.limit(QUERY_RATE_LIMIT)
def run_query(request: Request, payload: QueryRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_answer(payload.query, thread_id=payload.thread_id),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/history/{thread_id}")
def get_history(thread_id: str):
    state = get_agent().get_state({"configurable": {"thread_id": thread_id}})
    return {
        "messages": [
            {
                "role": "user" if message.type == "human" else "assistant",
                "content": _message_content(message),
            }
            for message in state.values.get("messages", [])
            if message.type in {"human", "ai"}
        ]
    }
