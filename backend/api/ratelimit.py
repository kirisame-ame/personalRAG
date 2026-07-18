import ipaddress
import os

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _trusted_proxies() -> tuple[ipaddress._BaseNetwork, ...]:
    raw = os.getenv("TRUSTED_PROXY_IPS", "").strip()
    return tuple(
        ipaddress.ip_network(value.strip(), strict=False)
        for value in raw.split(",")
        if value.strip()
    )


def client_ip(request: Request) -> str:
    peer = get_remote_address(request)
    try:
        peer_address = ipaddress.ip_address(peer)
        print("peer:", request.client.host)
        print("forwarded:", request.headers.get("x-forwarded-for"))
    except ValueError:
        return peer

    if any(peer_address in network for network in _trusted_proxies()):
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
    return peer


limiter = Limiter(
    key_func=client_ip,
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "redis://localhost:6379/0"),
    in_memory_fallback_enabled=False,
)
QUERY_RATE_LIMIT = os.getenv("QUERY_RATE_LIMIT", "5/minute")
