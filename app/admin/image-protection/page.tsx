"use client";

import { useEffect, useState } from "react";
import {
  getImageProtectionSettings,
  updateImageProtectionSettings,
  getImageProtectionAuditLogs,
  type ApiImageProtectionSettings,
  type ApiImageProtectionAuditLogEntry,
} from "@/lib/api";
import { useToast } from "@/components/admin/Toast";
import { Toggle } from "@/components/admin/Toggle";

const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

const TOGGLES: { key: keyof ApiImageProtectionSettings; label: string; description: string }[] = [
  {
    key: "watermark_enabled",
    label: "Watermark Protection",
    description: "Apply the configured watermark to product images site-wide.",
  },
  {
    key: "right_click_protection_enabled",
    label: "Right Click Protection",
    description: "Block the browser context menu on product images (save/copy/open in new tab).",
  },
  {
    key: "drag_protection_enabled",
    label: "Image Drag Protection",
    description: "Prevent dragging product images out of the page or into another tab.",
  },
  {
    key: "long_press_protection_enabled",
    label: "Mobile Long Press Protection",
    description: "Discourage long-press save/share on iOS and Android browsers.",
  },
  {
    key: "seo_metadata_protection_enabled",
    label: "Image SEO Metadata Protection",
    description: "Keep AI-generated image SEO metadata (alt text, captions, titles) locked to protected filenames.",
  },
];

function timeAgo(dateString: string) {
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ImageProtectionSettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<ApiImageProtectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [logs, setLogs] = useState<ApiImageProtectionAuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    getImageProtectionSettings()
      .then(setSettings)
      .catch(() => addToast("Failed to load image protection settings.", "error"))
      .finally(() => setLoading(false));
    getImageProtectionAuditLogs(50)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLogsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (key: keyof ApiImageProtectionSettings, next: boolean) => {
    if (!settings) return;
    setSavingKey(key);
    const previous = settings;
    setSettings({ ...settings, [key]: next });
    try {
      const updated = await updateImageProtectionSettings({ [key]: next });
      setSettings(updated);
      addToast("Settings updated. Changes are live immediately.", "success");
      getImageProtectionAuditLogs(50).then(setLogs).catch(() => {});
    } catch {
      setSettings(previous);
      addToast("Failed to update setting.", "error");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image Protection Settings</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Global switches applied across the entire website. Changes take effect immediately — no deployment needed.
        </p>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm divide-y divide-slate-100 dark:divide-white/5">
        {loading ? (
          <div className="p-5 text-sm text-slate-400 flex items-center gap-2"><LoaderIcon /> Loading settings…</div>
        ) : !settings ? (
          <div className="p-5 text-sm text-slate-400">Could not load settings.</div>
        ) : (
          TOGGLES.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4 p-5">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{toggle.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">{toggle.description}</div>
              </div>
              <Toggle
                checked={Boolean(settings[toggle.key])}
                disabled={savingKey === toggle.key}
                onChange={(next) => handleToggle(toggle.key, next)}
                label={toggle.label}
              />
            </div>
          ))
        )}
      </div>

      {/* Security / audit log */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 font-bold text-sm text-slate-900 dark:text-white">
          Security Logs
        </div>
        {logsLoading ? (
          <div className="p-5 text-sm text-slate-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No activity yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[420px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                    {log.action_display}
                    {log.product_name ? <span className="text-slate-500 dark:text-slate-400"> — {log.product_name}</span> : null}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {log.user_username || "System"} · {timeAgo(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
