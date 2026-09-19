"""
local-agent/auth.py - Token-based Security Authentication
"""

import secrets
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import config

security_bearer = HTTPBearer(auto_error=False)

def verify_token_string(token_to_check: str) -> bool:
    """Constant-time token validation against configured agent secret."""
    if not token_to_check or not config.TOKEN:
        return False
    return secrets.compare_digest(token_to_check.strip(), config.TOKEN.strip())

async def authenticate_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security_bearer)
) -> bool:
    """
    Validates token via:
    1. Authorization: Bearer <token>
    2. X-Agent-Token header
    3. Query parameter ?token=<token>
    """
    # 1. Bearer Header
    if credentials and verify_token_string(credentials.credentials):
        return True

    # 2. X-Agent-Token Header
    custom_header = request.headers.get("X-Agent-Token")
    if custom_header and verify_token_string(custom_header):
        return True

    # 3. Query Parameter
    query_token = request.query_params.get("token")
    if query_token and verify_token_string(query_token):
        return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Invalid or missing local agent authentication token."
    )
