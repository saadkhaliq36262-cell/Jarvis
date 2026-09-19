"""
local-agent/tools/windows.py - Windows OS Management & Hardware Telemetry
"""

import sys
import ctypes
import platform
import psutil
from typing import Dict, Any
from .base import BaseTool

class GetSystemTelemetryTool(BaseTool):
    name = "get_system_telemetry"
    description = "Retrieves real-time CPU, RAM, Disk, and Battery hardware telemetry metrics from the Windows PC."
    parameters_schema = {
        "type": "object",
        "properties": {}
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        # Memory metrics
        mem = psutil.virtual_memory()
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count(logical=True)
        # Disk metrics
        disk = psutil.disk_usage("C:\\")
        
        # Battery metrics (if laptop)
        battery_info = None
        try:
            battery = psutil.sensors_battery()
            if battery:
                battery_info = {
                    "percent": battery.percent,
                    "power_plugged": battery.power_plugged,
                    "seconds_left": battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED else None
                }
        except Exception:
            battery_info = None

        return {
            "os": f"{platform.system()} {platform.release()} ({platform.architecture()[0]})",
            "hostname": platform.node(),
            "cpu": {
                "percent": cpu_percent,
                "cores": cpu_count
            },
            "ram": {
                "total_gb": round(mem.total / (1024**3), 2),
                "used_gb": round(mem.used / (1024**3), 2),
                "available_gb": round(mem.available / (1024**3), 2),
                "percent": mem.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent": disk.percent
            },
            "battery": battery_info,
            "status": "online"
        }

class AdjustVolumeTool(BaseTool):
    name = "adjust_volume"
    description = "Adjusts the master audio volume on Windows (mute, up, down)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["mute", "up", "down"], "description": "Volume action to perform"}
        },
        "required": ["action"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        action = params.get("action", "mute").lower()
        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would execute volume action: {action}"}

        if sys.platform == "win32":
            VK_VOLUME_MUTE = 0xAD
            VK_VOLUME_DOWN = 0xAE
            VK_VOLUME_UP = 0xAF
            KEYEVENTF_EXTENDEDKEY = 0x0001
            KEYEVENTF_KEYUP = 0x0002

            vk_code = VK_VOLUME_MUTE
            if action == "up":
                vk_code = VK_VOLUME_UP
            elif action == "down":
                vk_code = VK_VOLUME_DOWN

            ctypes.windll.user32.keybd_event(vk_code, 0, KEYEVENTF_EXTENDEDKEY, 0)
            ctypes.windll.user32.keybd_event(vk_code, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0)
            return {"success": True, "message": f"Volume '{action}' executed successfully."}
        
        return {"success": False, "message": "Volume control is currently supported on Windows."}

class LockWorkstationTool(BaseTool):
    name = "lock_workstation"
    description = "Locks the Windows workstation screen (requires confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {}
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        if dry_run:
            return {"dry_run": True, "message": "[DRY RUN] Would lock Windows workstation."}

        if sys.platform == "win32":
            ctypes.windll.user32.LockWorkStation()
            return {"success": True, "message": "Workstation locked successfully."}
        return {"success": False, "message": "Lock is supported on Windows."}
