using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;

namespace ChatBoatAI.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;
        private static int _activeKeyIndex = 0;
        private static readonly object _keyLock = new();

        public GeminiService(HttpClient httpClient, IConfiguration configuration, IMemoryCache cache)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _cache = cache;

            // Maximum time to wait for Gemini
            _httpClient.Timeout = TimeSpan.FromSeconds(45);
        }

        // Read knowledge from TXT file
        private string GetKnowledge()
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "KnowledgeBase.txt");

            if (!File.Exists(filePath))
            {
                throw new Exception("Knowledge file not found: " + filePath);
            }

            return File.ReadAllText(filePath);
        }

        // Get list of configured API keys (supports comma-separated multiple keys)
        private List<string> GetConfiguredKeys()
        {
            var rawKeys = _configuration["Gemini:ApiKey"] ?? _configuration["Gemini:ApiKeys"] ?? "";
            return rawKeys.Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                          .ToList();
        }

        public async Task<string> GetResponseAsync(string message)
        {
            if (string.IsNullOrWhiteSpace(message))
                return "Please enter a question.";

            var trimmedMessage = message.Trim();
            var normalizedMessage = trimmedMessage.ToLowerInvariant();

            // 1. Instant reply for common greetings and contact requests to save API quota
            if (IsCommonGreeting(normalizedMessage, out string instantReply))
            {
                return instantReply;
            }

            // 2. Check In-Memory Cache (serves frequent / identical questions instantly with 0 quota cost)
            var cacheKey = $"chat_query_{normalizedMessage}";
            if (_cache.TryGetValue(cacheKey, out string? cachedResponse) && !string.IsNullOrWhiteSpace(cachedResponse))
            {
                return cachedResponse;
            }

            // 3. Get API Keys
            var apiKeys = GetConfiguredKeys();
            if (apiKeys.Count == 0)
            {
                throw new Exception("Gemini API key is missing. Please configure Gemini:ApiKey.");
            }

            // Read Knowledge Base
            var knowledge = GetKnowledge();

            // Create prompt with strict no-asterisks formatting and general knowledge fallback
            var prompt = $@"You are the official AI Assistant for NMD Infotech Services (Pune, Maharashtra, India), and also a helpful general-purpose AI assistant.

KNOWLEDGE BASE:
{knowledge}

USER QUESTION: {trimmedMessage}

CRITICAL INSTRUCTIONS & FORMATTING RULES:
1. WEBSITE / COMPANY QUESTIONS:
   - If the question is about NMD Infotech Services, our IT services (Web Development, App Development, Data Science, Data Analysis, Digital Marketing, Game Development, Business Consulting), founder, or contact details, use the Knowledge Base above.
   - For contact information, provide Phone/WhatsApp: +91 9049442717, Email: info@nmdinfotechservices.com, Office: Office No. 11, Second Floor, Aditya Centeegra, FC Road, Shivajinagar, Pune 411005.
2. GENERAL QUESTIONS (NOT RELATED TO THE WEBSITE):
   - If the user asks ANY question that is not related to the website or company (e.g., general knowledge, technology, coding, science, definitions, or any general topic), answer it directly, accurately, and helpfully using your own Gemini AI knowledge!
   - Never refuse general questions or say 'information is not in the knowledge base' for general topics.
3. STRICTLY NO STARS OR ASTERISKS:
   - Do NOT use markdown bold asterisks (** or *). Do NOT output star characters anywhere in your response.
4. FORMATTING & TONE:
   - Use clean, well-spaced paragraphs. For lists, use clean bullets like '• ' or simple numbers (1, 2, 3) or dashes (-).
   - Keep the language professional, polite, clear, and easy to understand.
";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new
                            {
                                text = prompt
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.4,
                    maxOutputTokens = 1000
                }
            };

            var jsonPayload = JsonSerializer.Serialize(requestBody);

            // 4. Try keys with auto-fallback on 429 quota limits
            int startIndex;
            lock (_keyLock)
            {
                startIndex = _activeKeyIndex % apiKeys.Count;
            }

            bool encounteredQuotaLimit = false;

            for (int keyAttempt = 0; keyAttempt < apiKeys.Count; keyAttempt++)
            {
                int currentKeyIndex = (startIndex + keyAttempt) % apiKeys.Count;
                var currentKey = apiKeys[currentKeyIndex];

                try
                {
                    var rawAnswer = await CallGeminiApiAsync(currentKey, jsonPayload);
                    var cleanAnswer = CleanFormatting(rawAnswer);

                    if (!string.IsNullOrWhiteSpace(cleanAnswer))
                    {
                        // Cache response for 24 hours so repeat questions consume 0 API quota
                        _cache.Set(cacheKey, cleanAnswer, TimeSpan.FromHours(24));

                        // Set active key to current successful key
                        lock (_keyLock)
                        {
                            _activeKeyIndex = currentKeyIndex;
                        }

                        return cleanAnswer;
                    }
                }
                catch (QuotaExceededException)
                {
                    encounteredQuotaLimit = true;
                    // Rotate to next key if available
                    lock (_keyLock)
                    {
                        _activeKeyIndex = (currentKeyIndex + 1) % apiKeys.Count;
                    }
                    continue; // Try next key
                }
                catch (Exception)
                {
                    if (keyAttempt == apiKeys.Count - 1)
                        throw;
                }
            }

            if (encounteredQuotaLimit)
            {
                return "Our AI assistant is currently experiencing high traffic. Please wait a few seconds and try again.";
            }

            throw new Exception("Unable to get response from Gemini. Please try again.");
        }

        private async Task<string> CallGeminiApiAsync(string apiKey, string jsonPayload)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key={apiKey}";

            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    using var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync(url, content);
                    var responseJson = await response.Content.ReadAsStringAsync();

                    // 429 = Rate limit / Quota exceeded
                    if ((int)response.StatusCode == 429)
                    {
                        throw new QuotaExceededException("Quota exceeded for this API key.");
                    }

                    // 503 = Model busy -> quick retry
                    if ((int)response.StatusCode == 503 && attempt < 2)
                    {
                        await Task.Delay(2000);
                        continue;
                    }

                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception($"Gemini API Error: {responseJson}");
                    }

                    using var document = JsonDocument.Parse(responseJson);
                    var answer = document.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();

                    return answer ?? "No response received.";
                }
                catch (TaskCanceledException)
                {
                    if (attempt == 2)
                        throw new Exception("Gemini request timed out. Please try again.");

                    await Task.Delay(1500);
                }
            }

            return "";
        }

        // Clean any residual markdown asterisks or formatting so stars never appear in the output
        private static string CleanFormatting(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";

            // Remove markdown headers
            var cleaned = Regex.Replace(text, @"^#{1,6}\s*", "", RegexOptions.Multiline);

            // Replace markdown bullet points (* item) with clean bullet (• item)
            cleaned = Regex.Replace(cleaned, @"^\s*[\*]\s+", "• ", RegexOptions.Multiline);

            // Remove all bold/italic markdown asterisks
            cleaned = cleaned.Replace("**", "").Replace("*", "");

            return cleaned.Trim();
        }

        private bool IsCommonGreeting(string message, out string reply)
        {
            reply = "";
            var simple = message.Replace("?", "").Replace("!", "").Replace(".", "").Trim();

            if (simple == "hi" || simple == "hello" || simple == "hey" || simple == "hii" || simple == "hiii" ||
                simple == "namaste" || simple == "good morning" || simple == "good evening" || simple == "good afternoon")
            {
                reply = "Hello! 👋 Welcome to NMD Infotech Services. I am your AI Assistant. How can I assist you with our Web Development, Mobile Apps, Data Science, Data Analysis, Digital Marketing, or Business Consulting services today?";
                return true;
            }

            if (simple == "who are you" || simple == "what is your name")
            {
                reply = "I am the official AI Assistant for NMD Infotech Services (Pune). I can help you with information about our IT services, custom software, app development, data analytics, digital marketing, and contact details!";
                return true;
            }

            if (simple == "what services does nmd infotech provide" || simple == "our services" || simple == "services")
            {
                reply = "NMD Infotech Services offers comprehensive IT and digital solutions tailored to your business:\n\n• Web Development (Custom websites, React, Angular, ASP.NET Core, E-commerce)\n• Mobile App Development (iOS, Android, and Cross-Platform Apps)\n• Data Science & Machine Learning\n• Data Analysis & Power BI Dashboards\n• Digital Marketing (SEO, Social Media Marketing, Google Ads)\n• Game Development (Interactive 2D & 3D Games)\n• Strategic Business & IT Consulting";
                return true;
            }

            if (simple == "tell me about web and app development")
            {
                reply = "At NMD Infotech Services, we build high-performance Web and Mobile Applications:\n\n• Web Development: Responsive corporate websites, SaaS platforms, and e-commerce portals using React, Angular, ASP.NET Core, Node.js, and modern databases.\n• Mobile App Development: User-friendly Android, iOS, and cross-platform apps (Flutter / React Native) with secure backend APIs and Play Store / App Store deployment.";
                return true;
            }

            if (simple == "tell me about data science and analytics")
            {
                reply = "Our Data Science and Data Analysis services help transform raw numbers into actionable business growth:\n\n• Data Analysis: KPI tracking, interactive Power BI & Tableau dashboards, SQL reporting, and business intelligence.\n• Data Science: Data cleansing, predictive modeling, machine learning algorithms, and automated insights to drive smarter business decisions.";
                return true;
            }

            if (simple == "what is your office address and contact number" || simple == "contact" || simple == "contact us" || simple == "phone" || simple == "address" || simple == "location" || simple == "office" || simple == "number")
            {
                reply = "Here are the official contact details for NMD Infotech Services:\n\n• Office Address: Office No. 11, Second Floor, NMD PVT LTD, Aditya Centeegra, Fergusson College Road (FC Road), Shivajinagar, Pune, Maharashtra 411005\n• Phone & WhatsApp: +91 9049442717\n• Email: info@nmdinfotechservices.com | hr@nmdinfotechservices.com\n• Website: https://www.nmdinfotechservices.com/";
                return true;
            }

            return false;
        }
    }

    public class QuotaExceededException : Exception
    {
        public QuotaExceededException(string message) : base(message) { }
    }
}