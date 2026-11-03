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

        // Models to try in order (ensures high availability without 503 errors)
        private static readonly string[] AvailableModels = new[]
        {
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-flash-latest",
            "gemini-2.5-pro"
        };

        public GeminiService(HttpClient httpClient, IConfiguration configuration, IMemoryCache cache)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _cache = cache;

            // Maximum time to wait for Gemini
            _httpClient.Timeout = TimeSpan.FromSeconds(45);
        }

        // Read knowledge from MD or TXT file safely from multiple possible locations
        private string GetKnowledge()
        {
            var paths = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "Data", "KnowledgeBase.md"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "KnowledgeBase.md"),
                Path.Combine(Directory.GetCurrentDirectory(), "KnowledgeBase.md"),
                Path.Combine(Directory.GetCurrentDirectory(), "Data", "KnowledgeBase.txt"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "KnowledgeBase.txt"),
                Path.Combine(Directory.GetCurrentDirectory(), "KnowledgeBase.txt")
            };

            foreach (var path in paths)
            {
                if (File.Exists(path))
                {
                    try
                    {
                        var content = File.ReadAllText(path);
                        if (!string.IsNullOrWhiteSpace(content))
                        {
                            return content;
                        }
                    }
                    catch
                    {
                        // Safely continue to next path if read error occurs
                    }
                }
            }

            return string.Empty;
        }

        // Get list of configured API keys (supports configuration & environment variables)
        private List<string> GetConfiguredKeys()
        {
            var rawKeys = _configuration["Gemini:ApiKey"]
                       ?? _configuration["Gemini__ApiKey"]
                       ?? _configuration["Gemini:ApiKeys"]
                       ?? Environment.GetEnvironmentVariable("Gemini__ApiKey")
                       ?? Environment.GetEnvironmentVariable("Gemini:ApiKey")
                       ?? "";

            return rawKeys.Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                          .ToList();
        }

        public async Task<string> GetResponseAsync(string message)
        {
            if (string.IsNullOrWhiteSpace(message))
                return "Please enter a question.";

            var trimmedMessage = message.Trim();
            var normalizedMessage = trimmedMessage.ToLowerInvariant();

            // 1. Language Detection & Strict Instructions
            var detectedLang = DetectLanguage(trimmedMessage);
            string langInstruction = detectedLang switch
            {
                "en" => "The user asked in ENGLISH. You MUST respond 100% strictly in professional, clean ENGLISH. Do NOT output Marathi or Hindi words.",
                "hi" => "The user asked in HINDI. You MUST respond 100% strictly in polite, professional HINDI (हिंदी). Write your entire response in clear, fluent Hindi.",
                _    => "The user asked in MARATHI. You MUST respond 100% strictly in polite, professional MARATHI (मराठी). Write your entire response in clear, fluent Marathi."
            };

            // Instant friendly reply for basic greetings only
            if (IsCommonGreeting(normalizedMessage, detectedLang, out string instantReply))
            {
                return instantReply;
            }

            // 2. Check In-Memory Cache (serves identical questions instantly with 0 quota cost)
            var cacheKey = $"chat_query_{normalizedMessage}";
            if (_cache.TryGetValue(cacheKey, out string? cachedResponse) && !string.IsNullOrWhiteSpace(cachedResponse))
            {
                return cachedResponse;
            }

            // 3. Get API Keys
            var apiKeys = GetConfiguredKeys();
            if (apiKeys.Count == 0)
            {
                throw new Exception("Gemini API key is missing. Please configure Gemini:ApiKey or set Gemini__ApiKey in Environment Variables.");
            }

            // Read Knowledge Base
            var knowledge = GetKnowledge();

            // Create prompt supporting both KnowledgeBase and general AI questions with strict language matching
            var prompt = $@"You are the official AI Assistant for NMD Infotech Services (The Digital NMD / NMD Pvt. Ltd. in Pune, Maharashtra, India), as well as a knowledgeable, polite general-purpose AI assistant.

KNOWLEDGE BASE:
{knowledge}

USER QUESTION: {trimmedMessage}

RESPONSE INSTRUCTIONS & FORMATTING RULES:
1. CRITICAL LANGUAGE DIRECTIVE (MANDATORY - HIGHEST PRIORITY):
   - {langInstruction}
   - Never mix languages. An English question MUST receive an English response. A Hindi question MUST receive a Hindi response. A Marathi question MUST receive a Marathi response.

2. ADAPTIVE ANSWER LENGTH DIRECTIVE (CRITICAL - SHORT BY DEFAULT):
   - ALWAYS PROVIDE SHORT, DIRECT, CRISP ANSWERS (1 to 3 clear sentences) BY DEFAULT.
   - Do NOT produce long paragraphs or dump unnecessary information unless the user specifically asks for it.
   - SPECIFIC DIRECT QUESTIONS:
     * 'Who is NMD?' / 'NMD kon ahet?': Answer directly in 1-2 short sentences that Mr. Navnath Mohan Darekar (NMD) is the Founder & Director of NMD Infotech Services and The Digital NMD, an entrepreneur, Business Analyst, and author of 'Revamping Business with Modern Marketing', awarded 'The Tycoon Of Maharashtra 2024'.
     * 'What is NMD full form?' / 'NMD cha full form': Answer directly that NMD stands for Navnath Mohan Darekar.
     * Course fees: Answer directly with the exact listed fee and duration.
   - DETAILED EXPLANATION ONLY WHEN REQUESTED:
     * Only if the user specifically asks to 'explain in detail', 'briefly explain', 'give full details', 'tell me more', 'सविस्तर सांगा', 'विस्तार से बताइए', should you provide an extensive, structured, in-depth breakdown.

3. HUMAN-LIKE CONVERSATIONAL TONE & WARMTH:
   - Speak naturally, warmly, and empathetically like a friendly, professional human expert.
   - Avoid sounding robotic, cold, or mechanical. Express genuine warmth, helpfulness, and conversational ease.

4. COMPANY / WEBSITE / COURSES / SERVICES QUESTIONS:
   - If the user asks about NMD Infotech Services, The Digital NMD, courses (Digital Marketing ₹25,000, Data Analytics ₹45,000, Data Science ₹85,000, Cloud, DevOps, Cyber Security), syllabus, fees, duration, placement support (170+ hiring partners, highest package up to 22 LPA), founder (Mr. Navnath Mohan Darekar), IT services (Web Development, App Development, Data Science, Data Analysis, Digital Marketing, Game Development, Business Consulting), corporate clients and testimonials (including JP Shroff / Jaiprakash Pravinchandra Shroff, Kolte Patil, MCA, Baramati Agro), or office address and contacts, STRICTLY use the KNOWLEDGE BASE provided above as your primary source of truth.
   - For contact information: Phone/WhatsApp +91 9049442717 / +91 8830498811, Email: info@nmdinfotechservices.com, Office: Office No. 11, Second Floor, Aditya Centeegra, FC Road, Shivajinagar, Pune 411005.

5. GENERAL QUESTIONS (OUTSIDE COMPANY SCOPE):
   - If the user asks ANY question that is NOT related to the company or website (e.g. general knowledge, programming, Python, coding, science, mathematics, definitions, interview questions, or general help), answer it directly, accurately, and helpfully using your own general Gemini AI intelligence!
   - Do NOT say 'this information is not in the knowledge base' for general topics. Always provide a helpful and complete answer.

6. STRICTLY NO .NET REFERENCES:
   - Do NOT mention .NET, ASP.NET, ASP.NET Core, or C# anywhere in your answers unless the user explicitly asks about them.

7. STRICTLY NO STARS OR ASTERISKS:
   - Do NOT use markdown bold asterisks (** or *). Never output asterisk characters in your response.

8. FORMATTING & TONE:
   - Use clean, well-spaced paragraphs.
   - For lists, use simple bullet points like '• ' or numbers (1, 2, 3) or dashes (-).
   - Keep answers professional, polite, warm, and easy to read.
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
                    maxOutputTokens = 1200
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
                        // Cache response for 24 hours
                        _cache.Set(cacheKey, cleanAnswer, TimeSpan.FromHours(24));

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
                    lock (_keyLock)
                    {
                        _activeKeyIndex = (currentKeyIndex + 1) % apiKeys.Count;
                    }
                    continue;
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

        public async Task<string> TranscribeAudioAsync(string audioBase64, string mimeType)
        {
            if (string.IsNullOrWhiteSpace(audioBase64))
                return string.Empty;

            var apiKeys = GetConfiguredKeys();
            if (apiKeys.Count == 0)
            {
                throw new Exception("Gemini API key is missing.");
            }

            var cleanBase64 = audioBase64.Contains(",")
                ? audioBase64.Substring(audioBase64.IndexOf(",") + 1)
                : audioBase64;

            var cleanMimeType = string.IsNullOrWhiteSpace(mimeType)
                ? "audio/webm"
                : mimeType.Split(';')[0].Trim();

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = cleanMimeType,
                                    data = cleanBase64
                                }
                            },
                            new
                            {
                                text = "Transcribe the spoken audio accurately into plain text. The user may be speaking in Marathi, Hindi, or English. Output ONLY the exact words spoken by the user in the language spoken, without any extra commentary, labels, or quotes. If there is no speech in the audio, return nothing."
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    maxOutputTokens = 250
                }
            };

            var jsonPayload = JsonSerializer.Serialize(requestBody);

            int startIndex;
            lock (_keyLock)
            {
                startIndex = _activeKeyIndex % apiKeys.Count;
            }

            for (int keyAttempt = 0; keyAttempt < apiKeys.Count; keyAttempt++)
            {
                int currentKeyIndex = (startIndex + keyAttempt) % apiKeys.Count;
                var currentKey = apiKeys[currentKeyIndex];

                try
                {
                    var rawTranscript = await CallGeminiApiAsync(currentKey, jsonPayload);
                    var cleaned = CleanFormatting(rawTranscript);

                    lock (_keyLock)
                    {
                        _activeKeyIndex = currentKeyIndex;
                    }

                    if (cleaned.Equals("No response received.", StringComparison.OrdinalIgnoreCase))
                        return string.Empty;

                    return cleaned;
                }
                catch (QuotaExceededException)
                {
                    lock (_keyLock)
                    {
                        _activeKeyIndex = (currentKeyIndex + 1) % apiKeys.Count;
                    }
                    continue;
                }
                catch (Exception)
                {
                    if (keyAttempt == apiKeys.Count - 1)
                        throw;
                }
            }

            return string.Empty;
        }

        private async Task<string> CallGeminiApiAsync(string apiKey, string jsonPayload)
        {
            Exception? lastException = null;

            // Try each available model in order to guarantee fast and reliable answers
            foreach (var model in AvailableModels)
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

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

                        // 503 (Model busy) or 404 (Not found) -> try next model
                        if ((int)response.StatusCode == 503 || (int)response.StatusCode == 404)
                        {
                            lastException = new Exception($"Model {model} returned {response.StatusCode}: {responseJson}");
                            break; // break retry loop to try next model
                        }

                        if (!response.IsSuccessStatusCode)
                        {
                            lastException = new Exception($"Gemini API Error ({model}): {responseJson}");
                            break;
                        }

                        using var document = JsonDocument.Parse(responseJson);
                        if (document.RootElement.TryGetProperty("candidates", out var candidates) &&
                            candidates.GetArrayLength() > 0 &&
                            candidates[0].TryGetProperty("content", out var candContent) &&
                            candContent.TryGetProperty("parts", out var parts) &&
                            parts.GetArrayLength() > 0 &&
                            parts[0].TryGetProperty("text", out var textProp))
                        {
                            var answer = textProp.GetString();
                            if (!string.IsNullOrWhiteSpace(answer))
                                return answer;
                        }

                        return "No response received.";
                    }
                    catch (QuotaExceededException)
                    {
                        throw;
                    }
                    catch (TaskCanceledException)
                    {
                        if (attempt == 2)
                        {
                            lastException = new Exception("Gemini request timed out.");
                            break;
                        }
                        await Task.Delay(1000);
                    }
                    catch (Exception ex)
                    {
                        lastException = ex;
                        break;
                    }
                }
            }

            if (lastException != null)
                throw lastException;

            return "No response received.";
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

            // Remove any accidental .NET / ASP.NET Core mentions
            cleaned = Regex.Replace(cleaned, @"\bASP\.NET\s+Core\s*,\s*", "", RegexOptions.IgnoreCase);
            cleaned = Regex.Replace(cleaned, @",\s*\bASP\.NET\s+Core\b", "", RegexOptions.IgnoreCase);
            cleaned = Regex.Replace(cleaned, @"\bASP\.NET\s+Core\b", "", RegexOptions.IgnoreCase);
            cleaned = Regex.Replace(cleaned, @"\bASP\.NET\b", "", RegexOptions.IgnoreCase);

            return cleaned.Trim();
        }

        // Friendly greeting for basic hellos with strict language matching
        private bool IsCommonGreeting(string message, string lang, out string reply)
        {
            reply = "";
            var simple = message.Replace("?", "").Replace("!", "").Replace(".", "").Trim();

            if (simple == "hi" || simple == "hello" || simple == "hey" || simple == "hii" || simple == "hiii" ||
                simple == "good morning" || simple == "good evening" || simple == "good afternoon" ||
                simple == "namaste" || simple == "namaskar" || simple == "नमस्कार" || simple == "नमस्ते" ||
                simple == "हाय" || simple == "हॅलो")
            {
                if (lang == "hi")
                {
                    reply = "नमस्ते! 👋 NMD Infotech Services में आपका स्वागत है। मैं आपका AI असिस्टेंट हूँ। आज मैं आपकी हमारे कोर्सेस (Data Science, Data Analytics, Digital Marketing), IT सर्विसेज, या ऑफिस संपर्क की जानकारी में कैसे सहायता कर सकता हूँ?";
                }
                else if (lang == "mr")
                {
                    reply = "नमस्कार! 👋 एनएमडी इन्फोटेक सर्व्हिसेस (NMD Infotech Services) मध्ये आपले स्वागत आहे. मी आपला AI सहाय्यक आहे. मी तुम्हाला आमचे कोर्सेस (Data Science, Data Analytics, Digital Marketing), IT सर्व्हिसेस, वेब व अ‍ॅप डेव्हलपमेंट किंवा ऑफिस संपर्क तपशीलांबद्दल कशी मदत करू शकतो?";
                }
                else
                {
                    reply = "Hello! 👋 Welcome to NMD Infotech Services. I am your AI Assistant. How can I assist you with our IT Services, Career Courses (Data Science, Data Analytics, Digital Marketing), or projects today?";
                }
                return true;
            }

            if (simple == "who are you" || simple == "what is your name" || simple == "तू कोण आहेस" || simple == "तुमचे नाव काय आहे" || simple == "आप कौन हैं" || simple == "आपका नाम क्या है")
            {
                if (lang == "hi")
                {
                    reply = "मैं NMD Infotech Services का आधिकारिक AI असिस्टेंट हूँ। मैं आपको IT सर्विसेज, ट्रेनिंग कोर्सेस (Data Science, Data Analytics), फीस, सिलेबस और संपर्क विवरण की जानकारी प्रदान करने में मदद करता हूँ!";
                }
                else if (lang == "mr")
                {
                    reply = "मी NMD Infotech Services चा अधिकृत AI Assistant आहे. मी तुम्हाला IT सर्व्हिसेस, ट्रेनिंग कोर्सेस (Data Science, Data Analytics), फी, कालावधी आणि संपर्क तपशीलांची माहिती देण्यास मदत करतो!";
                }
                else
                {
                    reply = "I am the official AI Assistant for NMD Infotech Services (Pune). I can help you with information about our IT services, professional courses, fees, syllabus, and contact information!";
                }
                return true;
            }

            if (simple.Contains("full form") || simple.Contains("ful form") || simple.Contains("फुल फॉर्म") || simple.Contains("पूर्ण रूप") || simple.Contains("पूर्ण नाव"))
            {
                if (lang == "hi")
                {
                    reply = "NMD का फुल फॉर्म (पूरा नाम) 'नवनाथ मोहन दरेकर' (Navnath Mohan Darekar) है। वे NMD Infotech Services और The Digital NMD के संस्थापक और डायरेक्टर हैं।";
                }
                else if (lang == "mr")
                {
                    reply = "NMD चा फुल फॉर्म (पूर्ण नाव) 'नवनाथ मोहन दरेकर' (Navnath Mohan Darekar) असा आहे. ते NMD Infotech Services आणि The Digital NMD चे संस्थापक व संचालक आहेत।";
                }
                else
                {
                    reply = "The full form of NMD is Navnath Mohan Darekar (Founder and Director of NMD Infotech Services / The Digital NMD).";
                }
                return true;
            }

            bool isWhoIsNmd = simple == "who is nmd" || simple == "who is nmd sir" || simple == "nmd kon ahet" || simple == "nmd kon ahe" ||
                              simple == "nmd kaun hai" || simple == "nmd kaun hain" || simple == "who is navnath darekar" || simple == "navnath darekar kon ahet" ||
                              simple == "एनएमडी कोण आहेत" || simple == "nmd कोण आहेत" || simple == "एनएमडी कौन हैं" || simple == "नवनाथ दरेकर कोण आहेत";

            if (isWhoIsNmd)
            {
                bool isDetailed = simple.Contains("briefly") || simple.Contains("detail") || simple.Contains("details") || simple.Contains("explain") ||
                                  simple.Contains("सविस्तर") || simple.Contains("विस्तार") || simple.Contains("संपूर्ण") || simple.Contains("expand");

                if (!isDetailed)
                {
                    if (lang == "hi")
                    {
                        reply = "NMD यानी श्री नवनाथ मोहन दरेकर (Navnath Mohan Darekar) हैं। वे NMD Infotech Services और The Digital NMD के संस्थापक व डायरेक्टर, बिज़नेस एनालिस्ट, उद्यमी और 'द टायकून ऑफ महाराष्ट्र 2024' पुरस्कार विजेता हैं।\n\n(विस्तार से जानने के लिए 'सविस्तर सांगा' या 'Explain in detail' पूछें)";
                    }
                    else if (lang == "mr")
                    {
                        reply = "एनएमडी (NMD) म्हणजे श्री. नवनाथ मोहन दरेकर (Navnath Mohan Darekar). ते NMD Infotech Services आणि The Digital NMD चे संस्थापक व संचालक, बिझनेस अ‍ॅनालिस्ट, उद्योजक आणि 'द टायकून ऑफ महाराष्ट्र 2024' पुरस्कार विजेते आहेत।\n\n(अधिक सविस्तर माहितीसाठी 'सविस्तर सांगा' किंवा 'Explain in detail' असे विचारा)";
                    }
                    else
                    {
                        reply = "Mr. Navnath Mohan Darekar (globally recognized as NMD) is the Founder and Director of NMD Infotech Services and The Digital NMD. He is an entrepreneur, Business Analyst, author of 'Revamping Business with Modern Marketing', and recipient of 'The Tycoon Of Maharashtra 2024' award.\n\n(For an in-depth profile, you can ask 'Explain in detail')";
                    }
                }
                else
                {
                    if (lang == "hi")
                    {
                        reply = "NMD Infotech Services के संस्थापक और डायरेक्टर श्री नवनाथ मोहन दरेकर (Navnath Mohan Darekar - NMD) का विस्तृत परिचय:\n\n• पद एवं अनुभव: वे एक सफल उद्यमी, डायरेक्टर और बिज़नेस एनालिस्ट हैं, जिनके पास सॉफ्टवेयर इंजीनियरिंग, क्लाउड कंप्यूटिंग और डिजिटल ट्रांसफॉर्मेशन का गहरा अनुभव है।\n• राज्यस्तरीय सम्मान: उन्हें 2024 में प्रसिद्ध भारतीय अभिनेत्री श्रीमती हृता दुर्गुळे द्वारा 'द टायकून ऑफ महाराष्ट्र 2024' (The Tycoon Of Maharashtra) पुरस्कार से सम्मानित किया गया है।\n• लेखक: वे लोकप्रिय बिजनेस पुस्तक 'Revamping Business with Modern Marketing' के लेखक हैं।\n• उद्देश्य: युवा डेवलपर्स को आधुनिक तकनीक में प्रशिक्षित करना और व्यवसायों को स्केलेबल डिजिटल सॉल्यूशंस प्रदान करना।";
                    }
                    else if (lang == "mr")
                    {
                        reply = "NMD Infotech Services चे संस्थापक आणि संचालक श्री. नवनाथ मोहन दरेकर (Navnath Mohan Darekar - NMD) यांचा सविस्तर परिचय:\n\n• पद व अनुभव: ते एक उद्योजक, संचालक आणि बिझनेस अ‍ॅनालिस्ट असून त्यांच्याकडे सॉफ्टवेअर इंजिनिअरिंग, क्लाउड कम्प्युटिंग आणि डिजिटल ट्रान्सफॉर्मेशनचे सखोल ज्ञान आहे।\n• राज्यस्तरीय सन्मान: त्यांना 2024 मध्ये लोकप्रिय अभिनेत्री सौ. हृता दुर्गुळे यांच्या हस्ते 'द टायकून ऑफ महाराष्ट्र 2024' (The Tycoon Of Maharashtra) पुरस्काराने सन्मानित करण्यात आले आहे।\n• लेखक: ते 'Revamping Business with Modern Marketing' या लोकप्रिय बिझनेस पुस्तकाचे लेखक आहेत।\n• ध्येय: तरुण विद्यार्थ्यांना आधुनिक आयटी क्षेत्रात सक्षम करणे आणि उद्योगांना सर्वोत्तम सॉफ्टवेअर सोल्यूशन्स देणे।";
                    }
                    else
                    {
                        reply = "Detailed Profile of Mr. Navnath Mohan Darekar (globally known as NMD), Founder & Director of NMD Infotech Services:\n\n• Role & Expertise: Visionary entrepreneur, Director, and Business Analyst with strong foundations in software engineering, cloud architecture, and enterprise digital transformation.\n• Award & Recognition: Honored with 'The Tycoon Of Maharashtra of the Year 2024' award for Best Businessman of the Year, presented by celebrated Indian actress Mrs. Hruta Durgule.\n• Author: Author of the acclaimed business book 'Revamping Business with Modern Marketing', available on Amazon and Flipkart.\n• Leadership Vision: Mentoring aspiring developers through career programs and delivering scalable IT solutions to global enterprises.";
                    }
                }
                return true;
            }

            if (simple.Contains("jp shroff") || simple.Contains("shroff") || simple.Contains("जे पी श्रॉफ") || simple.Contains("जेपी श्रॉफ") || simple.Contains("श्रॉफ"))
            {
                if (lang == "hi")
                {
                    reply = "श्री जे. पी. श्रॉफ (Jaiprakash Pravinchandra Shroff) 1958 में स्थापित Shroff Group के प्रमुख और प्रख्यात उद्योगपति हैं। वे NMD Infotech Services के सम्मानित कॉर्पोरेट क्लाइंट हैं और उन्होंने 5.0 रेटिंग के साथ समीक्षा दी है: 'Best business IT consulting with amazing insights.' उन्होंने COEP से सिविल इंजीनियरिंग की है और उन्हें सूर्यदत्ता लाइफटाइम अचीवमेंट एवं निर्माण रत्न पुरस्कार से सम्मानित किया गया है।";
                }
                else if (lang == "mr")
                {
                    reply = "श्री. जे. पी. श्रॉफ (Jaiprakash Pravinchandra Shroff) हे 1958 मध्ये स्थापन झालेल्या Shroff Group चे प्रमुख व नामवंत उद्योगपती आहेत. ते NMD Infotech Services चे सन्माननीय कॉर्पोरेट क्लायंट (Client) असून त्यांनी NMD ला 5.0 स्टार रेटिंग देत 'Best business IT consulting with amazing insights' असा अभिप्राय दिला आहे. त्यांनी COEP मधून सिव्हिल इंजिनिअरिंग केले असून त्यांना सूर्यदत्ता लाइफटाइम अचिव्हमेंट व निर्माण रत्न पुरस्कार मिळालेले आहेत.";
                }
                else
                {
                    reply = "Mr. JP Shroff (Jaiprakash Pravinchandra Shroff) is a prominent industrialist and leader associated with the Shroff Group (established in 1958). He is a valued corporate client of NMD Infotech Services, giving a 5.0-star testimonial: 'Best business IT consulting with amazing insights.' He holds a B.E. in Civil Engineering from COEP and is a recipient of the Suryadatta National Lifetime Achievement Award and Nirman Ratna Award.";
                }
                return true;
            }

            return false;
        }

        private static string DetectLanguage(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "en";
            var lower = text.ToLowerInvariant();

            // 1. Check Devanagari script (\u0900-\u097F)
            bool hasDevanagari = Regex.IsMatch(text, @"[\u0900-\u097F]");
            if (hasDevanagari)
            {
                // Marathi unique character ळ (\u0933), ॅ, ऑ and common Marathi verbs/words/suffixes
                if (Regex.IsMatch(text, @"[ळॅऑ]") || Regex.IsMatch(text, @"आहे|आहेत|किती|कुठे|कसा|कशी|कसे|सांग|सांगा|हवी|हवे|हवं|द्या|करा|माहिती|पत्ता|तपशील|काय|नमस्कार|शुल्क|होय|नाही|नको|कोणते|कोणती|कोण|पाहिजे|शिकायचे|शिकायला|प्रवेश|फी|बद्दल|विषयी|फुल\s*फॉर्म|सविस्तर|थोडक्यात"))
                {
                    return "mr";
                }
                // Hindi verbs/words
                if (Regex.IsMatch(text, @"है|हैं|कितनी|कितना|कितने|कहाँ|कहा|कैसे|कैसा|कैसी|बताओ|बताइए|बताएं|चाहिए|दीजिए|दीजिये|नमस्ते|जानकारी|क्या|शुक्रिया|धन्यवाद|होगी|होगा|होंगे|सकते|सकती|सकता|रहते|रहती|करना|मुझको|मुझे|आपको|कब|कौन|कौनसा|कौनसी|फीस|बारे|विस्तार|संक्षेप"))
                {
                    return "hi";
                }
                return "mr";
            }

            // 2. Transliterated Marathi vs Hindi words (includes cha, chi, che, chya, baddal, kon, etc.)
            if (Regex.IsMatch(lower, @"\b(kiti|ahe|ahet|aahe|aahet|kuthe|kute|sang|sanga|kasa|kashi|kase|namaskar|mahiti|tula|mala|amhi|tumhi|tumcha|tumchi|tumche|kadhi|kadi|vichar|patta|shulk|deto|deta|karto|karu|shiku|pahije|nave|kay|kaay|ka|kon|konte|konti|kontya|madhe|made|var|khali|sangto|sangshil|dya|baddal|badal|vishayi|nko|ani|pan|pn|tar|tr|mag|mg|cha|chi|che|chya|shikayche|shikaycha|savitstar)\b"))
            {
                return "mr";
            }

            if (Regex.IsMatch(lower, @"\b(kitna|kitni|kitne|hai|hain|kaha|kahan|kaise|kaisa|kaisi|batao|bataiye|chahiye|namaste|dijiye|kya|shukriya|dhanyavad|kare|karega|karenge|mujhe|humko|aapko|aapka|aapki|aapke|hogi|hoga|honge|kab|kaun|kaunsa|kaunsi|karta|karti|karte|bare|mein)\b"))
            {
                return "hi";
            }

            return "en";
        }
    }

    public class QuotaExceededException : Exception
    {
        public QuotaExceededException(string message) : base(message) { }
    }
}