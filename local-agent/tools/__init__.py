"""
local-agent/tools/__init__.py - Master Tool Registry
"""

from typing import Dict, List, Any
from .base import BaseTool
from .windows import (
    GetSystemTelemetryTool,
    AdjustVolumeTool,
    LockWorkstationTool,
    ShutdownSystemTool,
    RestartSystemTool,
    SleepSystemTool
)
from .processes import ListProcessesTool, LaunchApplicationTool, TerminateProcessTool
from .files import ListFilesTool, ReadFileTool, WriteFileTool, DeleteFileTool
from .screenshots import TakeScreenshotTool
from .keyboard_mouse import TypeTextTool, PressKeyTool, MouseClickTool
from .android import GetAndroidDevicesTool, LaunchAndroidAppTool

# Register all tools
ALL_TOOLS: List[BaseTool] = [
    # Windows & Hardware
    GetSystemTelemetryTool(),
    AdjustVolumeTool(),
    LockWorkstationTool(),
    ShutdownSystemTool(),
    RestartSystemTool(),
    SleepSystemTool(),
    # Processes & Applications
    ListProcessesTool(),
    LaunchApplicationTool(),
    TerminateProcessTool(),
    # Files
    ListFilesTool(),
    ReadFileTool(),
    WriteFileTool(),
    DeleteFileTool(),
    # Screen & Input
    TakeScreenshotTool(),
    TypeTextTool(),
    PressKeyTool(),
    MouseClickTool(),
    # Android (Modular)
    GetAndroidDevicesTool(),
    LaunchAndroidAppTool()
]

TOOL_REGISTRY: Dict[str, BaseTool] = {tool.name: tool for tool in ALL_TOOLS}

def get_tool(name: str) -> BaseTool:
    return TOOL_REGISTRY.get(name)

def get_all_tool_schemas() -> List[Dict[str, Any]]:
    return [tool.to_schema() for tool in ALL_TOOLS]
