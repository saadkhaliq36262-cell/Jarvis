/**
 * script.js - JARVIS Frontend Controller
 * Handles UI animations, Web Speech Recognition, Speech Synthesis, and API interaction.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Element References ---
    const liveTimeEl = document.getElementById("live-time");
    const liveDateEl = document.getElementById("live-date");
    const initTimeEl = document.getElementById("init-time");
    const coreStateText = document.getElementById("core-state-text");
    const systemStatusBadge = document.getElementById("system-status-badge");
    const statusText = document.getElementById("status-text");
    const waveVisualizer = document.getElementById("wave-visualizer");
    const coreSection = document.querySelector(".core-section");
    const modelNameVal = document.getElementById("model-name-val");
    const speechStatusVal = document.getElementById("speech-status-val");
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

    // --- State Variables ---
    let voiceEnabled = true;
    let isListening = false;
    let recognition = null;
    let synth = window.speechSynthesis;
    let preferredVoice = null;

    // --- 1. Real-time Clock & Date ---
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

    // --- 2. Toast Notification ---
    function showToast(msg, duration = 3500) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        setTimeout(() => {
            toastEl.classList.remove("show");
        }, duration);
    }

    // --- 3. UI State Management (IDLE, LISTENING, THINKING, SPEAKING, ERROR) ---
    function setCoreState(state) {
        if (!coreStateText || !coreSection) return;

        coreSection.classList.remove("state-listening", "state-thinking", "state-speaking", "state-error");
        waveVisualizer.classList.remove("active");

        switch (state) {
            case "LISTENING":
                coreStateText.textContent = "LISTENING...";
                coreStateText.style.color = "var(--status-listening)";
                coreSection.classList.add("state-listening");
                break;
            case "THINKING":
                coreStateText.textContent = "THINKING...";
                coreStateText.style.color = "var(--status-thinking)";
                coreSection.classList.add("state-thinking");
                break;
            case "SPEAKING":
                coreStateText.textContent = "SPEAKING...";
                coreStateText.style.color = "var(--accent-cyan)";
                coreSection.classList.add("state-speaking");
                waveVisualizer.classList.add("active");
                break;
            case "ERROR":
                coreStateText.textContent = "CORE FAULT";
                coreStateText.style.color = "var(--status-error)";
                coreSection.classList.add("state-error");
                break;
            case "IDLE":
            default:
                coreStateText.textContent = "IDLE";
                coreStateText.style.color = "var(--accent-cyan)";
                break;
        }
    }

    // --- 4. Speech Synthesis (Voice Output) ---
    function initVoiceSynthesis() {
        if (!synth) {
            if (speechStatusVal) speechStatusVal.textContent = "VOICE N/A";
            return;
        }

        function populateVoices() {
            const voices = synth.getVoices();
            if (voices.length > 0) {
                // Find a clean, natural-sounding English voice
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
        if (!voiceEnabled || !synth) return;

        // Cancel any existing speech
        synth.cancel();

        // Clean out markdown symbols for cleaner speech
        const cleanSpeechText = text
            .replace(/\*\*/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/`{1,3}[^`]*`{1,3}/g, "code segment")
            .replace(/[#*_-]/g, " ")
            .trim();

        if (!cleanSpeechText) return;

        const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        utterance.rate = 1.05; // Slightly brisk, refined pace
        utterance.pitch = 0.95; // Slightly deeper, authoritative JARVIS tone

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

    // Voice toggle button handler
    if (voiceToggleBtn) {
        voiceToggleBtn.addEventListener("click", () => {
            voiceEnabled = !voiceEnabled;
            if (voiceEnabled) {
                voiceToggleBtn.classList.remove("muted");
                voiceLabel.textContent = "VOICE: ON";
                speakerIcon.textContent = "🔊";
                showToast("Voice synthesis activated");
            } else {
                if (synth) synth.cancel();
                voiceToggleBtn.classList.add("muted");
                voiceLabel.textContent = "VOICE: OFF";
                speakerIcon.textContent = "🔇";
                setCoreState("IDLE");
                showToast("Voice synthesis muted");
            }
        });
    }

    // --- 5. Web Speech Recognition (Voice Input) ---
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
            userInput.placeholder = "Listening to your voice command...";
            // If JARVIS is currently speaking, stop it when user starts speaking
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
                showToast("Microphone access denied. Check browser permissions.");
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
                submitMessage(finalQuery);
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
        // Speech recognition not supported in this browser
        if (micBtn) {
            micBtn.title = "Voice recognition not supported in this browser.";
            micBtn.style.opacity = "0.5";
            micBtn.addEventListener("click", () => {
                showToast("Web Speech Recognition is not supported by your browser. Please use Chrome.");
            });
        }
    }

    // --- 6. Chat Message Rendering ---
    function appendMessage(sender, text, groundingSources = []) {
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const bubble = document.createElement("div");
        bubble.className = `msg-bubble ${sender.toLowerCase()}-msg`;

        let sourcesHtml = "";
        if (groundingSources && groundingSources.length > 0) {
            sourcesHtml = `
                <div class="grounding-box">
                    <div class="grounding-title">SEARCH SOURCES & CITATIONS:</div>
                    ${groundingSources.map(s => `<a href="${s.uri}" target="_blank" rel="noopener noreferrer" class="source-item">🔗 ${s.title || 'Source'}</a>`).join("")}
                </div>
            `;
        }

        bubble.innerHTML = `
            <div class="msg-meta">
                <span class="sender-tag">${sender}</span>
                <span class="timestamp">${timeStr}</span>
            </div>
            <div class="msg-content">${escapeHtml(text)}</div>
            ${sourcesHtml}
        `;

        chatLog.appendChild(bubble);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // --- 7. Transmit Message to Backend ---
    async function submitMessage(messageText) {
        if (!messageText || messageText.trim() === "") return;

        // Render User Message
        appendMessage("USER", messageText);
        userInput.value = "";

        // UI Thinking state
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
            const replyText = data.reply || "No response received.";
            const sources = data.grounding_sources || [];

            // Render JARVIS response
            appendMessage("JARVIS", replyText, sources);

            // Trigger Voice Output if requested
            if (data.speak !== false && voiceEnabled) {
                speakText(replyText);
            } else {
                setCoreState("IDLE");
            }

        } catch (err) {
            console.error("Communication error:", err);
            const errReply = "JARVIS is unable to communicate with the local server. Please verify that the backend is running.";
            appendMessage("JARVIS", errReply);
            setCoreState("ERROR");
            showToast("Server communication error");
            setTimeout(() => setCoreState("IDLE"), 4000);
        }
    }

    // Form submit event
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = userInput.value.trim();
            if (text) {
                submitMessage(text);
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
                submitMessage(prompt);
            }
        });
    });

    // --- 8. Backend Health & API Check ---
    async function checkBackendStatus() {
        try {
            const res = await fetch("/api/status");
            if (res.ok) {
                const data = await res.json();
                if (modelNameVal && data.model) {
                    modelNameVal.textContent = data.model.toUpperCase();
                }
                if (!data.api_configured) {
                    showToast("Notice: GEMINI_API_KEY is not configured in .env", 6000);
                }
            }
        } catch (e) {
            if (statusText) statusText.textContent = "DISCONNECTED";
            if (systemStatusBadge) {
                systemStatusBadge.style.color = "var(--status-error)";
                systemStatusBadge.style.borderColor = "var(--status-error)";
                systemStatusBadge.style.background = "rgba(255, 51, 102, 0.1)";
            }
        }
    }
    checkBackendStatus();
});
