# JARVIS - AI Tactical Voice Assistant & Dual-Mode PC Control

A futuristic, desktop-like JARVIS AI Assistant web application designed for direct **Vercel Serverless Deployment** and powered by the official **Google Gemini API** (`@google/genai` SDK) with native browser voice input, speech synthesis, structured action execution, and optional local Windows PC control.

---

## ⚡ Dual-Mode Execution Architecture

```
                                    ┌─── Web Mode: Browser Tab / Web Search (`window.open`)
                                    │
User Voice/Text ──► Vercel API ─────┼─── Intent Engine: Extracts structured JSON & Speech
 (`/api/chat`)   (`@google/genai`)  │
                                    └─── System Mode: Local PC Bridge (`http://localhost:5000`)
                                          └──► Windows Screen Lock, App Launch, Volume Control
```

1. **Web Mode (Standalone on Vercel)**:
   - Voice recognition & speech synthesis in Chrome.
   - Conversational AI responses & technical explanations.
   - Web Search & URL opening (YouTube, Google, GitHub, etc.).
   - Visual Action Feedback Cards in the chat feed with 1-click launch buttons.
   - Real-time digital clock and date display.

2. **System Mode (Local Windows PC Control)**:
   - Connects to a lightweight zero-dependency desktop agent running on `http://127.0.0.1:5000`.
   - Executes safe allowlisted OS actions: **Lock Workstation**, **Launch Notepad/Calculator**, **Adjust Volume**.
   - If the local bridge is offline, JARVIS informs the user and continues in Web Mode without interruption.

---

## 📁 Project Structure

```
JARVIS/
├── api/
│   └── chat.js          # Vercel Serverless Function (Gemini API & Hybrid Intent Engine)
├── desktop_agent/
│   └── agent.py         # Optional Local PC Bridge for Windows Control (port 5000)
├── public/              # Static Frontend Assets (served automatically by Vercel)
│   ├── index.html       # Futuristic Sci-Fi HUD interface & AI core
│   ├── style.css        # Neon cyan/blue styling & action feedback cards
│   └── script.js        # Web speech, action dispatcher & bridge poller
├── package.json         # Node.js configuration (@google/genai, dotenv)
├── vercel.json          # Vercel deployment configuration
├── server.js            # Lightweight local dev runner (npm start)
├── .env.example         # Environment template
├── .gitignore           # Excludes .env, node_modules, and .vercel
└── README.md            # Documentation
```

---

## 🚀 How to Run Locally

### 1. Install & Start Web App
```powershell
npm install
npm start
```
Open **Google Chrome** at `http://localhost:3000`.

### 2. (Optional) Start Local PC Control Bridge
To enable Windows PC controls (e.g., *"Jarvis, lock my laptop"* or *"Jarvis, open notepad"*), open a second terminal and run:
```powershell
python desktop_agent/agent.py
```
The HUD header will update to **`PC BRIDGE: ONLINE`**.

---

## 🌐 How to Deploy to Vercel

1. Push your `JARVIS` repository to **GitHub**.
2. In [Vercel](https://vercel.com), click **"Add New Project"** and import the repository.
3. In the **Environment Variables** section, add:
   * **Name:** `GEMINI_API_KEY`
   * **Value:** `your_gemini_api_key`
4. Click **Deploy**.

---

## 🎙️ Supported Commands & Demos

| # | Command | Action Executed | Mode |
|---|---------|-----------------|------|
| **1** | `"Jarvis, introduce yourself."` | Speaks futuristic JARVIS introduction | Web |
| **2** | `"Jarvis, what is JavaScript?"` | Beginner-friendly technical explanation | Web |
| **3** | `"Jarvis, search the web for latest AI news."` | Google Search action card & query trigger | Web |
| **4** | `"Jarvis, what time is it?"` | Local system time (e.g. *"3:25 PM"*) | Web |
| **5** | `"Jarvis, open YouTube."` | Opens YouTube in a new tab | Web |
| **6** | `"Jarvis, lock my laptop."` | Locks Windows workstation | PC Bridge |
| **7** | `"Jarvis, open notepad."` | Launches Notepad application | PC Bridge |
