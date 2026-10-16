const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("chatMessages");
const downloadChatBtn = document.getElementById("downloadChatBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");

let isSoundEnabled = localStorage.getItem("chat_sound_enabled") !== "false";
function updateSoundBtnUI() {
    if (!soundToggleBtn) return;
    if (isSoundEnabled) {
        soundToggleBtn.classList.remove("is-muted");
        soundToggleBtn.title = "Sound: ON (क्लिक करून म्यूट करा)";
        soundToggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
        `;
    } else {
        soundToggleBtn.classList.add("is-muted");
        soundToggleBtn.title = "Sound: OFF (क्लिक करून चालू करा)";
        soundToggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
        `;
    }
}

if (soundToggleBtn) {
    updateSoundBtnUI();
    soundToggleBtn.addEventListener("click", () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem("chat_sound_enabled", isSoundEnabled ? "true" : "false");
        updateSoundBtnUI();
    });
}

function playSubtleAudio(type) {
    if (!isSoundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        if (type === "send") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.05);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        }
    } catch (_) {}
}

if (downloadChatBtn) {
    downloadChatBtn.addEventListener("click", function () {
        const chatRows = messages.querySelectorAll(".message");
        if (chatRows.length === 0) {
            alert("No conversation history to download yet.");
            return;
        }

        let transcript = "=======================================================\n";
        transcript += "NMD INFOTECH SERVICES - AI CHAT TRANSCRIPT\n";
        transcript += `Exported: ${new Date().toLocaleString()}\n`;
        transcript += "Website: https://www.nmdinfotechservices.com/\n";
        transcript += "Official WhatsApp & Phone: +91 9049442717 / +91 8830498811\n";
        transcript += "Registered Office: Office No. 11, 2nd Floor, Aditya Centeegra, FC Road, Shivajinagar, Pune 411005\n";
        transcript += "=======================================================\n\n";

        chatRows.forEach(row => {
            const isUser = row.classList.contains("user-message");
            const bubble = row.querySelector(".message-bubble");
            if (bubble && !bubble.classList.contains("typing")) {
                transcript += `[${isUser ? "User" : "NMD AI Assistant"}]:\n${bubble.textContent.trim()}\n\n`;
            }
        });

        const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NMD_Chat_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

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
    if (!replyText) return null;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "ai-bubble-actions";

    let speakBtn = null;
    if ("speechSynthesis" in window) {
        speakBtn = document.createElement("button");
        speakBtn.type = "button";
        speakBtn.className = "tts-speak-btn";
        speakBtn.title = "Listen to answer (ऐका / सुनिए / Listen)";
        speakBtn.innerHTML = `
            <svg class="tts-icon-speaker" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <span class="tts-label">Listen</span>
        `;

        speakBtn.addEventListener("click", () => {
            speakText(replyText, speakBtn);
        });

        actionsDiv.appendChild(speakBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "msg-copy-btn";
    copyBtn.title = "Copy response";
    copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="copy-label">Copy</span>
    `;

    copyBtn.addEventListener("click", () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(replyText).then(() => {
                const label = copyBtn.querySelector(".copy-label");
                if (label) {
                    label.textContent = "Copied!";
                    setTimeout(() => { label.textContent = "Copy"; }, 2000);
                }
            }).catch(() => {});
        }
    });

    actionsDiv.appendChild(copyBtn);

    // Thumbs Up Feedback Button
    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    likeBtn.className = "msg-feedback-btn";
    likeBtn.title = "Helpful answer (उपयुक्त उत्तर)";
    likeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
    `;

    // Thumbs Down Feedback Button
    const dislikeBtn = document.createElement("button");
    dislikeBtn.type = "button";
    dislikeBtn.className = "msg-feedback-btn";
    dislikeBtn.title = "Not helpful";
    dislikeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
        </svg>
    `;

    likeBtn.addEventListener("click", () => {
        likeBtn.classList.add("is-active-like");
        likeBtn.title = "Thanks for your feedback!";
        dislikeBtn.classList.remove("is-active-dislike");
        dislikeBtn.disabled = true;
    });

    dislikeBtn.addEventListener("click", () => {
        dislikeBtn.classList.add("is-active-dislike");
        dislikeBtn.title = "Feedback noted. We will improve!";
        likeBtn.classList.remove("is-active-like");
        likeBtn.disabled = true;
    });

    actionsDiv.appendChild(likeBtn);
    actionsDiv.appendChild(dislikeBtn);

    // Smart Lead Capture Action Chip for services/fees/contact inquiries
    if (/fee|fees|फीस|फी|admission|प्रवेश|course|courses|कोर्स|contact|संपर्क|address|पत्ता|9049442717|call|कॉल|consulting|शिका/i.test(replyText)) {
        const leadChip = document.createElement("a");
        leadChip.className = "ai-action-chip";
        leadChip.href = "https://wa.me/919049442717?text=Hello%20NMD%20Infotech%2C%20I%20would%20like%20to%20connect%20regarding%20courses%20and%20services";
        leadChip.target = "_blank";
        leadChip.rel = "noopener noreferrer";
        leadChip.innerHTML = `
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            <span>Connect on WhatsApp</span>
        `;
        actionsDiv.appendChild(leadChip);
    }

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

    playSubtleAudio("send");

    input.value = "";
    sendBtn.disabled = true;
    sendBtn.classList.add("is-sending");

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
        playSubtleAudio("receive");
    }
    catch (error) {
        const bubble = aiMessage.querySelector(".message-bubble");
        bubble.classList.remove("typing");
        finalFormatted = "Error - " + error.message;
        bubble.textContent = finalFormatted;
        playSubtleAudio("receive");
    }
    finally {
        sendBtn.disabled = false;
        sendBtn.classList.remove("is-sending");
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

                <h2>Welcome to NMD Infotech</h2>

                <p>
                    I am your AI Assistant for <strong>NMD Infotech Services</strong>.<br />
                    Ask me about our IT solutions, custom software, app development, or get in touch with our team!
                </p>

                <div class="suggestion-buttons">
                    <button type="button" class="suggestion-chip" onclick="sendSuggestion('What services does NMD Infotech provide?')">
                        <span>Our Services</span>
                        <span class="chip-arrow">→</span>
                    </button>

                    <button type="button" class="suggestion-chip" onclick="sendSuggestion('Tell me about Web and App Development')">
                        <span>Web &amp; Mobile Apps</span>
                        <span class="chip-arrow">→</span>
                    </button>

                    <button type="button" class="suggestion-chip" onclick="sendSuggestion('Tell me about Data Science and Analytics')">
                        <span>Data Analytics</span>
                        <span class="chip-arrow">→</span>
                    </button>

                    <button type="button" class="suggestion-chip" onclick="sendSuggestion('What is your office address and contact number?')">
                        <span>Contact &amp; Office</span>
                        <span class="chip-arrow">→</span>
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
    micLangBtn.className = "mic-lang-pill";
    micLangBtn.title = getVoiceLangTitle(currentVoiceLang);
    micLangBtn.textContent = getVoiceLangLabel(currentVoiceLang);
    sendBtn.parentElement.insertBefore(micLangBtn, sendBtn);
}

if (!micBtn && sendBtn && sendBtn.parentElement) {
    micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.id = "micBtn";
    micBtn.className = "mic-icon-btn";
    micBtn.title = "Voice Input";
    micBtn.setAttribute("aria-label", "Voice Input");
    micBtn.innerHTML = `<svg class="mic-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>`;
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