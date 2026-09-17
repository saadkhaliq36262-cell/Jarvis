/**
 * script.js - JARVIS Frontend Controller for Vercel Serverless Architecture
 * Handles Web Speech Recognition, Speech Synthesis, Safe Local Commands, and API interaction.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const liveTimeEl = document.getElementById("live-time");
    const liveDateEl = document.getElementById("live-date");
    const initTimeEl = document.getElementById("init-time");
    const coreStateText = document.getElementById("core-state-text");
    const systemStatusBadge = document.getElementById("system-status-badge");
    const statusText = document.getElementById("status-text");
    const waveVisualizer = document.getElementById("wave-visualizer");
    const coreSection = document.querySelector(".core-section");
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

    // --- 3. UI State Management (IDLE, LISTENING, THINKING, SPEAKING, ERROR) ---
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

    // --- 4. Speech Synthesis (Voice Output) ---
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
                showToast("Microphone access denied. Please allow microphone permissions in Chrome.");
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

    // --- 7. Safe Predefined Client Commands ---
    function checkSafeClientCommands(message) {
        const clean = message.toLowerCase()
            .replace(/^(hey\s+|hi\s+|ok\s+)?jarvis[,\s:]*/i, "")
            .trim()
            .replace(/[.?!]+$/, "");

        // 1. YouTube Command
        const ytPatterns = [
            /\b(open|launch|start|go to)\s+youtube\b/i,
            /\byoutube\s+(please|now)\b/i,
            /^youtube$/i
        ];
        if (ytPatterns.some(p => p.test(clean))) {
            window.open("https://www.youtube.com", "_blank", "noopener,noreferrer");
            return {
                reply: "Opening YouTube in a new tab for you now, sir.",
                speak: true
            };
        }

        // 2. Current Time Command
        const timePatterns = [
            /\b(what\s+time\s+is\s+it|what['']?s\s+the\s+time|current\s+time|tell\s+me\s+the\s+time|time\s+now)\b/i
        ];
        if (timePatterns.some(p => p.test(clean))) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
            return {
                reply: `The current time is ${timeStr}.`,
                speak: true
            };
        }

        // 3. Current Date Command
        const datePatterns = [
            /\b(what\s+is\s+today['']?s\s+date|what['']?s\s+the\s+date|today['']?s\s+date|current\s+date|what\s+day\s+is\s+it)\b/i
        ];
        if (datePatterns.some(p => p.test(clean))) {
            const now = new Date();
            const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
            const dateStr = now.toLocaleDateString("en-US", options);
            return {
                reply: `Today is ${dateStr}.`,
                speak: true
            };
        }

        return null;
    }

    // --- 8. Submission Pipeline (Local Safe Commands + Gemini Serverless API) ---
    async function handleUserSubmission(messageText) {
        if (!messageText || messageText.trim() === "") return;

        // Render User Message
        appendMessage("USER", messageText);
        userInput.value = "";

        // 1. Check local safe commands first (Time, Date, YouTube)
        const localResult = checkSafeClientCommands(messageText);
        if (localResult) {
            appendMessage("JARVIS", localResult.reply);
            if (localResult.speak && voiceEnabled) {
                speakText(localResult.reply);
            } else {
                setCoreState("IDLE");
            }
            return;
        }

        // 2. Query Serverless Gemini API Route
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

            // Trigger Voice Output
            if (data.speak !== false && voiceEnabled) {
                speakText(replyText);
            } else {
                setCoreState("IDLE");
            }

        } catch (err) {
            console.error("Communication error:", err);
            const errReply = "JARVIS is unable to communicate with the serverless API. Please ensure the application is running or deployed with valid environment configuration.";
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
