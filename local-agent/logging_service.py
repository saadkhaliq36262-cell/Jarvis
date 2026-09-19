"""
local-agent/logging_service.py - Sanitized Audit Logging Service
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List
from config import config

# Standard python logger for agent diagnostics
logging.basicConfig(
    filename=str(config.APP_LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("JarvisAgent")

# Keys to redact from audit logs
SENSITIVE_KEYS = {"token", "password", "key", "secret", "auth", "gemini_api_key", "authorization"}

def sanitize_params(obj: Any) -> Any:
    """Recursively redacts sensitive keys from logged objects."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_params(v)
        return sanitized
    elif isinstance(obj, list):
        return [sanitize_params(item) for item in obj]
    return obj

class AuditLogger:
    def __init__(self, log_file=config.AUDIT_LOG_FILE):
        self.log_file = log_file

    def log_execution(
        self,
        tool: str,
        params: Dict[str, Any],
        permission: str,
        dry_run: bool,
        success: bool,
        duration_ms: float,
        result_summary: str,
        caller: str = "web_ui"
    ) -> Dict[str, Any]:
        """Records a single tool execution to the audit log."""
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "caller": caller,
            "tool": tool,
            "params": sanitize_params(params),
            "permission": permission,
            "dry_run": dry_run,
            "success": success,
            "duration_ms": round(duration_ms, 2),
            "result_summary": result_summary
        }

        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

        logger.info(f"Audit: {tool} | Success: {success} | DryRun: {dry_run} | {duration_ms:.1f}ms")
        return record

    def get_recent_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Reads recent audit logs for the dashboard."""
        if not self.log_file.exists():
            return []
        
        records = []
        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line in reversed(lines[-limit:]):
                    line = line.strip()
                    if line:
                        records.append(json.loads(line))
        except Exception as e:
            logger.error(f"Error reading audit logs: {e}")
        return records

audit_logger = AuditLogger()
