using System.Text;
using System.Text.Json;

namespace ChatBoatAI.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public GeminiService( HttpClient httpClient,IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;

            // Maximum time to wait for Gemini
            _httpClient.Timeout = TimeSpan.FromSeconds(60);
        }

        // Read knowledge from TXT file
        private string GetKnowledge()
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(),"Data","JPShroffKnowledge.txt");

            if (!File.Exists(filePath))
            {
                throw new Exception(
                    "Knowledge file not found:" + filePath);
            }

            return File.ReadAllText(filePath);
        }

        public async Task<string> GetResponseAsync(string message)
        {
            var apiKey = _configuration["Gemini:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
                throw new Exception("Gemini API key is missing.");

            // Read TXT knowledge
            var knowledge = GetKnowledge();

            // Create prompt
            var prompt = $@"You are an AI chatbot.Use the following knowledge base to answer the user's question.KNOWLEDGE BASE:{knowledge}USER QUESTION:{message}

Instructions:
- If the question is about JP Shroff, use the knowledge base.
- If the question is about our class, use the knowledge base.
- If the question is about Data Analyst, use the Data Analyst section.
- If the question is about Digital Marketing, use the Digital Marketing section.
- If the question is about App Development, use the App Development section.
- If the question is about Web Development, use the Web Development section.
- Do not invent class information.
- Do not invent fees, timings, address, trainer names or contact details.
- If the requested information is not available in the knowledge base,
  clearly say that the information is not available.
- Give the answer in a simple and helpful way.
";

            var url =
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key={apiKey}";

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

            var json = JsonSerializer.Serialize(requestBody);

            // Retry up to 3 times
            for (int attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    using var content = new StringContent(
                        json,
                        Encoding.UTF8,
                        "application/json");

                    var response =
                        await _httpClient.PostAsync(url, content);

                    var responseJson =
                        await response.Content.ReadAsStringAsync();

                    // 503 = Gemini model temporarily busy
                    if ((int)response.StatusCode == 503)
                    {
                        if (attempt < 3)
                        {
                            // Wait before retry
                            await Task.Delay(3000);
                            continue;
                        }

                        throw new Exception(
                            "Gemini model is currently busy. Please try again after a few seconds.");
                    }

                    // 429 = quota/rate limit
                    if ((int)response.StatusCode == 429)
                    {
                        throw new Exception(
                            "Gemini API quota or rate limit exceeded. Please check your Gemini API limits.");
                    }

                    // Other errors
                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception(
                            $"Gemini API Error: {responseJson}");
                    }

                    using var document =
                        JsonDocument.Parse(responseJson);

                    var answer = document
                        .RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();

                    return answer ?? "No response received.";
                }
                catch (TaskCanceledException)
                {
                    if (attempt == 3)
                    {
                        throw new Exception(
                            "Gemini is taking too long to respond. Please try again.");
                    }

                    await Task.Delay(3000);
                }
            }

            throw new Exception("Unable to get response from Gemini.");
        }
    }
}