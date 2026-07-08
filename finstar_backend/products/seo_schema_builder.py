"""
AI SEO Optimizer — deterministic JSON-LD schema builders.

Schema is built in Python from real product data + generated SEO content,
never by the LLM directly, so it is always structurally valid and never
references a fabricated URL.
"""

SITE_URL = "https://finstarindustrials.com"
SITE_NAME = "Finstar Industrial Systems Ltd"
BUSINESS_ADDRESS = "Industrial Area, Enterprise Road, Nairobi, Kenya"
BUSINESS_CITY = "Nairobi"
BUSINESS_COUNTRY = "Kenya"
BUSINESS_PHONE = "+254726559606"
BUSINESS_EMAIL = "info@finstarindustrial.com"


def _absolute_url(path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{SITE_URL}{path if path.startswith('/') else f'/{path}'}"


def build_product_schema(product, seo_data: dict) -> dict:
    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": seo_data.get("meta_description") or product.short_description,
        "category": product.category.name if product.category_id else "",
        "url": _absolute_url(f"/products/{product.slug}"),
        "brand": {
            "@type": "Brand",
            "name": SITE_NAME,
        },
    }
    if product.image_url:
        schema["image"] = product.image_url
    return schema


def build_faq_schema(seo_data: dict) -> dict:
    faqs = seo_data.get("faqs") or []
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": faq.get("question", ""),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.get("answer", ""),
                },
            }
            for faq in faqs
            if isinstance(faq, dict) and faq.get("question") and faq.get("answer")
        ],
    }


def build_breadcrumb_schema(product) -> dict:
    items = [
        {"name": "Home", "url": "/"},
        {"name": "Products", "url": "/products"},
    ]
    if product.category_id:
        items.append({
            "name": product.category.name,
            "url": f"/products/category/{product.category.slug}",
        })
    items.append({"name": product.name, "url": f"/products/{product.slug}"})

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index + 1,
                "name": item["name"],
                "item": _absolute_url(item["url"]),
            }
            for index, item in enumerate(items)
        ],
    }


def build_organization_schema() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL,
        "logo": _absolute_url("/logo.png"),
        "address": {
            "@type": "PostalAddress",
            "streetAddress": BUSINESS_ADDRESS,
            "addressLocality": BUSINESS_CITY,
            "addressCountry": BUSINESS_COUNTRY,
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": BUSINESS_PHONE,
            "email": BUSINESS_EMAIL,
            "contactType": "sales",
        },
        "areaServed": [
            "Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi",
            "South Sudan", "DR Congo", "Ethiopia", "Somalia",
        ],
    }


def build_all_schemas(product, seo_data: dict) -> dict:
    return {
        "product_schema": build_product_schema(product, seo_data),
        "faq_schema": build_faq_schema(seo_data),
        "breadcrumb_schema": build_breadcrumb_schema(product),
        "organization_schema": build_organization_schema(),
    }
