"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Icons ────────────────────────────────────────────────────────────────────

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    <path d="M8 12h.01" />
    <path d="M12 12h.01" />
    <path d="M16 12h.01" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
);

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: number;
  sender: "user" | "bot";
  message: string;
  created_at: string;
}

type PanelView = "menu" | "chat";

const API_BASE = process.env.NEXT_PUBLIC_API_URL + "api";

const PHONE = "254726559606";
const EMAIL = "info@finstarindustrial.com";
const WA_MESSAGE = encodeURIComponent("Hello, I'd like to learn more about your industrial equipment.");

// ── Component ────────────────────────────────────────────────────────────────

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("menu");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("finstar_chat_session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.sessionId) setSessionId(data.sessionId);
        if (data.messages) setMessages(data.messages);
      } catch { /* ignore */ }
    }
  }, []);

  // Persist session
  useEffect(() => {
    if (sessionId || messages.length > 0) {
      localStorage.setItem("finstar_chat_session", JSON.stringify({ sessionId, messages }));
    }
  }, [sessionId, messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Focus input when chat opens
  useEffect(() => {
    if (view === "chat" && open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [view, open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || rateLimited) return;

    const userMsg: ChatMsg = {
      id: Date.now(),
      sender: "user",
      message: text,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
        }),
      });

      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);
      if (data.rate_limited) setRateLimited(true);

      const botMsg: ChatMsg = {
        id: Date.now() + 1,
        sender: "bot",
        message: data.reply || "Sorry, something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMsg = {
        id: Date.now() + 1,
        sender: "bot",
        message: "Connection error. Please try again or contact us directly at +254 726 559 606.",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId, rateLimited]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setRateLimited(false);
    localStorage.removeItem("finstar_chat_session");
  };

  const toggleOpen = () => {
    setOpen(prev => !prev);
    if (!open) setView("menu");
  };

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking the fab button (it has its own toggle logic)
      const target = event.target as Node;
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !document.getElementById("support-widget-fab")?.contains(target)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="support-widget" id="support-widget">
      {/* Floating Action Button */}
      <button
        id="support-widget-fab"
        onClick={toggleOpen}
        className="support-widget__fab"
        aria-label={open ? "Close support" : "Open support"}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Panel */}
      {open && (
        <div className="support-widget__panel" ref={panelRef}>
          {view === "menu" ? (
            /* ── Contact Menu ─────────────────────────────────────── */
            <div className="support-widget__menu">
              <div className="support-widget__header">
                <div className="support-widget__header-logo">
                  <span className="support-widget__logo-dot" />
                  <div>
                    <h3 className="support-widget__header-title">Finstar Support</h3>
                    <p className="support-widget__header-sub">How can we help you today?</p>
                  </div>
                </div>
                <button onClick={toggleOpen} className="support-widget__close-btn" aria-label="Close widget">
                  <CloseIcon />
                </button>
              </div>

              <div className="support-widget__options">
                <a
                  href={`https://wa.me/${PHONE}?text=${WA_MESSAGE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-widget__option support-widget__option--whatsapp"
                  id="support-widget-whatsapp"
                >
                  <div className="support-widget__option-icon support-widget__option-icon--whatsapp">
                    <WhatsAppIcon />
                  </div>
                  <div className="support-widget__option-text">
                    <span className="support-widget__option-label">WhatsApp</span>
                    <span className="support-widget__option-desc">Quick response • Usually instant</span>
                  </div>
                  <span className="support-widget__option-badge">Recommended</span>
                </a>

                <a
                  href={`tel:+${PHONE}`}
                  className="support-widget__option support-widget__option--call"
                  id="support-widget-call"
                >
                  <div className="support-widget__option-icon support-widget__option-icon--call">
                    <PhoneIcon />
                  </div>
                  <div className="support-widget__option-text">
                    <span className="support-widget__option-label">Call Us</span>
                    <span className="support-widget__option-desc">+254 726 559 606</span>
                  </div>
                  <span className="support-widget__option-badge">Recommended</span>
                </a>

                <a
                  href={`mailto:${EMAIL}`}
                  className="support-widget__option support-widget__option--email"
                  id="support-widget-email"
                >
                  <div className="support-widget__option-icon support-widget__option-icon--email">
                    <EmailIcon />
                  </div>
                  <div className="support-widget__option-text">
                    <span className="support-widget__option-label">Email</span>
                    <span className="support-widget__option-desc">{EMAIL}</span>
                  </div>
                </a>

                <button
                  onClick={() => setView("chat")}
                  className="support-widget__option support-widget__option--chat"
                  id="support-widget-chatbot"
                >
                  <div className="support-widget__option-icon support-widget__option-icon--chat">
                    <BotIcon />
                  </div>
                  <div className="support-widget__option-text">
                    <span className="support-widget__option-label">AI Assistant</span>
                    <span className="support-widget__option-desc">Chat with our AI • 24/7</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* ── Chat View ────────────────────────────────────────── */
            <div className="support-widget__chat">
              <div className="support-widget__chat-header">
                <button onClick={() => setView("menu")} className="support-widget__back-btn" aria-label="Back to menu">
                  <BackIcon />
                </button>
                <div className="support-widget__chat-header-info">
                  <h3 className="support-widget__chat-title">Finstar AI Assistant</h3>
                  <span className="support-widget__chat-status">
                    <span className="support-widget__status-dot" />
                    Online
                  </span>
                </div>
                <div className="support-widget__chat-actions">
                  <button onClick={startNewChat} className="support-widget__new-chat-btn" title="Start new conversation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="12" x2="12" y1="8" y2="14" /><line x1="9" x2="15" y1="11" y2="11" /></svg>
                  </button>
                  <button onClick={toggleOpen} className="support-widget__close-btn" aria-label="Close widget" title="Close">
                    <CloseIcon />
                  </button>
                </div>
              </div>

              <div className="support-widget__messages">
                {messages.length === 0 && (
                  <div className="support-widget__welcome">
                    <div className="support-widget__welcome-icon">🤖</div>
                    <p className="support-widget__welcome-text">
                      Hi! I&apos;m the Finstar AI Assistant. Ask me about our industrial equipment, refrigeration, HVAC, boilers, and more!
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`support-widget__msg support-widget__msg--${msg.sender}`}
                  >
                    <div className={`support-widget__bubble support-widget__bubble--${msg.sender}`}>
                      {msg.message}
                    </div>
                    <span className="support-widget__msg-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}

                {sending && (
                  <div className="support-widget__msg support-widget__msg--bot">
                    <div className="support-widget__bubble support-widget__bubble--bot support-widget__typing">
                      <span className="support-widget__dot" />
                      <span className="support-widget__dot" />
                      <span className="support-widget__dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="support-widget__input-area">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={rateLimited ? "Message limit reached" : "Type your message..."}
                  disabled={sending || rateLimited}
                  className="support-widget__input"
                  id="support-widget-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending || rateLimited}
                  className="support-widget__send-btn"
                  aria-label="Send message"
                  id="support-widget-send"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
