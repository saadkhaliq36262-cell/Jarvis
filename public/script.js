/**
 * script.js - JARVIS Frontend Controller with Dual-Mode Execution & Action Feedback
 * Handles Web Speech Recognition, Speech Synthesis, PC Control Bridge, and UI States.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const liveTimeEl = document.getElementById("live-time");
    const liveDateEl = document.getElementById("live-date");
    const initTimeEl = document.getElementById("init-time");
    const coreStateText = document.getElementById("core-state-text");
    const statusText = document.getElementById("status-text");
    const waveVisualizer = document.getElementById("wave-visualizer");
    const coreSection = document.querySelector(".core-section");
    const bridgeBadge = document.getElementById("bridge-badge");
    const bridgeText = document.getElementById("bridge-text");
    const telemetryWsStatus = document.getElementById("telemetry-ws-status");
    const cpuValEl = document.getElementById("cpu-percent-val");
    const cpuBarEl = document.getElementById("cpu-gauge-bar");
    const ramValEl = document.getElementById("ram-percent-val");
    const ramBarEl = document.getElementById("ram-gauge-bar");
    const diskValEl = document.getElementById("disk-percent-val");
    const diskBarEl = document.getElementById("disk-gauge-bar");
    const hostNameVal = document.getElementById("host-name-val");
    const securityModeVal = document.getElementById("security-mode-val");

    const chatLog = document.getElementById("chat-log");
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const micBtn = document.getElementById("mic-btn");
    const voiceToggleBtn = document.getElementById("voice-toggle-btn");
    const voiceLabel = document.getElementById("voice-label");
    const speakerIcon = document.getElementById("speaker-icon");
    const clearChatBtn = document.getElementById("clear-chat-btn");
    const quickButtons = document.querySelectorAll(".quick-btn");
    const toastEl = document.getElementById("toast");

    // Modals
    const confirmationModal = document.getElementById("confirmation-modal");
    const confirmationMessage = document.getElementById("confirmation-message");
    const confirmationTarget = document.getElementById("confirmation-target");
    const acceptConfirmBtn = document.getElementById("accept-confirm-btn");
    const cancelConfirmBtn = document.getElementById("cancel-confirm-btn");

    const logsModal = document.getElementById("logs-modal");
    const logsToggleBtn = document.getElementById("logs-toggle-btn");
    const closeLogsBtn = document.getElementById("close-logs-btn");
    const logsContentBody = document.getElementById("logs-content-body");

    // --- State Variables & Configuration ---
    const LOCAL_AGENT_HTTP = "http://127.0.0.1:5000";
    const LOCAL_AGENT_WS_BASE = "ws://127.0.0.1:5000/ws";
    const LOCAL_AGENT_TOKEN = "jarvis_secure_local_token_2026";

    let voiceEnabled = true;
    let isListening = false;
    let isBridgeOnline = false;
    let agentWs = null;
    let wsReconnectTimer = null;
    let recognition = null;
    let synth = window.speechSynthesis;
    let preferredVoice = null;
    let pendingConfirmationAction = null;

    // --- 1. Real-time Clock & Date Display ---
    function updateClock() {
        const now = new Date();
        if (liveTimeEl) {
            liveTimeEl.textContent = now.toLocaleTimeString([], { hour12: true });
        }
        if (liveDateEl) {
            const options = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
            liveDateEl.textContent = now.toLocaleDateString(undefined, options).toUpperCase();
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    if (initTimeEl) {
        initTimeEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // --- 2. Toast Notifications ---
    function showToast(msg, duration = 3500) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        setTimeout(() => {
            toastEl.classList.remove("show");
        }, duration);
    }

    // --- 3. Telemetry UI Updates ---
    function applyTelemetryData(telemetry) {
        if (!telemetry) return;

        // CPU
        if (telemetry.cpu && typeof telemetry.cpu.percent === "number") {
            const cpuPct = Math.round(telemetry.cpu.percent);
            if (cpuValEl) cpuValEl.textContent = `${cpuPct}%`;
            if (cpuBarEl) cpuBarEl.style.width = `${Math.min(100, Math.max(0, cpuPct))}%`;
        }

        // RAM
        if (telemetry.ram && typeof telemetry.ram.percent === "number") {
            const ramPct = Math.round(telemetry.ram.percent);
            if (ramValEl) ramValEl.textContent = `${ramPct}%`;
            if (ramBarEl) ramBarEl.style.width = `${Math.min(100, Math.max(0, ramPct))}%`;
        }

        // Disk
        if (telemetry.disk && typeof telemetry.disk.percent === "number") {
            const diskPct = Math.round(telemetry.disk.percent);
            if (diskValEl) diskValEl.textContent = `${diskPct}%`;
            if (diskBarEl) diskBarEl.style.width = `${Math.min(100, Math.max(0, diskPct))}%`;
        }

        // Host Name / OS
        if (telemetry.platform && telemetry.platform.node && hostNameVal) {
            hostNameVal.textContent = telemetry.platform.node.toUpperCase();
        }
    }

    function resetTelemetryDisplay() {
        if (cpuValEl) cpuValEl.textContent = "--%";
        if (cpuBarEl) cpuBarEl.style.width = "0%";
        if (ramValEl) ramValEl.textContent = "--%";
        if (ramBarEl) ramBarEl.style.width = "0%";
        if (diskValEl) diskValEl.textContent = "--%";
        if (diskBarEl) diskBarEl.style.width = "0%";
        if (hostNameVal) hostNameVal.textContent = "WINDOWS PC";
    }

    // --- 4. WebSocket & Local Agent Connection Manager ---
    function connectLocalAgentWebSocket() {
        if (agentWs && (agentWs.readyState === WebSocket.OPEN || agentWs.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const wsUrl = `${LOCAL_AGENT_WS_BASE}?token=${encodeURIComponent(LOCAL_AGENT_TOKEN)}`;
        try {
            agentWs = new WebSocket(wsUrl);

            agentWs.onopen = () => {
                isBridgeOnline = true;
                if (bridgeBadge) {
                    bridgeBadge.className = "bridge-badge bridge-online";
                    if (bridgeText) bridgeText.textContent = "WINDOWS AGENT: ACTIVE";
                }
                if (telemetryWsStatus) {
                    telemetryWsStatus.textContent = "LIVE STREAM";
                    telemetryWsStatus.style.color = "var(--status-online)";
                }
                showToast("Connected to Windows Local Agent");

                // Request immediate telemetry snapshot
                if (agentWs.readyState === WebSocket.OPEN) {
                    agentWs.send(JSON.stringify({ type: "get_telemetry" }));
                }
            };

            agentWs.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "telemetry_stream" || msg.type === "telemetry_update") {
                        applyTelemetryData(msg.data);
                    } else if (msg.type === "audit_logs") {
                        renderLogsData(msg.data);
                    }
                } catch (e) {
                    console.error("WS parse error:", e);
                }
            };

            agentWs.onerror = (err) => {
                // Handled in onclose
            };

            agentWs.onclose = () => {
                isBridgeOnline = false;
                if (bridgeBadge) {
                    bridgeBadge.className = "bridge-badge bridge-offline";
                    if (bridgeText) bridgeText.textContent = "STANDALONE WEB MODE";
                }
                if (telemetryWsStatus) {
                    telemetryWsStatus.textContent = "OFFLINE";
                    telemetryWsStatus.style.color = "var(--text-muted)";
                }
                resetTelemetryDisplay();

                // Reconnect attempt in 4 seconds
                if (!wsReconnectTimer) {
                    wsReconnectTimer = setTimeout(() => {
                        wsReconnectTimer = null;
                        connectLocalAgentWebSocket();
                    }, 4000);
                }
            };
        } catch (e) {
            console.warn("WebSocket init error:", e);
        }
    }

    // Initialize Local Agent connection
    connectLocalAgentWebSocket();

    // --- 4. UI State Management (IDLE, LISTENING, THINKING, SPEAKING, ERROR) ---
    function setCoreState(state) {
        if (!coreStateText || !coreSection) return;

        coreSection.classList.remove("state-listening", "state-thinking", "state-speaking", "state-error");
        if (waveVisualizer) waveVisualizer.classList.remove("active");

        switch (state) {
            case "LISTENING":
                coreStateText.textContent = "LISTENING...";
                coreStateText.style.color = "var(--status-listening)";
                coreSection.classList.add("state-listening");
                if (statusText) statusText.textContent = "LISTENING";
                break;
            case "THINKING":
                coreStateText.textContent = "THINKING...";
                coreStateText.style.color = "var(--status-thinking)";
                coreSection.classList.add("state-thinking");
                if (statusText) statusText.textContent = "PROCESSING";
                break;
            case "SPEAKING":
                coreStateText.textContent = "SPEAKING...";
                coreStateText.style.color = "var(--accent-cyan)";
                coreSection.classList.add("state-speaking");
                if (waveVisualizer) waveVisualizer.classList.add("active");
                if (statusText) statusText.textContent = "SPEAKING";
                break;
            case "ERROR":
                coreStateText.textContent = "CORE FAULT";
                coreStateText.style.color = "var(--status-error)";
                coreSection.classList.add("state-error");
                if (statusText) statusText.textContent = "ERROR";
                break;
            case "IDLE":
            default:
                coreStateText.textContent = "IDLE";
                coreStateText.style.color = "var(--accent-cyan)";
                if (statusText) statusText.textContent = "ONLINE";
                break;
        }
    }

    // --- 5. Speech Synthesis (Voice Output) ---
    function initVoiceSynthesis() {
        if (!synth) {
            if (speechStatusVal) speechStatusVal.textContent = "VOICE N/A";
            return;
        }

        function populateVoices() {
            const voices = synth.getVoices();
            if (voices.length > 0) {
                preferredVoice = voices.find(v => 
                    (v.name.includes("Google") && v.lang.startsWith("en")) ||
                    (v.name.includes("Natural") && v.lang.startsWith("en")) ||
                    (v.name.includes("David") || v.name.includes("George") || v.name.includes("Male"))
                ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
            }
        }

        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }
    }
    initVoiceSynthesis();

    function speakText(text) {
        if (!voiceEnabled || !synth) {
            setCoreState("IDLE");
            return;
        }

        synth.cancel();

        const cleanSpeechText = text
            .replace(/\*\*/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/`{1,3}[^`]*`{1,3}/g, "code segment")
            .replace(/[#*_-]/g, " ")
            .trim();

        if (!cleanSpeechText) {
            setCoreState("IDLE");
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        utterance.rate = 1.05;
        utterance.pitch = 0.95;

        utterance.onstart = () => {
            setCoreState("SPEAKING");
        };

        utterance.onend = () => {
            setCoreState("IDLE");
        };

        utterance.onerror = () => {
            setCoreState("IDLE");
        };

        synth.speak(utterance);
    }

    if (voiceToggleBtn) {
        voiceToggleBtn.addEventListener("click", () => {
            voiceEnabled = !voiceEnabled;
            if (voiceEnabled) {
                voiceToggleBtn.classList.remove("muted");
                voiceLabel.textContent = "VOICE: ON";
                speakerIcon.textContent = "🔊";
                showToast("Voice output enabled");
            } else {
                if (synth) synth.cancel();
                voiceToggleBtn.classList.add("muted");
                voiceLabel.textContent = "VOICE: OFF";
                speakerIcon.textContent = "🔇";
                setCoreState("IDLE");
                showToast("Voice output muted");
            }
        });
    }

    // --- 6. Web Speech Recognition (Voice Input) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add("listening");
            setCoreState("LISTENING");
            userInput.placeholder = "Listening to your command...";
            if (synth) synth.cancel();
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join("");
            userInput.value = transcript;
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            isListening = false;
            micBtn.classList.remove("listening");
            setCoreState("IDLE");
            userInput.placeholder = "Type a command or click the microphone...";

            if (event.error === "not-allowed") {
                showToast("Microphone access denied. Please allow microphone permissions.");
            } else if (event.error !== "no-speech") {
                showToast(`Speech error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove("listening");
            userInput.placeholder = "Type a command or click the microphone...";

            const finalQuery = userInput.value.trim();
            if (finalQuery) {
                handleUserSubmission(finalQuery);
            } else {
                setCoreState("IDLE");
            }
        };

        micBtn.addEventListener("click", () => {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Recognition start error:", e);
                }
            }
        });
    } else {
        if (micBtn) {
            micBtn.title = "Voice recognition not supported in this browser.";
            micBtn.style.opacity = "0.5";
            micBtn.addEventListener("click", () => {
                showToast("Web Speech Recognition requires Google Chrome.");
            });
        }
    }

    // --- 7. Chat Message & Action Feedback Rendering ---
    function appendMessage(sender, text, action = null, groundingSources = []) {
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const bubble = document.createElement("div");
        bubble.className = `msg-bubble ${sender.toLowerCase()}-msg`;

        let actionCardHtml = "";
        if (action && action.type) {
            let icon = "⚡";
            let isLink = false;
            let targetUrl = "#";

            if (action.type === "OPEN_URL" || action.type === "WEB_SEARCH") {
                icon = action.type === "OPEN_URL" ? "🌐" : "🔍";
                isLink = true;
                targetUrl = action.target;
            } else if (action.type === "SYSTEM_LOCK") {
                icon = "🔒";
            } else if (action.type === "SYSTEM_APP") {
                icon = "💻";
            } else if (action.type === "SYSTEM_VOLUME") {
                icon = "🔊";
            } else if (action.type === "SYSTEM_SCREENSHOT") {
                icon = "📸";
            }

            actionCardHtml = `
                <div class="action-feedback-card">
                    <div class="action-card-info">
                        <span class="action-card-icon">${icon}</span>
                        <div class="action-card-text">
                            <span class="action-card-label">ACTION: ${escapeHtml(action.type)}</span>
                            <span class="action-card-target">${escapeHtml(action.target || "Local Windows System")}</span>
                        </div>
                    </div>
                    ${isLink 
                        ? `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="action-card-btn">LAUNCH ↗</a>`
                        : `<span class="action-card-btn">${escapeHtml(action.status === "pending" ? "PENDING" : "EXECUTED ✓")}</span>`
                    }
                </div>
            `;
        }

        let sourcesHtml = "";
        if (groundingSources && groundingSources.length > 0) {
            sourcesHtml = `
                <div class="grounding-box" style="margin-top: 8px; font-size: 12px;">
                    <div class="grounding-title" style="color: var(--accent-cyan); font-weight: bold; margin-bottom: 4px;">SOURCES & CITATIONS:</div>
                    ${groundingSources.map(s => `<a href="${s.uri}" target="_blank" rel="noopener noreferrer" class="source-item" style="color: var(--text-secondary); text-decoration: underline; margin-right: 8px;">🔗 ${escapeHtml(s.title || 'Source')}</a>`).join("")}
                </div>
            `;
        }

        bubble.innerHTML = `
            <div class="msg-meta">
                <span class="sender-tag">${sender}</span>
                <span class="timestamp">${timeStr}</span>
            </div>
            <div class="msg-content">${escapeHtml(text)}</div>
            ${actionCardHtml}
            ${sourcesHtml}
        `;

        chatLog.appendChild(bubble);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function escapeHtml(str) {
        return (str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // --- 8. Local Agent Tool Execution Engine ---
    async function executeLocalTool(toolName, params = {}, confirmed = false) {
        try {
            const res = await fetch(`${LOCAL_AGENT_HTTP}/api/system/execute`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Agent-Token": LOCAL_AGENT_TOKEN
                },
                body: JSON.stringify({
                    tool: toolName,
                    params: params,
                    confirmed: confirmed
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                return { status: "error", message: `Agent HTTP ${res.status}: ${errText}` };
            }

            return await res.json();
        } catch (e) {
            console.error("Local tool execution error:", e);
            return { status: "offline", message: "Windows Local Agent is not running on port 5000." };
        }
    }

    // --- 9. Interactive Security Confirmation Modal Controller ---
    function requestUserConfirmation(toolName, params, promptMessage) {
        pendingConfirmationAction = { toolName, params };
        if (confirmationMessage) {
            confirmationMessage.textContent = promptMessage || `Are you sure you want to execute ${toolName}?`;
        }
        if (confirmationTarget) {
            confirmationTarget.textContent = `Tool: ${toolName} | Params: ${JSON.stringify(params)}`;
        }
        if (confirmationModal) {
            confirmationModal.classList.remove("hidden");
        }
    }

    if (acceptConfirmBtn) {
        acceptConfirmBtn.addEventListener("click", async () => {
            if (confirmationModal) confirmationModal.classList.add("hidden");
            if (!pendingConfirmationAction) return;

            const { toolName, params } = pendingConfirmationAction;
            pendingConfirmationAction = null;

            showToast(`Authorizing & executing ${toolName}...`);
            const execResult = await executeLocalTool(toolName, params, true);

            if (execResult.status === "executed" || execResult.status === "dry_run") {
                const notice = execResult.status === "dry_run" 
                    ? `[DRY_RUN] ${toolName} simulated successfully.`
                    : `Action ${toolName} executed successfully on Windows PC.`;
                appendMessage("JARVIS", notice);
                showToast(notice);
            } else {
                appendMessage("JARVIS", `Execution failed: ${execResult.message || execResult.error || "Unknown error"}`);
            }
        });
    }

    if (cancelConfirmBtn) {
        cancelConfirmBtn.addEventListener("click", () => {
            if (confirmationModal) confirmationModal.classList.add("hidden");
            pendingConfirmationAction = null;
            appendMessage("JARVIS", "Action cancelled by user.");
            showToast("Action cancelled");
        });
    }

    // --- 10. Audit Log Viewer Controller ---
    function renderLogsData(logs) {
        if (!logsContentBody) return;
        logsContentBody.innerHTML = "";

        if (!logs || logs.length === 0) {
            logsContentBody.innerHTML = `<div class="log-entry" style="color: var(--text-muted)">No audit log entries recorded yet.</div>`;
            return;
        }

        logs.slice().reverse().forEach(entry => {
            const entryEl = document.createElement("div");
            entryEl.className = "log-entry";

            const statusClass = entry.status === "executed" ? "color: var(--status-online);" : 
                               entry.status === "confirmation_required" ? "color: var(--status-listening);" :
                               entry.status === "blocked" ? "color: var(--status-error);" : "color: var(--accent-cyan);";

            entryEl.innerHTML = `
                <div>
                    <span style="color: var(--accent-cyan); font-weight: bold;">[${escapeHtml(entry.tool)}]</span>
                    <span style="color: var(--text-secondary); margin-left: 6px;">caller: ${escapeHtml(entry.caller || "ui")}</span>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        ${escapeHtml(entry.timestamp || "")}
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: bold; ${statusClass}">${escapeHtml((entry.status || "INFO").toUpperCase())}</span>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(entry.message || "")}</div>
                </div>
            `;
            logsContentBody.appendChild(entryEl);
        });
    }

    async function loadAuditLogs() {
        if (!logsContentBody) return;
        logsContentBody.innerHTML = `<div class="log-entry" style="color: var(--accent-cyan)">Fetching latest audit logs...</div>`;

        try {
            const res = await fetch(`${LOCAL_AGENT_HTTP}/api/system/logs?limit=50`, {
                headers: { "X-Agent-Token": LOCAL_AGENT_TOKEN }
            });
            if (res.ok) {
                const data = await res.json();
                renderLogsData(data.logs);
                return;
            }
        } catch (e) {
            console.warn("REST logs fetch failed, trying WS:", e);
        }

        if (agentWs && agentWs.readyState === WebSocket.OPEN) {
            agentWs.send(JSON.stringify({ type: "get_logs", limit: 50 }));
        } else {
            logsContentBody.innerHTML = `<div class="log-entry" style="color: var(--status-error)">Windows Local Agent is offline. Cannot fetch logs.</div>`;
        }
    }

    if (logsToggleBtn) {
        logsToggleBtn.addEventListener("click", () => {
            if (logsModal) logsModal.classList.remove("hidden");
            loadAuditLogs();
        });
    }

    if (closeLogsBtn) {
        closeLogsBtn.addEventListener("click", () => {
            if (logsModal) logsModal.classList.add("hidden");
        });
    }

    // --- 11. Client Action Executor (Web & PC Control) ---
    async function executeClientAction(action) {
        if (!action || !action.type) return null;

        // 1. Browser Actions (Web Mode)
        if (action.type === "OPEN_URL" || action.type === "WEB_SEARCH") {
            try {
                window.open(action.target, "_blank", "noopener,noreferrer");
            } catch (e) {
                console.warn("Popup blocked or direct window.open restricted:", e);
            }
            return { status: "executed", message: `Opened ${action.label || action.target}` };
        }

        // 2. PC System Actions (System Mode via Local Agent)
        let toolName = null;
        let toolParams = {};

        if (action.type === "SYSTEM_LOCK") {
            toolName = "lock_workstation";
        } else if (action.type === "SYSTEM_APP") {
            toolName = "launch_application";
            toolParams = { app_name: action.target };
        } else if (action.type === "SYSTEM_VOLUME") {
            toolName = "adjust_volume";
            toolParams = { action: action.target };
        } else if (action.type === "SYSTEM_SCREENSHOT") {
            toolName = "capture_screenshot";
        }

        if (toolName) {
            if (!isBridgeOnline) {
                return {
                    status: "bridge_offline",
                    fallbackReply: "Local Windows Agent is offline. Start the agent using start-agent.bat or python local-agent/main.py on your PC to enable system controls."
                };
            }

            const execRes = await executeLocalTool(toolName, toolParams, false);

            if (execRes.status === "confirmation_required") {
                requestUserConfirmation(toolName, toolParams, execRes.message);
                return { status: "confirmation_pending" };
            }

            if (execRes.status === "dry_run") {
                showToast(`[DRY_RUN] ${execRes.message}`);
                return { status: "executed", message: execRes.message };
            }

            if (execRes.status === "executed") {
                showToast(`Executed ${toolName}`);
                return { status: "executed", data: execRes.data };
            }

            return { status: "error", fallbackReply: execRes.message || "Execution error" };
        }

        return null;
    }

    // --- 12. Local Fast Check for Time/Date ---
    function checkLocalTimeCommands(message) {
        const clean = message.toLowerCase()
            .replace(/^(hey\s+|hi\s+|ok\s+)?jarvis[,\s:]*/i, "")
            .trim()
            .replace(/[.?!]+$/, "");

        if (/\b(what\s+time\s+is\s+it|what['']?s\s+the\s+time|current\s+time|tell\s+me\s+the\s+time|time\s+now)\b/i.test(clean)) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
            return {
                reply: `The current time is ${timeStr}.`,
                speak: true,
                action: { type: "GET_TIME", target: timeStr, label: "Current Time" }
            };
        }

        if (/\b(what\s+is\s+today['']?s\s+date|what['']?s\s+the\s+date|today['']?s\s+date|current\s+date|what\s+day\s+is\s+it)\b/i.test(clean)) {
            const now = new Date();
            const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
            const dateStr = now.toLocaleDateString("en-US", options);
            return {
                reply: `Today is ${dateStr}.`,
                speak: true,
                action: { type: "GET_DATE", target: dateStr, label: "Current Date" }
            };
        }

        return null;
    }

    // --- 13. Unified Submission Pipeline ---
    async function handleUserSubmission(messageText) {
        if (!messageText || messageText.trim() === "") return;

        appendMessage("USER", messageText);
        userInput.value = "";

        // Fast local check for time/date
        const timeResult = checkLocalTimeCommands(messageText);
        if (timeResult) {
            appendMessage("JARVIS", timeResult.reply, timeResult.action);
            if (timeResult.speak && voiceEnabled) {
                speakText(timeResult.reply);
            } else {
                setCoreState("IDLE");
            }
            return;
        }

        setCoreState("THINKING");

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageText }),
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            let replyText = data.reply || "No response received.";
            let action = data.action || null;
            const sources = data.grounding_sources || [];

            // If an action was extracted, execute it
            if (action && action.type) {
                const actionResult = await executeClientAction(action);
                if (actionResult && actionResult.status === "bridge_offline" && actionResult.fallbackReply) {
                    replyText = actionResult.fallbackReply;
                }
            }

            // Render JARVIS response with action feedback card
            appendMessage("JARVIS", replyText, action, sources);

            // Trigger Voice Output
            if (data.speak !== false && voiceEnabled) {
                speakText(replyText);
            } else {
                setCoreState("IDLE");
            }

        } catch (err) {
            console.error("Communication error:", err);
            const errReply = "JARVIS is unable to communicate with the AI core. Please verify your connection.";
            appendMessage("JARVIS", errReply);
            setCoreState("ERROR");
            showToast("Serverless API communication error");
            setTimeout(() => setCoreState("IDLE"), 4000);
        }
    }

    // Form submission
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = userInput.value.trim();
            if (text) {
                handleUserSubmission(text);
            }
        });
    }

    // Clear Chat Log
    if (clearChatBtn) {
        clearChatBtn.addEventListener("click", () => {
            chatLog.innerHTML = "";
            showToast("Log cleared");
        });
    }

    // Quick Action Buttons
    quickButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const prompt = btn.getAttribute("data-prompt");
            if (prompt) {
                userInput.value = prompt;
                handleUserSubmission(prompt);
            }
        });
    });
});
