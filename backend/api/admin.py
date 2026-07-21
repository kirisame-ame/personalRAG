import hashlib
import hmac
import os
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])
ADMIN_COOKIE = "personal_rag_admin"


class LoginRequest(BaseModel):
    username: str
    password: str


def _signature(value: str) -> str:
    secret = os.environ.get("ADMIN_SESSION_SECRET", "")
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def _make_session() -> str:
    expires = str(int(time.time()) + 60 * 60 * 12)
    return f"{expires}.{_signature(expires)}"


def require_admin(request: Request) -> None:
    token = request.cookies.get(ADMIN_COOKIE, "")
    try:
        expires, signature = token.split(".", 1)
        valid = (
            int(expires) > int(time.time())
            and hmac.compare_digest(signature, _signature(expires))
        )
    except (ValueError, TypeError):
        valid = False

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
        )


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    username = os.environ.get("ADMIN_USERNAME", "")
    password = os.environ.get("ADMIN_PASSWORD", "")
    secret = os.environ.get("ADMIN_SESSION_SECRET", "")
    if not username or not password or not secret:
        raise HTTPException(status_code=503, detail="Admin authentication is not configured")

    if not (
        hmac.compare_digest(payload.username, username)
        and hmac.compare_digest(payload.password, password)
    ):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    response.set_cookie(
        ADMIN_COOKIE,
        _make_session(),
        httponly=True,
        secure=os.environ.get("ADMIN_COOKIE_SECURE", "true").lower() == "true",
        samesite="lax",
        max_age=60 * 60 * 12,
    )
    return {"authenticated": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(ADMIN_COOKIE)
    return {"authenticated": False}


@router.get("/session")
def session(_: None = Depends(require_admin)):
    return {"authenticated": True}
