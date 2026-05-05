"use client";

import { useCallback, useEffect, useState } from "react";
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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Load insights and sessions
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [insightsData, sessionsData] = await Promise.all([
                getAdminChatInsights(),
                getAdminChatSessions({ page, search: search || undefined }),
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
    }, [page, search]);

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

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

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

    return (
        <div className="admin-chat">
            {/* Stats */}
            <div className="admin-chat__stats">
                <div className="admin-chat__stat-card">
                    <span className="admin-chat__stat-value">{insights?.total_sessions ?? 0}</span>
                    <span className="admin-chat__stat-label">Total Conversations</span>
                </div>
                <div className="admin-chat__stat-card">
                    <span className="admin-chat__stat-value">{insights?.total_messages ?? 0}</span>
                    <span className="admin-chat__stat-label">Total Messages</span>
                </div>
                <div className="admin-chat__stat-card">
                    <span className="admin-chat__stat-value">{insights?.messages_today ?? 0}</span>
                    <span className="admin-chat__stat-label">Messages Today</span>
                </div>
                <div className="admin-chat__stat-card">
                    <span className="admin-chat__stat-value">{insights?.active_sessions_24h ?? 0}</span>
                    <span className="admin-chat__stat-label">Active (24h)</span>
                </div>
            </div>

            {/* Main layout */}
            <div className="admin-chat__main">
                {/* Session List */}
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

                {/* Conversation View */}
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
        </div>
    );
}
