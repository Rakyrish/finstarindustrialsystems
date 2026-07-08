"""
AI SEO Optimizer — scoring engine.

Pure function: no DB reads/writes. Scores a candidate SEO content dict
(same shape whether it's a draft or already-live ProductSEO row) across
8 weighted dimensions and returns an overall 0-100 score with detailed
issue detection and recommendations.
"""

import re
from typing import Dict, List, Any, Tuple

REGION_TERMS = [
    "kenya", "uganda", "tanzania", "rwanda", "burundi", "south sudan",
    "dr congo", "drc", "ethiopia", "somalia", "east africa", "central africa",
    "nairobi",
]

DIMENSION_WEIGHTS = {
    "title_optimization": 0.15,
    "meta_optimization": 0.15,
    "content_depth": 0.15,
    "keyword_coverage": 0.15,
    "internal_linking": 0.10,
    "schema_coverage": 0.10,
    "image_seo": 0.10,
    "readability": 0.10,
}


def _strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", value or "")).strip()


def _word_count(text: str) -> int:
    text = _strip_html(text)
    return len(text.split()) if text else 0


def _contains(haystack: str, needle: str) -> bool:
    if not haystack or not needle:
        return False
    return needle.strip().lower() in haystack.lower()


def _combined_text(seo_data: dict) -> str:
    parts = [
        _strip_html(seo_data.get("introduction", "")),
        " ".join(seo_data.get("features") or []),
        " ".join(seo_data.get("benefits") or []),
        " ".join(seo_data.get("applications") or []),
    ]
    for faq in seo_data.get("faqs") or []:
        if isinstance(faq, dict):
            parts.append(faq.get("question", ""))
            parts.append(faq.get("answer", ""))
    return " ".join(p for p in parts if p)


def _score_title(seo_data: dict) -> tuple:
    title = seo_data.get("seo_title", "") or ""
    length = len(title)
    focus_keyword = seo_data.get("focus_keyword", "") or ""

    score = 0
    issues = []

    # Length check
    if 50 <= length <= 60:
        score += 40
    elif 40 <= length <= 70:
        score += 25
        if length < 50:
            issues.append({
                "id": "title_too_short",
                "name": "SEO Title Too Short",
                "severity": "medium",
                "current_value": f"{length} characters",
                "recommended_value": "50-60 characters",
                "seo_impact": "Medium - May not display fully in search results",
                "explanation": "Title tags should be 50-60 characters to display properly in Google search results.",
                "recommended_fix": f"Add {50 - length} more characters to reach optimal length",
                "auto_fixable": True
            })
        else:  # length > 70
            issues.append({
                "id": "title_too_long",
                "name": "SEO Title Too Long",
                "severity": "medium",
                "current_value": f"{length} characters",
                "recommended_value": "50-60 characters",
                "seo_impact": "Medium - May get truncated in search results",
                "explanation": "Title tags over 60 characters may be cut off in search results, reducing click-through rate.",
                "recommended_fix": f"Remove {length - 60} characters to stay within optimal length",
                "auto_fixable": True
            })
    else:
        score += 10
        if length < 40:
            issues.append({
                "id": "title_too_short",
                "name": "SEO Title Too Short",
                "severity": "high",
                "current_value": f"{length} characters",
                "recommended_value": "50-60 characters",
                "seo_impact": "High - Missing opportunity to include important keywords",
                "explanation": "Very short title tags don't utilize the full space available in search results.",
                "recommended_fix": f"Add {50 - length} more characters to reach optimal length",
                "auto_fixable": True
            })
        else:  # length > 70
            issues.append({
                "id": "title_too_long",
                "name": "SEO Title Too Long",
                "severity": "high",
                "current_value": f"{length} characters",
                "recommended_value": "50-60 characters",
                "seo_impact": "High - Gets truncated in search results",
                "explanation": "Title tags over 60 characters are cut off in search results, hurting CTR.",
                "recommended_fix": f"Remove {length - 60} characters to stay within optimal length",
                "auto_fixable": True
            })

    # Focus keyword check
    if _contains(title, focus_keyword):
        score += 30
    else:
        issues.append({
            "id": "title_missing_keyword",
            "name": "Missing Focus Keyword in Title",
            "severity": "high",
            "current_value": "Focus keyword not found",
            "recommended_value": f"Include '{focus_keyword}'",
            "seo_impact": "High - Missing primary ranking signal",
            "explanation": "The focus keyword should appear in the title tag for better relevance signaling.",
            "recommended_fix": f"Include the focus keyword '{focus_keyword}' in your SEO title",
            "auto_fixable": True
        })

    # Regional terms check
    if any(term in title.lower() for term in REGION_TERMS):
        score += 15
    else:
        issues.append({
            "id": "title_missing_region",
            "name": "Missing Geographic Targeting",
            "severity": "medium",
            "current_value": "No regional terms found",
            "recommended_value": "Include Kenya or other target regions",
            "seo_impact": "Medium - Missing local SEO signals",
            "explanation": "Including geographic terms helps with local search visibility.",
            "recommended_fix": "Add 'Kenya' or other target regions to your title",
            "auto_fixable": True
        })

    # Brand check
    if "finstar" in title.lower():
        score += 15
    else:
        issues.append({
            "id": "title_missing_brand",
            "name": "Missing Brand Name",
            "severity": "low",
            "current_value": "Brand name not found",
            "recommended_value": "Include 'Finstar Industrial Systems Ltd'",
            "seo_impact": "Low - Missed branding opportunity",
            "explanation": "Including your brand name builds recognition and trust.",
            "recommended_fix": "Add 'Finstar Industrial Systems Ltd' to your title",
            "auto_fixable": True
        })

    return min(score, 100), issues


def _score_meta(seo_data: dict) -> tuple:
    meta = seo_data.get("meta_description", "") or ""
    length = len(meta)
    focus_keyword = seo_data.get("focus_keyword", "") or ""

    score = 0
    issues = []

    # Length check
    if 140 <= length <= 160:
        score += 40
    elif 120 <= length <= 170:
        score += 25
        if length < 120:
            issues.append({
                "id": "meta_too_short",
                "name": "Meta Description Too Short",
                "severity": "medium",
                "current_value": f"{length} characters",
                "recommended_value": "140-160 characters",
                "seo_impact": "Medium - Missing opportunity to entice clicks",
                "explanation": "Meta descriptions should be 140-160 characters to display properly in search results.",
                "recommended_fix": f"Add {140 - length} more characters to reach optimal length",
                "auto_fixable": True
            })
        else:  # length > 170
            issues.append({
                "id": "meta_too_long",
                "name": "Meta Description Too Long",
                "severity": "medium",
                "current_value": f"{length} characters",
                "recommended_value": "140-160 characters",
                "seo_impact": "Medium - May get truncated in search results",
                "explanation": "Meta descriptions over 160 characters may be cut off in search results.",
                "recommended_fix": f"Remove {length - 160} characters to stay within optimal length",
                "auto_fixable": True
            })
    else:
        score += 10
        if length < 120:
            issues.append({
                "id": "meta_too_short",
                "name": "Meta Description Too Short",
                "severity": "high",
                "current_value": f"{length} characters",
                "recommended_value": "140-160 characters",
                "seo_impact": "High - Wasted opportunity in search results",
                "explanation": "Very short meta descriptions don't utilize the space available in search results.",
                "recommended_fix": f"Add {140 - length} more characters to reach optimal length",
                "auto_fixable": True
            })
        else:  # length > 170
            issues.append({
                "id": "meta_too_long",
                "name": "Meta Description Too Long",
                "severity": "high",
                "current_value": f"{length} characters",
                "recommended_value": "140-160 characters",
                "seo_impact": "High - Gets truncated in search results",
                "explanation": "Meta descriptions over 160 characters are cut off, reducing effectiveness.",
                "recommended_fix": f"Remove {length - 160} characters to stay within optimal length",
                "auto_fixable": True
            })

    # Focus keyword check
    if _contains(meta, focus_keyword):
        score += 30
    else:
        issues.append({
            "id": "meta_missing_keyword",
            "name": "Missing Focus Keyword in Meta Description",
            "severity": "high",
            "current_value": "Focus keyword not found",
            "recommended_value": f"Include '{focus_keyword}'",
            "seo_impact": "High - Missing primary ranking signal",
            "explanation": "The focus keyword should appear in the meta description for better relevance signaling.",
            "recommended_fix": f"Include the focus keyword '{focus_keyword}' in your meta description",
            "auto_fixable": True
        })

    # Action verbs check
    action_verbs = ["contact", "request", "buy", "get", "order", "shop", "discover", "explore", "call"]
    if any(verb in meta.lower() for verb in action_verbs):
        score += 15
    else:
        issues.append({
            "id": "meta_missing_action",
            "name": "Missing Call-to-Action",
            "severity": "medium",
            "current_value": "No action verbs found",
            "recommended_value": "Include action words like 'Contact', 'Request', 'Buy'",
            "seo_impact": "Medium - Lower click-through rate potential",
            "explanation": "Meta descriptions with clear calls-to-action tend to have higher click-through rates.",
            "recommended_fix": "Add a call-to-action like 'Contact us for a quote' or 'Request pricing today'",
            "auto_fixable": True
        })

    # Proper ending check
    if meta and not meta.rstrip().endswith("...") and 50 <= length <= 165:
        score += 15
    elif not meta.rstrip().endswith("..."):
        issues.append({
            "id": "meta_poor_ending",
            "name": "Poor Meta Description Ending",
            "severity": "low",
            "current_value": "Doesn't end properly",
            "recommended_value": "End with ellipsis (...) or complete sentence",
            "seo_impact": "Low - Minor readability issue",
            "explanation": "Meta descriptions should ideally end with punctuation or ellipsis for proper display.",
            "recommended_fix": "Ensure your meta description ends with proper punctuation",
            "auto_fixable": True
        })

    return min(score, 100), issues


def _score_content_depth(seo_data: dict) -> tuple:
    words = _word_count(_combined_text(seo_data))

    score = 0
    issues = []

    if words >= 600:
        score = 100
    elif words >= 400:
        score = 75
        issues.append({
            "id": "content_good_length",
            "name": "Content Length Good",
            "severity": "info",
            "current_value": f"{words} words",
            "recommended_value": "600+ words for optimal SEO",
            "seo_impact": "Low - Good content depth",
            "explanation": "Your content length is good but could be improved for better SEO performance.",
            "recommended_fix": f"Add {600 - words} more words to reach optimal length",
            "auto_fixable": False  # Requires manual content expansion
        })
    elif words >= 250:
        score = 50
        issues.append({
            "id": "content_thin",
            "name": "Content Too Thin",
            "severity": "high",
            "current_value": f"{words} words",
            "recommended_value": "600+ words",
            "seo_impact": "High - Insufficient content for ranking",
            "explanation": "Content under 400 words is considered thin and may not rank well for competitive terms.",
            "recommended_fix": f"Add {600 - words} more words to reach optimal length",
            "auto_fixable": False  # Requires manual content expansion
        })
    elif words >= 100:
        score = 25
        issues.append({
            "id": "content_very_thin",
            "name": "Content Very Thin",
            "severity": "high",
            "current_value": f"{words} words",
            "recommended_value": "600+ words",
            "seo_impact": "High - Very insufficient content for ranking",
            "explanation": "Content under 250 words provides little value to users and search engines.",
            "recommended_fix": f"Add {600 - words} more words to reach optimal length",
            "auto_fixable": False  # Requires manual content expansion
        })
    else:
        score = 10
        issues.append({
            "id": "content_extremely_thin",
            "name": "Content Extremely Thin",
            "severity": "high",
            "current_value": f"{words} words",
            "recommended_value": "600+ words",
            "seo_impact": "High - Extremely insufficient content",
            "explanation": "Content under 100 words provides minimal value and will struggle to rank.",
            "recommended_fix": f"Add {600 - words} more words to reach optimal length",
            "auto_fixable": False  # Requires manual content expansion
        })

    return score, issues


def _score_keyword_coverage(seo_data: dict) -> tuple:
    combined = _combined_text(seo_data)
    intro = seo_data.get("introduction", "")
    focus = seo_data.get("focus_keyword", "") or ""
    score = 0
    issues = []

    # Focus keyword in introduction
    if _contains(intro, focus):
        score += 25
    else:
        issues.append({
            "id": "keyword_missing_in_intro",
            "name": "Missing Focus Keyword in Introduction",
            "severity": "high",
            "current_value": "Focus keyword not found in introduction",
            "recommended_value": f"Include '{focus}' in first 100 words",
            "seo_impact": "High - Missing primary relevance signal",
            "explanation": "The focus keyword should appear early in the content to signal relevance to search engines.",
            "recommended_fix": f"Add the focus keyword '{focus}' to your introduction",
            "auto_fixable": True
        })

    # Secondary keywords check
    secondary = seo_data.get("secondary_keywords") or []
    secondary_found = sum(1 for kw in secondary if _contains(combined, kw))
    if secondary_found >= 3:
        score += 25
    else:
        issues.append({
            "id": "keyword_missing_secondary",
            "name": "Insufficient Secondary Keywords",
            "severity": "medium",
            "current_value": f"{secondary_found}/{len(secondary)} secondary keywords found",
            "recommended_value": "At least 3 secondary keywords",
            "seo_impact": "Medium - Missing semantic relevance signals",
            "explanation": "Secondary keywords help search engines understand the context and relevance of your content.",
            "recommended_fix": f"Add more secondary keywords to your content",
            "auto_fixable": False  # Requires manual content editing
        })

    # Long-tail keywords check
    long_tail = seo_data.get("long_tail_keywords") or []
    long_tail_found = sum(1 for kw in long_tail if _contains(combined, kw))
    if long_tail_found >= 3:
        score += 25
    else:
        issues.append({
            "id": "keyword_missing_longtail",
            "name": "Insufficient Long-Tail Keywords",
            "severity": "medium",
            "current_value": f"{long_tail_found}/{len(long_tail)} long-tail keywords found",
            "recommended_value": "At least 3 long-tail keywords",
            "seo_impact": "Medium - Missing specific search query targeting",
            "explanation": "Long-tail keywords target specific search queries and often have less competition.",
            "recommended_fix": f"Add more long-tail keywords to your content",
            "auto_fixable": False  # Requires manual content editing
        })

    # Keyword density check
    total_words = _word_count(combined)
    if focus and total_words:
        occurrences = combined.lower().count(focus.strip().lower())
        density = (occurrences * len(focus.split())) / total_words * 100
        if 0.5 <= density <= 2.5:
            score += 25
        elif density < 0.5:
            issues.append({
                "id": "keyword_density_low",
                "name": "Keyword Density Too Low",
                "severity": "medium",
                "current_value": f"{density:.1f}%",
                "recommended_value": "0.5-2.5%",
                "seo_impact": "Medium - May not signal relevance strongly enough",
                "explanation": "Keyword density that's too low may not adequately signal relevance to search engines.",
                "recommended_fix": f"Increase usage of '{focus}' to reach 0.5% density",
                "auto_fixable": True
            })
        else:  # density > 2.5
            issues.append({
                "id": "keyword_density_high",
                "name": "Keyword Density Too High",
                "severity": "high",
                "current_value": f"{density:.1f}%",
                "recommended_value": "0.5-2.5%",
                "seo_impact": "High - Risk of keyword stuffing penalty",
                "explanation": "Keyword density over 2.5% may be considered keyword stuffing by search engines.",
                "recommended_fix": f"Reduce usage of '{focus}' to stay under 2.5% density",
                "auto_fixable": True
            })

    return min(score, 100), issues


def _score_internal_linking(seo_data: dict) -> tuple:
    links = seo_data.get("internal_links") or []
    count = len(links)
    score = 0
    issues = []

    if count == 0:
        score = 0
        issues.append({
            "id": "linking_none",
            "name": "No Internal Links",
            "severity": "high",
            "current_value": "0 internal links",
            "recommended_value": "3-5 internal links",
            "seo_impact": "High - Missed opportunity to distribute link equity",
            "explanation": "Internal links help search engines discover content and distribute page authority throughout your site.",
            "recommended_fix": "Add 3-5 relevant internal links to related products or categories",
            "auto_fixable": True  # Can be auto-suggested based on related products
        })
    elif count <= 2:
        score = 50
        issues.append({
            "id": "linking_few",
            "name": "Too Few Internal Links",
            "severity": "medium",
            "current_value": f"{count} internal links",
            "recommended_value": "3-5 internal links",
            "seo_impact": "Medium - Limited internal link equity distribution",
            "explanation": "Having only a few internal links limits your ability to guide users and search engines to related content.",
            "recommended_fix": f"Add {3 - count} more internal links to reach optimal range",
            "auto_fixable": True
        })
    elif count <= 5:
        score = 85
        # No issue for good range
    else:
        score = 100
        # No issue for excellent range

    # Check for external links (should be internal only)
    external_links = [link for link in links if isinstance(link, dict) and not str(link.get("url", "")).startswith("/")]
    if external_links:
        score = max(score - 20, 0)
        issues.append({
            "id": "linking_external",
            "name": "External Links in Internal Links Field",
            "severity": "medium",
            "current_value": f"{len(external_links)} external links found",
            "recommended_value": "0 external links",
            "seo_impact": "Medium - Incorrect field usage dilutes internal linking signals",
            "explanation": "The internal_links field should only contain links to pages within your own domain.",
            "recommended_fix": "Remove external links and ensure all links point to your own domain",
            "auto_fixable": True
        })

    return score, issues


def _score_schema_coverage(seo_data: dict) -> tuple:
    score = 0
    issues = []
    schema_types = ["product_schema", "faq_schema", "breadcrumb_schema", "organization_schema"]

    for i, key in enumerate(schema_types):
        schema = seo_data.get(key) or {}
        if isinstance(schema, dict) and schema.get("@type") and schema.get("@context"):
            score += 25
        else:
            schema_names = {
                "product_schema": "Product Schema",
                "faq_schema": "FAQ Schema",
                "breadcrumb_schema": "Breadcrumb Schema",
                "organization_schema": "Organization Schema"
            }
            issues.append({
                "id": f"schema_missing_{key}",
                "name": f"Missing {schema_names[key]}",
                "severity": "high" if key in ["product_schema", "faq_schema"] else "medium",
                "current_value": "Not implemented or invalid",
                "recommended_value": "Valid schema.org JSON-LD",
                "seo_impact": "High" if key in ["product_schema", "faq_schema"] else "Medium",
                "explanation": f"{schema_names[key]} helps search engines understand your content and enables rich results.",
                "recommended_fix": f"Ensure {schema_names[key]} is properly implemented with valid JSON-LD",
                "auto_fixable": True  # These are generated by the system
            })

    return score, issues


def _score_image_seo(seo_data: dict) -> tuple:
    fields = [
        "image_seo_filename", "image_alt_text", "image_title",
        "image_caption", "image_description",
    ]
    score = 0
    issues = []
    field_names = {
        "image_seo_filename": "Image SEO Filename",
        "image_alt_text": "Image Alt Text",
        "image_title": "Image Title",
        "image_caption": "Image Caption",
        "image_description": "Image Description"
    }

    for field in fields:
        value = (seo_data.get(field) or "").strip()
        if len(value) >= 5:
            score += 20
        else:
            issues.append({
                "id": f"image_{field}",
                "name": f"Missing or Incomplete {field_names[field]}",
                "severity": "high" if field == "image_alt_text" else "medium",
                "current_value": f"'{value}' ({len(value)} characters)",
                "recommended_value": "At least 5 characters",
                "seo_impact": "High" if field == "image_alt_text" else "Medium",
                "explanation": f"{field_names[field]} is important for image SEO and accessibility.",
                "recommended_fix": f"Provide a descriptive {field_names[field]} with at least 5 characters",
                "auto_fixable": True
            })

    return score, issues


def _score_readability(seo_data: dict) -> tuple:
    text = " ".join([
        _strip_html(seo_data.get("introduction", "")),
        " ".join(seo_data.get("features") or []),
        " ".join(seo_data.get("benefits") or []),
    ]).strip()
    if not text:
        return 40, [{
            "id": "readability_no_content",
            "name": "Insufficient Content for Readability Analysis",
            "severity": "high",
            "current_value": "No readable text found",
            "recommended_value": "Sufficient content for analysis",
            "seo_impact": "High - Cannot assess readability",
            "explanation": "There isn't enough content to analyze readability.",
            "recommended_fix": "Add more descriptive content to improve readability",
            "auto_fixable": False
        }]

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if not sentences:
        return 40, [{
            "id": "readability_no_sentences",
            "name": "No Sentences Detected",
            "severity": "high",
            "current_value": "No sentences found",
            "recommended_value": "Proper sentence structure",
            "seo_impact": "High - Cannot assess readability",
            "explanation": "No proper sentences were found in the content.",
            "recommended_fix": "Ensure content is written in complete sentences",
            "auto_fixable": False
        }]

    sentence_lengths = [len(s.split()) for s in sentences]
    avg_len = sum(sentence_lengths) / len(sentence_lengths)

    issues = []
    score = 0

    # Average sentence length scoring
    if 12 <= avg_len <= 20:
        score = 100
    elif 8 <= avg_len <= 25:
        score = 70
        issues.append({
            "id": "readability_sentence_length",
            "name": "Sentence Length Needs Improvement",
            "severity": "medium",
            "current_value": f"Average {avg_len:.1f} words per sentence",
            "recommended_value": "12-20 words per sentence",
            "seo_impact": "Medium - Readability affects user engagement",
            "explanation": "Sentences that are too short or too long can reduce readability and user engagement.",
            "recommended_fix": f"Aim for {12 - avg_len:.1f} to {20 - avg_len:.1f} more words per sentence" if avg_len < 12 else f"Aim for {avg_len - 20:.1f} to {avg_len - 8:.1f} fewer words per sentence",
            "auto_fixable": False  # Requires content rewriting
        })
    else:
        score = 40
        issues.append({
            "id": "readability_sentence_length_poor",
            "name": "Poor Sentence Length",
            "severity": "high",
            "current_value": f"Average {avg_len:.1f} words per sentence",
            "recommended_value": "12-20 words per sentence",
            "seo_impact": "High - Poor readability reduces user engagement",
            "explanation": "Sentences outside the 8-25 word range significantly reduce readability.",
            "recommended_fix": f"Aim for 12-20 words per sentence (currently {avg_len:.1f})",
            "auto_fixable": False  # Requires content rewriting
        })

    # Very long sentence check
    very_long_sentences = [l for l in sentence_lengths if l > 40]
    if very_long_sentences:
        if score > 40:  # Only deduct if we haven't already scored low
            score = max(score - 10, 0)
        issues.append({
            "id": "readability_very_long_sentences",
            "name": "Very Long Sentences Detected",
            "severity": "medium",
            "current_value": f"{len(very_long_sentences)} sentence(s) over 40 words",
            "recommended_value": "No sentences over 40 words",
            "seo_impact": "Medium - Very long sentences hurt readability",
            "explanation": "Sentences over 40 words are difficult to read and comprehend.",
            "recommended_fix": "Break very long sentences into shorter, more digestible ones",
            "auto_fixable": False  # Requires content rewriting
        })

    return score, issues


def score_seo_content(product, seo_data: dict) -> dict:
    """Score a candidate SEO content dict. `product` is currently unused
    but kept in the signature so future dimensions can factor in product
    fields (e.g. specs completeness) without changing every call site."""

    # Score each dimension and collect issues
    title_score, title_issues = _score_title(seo_data)
    meta_score, meta_issues = _score_meta(seo_data)
    content_score, content_issues = _score_content_depth(seo_data)
    keyword_score, keyword_issues = _score_keyword_coverage(seo_data)
    linking_score, linking_issues = _score_internal_linking(seo_data)
    schema_score, schema_issues = _score_schema_coverage(seo_data)
    image_score, image_issues = _score_image_seo(seo_data)
    readability_score, readability_issues = _score_readability(seo_data)

    breakdown = {
        "title_optimization": title_score,
        "meta_optimization": meta_score,
        "content_depth": content_score,
        "keyword_coverage": keyword_score,
        "internal_linking": linking_score,
        "schema_coverage": schema_score,
        "image_seo": image_score,
        "readability": readability_score,
    }

    # Combine all issues
    all_issues = (
        title_issues + meta_issues + content_issues + keyword_issues +
        linking_issues + schema_issues + image_issues + readability_issues
    )

    overall = round(sum(breakdown[dim] * weight for dim, weight in DIMENSION_WEIGHTS.items()))

    return {
        "overall": overall,
        "breakdown": breakdown,
        "is_optimized": overall > 90,
        "issues": all_issues  # New field for detailed issue reporting
    }
