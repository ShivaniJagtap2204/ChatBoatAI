namespace ChatBoatAI.Models
{
    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
    }

    public class AudioTranscribeRequest
    {
        public string AudioBase64 { get; set; } = string.Empty;
        public string MimeType { get; set; } = "audio/webm";
    }
}
