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

// Microphone / Voice Input with Marathi & English Live Speech-to-Text
let micBtn = document.getElementById("micBtn");
let micLangBtn = document.getElementById("micLangBtn");

// Selected voice language: default to Marathi (mr-IN), fallback to English (en-IN)
let currentVoiceLang = localStorage.getItem("chat_mic_lang") || "mr-IN";

// If the Razor view hasn't been rebuilt yet, inject the mic buttons dynamically next to Send button
if (!micLangBtn && sendBtn && sendBtn.parentElement) {
    micLangBtn = document.createElement("button");
    micLangBtn.type = "button";
    micLangBtn.id = "micLangBtn";
    micLangBtn.className = "mic-lang-btn";
    micLangBtn.title = "व्हॉईस भाषा बदला (मराठी / English)";
    micLangBtn.textContent = currentVoiceLang === "mr-IN" ? "मराठी" : "English";
    sendBtn.parentElement.insertBefore(micLangBtn, sendBtn);
}

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

// Update language button text
function updateLangButtonUI() {
    if (micLangBtn) {
        micLangBtn.textContent = currentVoiceLang === "mr-IN" ? "मराठी" : "English";
        micLangBtn.title = currentVoiceLang === "mr-IN"
            ? "सध्याची भाषा: मराठी (क्लिक करून English करा)"
            : "Current Language: English (Click to switch to Marathi)";
    }
}

if (micLangBtn) {
    updateLangButtonUI();
    micLangBtn.addEventListener("click", function () {
        currentVoiceLang = currentVoiceLang === "mr-IN" ? "en-IN" : "mr-IN";
        localStorage.setItem("chat_mic_lang", currentVoiceLang);
        updateLangButtonUI();

        // If currently listening, restart with new language
        if (isListening && recognition) {
            recognition.stop();
            setTimeout(function () {
                startSpeechRecognition();
            }, 250);
        }
    });
}

if (micBtn) {
    // Ensure mic and language button styles are applied even if chat.css is cached
    if (!document.getElementById("micBtnStyles")) {
        const style = document.createElement("style");
        style.id = "micBtnStyles";
        style.textContent = `
            .chat-input .mic-lang-btn {
                height: 38px !important;
                min-width: 60px !important;
                padding: 0 10px !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 19px !important;
                background: #f1f5f9 !important;
                color: #0d47a1 !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-shrink: 0 !important;
            }
            .chat-input .mic-lang-btn:hover {
                background: #e2e8f0 !important;
                border-color: #0d47a1 !important;
                transform: translateY(-1px) !important;
            }
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
                transform: translateY(-1px) !important;
            }
            .chat-input .mic-btn.listening {
                background: #ef4444 !important;
                border-color: #ef4444 !important;
                color: #ffffff !important;
                animation: micPulse 1.5s infinite !important;
            }
            @media (max-width: 768px) {
                .chat-input .mic-lang-btn {
                    height: 36px !important;
                    min-width: 52px !important;
                    font-size: 12px !important;
                    padding: 0 6px !important;
                }
                .chat-input .mic-btn {
                    width: 44px !important;
                    height: 44px !important;
                    min-width: 44px !important;
                    font-size: 18px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const defaultPlaceholder = input.placeholder;
    var isListening = false;
    let useMediaRecorderFallback = !SpeechRecognition;
    var recognition = null;
    let finalTranscript = "";
    let initialTextBeforeMic = "";
    let speechSilenceTimer = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let mediaStream = null;
    let silenceTimer = null;
    let maxRecordTimer = null;
    let audioContext = null;

    function resetMicUI() {
        isListening = false;
        micBtn.classList.remove("listening");
        micBtn.title = "Voice Input (क्लिक करून बोला)";
        input.placeholder = defaultPlaceholder;
        if (speechSilenceTimer) {
            clearTimeout(speechSilenceTimer);
            speechSilenceTimer = null;
        }
    }

    function startSpeechRecognition() {
        if (!SpeechRecognition) {
            useMediaRecorderFallback = true;
            startMediaRecorderFallback();
            return;
        }

        try {
            if (recognition) {
                try { recognition.abort(); } catch (e) { }
            }

            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true; // LIVE REAL-TIME transcription while user is speaking!
            recognition.lang = currentVoiceLang; // "mr-IN" for Marathi or "en-IN" for English

            initialTextBeforeMic = input.value.trim();
            finalTranscript = "";

            recognition.onstart = function () {
                isListening = true;
                micBtn.classList.add("listening");
                micBtn.title = currentVoiceLang === "mr-IN"
                    ? "ऐकत आहे (मराठी)... बोलणे थांबल्यावर आपोआप टाईप होईल"
                    : "Listening... Speak now";
                input.placeholder = currentVoiceLang === "mr-IN"
                    ? "🎤 मराठीत बोला... तुमचे बोलणे येथे लाईव्ह दिसेल"
                    : "🎤 Listening... Speak now";
            };

            // Stream words in real-time into the text box as they are spoken
            recognition.onresult = function (event) {
                let interimTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const chunk = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += chunk + " ";
                    } else {
                        interimTranscript += chunk;
                    }
                }

                const currentSpoken = (finalTranscript + interimTranscript).trim();
                if (currentSpoken) {
                    input.value = (initialTextBeforeMic ? initialTextBeforeMic + " " : "") + currentSpoken;
                }

                // Automatic silence detection: when user pauses for 1.6s, auto-stop mic and finalize
                if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
                speechSilenceTimer = setTimeout(function () {
                    if (isListening && recognition) {
                        recognition.stop();
                    }
                }, 1600);
            };

            recognition.onerror = function (event) {
                if (event.error === "no-speech") {
                    // Ignore empty pause
                    return;
                }
                resetMicUI();
                if (event.error === "network" || event.error === "service-not-allowed" || event.error === "language-not-supported") {
                    useMediaRecorderFallback = true;
                    startMediaRecorderFallback();
                } else if (event.error === "not-allowed" || event.error === "permission-denied") {
                    alert("कृपया तुमच्या ब्राउझरमध्ये मायक्रोफोनची परवानगी (Microphone Permission) Allow करा.");
                }
            };

            recognition.onend = function () {
                resetMicUI();
                input.focus();
            };

            recognition.start();
        } catch (e) {
            console.error("Speech recognition start error:", e);
            useMediaRecorderFallback = true;
            startMediaRecorderFallback();
        }
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

                input.placeholder = "रूपांतरित करत आहे (Converting voice to text)...";
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
            input.placeholder = currentVoiceLang === "mr-IN"
                ? "🎤 मराठीत बोला (थांबण्यासाठी पुन्हा 🎤 दाबा)"
                : "🎤 Speaking... Click 🎤 to stop";

            // Fast silence detection stops 900ms after user finishes speaking
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
                        } else if (spokeOnce && Date.now() - silentSince > 900) {
                            stopMediaRecording();
                        }
                    }, 120);
                }
            } catch (e) { }

            // Safety timeout after 8 seconds
            maxRecordTimer = setTimeout(function () {
                stopMediaRecording();
            }, 8000);

        } catch (err) {
            resetMicUI();
            alert("Please allow microphone permission in your browser.");
        }
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
            startSpeechRecognition();
        }
    });
}