const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("chatMessages");
const downloadChatBtn = document.getElementById("downloadChatBtn");

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

    // Expressive Natural / Neural / Human-sounding voices
    const isNatural = v => /natural|neural|online|multilingual|swara|aarohi|madhur|neerja|prabhat|google/i.test(v.name);
    const isRobotic = v => /desktop|sapi|david|zira|ravi desktop|heera desktop/i.test(v.name);

    // 1. Language exact match with an expressive Natural / Neural voice
    let match = voices.find(v => v.lang && v.lang.toLowerCase() === target && isNatural(v) && !isRobotic(v));
    if (match) return match;

    // 2. Language prefix match with Natural / Neural voice
    match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix) && isNatural(v) && !isRobotic(v));
    if (match) return match;

    // 3. Natural Marathi or Hindi voice
    if (prefix === "mr" || prefix === "hi") {
        match = voices.find(v => /marathi|hindi|aarohi|swara|madhur|kalpana/i.test(v.name) && isNatural(v));
        if (match) return match;
        match = voices.find(v => v.lang && (v.lang.toLowerCase().startsWith("mr") || v.lang.toLowerCase().startsWith("hi")) && isNatural(v));
        if (match) return match;
    }

    // 4. Natural Indian English female/male voice (e.g. Neerja, Prabhat)
    match = voices.find(v => (v.name.includes("Neerja") || v.name.includes("Prabhat") || v.lang === "en-IN") && isNatural(v));
    if (match) return match;

    // 5. Any Natural voice available on device
    match = voices.find(v => isNatural(v));
    if (match) return match;

    // 6. Regular fallback
    match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix) && !isRobotic(v));
    if (match) return match;

    return voices.find(v => !isRobotic(v)) || voices[0] || null;
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

    const detected = detectLanguage(text);
    let langCode = "en-IN";
    if (detected === "mr") langCode = "mr-IN";
    else if (detected === "hi") langCode = "hi-IN";

    // Natural human speech preprocessing
    let speechString = text
        .replace(/https?:\/\/[^\s]+/gi, detected === "mr" ? "अधिकृत वेबसाईटवर" : detected === "hi" ? "आधिकारिक वेबसाइट पर" : "on our official website")
        .replace(/•/g, " ")
        .replace(/₹\s*([0-9,]+)/g, (m, num) => detected === "mr" || detected === "hi" ? `${num} रुपये` : `${num} Rupees`)
        .replace(/₹/g, detected === "mr" || detected === "hi" ? " रुपये " : " Rupees ")
        .replace(/\bNMD\b/g, detected === "mr" || detected === "hi" ? "एन.एम.डी." : "N.M.D.")
        .replace(/\bAI\b/g, detected === "mr" || detected === "hi" ? "ए.आय." : "A.I.")
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, " ")
        .replace(/[*#_~`\[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\n+/g, ". ")
        .trim();

    if (!speechString) return;

    const utterance = new SpeechSynthesisUtterance(speechString);
    utterance.lang = langCode;
    utterance.rate = 0.94;
    utterance.pitch = 1.05;

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

    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    likeBtn.className = "msg-feedback-btn";
    likeBtn.title = "Helpful answer (उपयुक्त उत्तर)";
    likeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
    `;

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

    const wrap = aiMessageElement.querySelector(".ai-bubble-wrap");
    if (wrap) {
        wrap.appendChild(actionsDiv);
    } else {
        aiMessageElement.appendChild(actionsDiv);
    }

    return speakBtn;
}

// ===================================================
// INQUIRY & COUNSELING FORM SYSTEM
// ===================================================
function closeInquiryForm() {
    const inquiryView = document.getElementById("nmdInquiryView");
    const chatMsgs = document.getElementById("chatMessages");
    if (inquiryView) {
        inquiryView.style.display = "none";
        inquiryView.innerHTML = "";
    }
    if (chatMsgs) {
        chatMsgs.style.display = "flex";
    }
}

function showInquiryForm() {
    const inquiryView = document.getElementById("nmdInquiryView");
    const chatMsgs = document.getElementById("chatMessages");
    if (!inquiryView || !chatMsgs) return;

    chatMsgs.style.display = "none";
    inquiryView.style.display = "flex";

    inquiryView.innerHTML = `
        <div class="inquiry-header-bar">
            <button type="button" class="inquiry-back-btn" onclick="closeInquiryForm()" title="Back to Chat">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                <span>Back to Chat</span>
            </button>
            <button type="button" class="inquiry-close-x" onclick="closeInquiryForm()" title="Close Form">✕</button>
        </div>

        <div class="inquiry-company-card">
            <div class="inquiry-co-header">
                <img src="/images/nmd-logo.png" alt="NMD Logo" class="inquiry-co-logo" onerror="this.src='/images/company-logo.png.png';" />
                <div class="inquiry-co-info">
                    <h4>NMD Infotech Services Pvt. Ltd.</h4>
                    <p>FC Road, Shivajinagar, Pune • Official Inquiry Desk</p>
                </div>
            </div>
            <div class="inquiry-contact-chips">
                <span>📍 FC Road, Pune</span>
                <span>•</span>
                <span>📞 +91 9049442717</span>
                <span>•</span>
                <span>✉️ info@nmdinfotechservices.com</span>
            </div>
        </div>

        <form id="nmdOfficialInquiryForm" class="inquiry-main-form" onsubmit="handleInquirySubmit(event, this)">
            <div class="inquiry-field">
                <label>Full Name <span class="req">*</span></label>
                <input type="text" name="client_name" required placeholder="e.g. Navnath Darekar" autocomplete="name" />
            </div>

            <div class="inquiry-field">
                <label>Mobile / WhatsApp Number <span class="req">*</span></label>
                <input type="tel" name="client_phone" required pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number" autocomplete="tel" />
            </div>

            <div class="inquiry-field">
                <label>Interested Service / Course <span class="req">*</span></label>
                <select name="client_service">
                    <option value="Data Science & AI Training">Data Science &amp; AI Training (₹85k / 8 Mo)</option>
                    <option value="Data Analytics Training">Data Analytics (Power BI, SQL, Python)</option>
                    <option value="Full Stack Web Development">Full Stack Web &amp; Mobile App Development</option>
                    <option value="Custom Software Development">Custom Software Development</option>
                    <option value="Digital Marketing & AI">Digital Marketing &amp; AI Growth Tools</option>
                    <option value="General IT Consulting">General IT Consulting / Career Counseling</option>
                </select>
            </div>

            <div class="inquiry-field">
                <label>Preferred Mode</label>
                <select name="client_mode">
                    <option value="Pune Classroom (FC Road)">Pune Classroom (FC Road, Pune)</option>
                    <option value="Live Online Interactive">Live Online Interactive</option>
                    <option value="Weekend Fast-Track Batch">Weekend Fast-Track Batch</option>
                </select>
            </div>

            <div class="inquiry-actions">
                <button type="submit" class="inquiry-submit-btn">
                    <span>Submit Inquiry to NMD Team</span>
                    <span class="btn-arrow">→</span>
                </button>
            </div>

            <div class="inquiry-alt-connect">
                <span>Prefer immediate counseling?</span>
                <a href="https://wa.me/919049442717?text=Hi%20NMD%20Infotech,%20I%20have%20an%20inquiry%20regarding%20courses/services" target="_blank" rel="noopener noreferrer" class="inquiry-wa-direct">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm5.78 14.02c-.24.68-1.39 1.3-1.92 1.38-.49.08-1.12.11-3.64-.93-3.21-1.32-5.28-4.57-5.44-4.78-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.11-2.66.29-.32.63-.4.84-.4.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.63.89 2.16.97 2.32.08.16.13.35.03.56-.1.21-.16.34-.32.53-.16.19-.34.42-.49.56-.16.15-.33.32-.14.65.19.32.84 1.38 1.8 2.24 1.24 1.1 2.28 1.44 2.61 1.6.32.16.51.13.7-.08.19-.21.82-.95 1.04-1.28.22-.32.43-.27.73-.16.29.11 1.87.88 2.19 1.04.32.16.53.24.61.37.08.13.08.77-.16 1.45z"/></svg>
                    <span>Chat on WhatsApp (+91 9049442717)</span>
                </a>
            </div>

            <div class="inquiry-trust-strip">
                🔒 Official NMD Infotech Portal • 100% Confidential
            </div>
        </form>
    `;

    setTimeout(function () {
        const nameInput = inquiryView.querySelector('input[name="client_name"]');
        if (nameInput) nameInput.focus();
    }, 100);
}

function handleInquirySubmit(e, form) {
    e.preventDefault();
    const name = form.client_name.value.trim();
    const phone = form.client_phone.value.trim();
    const service = form.client_service.value;
    const mode = form.client_mode ? form.client_mode.value : "Classroom Pune";

    if (!name || phone.length !== 10 || isNaN(phone)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    try {
        const leads = JSON.parse(localStorage.getItem("nmd_chat_leads") || "[]");
        leads.push({ name: name, phone: phone, service: service, mode: mode, date: new Date().toLocaleString() });
        localStorage.setItem("nmd_chat_leads", JSON.stringify(leads));
    } catch (_) {}

    const inquiryView = document.getElementById("nmdInquiryView");
    if (inquiryView) {
        inquiryView.innerHTML = `
            <div class="inquiry-success-view">
                <div class="inquiry-success-icon">✓</div>
                <h3>Inquiry Received Successfully!</h3>
                <p>Thank you, <strong>${name}</strong>! Your inquiry for <strong>${service}</strong> (${mode}) has been logged with our Pune office. Our senior counselor will connect with you at <strong>+91 ${phone}</strong> within 15–30 minutes.</p>
                <div class="inquiry-success-sub">Returning to chat in a moment...</div>
            </div>
        `;
    }

    setTimeout(function () {
        closeInquiryForm();

        const confMsg = document.createElement("div");
        confMsg.className = "message ai-message";
        confMsg.innerHTML = `
            <div class="ai-icon" title="NMD Infotech">
                <img src="/images/nmd-logo.png" alt="NMD" onerror="this.src='/images/company-logo.png.png';" />
            </div>
            <div class="ai-bubble-wrap">
                <div class="message-bubble" style="border-left: 3px solid #10b981;">
                    <strong>Inquiry Received!</strong> Thank you, <strong>${name}</strong>. Your inquiry for <em>${service}</em> (${mode}) has been recorded. Our counselor from FC Road, Pune will contact you at <strong>+91 ${phone}</strong> shortly.
                </div>
            </div>
        `;
        messages.appendChild(confMsg);
        messages.scrollTop = messages.scrollHeight;
    }, 1500);
}

// Make inquiry form accessible globally
window.showInquiryForm = showInquiryForm;
window.closeInquiryForm = closeInquiryForm;
window.handleInquirySubmit = handleInquirySubmit;

async function sendMessage() {
    if (typeof closeInquiryForm === "function") {
        closeInquiryForm();
    }

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
    sendBtn.disabled = true;
    sendBtn.classList.add("is-sending");

    // AI message with typing animation inside wrapper
    const aiMessage = document.createElement("div");
    aiMessage.className = "message ai-message";
    aiMessage.innerHTML = `
        <div class="ai-icon" title="NMD Infotech">
            <img src="/images/nmd-logo.png" alt="NMD" onerror="if(!this.dataset.f){this.dataset.f='1';this.src='/images/company-logo.png.png';}else{this.style.display='none';this.parentElement.textContent='NMD';}" />
        </div>
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
window.sendSuggestion = sendSuggestion;

const clearChatBtn = document.getElementById("clearChatBtn");

if (clearChatBtn) {
    clearChatBtn.addEventListener("click", function () {
        stopSpeaking();
        if (typeof closeInquiryForm === "function") {
            closeInquiryForm();
        }
        location.reload();
    });
}

// Microphone / Voice Input with Marathi & English Live Speech-to-Text
let micBtn = document.getElementById("micBtn");
let micLangBtn = document.getElementById("micLangBtn");

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
    micBtn.innerHTML = `<svg class="mic-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>`;
    sendBtn.parentElement.insertBefore(micBtn, sendBtn);
}

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

        if (isListening && recognition) {
            recognition.stop();
            setTimeout(function () {
                startSpeechRecognition();
            }, 250);
        }
    });
}

if (micBtn) {
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
            recognition.interimResults = true;
            recognition.lang = currentVoiceLang;

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
