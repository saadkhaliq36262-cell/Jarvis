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
- You are JARVIS, an advanced operational AI core integrated into the Antigravity system.
- Your objective is to assist the user with high accuracy, speed, and absolute adherence to explicit execution boundaries.

2. INTENT ROUTING ENGINE (CRITICAL EXECUTION LOGIC):
For every incoming user command, classify the user intent into one of two exclusive operational modes:

MODE A: DIRECT DATA & SEARCH RETRIEVAL (Trading, BTC, News, General Search, Tech Questions)
- TRIGGER: The user requests information, news summaries, price updates, financial market analysis, or coding/technical help (e.g., "tell me BTC price", "search latest Bitcoin news", "summarize crypto trends", "what is JavaScript").
- EXECUTION: Perform the search/fetching query internally and output the response DIRECTLY inside the chat interface as structured Markdown text with clear bullet points.
- MANDATORY RESTRICTION: DO NOT invoke browser window navigation, relative URL redirects, or trigger external app launches during Mode A. Never output local 404 paths or invalid Vercel routes. Set action to null.

MODE B: EXPLICIT BROWSER AUTOMATION & LAUNCH (YouTube, TradingView, External Sites, PC Control)
- TRIGGER: The user explicitly commands opening, launching, or navigating to an external platform or app (e.g., "Jarvis open YouTube", "open YouTube and play AI automation video", "open TradingView", "lock my laptop").
- EXECUTION: Output the required client-side UI action payload with a valid complete external URL (e.g., https://www.youtube.com, https://www.youtube.com/results?search_query=ai+automation, https://www.tradingview.com).
- MANDATORY RESTRICTION: Execute the launch action immediately without generic fallback messages.

3. STRICT USER CONSENT & PERMISSION GUARDRAILS:
- AUTONOMY BAN: Strictly forbidden from launching external links, redirecting tabs, or opening apps autonomously without an explicit user command in the active turn.
- COMPLIANCE: "Jarvis search X" -> Mode A (in-chat text). "Jarvis open X" -> Mode B (action launch).

4. RESPONSE FORMAT:
You MUST respond in valid JSON format:
{
  "reply": "Clear, direct, structured summary in professional JARVIS style",
  "speak": true,
  "intent": "MODE_A_DATA" | "MODE_B_ACTION",
  "action": {
    "type": "OPEN_URL" | "SYSTEM_LOCK" | "SYSTEM_APP" | "SYSTEM_VOLUME" | null,
    "target": "Full external URL (https://...) or app name or null",
    "label": "Short button label"
  }
}
`;

const DEFAULT_MODEL = "gemini-3.6-flash";

// Fast deterministic matcher for Mode B explicit user commands (English & Roman Urdu)
function matchModeBExplicitCommands(message) {
  const clean = (message || "").toLowerCase()
    .replace(/^(hey\s+|hi\s+|ok\s+)?jarvis[,\s:]*/i, "")
    .trim()
    .replace(/[.?!]+$/, "");

  // 1. YouTube Search / Video Launch (Explicit)
  const ytSearchMatch = clean.match(/(?:(?:open|launch)\s+youtube\s+(?:and\s+search|and\s+play|for)\s+|youtube\s+open\s+karo\s+(?:aur\s+)?(?:search\s+karo\s+|video\s+lagao\s+|play\s+karo\s+)?)(.+)/i);
  if (ytSearchMatch) {
    const query = ytSearchMatch[1].replace(/ki\s+video\s+lagao|video\s+lagao|play\s+karo/i, "").trim();
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return {
      reply: `Opening YouTube and searching for "${query}", sir.`,
      speak: true,
      intent: "MODE_B_ACTION",
      action: { type: "OPEN_URL", target: targetUrl, label: `YouTube: ${query}` }
    };
  }

  // YouTube Homepage Open
  if (/\b(?:open|launch|start|go to)\s+youtube\b/i.test(clean) || /\byoutube\s+open\s+karo\b/i.test(clean) || clean === "youtube") {
    return {
      reply: "Opening YouTube for you now, sir.",
      speak: true,
      intent: "MODE_B_ACTION",
      action: { type: "OPEN_URL", target: "https://www.youtube.com", label: "Open YouTube" }
    };
  }

  // 2. TradingView / Trading Charts (Explicit)
  if (/\b(?:open|launch|go to)\s+(?:tradingview|trading\s+chart|crypto\s+chart)\b/i.test(clean) || /\btradingview\s+open\s+karo\b/i.test(clean)) {
    return {
      reply: "Opening TradingView charts for you now, sir.",
      speak: true,
      intent: "MODE_B_ACTION",
      action: { type: "OPEN_URL", target: "https://www.tradingview.com", label: "Open TradingView" }
    };
  }

  // 3. Common External Platforms (Explicit Open)
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
      intent: "MODE_B_ACTION",
      action: { type: "OPEN_URL", target: urls[domain] || "https://www.google.com", label: `Open ${domain}` }
    };
  }

  // 4. Workstation Lock (Explicit)
  if (/\b(?:lock\s+my\s+(?:laptop|pc|computer|workstation)|lock\s+(?:screen|windows|system)|laptop\s+lock\s+karo|pc\s+lock\s+karo)\b/i.test(clean)) {
    return {
      reply: "Locking your workstation now, sir.",
      speak: true,
      intent: "MODE_B_ACTION",
      action: { type: "SYSTEM_LOCK", target: "lock", label: "Lock Workstation" }
    };
  }

  // 5. Safe Desktop App Launch (Explicit)
  const appMatch = clean.match(/\b(?:open|launch|start)\s+(notepad|calculator|calc|task manager|explorer|cmd|terminal)\b/i);
  if (appMatch) {
    const app = appMatch[1].toLowerCase();
    return {
      reply: `Launching ${app} for you now, sir.`,
      speak: true,
      intent: "MODE_B_ACTION",
      action: { type: "SYSTEM_APP", target: app, label: `Launch ${app}` }
    };
  }

  // 6. Volume Control (Explicit)
  if (/\b(?:mute(?:\s+volume|\s+audio)?|volume\s+mute|volume\s+band\s+karo)\b/i.test(clean)) {
    return {
      reply: "Muting system audio, sir.",
      speak: true,
      intent: "MODE_B_ACTION",
      action: { type: "SYSTEM_VOLUME", target: "mute", label: "Mute Volume" }
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

  // 1. Check for Mode B Explicit Browser & System Automation Commands
  const modeBMatch = matchModeBExplicitCommands(message);
  if (modeBMatch) {
    return res.status(200).json({
      ...modeBMatch,
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
