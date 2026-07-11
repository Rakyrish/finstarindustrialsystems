"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getAdminCategories,
  startSeoBulkRegeneration,
  getSeoBulkStatus,
  getSeoBulkBatches,
  retrySeoBulkFailed,
  type ApiCategory,
  type ApiSeoBulkStatus,
  type ApiSeoBulkBatch,
  type SeoBulkScope,
} from "@/lib/api";
import { useToast } from "@/components/admin/Toast";

const LAST_BATCH_STORAGE_KEY = "finstar_admin_seo_bulk_last_batch_id";
// Display copy only — the real gate is enforced server-side in
// seo_publish_service.AUTO_PUBLISH_MIN_SCORE. Keep these in sync.
const AUTO_PUBLISH_MIN_SCORE = 80;

// ── Icons ──────────────────────────────────────────────────────────────────
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>
);
const RefreshIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

const SCOPE_OPTIONS: { value: SeoBulkScope; label: string; description: string }[] = [
  { value: "all", label: "All active products", description: "Every active product in the catalog" },
  { value: "category", label: "By category", description: "All active products in one category" },
  { value: "never_generated", label: "Never generated", description: "Products with no SEO draft or live content yet" },
  { value: "low_score", label: "Low score (< 90)", description: "Products missing SEO or scoring below the optimized bar" },
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

function StatusBadge({ status: jobStatus }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[jobStatus] || styles.pending}`}>
      {jobStatus}
    </span>
  );
}

function ProgressBar({ status: bulkStatus }: { status: ApiSeoBulkStatus }) {
  const { total, pending, processing, completed, failed, percent_complete } = bulkStatus;
  if (total === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{percent_complete}% complete</span>
        <span className="text-slate-400">{completed + failed} / {total} processed</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${(completed / total) * 100}%` }} />
        <div className="h-full bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />
        <div className="h-full bg-blue-400 transition-all" style={{ width: `${(processing / total) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
        <span><span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 mr-1.5" />Pending: {pending}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1.5" />Processing: {processing}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5" />Completed: {completed}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1.5" />Failed: {failed}</span>
      </div>
    </div>
  );
}

export default function SeoBulkRegeneratePage() {
  const { addToast } = useToast();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [scope, setScope] = useState<SeoBulkScope>("all");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<ApiSeoBulkStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [batches, setBatches] = useState<ApiSeoBulkBatch[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (id?: string | null) => {
    try {
      const data = await getSeoBulkStatus(id ?? undefined);
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
      const data = await getSeoBulkBatches();
      setBatches(data);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    (async () => {
      getAdminCategories().then(setCategories).catch(() => {});
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

  const handleStart = async () => {
    if (scope === "category" && !categoryId) {
      addToast("Select a category first.", "error");
      return;
    }
    if (autoPublish) {
      const scopeLabel = SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
      if (
        !window.confirm(
          `Regenerate AND publish "${scopeLabel}"? Each product only goes live if its new content scores ${AUTO_PUBLISH_MIN_SCORE}+/100 with no high-severity issues — anything below that is held as a draft for you to review manually instead. Current live content is backed up first and can be restored per-product from Version History.`,
        )
      ) {
        return;
      }
    }
    setStarting(true);
    try {
      const result = await startSeoBulkRegeneration({
        scope,
        ...(scope === "category" && categoryId ? { category_id: categoryId } : {}),
        auto_publish: autoPublish,
      });
      addToast(
        autoPublish
          ? `Queued ${result.queued_count} product(s) for regeneration — each will publish automatically if it clears the score gate.`
          : `Queued ${result.queued_count} product(s) for SEO regeneration.`,
        "success",
      );
      window.localStorage.setItem(LAST_BATCH_STORAGE_KEY, result.batch_id);
      setBatchId(result.batch_id);
      await fetchStatus(result.batch_id);
      await fetchBatches();
    } catch {
      addToast("Failed to start bulk regeneration.", "error");
    } finally {
      setStarting(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const result = await retrySeoBulkFailed(batchId ?? undefined);
      addToast(result.detail, "success");
      await fetchStatus(batchId);
    } catch {
      addToast("Failed to retry failed jobs.", "error");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI SEO Optimizer — Bulk Regenerate SEO</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Queue AI SEO generation across many products at once. By default nothing is published automatically —
          review and apply each draft in the SEO Optimizer workspace. Turn on &ldquo;Publish automatically&rdquo;
          below to also go live per-product, but only for products whose new content clears the same quality gate
          the single-product &ldquo;Regenerate &amp; Publish&rdquo; button enforces.
        </p>
      </div>

      {/* Start a new run */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Start a new run</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                name="scope"
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

        <label
          className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
            autoPublish
              ? "border-green-400 bg-green-50 dark:bg-green-500/10"
              : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
          }`}
        >
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
            className="mt-1"
          />
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Publish automatically (skip manual review)
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Each product goes live only if its new content scores {AUTO_PUBLISH_MIN_SCORE}+/100 with no
              high-severity issues. Anything below that is held as a draft for you to review manually — the same
              gate as the single-product &ldquo;Regenerate &amp; Publish&rdquo; button. Live content is backed up
              first and can be restored per-product from Version History.
            </div>
          </div>
        </label>

        <button
          onClick={handleStart}
          disabled={starting}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            autoPublish
              ? "bg-green-600 shadow-green-600/20 hover:bg-green-700"
              : "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600"
          }`}
        >
          {starting ? <LoaderIcon /> : <PlayIcon />}
          {starting ? "Starting…" : autoPublish ? "Start Bulk Regenerate & Publish" : "Start Bulk Regeneration"}
        </button>
      </div>

      {/* Current / most recent batch status */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {batchStatus?.is_running ? "Run in progress" : "Latest run"}
          </h3>
          {batchStatus && batchStatus.failed > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshIcon className={retrying ? "animate-spin" : ""} />
              Retry Failed ({batchStatus.failed})
            </button>
          )}
        </div>

        {statusLoading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : !batchStatus || batchStatus.total === 0 ? (
          <div className="text-sm text-slate-400">No bulk regeneration runs yet. Start one above.</div>
        ) : (
          <>
            <ProgressBar status={batchStatus} />
            {batchStatus.auto_publish && (
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  Published live: {batchStatus.published_count}
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  Held as draft (needs review): {batchStatus.held_as_draft_count}
                </span>
              </div>
            )}
            <div className="pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Recent activity</div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {batchStatus.recent.map((job) => (
                  <div key={job.product_id} className="flex items-center justify-between py-2 text-sm gap-3">
                    <Link href={`/admin/seo?product=${job.product_id}`} className="truncate text-slate-700 dark:text-slate-300 hover:text-orange-500 transition">
                      {job.product__name}
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      {job.status === "completed" && job.result_score !== null && (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{job.result_score}/100</span>
                      )}
                      {job.status === "completed" && job.auto_publish && (
                        job.published ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                            Published
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            title={job.publish_block_reason}
                          >
                            Held as draft
                          </span>
                        )
                      )}
                      {job.status === "failed" && job.last_error && (
                        <span className="text-xs text-red-500 max-w-[220px] truncate" title={job.last_error}>{job.last_error}</span>
                      )}
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
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
                  {(batch.pending + batch.processing) > 0 && <span className="text-blue-500 font-semibold">{batch.pending + batch.processing} running</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
