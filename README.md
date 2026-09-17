# JARVIS - Vercel-Ready AI Tactical Voice Assistant

A futuristic, desktop-like JARVIS AI Assistant web application designed for direct **Vercel Serverless Deployment** and powered by the official **Google Gemini API** (`@google/genai` SDK) with native browser voice input and synthesis.

---

## Architecture

```
Frontend (Chrome / Browser Web Speech API)
   ↓
Secure Server-Side API Route (`POST /api/chat` - Vercel Serverless Function)
   ↓
Google Gemini API (`@google/genai` - gemini-2.5-flash)
   ↓
Response with Search Grounding Citations
   ↓
Frontend Interface
   ↓
Voice Output (`SpeechSynthesis`)
```

- **Vercel Native**: Zero Python, Docker, or VPS requirements. Deploys seamlessly as a serverless function.
- **Strict Security**: `GEMINI_API_KEY` exists strictly on the server and is never exposed to the client.
- **Zero Paid Voice Services**: Uses standard Browser Web Speech API (`SpeechRecognition`) and Speech Synthesis (`SpeechSynthesisUtterance`).

---

## Project Structure

```
JARVIS/
├── api/
│   └── chat.js          # Vercel Serverless Function (Gemini API & Google Search grounding)
├── public/              # Static Frontend Assets (served automatically by Vercel)
│   ├── index.html       # Futuristic Sci-Fi HUD interface & AI core
│   ├── style.css        # Neon cyan/blue styling & glowing keyframe animations
│   └── script.js        # Voice recognition, speech synthesis, clock, and YouTube handler
├── package.json         # Node.js configuration & dependencies (@google/genai, dotenv)
├── vercel.json          # Vercel deployment configuration
├── server.js            # Lightweight local development runner (npm start)
├── .env.example         # Environment template
├── .gitignore           # Excludes .env, node_modules, and .vercel
└── README.md            # Documentation
```

---

## 🚀 How to Run Locally

### 1. Open in VS Code
Open the `JARVIS` directory in VS Code.

### 2. Install Dependencies
Open your terminal and run:
```powershell
npm install
```

### 3. Add Your Gemini API Key
Create a `.env` file (or copy `.env.example`):
```powershell
Copy-Item .env.example .env
```
Open `.env` and add your free Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
> **Get a free Gemini API key:** [https://aistudio.google.com/](https://aistudio.google.com/)

### 4. Start Local Development Server
```powershell
npm start
```
Open your browser at:
```
http://localhost:3000
```

---

## 🌐 How to Deploy to Vercel

### Method 1: Deploy via Vercel Web Dashboard (Recommended)
1. Push your `JARVIS` repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your `JARVIS` repository.
4. Under **Environment Variables**, add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `your_actual_gemini_api_key`
5. Click **Deploy**. Vercel will build and launch your JARVIS assistant with a live HTTPS URL.

### Method 2: Deploy via Vercel CLI
```powershell
npx vercel
```
Follow the prompts, and add `GEMINI_API_KEY` when prompted or in the Vercel project dashboard.

---

## 🎙️ 5 Demo Commands for Video Recording

You can trigger these via **Microphone Voice**, **Text Input**, or the **Quick Action Buttons** at the bottom:

| # | Command | Behavior |
|---|---------|----------|
| **1** | `"Jarvis, introduce yourself."` | Delivers a refined, futuristic JARVIS introduction. |
| **2** | `"Jarvis, what is JavaScript?"` | Explains JavaScript clearly and concisely using Gemini. |
| **3** | `"Jarvis, search the web for the latest AI news."` | Live Google Search grounding with clickable citation sources. |
| **4** | `"Jarvis, what time is it?"` | Immediately returns local system time (no API call needed). |
| **5** | `"Jarvis, open YouTube."` | Safely opens YouTube in a new browser tab. |

---

## Browser Permissions & Security Notes

- **Microphone**: When clicking the microphone for the first time, click **Allow** on the Chrome permission prompt.
- **Audio Output**: Uses Chrome's native Speech Synthesis. Mute or unmute at any time with the `VOICE: ON / OFF` button.
- **Security Guarantee**: Neither HTML, CSS, frontend JS, nor public files contain your Gemini API key. All AI communication routes strictly through `/api/chat`.
