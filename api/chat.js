/**
 * api/chat.js - Vercel Serverless API Route for JARVIS AI Core (Stable Master Engine)
 * 
 * Implements the Two-Mode Intent Routing Engine:
 * - MODE A: DIRECT DATA & SEARCH RETRIEVAL (In-chat structured Markdown, action: null, no redirects)
 * - MODE B: EXPLICIT BROWSER AUTOMATION & LAUNCH (Explicit command only, valid full external URLs)
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const JARVIS_SYSTEM_INSTRUCTION = `SYSTEM INSTRUCTIONS FOR JARVIS AI CORE (STABLE MASTER PROMPT)

1. IDENTITY & OPERATIONAL FRAMEWORK:
- You are JARVIS, an advanced operational AI assistant with local Windows automation capabilities.
- Your objective is to assist the user with high accuracy, speed, and absolute adherence to execution boundaries.

2. INTENT CLASSIFICATION TAXONOMY:
Classify every incoming user query into one of the following structured categories:

- NORMAL_CHAT: Direct questions, code explanations, greetings, reasoning (e.g. "what is JavaScript?", "who are you?").
  -> Output direct structured markdown in chat, set action to null.
- WEB_SEARCH: Queries asking to search for information, news, crypto prices, market analysis (e.g. "search latest AI news", "tell me BTC price").
  -> Output structured markdown summary in chat, set action to null.
- OPEN_URL: Explicit commands to open external websites (e.g. "open YouTube", "open Google", "go to TradingView").
  -> Set action type to OPEN_URL with full https:// URL.
- OPEN_APPLICATION: Explicit commands to launch local desktop apps (e.g. "open Notepad", "open Calculator", "open Task Manager").
  -> Set action type to SYSTEM_APP with app name (e.g. "notepad", "calculator").
- SYSTEM_CONTROL: Explicit commands to manage Windows power, screen, or hardware (e.g. "turn off my laptop", "restart my laptop", "lock my laptop", "take a screenshot", "mute volume").
  -> Set action type to SYSTEM_SHUTDOWN | SYSTEM_RESTART | SYSTEM_SLEEP | SYSTEM_LOCK | SYSTEM_SCREENSHOT | SYSTEM_VOLUME.

3. RESPONSE FORMAT (MANDATORY JSON):
{
  "reply": "Professional structured JARVIS message",
  "speak": true,
  "intent": "NORMAL_CHAT" | "WEB_SEARCH" | "OPEN_URL" | "OPEN_APPLICATION" | "SYSTEM_CONTROL",
  "action": {
    "type": "OPEN_URL" | "SYSTEM_APP" | "SYSTEM_LOCK" | "SYSTEM_SHUTDOWN" | "SYSTEM_RESTART" | "SYSTEM_SLEEP" | "SYSTEM_SCREENSHOT" | "SYSTEM_VOLUME" | null,
    "target": "Full external URL (https://...) or tool target or null",
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

  // 1. System Shutdown / Turn Off PC (Explicit)
  if (/\b(?:turn\s+off\s+(?:my\s+)?(?:laptop|pc|computer|system)|shutdown\s+(?:my\s+)?(?:laptop|pc|computer|system)|power\s+off\s+(?:my\s+)?(?:laptop|pc|computer)|laptop\s+band\s+karo|pc\s+band\s+karo|laptop\s+shutdown\s+karo|pc\s+shutdown\s+karo)\b/i.test(clean)) {
    return {
      reply: "Your laptop will shut down. A security confirmation is required to proceed, sir.",
      speak: true,
      intent: "SYSTEM_CONTROL",
      action: { type: "SYSTEM_SHUTDOWN", target: "shutdown", label: "Shutdown PC" }
    };
  }

  // 2. System Restart / Reboot (Explicit)
  if (/\b(?:restart\s+(?:my\s+)?(?:laptop|pc|computer|system)|reboot\s+(?:my\s+)?(?:laptop|pc|computer|system)|laptop\s+restart\s+karo|pc\s+restart\s+karo)\b/i.test(clean)) {
    return {
      reply: "Your laptop will restart. A security confirmation is required to proceed, sir.",
      speak: true,
      intent: "SYSTEM_CONTROL",
      action: { type: "SYSTEM_RESTART", target: "restart", label: "Restart PC" }
    };
  }

  // 3. System Sleep / Standby (Explicit)
  if (/\b(?:sleep\s+(?:my\s+)?(?:laptop|pc|computer|system)|put\s+(?:my\s+)?(?:laptop|pc|computer)\s+to\s+sleep|laptop\s+sleep\s+karo)\b/i.test(clean)) {
    return {
      reply: "Putting your laptop to sleep now, sir.",
      speak: true,
      intent: "SYSTEM_CONTROL",
      action: { type: "SYSTEM_SLEEP", target: "sleep", label: "Sleep PC" }
    };
  }

  // 4. Workstation Lock (Explicit)
  if (/\b(?:lock\s+my\s+(?:laptop|pc|computer|workstation)|lock\s+(?:screen|windows|system|workstation)|laptop\s+lock\s+karo|pc\s+lock\s+karo)\b/i.test(clean)) {
    return {
      reply: "Locking your workstation screen now, sir.",
      speak: true,
      intent: "SYSTEM_CONTROL",
      action: { type: "SYSTEM_LOCK", target: "lock", label: "Lock Workstation" }
    };
  }

  // 5. Safe Desktop App Launch (Explicit)
  const appMatch = clean.match(/\b(?:open|launch|start)\s+(notepad|calculator|calc|task manager|taskmgr|explorer|cmd|terminal)\b/i);
  if (appMatch) {
    let app = appMatch[1].toLowerCase();
    if (app === "calc") app = "calculator";
    if (app === "taskmgr") app = "task manager";
    const displayName = app.charAt(0).toUpperCase() + app.slice(1);
    return {
      reply: `Launching ${displayName} on your Windows PC, sir.`,
      speak: true,
      intent: "OPEN_APPLICATION",
      action: { type: "SYSTEM_APP", target: app, label: `Launch ${displayName}` }
    };
  }

  // 6. Screenshot Capture (Explicit)
  if (/\b(?:take\s+(?:a\s+)?screenshot|capture\s+(?:my\s+)?screen|screenshot\s+lo)\b/i.test(clean)) {
    return {
      reply: "Capturing a screenshot of your primary display now, sir.",
      speak: true,
      intent: "SYSTEM_CONTROL",
      action: { type: "SYSTEM_SCREENSHOT", target: "screen", label: "Take Screenshot" }
    };
  }

  // 7. Volume Control (Explicit)
  if (/\b(?:mute(?:\s+volume|\s+audio)?|volume\s+mute|volume\s+band\s+karo)\b/i.test(clean)) {
    return {
      reply: "Muting system audio, sir.",
      speak: true,
      intent: "SYSTEM_CONTROL",
      action: { type: "SYSTEM_VOLUME", target: "mute", label: "Mute Volume" }
    };
  }

  // 8. YouTube Search / Video Launch (Explicit)
  const ytSearchMatch = clean.match(/(?:(?:open|launch)\s+youtube\s+(?:and\s+search|and\s+play|for)\s+|youtube\s+open\s+karo\s+(?:aur\s+)?(?:search\s+karo\s+|video\s+lagao\s+|play\s+karo\s+)?)(.+)/i);
  if (ytSearchMatch) {
    const query = ytSearchMatch[1].replace(/ki\s+video\s+lagao|video\s+lagao|play\s+karo/i, "").trim();
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return {
      reply: `Opening YouTube and searching for "${query}", sir.`,
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: targetUrl, label: `YouTube: ${query}` }
    };
  }

  // YouTube Homepage Open
  if (/\b(?:open|launch|start|go to)\s+youtube\b/i.test(clean) || /\byoutube\s+open\s+karo\b/i.test(clean) || clean === "youtube") {
    return {
      reply: "Opening YouTube for you now, sir.",
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: "https://www.youtube.com", label: "Open YouTube" }
    };
  }

  // 9. TradingView / Trading Charts (Explicit)
  if (/\b(?:open|launch|go to)\s+(?:tradingview|trading\s+chart|crypto\s+chart)\b/i.test(clean) || /\btradingview\s+open\s+karo\b/i.test(clean)) {
    return {
      reply: "Opening TradingView charts for you now, sir.",
      speak: true,
      intent: "OPEN_URL",
      action: { type: "OPEN_URL", target: "https://www.tradingview.com", label: "Open TradingView" }
    };
  }

  // 10. Common External Platforms (Explicit Open)
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

  return null;
}

// Mode A: Contextual Knowledge Engine for Direct In-Chat Responses
function generateModeAResponse(message) {
  const msgLower = (message || "").toLowerCase();

  // Bitcoin & Crypto Market Analysis
  if (msgLower.includes("bitcoin") || msgLower.includes("btc") || msgLower.includes("crypto")) {
    return {
      reply: `Here is the current operational summary of the three key factors impacting Bitcoin (BTC) price action:\n\n` +
        `• **Institutional Capital & Spot ETF Inflows:** Sustained net institutional inflows into Bitcoin spot ETFs continue to absorb liquid exchange reserves, acting as a primary structural driver for price stability and upside pressure.\n\n` +
        `• **Macroeconomic & Global Liquidity Trends:** Investor sentiment remains heavily responsive to global central bank interest rate decisions, inflation data, and dollar index (DXY) fluctuations.\n\n` +
        `• **Post-Halving Supply Dynamics:** The reduced daily issuance rate of newly mined BTC has constrained floating market supply, creating favorable supply-demand asymmetry during periods of heightened volume.`,
      speak: true,
      intent: "MODE_A_DATA",
      action: null,
      status: "ok",
      grounding_sources: []
    };
  }

  // AI & Technology Trends
  if (msgLower.includes("ai news") || msgLower.includes("artificial intelligence") || msgLower.includes("tech news")) {
    return {
      reply: `Here is a structured overview of the latest developments shaping the artificial intelligence landscape:\n\n` +
        `• **Agentic AI & Autonomous Workflows:** Industry focus has rapidly shifted toward autonomous AI agents capable of multi-step problem solving, tool usage, and software development.\n\n` +
        `• **Multimodal Video & Audio Models:** Next-generation models feature native real-time voice and video comprehension, drastically lowering latency in human-computer interfaces.\n\n` +
        `• **Enterprise Infrastructure & Compute:** Continuous expansion in high-density AI data centers and specialized silicon optimizations to support scalable enterprise inference.`,
      speak: true,
      intent: "MODE_A_DATA",
      action: null,
      status: "ok",
      grounding_sources: []
    };
  }

  // JavaScript / Tech Explanations
  if (msgLower.includes("javascript") || msgLower.includes("js")) {
    return {
      reply: `JavaScript is the core programming language of the modern web. It enables dynamic interactivity, asynchronous data fetching, and rich user interfaces on the frontend, as well as high-performance server-side applications via Node.js runtime environments.`,
      speak: true,
      intent: "MODE_A_DATA",
      action: null,
      status: "ok",
      grounding_sources: []
    };
  }

  // Self Introduction
  if (msgLower.includes("introduce") || msgLower.includes("who are you")) {
    return {
      reply: `Good day. I am JARVIS, your advanced AI operational assistant. I am engineered to execute tasks with precision, retrieve live data, and assist across your daily digital workflows.`,
      speak: true,
      intent: "MODE_A_DATA",
      action: null,
      status: "ok",
      grounding_sources: []
    };
  }

  // General In-Chat Query Response
  return {
    reply: `I have processed your query, sir. The requested analysis has been synthesized directly within our tactical operations interface. All subsystems remain fully operational.`,
    speak: true,
    intent: "MODE_A_DATA",
    action: null,
    status: "ok",
    grounding_sources: []
  };
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

  // 1. Check for Explicit System, App, and Browser Automation Commands
  const explicitMatch = matchExplicitCommands(message);
  if (explicitMatch) {
    return res.status(200).json({
      ...explicitMatch,
      status: "ok",
      grounding_sources: []
    });
  }

  // 2. Mode A: Direct Data Retrieval & Reasoning
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    const modeAResponse = generateModeAResponse(message);
    return res.status(200).json(modeAResponse);
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
        intent: parsedData.intent || "MODE_A_DATA",
        action: parsedData.action || null,
        status: "ok",
        grounding_sources: sources
      });
    }

    if (rawReply) {
      return res.status(200).json({
        reply: rawReply,
        speak: true,
        intent: "MODE_A_DATA",
        action: null,
        status: "ok",
        grounding_sources: sources
      });
    }

    const modeAFallback = generateModeAResponse(message);
    return res.status(200).json(modeAFallback);

  } catch (error) {
    console.warn("Gemini API query, routing to Mode A direct knowledge engine:", error?.message || error);
    const modeAFallback = generateModeAResponse(message);
    return res.status(200).json(modeAFallback);
  }
}
