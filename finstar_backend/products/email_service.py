"""
Finstar Industrial Systems — Email Service
==========================================
Centralized Resend-based transactional email service.

Architecture:
  - EmailPayload dataclass: typed input for all email triggers
  - build_notification_html(): renders company notification email
  - build_confirmation_html(): renders customer auto-reply email
  - send_inquiry_emails(): entry point — sends both emails after DB save
  - All failures are caught and logged; inquiry save is NEVER blocked

Usage (from views.py):
    from products.email_service import send_inquiry_emails, EmailPayload
    payload = EmailPayload(name=..., email=..., message=..., ...)
    send_inquiry_emails(payload)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import resend
from django.conf import settings

logger = logging.getLogger("products")

# ── Typed payload ─────────────────────────────────────────────────────────────

@dataclass
class EmailPayload:
    name: str
    email: str
    message: str
    phone: str = ""
    company: str = ""
    subject_label: str = "General Inquiry"
    products: list[str] = field(default_factory=list)   # saved/tagged product names
    source_url: str = ""
    inquiry_id: Optional[int] = None
    submitted_at: Optional[datetime] = None
    def __post_init__(self):
        if self.submitted_at is None:
            self.submitted_at = datetime.now()


# ── HTML Email Templates ──────────────────────────────────────────────────────

def _base_wrapper(content: str, title: str) -> str:
    """Shared responsive HTML shell used by both templates."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f4c81,#1a6cb8);border-radius:16px 16px 0 0;padding:28px 32px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#f97316;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Finstar Industrial Systems Ltd</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">{title}</h1>
                  </td>
                  <td style="text-align:right;vertical-align:middle;">
                    <div style="background:#fff;width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
                      <img src="https://finstarindustrials.com/_next/image?url=%2Flogo.png&w=128&q=75" alt="Finstar Logo" style="width:100%;height:100%;object-fit:contain;border-radius:12px;" />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Orange accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#f97316,#ea580c,#f97316);"></td></tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
                Finstar Industrial Systems Ltd · Industrial Area, Nairobi, Kenya<br />
                <a href="tel:+254726559606" style="color:#94a3b8;text-decoration:none;">+254 726 559 606</a> ·
                <a href="mailto:finstarindustrial@gmail.com" style="color:#94a3b8;text-decoration:none;">finstarindustrial@gmail.com</a><br />
                <a href="https://finstarindustrials.com" style="color:#94a3b8;text-decoration:none;">finstarindustrials.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_notification_html(p: EmailPayload) -> str:
    """Company notification email — sent to finstarindustrial@gmail.com."""

    # Build products list section
    products_section = ""
    if p.products:
        items = "".join(
            f'<tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;">• {name}</td></tr>'
            for name in p.products
        )
        products_section = f"""
        <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#ea580c;">Tagged Products</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            {items}
          </table>
        </div>"""

    source_row = f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Source URL</span><br/>
            <a href="{p.source_url}" style="font-size:13px;color:#0f4c81;text-decoration:underline;">{p.source_url}</a>
          </td>
        </tr>""" if p.source_url else ""

    content = f"""
      <!-- Alert banner -->
      <div style="background:#eff6ff;border-left:4px solid #0f4c81;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#1e3a5f;">
          🔔 A new inquiry has been submitted via finstarindustrials.com
        </p>
      </div>

      <!-- Contact details -->
      <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Customer Details</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Full Name</span><br/>
            <span style="font-size:15px;font-weight:700;color:#0f172a;">{p.name}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Email Address</span><br/>
            <a href="mailto:{p.email}" style="font-size:14px;font-weight:600;color:#0f4c81;text-decoration:none;">{p.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Phone Number</span><br/>
            <span style="font-size:14px;color:#0f172a;">{p.phone or '<em style="color:#94a3b8;">Not provided</em>'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Company</span><br/>
            <span style="font-size:14px;color:#0f172a;">{p.company or '<em style="color:#94a3b8;">Not provided</em>'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Subject</span><br/>
            <span style="font-size:14px;font-weight:600;color:#0f172a;">{p.subject_label}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Submitted</span><br/>
            <span style="font-size:13px;color:#475569;">{p.submitted_at.strftime('%d %B %Y at %H:%M') if p.submitted_at else 'N/A'}</span>
          </td>
        </tr>
        {source_row}
      </table>

      {products_section}

      <!-- Message -->
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Inquiry Message</h2>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;white-space:pre-wrap;font-size:14px;line-height:1.75;color:#334155;">
{p.message}
      </div>

      <!-- Reply CTA -->
      <div style="margin-top:28px;text-align:center;">
        <a href="mailto:{p.email}?subject=Re: {p.subject_label} — Finstar Industrial Systems"
           style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
          Reply to {p.name.split()[0]}
        </a>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">
          Inquiry #{p.inquiry_id or 'N/A'} · Received via finstarindustrials.com
        </p>
      </div>
    """
    return _base_wrapper(content, "New Inquiry Received")


def build_confirmation_html(p: EmailPayload) -> str:
    """Customer auto-reply email — acknowledges receipt professionally."""

    first_name = p.name.split()[0]

    products_section = ""
    if p.products:
        items = "".join(
            f'<li style="padding:4px 0;color:#475569;font-size:13px;">• {name}</li>'
            for name in p.products
        )
        products_section = f"""
      <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 10px 10px 0;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#ea580c;">Products in your inquiry</p>
        <ul style="margin:0;padding:0;list-style:none;">{items}</ul>
      </div>"""

    message_preview = (p.message[:280] + "…") if len(p.message) > 280 else p.message

    content = f"""
      <!-- Greeting -->
      <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#0f172a;">
        Hello {first_name},
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.75;color:#475569;">
        Thank you for contacting <strong>Finstar Industrial Systems Ltd</strong>.
        We have successfully received your inquiry and our technical team will review it shortly.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.75;color:#475569;">
        We typically respond within <strong>a few minutes</strong>. If your request is urgent,
        please contact us directly using the details below.
      </p>

      <!-- Inquiry summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Your Inquiry Summary</p>
        <p style="margin:0 0 6px;font-size:13px;color:#64748b;"><strong style="color:#0f172a;">Subject:</strong> {p.subject_label}</p>
        <p style="margin:0;font-size:13px;color:#64748b;white-space:pre-wrap;line-height:1.65;">{message_preview}</p>
      </div>

      {products_section}

      <!-- Contact details -->
      <div style="background:linear-gradient(135deg,#0f4c81,#1a6cb8);border-radius:12px;padding:24px;margin:24px 0;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#93c5fd;">Contact Us Directly</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;">
              <span style="color:#f97316;font-size:14px;">📞</span>
              <a href="tel:+254726559606" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;margin-left:8px;">+254 726 559 606</a>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;">
              <span style="color:#f97316;font-size:14px;">✉️</span>
              <a href="mailto:finstarindustrial@gmail.com" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;margin-left:8px;">finstarindustrial@gmail.com</a>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;">
              <span style="color:#f97316;font-size:14px;">🌐</span>
              <a href="https://finstarindustrials.com" style="color:#ffffff;font-size:14px;text-decoration:none;margin-left:8px;">finstarindustrials.com</a>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;">
              <span style="color:#f97316;font-size:14px;">📍</span>
              <span style="color:#bfdbfe;font-size:13px;margin-left:8px;">Industrial Area, Nairobi, Kenya</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.75;color:#475569;">
        Warm regards,<br />
        <strong style="color:#0f172a;">The Finstar Industrial Systems Team</strong><br />
        <span style="color:#94a3b8;font-size:12px;">Refrigeration · HVAC · Boilers · Industrial Engineering</span>
      </p>
    """
    return _base_wrapper(content, f"We received your inquiry – Finstar Industrial Systems Ltd")


# ── Core send function ────────────────────────────────────────────────────────

def send_inquiry_emails(payload: EmailPayload) -> dict[str, bool]:
    """
    Send both emails (notification + confirmation) after inquiry is saved.

    Returns:
        {"notification": bool, "confirmation": bool}

    Never raises — all exceptions are caught and logged so the inquiry
    submission is never blocked by an email failure.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        logger.warning(
            "[EmailService] RESEND_API_KEY not configured — emails skipped "
            "(inquiry id=%s still saved to DB)",
            payload.inquiry_id,
        )
        return {"notification": False, "confirmation": False}

    resend.api_key = api_key
    from_addr = getattr(settings, "COMPANY_FROM_EMAIL", "Finstar Industrial Systems <onboarding@resend.dev>")
    company_email = getattr(settings, "COMPANY_NOTIFICATION_EMAIL", "finstarindustrial@gmail.com")

    results: dict[str, bool] = {"notification": False, "confirmation": False}

    # ── 1. Company notification ───────────────────────────────────────────────
    try:
        resend.Emails.send({
            "from": from_addr,
            "to": [company_email],
            "reply_to": payload.email,
            "subject": f"New Inquiry from {payload.name} – {payload.subject_label}",
            "html": build_notification_html(payload),
        })
        results["notification"] = True
        logger.info(
            "[EmailService] Notification sent → %s (inquiry id=%s)",
            company_email,
            payload.inquiry_id,
        )
    except Exception as exc:
        logger.error(
            "[EmailService] Notification FAILED (inquiry id=%s): %s",
            payload.inquiry_id,
            exc,
            exc_info=True,
        )

    # ── 2. Customer auto-reply ────────────────────────────────────────────────
    try:
        resend.Emails.send({
            "from": from_addr,
            "to": [payload.email],
            "subject": "We received your inquiry – Finstar Industrial Systems Ltd",
            "html": build_confirmation_html(payload),
        })
        results["confirmation"] = True
        logger.info(
            "[EmailService] Confirmation sent → %s (inquiry id=%s)",
            payload.email,
            payload.inquiry_id,
        )
    except Exception as exc:
        logger.error(
            "[EmailService] Confirmation FAILED (inquiry id=%s): %s",
            payload.inquiry_id,
            exc,
            exc_info=True,
        )

    return results


# ── Low-Stock Alert ────────────────────────────────────────────────────────────

def send_low_stock_alert(
    item_name: str,
    quantity: int,
    reorder_level: int,
    section: str | None = None,
) -> bool:
    """
    Send a low-stock email alert to the admin/company email.

    Called from signals.py when quantity <= reorder_level.
    Never raises — all exceptions are caught and logged.

    Returns True if email was sent successfully.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        logger.warning(
            "[EmailService] RESEND_API_KEY not configured — low-stock alert skipped for '%s'",
            item_name,
        )
        return False

    resend.api_key = api_key
    from_addr = getattr(settings, "COMPANY_FROM_EMAIL", "Finstar Industrial Systems <onboarding@resend.dev>")
    company_email = getattr(settings, "COMPANY_NOTIFICATION_EMAIL", "finstarindustrial@gmail.com")

    status_label = "OUT OF STOCK" if quantity == 0 else "LOW STOCK"
    status_color = "#dc2626" if quantity == 0 else "#f97316"
    status_bg = "#fef2f2" if quantity == 0 else "#fff7ed"
    emoji = "🚫" if quantity == 0 else "⚠️"
    section_row = (
        f'<p style="margin:0 0 6px;font-size:13px;color:#64748b;">'
        f'<strong style="color:#0f172a;">Section:</strong> {section}</p>'
    ) if section else ""

    content = f"""
      <div style="background:{status_bg};border-left:4px solid {status_color};border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:{status_color};">
          {emoji} {status_label} ALERT — Immediate attention required
        </p>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Item Details</p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;">{item_name}</p>
        {section_row}
        <p style="margin:0 0 6px;font-size:13px;color:#64748b;">
          <strong style="color:#0f172a;">Current Stock:</strong>
          <span style="color:{status_color};font-weight:700;font-size:16px;margin-left:4px;">{quantity} unit(s)</span>
        </p>
        <p style="margin:0;font-size:13px;color:#64748b;">
          <strong style="color:#0f172a;">Reorder Level:</strong> {reorder_level} unit(s)
        </p>
      </div>

      <div style="background:linear-gradient(135deg,#0f4c81,#1a6cb8);border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#93c5fd;">Recommended Action</p>
        <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.6;">
          Please contact your supplier to restock <strong>{item_name}</strong> immediately.
          Update the inventory in the admin dashboard once the stock is received.
        </p>
      </div>

      <div style="margin-top:20px;text-align:center;">
        <a href="{getattr(settings, 'SITE_URL', 'https://finstarindustrials.com')}/admin-dashboard"
           style="display:inline-block;background:linear-gradient(135deg,{status_color},{status_color}cc);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
          View Inventory Dashboard
        </a>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">
          This alert was triggered automatically by the Finstar inventory system.
        </p>
      </div>
    """

    html = _base_wrapper(content, f"{emoji} {status_label}: {item_name}")

    try:
        resend.Emails.send({
            "from": from_addr,
            "to": [company_email],
            "subject": f"[Finstar Inventory] {status_label}: {item_name} — only {quantity} left",
            "html": html,
        })
        logger.info(
            "[EmailService] Low-stock alert sent for '%s' (qty=%d, reorder=%d)",
            item_name, quantity, reorder_level,
        )
        return True
    except Exception as exc:
        logger.error(
            "[EmailService] Low-stock alert FAILED for '%s': %s",
            item_name, exc, exc_info=True,
        )
        return False

