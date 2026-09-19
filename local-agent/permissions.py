"""
local-agent/permissions.py - Permission Classification & Policy Guardrails
"""

from enum import Enum
from typing import Dict, Any, Tuple

class PermissionLevel(str, Enum):
    SAFE = "SAFE"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    HIGH_RISK = "HIGH_RISK"
    BLOCKED = "BLOCKED"

# Tool-to-Permission Mapping
TOOL_PERMISSIONS: Dict[str, PermissionLevel] = {
    # System & Telemetry (Safe)
    "get_system_telemetry": PermissionLevel.SAFE,
    "get_system_info": PermissionLevel.SAFE,
    "adjust_volume": PermissionLevel.SAFE,
    "take_screenshot": PermissionLevel.SAFE,
    "lock_workstation": PermissionLevel.SAFE,
    "open_browser_url": PermissionLevel.SAFE,
    
    # Process & Apps (Safe to Launch, Confirmation to Kill)
    "list_processes": PermissionLevel.SAFE,
    "launch_application": PermissionLevel.SAFE,
    "terminate_process": PermissionLevel.CONFIRMATION_REQUIRED,
    
    # OS Power Actions (Confirmation required)
    "shutdown_system": PermissionLevel.CONFIRMATION_REQUIRED,
    "sleep_system": PermissionLevel.CONFIRMATION_REQUIRED,
    "restart_system": PermissionLevel.CONFIRMATION_REQUIRED,
    
    # File Operations
    "list_files": PermissionLevel.SAFE,
    "read_file": PermissionLevel.SAFE,
    "write_file": PermissionLevel.CONFIRMATION_REQUIRED,
    "delete_file": PermissionLevel.CONFIRMATION_REQUIRED,

    # Keyboard / Mouse automation
    "type_text": PermissionLevel.SAFE,
    "press_key": PermissionLevel.SAFE,
    "mouse_click": PermissionLevel.SAFE,

    # Android Stubs (Modular, Safe read / Confirmed write)
    "get_android_devices": PermissionLevel.SAFE,
    "launch_android_app": PermissionLevel.SAFE,
    "android_tap": PermissionLevel.SAFE,
    "android_reboot": PermissionLevel.CONFIRMATION_REQUIRED,

    # Blocked / Prohibited Actions
    "execute_arbitrary_shell": PermissionLevel.BLOCKED,
    "dump_credentials": PermissionLevel.BLOCKED,
    "bypass_authentication": PermissionLevel.BLOCKED,
}

class PermissionManager:
    @staticmethod
    def evaluate(tool_name: str, params: Dict[str, Any] = None) -> Tuple[PermissionLevel, str]:
        """
        Evaluates the requested tool and parameters against security policy.
        Returns (PermissionLevel, Reason/Description).
        """
        level = TOOL_PERMISSIONS.get(tool_name, PermissionLevel.HIGH_RISK)

        if level == PermissionLevel.BLOCKED:
            return level, f"Tool '{tool_name}' is permanently blocked under security policy."

        if level == PermissionLevel.SAFE:
            return level, f"Tool '{tool_name}' is pre-authorized for safe execution."

        if level == PermissionLevel.CONFIRMATION_REQUIRED:
            return level, f"Tool '{tool_name}' requires explicit user confirmation before execution."

        return level, f"Tool '{tool_name}' is classified as HIGH_RISK and requires elevated verification."

permission_manager = PermissionManager()
