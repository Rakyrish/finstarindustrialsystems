"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminCategories,
  getAdminProducts,
  getImageProtectionSettings,
  updateImageProtectionSettings,
  generateWatermarkPreview,
  startWatermarkBulk,
  getWatermarkBulkStatus,
  getWatermarkBulkBatches,
  pauseWatermarkBulk,
  resumeWatermarkBulk,
  cancelWatermarkBulk,
  restoreProductWatermark,
  restoreAllWatermarks,
  type ApiCategory,
  type ApiProduct,
  type ApiImageProtectionSettings,
  type ApiWatermarkBulkStatus,
  type ApiWatermarkBulkBatch,
  type WatermarkBulkScope,
} from "@/lib/api";
import { useToast } from "@/components/admin/Toast";

const LAST_BATCH_STORAGE_KEY = "finstar_admin_watermark_bulk_last_batch_id";

// ── Icons ──────────────────────────────────────────────────────────────────
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4" /><rect width="4" height="16" x="14" y="4" /></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);

const SCOPE_OPTIONS: { value: WatermarkBulkScope; label: string; description: string }[] = [
  { value: "all", label: "All active products", description: "Every active product in the catalog" },
  { value: "category", label: "By category", description: "All active products in one category" },
  { value: "never_watermarked", label: "Never watermarked", description: "Products that don't have a watermark applied yet" },
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

function formatEta(seconds: number | null) {
  if (seconds === null) return null;
  if (seconds < 60) return `~${seconds}s remaining`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~${minutes}m remaining`;
  return `~${Math.round(minutes / 60)}h remaining`;
}

function StatusBadge({ status: jobStatus }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    cancelled: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[jobStatus] || styles.pending}`}>
      {jobStatus}
    </span>
  );
}

function ProgressBar({ status: bulkStatus }: { status: ApiWatermarkBulkStatus }) {
  const { total, pending, processing, completed, failed, cancelled, percent_complete, eta_seconds } = bulkStatus;
  if (total === 0) return null;
  const eta = formatEta(eta_seconds);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{percent_complete}% complete</span>
        <span className="text-slate-400">
          {completed + failed + cancelled} / {total} processed{eta ? ` · ${eta}` : ""}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${(completed / total) * 100}%` }} />
        <div className="h-full bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${(cancelled / total) * 100}%` }} />
        <div className="h-full bg-blue-400 transition-all" style={{ width: `${(processing / total) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
        <span><span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 mr-1.5" />Pending: {pending}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1.5" />Processing: {processing}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5" />Completed: {completed}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1.5" />Failed: {failed}</span>
        {cancelled > 0 && <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1.5" />Cancelled: {cancelled}</span>}
      </div>
    </div>
  );
}

export default function WatermarkManagementPage() {
  const { addToast } = useToast();

  // Design form state
  const [settings, setSettings] = useState<ApiImageProtectionSettings | null>(null);
  const [form, setForm] = useState({
    watermark_text: "",
    watermark_secondary_text: "",
    watermark_opacity: 20,
    watermark_font_size: 48,
    watermark_angle: -45,
    watermark_position: "tiled" as "center" | "tiled",
    watermark_color: "#ffffff",
  });
  const [savingDesign, setSavingDesign] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Bulk job state
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [scope, setScope] = useState<WatermarkBulkScope>("all");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<ApiWatermarkBulkStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [batches, setBatches] = useState<ApiWatermarkBulkBatch[]>([]);
  const [controlBusy, setControlBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore state
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [restoreProductId, setRestoreProductId] = useState<number | null>(null);
  const [restoringSingle, setRestoringSingle] = useState(false);
  const [restoringAll, setRestoringAll] = useState(false);
  const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);

  useEffect(() => {
    getImageProtectionSettings()
      .then((s) => {
        setSettings(s);
        setForm({
          watermark_text: s.watermark_text,
          watermark_secondary_text: s.watermark_secondary_text,
          watermark_opacity: s.watermark_opacity,
          watermark_font_size: s.watermark_font_size,
          watermark_angle: s.watermark_angle,
          watermark_position: s.watermark_position,
          watermark_color: s.watermark_color,
        });
      })
      .catch(() => addToast("Failed to load watermark settings.", "error"));
    getAdminCategories().then(setCategories).catch(() => {});
    getAdminProducts().then((r) => setProducts(r.results)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatus = useCallback(async (id?: string | null) => {
    try {
      const data = await getWatermarkBulkStatus(id ?? undefined);
      setBatchStatus(data);
      if (data.batch_id) {
        setBatchId(data.batch_id);
        window.localStorage.setItem(LAST_BATCH_STORAGE_KEY, data.batch_id);
      }
    } catch {
      // No batches yet, or transient error — leave existing state as-is.
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      setBatches(await getWatermarkBulkBatches());
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    (async () => {
      const storedBatchId = window.localStorage.getItem(LAST_BATCH_STORAGE_KEY);
      await fetchStatus(storedBatchId);
      await fetchBatches();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (batchStatus?.is_running) {
      pollRef.current = setInterval(() => {
        fetchStatus(batchId);
      }, 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchStatus?.is_running, batchId]);

  const handleSaveDesign = async () => {
    setSavingDesign(true);
    try {
      const updated = await updateImageProtectionSettings(form);
      setSettings(updated);
      addToast("Watermark design saved. Applies site-wide immediately.", "success");
    } catch {
      addToast("Failed to save watermark design.", "error");
    } finally {
      setSavingDesign(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const result = await generateWatermarkPreview(form);
      setPreviewUrl(result.preview_url);
    } catch {
      addToast("Failed to generate preview. Make sure at least one product has a Cloudinary image.", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleStart = async () => {
    if (scope === "category" && !categoryId) {
      addToast("Select a category first.", "error");
      return;
    }
    setStarting(true);
    try {
      const result = await startWatermarkBulk({
        scope,
        ...(scope === "category" && categoryId ? { category_id: categoryId } : {}),
      });
      addToast(`Queued ${result.queued_count} product(s) for watermarking.`, "success");
      window.localStorage.setItem(LAST_BATCH_STORAGE_KEY, result.batch_id);
      setBatchId(result.batch_id);
      await fetchStatus(result.batch_id);
      await fetchBatches();
    } catch {
      addToast("Failed to start bulk watermarking.", "error");
    } finally {
      setStarting(false);
    }
  };

  const handleControl = async (action: "pause" | "resume" | "cancel") => {
    if (!batchId) return;
    setControlBusy(true);
    try {
      const fn = action === "pause" ? pauseWatermarkBulk : action === "resume" ? resumeWatermarkBulk : cancelWatermarkBulk;
      const data = await fn(batchId);
      setBatchStatus(data);
      addToast(`Batch ${action}d.`, "success");
    } catch {
      addToast(`Failed to ${action} batch.`, "error");
    } finally {
      setControlBusy(false);
    }
  };

  const handleRestoreSingle = async () => {
    if (!restoreProductId) {
      addToast("Select a product first.", "error");
      return;
    }
    setRestoringSingle(true);
    try {
      const result = await restoreProductWatermark(restoreProductId);
      addToast(result.detail, "success");
    } catch {
      addToast("Failed to restore original image.", "error");
    } finally {
      setRestoringSingle(false);
    }
  };

  const handleRestoreAll = async () => {
    if (!confirmRestoreAll) {
      setConfirmRestoreAll(true);
      return;
    }
    setRestoringAll(true);
    try {
      const result = await restoreAllWatermarks();
      addToast(result.detail, "success");
    } catch {
      addToast("Failed to restore all original images.", "error");
    } finally {
      setRestoringAll(false);
      setConfirmRestoreAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Watermark Management</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Design the brand watermark, apply it across the existing catalog in the background, and restore originals at any time.
        </p>
      </div>

      {/* Design */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Watermark Design</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Watermark text</span>
            <input
              type="text"
              value={form.watermark_text}
              onChange={(e) => setForm((f) => ({ ...f, watermark_text: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Website text</span>
            <input
              type="text"
              value={form.watermark_secondary_text}
              onChange={(e) => setForm((f) => ({ ...f, watermark_secondary_text: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Opacity (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.watermark_opacity}
              onChange={(e) => setForm((f) => ({ ...f, watermark_opacity: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Font size (px)</span>
            <input
              type="number"
              min={10}
              max={200}
              value={form.watermark_font_size}
              onChange={(e) => setForm((f) => ({ ...f, watermark_font_size: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Angle (degrees)</span>
            <input
              type="number"
              min={-90}
              max={90}
              value={form.watermark_angle}
              onChange={(e) => setForm((f) => ({ ...f, watermark_angle: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Position</span>
            <select
              value={form.watermark_position}
              onChange={(e) => setForm((f) => ({ ...f, watermark_position: e.target.value as "center" | "tiled" }))}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="tiled">Repeated diagonal pattern</option>
              <option value="center">Centered (single)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Watermark Color</span>
            <input
              type="color"
              value={form.watermark_color}
              onChange={(e) => setForm((f) => ({ ...f, watermark_color: e.target.value }))}
              className="w-full p-0 border-none bg-transparent w-12 h-12 cursor-pointer"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleSaveDesign}
            disabled={savingDesign || !settings}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingDesign ? <LoaderIcon /> : null}
            {savingDesign ? "Saving…" : "Save Design"}
          </button>
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {previewing ? <LoaderIcon /> : <EyeIcon />}
            {previewing ? "Generating…" : "Generate Preview"}
          </button>
        </div>

        {previewUrl && (
          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Preview</div>
            <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
              <Image src={previewUrl} alt="Watermark preview" fill className="object-contain" unoptimized />
            </div>
          </div>
        )}
      </div>

      {/* Bulk apply */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Apply Watermark To Existing Product Images</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SCOPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                scope === option.value
                  ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="watermark-scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{option.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{option.description}</div>
              </div>
            </label>
          ))}
        </div>

        {scope === "category" && (
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-72 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={handleStart}
          disabled={starting}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {starting ? <LoaderIcon /> : <PlayIcon />}
          {starting ? "Starting…" : "Apply Watermark To Existing Product Images"}
        </button>

        {/* Current / most recent batch status */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between pt-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {batchStatus?.is_running ? (batchStatus.is_paused ? "Run paused" : "Run in progress") : "Latest run"}
            </h4>
            {batchStatus?.is_running && (
              <div className="flex items-center gap-2">
                {batchStatus.is_paused ? (
                  <button
                    onClick={() => handleControl("resume")}
                    disabled={controlBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    <PlayIcon /> Resume
                  </button>
                ) : (
                  <button
                    onClick={() => handleControl("pause")}
                    disabled={controlBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    <PauseIcon /> Pause
                  </button>
                )}
                <button
                  onClick={() => handleControl("cancel")}
                  disabled={controlBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {statusLoading ? (
            <div className="text-sm text-slate-400 pt-2">Loading…</div>
          ) : !batchStatus || batchStatus.total === 0 ? (
            <div className="text-sm text-slate-400 pt-2">No bulk watermark runs yet. Start one above.</div>
          ) : (
            <div className="pt-3 space-y-4">
              <ProgressBar status={batchStatus} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Recent activity</div>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {batchStatus.recent.map((job) => (
                    <div key={job.product_id} className="flex items-center justify-between py-2 text-sm gap-3">
                      <span className="truncate text-slate-700 dark:text-slate-300">{job.product__name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {job.status === "failed" && job.last_error && (
                          <span className="text-xs text-red-500 max-w-[220px] truncate" title={job.last_error}>{job.last_error}</span>
                        )}
                        <StatusBadge status={job.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past runs */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 font-bold text-sm text-slate-900 dark:text-white">
          Past Runs
        </div>
        {batches.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No past runs yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {batches.map((batch) => (
              <button
                key={batch.batch_id}
                onClick={() => fetchStatus(batch.batch_id)}
                className={`w-full flex items-center justify-between px-5 py-3 text-sm text-left transition cursor-pointer ${
                  batch.batch_id === batchId ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <div>
                  <div className="font-mono text-xs text-slate-400">{batch.batch_id.slice(0, 8)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{timeAgo(batch.started_at)} · {batch.total} product(s)</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600 dark:text-green-400 font-semibold">{batch.completed} done</span>
                  {batch.failed > 0 && <span className="text-red-500 font-semibold">{batch.failed} failed</span>}
                  {batch.cancelled > 0 && <span className="text-amber-500 font-semibold">{batch.cancelled} cancelled</span>}
                  {(batch.pending + batch.processing) > 0 && <span className="text-blue-500 font-semibold">{batch.pending + batch.processing} running</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Restore originals */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Restore Original Images</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Original images are never modified or deleted — restoring simply stops serving the watermarked version.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={restoreProductId ?? ""}
            onChange={(e) => setRestoreProductId(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-80 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.watermark_applied ? " (watermarked)" : ""}</option>
            ))}
          </select>
          <button
            onClick={handleRestoreSingle}
            disabled={restoringSingle}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {restoringSingle ? <LoaderIcon /> : null}
            Restore This Product
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            onClick={handleRestoreAll}
            disabled={restoringAll}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-3 ${
              confirmRestoreAll ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : "bg-slate-700 hover:bg-slate-800 shadow-slate-700/20"
            }`}
          >
            {restoringAll ? <LoaderIcon /> : null}
            {confirmRestoreAll ? "Click again to confirm — Restore ALL Products" : "Restore All Product Images"}
          </button>
          {confirmRestoreAll && !restoringAll && (
            <button
              onClick={() => setConfirmRestoreAll(false)}
              className="ml-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}