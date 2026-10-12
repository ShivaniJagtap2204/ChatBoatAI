const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("chatMessages");

function formatResponseText(rawText) {
    if (!rawText) return "";

    // 1. Remove all markdown asterisks (**bold** and *italic* and bullet *)
    let text = rawText
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/^#{1,6}\s+/gm, "");

    return text.trim();
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    // User message
    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.innerHTML = `
        <div class="message-bubble">${text}</div>
    `;
    messages.appendChild(userMessage);

    input.value = "";
    sendBtn.textContent = "Sending...";
    sendBtn.disabled = true;

    // AI message with typing animation
    const aiMessage = document.createElement("div");
    aiMessage.className = "message ai-message";
    aiMessage.innerHTML = `
        <div class="ai-icon">NMD</div>
        <div class="message-bubble typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    messages.appendChild(aiMessage);
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch("/Chat/SendMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        const bubble = aiMessage.querySelector(".message-bubble");
        bubble.classList.remove("typing");
        bubble.textContent = formatResponseText(data.response);
    }
    catch (error) {
        const bubble = aiMessage.querySelector(".message-bubble");
        bubble.classList.remove("typing");
        bubble.textContent = "Error - " + error.message;
    }
    finally {
        sendBtn.textContent = "Send";
        sendBtn.disabled = false;
        messages.scrollTop = messages.scrollHeight;
    }
}

// Send button
sendBtn.addEventListener("click", sendMessage);

// Enter key
input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

function sendSuggestion(text) {
    input.value = text;
    sendMessage();
}

const clearChatBtn = document.getElementById("clearChatBtn");

if (clearChatBtn) {
    clearChatBtn.addEventListener("click", function () {
        messages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <img src="/images/company-logo.png.png" alt="NMD Logo" onerror="this.src='/images/company-logo.png';" />
                </div>

                <h2>Welcome to NMD Infotech! 👋</h2>

                <p>
                    I am your AI Assistant for <strong>NMD Infotech Services</strong>.<br />
                    Ask me about our IT solutions, custom software, app development, or get in touch with our team!
                </p>

                <div class="suggestion-buttons">
                    <button onclick="sendSuggestion('What services does NMD Infotech provide?')">
                        🌐 Our Services
                    </button>

                    <button onclick="sendSuggestion('Tell me about Web and App Development')">
                        💻 Web & Mobile Apps
                    </button>

                    <button onclick="sendSuggestion('Tell me about Data Science and Analytics')">
                        📊 Data Analytics
                    </button>

                    <button onclick="sendSuggestion('What is your office address and contact number?')">
                        📍 Contact & Office
                    </button>
                </div>
            </div>
        `;
    });
}

// Microphone / Voice Input
let micBtn = document.getElementById("micBtn");

// If the Razor view hasn't been rebuilt yet, inject the mic button dynamically next to Send button
if (!micBtn && sendBtn && sendBtn.parentElement) {
    micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.id = "micBtn";
    micBtn.className = "mic-btn";
    micBtn.title = "Voice Input";
    micBtn.setAttribute("aria-label", "Voice Input");
    micBtn.innerHTML = "🎤";
    sendBtn.parentElement.insertBefore(micBtn, sendBtn);
}

if (micBtn) {
    // Ensure mic button styles are applied even if chat.css is cached in the browser
    if (!document.getElementById("micBtnStyles")) {
        const style = document.createElement("style");
        style.id = "micBtnStyles";
        style.textContent = `
            .chat-input .mic-btn {
                width: 50px !important;
                height: 50px !important;
                min-width: 50px !important;
                padding: 0 !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 50% !important;
                background: #f8fafc !important;
                color: #0d47a1 !important;
                font-size: 20px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06) !important;
                flex-shrink: 0 !important;
                cursor: pointer !important;
            }
            .chat-input .mic-btn:hover {
                background: #eff6ff !important;
                border-color: #0d47a1 !important;
                transform: translateY(-1px);
            }
            .chat-input .mic-btn.listening {
                background: #ef4444 !important;
                border-color: #ef4444 !important;
                color: #ffffff !important;
                animation: micPulse 1.5s infinite !important;
            }
            @media (max-width: 768px) {
                .chat-input .mic-btn {
                    width: 46px !important;
                    height: 46px !important;
                    min-width: 46px !important;
                    font-size: 18px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const defaultPlaceholder = input.placeholder;
    let isListening = false;
    let useMediaRecorderFallback = !SpeechRecognition;
    let recognition = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let mediaStream = null;
    let silenceTimer = null;
    let maxRecordTimer = null;
    let audioContext = null;

    function resetMicUI() {
        isListening = false;
        micBtn.classList.remove("listening");
        micBtn.title = "Voice Input";
        input.placeholder = defaultPlaceholder;
    }

    function stopMediaRecording() {
        if (silenceTimer) {
            clearInterval(silenceTimer);
            silenceTimer = null;
        }
        if (maxRecordTimer) {
            clearTimeout(maxRecordTimer);
            maxRecordTimer = null;
        }
        if (audioContext) {
            audioContext.close().catch(function () {});
            audioContext = null;
        }
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
    }

    async function startMediaRecorderFallback() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone access is not available. Please ensure you are using HTTPS or localhost and allow microphone permissions.");
            return;
        }

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];

            let mimeType = "audio/webm";
            if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
                if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
                    mimeType = "audio/webm;codecs=opus";
                } else if (MediaRecorder.isTypeSupported("audio/webm")) {
                    mimeType = "audio/webm";
                } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
                    mimeType = "audio/mp4";
                } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
                    mimeType = "audio/ogg";
                }
            }

            mediaRecorder = new MediaRecorder(mediaStream);

            mediaRecorder.ondataavailable = function (event) {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async function () {
                if (mediaStream) {
                    mediaStream.getTracks().forEach(function (track) { track.stop(); });
                    mediaStream = null;
                }

                micBtn.classList.remove("listening");
                isListening = false;

                if (audioChunks.length === 0) {
                    resetMicUI();
                    return;
                }

                input.placeholder = "Converting voice to text...";
                micBtn.disabled = true;

                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || mimeType });
                const reader = new FileReader();

                reader.onloadend = async function () {
                    const base64Audio = reader.result;
                    try {
                        const response = await fetch("/Chat/TranscribeAudio", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                audioBase64: base64Audio,
                                mimeType: mediaRecorder.mimeType || mimeType
                            })
                        });

                        const data = await response.json();
                        if (response.ok && data.transcript) {
                            const text = data.transcript.trim();
                            if (text) {
                                input.value = (input.value ? input.value.trim() + " " : "") + text;
                                input.focus();
                            }
                        }
                    } catch (err) {
                        console.error("Voice transcription error:", err);
                    } finally {
                        micBtn.disabled = false;
                        resetMicUI();
                    }
                };

                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();
            isListening = true;
            micBtn.classList.add("listening");
            micBtn.title = "Listening... Click to stop";
            input.placeholder = "Listening... Speak now (click 🎤 to stop)";

            // Automatic silence detection so recording stops ~1.8s after user finishes speaking
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    audioContext = new AudioCtx();
                    const source = audioContext.createMediaStreamSource(mediaStream);
                    const analyser = audioContext.createAnalyser();
                    analyser.fftSize = 512;
                    source.connect(analyser);

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    let spokeOnce = false;
                    let silentSince = Date.now();

                    silenceTimer = setInterval(function () {
                        analyser.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) {
                            sum += dataArray[i];
                        }
                        const avg = sum / dataArray.length;

                        if (avg > 12) {
                            spokeOnce = true;
                            silentSince = Date.now();
                        } else if (spokeOnce && Date.now() - silentSince > 1800) {
                            stopMediaRecording();
                        }
                    }, 150);
                }
            } catch (e) {
                // Ignore AudioContext errors; manual stop and max timeout still work
            }

            // Safety auto-stop after 12 seconds
            maxRecordTimer = setTimeout(function () {
                stopMediaRecording();
            }, 12000);

        } catch (err) {
            resetMicUI();
            alert("Please allow microphone permission in your browser to use voice input.");
        }
    }

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = function () {
            isListening = true;
            micBtn.classList.add("listening");
            micBtn.title = "Listening... Click to stop";
            input.placeholder = "Listening... Speak now";
        };

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                input.value = (input.value ? input.value.trim() + " " : "") + transcript;
                input.focus();
            }
        };

        recognition.onend = function () {
            if (!useMediaRecorderFallback) {
                resetMicUI();
            }
        };

        recognition.onerror = function (event) {
            resetMicUI();
            // If browser blocks Web Speech API (e.g. Brave, Firefox, some mobile browsers), switch to MediaRecorder fallback
            if (event.error === "network" || event.error === "service-not-allowed" || event.error === "language-not-supported") {
                useMediaRecorderFallback = true;
                startMediaRecorderFallback();
            } else if (event.error === "not-allowed" || event.error === "permission-denied") {
                alert("Please allow microphone permission in your browser settings.");
            }
        };
    }

    micBtn.addEventListener("click", function () {
        if (isListening) {
            if (useMediaRecorderFallback) {
                stopMediaRecording();
            } else if (recognition) {
                recognition.stop();
            }
            return;
        }

        if (useMediaRecorderFallback) {
            startMediaRecorderFallback();
        } else {
            try {
                recognition.start();
            } catch (e) {
                useMediaRecorderFallback = true;
                startMediaRecorderFallback();
            }
        }
    });
}