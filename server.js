/**
 * server.js - Local Development Runner for Vercel Serverless Architecture
 * 
 * Emulates Vercel Serverless Function routing and serves public static assets.
 * Allows instant local testing via: npm start
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import chatHandler from "./api/chat.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 1. API Route Handling: /api/chat
  if (pathname === "/api/chat") {
    let bodyData = "";
    req.on("data", chunk => {
      bodyData += chunk;
    });

    req.on("end", async () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (e) {
        req.body = bodyData;
      }

      // Add helper response methods like Vercel Serverless Functions
      res.status = function (code) {
        this.statusCode = code;
        return this;
      };

      res.json = function (data) {
        this.setHeader("Content-Type", "application/json");
        this.end(JSON.stringify(data));
        return this;
      };

      try {
        await chatHandler(req, res);
      } catch (err) {
        console.error("Local Server API Error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply: "Internal Server Error", status: "error" }));
      }
    });
    return;
  }

  // 2. Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log("==================================================");
  console.log("  JARVIS AI ASSISTANT - LOCAL DEVELOPMENT SERVER");
  console.log("==================================================");
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  API Route:   http://localhost:${PORT}/api/chat`);
  console.log("  Vercel-ready serverless environment active.");
  console.log("==================================================");
});
