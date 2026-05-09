import { getCategoryMeta } from "@/lib/data";
import type {
  Category,
  InquiryPayload,
  InquiryResponse,
  PaginatedResponse,
  Product,
  ProductCategory,
} from "@/types";

// In Docker, SSR requests use the internal network URL (http://backend:8000/)
// while client-side requests use the public URL (https://finstarindustrials.com/)
const API_BASE_URL =
  (typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL) + "api";

interface FetchAPIOptions extends RequestInit {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

interface ProductQueryOptions {
  category?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  product_count?: number;
}

export interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: ApiCategory;
  image_url: string;
  image_urls?: string[];
  is_active: boolean;
  featured: boolean;
  specs: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

// ── Inventory types ───────────────────────────────────────────────────────────

export interface ApiInventoryItem {
  id: number;
  product: number;           // FK → Product.id
  product_name: string;      // read-only, from serializer
  category_name: string;     // read-only, from serializer
  category_id: number;       // read-only, from serializer
  sku: string;
  unit: string;
  cost_price: string;        // Django DecimalField → string in JSON
  unit_price: string;
  quantity_in_stock: number;
  reorder_level: number;
  last_updated: string;      // ISO datetime
}

/** Shape used inside the frontend — plain numbers instead of decimal strings */
export interface InventoryItem {
  id: number;
  productId: number;
  name: string;
  categoryId: number;
  categoryName: string;
  sku: string;
  unit: string;
  costPrice: number;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  lastUpdated: string;
}

/** Payload sent to POST /admin/inventory or PUT /admin/inventory/<pk> */
export interface InventoryWritePayload {
  product: number;
  sku: string;
  unit: string;
  cost_price: number | string;
  unit_price: number | string;
  quantity_in_stock: number;
  reorder_level: number;
}

// ── FIX: Added stock adjustment types ────────────────────────────────────────

export type MovementType =
  | "restock"
  | "sale"
  | "adjustment"
  | "return"
  | "damage"
  | "transfer";

export interface StockAdjustPayload {
  quantity: number;          // positive = add, negative = deduct
  movement_type?: MovementType;
  notes?: string;
}

export interface StockAdjustResponse {
  detail: string;
  sku: string;
  quantity_before: number;
  quantity_after: number;
  movement_id: number;
}

export interface ApiStockMovement {
  id: number;
  inventory_item: number;
  inventory_item_sku?: string;
  inventory_item_name?: string;
  movement_type: MovementType;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  notes: string;
  performed_by: number | null;
  performed_by_username?: string;
  created_at: string;
}

// ── Other existing types ──────────────────────────────────────────────────────

interface ApiInquiryResponse {
  message: string;
  email_sent?: boolean;
  data: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    subject?: string;
    message: string;
    products?: string[];
    source_url?: string;
    created_at: string;
  };
}

export class APIError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.payload = payload;
  }
}

// ── Core fetch helpers ────────────────────────────────────────────────────────

function withLeadingSlash(endpoint: string) {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

function toApiUrl(endpoint: string) {
  return `${API_BASE_URL}${withLeadingSlash(endpoint)}`;
}

async function parseErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function fetchAPI<T>(
  endpoint: string,
  options: FetchAPIOptions = {},
): Promise<T> {
  const { headers, next, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();

  const response = await fetch(toApiUrl(endpoint), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...headers,
    },
    ...(method === "GET"
      ? { next: next ?? { revalidate: 60 } }
      : { cache: "no-store" }),
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const message =
      typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof (payload as Record<string, unknown>).detail === "string"
        ? (payload as Record<string, string>).detail
        : `API Error (${response.status})`;
    throw new APIError(message, response.status, payload);
  }

  // FIX: handle 204 No Content (DELETE responses return empty body)
  if (response.status === 204) return undefined as unknown as T;

  return response.json() as Promise<T>;
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export async function authFetchAPI<T>(
  endpoint: string,
  options: FetchAPIOptions = {},
): Promise<T> {
  let token = "";
  // FIX: Guard is correct — authFetchAPI is intentionally client-only for admin
  // routes that require a Bearer token stored in localStorage.
  if (typeof window !== "undefined") {
    const rawSession = window.localStorage.getItem("finstar_admin_session");
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession);
        token = session.accessToken || "";
      } catch {
        // ignore malformed session
      }
    }
  }

  const { headers, ...rest } = options;
  return fetchAPI<T>(endpoint, {
    ...rest,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapCategory(category: ApiCategory): Category {
  const fallback = getCategoryMeta(category.slug);
  return {
    id: category.id,
    name: category.name || fallback.name,
    slug: category.slug,
    description: category.description || fallback.description,
    icon: category.icon || fallback.icon,
    productCount: category.product_count ?? 0,
  };
}

function mapProductCategory(category: ApiCategory): ProductCategory {
  const fallback = getCategoryMeta(category.slug);
  return {
    id: category.id,
    name: category.name || fallback.name,
    slug: category.slug,
    description: category.description || fallback.description,
    icon: category.icon || fallback.icon,
  };
}

function mapProduct(product: ApiProduct): Product {
  const imageUrls = Array.isArray(product.image_urls)
    ? product.image_urls.filter((value): value is string => typeof value === "string" && value.length > 0)
    : product.image_url
      ? [product.image_url]
      : [];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    shortDescription: product.short_description,
    category: mapProductCategory(product.category),
    imageUrl: product.image_url,
    imageUrls,
    isActive: product.is_active,
    featured: product.featured,
    specs: product.specs,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/** Maps the API snake_case shape → camelCase frontend shape */
export function mapInventoryItem(item: ApiInventoryItem): InventoryItem {
  return {
    id: item.id,
    productId: item.product,
    name: item.product_name,
    categoryId: item.category_id,
    categoryName: item.category_name,
    sku: item.sku,
    unit: item.unit,
    costPrice: parseFloat(item.cost_price) || 0,
    unitPrice: parseFloat(item.unit_price) || 0,
    quantityInStock: item.quantity_in_stock,
    reorderLevel: item.reorder_level,
    lastUpdated: item.last_updated,
  };
}

// ── Public API: Categories ────────────────────────────────────────────────────

export async function getCategories() {
  const categories = await fetchAPI<ApiCategory[]>("/categories");
  return categories.map(mapCategory);
}

// ── Public API: Products ──────────────────────────────────────────────────────

export async function getProducts(options: ProductQueryOptions = {}) {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (typeof options.featured === "boolean") params.set("featured", String(options.featured));
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("page_size", String(options.pageSize));

  const query = params.toString();
  const response = await fetchAPI<PaginatedResponse<ApiProduct>>(
    query ? `/products?${query}` : "/products",
  );
  return {
    ...response,
    results: response.results.map(mapProduct),
  } satisfies PaginatedResponse<Product>;
}

export async function getProductBySlug(slug: string) {
  const response = await fetchAPI<ApiProduct>(`/products/${slug}`);
  return mapProduct(response);
}

/**
 * Fetches ALL active products by walking every paginated page until exhausted.
 *
 * Use this everywhere you need the complete catalogue:
 *   - products page (SSR)
 *   - category pages (SSR)
 *   - sitemap generation
 *   - generateStaticParams
 *   - homepage featured products
 *   - image sitemap
 *
 * Pass optional `options` to apply server-side filters (e.g. { category: "hvac" }).
 * Do NOT pass `page` or `pageSize` — those are managed internally.
 *
 * In development mode, logs a count comparison so you can verify the frontend
 * matches the backend total without shipping debug code to production.
 */
export async function fetchAllProducts(
  options: Omit<ProductQueryOptions, "page" | "pageSize"> = {},
): Promise<Product[]> {
  // Use a large page size to minimise round-trips while staying inside max_page_size=1000
  const PAGE_SIZE = 500;
  const results: Product[] = [];
  let page = 1;

  while (true) {
    const response = await getProducts({ ...options, page, pageSize: PAGE_SIZE });
    results.push(...response.results);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[fetchAllProducts] page=${page} fetched=${response.results.length} ` +
        `total_so_far=${results.length} api_total=${response.count}`,
      );
    }

    // `response.next` is null when we have reached the last page
    if (!response.next) break;
    page++;
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[fetchAllProducts] COMPLETE — ${results.length} products loaded`);
  }

  return results;
}

// ── Public API: Inquiries ─────────────────────────────────────────────────────

export async function submitInquiry(payload: InquiryPayload) {
  const response = await fetchAPI<ApiInquiryResponse>("/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    message: response.message,
    emailSent: response.email_sent ?? false,
    data: {
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
      message: response.data.message,
      createdAt: response.data.created_at,
    },
  } satisfies InquiryResponse;
}

// ── Admin API: Auth ───────────────────────────────────────────────────────────

export async function loginAdmin(credentials: Record<string, string>) {
  return fetchAPI<{ access: string; refresh: string; user: Record<string, unknown> }>("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
}

// ── Admin API: Dashboard ──────────────────────────────────────────────────────

export interface AdminOverviewResponse {
  total_products: number;
  active_products: number;
  inactive_products: number;
  total_inventory_items: number;
  total_inventory_value: number;
  total_cost_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  in_stock_count: number;
  sections_count: number;
  total_categories: number;
  total_inquiries: number;
  products_by_category: { name: string; count: number }[];
  stock_distribution: { in_stock: number; low_stock: number; out_of_stock: number };
  recent_inquiries: { id: number; name: string; email: string; message: string; created_at: string }[];
  inventory_by_section: { section: string; count: number; value: number }[];
  top_items_by_value: { name: string; quantity_in_stock: number; value: number }[];
}

export async function getAdminOverview() {
  return authFetchAPI<AdminOverviewResponse>("/admin/dashboard/overview", { next: { revalidate: 0 } });
}

// ── Admin API: Products ───────────────────────────────────────────────────────

export async function getAdminProducts() {
  return authFetchAPI<PaginatedResponse<ApiProduct>>("/admin/products", { next: { revalidate: 0 } });
}

export async function createAdminProduct(data: Record<string, unknown>) {
  return authFetchAPI<ApiProduct>("/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateAdminProduct(id: number, data: Record<string, unknown>) {
  return authFetchAPI<ApiProduct>(`/admin/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminProduct(id: number) {
  return authFetchAPI(`/admin/products/${id}`, { method: "DELETE" });
}

// ── Admin API: Categories ─────────────────────────────────────────────────────

export async function getAdminCategories() {
  return authFetchAPI<ApiCategory[]>("/admin/categories", { next: { revalidate: 0 } });
}

export async function createAdminCategory(data: Record<string, unknown>) {
  return authFetchAPI<ApiCategory>("/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCategory(id: number) {
  return authFetchAPI(`/admin/categories/${id}`, { method: "DELETE" });
}

// ── Admin API: Inquiries ──────────────────────────────────────────────────────

export async function getAdminInquiries() {
  return authFetchAPI<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    "/admin/inquiries",
    { next: { revalidate: 0 } },
  );
}

// ── Admin API: Inventory ──────────────────────────────────────────────────────

/**
 * GET /api/admin/inventory/
 * Returns all inventory items. The DefaultRouter appends a trailing slash.
 */
export async function getAdminInventory(): Promise<InventoryItem[]> {
  const response = await authFetchAPI<ApiInventoryItem[] | PaginatedResponse<ApiInventoryItem>>(
    "/admin/inventory/",
    { next: { revalidate: 0 } },
  );
  // Handle both paginated and plain-list responses
  const items = Array.isArray(response) ? response : response.results;
  return items.map(mapInventoryItem);
}

/**
 * POST /api/admin/inventory/
 * Creates a new inventory record linked to an existing product.
 */
export async function createAdminInventoryItem(
  data: InventoryWritePayload,
): Promise<InventoryItem> {
  const raw = await authFetchAPI<ApiInventoryItem>("/admin/inventory/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return mapInventoryItem(raw);
}

/**
 * PUT /api/admin/inventory/<pk>/
 * Full update of an inventory item.
 */
export async function updateAdminInventoryItem(
  id: number,
  data: Partial<InventoryWritePayload>,
): Promise<InventoryItem> {
  const raw = await authFetchAPI<ApiInventoryItem>(`/admin/inventory/${id}/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return mapInventoryItem(raw);
}

/**
 * DELETE /api/admin/inventory/<pk>/
 */
export async function deleteAdminInventoryItem(id: number): Promise<void> {
  await authFetchAPI<void>(`/admin/inventory/${id}/`, { method: "DELETE" });
}

/**
 * POST /api/admin/inventory/<pk>/adjust/
 * Manual stock adjustment — positive to add, negative to deduct.
 */
export async function adjustAdminInventoryStock(
  id: number,
  payload: StockAdjustPayload,
): Promise<StockAdjustResponse> {
  return authFetchAPI<StockAdjustResponse>(`/admin/inventory/${id}/adjust/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/admin/inventory/<pk>/movements/
 * Full movement history for a single inventory item.
 */
export async function getAdminInventoryMovements(
  id: number,
): Promise<ApiStockMovement[]> {
  return authFetchAPI<ApiStockMovement[]>(`/admin/inventory/${id}/movements/`);
}

/**
 * GET /api/admin/stock-movements/
 * All movements across all inventory items.
 */
export async function getAdminStockMovements(options?: {
  type?: MovementType;
  search?: string;
}): Promise<ApiStockMovement[]> {
  const params = new URLSearchParams();
  if (options?.type) params.set("type", options.type);
  if (options?.search) params.set("search", options.search);
  const query = params.toString();
  return authFetchAPI<ApiStockMovement[]>(
    query ? `/admin/stock-movements/?${query}` : "/admin/stock-movements/",
  );
}

// ── Admin API: Standalone Inventory (CSV-driven, persisted to DB) ────────────

/** Shape returned by GET /admin/standalone-inventory/ */
export interface ApiStandaloneInventoryItem {
  id: number;
  name: string;
  section: string;
  quantity_in_stock: number;
  cost_price: string;        // Django DecimalField → string in JSON
  sell_price: string;
  reorder_level: number;
  stock_status: string;
  margin_percent: number | null;
  created_at: string;
  updated_at: string;
}

/** Frontend camelCase shape for standalone inventory items */
export interface StandaloneInventoryItem {
  id: number;
  name: string;
  section: string;
  qty: number;
  costPrice: number;
  sellPrice: number;
  reorderLevel: number;
  stockStatus: string;
  marginPercent: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for bulk CSV import */
export interface BulkImportPayload {
  items: {
    name: string;
    section: string;
    qty: number;
    costPrice: number;
    sellPrice: number;
    reorderLevel: number;
  }[];
}

export interface BulkImportResponse {
  detail: string;
  created: number;
  updated: number;
  total: number;
  errors?: { row: number; name: string; error: string }[];
}

/** Payload for creating/updating a standalone item */
export interface StandaloneInventoryWritePayload {
  name: string;
  section: string;
  quantity_in_stock: number;
  cost_price: number | string;
  sell_price: number | string;
  reorder_level: number;
}

export interface StandaloneStockAdjustPayload {
  quantity: number;
  movement_type?: string;
  notes?: string;
}

export interface StandaloneStockAdjustResponse {
  detail: string;
  item_name: string;
  quantity_before: number;
  quantity_after: number;
  movement_id: number;
}

/** Maps the API snake_case shape → camelCase frontend shape */
function mapStandaloneInventoryItem(item: ApiStandaloneInventoryItem): StandaloneInventoryItem {
  return {
    id: item.id,
    name: item.name,
    section: item.section,
    qty: item.quantity_in_stock,
    costPrice: parseFloat(item.cost_price) || 0,
    sellPrice: parseFloat(item.sell_price) || 0,
    reorderLevel: item.reorder_level,
    stockStatus: item.stock_status,
    marginPercent: item.margin_percent,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * GET /api/admin/standalone-inventory/
 * Returns all standalone inventory items.
 */
export async function getStandaloneInventory(): Promise<StandaloneInventoryItem[]> {
  const response = await authFetchAPI<ApiStandaloneInventoryItem[]>(
    "/admin/standalone-inventory/",
    { next: { revalidate: 0 } },
  );
  const items = Array.isArray(response) ? response : [];
  return items.map(mapStandaloneInventoryItem);
}

/**
 * POST /api/admin/standalone-inventory/bulk-import/
 * Bulk import parsed CSV items into the database (upsert by name+section).
 */
export async function bulkImportStandaloneInventory(
  payload: BulkImportPayload,
): Promise<BulkImportResponse> {
  return authFetchAPI<BulkImportResponse>("/admin/standalone-inventory/bulk-import/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/standalone-inventory/
 * Creates a new standalone inventory item.
 */
export async function createStandaloneInventoryItem(
  data: StandaloneInventoryWritePayload,
): Promise<StandaloneInventoryItem> {
  const raw = await authFetchAPI<ApiStandaloneInventoryItem>("/admin/standalone-inventory/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return mapStandaloneInventoryItem(raw);
}

/**
 * PUT /api/admin/standalone-inventory/<pk>/
 * Full update of a standalone inventory item.
 */
export async function updateStandaloneInventoryItem(
  id: number,
  data: Partial<StandaloneInventoryWritePayload>,
): Promise<StandaloneInventoryItem> {
  const raw = await authFetchAPI<ApiStandaloneInventoryItem>(`/admin/standalone-inventory/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return mapStandaloneInventoryItem(raw);
}

/**
 * DELETE /api/admin/standalone-inventory/<pk>/
 */
export async function deleteStandaloneInventoryItem(id: number): Promise<void> {
  await authFetchAPI<void>(`/admin/standalone-inventory/${id}/`, { method: "DELETE" });
}

/**
 * POST /api/admin/standalone-inventory/<pk>/adjust/
 * Manual stock adjustment for a standalone item.
 */
export async function adjustStandaloneInventoryStock(
  id: number,
  payload: StandaloneStockAdjustPayload,
): Promise<StandaloneStockAdjustResponse> {
  return authFetchAPI<StandaloneStockAdjustResponse>(`/admin/standalone-inventory/${id}/adjust/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ── Admin API: System ─────────────────────────────────────────────────────────

export async function getHealthStatus() {
  return fetchAPI<{
    status: string;
    database: string;
    response_time_ms: number;
  }>("/health", { next: { revalidate: 0 } });
}

export async function getAdminLogs() {
  return authFetchAPI<{ logs: string[]; message?: string }>("/admin/logs", {
    next: { revalidate: 0 },
  });
}

export async function uploadAdminImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  return authFetchAPI<{ image_url: string }>("/admin/upload-image", {
    method: "POST",
    body: formData,
  });
}

// ── Admin API: AI ─────────────────────────────────────────────────────────────

export interface AIProductResponse {
  name: string;
  short_description: string;
  description: string;
}

interface GenerateProductWithAIInput {
  image: File | string;
  referenceUrl?: string;
}

export async function generateProductWithAI({
  image,
  referenceUrl,
}: GenerateProductWithAIInput): Promise<AIProductResponse> {
  if (image instanceof File) {
    const formData = new FormData();
    formData.append("image", image);
    if (referenceUrl) {
      formData.append("reference_url", referenceUrl);
    }
    return authFetchAPI<AIProductResponse>("/admin/ai/generate-product", {
      method: "POST",
      body: formData,
    });
  }

  return authFetchAPI<AIProductResponse>("/admin/ai/generate-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: image,
      ...(referenceUrl ? { reference_url: referenceUrl } : {}),
    }),
  });
}

// ── Chatbot API ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  sender: "user" | "bot";
  status?: string;
  detected_intent?: string;
  matched_product_name?: string;
  message: string;
  created_at: string;
}

export interface ChatSessionSummary {
  id: string;
  user_identifier: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string;
  last_message_at?: string | null;
}

export interface ChatSessionDetail {
  id: string;
  user_identifier: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: ChatMessage[];
}

export interface ChatInsights {
  total_sessions: number;
  total_messages: number;
  messages_today: number;
  active_sessions_24h: number;
  quote_intent_count: number;
  failed_responses_count: number;
  rate_limited_count: number;
  recent_messages: {
    id: number;
    sender: string;
    status?: string;
    detected_intent?: string;
    matched_product_name?: string;
    message: string;
    created_at: string;
    session_id: string;
  }[];
  common_questions: {
    message: string;
    count: number;
  }[];
  common_intents: {
    detected_intent: string;
    count: number;
  }[];
  most_requested_products: {
    matched_product_name: string;
    count: number;
  }[];
  recent_failures: {
    id: number;
    status: string;
    message: string;
    created_at: string;
    session_id: string;
  }[];
  usage_statistics: {
    avg_messages_per_session: number;
    quote_intent_sessions: number;
    failed_response_rate: number;
    rate_limited_rate: number;
  };
}

export interface ChatbotResponse {
  reply: string;
  session_id: string;
  rate_limited?: boolean;
  rate_limited_reason?: string;
  retry_after_seconds?: number | null;
}

/**
 * POST /api/chatbot/
 * Send a message to the chatbot and get an AI response.
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string | null,
): Promise<ChatbotResponse> {
  return fetchAPI<ChatbotResponse>("/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId || undefined,
    }),
  });
}

/**
 * GET /api/admin/chat-sessions/
 * Admin: paginated list of all chat sessions.
 */
export async function getAdminChatSessions(options?: {
  page?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<PaginatedResponse<ChatSessionSummary>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.search) params.set("search", options.search);
  if (options?.date_from) params.set("date_from", options.date_from);
  if (options?.date_to) params.set("date_to", options.date_to);
  const query = params.toString();
  return authFetchAPI<PaginatedResponse<ChatSessionSummary>>(
    query ? `/admin/chat-sessions/?${query}` : "/admin/chat-sessions/",
    { next: { revalidate: 0 } },
  );
}

/**
 * GET /api/admin/chat-sessions/<uuid>/
 * Admin: full conversation detail.
 */
export async function getAdminChatSession(sessionId: string): Promise<ChatSessionDetail> {
  return authFetchAPI<ChatSessionDetail>(`/admin/chat-sessions/${sessionId}/`, {
    next: { revalidate: 0 },
  });
}

/**
 * GET /api/admin/chat-insights/
 * Admin: monitoring stats and insights.
 */
export async function getAdminChatInsights(): Promise<ChatInsights> {
  return authFetchAPI<ChatInsights>("/admin/chat-insights/", {
    next: { revalidate: 0 },
  });
}
