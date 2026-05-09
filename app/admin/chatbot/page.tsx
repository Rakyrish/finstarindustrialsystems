"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import {
    getAdminChatInsights,
    getAdminChatSession,
    getAdminChatSessions,
    type ChatInsights,
    type ChatSessionDetail,
    type ChatSessionSummary,
} from "@/lib/api";

// ── Loader ───────────────────────────────────────────────────────────────────

const Spinner = () => (
    <div className="flex items-center justify-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-orange-500">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    </div>
);

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminChatbotPage() {
    const [insights, setInsights] = useState<ChatInsights | null>(null);
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [selectedSession, setSelectedSession] = useState<ChatSessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingConv, setLoadingConv] = useState(false);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Load insights and sessions
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [insightsData, sessionsData] = await Promise.all([
                getAdminChatInsights(),
                getAdminChatSessions({ page, search: deferredSearch || undefined }),
            ]);
            setInsights(insightsData);
            setSessions(sessionsData.results);
            const pageSize = 20;
            setTotalPages(Math.ceil(sessionsData.count / pageSize) || 1);
        } catch (err) {
            console.error("Failed to load chatbot data:", err);
        } finally {
            setLoading(false);
        }
    }, [page, deferredSearch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Load individual session
    const openSession = async (sessionId: string) => {
        setActiveSessionId(sessionId);
        setLoadingConv(true);
        try {
            const detail = await getAdminChatSession(sessionId);
            setSelectedSession(detail);
        } catch (err) {
            console.error("Failed to load session:", err);
        } finally {
            setLoadingConv(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [deferredSearch]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatShortDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) {
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    };

    if (loading && !insights) {
        return <Spinner />;
    }

    const statCards = [
        { label: "Total Conversations", value: insights?.total_sessions ?? 0 },
        { label: "Total Messages", value: insights?.total_messages ?? 0 },
        { label: "Messages Today", value: insights?.messages_today ?? 0 },
        { label: "Active (24h)", value: insights?.active_sessions_24h ?? 0 },
        { label: "Quote Intent", value: insights?.quote_intent_count ?? 0 },
        { label: "Failed Responses", value: insights?.failed_responses_count ?? 0 },
        { label: "Rate Limited", value: insights?.rate_limited_count ?? 0 },
        { label: "Avg Msg / Session", value: insights?.usage_statistics?.avg_messages_per_session ?? 0 },
    ];

    const formatIntent = (value?: string) =>
        value
            ? value
                .split("_")
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ")
            : "General";

    return (
        <div className="admin-chat">
            <div className="admin-chat__stats">
                {statCards.map(card => (
                    <div key={card.label} className="admin-chat__stat-card">
                        <span className="admin-chat__stat-value">{card.value}</span>
                        <span className="admin-chat__stat-label">{card.label}</span>
                    </div>
                ))}
            </div>

            <div className="admin-chat__main">
                <div className="admin-chat__sessions">
                    <div className="admin-chat__sessions-header">
                        <h2 className="admin-chat__sessions-title">Conversations</h2>
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="admin-chat__search"
                            id="admin-chat-search"
                        />
                    </div>

                    <div className="admin-chat__sessions-list">
                        {sessions.length === 0 ? (
                            <div className="admin-chat__empty" style={{ height: "200px" }}>
                                <span className="admin-chat__empty-icon">💬</span>
                                <span className="admin-chat__empty-text">
                                    {search ? "No conversations match your search" : "No conversations yet"}
                                </span>
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => openSession(session.id)}
                                    className={`admin-chat__session-item ${activeSessionId === session.id ? "admin-chat__session-item--active" : ""
                                        }`}
                                >
                                    <div className="admin-chat__session-meta">
                                        <span className="admin-chat__session-id">
                                            #{session.id.slice(0, 8)}
                                        </span>
                                        <span className="admin-chat__session-time">
                                            {formatShortDate(session.updated_at)}
                                        </span>
                                    </div>
                                    <span className="admin-chat__session-preview">
                                        {session.last_message_preview || "No messages"}
                                    </span>
                                    <span className="admin-chat__session-count">
                                        {session.message_count} message{session.message_count !== 1 ? "s" : ""}
                                        {session.user_identifier ? ` • ${session.user_identifier}` : ""}
                                        {session.last_message_at ? ` • ${formatShortDate(session.last_message_at)}` : ""}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="admin-chat__pagination">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="admin-chat__page-btn"
                            >
                                ← Prev
                            </button>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", alignSelf: "center" }}>
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="admin-chat__page-btn"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>

                <div className="admin-chat__conversation">
                    {loadingConv ? (
                        <Spinner />
                    ) : selectedSession ? (
                        <>
                            <div className="admin-chat__conv-header">
                                <h3 className="admin-chat__conv-title">
                                    Session #{selectedSession.id.slice(0, 8)}
                                </h3>
                                <span className="admin-chat__conv-meta">
                                    Started {formatDate(selectedSession.created_at)}
                                    {selectedSession.user_identifier && ` • IP: ${selectedSession.user_identifier}`}
                                    {" • "}
                                    {selectedSession.message_count} messages
                                </span>
                            </div>

                            <div className="admin-chat__conv-messages">
                                {selectedSession.messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`admin-chat__conv-msg admin-chat__conv-msg--${msg.sender}`}
                                    >
                                        <div className={`admin-chat__conv-bubble admin-chat__conv-bubble--${msg.sender}`}>
                                            {msg.message}
                                        </div>
                                        <div className="admin-chat__conv-tags">
                                            {msg.detected_intent && (
                                                <span className="admin-chat__tag">{formatIntent(msg.detected_intent)}</span>
                                            )}
                                            {msg.matched_product_name && (
                                                <span className="admin-chat__tag">{msg.matched_product_name}</span>
                                            )}
                                            {msg.status && msg.status !== "normal" && (
                                                <span className="admin-chat__tag admin-chat__tag--alert">
                                                    {formatIntent(msg.status)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="admin-chat__conv-time">
                                            {formatDate(msg.created_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="admin-chat__empty">
                            <span className="admin-chat__empty-icon">🤖</span>
                            <span className="admin-chat__empty-text">
                                Select a conversation from the list to view the full chat history
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-chat__insights-grid">
                <section className="admin-chat__insight-card">
                    <div className="admin-chat__insight-head">
                        <h3>Common Questions</h3>
                        <span>{insights?.common_questions.length ?? 0}</span>
                    </div>
                    <div className="admin-chat__insight-list">
                        {(insights?.common_questions ?? []).map(item => (
                            <div key={item.message} className="admin-chat__insight-row">
                                <span>{item.message}</span>
                                <strong>{item.count}</strong>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="admin-chat__insight-card">
                    <div className="admin-chat__insight-head">
                        <h3>Requested Products</h3>
                        <span>{insights?.most_requested_products.length ?? 0}</span>
                    </div>
                    <div className="admin-chat__insight-list">
                        {(insights?.most_requested_products ?? []).map(item => (
                            <div key={item.matched_product_name} className="admin-chat__insight-row">
                                <span>{item.matched_product_name}</span>
                                <strong>{item.count}</strong>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="admin-chat__insight-card">
                    <div className="admin-chat__insight-head">
                        <h3>Intent Breakdown</h3>
                        <span>{insights?.usage_statistics?.quote_intent_sessions ?? 0} quote sessions</span>
                    </div>
                    <div className="admin-chat__insight-list">
                        {(insights?.common_intents ?? []).map(item => (
                            <div key={item.detected_intent} className="admin-chat__insight-row">
                                <span>{formatIntent(item.detected_intent)}</span>
                                <strong>{item.count}</strong>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="admin-chat__insight-card">
                    <div className="admin-chat__insight-head">
                        <h3>Recent Failures</h3>
                        <span>{insights?.recent_failures.length ?? 0}</span>
                    </div>
                    <div className="admin-chat__insight-list">
                        {(insights?.recent_failures ?? []).map(item => (
                            <div key={item.id} className="admin-chat__insight-row admin-chat__insight-row--stacked">
                                <span className="admin-chat__failure-meta">
                                    {formatIntent(item.status)} • {formatShortDate(item.created_at)} • #{item.session_id.slice(0, 8)}
                                </span>
                                <span>{item.message}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
