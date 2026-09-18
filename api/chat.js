/**
 * api/chat.js - Vercel Serverless API Route for JARVIS AI Assistant
 * 
 * Strict User Consent & Explicit Action Architecture:
 * 1. DIRECT DATA RETRIEVAL: Queries for live data (BTC price, weather, market news) 
 *    are answered directly in the chat with structured data points (NO unprompted redirects).
 * 2. EXPLICIT ACTION TRIGGER: Browser navigation (YouTube search, external links, PC lock) 
 *    executes ONLY upon explicit user command with full external URLs.
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, an advanced, highly intelligent AI Assistant operating under STRICT user-consent rules.

COMMAND EXECUTION & PERMISSION RULES (STRICT):
1. USER CONSENT MANDATE: Do NOT auto-trigger external links, redirect pages, or open third-party platforms (e.g., YouTube, Google, Trading Sites) autonomously unless explicitly instructed by the user in the prompt.
2. EXPLICIT TRIGGER ONLY: Perform browser actions, search redirections, or app launches ONLY when the user explicitly commands it (e.g., "Jarvis YouTube open karo", "Open YouTube and search AI", "Search the web for X", "Open tradingview", "Lock my laptop").
3. DIRECT DATA RETRIEVAL (API/SEARCH): When the user asks for specific live data (e.g., "Search the web and tell me current BTC USD", "What is the price of Bitcoin?"), fetch and display the detailed results inside the chat response. Always include key data points (e.g. Live Price, 24-hour Trend, Market Summary). DO NOT generate internal broken app routes or invalid relative Vercel URLs. Set action to null unless explicitly commanded to open a link.
4. EXTERNAL AUTOMATION (DIRECT LAUNCH/NAVIGATION): When the user explicitly commands action-based navigation (e.g., "YouTube open karo aur AI automation ki video lagao", "Open TradingView"), formulate a valid direct external URL (e.g., https://www.youtube.com/results?search_query=ai+automation, https://www.tradingview.com) and return it in the action object. NEVER use relative local paths.
5. MULTILINGUAL RECOGNITION: Understand commands in English, Roman Urdu / Urdu (e.g., "YouTube open karo", "BTC price batao", "Google pe search karo").

You MUST respond in valid JSON format matching this schema:
{
  "reply": "Clear, direct, structured summary including key data points and polite speech.",
  "speak": true,
  "intent": "OPEN_URL" | "WEB_SEARCH" | "SYSTEM_LOCK" | "SYSTEM_APP" | "SYSTEM_VOLUME" | "DIRECT_DATA" | "CONVERSATION",
  "action": {
    "type": "OPEN_URL" | "WEB_SEARCH" | "SYSTEM_LOCK" | "SYSTEM_APP" | "SYSTEM_VOLUME" | null,
    "target": "Full external URL (https://...) or app name or null",
    "label": "Short button label"
  }
}
`;

const DEFAULT_MODEL = "gemini-3.6-flash";

// Fast deterministic matcher for explicit commands (English & Roman Urdu)
function matchExplicitCommands(message) {
  const clean = (message || "").toLowerCase()
    .replace(/^(hey\s+|hi\s+|ok\s+)?jarvis[,\s:]*/i, "")
    .trim()
    .replace(/[.?!]+$/, "");

  // 1. Explicit YouTube Search / Open (e.g. "YouTube open karo aur AI automation ki video lagao", "Open YouTube and search AI")
  const ytSearchMatch = clean.match(/(?:(?:open|launch)\s+youtube\s+(?:and\s+search|for)\s+|youtube\s+open\s+karo\s+(?:aur\s+)?(?:search\s+karo\s+|video\s+lagao\s+)?)(.+)/i);
  if (ytSearchMatch) {
    const query = ytSearchMatch[1].replace(/ki\s+video\s+lagao|video\s+lagao/i, "").trim();
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return {
      reply: `Opening YouTube and searching for "${query}", sir.`,
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: targetUrl, label: `YouTube: ${query}` }
    };
  }

  // Explicit YouTube Homepage Open
  if (/\b(?:open|launch|start|go to)\s+youtube\b/i.test(clean) || /\byoutube\s+open\s+karo\b/i.test(clean) || clean === "youtube") {
    return {
      reply: "Opening YouTube for you now, sir.",
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: "https://www.youtube.com", label: "Open YouTube" }
    };
  }

  // 2. Explicit TradingView / Trading Charts
  if (/\b(?:open|launch|go to)\s+(?:tradingview|trading\s+chart|crypto\s+chart)\b/i.test(clean) || /\btradingview\s+open\s+karo\b/i.test(clean)) {
    return {
      reply: "Opening TradingView charts for you now, sir.",
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: "https://www.tradingview.com", label: "Open TradingView" }
    };
  }

  // 3. Explicit Web Search Navigation (e.g. "Search Google for X", "Google pe search karo X")
  const explicitSearchMatch = clean.match(/^(?:search(?:\s+the\s+web|\s+google)?\s+for\s+|google\s+pe\s+search\s+karo\s+|google\s+search\s+)(.+)$/i);
  if (explicitSearchMatch) {
    const query = explicitSearchMatch[1].trim();
    return {
      reply: `Searching the web for "${query}", sir.`,
      speak: true,
      intent: "WEB_SEARCH",
      action: { type: "WEB_SEARCH", target: `https://www.google.com/search?q=${encodeURIComponent(query)}`, label: `Search: ${query}` }
    };
  }

  // 4. Common External Platforms
  if (/\b(?:open|launch|go to)\s+(google|github|linkedin|twitter|reddit|wikipedia)\b/i.test(clean)) {
    const match = clean.match(/\b(google|github|linkedin|twitter|reddit|wikipedia)\b/i);
    const domain = match ? match[1].toLowerCase() : "google";
    const urls = {
      google: "https://www.google.com",
      github: "https://www.github.com",
      linkedin: "https://www.linkedin.com",
      twitter: "https://www.x.com",
      reddit: "https://www.reddit.com",
      wikipedia: "https://www.wikipedia.org"
    };
    return {
      reply: `Opening ${domain.charAt(0).toUpperCase() + domain.slice(1)} for you, sir.`,
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: urls[domain] || "https://www.google.com", label: `Open ${domain}` }
    };
  }

  // 5. Workstation Lock
  if (/\b(?:lock\s+my\s+(?:laptop|pc|computer|workstation)|lock\s+(?:screen|windows|system)|laptop\s+lock\s+karo|pc\s+lock\s+karo)\b/i.test(clean)) {
    return {
      reply: "Locking your workstation now, sir.",
      speak: true,
      intent: "SYSTEM_LOCK",
      action: { type: "SYSTEM_LOCK", target: "lock", label: "Lock Workstation" }
    };
  }

  // 6. Safe App Launch
  const appMatch = clean.match(/\b(?:open|launch|start)\s+(notepad|calculator|calc|task manager|explorer|cmd|terminal)\b/i);
  if (appMatch) {
    const app = appMatch[1].toLowerCase();
    return {
      reply: `Launching ${app} for you now, sir.`,
      speak: true,
      intent: "SYSTEM_APP",
      action: { type: "SYSTEM_APP", target: app, label: `Launch ${app}` }
    };
  }

  // 7. Volume Control
  if (/\b(?:mute(?:\s+volume|\s+audio)?|volume\s+mute|volume\s+band\s+karo)\b/i.test(clean)) {
    return {
      reply: "Muting system audio, sir.",
      speak: true,
      intent: "SYSTEM_VOLUME",
      action: { type: "SYSTEM_VOLUME", target: "mute", label: "Mute Volume" }
    };
  }

  return null;
}

function parseGeminiJson(rawText) {
  if (!rawText) return null;
  let clean = rawText.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Method Not Allowed. Please send a POST request.",
      status: "error"
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const message = body?.message?.trim();
  if (!message) {
    return res.status(400).json({
      reply: "I did not receive any input, sir.",
      speak: false,
      status: "error"
    });
  }

  // 1. Fast deterministic action check for explicit user commands
  const explicitMatch = matchExplicitCommands(message);
  if (explicitMatch) {
    return res.status(200).json({
      ...explicitMatch,
      status: "ok",
      grounding_sources: []
    });
  }

  // 2. Query Google Gemini AI for direct data retrieval and reasoning
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return res.status(200).json({
      reply: "JARVIS is unable to connect to the AI service. Please set your GEMINI_API_KEY in your environment settings.",
      speak: true,
      status: "error",
      grounding_sources: []
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: message,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    const rawReply = response.text || "";
    const parsedData = parseGeminiJson(rawReply);

    // Extract grounding citations if returned
    const sources = [];
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || "Web Source",
            uri: chunk.web.uri
          });
        }
      }
    }

    if (parsedData && parsedData.reply) {
      return res.status(200).json({
        reply: parsedData.reply,
        speak: parsedData.speak !== false,
        intent: parsedData.intent || "CONVERSATION",
        action: parsedData.action || null,
        status: "ok",
        grounding_sources: sources
      });
    }

    return res.status(200).json({
      reply: rawReply || "I have processed your request, sir.",
      speak: true,
      intent: "CONVERSATION",
      action: null,
      status: "ok",
      grounding_sources: sources
    });

  } catch (error) {
    console.error("Gemini API error:", error);
    const errText = error?.message || String(error);
    let userMessage = "JARVIS encountered a communication error with the AI core.";

    if (errText.includes("API_KEY_INVALID") || errText.includes("400") || errText.includes("UNAUTHENTICATED")) {
      userMessage = "Your Gemini API key appears to be invalid or unauthenticated. Please verify GEMINI_API_KEY.";
    } else if (errText.includes("429") || errText.includes("RESOURCE_EXHAUSTED")) {
      userMessage = "The Gemini API rate limit has been reached. Please wait a moment before trying again.";
    }

    return res.status(200).json({
      reply: userMessage,
      speak: true,
      status: "error",
      grounding_sources: []
    });
  }
}
