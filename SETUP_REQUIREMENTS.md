# JARVIS Multimodal Assistant - Setup Requirements & Environment Questionnaire

**Target Environment:** Windows 10/11 Host, Local Python 3.11 Agent, Android Debug Bridge (ADB), Multi-Device Network

---

## 1. Environment & Hardware Detection Summary (Auto-Detected)

| Category | Detected Specification | Status |
|---|---|---|
| **Host OS** | Windows 10/11 (64-bit AMD64) | Verified |
| **Python Runtime** | Python 3.11.15 | Installed & Operational |
| **Node.js Runtime** | Node.js v22.23.1, npm 10.9.8 | Installed & Operational |
| **System RAM** | 15.81 GB Total | Detected |
| **CPU Logical Cores**| 8 Cores | Detected |
| **ADB Executable** | Not currently detected in system PATH | Action Needed (Configurable Path) |

---

## 2. User Input Questionnaire

Please review the following checklist. Items marked **`REQUIRED FROM USER`** require your input or authorization before production deployment. Items marked **`CONFIGURABLE DEFAULTS`** can proceed immediately with sensible defaults.

### A. Android Devices & ADB Connectivity
- [ ] **Number of Android Devices:** [USER INPUT REQUIRED] (e.g., 1, 2, or 3 phones)
- [ ] **Device Models & Manufacturers:** [USER INPUT REQUIRED] (e.g., Samsung Galaxy S23, Xiaomi Redmi Note, Google Pixel)
- [ ] **Android OS Version(s):** [USER INPUT REQUIRED] (e.g., Android 12, 13, 14)
- [ ] **Connection Preference:** [USER INPUT REQUIRED] (USB cable, Wi-Fi Wireless ADB, or Hybrid)
- [ ] **Developer Options & USB Debugging:** [USER INPUT REQUIRED - MUST BE ENABLED ON PHONE]
  - *Steps:* Settings → About Phone → Tap 'Build Number' 7 times → Developer Options → Enable 'USB Debugging' (and 'Wireless Debugging' if Wi-Fi preferred).
- [ ] **ADB Binary Location:** [CONFIGURABLE DEFAULT: Auto-download Android SDK Platform-Tools or specify custom `ADB_PATH` in `.env`].

---

### B. Network & Deployment Topology
- [ ] **LAN Alignment:** [USER INPUT REQUIRED] Are the Windows laptop and Android phones connected to the same local Wi-Fi router / subnet? (Required for Wireless ADB and local web dashboard access).
- [ ] **Remote Internet Access:** [USER INPUT REQUIRED] Do you plan to access the Web UI from outside your home/office network (e.g., via Vercel HTTPS + WSS Tunnel / Cloudflare Tunnel)?
- [ ] **Public Exposure:** [USER INPUT REQUIRED] Will the UI be private to you or accessible to other users?

---

### C. AI Providers & Voice Configuration
- [ ] **Primary Cloud LLM:** [CONFIGURABLE DEFAULT: Google Gemini 3.6 Flash via official `@google/genai` Node & Python SDKs].
- [ ] **Gemini API Key:** [VERIFIED IN `.env` - Keeps strictly server-side].
- [ ] **Wake Word Engine:** [CONFIGURABLE DEFAULT: "Jarvis" via local open-source wake-word detector / Web Speech API].
- [ ] **Local Voice STT / TTS:** [CONFIGURABLE DEFAULT: Web Speech API for browser + optional local `faster-whisper` / `edge-tts`].

---

### D. Hardware Peripherals & Computer Vision
- [ ] **Webcam Availability:** [USER INPUT REQUIRED] Built-in laptop webcam or external USB webcam?
- [ ] **Microphone Availability:** [USER INPUT REQUIRED] Built-in microphone array or external headset?
- [ ] **Dedicated GPU:** [USER INPUT REQUIRED] NVIDIA GeForce GPU (CUDA supported) or Integrated Intel/AMD graphics?
- [ ] **Hand Gesture Control:** [CONFIGURABLE DEFAULT: Local MediaPipe / OpenCV running at 15 FPS with debounce cooldowns].

---

## 3. Security Policy Acceptance
- [ ] **No Arbitrary Shell Execution:** Enforce strict allowlisted tools with typed JSON schemas.
- [ ] **Action Confirmation Modal:** Destructive actions (`SHUTDOWN_PC`, `DELETE_FILE`, `UNINSTALL_APP`) require interactive UI confirmation.
- [ ] **Dry Run Mode Toggle:** Support `DRY_RUN=true` in `.env` for safe non-destructive simulation.
