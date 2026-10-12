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

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        let isListening = false;
        const defaultPlaceholder = input.placeholder;

        micBtn.addEventListener("click", function () {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = function () {
            isListening = true;
            micBtn.classList.add("listening");
            micBtn.title = "Listening... Click to stop";
            input.placeholder = "Listening... Speak now";
        };

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            input.value = (input.value ? input.value + " " : "") + transcript;
            input.focus();
        };

        recognition.onend = function () {
            isListening = false;
            micBtn.classList.remove("listening");
            micBtn.title = "Voice Input";
            input.placeholder = defaultPlaceholder;
        };

        recognition.onerror = function () {
            isListening = false;
            micBtn.classList.remove("listening");
            micBtn.title = "Voice Input";
            input.placeholder = defaultPlaceholder;
        };
    } else {
        micBtn.addEventListener("click", function () {
            alert("Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
        });
    }
}