"""
AI service for generating structured, SEO-optimized product content from images.

Uses the Anthropic Claude API to analyse product images and return branded,
marketing-ready HTML descriptions for Finstar Industrial Systems Ltd.
"""

import json
import logging

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger("products")


# ─── Enhanced AI prompt ──────────────────────────────────────────────────────
PRODUCT_ANALYSIS_PROMPT = """You are a professional industrial-equipment marketing copywriter for **Finstar Industrial Systems Ltd**, a trusted supplier and industry leader serving Kenya & East Africa.

Analyse the provided product image and return a **valid JSON object** with exactly these keys:

{
  "name": "...",
  "short_description": "...",
  "description": "..."
}

──────────────────────────────────────
KEY-BY-KEY INSTRUCTIONS
──────────────────────────────────────

### "name"
- A clear, specific product name.
- MUST include the product type and the phrase "in Nairobi Kenya".
- Example: "Commercial Stainless Steel Sink in Nairobi Kenya"

### "short_description"
- Exactly ONE sentence (max 160 characters).
- Must summarise the key product benefit, include the product keyword, and mention Nairobi Kenya.
- Example: "High-grade stainless steel commercial sink by Finstar Industrial Systems Ltd — durable, hygienic, and available in Nairobi Kenya."

### "description"
- A FULL HTML string (no markdown, no code fences).
- Must follow the exact structure below with proper HTML tags.
- Naturally embed these SEO keywords: Nairobi Kenya, industrial equipment, supplier, Kenya, East Africa, and product-specific terms.
- Mention **Finstar Industrial Systems Ltd** at least 3 times across all sections.
- Tone: professional, marketing-oriented, clear, and informative.
- Use short sentences (max 20 words). Use active voice. Use transition words (e.g. "therefore", "in addition", "for example") in at least 30% of sentences.

#### REQUIRED HTML STRUCTURE (follow this order exactly):

**A. Product Overview Table**
<h2>Product Overview</h2>
<table>
  <thead><tr><th>Item</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td>Product</td><td>... (full product name including category)</td></tr>
    <tr><td>Material / Grade</td><td>... (e.g. Grade 304 Stainless Steel, Carbon Steel, etc.)</td></tr>
    <tr><td>Form / Type</td><td>... (e.g. Single Bowl, Wall-Mounted, Freestanding, etc.)</td></tr>
    <tr><td>Key Function</td><td>... (primary purpose of the product in one sentence)</td></tr>
    <tr><td>Main Uses</td><td>... (comma-separated list of industries/applications)</td></tr>
    <tr><td>Supplier</td><td>Finstar Industrial Systems Ltd — Trusted supplier of industrial equipment in Nairobi Kenya and across East Africa</td></tr>
  </tbody>
</table>

**B. Product Description**
<h2>Product Description</h2>
<p>... (Paragraph 1: 50–70 words introducing the product, its primary purpose, and build quality. Mention Finstar Industrial Systems Ltd as the supplier.) ...</p>
<p>... (Paragraph 2: 50–70 words covering materials, construction standards, and why it is a reliable choice for Kenyan and East African businesses.) ...</p>
<p>... (Paragraph 3: 30–50 words on availability, lead times, or ordering from Finstar Industrial Systems Ltd in Nairobi Kenya.) ...</p>

**C. Applications**
<h2>Applications</h2>
<ul>
  <li><strong>[Industry/Setting]</strong> — [One sentence explaining how the product is used in this context.]</li>
  <li><strong>[Industry/Setting]</strong> — [One sentence explaining how the product is used in this context.]</li>
  <li><strong>[Industry/Setting]</strong> — [One sentence explaining how the product is used in this context.]</li>
  <li><strong>[Industry/Setting]</strong> — [One sentence explaining how the product is used in this context.]</li>
  <li><strong>[Industry/Setting]</strong> — [One sentence explaining how the product is used in this context.]</li>
</ul>

**D. Key Advantages**
<h2>Key Advantages</h2>
<ul>
  <li><strong>Durability</strong> — [Explain why this product is long-lasting, referencing its materials or construction.]</li>
  <li><strong>Efficiency</strong> — [Explain how the product improves workflow or operational performance.]</li>
  <li><strong>Cost-Effectiveness</strong> — [Explain long-term savings or value for Kenyan businesses.]</li>
  <li><strong>Easy Maintenance</strong> — [Explain how cleaning or servicing is straightforward.]</li>
  <li><strong>Compliance</strong> — [State that the product meets relevant industry or hygiene standards applicable in Kenya and East Africa.]</li>
</ul>

**E. Call to Action**
<h2>Get a Quote Today</h2>
<p>Contact <strong>Finstar Industrial Systems Ltd</strong> for competitive pricing, bulk orders, and expert consultation on all industrial equipment needs in Kenya and East Africa.</p>
<p>📧 Email: <a href="mailto:info@finstarindustrial.com">info@finstarindustrial.com</a></p>
<p>📞 Phone: <a href="tel:+254726559606">+254 726 559 606</a></p>
<p><strong>Finstar Industrial Systems Ltd — Your Trusted Partner for Quality Industrial Equipment in Nairobi Kenya.</strong></p>

──────────────────────────────────────
STRICT OUTPUT RULES
──────────────────────────────────────
- Return ONLY valid JSON. No markdown code fences. No extra text before or after the JSON.
- The "description" value must be a single-line HTML string. Escape all double quotes inside it as \\".
- Ensure the entire output can be parsed using json.loads() without any pre-processing.
- All three keys ("name", "short_description", "description") MUST be present.
- Do NOT wrap the JSON in ```json ... ``` fences.
- Do NOT add any commentary, explanation, or text outside the JSON object.
"""


class AIServiceError(Exception):
    """Raised when the AI service fails to generate product details."""


def generate_product_details(image_url: str) -> dict:
    """
    Send an image URL to OpenAI Responses API and return structured product details.
    Uses GPT-5.4-mini as it typically has more accessible quota for developer accounts.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        raise AIServiceError("OpenAI API key is not configured.")

    client = OpenAI(api_key=api_key)

    try:
        response = client.responses.create(
            model="gpt-5.4-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": PRODUCT_ANALYSIS_PROMPT},
                        {"type": "input_image", "image_url": image_url},
                    ],
                }
            ],
            store=True,
        )
    except Exception as exc:
        logger.exception("OpenAI API call failed with model gpt-5.4-mini")
        if "insufficient_quota" in str(exc).lower():
            raise AIServiceError(
                "OpenAI Quota exceeded. Please check your credit balance at "
                "https://platform.openai.com/billing"
            ) from exc
        raise AIServiceError(f"AI service request failed: {exc}") from exc

   
    raw_content = None
    try:
        for output_item in response.output:
            if not hasattr(output_item, "content"):
                continue
            for block in output_item.content:
                if getattr(block, "type", None) == "output_text" and hasattr(block, "text"):
                    raw_content = block.text.strip()
                    break
            if raw_content is not None:
                break
    except Exception as err:
        logger.error("Unexpected response structure from Responses API: %s", response)
        raise AIServiceError("AI service returned an invalid data structure.") from err

    if not raw_content:
        logger.error("No output_text block found in Responses API response: %s", response)
        raise AIServiceError("AI service returned an empty response.")

    # Strip markdown fences if the model includes them (e.g. ```json ... ```)
    if raw_content.startswith("```"):
        lines = raw_content.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_content = "\n".join(lines).strip()

    assert isinstance(raw_content, str)

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as err:
        logger.error("AI returned non-JSON response: %s", raw_content[:500])
        raise AIServiceError(
            "The AI failed to format the product data correctly. Please try again."
        ) from err

    required_keys = {"name", "short_description", "description"}
    missing = required_keys - set(data.keys())
    if missing:
        logger.error("AI response missing keys %s: %s", missing, data)
        raise AIServiceError("AI returned an incomplete product profile.")

    return {
        "name": str(data["name"]),
        "short_description": str(data["short_description"]),
        "description": str(data["description"]),
    }