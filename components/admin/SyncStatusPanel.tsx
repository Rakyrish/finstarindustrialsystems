"use client";

import { useEffect, useState } from "react";
import { getSheetsSyncStatus, triggerSheetsSyncNow, getSheetsSyncLogs, testSheetsConnection, retryFailedSyncJobs, type SheetsSyncStatusResponse, type SyncLogData } from "@/lib/api";

const RefreshIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
);

const CheckCircleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const XCircleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);

const AlertCircleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export function SyncStatusPanel() {
  const [status, setStatus] = useState<SheetsSyncStatusResponse | null>(null);
  const [logs, setLogs] = useState<SyncLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await getSheetsSyncStatus();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch sync status", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await getSheetsSyncLogs({ limit: 10 });
      setLogs(data.logs);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
    }
  }, [showLogs]);

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await testSheetsConnection();
      setMessage({ text: res.message, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error?.message || "Connection test failed", type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    setMessage(null);
    try {
      const res = await retryFailedSyncJobs();
      setMessage({ text: res.detail, type: 'success' });
      fetchStatus();
    } catch (error: any) {
      setMessage({ text: error?.message || "Failed to retry jobs", type: 'error' });
    } finally {
      setRetrying(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await triggerSheetsSyncNow();
      setMessage({ text: res.message, type: 'success' });
      // Poll faster right after triggering sync
      setTimeout(fetchStatus, 3000);
      setTimeout(fetchStatus, 8000);
      setTimeout(fetchStatus, 15000);
    } catch (error: any) {
      setMessage({ text: error?.message || "Failed to trigger sync", type: 'error' });
    } finally {
      setSyncing(false);
      // clear message after a while
      setTimeout(() => setMessage(null), 8000);
    }
  };

  const getStatusBadge = (syncStatus: string) => {
    switch (syncStatus) {
      case 'success':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircleIcon className="w-3 h-3" /> Success</span>;
      case 'failure':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircleIcon className="w-3 h-3" /> Failed</span>;
      case 'partial':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><AlertCircleIcon className="w-3 h-3" /> Partial</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{syncStatus}</span>;
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <div className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>;
  }

  if (!status) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Google Sheets Integration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {status.configured
              ? "Inventory automatically syncs with your Google Sheet as changes occur."
              : "Google Sheets integration is currently disabled or missing credentials."}
          </p>
        </div>
        
        {status.configured && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <CheckCircleIcon className={testing ? "animate-pulse" : ""} />
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {status.job_counts?.failed > 0 && (
              <button
                onClick={handleRetryFailed}
                disabled={retrying}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <RefreshIcon className={retrying ? "animate-spin" : ""} />
                Retry Failed ({status.job_counts.failed})
              </button>
            )}
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <RefreshIcon className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`px-6 py-3 text-sm border-b ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400' :
          message.type === 'error' ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400' :
          'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400'
        }`}>
          {message.text}
        </div>
      )}

      {status.configured ? (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Active & Listening</span>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last Sync</p>
              {status.last_sync ? (
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(status.last_sync.status)}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {timeAgo(status.last_sync.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    {status.last_sync.sync_type_label} • {status.last_sync.items_synced} item(s)
                  </p>
                </div>
              ) : (
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Never</span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">24h Activity</p>
              <div className="flex items-center gap-4 text-sm mt-1">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">{status.stats_24h.total}</span>
                  <span className="text-[10px] text-slate-500">Total Syncs</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{status.stats_24h.success}</span>
                  <span className="text-[10px] text-slate-500">Success</span>
                </div>
                {status.stats_24h.failure > 0 && (
                  <div className="flex flex-col">
                    <span className="font-bold text-red-600 dark:text-red-400">{status.stats_24h.failure}</span>
                    <span className="text-[10px] text-slate-500">Failed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <a 
              href={`https://docs.google.com/spreadsheets/d/${status.spreadsheet_id}/edit`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center gap-1"
            >
              Open Google Sheet
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              {showLogs ? 'Hide Logs' : 'View Sync Logs'}
            </button>
          </div>

          {showLogs && (
            <div className="mt-4 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/5">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {logs.length > 0 ? (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 dark:text-white">{log.sync_type_label}</div>
                            <div className="text-xs text-slate-500">{log.triggered_by_label}</div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(log.status)}
                            {log.error_message && (
                              <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={log.error_message}>
                                {log.error_message}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                            {log.items_synced}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No recent sync logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircleIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Configuration Required</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Google Sheets integration is disabled. You must configure the service account JSON and Spreadsheet ID in your backend `.env` file to enable automatic syncing.
          </p>
        </div>
      )}
    </div>
  );
}
