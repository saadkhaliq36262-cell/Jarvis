import sys
import subprocess
import psutil
from typing import Dict, Any, List
from .base import BaseTool

SAFE_APP_ALLOWLIST = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "paint": "mspaint.exe",
    "mspaint": "mspaint.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "taskmgr": "taskmgr.exe",
    "cmd": "cmd.exe",
    "terminal": "cmd.exe",
    "command prompt": "cmd.exe",
    "chrome": "chrome.exe",
    "edge": "msedge.exe",
    "vscode": "code.cmd"
}

class ListProcessesTool(BaseTool):
    name = "list_processes"
    description = "Lists top running processes sorted by memory or CPU usage."
    parameters_schema = {
        "type": "object",
        "properties": {
            "limit": {"type": "integer", "description": "Number of processes to return (default: 15)", "default": 15}
        }
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        limit = min(params.get("limit", 15), 50)
        processes: List[Dict[str, Any]] = []

        for proc in psutil.process_iter(["pid", "name", "memory_percent", "cpu_percent"]):
            try:
                info = proc.info
                processes.append({
                    "pid": info["pid"],
                    "name": info["name"],
                    "memory_percent": round(info["memory_percent"] or 0, 1),
                    "cpu_percent": round(info["cpu_percent"] or 0, 1)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # Sort by memory descending
        processes.sort(key=lambda p: p["memory_percent"], reverse=True)
        return {
            "total_running": len(processes),
            "top_processes": processes[:limit]
        }

class LaunchApplicationTool(BaseTool):
    name = "launch_application"
    description = "Launches an allowlisted local Windows application (e.g. notepad, calc, explorer, chrome, etc.)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "app_name": {"type": "string", "description": "Name of the application to launch (notepad, calculator, explorer, etc.)"}
        },
        "required": ["app_name"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        app_name = str(params.get("app_name", "")).lower().strip()
        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would launch application: {app_name}"}

        if app_name in SAFE_APP_ALLOWLIST:
            try:
                target_exe = SAFE_APP_ALLOWLIST[app_name]
                if sys.platform == "win32":
                    subprocess.Popen(f'start "" "{target_exe}"', shell=True)
                else:
                    subprocess.Popen([target_exe])
                return {"success": True, "message": f"Successfully launched '{app_name}' on Windows desktop."}
            except Exception as e:
                return {"success": False, "message": f"Failed to launch '{app_name}': {str(e)}"}
        
        return {
            "success": False,
            "message": f"Application '{app_name}' is not in the safe allowlist ({', '.join(SAFE_APP_ALLOWLIST.keys())})."
        }

class TerminateProcessTool(BaseTool):
    name = "terminate_process"
    description = "Terminates a running process by PID or name (requires confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "pid": {"type": "integer", "description": "Process ID to terminate"},
            "name": {"type": "string", "description": "Process name to terminate (e.g. notepad.exe)"}
        }
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        pid = params.get("pid")
        name = params.get("name")

        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would terminate process: PID={pid}, Name={name}"}

        try:
            if pid:
                p = psutil.Process(int(pid))
                p.terminate()
                return {"success": True, "message": f"Terminated process PID {pid} ({p.name()})."}
            elif name:
                count = 0
                for proc in psutil.process_iter(["pid", "name"]):
                    if proc.info["name"] and proc.info["name"].lower() == name.lower():
                        proc.terminate()
                        count += 1
                return {"success": True, "message": f"Terminated {count} instance(s) of '{name}'."}
            else:
                return {"success": False, "message": "Either 'pid' or 'name' must be specified."}
        except Exception as e:
            return {"success": False, "message": f"Error terminating process: {str(e)}"}
