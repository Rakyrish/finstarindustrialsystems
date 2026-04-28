"use client";

import { useEffect, useState, useCallback } from "react";
import { getHealthStatus, getAdminLogs } from "@/lib/api";

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);

const HeartPulseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);

interface HealthData {
  status: string;
  database: string;
  response_time_ms: number;
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    try {
      const [healthResult, logsResult] = await Promise.allSettled([
        getHealthStatus(),
        getAdminLogs(),
      ]);

      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (logsResult.status === "fulfilled") setLogs(logsResult.value.logs || []);
      setLastCheck(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    const interval = setInterval(() => fetchData(), 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchData]);

  const isHealthy = health?.status === "ok";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 rounded-2xl bg-white/5 border border-white/10" />
          <div className="h-64 rounded-2xl bg-white/5 border border-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <ActivityIcon />
            </div>
            Monitoring
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            System health, performance, and error tracking
            {lastCheck && (
              <span className="ml-2 text-slate-500">
                · Last checked {lastCheck.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
        >
          <span className={refreshing ? "animate-spin" : ""}><RefreshIcon /></span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Status */}
        <div className={`rounded-2xl border p-6 ${
          isHealthy 
            ? "border-green-500/20 bg-green-500/5" 
            : "border-red-500/20 bg-red-500/5"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${isHealthy ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              <HeartPulseIcon />
            </div>
            <div>
              <p className="text-sm text-slate-400">API Status</p>
              <p className={`text-xl font-bold ${isHealthy ? "text-green-400" : "text-red-400"}`}>
                {isHealthy ? "Healthy" : "Error"}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit ${
            isHealthy ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isHealthy ? "bg-green-400" : "bg-red-400"}`} />
            {isHealthy ? "All systems operational" : "System issues detected"}
          </div>
        </div>

        {/* Database */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-slate-400 mb-1">Database Connection</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${health?.database === "connected" ? "bg-green-400" : "bg-red-400"}`} />
            <p className={`text-xl font-bold ${health?.database === "connected" ? "text-green-400" : "text-red-400"}`}>
              {health?.database === "connected" ? "Connected" : "Disconnected"}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-2">PostgreSQL</p>
        </div>

        {/* Response Time */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-slate-400 mb-1">Response Time</p>
          <p className="text-3xl font-bold text-white">
            {health?.response_time_ms !== undefined ? (
              <>
                {health.response_time_ms}
                <span className="text-sm font-normal text-slate-400 ml-1">ms</span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {health?.response_time_ms !== undefined && health.response_time_ms < 100
              ? "Excellent performance"
              : health?.response_time_ms !== undefined && health.response_time_ms < 500
              ? "Good performance"
              : "Needs attention"}
          </p>
        </div>
      </div>

      {/* Error Logs */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <AlertIcon />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Recent Errors & Warnings</h3>
              <p className="text-xs text-slate-400">{logs.length} entries from application log</p>
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="font-medium">No errors or warnings found</p>
            <p className="text-sm text-slate-500 mt-1">The system is running smoothly</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
            {logs.slice().reverse().map((line, idx) => {
              const isError = line.startsWith("ERROR");
              return (
                <div
                  key={idx}
                  className={`px-6 py-3 text-xs font-mono hover:bg-slate-800/50 transition ${
                    isError ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${
                    isError ? "bg-red-500/10" : "bg-amber-500/10"
                  }`}>
                    {isError ? "ERR" : "WARN"}
                  </span>
                  <span className="text-slate-300">{line.substring(line.indexOf(" ") + 1)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
