"""
local-agent/tools/screenshots.py - Windows Desktop Screenshot Capture
"""

import io
import base64
from typing import Dict, Any
from PIL import ImageGrab
from .base import BaseTool

class TakeScreenshotTool(BaseTool):
    name = "take_screenshot"
    description = "Captures a high-resolution screenshot of the Windows desktop and returns it as a base64 encoded JPEG."
    parameters_schema = {
        "type": "object",
        "properties": {
            "quality": {"type": "integer", "description": "JPEG compression quality (1-100)", "default": 75}
        }
    }

    async def execute(self, params: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        if dry_run:
            return {"dry_run": True, "message": "[DRY RUN] Would capture Windows screen."}

        try:
            img = ImageGrab.grab()
            buffer = io.BytesIO()
            quality = max(10, min(params.get("quality", 75), 95))
            img.save(buffer, format="JPEG", quality=quality)
            b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

            return {
                "success": True,
                "width": img.width,
                "height": img.height,
                "format": "image/jpeg",
                "image_base64": f"data:image/jpeg;base64,{b64_str}"
            }
        except Exception as e:
            return {"success": False, "message": f"Screenshot capture error: {str(e)}"}
