"""
local-agent/config.py - Windows Local Agent Configuration
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the local agent
AGENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = AGENT_DIR.parent

# Load .env from project root or local-agent dir
load_dotenv(PROJECT_DIR / ".env")
load_dotenv(AGENT_DIR / ".env")

class AgentConfig:
    # Network binding - strictly loopback by default for security
    HOST: str = os.getenv("LOCAL_AGENT_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("LOCAL_AGENT_PORT", "5000"))

    # Security Bearer Token for Web UI <-> Agent Auth
    TOKEN: str = os.getenv("LOCAL_AGENT_TOKEN", "jarvis_secure_local_token_2026")

    # Dry-run mode for non-destructive simulation
    DRY_RUN: bool = os.getenv("DRY_RUN", "false").lower() in ("true", "1", "yes")

    # Directory sandbox for file operations
    FILES_ROOT: Path = Path(os.getenv("SAFE_FILES_ROOT", str(PROJECT_DIR))).resolve()

    # Logging directories
    LOGS_DIR: Path = AGENT_DIR / "logs"
    AUDIT_LOG_FILE: Path = LOGS_DIR / "audit.jsonl"
    APP_LOG_FILE: Path = LOGS_DIR / "agent.log"

    # Modular feature flags
    ENABLE_ANDROID: bool = os.getenv("ENABLE_ANDROID", "false").lower() in ("true", "1", "yes")
    ENABLE_BROWSER_AUTOMATION: bool = os.getenv("ENABLE_BROWSER_AUTOMATION", "false").lower() in ("true", "1", "yes")
    ENABLE_VISION: bool = os.getenv("ENABLE_VISION", "false").lower() in ("true", "1", "yes")

    VERSION: str = "2.0.0"

config = AgentConfig()
config.LOGS_DIR.mkdir(parents=True, exist_ok=True)
