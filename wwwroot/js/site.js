const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("chatMessages");

async function sendMessage() {

    const text = input.value.trim();


    if (!text) return;

    // User message
    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";

    userMessage.innerHTML = `
        <div class="message-bubble">
            ${text}
        </div>
    `;

    messages.appendChild(userMessage);

    input.value = "";
    sendBtn.textContent = "Sending...";

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

        // Replace typing animation with AI response
        aiMessage.querySelector(".message-bubble").classList.remove("typing");

        aiMessage.querySelector(".message-bubble").textContent =
            data.response;
        sendBtn.textContent = "Send";

    }
    catch (error) {

        aiMessage.querySelector(".message-bubble").classList.remove("typing");

        aiMessage.querySelector(".message-bubble").textContent =
            "Error - " + error.message;
        sendBtn.textContent = "Send";
    }

    messages.scrollTop = messages.scrollHeight;
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

console.log("Suggestion buttons:", document.querySelectorAll(".suggestion-buttons button").length);

function sendSuggestion(text) {
    input.value = text;
    sendMessage();
}

const clearChatBtn = document.getElementById("clearChatBtn");

if (clearChatBtn) {
    clearChatBtn.addEventListener("click", function () {

        messages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">✨</div>

                <h2>Hello! 👋</h2>

                <p>
                    I'm your AI Assistant.<br />
                    How can I help you today?
                </p>

                <div class="suggestion-buttons">

                    <button onclick="sendSuggestion('What courses are available?')">
                        📚 Courses
                    </button>

                    <button onclick="sendSuggestion('Tell me about JP Shroff')">
                        💡 About JP Shroff
                    </button>

                    <button onclick="sendSuggestion('Tell me about Web Development')">
                        💻 Web Development
                    </button>

                </div>
            </div>
        `;

    });
}