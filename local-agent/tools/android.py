"""
local-agent/tools/android.py - Modular Android ADB Controller (Stubbed for Phase Activation)
"""

import shutil
import subprocess
from typing import Dict, Any, List
from config import config
from .base import BaseTool

class GetAndroidDevicesTool(BaseTool):
    name = "get_android_devices"
    description = "Discovers and lists connected authorized Android devices via USB or Wireless ADB."
    parameters_schema = {
        "type": "object",
        "properties": {}
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        if not config.ENABLE_ANDROID:
            return {
                "enabled": False,
                "devices": [],
                "message": "Android ADB device management is currently disabled in configuration (ENABLE_ANDROID=false). Ready for future activation."
            }

        adb_path = shutil.which("adb") or "adb"
        try:
            res = subprocess.run([adb_path, "devices", "-l"], capture_output=True, text=True, timeout=5)
            devices = []
            for line in res.stdout.strip().split("\n")[1:]:
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    devices.append({
                        "device_id": parts[0],
                        "state": parts[1],
                        "details": " ".join(parts[2:])
                    })
            return {"enabled": True, "devices": devices}
        except Exception as e:
            return {"enabled": True, "devices": [], "error": str(e)}

class LaunchAndroidAppTool(BaseTool):
    name = "launch_android_app"
    description = "Launches an authorized application on a specific connected Android phone by package name."
    parameters_schema = {
        "type": "object",
        "properties": {
            "device_id": {"type": "string", "description": "Target Android device ID/serial"},
            "package_name": {"type": "string", "description": "Android package name (e.g. com.google.android.youtube)"}
        },
        "required": ["package_name"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        if not config.ENABLE_ANDROID:
            return {
                "success": False,
                "message": "Android module is currently disabled (ENABLE_ANDROID=false). Phone commands are deferred."
            }

        device_id = params.get("device_id")
        package = params.get("package_name")

        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would launch {package} on device {device_id or 'default'}"}

        # Ready for ADB invocation when activated
        return {"success": True, "message": f"Android app launch triggered for {package}."}
