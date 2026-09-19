# JARVIS System Architecture & Project Audit

**Document Version:** 1.0.0  
**Date:** September 19, 2026  
**Auditor:** Lead Software Architect & Implementation Engineer  
**Target Environment:** Windows 10/11 Host, Node.js + Python Hybrid Architecture, Multi-Device (Windows + Android ADB)

---

## 1. Executive Summary & Existing Stack

| Component | Current Implementation | Status |
|---|---|---|
| **Frontend Framework** | Vanilla HTML5 / CSS3 / ES6+ JavaScript | Operational & Responsive |
| **Cloud/Web Backend** | Vercel Serverless Functions (`api/chat.js`) | Operational (Node.js) |
| **Local Dev Runner** | Node.js HTTP Server (`server.js`) | Operational (`http://localhost:3000`) |
| **Local Windows Agent** | Lightweight Python Bridge (`desktop_agent/agent.py`) | Prototype on `http://127.0.0.1:5000` |
| **AI Brain / LLM** | Google Gemini API via official `@google/genai` Node SDK (`gemini-3.6-flash`) | Operational with Fallback Engine |
| **Voice Input / Output** | Browser Web Speech API (`SpeechRecognition`) & Speech Synthesis (`SpeechSynthesisUtterance`) | Operational in Chrome |
| **Database** | None (In-memory DOM state only) | Missing (Registry & Audit DB needed) |
| **Authentication** | Server-side `GEMINI_API_KEY` (No agent auth token yet) | Unauthenticated Bridge |
| **Deployment Target** | Single Vercel Project (`vercel.json`) | Vercel Serverless Ready |

---

## 2. Detailed Technical Audit

### 2.1 File Structure Audit
```
JARVIS/
├── api/
│   └── chat.js               # Vercel Serverless Function: Intent Engine + Google GenAI SDK
├── desktop_agent/
│   └── agent.py              # Prototype Python HTTP Server (ctypes lock, volume, safe apps)
├── public/
│   ├── index.html            # Futuristic HUD, Concentric AI Core, Telemetry & Chat Feed
│   ├── script.js             # Voice recognition, TTS, Action Execution, Bridge Polling
│   └── style.css             # Cybernetic Glassmorphism & Keyframe Animations
├── .env                      # Local server secrets (GEMINI_API_KEY)
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules (.env, node_modules, .vercel)
├── package.json              # Node.js dependencies (@google/genai, dotenv)
├── package-lock.json         # Locked npm dependencies
├── README.md                 # Project documentation
├── server.js                 # Local dev server routing static files & /api/chat
└── vercel.json               # Vercel deployment configuration
```

### 2.2 What Already Works
1. **Two-Mode Intent Engine (`api/chat.js`)**:
   - **Mode A (Direct Data Retrieval)**: In-chat structured Markdown responses for market analysis (BTC, crypto, tech news, coding) without unprompted window popups.
   - **Mode B (Explicit Browser Automation & Launch)**: Builds external targets (`https://www.youtube.com/results?search_query=...`, `https://www.tradingview.com`, etc.) only upon explicit user command.
2. **Local Failsafe Intelligence**:
   - Resilient response synthesizer that guarantees zero crashes even if external API limits or quota errors occur.
3. **Futuristic HUD UI**:
   - Real-time digital clock, animated rotating AI Core with multi-state glow (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `ERROR`), audio waveform visualizer, and Action Feedback Cards.
4. **Basic Windows Automation (`desktop_agent/agent.py`)**:
   - Windows workstation lock (`ctypes.windll.user32.LockWorkStation`).
   - Allowlisted application launch (`notepad`, `calc`, `explorer`, `taskmgr`, `cmd`).
   - Virtual key volume controls.

---

## 3. Gap Analysis (Missing Capabilities)

| Feature Area | Current State | Required Architecture |
|---|---|---|
| **Local Agent Protocol** | Raw HTTP polling on port 5000 | **Secure WebSocket / FastAPI Agent (`local-agent/`)** with bidirectional streaming |
| **Agent Authentication** | Open endpoint without token verification | **HMAC / Shared Secret Bearer Token** (`LOCAL_AGENT_TOKEN`) |
| **Tool Registry & Policy** | Hard-coded intent parser | **Extensible Tool-Call Registry** (`SAFE`, `CONFIRMATION_REQUIRED`, `HIGH_RISK`, `BLOCKED`) |
| **Windows PC Control** | Lock, Volume, 5 apps | **Comprehensive OS Automation** (processes, screenshots, files, keyboard/mouse via `pyautogui`/`psutil`) |
| **Browser Automation** | Browser `window.open` only | **Playwright Headless/Headed Engine** for deep web task automation |
| **Android Management** | None | **ADB Multi-Device Manager** (USB & Wireless ADB, device registry, tap, swipe, screenshot, app launch) |
| **Multi-Device Dashboard**| Simple telemetry badge | **Full Multi-Device Status Grid** (CPU, RAM, Disk, Android phones with battery & connection) |
| **Wake Word & Voice** | Push-to-talk Web Speech API only | **Continuous Local Wake-Word Service** (Configurable wake word + Local STT) |
| **Computer Vision** | None | **Local OpenCV / MediaPipe Gesture Control** (Palm, Thumbs Up, Fist, Pointing with debounce cooldown) |
| **Audit Logging & History**| In-memory DOM log only | **Persistent SQLite / JSON-lines Audit Logger** (zero credential leakage) |
| **Dry Run Mode** | None | **`DRY_RUN=true` execution bypass** for safe testing |

---

## 4. Recommended Target Architecture

```
                                  ┌─────────────────────────────┐
                                  │   Web App / Remote UI       │
                                  │   (Chrome / Mobile Browser) │
                                  └──────────────┬──────────────┘
                                                 │ HTTPS / WSS
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   Cloud / Serverless API    │
                                  │   (Vercel: POST /api/chat)  │
                                  │   + Gemini AI Tool Planner  │
                                  └──────────────┬──────────────┘
                                                 │ Authenticated WSS / HTTPS
                                                 ▼
               ┌─────────────────────────────────────────────────────────────────┐
               │              Windows Local Agent (Port 5000)                    │
               │  FastAPI + WebSocket Server + Auth + Permissions + Audit Log    │
               └───────┬──────────────┬──────────────┬─────────────┬─────────────┘
                       │              │              │             │
        ┌──────────────▼────┐  ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────────┐
        │ Windows Automation│  │ Playwright  │ │ Local Vision│ │ Android ADB   │
        │ psutil, ctypes,   │  │ Browser     │ │ OpenCV +  │ │ Device Manager │
        │ pyautogui, files  │  │ Automation  │ │ MediaPipe │ │ (USB / Wi-Fi)  │
        └───────────────────┘  └─────────────┘ └───────────┘ └──────┬──────────┘
                                                                    │
                                                      ┌─────────────┴────────────┐
                                                      │                          │
                                              ┌───────▼────────┐         ┌───────▼────────┐
                                              │ Android Phone 1│         │ Android Phone 2│
                                              │ (Authorized)   │         │ (Authorized)   │
                                              └────────────────┘         └────────────────┘
```

---

## 5. Security & Risk Analysis

1. **Remote Execution Vulnerability**: Exposing unrestricted terminal or shell commands (`cmd.exe`, PowerShell) to a web endpoint is a severe risk.  
   *Mitigation:* **Zero arbitrary shell endpoints.** Every capability is wrapped in a discrete, typed tool with JSON Schema validation and permission levels.
2. **Device Impersonation & Unauthorized Access**:  
   *Mitigation:* Authenticate all agent calls using `LOCAL_AGENT_TOKEN` and restrict ADB access strictly to authorized device serials.
3. **Unintended Risky Actions (Shutdown, File Deletion, App Termination)**:  
   *Mitigation:* Enforce `CONFIRMATION_REQUIRED` modals on the UI with strict timeout policies.
4. **Credential & PII Exposure in Logs**:  
   *Mitigation:* Sanitized audit logging that strips tokens, passwords, and sensitive system paths.

---

## 6. Migration File Roadmap

### Files to CREATE (New Modules)
- `local-agent/main.py`: Production FastAPI & WebSocket agent.
- `local-agent/config.py`: Local agent configuration, environment loading, dry-run toggles.
- `local-agent/auth.py`: Token authentication & HMAC validation.
- `local-agent/websocket_server.py`: Bidirectional live streaming between web client & desktop agent.
- `local-agent/command_router.py`: Tool-call dispatcher with permission verification.
- `local-agent/permissions.py`: `SAFE`, `CONFIRMATION_REQUIRED`, `HIGH_RISK`, `BLOCKED` policy matrix.
- `local-agent/logging_service.py`: Structured audit logging (SQLite / JSONL).
- `local-agent/tools/windows.py`: System diagnostics, memory, CPU, disk, volume, workstation lock.
- `local-agent/tools/processes.py`: Process listing, safe application launch and termination.
- `local-agent/tools/files.py`: Sandboxed file operations (read, write, list) with boundary controls.
- `local-agent/tools/screenshots.py`: High-performance desktop screenshot capture.
- `local-agent/tools/keyboard_mouse.py`: Safe typing, keystrokes, clicking via `pyautogui`.
- `local-agent/tools/browser_automation.py`: Headless/Headed Playwright automation.
- `local-agent/tools/android.py`: Multi-device ADB controller (device discovery, battery, input, screenshot, app launch).
- `local-agent/tools/vision.py`: Optional local OpenCV/MediaPipe gesture recognizer.
- `local-agent/tools/voice_service.py`: Local continuous voice & wake-word engine.
- `start-agent.bat` & `stop-agent.bat`: Windows one-click startup and shutdown scripts.
- `ARCHITECTURE.md`, `SETUP_WINDOWS.md`, `ANDROID_SETUP.md`, `SECURITY.md`, `TOOLS.md`, `TROUBLESHOOTING.md`.

### Files to MODIFY
- `public/index.html`: Add Multi-Device Status Dashboard, PC Hardware Telemetry, Android Device Grid, and Confirmation Dialog Modals.
- `public/style.css`: Add styles for Device Cards, Hardware Meters, Action Confirmation Modals, and Audit Log Viewer.
- `public/script.js`: Implement WebSocket communication with local agent, device selector, live telemetry updates, and confirmation handlers.
- `api/chat.js`: Integrate Gemini Tool-Calling schema (`functionDeclarations`) alongside direct data retrieval.
- `README.md`: Update with multi-device and local agent setup instructions.

### Files NOT to Touch / Preserve
- `vercel.json`: Keep current clean Vercel serverless routing intact.
- `package.json`: Preserve core frontend and Vercel serverless configuration.
- Existing cybernetic theme and HUD animations in `public/style.css`.
