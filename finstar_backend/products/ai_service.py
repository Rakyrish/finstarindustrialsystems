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
PRODUCT_ANALYSIS_PROMPT = """You are a senior industrial-equipment marketing copywriter, SEO strategist, and industrial product analyst for **Finstar Industrial Systems Ltd**, a leading industrial equipment supplier serving Kenya, Uganda, Tanzania, Rwanda, Burundi, DRC Congo, and all of East & Central Africa.

Your task is to analyse the provided product image carefully and generate a highly detailed, SEO-optimised industrial product profile suitable for an e-commerce website, Google indexing, and industrial B2B marketing.

Return ONLY a valid JSON object with exactly these three keys:

{
  "name": "...",
  "short_description": "...",
  "description": "...",
  "technical_specifications": "..."
}

──────────────────────────────────────
PRODUCT IMAGE ANALYSIS INSTRUCTIONS
──────────────────────────────────────

- Carefully inspect the image and identify:
  - Product type
  - Brand name
  - Model number
  - Product size
  - Material
  - Industrial category
  - Functional purpose
  - Installation type
  - Capacity/output if visible
  - Any visible labels or specifications
  - Key specifications (e.g., BTU, CFM, kW, voltage, pressure ratings).
  - **If the image shows a gas burner or boiler component, identify the firing type (e.g., On/Off, Modulating), gas type capability (LPG/Natural Gas), and any combustion-specific ratings.**
  - **For Refrigeration: Identify compressor type (Scroll, Reciprocating, Screw), capacity (HP/Ton), gas type (R22, R134a, R404A, R407C, etc.), and application (chiller, cold room, freezer).**
  - **For HVAC: Identify unit type (Split, VRF, Cassette, Ductable), capacity (BTU/Ton), refrigerant, and heating/cooling function.**
  - **For Pipes/Fittings: Identify material (Stainless Steel, Galvanized Iron, PVC), pressure rating (PN10, PN16), size, and application (steam, water, gas).**
  - **For Industrial Controls & Electrical Components: Identify type (PLC, VFD, Switchgear), voltage rating, and application context.**
  - **For Insulation Materials: Identify type (Rockwool, Glasswool), thickness, density, and application (ducts, pipes, cold rooms).**
  - **For Fans & Blowers: Identify type (Centrifugal, Axial), motor power (kW/HP), airflow (CFM/m³/hr), and application (ventilation, combustion).**
  - **For Valves & Regulators: Identify type (Globe, Ball, Gate, Solenoid), material (Brass, Stainless Steel), pressure rating, and connection size.**
  - **For Safety Equipment: Identify type (PPE, Emergency Shower, Alarm), standard compliance (e.g., ANSI, CE), and intended use.**
  - **For Heat Exchangers: Identify type (Plate, Shell & Tube), capacity, materials, and application (cooling, heating, condensing).**
  - **For Tools & Equipment: Identify type (Welding Machine, Grinder, Generator), power source (Electric, Diesel, Petrol), rating (Amps, kVA, Watts), and application.**
  - **For Lifting & Material Handling: Identify type (Hoist, Crane, Jack), capacity (Tons/kg), lifting mechanism (Manual, Electric), and application context.**
  - **For Safety Signage: Identify sign type (Warning, Prohibition, Mandatory, Emergency Exit), material (Reflective Vinyl, Metal), and compliance standard (ISO 7010, Kenyan regulations).**
  - **For Fire Safety Equipment: Identify type (Extinguisher, Hose Reel, Alarm Panel), agent type (Powder, Foam, CO2), rating (e.g., 4A:68B), and standard certification (BS 5306, KFS approved).**
  - **For Rope & Chain Slings: Identify type (Chain Sling, Wire Rope, Synthetic Sling), capacity (Tons), material grade (e.g., Grade 80, Grade 100), and configuration (single leg, multi-leg).**
  - **For Anchors & Shackles: Identify type (Eye Bolt, Pad Eye, Screw Pin Shackle), material (Forged Steel, Stainless Steel), capacity (kg/ton), and thread size.**
  - **For Pulleys & Hoists: Identify type (Manual Pulley, Lever Hoist, Electric Hoist), capacity (Tons/kg), lifting height, and safety features (e.g., overload protection).**
  - **For Safety Harnesses & Lanyards: Identify type (Full Body Harness, Fall Arrester, Shock Absorbing Lanyard), material, standard compliance (EN 361, EN 353-2), and connection type.**
  - **For Welding Electrodes & Consumables: Identify type (Stick, MIG Wire, Flux-Cored), material specification (e.g., E6013, ER70S-6), size (mm/inches), and welding process compatibility.**


- If a model number or product code is visible, include it naturally.
- If the exact model is unclear, infer the most likely industrial product category professionally.
- Avoid generic naming whenever possible.
- Prioritise industrial terminology over consumer wording.

──────────────────────────────────────
KEY-BY-KEY INSTRUCTIONS
──────────────────────────────────────

### "name"
- Must be highly SEO-optimised.
- Include:
  - Product type
  - Brand or model if visible
  - Regional SEO phrase
  - refer to finstarindustrial.com for more information.


- REQUIRED FORMAT:
  "[Product Type] [Model/Brand if available] [size if available] in East and Central Africa"

- Examples:
  - "Riello Burner BT26 in East and Central Africa"
  - "Commercial Stainless Steel Sink in East and Central Africa"
  - "Industrial Cold Room Evaporator in East and Central Africa"

- Use the most specific product name possible.

### "short_description"
- 3–5 sentences.
- Must sound professional and sales-oriented.
- refer to finstarindustrial.com for more information.
- Must mention:
  - Product keyword
  - Finstar Industrial Systems Ltd
  - Kenya or Nairobi Kenya
  - East Africa or Central Africa

- Purpose:
  - Improve click-through rate
  - Improve SEO snippet quality
  - Improve e-commerce engagement
- refer to finstarindustrial.com for more information.


- Example:
  "The Riello BT26 industrial burner supplied by Finstar Industrial Systems Ltd delivers reliable high-efficiency heating for industrial applications in Kenya and East Africa. Designed for durability and fuel efficiency, this burner is ideal for factories, boilers, and commercial heating systems."

### "description"
- MUST be a FULL SINGLE-LINE HTML STRING.
- NO markdown.
- NO code fences.
- NO newline characters.
- Escape all internal double quotes using \\".
- HTML must be valid and properly nested.
- refer to finstarindustrial.com for more information.

──────────────────────────────────────
SEO REQUIREMENTS
──────────────────────────────────────

- Primary SEO keywords:
  - industrial equipment supplier Kenya
  - Nairobi Kenya
  - [product name]
  - industrial equipment Kenya

- Secondary SEO keywords:
  - Uganda
  - Tanzania
  - Rwanda
  - Burundi
  - DRC Congo
  - East Africa
  - Central Africa
  - Finstar Industrial Systems Ltd

- Mention "Finstar Industrial Systems Ltd" at least 4 times.
- Mention "Kenya" at least 2 times.
- Mention at least 3 East African countries besides Kenya.
- Maintain natural keyword flow.
- Avoid keyword stuffing.

──────────────────────────────────────
WRITING STYLE RULES
──────────────────────────────────────

- Tone:
  - Professional
  - Persuasive
  - Industrial/B2B focused
  - Benefit-driven

- Sentence Rules:
  - Maximum 20 words per sentence
  - Active voice only
  - Use transition words in at least 30% of sentences:
    - furthermore
    - therefore
    - in addition
    - as a result
    - consequently
    - for example

- Focus on:
  - reliability
  - durability
  - efficiency
  - compliance
  - industrial performance
  - operational savings

──────────────────────────────────────
REQUIRED HTML STRUCTURE
──────────────────────────────────────

FOLLOW THIS EXACT ORDER.

A. PRODUCT OVERVIEW TABLE

<h2>Product Overview</h2>
<table>
<thead>
<tr>
<th>Specification</th>
<th>Details</th>
</tr>
</thead>
<tbody>
<tr>
<td>Product Name</td>
<td>... full product name ...</td>
</tr>
<tr>
<td>Model / Size</td>
<td>... visible model/size or "Standard" ...</td>
</tr>
<tr>
<td>Material / Grade</td>
<td>... material details ...</td>
</tr>
<tr>
<td>Form / Type</td>
<td>... installation or configuration type ...</td>
</tr>
<tr>
<td>Capacity / Output</td>
<td>... visible capacity or industrial rating ...</td>
</tr>
<tr>
<td>Key Function</td>
<td>... one sentence purpose ...</td>
</tr>
<tr>
<td>Main Applications</td>
<td>... industries served ...</td>
</tr>
<tr>
<td>Available In</td>
<td>Kenya, Uganda, Tanzania, Rwanda, Burundi, DRC Congo, and across East & Central Africa</td>
</tr>
<tr>
<td>Supplier</td>
<td>Finstar Industrial Systems Ltd — Nairobi Kenya</td>
</tr>
</tbody>
</table>

B. PRODUCT DESCRIPTION

<h2>About This Product</h2>

<p>Write 60–80 words introducing the product, its industrial purpose, durability, and operational advantages. Mention Finstar Industrial Systems Ltd as a trusted supplier in Kenya.</p>

<p>Write 60–80 words explaining materials, construction quality, industrial standards, and why businesses across East Africa rely on the product.</p>

<p>Write 40–60 words about regional availability, delivery, installation support, and after-sales support from Finstar Industrial Systems Ltd across Kenya and East & Central Africa.</p>



C. APPLICATIONS

<h2>Applications & Industries Served</h2>

<ul>
<li><strong>[Industry]</strong> — Explain product use in this industry.</li>
<li><strong>[Industry]</strong> — Explain product use in this industry.</li>
<li><strong>[Industry]</strong> — Explain product use in this industry.</li>
<li><strong>[Industry]</strong> — Explain product use in this industry.</li>
<li><strong>[Industry]</strong> — Explain product use in this industry.</li>
<li><strong>[Industry]</strong> — Explain product use in this industry mentioning an East African country.</li>
</ul>

D. KEY ADVANTAGES

<h2>Why Choose Finstar Industrial Systems Ltd?</h2>

<ul>
<li><strong>Durability</strong> — Explain long-lasting industrial construction.</li>
<li><strong>Energy Efficiency</strong> — Explain reduced operating costs.</li>
<li><strong>Cost-Effectiveness</strong> — Explain long-term business value.</li>
<li><strong>Low Maintenance</strong> — Explain ease of servicing and cleaning.</li>
<li><strong>Industrial Compliance</strong> — Mention Kenyan or international industrial standards.</li>
<li><strong>Fast Regional Delivery</strong> — Mention Nairobi Kenya distribution and East African delivery.</li>
</ul>



E. FAQ SECTION

<h2>Frequently Asked Questions</h2>

<dl>
<dt>Where can I buy [product name] in Kenya?</dt>
<dd>You can purchase this product directly from <strong>Finstar Industrial Systems Ltd</strong> in Nairobi Kenya.</dd>

<dt>Does Finstar Industrial Systems Ltd deliver across East Africa?</dt>
<dd>Yes. Delivery is available to Uganda, Tanzania, Rwanda, Burundi, DRC Congo, and other East African countries.</dd>



</dl>

F. CALL TO ACTION

<h2>Request a Quote Today</h2>

<p>Looking for <a href="/products/" title="Industrial Equipment Kenya">industrial equipment in Kenya</a>? Contact <strong>Finstar Industrial Systems Ltd</strong> for pricing, installation support, bulk orders, and after-sales service.</p>

<p>📧 Email: <a href="mailto:info@finstarindustrial.com">info@finstarindustrial.com</a></p>

<p>📞 Phone: <a href="tel:+254726559606">+254 726 559 606</a></p>

<p><strong>Finstar Industrial Systems Ltd — Your Trusted Industrial Equipment Supplier in Nairobi Kenya and across East & Central Africa.</strong></p>

──────────────────────────────────────
SEO VALIDATION CHECKLIST
──────────────────────────────────────

Before outputting:
- Ensure "Kenya" appears at least 6 times
- Ensure "Finstar Industrial Systems Ltd" appears at least 4 times
- Ensure at least 3 East African countries are mentioned
- Ensure FAQ section exists
- Ensure one internal link to /products/
- Ensure HTML is valid
- Ensure table structure exists
- Ensure JSON is parseable
- Ensure all three keys exist

──────────────────────────────────────
STRICT OUTPUT RULES
──────────────────────────────────────

- Return ONLY valid JSON.
- No markdown.
- No code fences.
- No commentary.
- No explanations.
- No text outside the JSON object.
- The JSON must parse correctly using json.loads().
- The "description" value MUST be a single-line escaped HTML string.
- All three keys:
  - "name"
  - "short_description"
  - "description"
  MUST exist.
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