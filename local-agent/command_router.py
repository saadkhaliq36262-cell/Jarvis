"""
local-agent/command_router.py - Secure Tool Execution Router & Permission Enforcer
"""

import time
import asyncio
from typing import Dict, Any
from config import config
from permissions import permission_manager, PermissionLevel
from logging_service import audit_logger, logger
from tools import get_tool, get_all_tool_schemas

class CommandRouter:
    @staticmethod
    async def execute_tool(
        tool_name: str,
        params: Dict[str, Any] = None,
        confirmed: bool = False,
        caller: str = "web_client"
    ) -> Dict[str, Any]:
        params = params or {}
        start_time = time.perf_counter()

        # 1. Tool Existence Check
        tool = get_tool(tool_name)
        if not tool:
            duration_ms = (time.perf_counter() - start_time) * 1000
            audit_logger.log_execution(
                tool=tool_name,
                params=params,
                permission=PermissionLevel.BLOCKED.value,
                dry_run=config.DRY_RUN,
                success=False,
                duration_ms=duration_ms,
                result_summary=f"Unknown tool '{tool_name}'",
                caller=caller
            )
            return {
                "success": False,
                "status": "not_found",
                "error": f"Tool '{tool_name}' is not registered."
            }

        # 2. Permission Evaluation
        perm_level, reason = permission_manager.evaluate(tool_name, params)

        if perm_level == PermissionLevel.BLOCKED:
            duration_ms = (time.perf_counter() - start_time) * 1000
            audit_logger.log_execution(
                tool=tool_name,
                params=params,
                permission=perm_level.value,
                dry_run=config.DRY_RUN,
                success=False,
                duration_ms=duration_ms,
                result_summary="Blocked by security policy",
                caller=caller
            )
            return {
                "success": False,
                "status": "blocked",
                "permission": perm_level.value,
                "error": reason
            }

        # 3. Confirmation Guard
        if perm_level == PermissionLevel.CONFIRMATION_REQUIRED and not confirmed:
            return {
                "success": False,
                "status": "confirmation_required",
                "tool": tool_name,
                "params": params,
                "permission": perm_level.value,
                "message": reason
            }

        # 4. Tool Execution with Timeout
        try:
            result = await asyncio.wait_for(
                tool.execute(params, dry_run=config.DRY_RUN),
                timeout=tool.timeout_seconds
            )
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            # Record audit log
            audit_logger.log_execution(
                tool=tool_name,
                params=params,
                permission=perm_level.value,
                dry_run=config.DRY_RUN,
                success=result.get("success", True),
                duration_ms=duration_ms,
                result_summary=str(result.get("message", "Executed")),
                caller=caller
            )

            return {
                "success": True,
                "status": "executed",
                "tool": tool_name,
                "permission": perm_level.value,
                "dry_run": config.DRY_RUN,
                "duration_ms": round(duration_ms, 2),
                "data": result
            }

        except asyncio.TimeoutError:
            duration_ms = (time.perf_counter() - start_time) * 1000
            audit_logger.log_execution(
                tool=tool_name,
                params=params,
                permission=perm_level.value,
                dry_run=config.DRY_RUN,
                success=False,
                duration_ms=duration_ms,
                result_summary=f"Timeout after {tool.timeout_seconds}s",
                caller=caller
            )
            return {
                "success": False,
                "status": "timeout",
                "error": f"Tool '{tool_name}' execution timed out after {tool.timeout_seconds}s."
            }
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.exception(f"Error executing tool {tool_name}")
            audit_logger.log_execution(
                tool=tool_name,
                params=params,
                permission=perm_level.value,
                dry_run=config.DRY_RUN,
                success=False,
                duration_ms=duration_ms,
                result_summary=str(e),
                caller=caller
            )
            return {
                "success": False,
                "status": "error",
                "error": str(e)
            }

command_router = CommandRouter()
