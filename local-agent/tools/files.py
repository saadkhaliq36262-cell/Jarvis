"""
local-agent/tools/files.py - Sandboxed Safe File Operations
"""

import os
from pathlib import Path
from typing import Dict, Any, List
from config import config
from .base import BaseTool

def resolve_safe_path(rel_path: str) -> Path:
    """Ensures paths cannot escape the designated sandbox directory."""
    target = (config.FILES_ROOT / rel_path).resolve()
    if not str(target).startswith(str(config.FILES_ROOT)):
        raise PermissionError(f"Access denied: Path '{rel_path}' is outside sandbox root '{config.FILES_ROOT}'")
    return target

class ListFilesTool(BaseTool):
    name = "list_files"
    description = "Lists files and directories inside the authorized sandbox directory."
    parameters_schema = {
        "type": "object",
        "properties": {
            "subpath": {"type": "string", "description": "Relative subdirectory path (default: root)", "default": "."}
        }
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        subpath = params.get("subpath", ".")
        try:
            target_dir = resolve_safe_path(subpath)
            if not target_dir.exists() or not target_dir.is_dir():
                return {"success": False, "message": f"Directory '{subpath}' does not exist."}

            entries = []
            for item in target_dir.iterdir():
                entries.append({
                    "name": item.name,
                    "is_dir": item.is_dir(),
                    "size_bytes": item.stat().st_size if item.is_file() else None
                })

            return {
                "success": True,
                "path": str(target_dir.relative_to(config.FILES_ROOT)),
                "entries": entries[:100]
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

class ReadFileTool(BaseTool):
    name = "read_file"
    description = "Reads text content from an authorized sandboxed file."
    parameters_schema = {
        "type": "object",
        "properties": {
            "file_path": {"type": "string", "description": "Relative path to file"}
        },
        "required": ["file_path"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        rel_path = params.get("file_path", "")
        try:
            target = resolve_safe_path(rel_path)
            if not target.exists() or not target.is_file():
                return {"success": False, "message": f"File '{rel_path}' does not exist."}

            # Size check (max 200 KB)
            if target.stat().st_size > 200 * 1024:
                return {"success": False, "message": "File exceeds max readable size (200 KB)."}

            content = target.read_text(encoding="utf-8", errors="replace")
            return {
                "success": True,
                "file_path": rel_path,
                "content": content
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

class WriteFileTool(BaseTool):
    name = "write_file"
    description = "Creates or overwrites a text file in the sandbox (requires confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "file_path": {"type": "string", "description": "Relative path to file"},
            "content": {"type": "string", "description": "Text content to write"}
        },
        "required": ["file_path", "content"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        rel_path = params.get("file_path", "")
        content = params.get("content", "")

        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would write {len(content)} chars to '{rel_path}'"}

        try:
            target = resolve_safe_path(rel_path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            return {"success": True, "message": f"Successfully wrote {len(content)} characters to '{rel_path}'."}
        except Exception as e:
            return {"success": False, "message": str(e)}

class DeleteFileTool(BaseTool):
    name = "delete_file"
    description = "Deletes a file in the sandbox (requires confirmation)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "file_path": {"type": "string", "description": "Relative path to file"}
        },
        "required": ["file_path"]
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        rel_path = params.get("file_path", "")
        if dry_run:
            return {"dry_run": True, "message": f"[DRY RUN] Would delete file: '{rel_path}'"}

        try:
            target = resolve_safe_path(rel_path)
            if not target.exists() or not target.is_file():
                return {"success": False, "message": f"File '{rel_path}' not found."}
            target.unlink()
            return {"success": True, "message": f"Deleted file '{rel_path}'."}
        except Exception as e:
            return {"success": False, "message": str(e)}
