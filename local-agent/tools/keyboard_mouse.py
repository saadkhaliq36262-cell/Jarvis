"""
local-agent/tools/keyboard_mouse.py - Windows Keyboard & Mouse Automation
"""

import time
import ctypes
from typing import Dict, Any
from .base import BaseTool

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

class TypeTextTool(BaseTool):
    name = "type_text"
    description = "Types text into the currently focused window on Windows."
    parameters_schema = {
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Text string to type"},
            "interval": {"type": "number", "description": "Delay between keystrokes in seconds", "default": 0.02}
        },
        "required": ["text"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        text = params.get("text", "")
        interval = params.get("interval", 0.02)

        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would type {len(text)} characters."}

        if PYAUTOGUI_AVAILABLE:
            pyautogui.write(text, interval=interval)
            return {"success": True, "message": f"Typed {len(text)} characters into active window."}
        
        return {"success": False, "message": "pyautogui library not installed on local agent."}

class PressKeyTool(BaseTool):
    name = "press_key"
    description = "Presses a key or key combination (e.g. enter, tab, ctrl+s, win+d)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "key": {"type": "string", "description": "Key name or hotkey combo (e.g. 'enter', 'tab', 'ctrl+s')"}
        },
        "required": ["key"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        key = params.get("key", "").lower().strip()
        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would press key/hotkey: '{key}'"}

        if not PYAUTOGUI_AVAILABLE:
            return {"success": False, "message": "pyautogui is required for hotkey automation."}

        try:
            if "+" in key:
                keys = [k.strip() for k in key.split("+")]
                pyautogui.hotkey(*keys)
            else:
                pyautogui.press(key)
            return {"success": True, "message": f"Pressed key '{key}'."}
        except Exception as e:
            return {"success": False, "message": f"Key press error: {str(e)}"}

class MouseClickTool(BaseTool):
    name = "mouse_click"
    description = "Moves mouse and clicks at specified screen coordinates."
    parameters_schema = {
        "type": "object",
        "properties": {
            "x": {"type": "integer", "description": "X coordinate"},
            "y": {"type": "integer", "description": "Y coordinate"},
            "button": {"type": "string", "enum": ["left", "right", "double"], "default": "left"}
        },
        "required": ["x", "y"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        x = params.get("x")
        y = params.get("y")
        button = params.get("button", "left")

        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would click at ({x}, {y}) with {button} button."}

        if not PYAUTOGUI_AVAILABLE:
            return {"success": False, "message": "pyautogui is required for mouse automation."}

        try:
            if button == "double":
                pyautogui.doubleClick(x, y)
            else:
                pyautogui.click(x, y, button=button)
            return {"success": True, "message": f"Clicked at ({x}, {y}) with {button} button."}
        except Exception as e:
            return {"success": False, "message": f"Mouse click error: {str(e)}"}
