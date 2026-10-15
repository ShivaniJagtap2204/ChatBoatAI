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

function detectLanguage(text) {
    if (!text) return "en";
    const lower = text.toLowerCase();
    const hasDevanagari = /[\u0900-\u097F]/.test(text);

    if (hasDevanagari) {
        if (/ळ|ॅ|ऑ/.test(text) || /आहे|आहेत|किती|कुठे|कसा|कशी|कसे|सांग|सांगा|हवी|हवे|हवं|द्या|करा|माहिती|पत्ता|तपशील|काय|नमस्कार|शुल्क|होय|नाही|कोणते|कोणती|कोण|पाहिजे|शिकायचे|शिकायला|प्रवेश|फी/.test(text)) {
            return "mr";
        }
        if (/है|हैं|कितनी|कितना|कितने|कहाँ|कहा|कैसे|कैसा|कैसी|बताओ|बताइए|बताएं|चाहिए|दीजिए|दीजिये|नमस्ते|जानकारी|क्या|शुक्रिया|धन्यवाद|होगी|होगा|होंगे|सकते|सकती|सकता|रहते|रहती|करना|मुझको|मुझे|आपको|कब|कौन|कौनसा|कौनसी|फीस/.test(text)) {
            return "hi";
        }
        return "mr";
    }

    const marathiWords = /\b(kiti|ahe|ahet|kuthe|sang|sanga|kasa|kashi|kase|namaskar|mahiti|tula|mala|amhi|tumhi|kadhi|vichar|patta|shulk|deto|deta|karto|karu|shiku|pahije|nave|kay|ka|kon|konte|konti|madhe|var|khali|sangto|sangshil|dya)\b/i;
    const hindiWords = /\b(kitna|kitni|kitne|hai|hain|kaha|kahan|kaise|kaisa|kaisi|batao|bataiye|chahiye|namaste|dijiye|kya|shukriya|dhanyavad|kare|karega|karenge|mujhe|humko|aapko|hogi|hoga|honge|kab|kaun|kaunsa|kaunsi|karta|karti|karte)\b/i;

    if (marathiWords.test(lower)) return "mr";
    if (hindiWords.test(lower)) return "hi";
    return "en";
}

function transliterateHinglishToHindi(text) {
    if (!text) return "";
    if (/[\u0900-\u097F]/.test(text) && !/[a-zA-Z]/.test(text)) return text;

    let result = text;
    const phraseMap = [
        [/\bdata\s+science\s+with\s+ai\b/gi, "डेटा साइंस विद AI"],
        [/\bdata\s+science\b/gi, "डेटा साइंस"],
        [/\bdata\s+analytics\s+with\s+ai\b/gi, "डेटा एनालिटिक्स विद AI"],
        [/\bdata\s+analytics\b/gi, "डेटा एनालिटिक्स"],
        [/\bdata\s+analysis\b/gi, "डेटा एनालिसिस"],
        [/\bdigital\s+marketing\s+with\s+ai\b/gi, "डिजिटल मार्केटिंग विद AI"],
        [/\bdigital\s+marketing\b/gi, "डिजिटल मार्केटिंग"],
        [/\bweb\s+development\b/gi, "वेब डेवलपमेंट"],
        [/\bapp\s+development\b/gi, "ऐप डेवलपमेंट"],
        [/\bjp\s+shroff\b/gi, "जेपी श्रॉफ"],
        [/\bnavnath\s+darekar\b/gi, "नवनाथ दरेकर"],
        [/\bnmd\s+infotech\b/gi, "NMD इन्फोटेक"]
    ];

    for (const [regex, rep] of phraseMap) {
        result = result.replace(regex, rep);
    }

    const wordMap = {
        "fees": "फीस", "fee": "फीस", "kitni": "कितनी", "kitna": "कितना", "kitne": "कितने",
        "hai": "है", "hain": "हैं", "he": "है", "kaha": "कहाँ", "kahan": "कहाँ", "kidhar": "किधर",
        "kaise": "कैसे", "kaisa": "कैसा", "kaisi": "कैसी", "kya": "क्या", "kyun": "क्यों",
        "kab": "कब", "kaun": "कौन", "kon": "कौन", "aap": "आप", "tum": "तुम",
        "aapka": "आपका", "aapki": "आपकी", "aapke": "आपके", "mera": "मेरा", "meri": "मेरी",
        "mujhe": "मुझे", "hum": "हम", "main": "मैं", "batao": "बताओ", "bataiye": "बताइए",
        "chahiye": "चाहिए", "dijiye": "दीजिए", "karna": "करना", "kare": "करे", "karenge": "करेंगे",
        "course": "कोर्स", "courses": "कोर्सेस", "duration": "अवधि", "months": "महीने",
        "syllabus": "सिलेबस", "placement": "प्लेसमेंट", "job": "जॉब", "naukri": "नौकरी",
        "office": "ऑफिस", "pata": "पता", "address": "पता", "contact": "संपर्क", "number": "नंबर",
        "phone": "फोन", "services": "सेवाएं", "service": "सर्विस", "founder": "संस्थापक",
        "namaste": "नमस्ते", "dhanyavad": "धन्यवाद", "shukriya": "शुक्रिया", "aur": "और",
        "bhi": "भी", "me": "में", "mein": "में", "se": "से", "par": "पर", "ki": "की", "ka": "का", "ke": "के",
        "hoga": "होगा", "hogi": "होगी", "honge": "होंगे", "sakte": "सकते", "nahi": "नहीं", "haan": "हाँ",
        "pune": "पुणे", "shroff": "श्रॉफ"
    };

    result = result.replace(/\b[a-zA-Z]+\b/g, function (match) {
        const lower = match.toLowerCase();
        return wordMap[lower] || match;
    });

    return result;
}

function transliterateHinglishToMarathi(text) {
    if (!text) return "";
    if (/[\u0900-\u097F]/.test(text) && !/[a-zA-Z]/.test(text)) return text;

    let result = text;
    const phraseMap = [
        [/\bdata\s+science\b/gi, "डेटा सायन्स"],
        [/\bdata\s+analytics\b/gi, "डेटा अ‍ॅनालिटिक्स"],
        [/\bdigital\s+marketing\b/gi, "डिजिटल मार्केटिंग"],
        [/\bweb\s+development\b/gi, "वेब डेव्हलपमेंट"],
        [/\bapp\s+development\b/gi, "अ‍ॅप डेव्हलपमेंट"],
        [/\bjp\s+shroff\b/gi, "जेपी श्रॉफ"],
        [/\bnavnath\s+darekar\b/gi, "नवनाथ दरेकर"],
        [/\bnmd\s+infotech\b/gi, "NMD इन्फोटेक"]
    ];

    for (const [regex, rep] of phraseMap) {
        result = result.replace(regex, rep);
    }

    const wordMap = {
        "fee": "फी", "fees": "फी", "chi": "ची", "cha": "चा", "che": "चे",
        "kiti": "किती", "ahe": "आहे", "ahet": "आहेत", "kuthe": "कुठे", "kay": "काय",
        "kasa": "कसा", "kashi": "कशी", "kase": "कसे", "kadhi": "कधी", "kon": "कोण",
        "tula": "तुला", "mala": "मला", "tu": "तू", "sang": "सांग", "sanga": "सांगा",
        "mahiti": "माहिती", "course": "कोर्स", "duration": "कालावधी", "months": "महिने",
        "office": "ऑफिस", "patta": "पत्ता", "contact": "संपर्क", "number": "नंबर",
        "phone": "फोन", "services": "सर्व्हिसेस", "founder": "संस्थापक", "namaskar": "नमस्कार",
        "shroff": "श्रॉफ", "shikayche": "शिकायचे", "pahije": "पाहिजे"
    };

    result = result.replace(/\b[a-zA-Z]+\b/g, function (match) {
        const lower = match.toLowerCase();
        return wordMap[lower] || match;
    });

    return result;
}

// ===================================================
// TEXT-TO-SPEECH (TTS) SYSTEM
// ===================================================
let activeSpeakerBtn = null;
let lastInputWasVoice = false;

function stopSpeaking() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    if (activeSpeakerBtn) {
        activeSpeakerBtn.classList.remove("is-speaking");
        const label = activeSpeakerBtn.querySelector(".tts-label");
        if (label) label.textContent = "Listen";
        activeSpeakerBtn = null;
    }
}

function getBestVoiceForLanguage(langCode) {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;

    const target = (langCode || "en-IN").toLowerCase();
    const prefix = target.split("-")[0];

    // 1. Exact match e.g. "mr-in", "hi-in", "en-in"
    let match = voices.find(v => v.lang && v.lang.toLowerCase() === target);
    if (match) return match;

    // 2. Prefix match e.g. starts with "mr", "hi", "en"
    match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
    if (match) return match;

    // 3. Fallback for Marathi: if no Marathi voice on device, use Hindi voice
    if (prefix === "mr") {
        match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("hi"));
        if (match) return match;
    }

    // 4. Fallback to English (India) or first available voice
    return voices.find(v => v.lang && v.lang.toLowerCase().includes("in")) || voices[0] || null;
}

function speakText(text, btnElement) {
    if (!("speechSynthesis" in window)) {
        return;
    }

    if (activeSpeakerBtn === btnElement && btnElement) {
        stopSpeaking();
        return;
    }

    stopSpeaking();

    let speechString = text
        .replace(/•/g, " ")
        .replace(/₹/g, "Rupees ")
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, " ")
        .replace(/\n+/g, ". ")
        .trim();

    if (!speechString) return;

    const detected = detectLanguage(speechString);
    let langCode = "en-IN";
    if (detected === "mr") langCode = "mr-IN";
    else if (detected === "hi") langCode = "hi-IN";

    const utterance = new SpeechSynthesisUtterance(speechString);
    utterance.lang = langCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voice = getBestVoiceForLanguage(langCode);
    if (voice) {
        utterance.voice = voice;
    }

    if (btnElement) {
        activeSpeakerBtn = btnElement;
        btnElement.classList.add("is-speaking");
        const label = btnElement.querySelector(".tts-label");
        if (label) label.textContent = "Stop";
    }

    utterance.onend = function () {
        stopSpeaking();
    };

    utterance.onerror = function () {
        stopSpeaking();
    };

    window.speechSynthesis.speak(utterance);
}

if ("speechSynthesis" in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

function appendTTSButton(aiMessageElement, replyText) {
    if (!replyText || !("speechSynthesis" in window)) return null;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "ai-bubble-actions";

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "tts-speak-btn";
    speakBtn.title = "Listen to answer (ऐका / सुनिए / Listen)";
    speakBtn.innerHTML = `
        <svg class="tts-icon-speaker" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <span class="tts-label">Listen</span>
    `;

    speakBtn.addEventListener("click", () => {
        speakText(replyText, speakBtn);
    });

    actionsDiv.appendChild(speakBtn);
    const wrap = aiMessageElement.querySelector(".ai-bubble-wrap");
    if (wrap) {
        wrap.appendChild(actionsDiv);
    } else {
        aiMessageElement.appendChild(actionsDiv);
    }

    return speakBtn;
}

async function sendMessage() {
    const rawText = input.value.trim();
    if (!rawText) return;

    const lang = detectLanguage(rawText);
    let displayText = rawText;

    if (lang === "hi" && /[a-zA-Z]/.test(rawText)) {
        displayText = transliterateHinglishToHindi(rawText);
    } else if (lang === "mr" && /[a-zA-Z]/.test(rawText)) {
        displayText = transliterateHinglishToMarathi(rawText);
    }

    // User message
    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.innerHTML = `
        <div class="message-bubble">${displayText}</div>
    `;
    messages.appendChild(userMessage);

    input.value = "";
    sendBtn.textContent = "Sending...";
    sendBtn.disabled = true;

    // AI message with typing animation inside wrapper
    const aiMessage = document.createElement("div");
    aiMessage.className = "message ai-message";
    aiMessage.innerHTML = `
        <div class="ai-icon">NMD</div>
        <div class="ai-bubble-wrap">
            <div class="message-bubble typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    messages.appendChild(aiMessage);
    messages.scrollTop = messages.scrollHeight;

    let finalFormatted = "";
    try {
        const response = await fetch("/Chat/SendMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: displayText
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        const bubble = aiMessage.querySelector(".message-bubble");
        bubble.classList.remove("typing");
        finalFormatted = formatResponseText(data.response);
        bubble.textContent = finalFormatted;
    }
    catch (error) {
        const bubble = aiMessage.querySelector(".message-bubble");
        bubble.classList.remove("typing");
        finalFormatted = "Error - " + error.message;
        bubble.textContent = finalFormatted;
    }
    finally {
        sendBtn.textContent = "Send";
        sendBtn.disabled = false;
        messages.scrollTop = messages.scrollHeight;
    }

    // Append TTS speaker button
    if (finalFormatted && !finalFormatted.startsWith("Error")) {
        const speakBtn = appendTTSButton(aiMessage, finalFormatted);
        if (lastInputWasVoice && speakBtn) {
            speakText(finalFormatted, speakBtn);
        }
    }
    lastInputWasVoice = false;
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

input.addEventListener("input", function () {
    lastInputWasVoice = false;
});

function sendSuggestion(text) {
    input.value = text;
    sendMessage();
}

const clearChatBtn = document.getElementById("clearChatBtn");

if (clearChatBtn) {
    clearChatBtn.addEventListener("click", function () {
        stopSpeaking();
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

// Selected voice language: default to Marathi (mr-IN), support Hindi (hi-IN) and English (en-IN)
let currentVoiceLang = localStorage.getItem("chat_mic_lang") || "mr-IN";

function getVoiceLangLabel(lang) {
    if (lang === "mr-IN") return "मराठी";
    if (lang === "hi-IN") return "हिंदी";
    return "English";
}

function getVoiceLangTitle(lang) {
    if (lang === "mr-IN") return "सध्याची व्हॉईस भाषा: मराठी (क्लिक करून हिंदी करा)";
    if (lang === "hi-IN") return "वर्तमान वॉइस भाषा: हिंदी (Click for English)";
    return "Current Voice Language: English (क्लिक करून मराठी करा)";
}

// If the Razor view hasn't been rebuilt yet, inject the mic buttons dynamically next to Send button
if (!micLangBtn && sendBtn && sendBtn.parentElement) {
    micLangBtn = document.createElement("button");
    micLangBtn.type = "button";
    micLangBtn.id = "micLangBtn";
    micLangBtn.className = "mic-lang-btn";
    micLangBtn.title = getVoiceLangTitle(currentVoiceLang);
    micLangBtn.textContent = getVoiceLangLabel(currentVoiceLang);
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
        micLangBtn.textContent = getVoiceLangLabel(currentVoiceLang);
        micLangBtn.title = getVoiceLangTitle(currentVoiceLang);
    }
}

if (micLangBtn) {
    updateLangButtonUI();
    micLangBtn.addEventListener("click", function () {
        if (currentVoiceLang === "en-IN") {
            currentVoiceLang = "mr-IN";
        } else if (currentVoiceLang === "mr-IN") {
            currentVoiceLang = "hi-IN";
        } else {
            currentVoiceLang = "en-IN";
        }
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
                micBtn.title = "ऐकत आहे... बोलणे झाल्यावर 🎤 पुन्हा दाबा आणि Send बटण दाबा";
                input.placeholder = currentVoiceLang === "mr-IN"
                    ? "🎤 मराठीत बोला... तुमचे बोलणे येथे लाईव्ह टाईप होत आहे"
                    : currentVoiceLang === "hi-IN"
                    ? "🎤 हिंदी में बोलें... आपका बोलना यहाँ टाइप हो रहा है"
                    : "🎤 Listening... Words are appearing live";
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

                let currentSpoken = (finalTranscript + interimTranscript).trim();
                if (currentSpoken) {
                    if (currentVoiceLang === "hi-IN" && /[a-zA-Z]/.test(currentSpoken)) {
                        currentSpoken = transliterateHinglishToHindi(currentSpoken);
                    } else if (currentVoiceLang === "mr-IN" && /[a-zA-Z]/.test(currentSpoken)) {
                        currentSpoken = transliterateHinglishToMarathi(currentSpoken);
                    }
                    input.value = (initialTextBeforeMic ? initialTextBeforeMic + " " : "") + currentSpoken;
                    lastInputWasVoice = true;
                    input.focus();
                    input.scrollLeft = input.scrollWidth;
                }

                // Silence detection: stop listening after pause, but DO NOT auto-send!
                if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
                speechSilenceTimer = setTimeout(function () {
                    if (isListening && recognition) {
                        try { recognition.stop(); } catch (_) {}
                        resetMicUI();
                        input.focus();
                    }
                }, 1800);
            };

            recognition.onerror = function (event) {
                if (event.error === "no-speech") {
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
                                lastInputWasVoice = true;
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
            if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
            if (useMediaRecorderFallback) {
                stopMediaRecording();
            } else if (recognition) {
                try { recognition.stop(); } catch (_) {}
            }
            resetMicUI();
            input.focus();
            return;
        }

        if (useMediaRecorderFallback) {
            startMediaRecorderFallback();
        } else {
            startSpeechRecognition();
        }
    });
}