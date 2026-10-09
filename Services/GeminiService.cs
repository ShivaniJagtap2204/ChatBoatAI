using System.Text;
using System.Text.Json;
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

            // 1. Instant reply for common greetings to save API quota
            if (IsCommonGreeting(normalizedMessage, out string greetingReply))
            {
                return greetingReply;
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

            // Create prompt
            var prompt = $@"You are an AI chatbot. Use the following knowledge base to answer the user's question.
KNOWLEDGE BASE:
{knowledge}

USER QUESTION: {trimmedMessage}

Instructions:
- If the question is about our class, use the knowledge base.
- If the question is about Data Analyst, use the Data Analyst section.
- If the question is about Digital Marketing, use the Digital Marketing section.
- If the question is about App Development, use the App Development section.
- If the question is about Web Development, use the Web Development section.
- Do not invent class information.
- Do not invent fees, timings, address, trainer names or contact details.
- If the requested information is not available in the knowledge base, clearly say that the information is not available.
- Give the answer in a simple and helpful way.
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
                    temperature = 0.5,
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
                    var answer = await CallGeminiApiAsync(currentKey, jsonPayload);

                    if (!string.IsNullOrWhiteSpace(answer))
                    {
                        // Cache response for 24 hours so repeat questions consume 0 API quota
                        _cache.Set(cacheKey, answer, TimeSpan.FromHours(24));

                        // Set active key to current successful key
                        lock (_keyLock)
                        {
                            _activeKeyIndex = currentKeyIndex;
                        }

                        return answer;
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
                return "⚠️ AI सर्व्हरवर सध्या खूप लोड (Rate Limit) आहे. कृपया १०-१५ सेकंद थांबा आणि पुन्हा प्रयत्न करा! (AI servers are busy, please try again in 15 seconds).";
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

        private bool IsCommonGreeting(string message, out string reply)
        {
            reply = "";
            var simple = message.Replace("?", "").Replace("!", "").Replace(".", "").Trim();

            if (simple == "hi" || simple == "hello" || simple == "hey" || simple == "hii" || simple == "hiii" ||
                simple == "namaste" || simple == "good morning" || simple == "good evening" || simple == "good afternoon")
            {
                reply = "Hello! 👋 I'm your NMD AI Assistant. How can I help you today? You can ask me about our courses including Web Development, Data Analytics, Digital Marketing, App Development, and more!";
                return true;
            }

            if (simple == "who are you" || simple == "what is your name" || simple == "tu kon ahes")
            {
                reply = "I'm NMD AI Assistant, created to answer your questions regarding our courses including Web Development, Data Analyst, App Development, and Digital Marketing!";
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