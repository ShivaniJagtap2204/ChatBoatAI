using ChatBoatAI.Models;
using ChatBoatAI.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChatBoatAI.Controllers
{
    [ApiController]
    [Route("[controller]/[action]")]
    public class ChatController : ControllerBase
    {
        private readonly GeminiService _geminiService;

        public ChatController(GeminiService geminiService)
        {
            _geminiService = geminiService; 
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message is required.");

            try
            {
                var response = await _geminiService.GetResponseAsync(request.Message);

                return Ok(new
                {
                    success = true,
                    response = response
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }
    }
}