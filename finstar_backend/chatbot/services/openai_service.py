"""
OpenAI transport layer for chatbot responses.
"""

from __future__ import annotations

import logging

from django.conf import settings

from ..prompts import BUSINESS_CONTEXT, SYSTEM_PROMPT

logger = logging.getLogger("chatbot")

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - handled at runtime
    OpenAI = None


class OpenAIServiceError(Exception):
    """Raised when the OpenAI service cannot generate a reply."""


def _build_client():
    if OpenAI is None:
        raise OpenAIServiceError("OpenAI SDK is not installed.")

    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        raise OpenAIServiceError("OpenAI API key is not configured.")

    return OpenAI(api_key=api_key)


def generate_ai_reply(
    *,
    user_message: str,
    conversation_history: list[dict[str, str]],
    catalogue_context: str,
    detected_intent: str,
) -> str:
    """
    Generate a chatbot response with model fallback.
    """
    client = _build_client()

    primary_model = getattr(settings, "OPENAI_MODEL", "gpt-4.1-mini")
    fallback_model = getattr(settings, "OPENAI_FALLBACK_MODEL", "gpt-4.1-nano")

    input_messages: list[dict] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "system",
            "content": (
                f"{BUSINESS_CONTEXT}\n"
                f"Detected customer intent: {detected_intent or 'general_inquiry'}\n\n"
                f"Catalogue context:\n{catalogue_context}"
            ),
        },
    ]

    for message in conversation_history:
        role = "assistant" if message["sender"] == "bot" else "user"
        input_messages.append(
            {
                "role": role,
                "content": message["message"],
            }
        )

    input_messages.append(
        {
            "role": "user",
            "content": user_message,
        }
    )

    attempted_models: list[str] = []
    last_error: Exception | None = None

    for model in dict.fromkeys([primary_model, fallback_model]):
        attempted_models.append(model)
        try:
            response = client.chat.completions.create(
                model=model,
                messages=input_messages,
                temperature=0.35,
                max_tokens=280,
            )
            content = response.choices[0].message.content
            if content:
                return content.strip()
            raise OpenAIServiceError("OpenAI returned an empty response.")
        except OpenAIServiceError as exc:
            last_error = exc
            logger.warning("OpenAI returned an unusable response for model %s: %s", model, exc)
        except Exception as exc:  # pragma: no cover - network/service failure
            last_error = exc
            logger.warning("OpenAI request failed for model %s: %s", model, exc)

    logger.error(
        "OpenAI request failed after models %s: %s",
        ", ".join(attempted_models),
        last_error,
    )
    raise OpenAIServiceError("OpenAI request failed.") from last_error
