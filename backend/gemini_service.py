"""
gemini_service.py - Google Gemini AI Service for JARVIS

Integrates with the official Google GenAI Python SDK (google-genai).
Handles JARVIS persona, conversational responses, and Google Search grounding.
"""

import os
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Check for Google GenAI SDK availability
try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False


JARVIS_SYSTEM_INSTRUCTION = """You are JARVIS, an advanced, highly intelligent, and courteous personal AI assistant.
Your communication style:
- Calm, professional, articulate, and poised.
- Concise and direct without being blunt; avoid unnecessary filler or overly long paragraphs.
- Slightly futuristic and respectful (using occasional polite phrases like 'Certainly', 'Right away, sir', 'At your service' when appropriate, but keeping it modern and refined).
- When asked about technical concepts (e.g. JavaScript), explain clearly and concisely in a beginner-friendly yet technically sound way.
- When asked to introduce yourself, deliver a polished, succinct JARVIS-style introduction.
"""

# Default recommended model
DEFAULT_MODEL = "gemini-2.5-flash"


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initializes the official Google GenAI Client if API key is present."""
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not GENAI_SDK_AVAILABLE:
            self.client = None
            return

        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                self.client = None
        else:
            self.client = None

    def is_configured(self) -> bool:
        """Returns True if a valid API key appears to be configured."""
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        return bool(self.api_key and self.api_key != "your_gemini_api_key_here")

    def _is_search_query(self, message: str) -> bool:
        """Determines if the query explicitly requests web searching or live news."""
        keywords = ["search the web", "search web", "latest news", "search for", "live news", "recent news", "current news", "google search"]
        msg_lower = message.lower()
        return any(k in msg_lower for k in keywords)

    def generate_response(self, user_message: str) -> Dict[str, Any]:
        """
        Sends a message to the Gemini API and returns structured response dictionary.
        """
        # 1. Check SDK Installation
        if not GENAI_SDK_AVAILABLE:
            return {
                "reply": "The Google GenAI Python SDK is not installed. Please run 'pip install -r backend/requirements.txt'.",
                "speak": True,
                "status": "error",
                "grounding_sources": []
            }

        # 2. Check API Key configuration
        if not self.is_configured():
            return {
                "reply": "JARVIS is unable to connect to the AI service. Please create a .env file with your GEMINI_API_KEY to activate my cognitive subsystems.",
                "speak": True,
                "status": "error",
                "grounding_sources": []
            }

        # Ensure client is instantiated
        if self.client is None:
            self._initialize_client()

        if self.client is None:
            return {
                "reply": "Failed to initialize Gemini AI client. Please verify your GEMINI_API_KEY in the .env file.",
                "speak": True,
                "status": "error",
                "grounding_sources": []
            }

        is_search = self._is_search_query(user_message)
        sources: List[Dict[str, str]] = []

        try:
            if is_search:
                # Attempt generation with Google Search grounding tool
                config = types.GenerateContentConfig(
                    system_instruction=JARVIS_SYSTEM_INSTRUCTION,
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.7,
                )
                try:
                    response = self.client.models.generate_content(
                        model=DEFAULT_MODEL,
                        contents=user_message,
                        config=config,
                    )
                    reply_text = response.text or "I searched the web, but found no direct details."

                    # Extract grounding metadata citations if returned
                    if response.candidates and len(response.candidates) > 0:
                        candidate = response.candidates[0]
                        grounding_metadata = getattr(candidate, "grounding_metadata", None)
                        if grounding_metadata:
                            # Extract web search chunks
                            chunks = getattr(grounding_metadata, "grounding_chunks", None) or []
                            for chunk in chunks:
                                web = getattr(chunk, "web", None)
                                if web and hasattr(web, "uri") and hasattr(web, "title"):
                                    sources.append({
                                        "title": web.title or "Web Source",
                                        "uri": web.uri
                                    })

                    return {
                        "reply": reply_text,
                        "speak": True,
                        "status": "ok",
                        "is_search": True,
                        "grounding_sources": sources
                    }

                except Exception as search_err:
                    # Fallback to standard generation if search tool is restricted on the tier
                    config_fallback = types.GenerateContentConfig(
                        system_instruction=JARVIS_SYSTEM_INSTRUCTION,
                        temperature=0.7,
                    )
                    fallback_response = self.client.models.generate_content(
                        model=DEFAULT_MODEL,
                        contents=f"User search request: '{user_message}'. (Note: Live web search grounding was temporarily unavailable on this tier. Provide the best available knowledge up to your cutoff and clearly note that live search is currently unavailable.)",
                        config=config_fallback,
                    )
                    return {
                        "reply": fallback_response.text,
                        "speak": True,
                        "status": "ok",
                        "is_search": True,
                        "grounding_sources": [],
                        "search_fallback": True
                    }

            else:
                # Standard Conversational Query
                config = types.GenerateContentConfig(
                    system_instruction=JARVIS_SYSTEM_INSTRUCTION,
                    temperature=0.7,
                )
                response = self.client.models.generate_content(
                    model=DEFAULT_MODEL,
                    contents=user_message,
                    config=config,
                )
                return {
                    "reply": response.text or "I have processed your request, sir.",
                    "speak": True,
                    "status": "ok",
                    "grounding_sources": []
                }

        except Exception as e:
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "400" in err_msg and "key" in err_msg.lower():
                user_friendly_reply = "Your Gemini API key appears to be invalid. Please check the GEMINI_API_KEY value in your .env file."
            elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                user_friendly_reply = "The Gemini API rate limit has been reached. Please wait a moment before sending another request."
            else:
                user_friendly_reply = f"JARVIS encountered a communication error with the AI core: {err_msg[:120]}"

            return {
                "reply": user_friendly_reply,
                "speak": True,
                "status": "error",
                "grounding_sources": []
            }


# Singleton service instance
gemini_service = GeminiService()
