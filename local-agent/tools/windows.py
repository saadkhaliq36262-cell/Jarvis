"""
local-agent/tools/windows.py - Windows OS Management & Hardware Telemetry
"""

import sys
import ctypes
import platform
import subprocess
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

class ShutdownSystemTool(BaseTool):
    name = "shutdown_system"
    description = "Initiates a Windows system shutdown (requires user confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "delay_seconds": {"type": "integer", "description": "Delay before shutdown in seconds", "default": 10}
        }
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        delay = params.get("delay_seconds", 10)
        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would execute Windows shutdown (delay: {delay}s)."}

        if sys.platform == "win32":
            try:
                subprocess.Popen(["shutdown", "/s", "/t", str(delay), "/c", "Shutdown initiated by JARVIS AI Assistant"])
                return {
                    "success": True,
                    "message": f"System shutdown initiated with {delay} seconds delay. (Run 'shutdown /a' to abort if needed)."
                }
            except Exception as e:
                return {"success": False, "message": f"Shutdown execution failed: {str(e)}"}
        return {"success": False, "message": "Shutdown command is supported on Windows."}

class RestartSystemTool(BaseTool):
    name = "restart_system"
    description = "Initiates a Windows system restart (requires user confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "delay_seconds": {"type": "integer", "description": "Delay before restart in seconds", "default": 10}
        }
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        delay = params.get("delay_seconds", 10)
        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would execute Windows restart (delay: {delay}s)."}

        if sys.platform == "win32":
            try:
                subprocess.Popen(["shutdown", "/r", "/t", str(delay), "/c", "Restart initiated by JARVIS AI Assistant"])
                return {
                    "success": True,
                    "message": f"System restart initiated with {delay} seconds delay. (Run 'shutdown /a' to abort if needed)."
                }
            except Exception as e:
                return {"success": False, "message": f"Restart execution failed: {str(e)}"}
        return {"success": False, "message": "Restart command is supported on Windows."}

class SleepSystemTool(BaseTool):
    name = "sleep_system"
    description = "Puts the Windows system into sleep/standby mode (requires user confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {}
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        if dry_run:
            return {"dry_run": True, "message": "[DRY RUN] Would put Windows PC to sleep."}

        if sys.platform == "win32":
            try:
                # Rundll32 power state suspend
                subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
                return {"success": True, "message": "System put to sleep successfully."}
            except Exception as e:
                return {"success": False, "message": f"Sleep execution failed: {str(e)}"}
        return {"success": False, "message": "Sleep command is supported on Windows."}
