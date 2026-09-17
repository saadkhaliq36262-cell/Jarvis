/**
 * api/chat.js - Vercel Serverless API Route for JARVIS AI Assistant
 * 
 * Securely communicates with the official Google GenAI SDK (@google/genai).
 * The GEMINI_API_KEY is kept strictly on the server and is never exposed to the client.
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, an advanced, highly intelligent, and courteous personal AI assistant.
Your communication style:
- Calm, professional, articulate, and poised.
- Concise and direct without being blunt; avoid unnecessary filler or overly long paragraphs.
- Slightly futuristic and respectful (using occasional polite phrases like 'Certainly', 'Right away, sir', 'At your service' when appropriate, keeping it modern and refined).
- When asked about technical concepts (e.g. JavaScript), explain clearly and concisely in a beginner-friendly yet technically sound way.
- When asked to introduce yourself, deliver a polished, succinct JARVIS-style introduction.
`;

const DEFAULT_MODEL = "gemini-2.5-flash";

function isSearchQuery(message) {
  const keywords = [
    "search the web",
    "search web",
    "latest news",
    "search for",
    "live news",
    "recent news",
    "current news",
    "google search"
  ];
  const msgLower = (message || "").toLowerCase();
  return keywords.some(k => msgLower.includes(k));
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Method Not Allowed. Please send a POST request.",
      status: "error"
    });
  }

  // Parse body
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

  // 1. Verify GEMINI_API_KEY existence
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return res.status(200).json({
      reply: "JARVIS is unable to connect to the AI service. Please set your GEMINI_API_KEY environment variable in your Vercel project settings or .env file.",
      speak: true,
      status: "error",
      grounding_sources: []
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const isSearch = isSearchQuery(message);
    const sources = [];

    if (isSearch) {
      // Attempt with Google Search Grounding tool
      try {
        const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: message,
          config: {
            systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            temperature: 0.7
          }
        });

        const replyText = response.text || "I searched the web, but found no direct details.";

        // Extract grounding citations if returned
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

        return res.status(200).json({
          reply: replyText,
          speak: true,
          status: "ok",
          is_search: true,
          grounding_sources: sources
        });
      } catch (searchErr) {
        console.warn("Search grounding fallback triggered:", searchErr?.message);
        // Fallback without search tool if unavailable on current tier
        const fallbackResponse = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: `User search request: '${message}'. (Note: Live web search grounding was temporarily unavailable on this tier. Provide the best available knowledge up to your cutoff and clearly note that live search is currently unavailable.)`,
          config: {
            systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
            temperature: 0.7
          }
        });

        return res.status(200).json({
          reply: fallbackResponse.text || "Live search is currently unavailable.",
          speak: true,
          status: "ok",
          is_search: true,
          grounding_sources: [],
          search_fallback: true
        });
      }
    } else {
      // Standard Conversational Prompt
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: message,
        config: {
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          temperature: 0.7
        }
      });

      return res.status(200).json({
        reply: response.text || "I have processed your request, sir.",
        speak: true,
        status: "ok",
        grounding_sources: []
      });
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    const errText = error?.message || String(error);
    let userMessage = "JARVIS encountered a communication error with the AI core.";

    if (errText.includes("API_KEY_INVALID") || errText.includes("400")) {
      userMessage = "Your Gemini API key appears to be invalid. Please verify GEMINI_API_KEY in your environment settings.";
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
