/**
 * api/chat.js - Vercel Serverless API Route with Hybrid Intent Engine
 * 
 * Features:
 * 1. Fast-path intent recognition for deterministic actions (YouTube, Google Search, Lock PC, Apps).
 * 2. Deep reasoning via Google Gemini API for general queries, explanations, and creative requests.
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, an advanced, highly intelligent, and courteous personal AI assistant.
Your communication style:
- Calm, professional, articulate, and poised.
- Concise and direct without being blunt; avoid unnecessary filler or overly long paragraphs.
- Slightly futuristic and respectful (using phrases like 'Certainly, sir', 'Right away', 'At your service' when appropriate).

You MUST respond in valid JSON format matching this schema:
{
  "reply": "Your spoken conversational response (polite and concise)",
  "speak": true,
  "intent": "OPEN_URL" | "WEB_SEARCH" | "SYSTEM_LOCK" | "SYSTEM_APP" | "SYSTEM_VOLUME" | "CONVERSATION",
  "action": {
    "type": "OPEN_URL" | "WEB_SEARCH" | "SYSTEM_LOCK" | "SYSTEM_APP" | "SYSTEM_VOLUME" | null,
    "target": "URL or app name or query or null",
    "label": "Short label for action button"
  }
}
`;

const DEFAULT_MODEL = "gemini-3.6-flash";

// Fast deterministic intent matcher
function matchLocalIntent(message) {
  const clean = (message || "").toLowerCase()
    .replace(/^(hey\s+|hi\s+|ok\s+)?jarvis[,\s:]*/i, "")
    .trim()
    .replace(/[.?!]+$/, "");

  // 1. YouTube
  if (/\b(open|launch|start|go to)\s+youtube\b/i.test(clean) || clean === "youtube") {
    return {
      reply: "Opening YouTube for you now, sir.",
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: "https://www.youtube.com", label: "Open YouTube" }
    };
  }

  // 2. Google / Common Websites
  if (/\b(open|launch|go to)\s+(google|github|linkedin|twitter|reddit|wikipedia)\b/i.test(clean)) {
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

  // 3. Web Search
  const searchMatch = clean.match(/^(?:search(?:\s+the\s+web|\s+google)?\s+for\s+|google\s+)(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return {
      reply: `Searching the web for "${query}", sir.`,
      speak: true,
      intent: "WEB_SEARCH",
      action: { type: "WEB_SEARCH", target: `https://www.google.com/search?q=${encodeURIComponent(query)}`, label: `Search: ${query}` }
    };
  }

  // 4. Lock Laptop / PC
  if (/\b(lock\s+my\s+(?:laptop|pc|computer|workstation)|lock\s+(?:screen|windows|system))\b/i.test(clean)) {
    return {
      reply: "Locking your workstation now, sir.",
      speak: true,
      intent: "SYSTEM_LOCK",
      action: { type: "SYSTEM_LOCK", target: "lock", label: "Lock Workstation" }
    };
  }

  // 5. App Launch
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

  // 6. Volume Control
  if (/\b(?:mute(?:\s+volume|\s+audio)?|volume\s+mute)\b/i.test(clean)) {
    return {
      reply: "Muting system audio, sir.",
      speak: true,
      intent: "SYSTEM_VOLUME",
      action: { type: "SYSTEM_VOLUME", target: "mute", label: "Mute Volume" }
    };
  }
  if (/\bvolume\s+up\b/i.test(clean)) {
    return {
      reply: "Increasing system volume, sir.",
      speak: true,
      intent: "SYSTEM_VOLUME",
      action: { type: "SYSTEM_VOLUME", target: "up", label: "Volume Up" }
    };
  }
  if (/\bvolume\s+down\b/i.test(clean)) {
    return {
      reply: "Decreasing system volume, sir.",
      speak: true,
      intent: "SYSTEM_VOLUME",
      action: { type: "SYSTEM_VOLUME", target: "down", label: "Volume Down" }
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

  // 1. Fast deterministic action matching
  const localMatch = matchLocalIntent(message);
  if (localMatch) {
    return res.status(200).json({
      ...localMatch,
      status: "ok",
      grounding_sources: []
    });
  }

  // 2. Gemini AI query for general/complex reasoning
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
        temperature: 0.5,
        responseMimeType: "application/json"
      }
    });

    const rawReply = response.text || "";
    const parsedData = parseGeminiJson(rawReply);

    if (parsedData && parsedData.reply) {
      return res.status(200).json({
        reply: parsedData.reply,
        speak: parsedData.speak !== false,
        intent: parsedData.intent || "CONVERSATION",
        action: parsedData.action || null,
        status: "ok",
        grounding_sources: []
      });
    }

    return res.status(200).json({
      reply: rawReply || "I have processed your request, sir.",
      speak: true,
      intent: "CONVERSATION",
      action: null,
      status: "ok",
      grounding_sources: []
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
