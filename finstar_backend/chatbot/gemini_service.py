"""
Gemini AI service for the Finstar chatbot.

Uses the modern google.genai SDK (google-genai package) to power customer
support conversations. Includes fallback response on API failure and
conversation context support.
"""

import logging

from django.conf import settings

logger = logging.getLogger("chatbot")

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a professional assistant for Finstar Industrial Systems Ltd, a leading supplier of industrial equipment in Nairobi Kenya.

About Finstar Industrial Systems Ltd:
- Leading supplier and installer of industrial refrigeration, HVAC, boilers, cold rooms, insulation panels, and industrial fittings
- Located in Nairobi, Kenya, serving clients across East Africa
- Over 20 years of experience, trusted by 500+ businesses
- Contact: Phone +254 726 559 606, Email info@finstarindustrial.com

Guidelines:
- Answer clearly and professionally
- Recommend products when relevant (refrigeration, HVAC, boilers, cold rooms, industrial fittings, etc.)
- Mention the company naturally in responses
- Encourage users to contact via WhatsApp (+254726559606) or phone for faster service
- Keep responses concise and helpful (max 2-3 short paragraphs)
- If asked about pricing, explain that prices vary by specification and encourage contacting the team for a quote
- If you don't know the answer, suggest the user contacts the Finstar team directly
- Always be polite and professional"""

FALLBACK_RESPONSE = (
    "I apologize, but I'm experiencing a temporary issue. "
    "Please contact our team directly for immediate assistance:\n\n"
    "📞 Call: +254 726 559 606\n"
    "💬 WhatsApp: +254 726 559 606\n"
    "📧 Email: info@finstarindustrial.com\n\n"
    "Our team is ready to help you!"
)


class GeminiServiceError(Exception):
    """Raised when the Gemini API call fails."""


def get_ai_response(user_message: str, conversation_history: list[dict] | None = None) -> str:
    """
    Send a message to Gemini and return the AI response.

    Uses the modern google.genai SDK (google-genai package).

    Args:
        user_message: The user's latest message.
        conversation_history: Optional list of previous messages as
            [{"sender": "user"|"bot", "message": "..."}]

    Returns:
        The AI-generated response string.

    Raises:
        GeminiServiceError: If the API call fails.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        logger.error("Gemini API key is not configured")
        raise GeminiServiceError("AI service is not configured.")

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        # Build conversation context from history
        contents = []

        # Add system instruction as first user turn for context
        if conversation_history:
            # Send last 10 messages for context (to stay within token limits)
            recent = conversation_history[-10:]
            for msg in recent:
                role = "user" if msg["sender"] == "user" else "model"
                contents.append(
                    genai.types.Content(
                        role=role,
                        parts=[genai.types.Part(text=msg["message"])],
                    )
                )

        # Add the current user message
        contents.append(
            genai.types.Content(
                role="user",
                parts=[genai.types.Part(text=user_message)],
            )
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=500,
                temperature=0.7,
            ),
        )

        if response.text:
            return response.text.strip()

        logger.warning("Gemini returned empty response for message: %s", user_message[:100])
        raise GeminiServiceError("AI returned an empty response.")

    except GeminiServiceError:
        raise
    except Exception as exc:
        logger.exception("Gemini API call failed: %s", str(exc))
        raise GeminiServiceError(f"AI service request failed: {exc}") from exc
