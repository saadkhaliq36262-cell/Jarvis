"""
local-agent/tools/base.py - Base Tool Interface & Definition
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
from permissions import PermissionLevel, TOOL_PERMISSIONS

class BaseTool(ABC):
    name: str = "base_tool"
    description: str = "Base tool description"
    parameters_schema: Dict[str, Any] = {}
    timeout_seconds: float = 10.0

    @property
    def permission(self) -> PermissionLevel:
        return TOOL_PERMISSIONS.get(self.name, PermissionLevel.HIGH_RISK)

    @abstractmethod
    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        """Executes the tool with the provided parameters."""
        pass

    def to_schema(self) -> Dict[str, Any]:
        """Returns the JSON schema descriptor for AI tool-calling."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters_schema,
            "permission": self.permission.value,
            "timeout_seconds": self.timeout_seconds
        }
