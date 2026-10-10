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