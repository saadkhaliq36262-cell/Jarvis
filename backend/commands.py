"""
commands.py - Safe Predefined Command Dispatcher for JARVIS

This module strictly restricts local system actions to a safe allowlist.
Arbitrary shell or system execution is strictly prohibited.
"""

import datetime
import webbrowser
import re
from typing import Optional, Dict, Any


def get_current_time() -> str:
    """Returns the formatted current local time."""
    now = datetime.datetime.now()
    time_str = now.strftime("%I:%M %p").lstrip("0")
    return f"The current time is {time_str}."


def get_current_date() -> str:
    """Returns the formatted current local date."""
    now = datetime.datetime.now()
    date_str = now.strftime("%A, %B %d, %Y")
    return f"Today is {date_str}."


def open_youtube() -> str:
    """Safely opens YouTube in the default browser."""
    webbrowser.open("https://www.youtube.com", new=2)
    return "Opening YouTube for you now, sir."


# Mapping of intent patterns to safe handler functions
SAFE_INTENTS = [
    {
        "intent": "open_youtube",
        "patterns": [
            r"\b(open|launch|start|go to)\s+youtube\b",
            r"\byoutube\s+(please|now)\b",
            r"^youtube$",
        ],
        "handler": open_youtube,
    },
    {
        "intent": "get_time",
        "patterns": [
            r"\b(what\s+time\s+is\s+it|what['']?s\s+the\s+time|current\s+time|tell\s+me\s+the\s+time|time\s+now)\b",
        ],
        "handler": get_current_time,
    },
    {
        "intent": "get_date",
        "patterns": [
            r"\b(what\s+is\s+today['']?s\s+date|what['']?s\s+the\s+date|today['']?s\s+date|current\s+date|what\s+day\s+is\s+it)\b",
        ],
        "handler": get_current_date,
    },
]


def handle_safe_command(user_message: str) -> Optional[Dict[str, Any]]:
    """
    Checks if user_message matches a predefined safe local command.
    Returns a dict with reply, action, and speak flag if handled, else None.
    """
    clean_text = user_message.lower().strip()
    # Strip leading/trailing punctuation and common wake-word prefix
    clean_text = re.sub(r"^(hey\s+|hi\s+|ok\s+)?jarvis[,\s:]*", "", clean_text).strip()
    clean_text = clean_text.rstrip(".?!")

    for entry in SAFE_INTENTS:
        for pattern in entry["patterns"]:
            if re.search(pattern, clean_text, re.IGNORECASE):
                reply_text = entry["handler"]()
                return {
                    "handled": True,
                    "reply": reply_text,
                    "action": entry["intent"],
                    "speak": True,
                }

    return None
