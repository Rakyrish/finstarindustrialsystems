"use client";

/**
 * FINSTAR Inventory Manager
 * ─────────────────────────
 * Full database persistence via the standalone-inventory API.
 *
 * Data flow:
 *   CSV File → parseFinstarCSV() → POST /bulk-import/ → PostgreSQL
 *   On mount → GET /standalone-inventory/ → UI state
 *   Edits   → PATCH/POST/DELETE → PostgreSQL → refetch
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    getStandaloneInventory,
    bulkImportStandaloneInventory,
    createStandaloneInventoryItem,
    updateStandaloneInventoryItem,
    deleteStandaloneInventoryItem,
    adjustStandaloneInventoryStock,
    isAPIError,
} from "@/lib/api";
import type { StandaloneInventoryItem as ApiItem } from "@/lib/api";
import { SyncStatusPanel } from "@/components/admin/SyncStatusPanel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type MovementType =
    | "restock"
    | "adjustment"
    | "sale"
    | "return"
    | "damage"
    | "transfer"
    | "import"
    | "initial";

export interface StockMovement {
    id: number;
    itemId: number;
    itemName: string;
    type: MovementType;
    qty: number;
    qtyBefore: number;
    qtyAfter: number;
    date: string;       // ISO string
    note: string;
}

export interface InventoryItem {
    id: number;
    name: string;       // replaces SKU — the ITEM column
    section: string;    // replaces categoryName — the Section column
    qty: number;        // closing stock / qty in stock
    costPrice: number;  // PRICE column (purchase/cost price)
    sellPrice: number;  // SELLING PRICE column
    reorderLevel: number;
    movements: StockMovement[];
    addedAt: string;
    updatedAt: string;
    syncedAt: string | null;
    syncStatus: string;
}

/** Convert API response to local InventoryItem shape */
function fromApiItem(item: ApiItem): InventoryItem {
    return {
        id: item.id,
        name: item.name,
        section: item.section,
        qty: item.qty,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
        reorderLevel: item.reorderLevel,
        movements: [],
        addedAt: item.createdAt,
        updatedAt: item.updatedAt,
        syncedAt: item.syncedAt,
        syncStatus: item.syncStatus,
    };
}

type SortField = "name" | "section" | "qty" | "costPrice" | "sellPrice" | "value" | "margin" | "status";
type SortDir = "asc" | "desc";
type ModalMode = "edit" | "create" | "adjust" | null;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const MOVEMENT_TYPE_OPTIONS: { value: MovementType; label: string }[] = [
    { value: "restock", label: "Restock / Delivery" },
    { value: "sale", label: "Sale / Dispatch" },
    { value: "adjustment", label: "Manual Adjustment" },
    { value: "return", label: "Customer Return" },
    { value: "damage", label: "Damage / Write-off" },
    { value: "transfer", label: "Transfer" },
];

// localStorage key removed — data is now persisted in PostgreSQL via API

// ─────────────────────────────────────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse a single CSV line respecting double-quoted fields and embedded commas. */
function parseCsvLine(line: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (ch === "," && !inQ) {
            cols.push(cur.trim());
            cur = "";
        } else {
            cur += ch;
        }
    }
    cols.push(cur.trim());
    return cols;
}

/** Strip leading/trailing quotes and whitespace from a cell value. */
function cleanCell(s: string): string {
    return s.replace(/^["'\s]+|["'\s]+$/g, "");
}

/** Parse a KES-style number string: "1,350.00" → 1350, "  -   " → 0. */
function parseKES(s: string): number {
    if (!s || s.trim() === "" || s.trim() === "-" || s.trim() === "  -   ") return 0;
    const n = parseFloat(s.replace(/[\s,"]/g, ""));
    return isNaN(n) || n < 0 ? 0 : n;
}

/**
 * Parse the FINSTAR CSV format.
 *
 * Expected header (row 0):
 *   ITEM, QTY, PRICE, TOTAL, SELLING PRICE, Total Cost of Inventory,
 *   Stock In, Stock Out, Closing Stock, Section
 *
 * Column indices (0-based):
 *   0  ITEM
 *   1  QTY            (opening/original qty — we use Closing Stock if present)
 *   2  PRICE          → costPrice
 *   3  TOTAL          (auto-calculated, ignored)
 *   4  SELLING PRICE  → sellPrice
 *   5  Total Cost of Inventory (auto-calculated, ignored)
 *   6  Stock In
 *   7  Stock Out
 *   8  Closing Stock  → qty (preferred over col 1)
 *   9  Section        → section
 */
function parseFinstarCSV(text: string): InventoryItem[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const items: InventoryItem[] = [];
    let nextId = Date.now();

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const name = cleanCell(cols[0] ?? "").toUpperCase();

        // Skip blank rows and the header row if repeated
        if (!name || name === "ITEM") continue;

        // Some rows in the FINSTAR sheet have a summary value in cols 11-14;
        // those rows still have a valid ITEM in col 0 — include them normally.
        const closingStock = cols[8] ? parseKES(cols[8]) : parseKES(cols[1] ?? "0");
        const costPrice = parseKES(cols[2] ?? "0");
        const sellPrice = parseKES(cols[4] ?? "0");
        const section = cleanCell(cols[9] ?? "").replace(/^Section\s+/i, "Section ") || "Uncategorised";

        items.push({
            id: nextId++,
            name,
            section,
            qty: closingStock,
            costPrice,
            sellPrice,
            reorderLevel: 5,
            movements: [],
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncedAt: null,
            syncStatus: "pending",
        });
    }

    return items;
}

/**
 * Export items back to FINSTAR-compatible CSV format.
 * The exported file can be re-imported into this system.
 */
function buildExportCSV(items: InventoryItem[]): string {
    const header =
        "ITEM,QTY,PRICE,TOTAL,SELLING PRICE,Total Cost of Inventory,Stock In,Stock Out,Closing Stock,Section";

    const rows = items.map((item) => {
        const total = (item.costPrice * item.qty).toFixed(2);
        const totalCost = (item.sellPrice * item.qty).toFixed(2);
        return [
            `"${item.name.replace(/"/g, '""')}"`,
            item.qty,
            item.costPrice.toFixed(2),
            total,
            item.sellPrice.toFixed(2),
            totalCost,
            "",            // Stock In  (not tracked in export)
            "",            // Stock Out (not tracked in export)
            item.qty,
            `"${item.section.replace(/"/g, '""')}"`,
        ].join(",");
    });

    return [header, ...rows].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtKES(value: number): string {
    return new Intl.NumberFormat("en-KE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-KE", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function fmtDateTime(iso: string): string {
    const d = new Date(iso);
    return (
        d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" }) +
        " " +
        d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
    );
}

function downloadBlob(content: string, filename: string, mime = "text/csv"): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function getStockStatus(qty: number, reorder: number): StockStatus {
    if (qty === 0) return "out_of_stock";
    if (qty <= reorder) return "low_stock";
    return "in_stock";
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

const Ico = {
    Download: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    ),
    Upload: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
    ),
    Search: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    ),
    Edit: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    ),
    Save: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
            <path d="M7 3v4a1 1 0 0 0 1 1h7" />
        </svg>
    ),
    X: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    ),
    ChevUp: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m18 15-6-6-6 6" />
        </svg>
    ),
    ChevDown: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6" />
        </svg>
    ),
    ChevLeft: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
        </svg>
    ),
    ChevRight: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
        </svg>
    ),
    Alert: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    ),
    Trash: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    ),
    Plus: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    ),
    Adjust: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
        </svg>
    ),
    Package: () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4 7.55 4.24" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" x2="12" y1="22" y2="12" />
        </svg>
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5">
                        <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded-md mb-1" />
                        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-md" />
                    </td>
                    <td className="px-4 py-3.5"><div className="h-5 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-10 bg-slate-100 dark:bg-slate-800 rounded-md" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded-md" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded-md" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-14 bg-slate-100 dark:bg-slate-800 rounded-md" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-10 bg-slate-100 dark:bg-slate-800 rounded-md" /></td>
                    <td className="px-4 py-3.5"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                    <td className="px-4 py-3.5"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg ml-auto" /></td>
                </tr>
            ))}
        </tbody>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StockStatus, { label: string; classes: string; dot: string }> = {
    in_stock: {
        label: "In stock",
        classes: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 ring-1 ring-emerald-200 dark:ring-emerald-400/20",
        dot: "bg-emerald-500",
    },
    low_stock: {
        label: "Low stock",
        classes: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 ring-1 ring-amber-200 dark:ring-amber-400/20",
        dot: "bg-amber-500",
    },
    out_of_stock: {
        label: "Out of stock",
        classes: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10 ring-1 ring-red-200 dark:ring-red-400/20",
        dot: "bg-red-500",
    },
};

function StatusBadge({ status }: { status: StockStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, accent,
}: {
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}) {
    return (
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 shadow-sm overflow-hidden">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                {label}
            </p>
            <p className={`text-2xl font-extrabold tracking-tight ${accent ?? "text-slate-900 dark:text-white"}`}>
                {value}
            </p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline-editable cell
// ─────────────────────────────────────────────────────────────────────────────

interface EditableCellProps {
    value: number | string;
    type?: "number" | "text";
    min?: number;
    saving?: boolean;
    onSave: (val: number | string) => void;
}

function EditableCell({ value, type = "number", min = 0, saving = false, onSave }: EditableCellProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    function commit() {
        const parsed =
            type === "number"
                ? isNaN(Number(draft)) ? value : Number(draft)
                : draft.trim();
        if (parsed !== value) onSave(parsed);
        setEditing(false);
    }

    if (editing) {
        return (
            <input
                ref={inputRef}
                type={type}
                min={min}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
                }}
                className="w-full rounded-lg border border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
        );
    }

    return (
        <button
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            disabled={saving}
            className="group flex items-center gap-1.5 w-full text-left rounded-lg px-2 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
            <span>
                {type === "number" && typeof value === "number"
                    ? fmtKES(value)
                    : value}
            </span>
            {!saving && (
                <span className="opacity-0 group-hover:opacity-50 text-slate-400 transition-opacity shrink-0">
                    <Ico.Edit />
                </span>
            )}
            {saving && (
                <span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal shell
// ─────────────────────────────────────────────────────────────────────────────

function ModalShell({
    title, subtitle, onClose, disabled, children,
}: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !disabled) onClose(); }}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
                        {subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        disabled={disabled}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 ml-4 shrink-0"
                    >
                        <Ico.X />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit modal
// ─────────────────────────────────────────────────────────────────────────────

interface EditModalProps {
    item?: InventoryItem;
    sections: string[];
    saving: boolean;
    onSave: (data: Partial<InventoryItem>) => void;
    onClose: () => void;
}

function EditModal({ item, sections, saving, onSave, onClose }: EditModalProps) {
    const isCreate = !item;
    const [draft, setDraft] = useState({
        name: item?.name ?? "",
        section: item?.section ?? (sections[0] ?? ""),
        qty: item?.qty ?? 0,
        costPrice: item?.costPrice ?? 0,
        sellPrice: item?.sellPrice ?? 0,
        reorderLevel: item?.reorderLevel ?? 5,
    });

    function field<K extends keyof typeof draft>(k: K, v: typeof draft[K]) {
        setDraft((d) => ({ ...d, [k]: v }));
    }

    const inputCls =
        "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition";

    const margin =
        draft.sellPrice > 0 && draft.costPrice > 0
            ? Math.round(((draft.sellPrice - draft.costPrice) / draft.sellPrice) * 100)
            : null;

    return (
        <ModalShell
            title={isCreate ? "Add inventory item" : "Edit inventory item"}
            subtitle={item ? item.name : "Enter item details to add to inventory"}
            onClose={onClose}
            disabled={saving}
        >
            <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                        Item Name *
                    </label>
                    <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => field("name", e.target.value.toUpperCase())}
                        placeholder="e.g. GATE VALVE 3/4''"
                        className={inputCls}
                    />
                </div>

                {/* Section (with datalist for autocomplete) */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                        Section
                    </label>
                    <input
                        type="text"
                        list="section-list"
                        value={draft.section}
                        onChange={(e) => field("section", e.target.value)}
                        placeholder="e.g. Section A"
                        className={inputCls}
                    />
                    <datalist id="section-list">
                        {sections.map((s) => <option key={s} value={s} />)}
                    </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {isCreate && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                                Initial Qty
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={draft.qty}
                                onChange={(e) => field("qty", Number(e.target.value))}
                                className={inputCls}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                            Cost Price (KES)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={draft.costPrice}
                            onChange={(e) => field("costPrice", Number(e.target.value))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                            Selling Price (KES)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={draft.sellPrice}
                            onChange={(e) => field("sellPrice", Number(e.target.value))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                            Reorder Level
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={draft.reorderLevel}
                            onChange={(e) => field("reorderLevel", Number(e.target.value))}
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* Live margin preview */}
                {margin !== null && (
                    <div className="rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Gross margin</span>
                        <span className={`font-bold ${margin >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {margin}%
                        </span>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-white/10">
                <button
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSave(draft)}
                    disabled={saving || !draft.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                    {saving
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Ico.Save />}
                    {isCreate ? "Create item" : "Save changes"}
                </button>
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Adjust-stock modal
// ─────────────────────────────────────────────────────────────────────────────

interface AdjustModalProps {
    item: InventoryItem;
    saving: boolean;
    onSave: (delta: number, type: MovementType, note: string) => void;
    onClose: () => void;
}

function AdjustModal({ item, saving, onSave, onClose }: AdjustModalProps) {
    const [delta, setDelta] = useState(0);
    const [movType, setMovType] = useState<MovementType>("adjustment");
    const [note, setNote] = useState("");

    const newQty = item.qty + delta;
    const isValid = delta !== 0 && newQty >= 0;

    const inputCls =
        "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition";

    return (
        <ModalShell
            title="Adjust stock"
            subtitle={item.name}
            onClose={onClose}
            disabled={saving}
        >
            <div className="p-6 space-y-4">
                {/* Current / change / projected */}
                <div className="rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 mb-0.5">Current</p>
                        <p className="text-base font-extrabold text-slate-900 dark:text-white">{item.qty}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 mb-0.5">Adjustment</p>
                        <p className={`text-base font-extrabold ${delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-slate-400"}`}>
                            {delta > 0 ? `+${delta}` : delta}
                        </p>
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 mb-0.5">After</p>
                        <p className={`text-base font-extrabold ${newQty < 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}>
                            {newQty < 0 ? "—" : newQty}
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                        Quantity change{" "}
                        <span className="font-normal normal-case tracking-normal text-slate-300 dark:text-slate-600">
                            (+add / −deduct)
                        </span>
                    </label>
                    <input
                        type="number"
                        value={delta}
                        onChange={(e) => setDelta(Number(e.target.value))}
                        className={inputCls}
                        placeholder="e.g. 10 or -5"
                    />
                    {newQty < 0 && (
                        <p className="text-xs text-red-500 mt-1">
                            Cannot go below zero. Max deduction: {item.qty}.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                        Reason
                    </label>
                    <select
                        value={movType}
                        onChange={(e) => setMovType(e.target.value as MovementType)}
                        className={inputCls}
                    >
                        {MOVEMENT_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                        Notes{" "}
                        <span className="font-normal normal-case tracking-normal text-slate-300 dark:text-slate-600">
                            (optional)
                        </span>
                    </label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Supplier invoice #1234"
                        className={inputCls}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-white/10">
                <button
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSave(delta, movType, note)}
                    disabled={saving || !isValid}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                    {saving
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Ico.Adjust />}
                    Apply adjustment
                </button>
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
    // ── Persistent state ───────────────────────────────────────────────────

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
    const [lastImport, setLastImport] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // ── UI state ───────────────────────────────────────────────────────────

    const [savingId, setSavingId] = useState<number | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
    const [modalSaving, setModalSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" | "warn" } | null>(null);
    const [importing, setImporting] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [sectionFilter, setSectionFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<"all" | StockStatus>("all");

    // Sort
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Toast helper ───────────────────────────────────────────────────────

    const showToast = useCallback((msg: string, kind: "success" | "error" | "warn" = "success") => {
        setToast({ msg, kind });
        setTimeout(() => setToast(null), 3200);
    }, []);

    // ── Fetch from backend API ─────────────────────────────────────────────

    const fetchInventory = useCallback(async () => {
        try {
            const items = await getStandaloneInventory();
            setInventory(items.map(fromApiItem));
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
            const msg = isAPIError(err) ? err.message : "Failed to load inventory.";
            showToast(msg, "error");
        }
    }, [showToast]);

    // ── Load from backend on mount ────────────────────────────────────────

    useEffect(() => {
        setLoading(true);
        fetchInventory().finally(() => setLoading(false));
    }, [fetchInventory]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [search, sectionFilter, statusFilter, pageSize]);

    // ── Derived sections list ──────────────────────────────────────────────

    const sections = useMemo(
        () => [...new Set(inventory.map((i) => i.section))].sort(),
        [inventory],
    );

    // ── Filtered + sorted + paginated ─────────────────────────────────────

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return inventory
            .filter((item) => {
                const st = getStockStatus(item.qty, item.reorderLevel);
                if (statusFilter !== "all" && st !== statusFilter) return false;
                if (sectionFilter !== "all" && item.section !== sectionFilter) return false;
                if (q && !item.name.toLowerCase().includes(q) && !item.section.toLowerCase().includes(q)) return false;
                return true;
            })
            .sort((a, b) => {
                let av: string | number;
                let bv: string | number;

                switch (sortField) {
                    case "name": av = a.name; bv = b.name; break;
                    case "section": av = a.section; bv = b.section; break;
                    case "qty": av = a.qty; bv = b.qty; break;
                    case "costPrice": av = a.costPrice; bv = b.costPrice; break;
                    case "sellPrice": av = a.sellPrice; bv = b.sellPrice; break;
                    case "value": av = a.sellPrice * a.qty; bv = b.sellPrice * b.qty; break;
                    case "margin": {
                        av = a.sellPrice > 0 ? (a.sellPrice - a.costPrice) / a.sellPrice : 0;
                        bv = b.sellPrice > 0 ? (b.sellPrice - b.costPrice) / b.sellPrice : 0;
                        break;
                    }
                    case "status": {
                        const order: Record<StockStatus, number> = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
                        av = order[getStockStatus(a.qty, a.reorderLevel)];
                        bv = order[getStockStatus(b.qty, b.reorderLevel)];
                        break;
                    }
                    default: av = a.name; bv = b.name;
                }

                if (av < bv) return sortDir === "asc" ? -1 : 1;
                if (av > bv) return sortDir === "asc" ? 1 : -1;
                return 0;
            });
    }, [inventory, search, sectionFilter, statusFilter, sortField, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    // ── Stats ──────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const inStock = inventory.filter((i) => getStockStatus(i.qty, i.reorderLevel) === "in_stock").length;
        const lowStock = inventory.filter((i) => getStockStatus(i.qty, i.reorderLevel) === "low_stock").length;
        const outStock = inventory.filter((i) => getStockStatus(i.qty, i.reorderLevel) === "out_of_stock").length;
        const sellValue = inventory.reduce((s, i) => s + i.sellPrice * i.qty, 0);
        const costValue = inventory.reduce((s, i) => s + i.costPrice * i.qty, 0);
        return { inStock, lowStock, outStock, sellValue, costValue };
    }, [inventory]);

    const alertCount = stats.lowStock + stats.outStock;

    // ── Inline cell save ───────────────────────────────────────────────────

    async function handleCellSave(
        item: InventoryItem,
        field: "qty" | "costPrice" | "sellPrice" | "reorderLevel",
        value: number | string,
    ) {
        setSavingId(item.id);

        // Map frontend field names to backend field names
        const fieldMap: Record<string, string> = {
            qty: "quantity_in_stock",
            costPrice: "cost_price",
            sellPrice: "sell_price",
            reorderLevel: "reorder_level",
        };

        try {
            await updateStandaloneInventoryItem(item.id, {
                [fieldMap[field]]: value,
            } as any);

            // Optimistic update + refetch
            const updated: InventoryItem = { ...item, [field]: value, updatedAt: new Date().toISOString() };
            setInventory((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        } catch (err) {
            const msg = isAPIError(err) ? err.message : "Failed to save change.";
            showToast(msg, "error");
        } finally {
            setSavingId(null);
        }
    }

    // ── Add / Edit modal save ──────────────────────────────────────────────

    async function handleModalSave(data: Partial<InventoryItem>) {
        setModalSaving(true);

        try {
            if (modalMode === "create") {
                await createStandaloneInventoryItem({
                    name: (data.name ?? "").trim().toUpperCase(),
                    section: data.section ?? "General",
                    quantity_in_stock: data.qty ?? 0,
                    cost_price: data.costPrice ?? 0,
                    sell_price: data.sellPrice ?? 0,
                    reorder_level: data.reorderLevel ?? 5,
                });
                showToast("Item created successfully.");

            } else if (modalMode === "edit" && activeItem) {
                await updateStandaloneInventoryItem(activeItem.id, {
                    name: (data.name ?? activeItem.name).trim().toUpperCase(),
                    section: data.section ?? activeItem.section,
                    cost_price: data.costPrice ?? activeItem.costPrice,
                    sell_price: data.sellPrice ?? activeItem.sellPrice,
                    reorder_level: data.reorderLevel ?? activeItem.reorderLevel,
                });
                showToast("Item updated successfully.");
            }

            await fetchInventory();
        } catch (err) {
            const msg = isAPIError(err) ? err.message : "Failed to save item.";
            showToast(msg, "error");
        } finally {
            setModalSaving(false);
            setModalMode(null);
            setActiveItem(null);
        }
    }

    // ── Adjust stock modal save ────────────────────────────────────────────

    async function handleAdjustSave(delta: number, type: MovementType, note: string) {
        if (!activeItem) return;
        setModalSaving(true);

        try {
            const resp = await adjustStandaloneInventoryStock(activeItem.id, {
                quantity: delta,
                movement_type: type,
                notes: note,
            });
            showToast(`Stock adjusted: ${resp.quantity_before} → ${resp.quantity_after} units`);
            await fetchInventory();
        } catch (err) {
            const msg = isAPIError(err) ? err.message : "Failed to adjust stock.";
            showToast(msg, "error");
        } finally {
            setModalSaving(false);
            setModalMode(null);
            setActiveItem(null);
        }
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    async function handleDelete(item: InventoryItem) {
        if (!confirm(`Delete "${item.name}"?\nThis cannot be undone.`)) return;
        setSavingId(item.id);

        try {
            await deleteStandaloneInventoryItem(item.id);
            setInventory((prev) => prev.filter((i) => i.id !== item.id));
            showToast("Item deleted.", "warn");
        } catch (err) {
            const msg = isAPIError(err) ? err.message : "Failed to delete item.";
            showToast(msg, "error");
        } finally {
            setSavingId(null);
        }
    }

    // ── CSV import ─────────────────────────────────────────────────────────

    function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            if (!text) { showToast("Could not read file.", "error"); return; }

            const parsed = parseFinstarCSV(text);
            if (!parsed.length) {
                showToast("No valid rows found. Make sure this is a FINSTAR CSV file.", "error");
                return;
            }

            // Send to backend for persistence
            setImporting(true);
            try {
                const payload = parsed.map((item) => ({
                    name: item.name,
                    section: item.section,
                    qty: item.qty,
                    costPrice: item.costPrice,
                    sellPrice: item.sellPrice,
                    reorderLevel: item.reorderLevel,
                }));

                const resp = await bulkImportStandaloneInventory({ items: payload });
                showToast(`${resp.detail}`);

                // Refetch from DB to get server-assigned IDs
                await fetchInventory();
                setLastImport(new Date().toISOString());
                setPage(1);
                setSectionFilter("all");
                setStatusFilter("all");
                setSearch("");
            } catch (err) {
                const msg = isAPIError(err) ? err.message : "Failed to save imported data.";
                showToast(msg, "error");
            } finally {
                setImporting(false);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    }

    // ── CSV export ─────────────────────────────────────────────────────────

    function handleExport() {
        if (!filtered.length) { showToast("Nothing to export.", "warn"); return; }
        const csv = buildExportCSV(filtered);
        downloadBlob(csv, `FINSTAR_STOCKS_${new Date().toISOString().slice(0, 10)}.csv`);
        showToast(`Exported ${filtered.length} items.`);
    }

    // ── Sort ───────────────────────────────────────────────────────────────

    function toggleSort(f: SortField) {
        if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(f); setSortDir("asc"); }
    }

    function SortIndicator({ field }: { field: SortField }) {
        if (sortField !== field) return <span className="opacity-20 ml-1"><Ico.ChevDown /></span>;
        return (
            <span className="text-orange-500 ml-1">
                {sortDir === "asc" ? <Ico.ChevUp /> : <Ico.ChevDown />}
            </span>
        );
    }

    // ── Pagination numbers ─────────────────────────────────────────────────

    function pageNumbers(): (number | "…")[] {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "…")[] = [1];
        if (safePage > 3) pages.push("…");
        for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
        if (safePage < totalPages - 2) pages.push("…");
        pages.push(totalPages);
        return pages;
    }

    // ── Modal helpers ──────────────────────────────────────────────────────

    const openEdit = (item: InventoryItem) => { setActiveItem(item); setModalMode("edit"); };
    const openAdjust = (item: InventoryItem) => { setActiveItem(item); setModalMode("adjust"); };
    const closeModal = () => { if (!modalSaving) { setModalMode(null); setActiveItem(null); } };

    const hasFilters = !!(search || sectionFilter !== "all" || statusFilter !== "all");

    // ── Table header styles ────────────────────────────────────────────────

    const thCls = "px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap";
    const thSortCls = `${thCls} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 transition-colors`;

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Stock &amp; Pricing
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {lastImport
                            ? `Last import: ${fmtDate(lastImport)} · ${inventory.length} items`
                            : "Import your FINSTAR CSV to get started, or add items manually."}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="flex items-center gap-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
                    >
                        {importing
                            ? <span className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                            : <Ico.Upload />}
                        <span className="hidden sm:inline">{importing ? "Saving to DB…" : "Import CSV"}</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
                    >
                        <Ico.Download />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    <button
                        onClick={() => setModalMode("create")}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm shadow-orange-200 dark:shadow-orange-900/30"
                    >
                        <Ico.Plus /> Add item
                    </button>
                </div>
            </div>

            {/* ── Google Sheets Sync Status ── */}
            <SyncStatusPanel />

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    label="Total items"
                    value={loading ? "—" : inventory.length}
                    sub={`${sections.length} section${sections.length !== 1 ? "s" : ""}`}
                />
                <StatCard
                    label="In stock"
                    value={loading ? "—" : stats.inStock}
                    accent="text-emerald-600 dark:text-emerald-400"
                    sub="above reorder level"
                />
                <StatCard
                    label="Stock alerts"
                    value={loading ? "—" : alertCount}
                    accent={alertCount > 0 ? "text-amber-500 dark:text-amber-400" : undefined}
                    sub={loading ? "" : `${stats.outStock} out · ${stats.lowStock} low`}
                />
                <StatCard
                    label="Inventory sell value"
                    value={
                        loading
                            ? "—"
                            : stats.sellValue > 0
                                ? `KES ${(stats.sellValue / 1_000_000).toFixed(1)}M`
                                : "—"
                    }
                    accent="text-blue-600 dark:text-blue-400"
                    sub="selling price × qty"
                />
            </div>

            {/* ── Alert banner ── */}
            {!loading && alertCount > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/25 px-4 py-3">
                    <span className="text-amber-500 mt-0.5 shrink-0"><Ico.Alert /></span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Stock alert</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            {stats.outStock > 0 && (
                                <><strong>{stats.outStock}</strong> item{stats.outStock !== 1 ? "s are" : " is"} out of stock.{" "}</>
                            )}
                            {stats.lowStock > 0 && (
                                <><strong>{stats.lowStock}</strong> item{stats.lowStock !== 1 ? "s are" : " is"} below reorder level.</>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => setStatusFilter("low_stock")}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition shrink-0"
                    >
                        View →
                    </button>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Search */}
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Ico.Search />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by item name or section…"
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <Ico.X />
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition"
                >
                    <option value="all">All statuses</option>
                    <option value="in_stock">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                </select>

                {/* Section filter */}
                <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition"
                >
                    <option value="all">All sections</option>
                    {sections.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {hasFilters && (
                    <button
                        onClick={() => { setSearch(""); setSectionFilter("all"); setStatusFilter("all"); }}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition cursor-pointer"
                    >
                        <Ico.X /> Clear
                    </button>
                )}
            </div>

            {/* ── Row count + page size ── */}
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                    Showing{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{paged.length}</span>
                    {" "}of{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span>
                    {" "}items{hasFilters && " (filtered)"}
                </span>
                <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none"
                    >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10">
                            <tr>
                                <th className={thSortCls} onClick={() => toggleSort("name")}>
                                    <span className="flex items-center">Item <SortIndicator field="name" /></span>
                                </th>
                                <th className={thSortCls} onClick={() => toggleSort("section")}>
                                    <span className="flex items-center">Section <SortIndicator field="section" /></span>
                                </th>
                                <th className={thSortCls} onClick={() => toggleSort("qty")}>
                                    <span className="flex items-center">Qty <SortIndicator field="qty" /></span>
                                </th>
                                <th className={thSortCls} onClick={() => toggleSort("costPrice")}>
                                    <span className="flex items-center">Cost (KES) <SortIndicator field="costPrice" /></span>
                                </th>
                                <th className={thSortCls} onClick={() => toggleSort("sellPrice")}>
                                    <span className="flex items-center">Sell (KES) <SortIndicator field="sellPrice" /></span>
                                </th>
                                <th className={thSortCls} onClick={() => toggleSort("margin")}>
                                    <span className="flex items-center">Margin <SortIndicator field="margin" /></span>
                                </th>
                                <th className={thSortCls} onClick={() => toggleSort("value")}>
                                    <span className="flex items-center">Stock Value <SortIndicator field="value" /></span>
                                </th>
                                <th className={thCls}>Reorder</th>
                                <th className={thSortCls} onClick={() => toggleSort("status")}>
                                    <span className="flex items-center">Status <SortIndicator field="status" /></span>
                                </th>
                                <th className={thCls}>Sync</th>
                                <th className={`${thCls} text-right`}>Actions</th>
                            </tr>
                        </thead>

                        {loading ? (
                            <TableSkeleton rows={pageSize} />
                        ) : (
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {paged.map((item) => {
                                    const stockStatus = getStockStatus(item.qty, item.reorderLevel);
                                    const isSaving = savingId === item.id;
                                    const margin =
                                        item.sellPrice > 0 && item.costPrice > 0
                                            ? Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100)
                                            : null;
                                    const stockValue = item.sellPrice * item.qty;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSaving ? "opacity-60" : ""}`}
                                        >
                                            {/* Item name */}
                                            <td className="px-4 py-3 min-w-[180px]">
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight truncate max-w-[220px]">
                                                    {item.name}
                                                </p>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                    Updated {fmtDate(item.updatedAt)}
                                                </p>
                                            </td>

                                            {/* Section */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                                                    {item.section}
                                                </span>
                                            </td>

                                            {/* Qty — inline editable */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <EditableCell
                                                    value={item.qty}
                                                    type="number"
                                                    min={0}
                                                    saving={isSaving}
                                                    onSave={(v) => handleCellSave(item, "qty", v as number)}
                                                />
                                            </td>

                                            {/* Cost price — inline editable */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <EditableCell
                                                    value={item.costPrice}
                                                    type="number"
                                                    min={0}
                                                    saving={isSaving}
                                                    onSave={(v) => handleCellSave(item, "costPrice", v as number)}
                                                />
                                            </td>

                                            {/* Sell price — inline editable */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <EditableCell
                                                    value={item.sellPrice}
                                                    type="number"
                                                    min={0}
                                                    saving={isSaving}
                                                    onSave={(v) => handleCellSave(item, "sellPrice", v as number)}
                                                />
                                            </td>

                                            {/* Margin */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {margin !== null ? (
                                                    <span className={`text-sm font-semibold ${margin >= 20 ? "text-emerald-600 dark:text-emerald-400" : margin > 0 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                                                        {margin}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-700 text-sm">—</span>
                                                )}
                                            </td>

                                            {/* Stock value */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                    {fmtKES(stockValue)}
                                                </span>
                                            </td>

                                            {/* Reorder level — inline editable */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <EditableCell
                                                    value={item.reorderLevel}
                                                    type="number"
                                                    min={0}
                                                    saving={isSaving}
                                                    onSave={(v) => handleCellSave(item, "reorderLevel", v as number)}
                                                />
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge status={stockStatus} />
                                            </td>

                                            {/* Sync Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {item.syncStatus === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded" title={`Synced at ${item.syncedAt ? new Date(item.syncedAt).toLocaleString() : ''}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Synced
                                                    </span>
                                                ) : item.syncStatus === 'failed' || item.syncStatus === 'failure' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded" title="Failed to sync">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        Failed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                                                        Pending
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openAdjust(item)}
                                                        disabled={isSaving}
                                                        title="Adjust stock"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition cursor-pointer disabled:opacity-40"
                                                    >
                                                        <Ico.Adjust />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        disabled={isSaving}
                                                        title="Edit item"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40"
                                                    >
                                                        <Ico.Edit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        disabled={isSaving}
                                                        title="Delete item"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer disabled:opacity-40"
                                                    >
                                                        <Ico.Trash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {paged.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                                                <Ico.Package />
                                                <div>
                                                    <p className="font-semibold text-slate-600 dark:text-slate-300">No items found</p>
                                                    <p className="text-xs mt-0.5">
                                                        {hasFilters
                                                            ? "Try adjusting your filters."
                                                            : "Import a FINSTAR CSV or add items manually."}
                                                    </p>
                                                </div>
                                                {hasFilters ? (
                                                    <button
                                                        onClick={() => { setSearch(""); setSectionFilter("all"); setStatusFilter("all"); }}
                                                        className="text-sm text-orange-500 hover:text-orange-600 font-semibold cursor-pointer"
                                                    >
                                                        Clear all filters
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                                                    >
                                                        <Ico.Upload /> Import CSV
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
                        Page{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{safePage}</span>
                        {" "}of{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            <Ico.ChevLeft />
                        </button>
                        {pageNumbers().map((p, idx) =>
                            p === "…" ? (
                                <span key={`e${idx}`} className="px-1.5 text-slate-400 text-sm select-none">…</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setPage(p as number)}
                                    className={`min-w-[34px] h-8 rounded-lg text-xs font-semibold transition border ${safePage === p
                                        ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                                        }`}
                                >
                                    {p}
                                </button>
                            ),
                        )}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            <Ico.ChevRight />
                        </button>
                    </div>
                </div>
            )}

            {/* ── CSV format hint ── */}
            <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <strong className="text-slate-600 dark:text-slate-300">FINSTAR CSV format:</strong>{" "}
                Columns read:{" "}
                {["ITEM", "QTY / Closing Stock", "PRICE (cost)", "SELLING PRICE", "Section"].map((c) => (
                    <code key={c} className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono mx-0.5">{c}</code>
                ))}.
                {" "}Export produces a file in the same format that can be re-imported.
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium border transition-all
                    ${toast.kind === "success" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : ""}
                    ${toast.kind === "warn" ? "bg-amber-50  dark:bg-amber-950/60  text-amber-800  dark:text-amber-300  border-amber-200  dark:border-amber-800" : ""}
                    ${toast.kind === "error" ? "bg-red-50    dark:bg-red-950/60    text-red-800    dark:text-red-300    border-red-200    dark:border-red-800" : ""}
                `}>
                    <span>
                        {toast.kind === "success" && "✓"}
                        {toast.kind === "warn" && "⚠"}
                        {toast.kind === "error" && "✕"}
                    </span>
                    {toast.msg}
                </div>
            )}

            {/* ── Modals ── */}
            {(modalMode === "edit" || modalMode === "create") && (
                <EditModal
                    item={modalMode === "edit" ? (activeItem ?? undefined) : undefined}
                    sections={sections}
                    saving={modalSaving}
                    onSave={handleModalSave}
                    onClose={closeModal}
                />
            )}

            {modalMode === "adjust" && activeItem && (
                <AdjustModal
                    item={activeItem}
                    saving={modalSaving}
                    onSave={handleAdjustSave}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}