import { getCategoryMeta } from "@/lib/data";
import type {
  Category,
  InquiryPayload,
  InquiryResponse,
  PaginatedResponse,
  Product,
  ProductCategory,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

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
  is_active: boolean;
  featured: boolean;
  specs: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

interface ApiInquiryResponse {
  message: string;
  data: {
    id: number;
    name: string;
    email: string;
    message: string;
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

function withLeadingSlash(endpoint: string) {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

function toApiUrl(endpoint: string) {
  return `${API_BASE_URL}${withLeadingSlash(endpoint)}`;
}

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
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.short_description,
    category: mapProductCategory(product.category),
    imageUrl: product.image_url,
    isActive: product.is_active,
    featured: product.featured,
    specs: product.specs,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

async function parseErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

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
      typeof payload.detail === "string"
        ? payload.detail
        : `API Error (${response.status})`;

    throw new APIError(message, response.status, payload);
  }

  return response.json() as Promise<T>;
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export async function getCategories() {
  const categories = await fetchAPI<ApiCategory[]>("/categories");
  return categories.map(mapCategory);
}

export async function getProducts(options: ProductQueryOptions = {}) {
  const params = new URLSearchParams();

  if (options.category) {
    params.set("category", options.category);
  }

  if (typeof options.featured === "boolean") {
    params.set("featured", String(options.featured));
  }

  if (options.page) {
    params.set("page", String(options.page));
  }

  if (options.pageSize) {
    params.set("page_size", String(options.pageSize));
  }

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

export async function submitInquiry(payload: InquiryPayload) {
  const response = await fetchAPI<ApiInquiryResponse>("/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return {
    message: response.message,
    data: {
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
      message: response.data.message,
      createdAt: response.data.created_at,
    },
  } satisfies InquiryResponse;
}

export async function authFetchAPI<T>(
  endpoint: string,
  options: FetchAPIOptions = {},
): Promise<T> {
  let token = "";
  if (typeof window !== "undefined") {
    const rawSession = window.localStorage.getItem("finstar_admin_session");
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession);
        token = session.accessToken || "";
      } catch (e) {}
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

export async function loginAdmin(credentials: Record<string, string>) {
  return fetchAPI<{ access: string; refresh: string; user: Record<string, unknown> }>("/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
}

export async function getAdminOverview() {
  return authFetchAPI<{
    total_products: number;
    active_products: number;
    inactive_products: number;
    total_categories: number;
    total_inquiries: number;
  }>("/admin/dashboard/overview", { next: { revalidate: 0 } });
}

export async function getAdminProducts() {
  // Use paginated response wrapper structure
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
  return authFetchAPI(`/admin/products/${id}`, {
    method: "DELETE",
  });
}

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

export async function getAdminInquiries() {
  return authFetchAPI<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>("/admin/inquiries", { next: { revalidate: 0 } });
}

export async function deleteAdminCategory(id: number) {
  return authFetchAPI(`/admin/categories/${id}`, {
    method: "DELETE",
  });
}

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

export interface AIProductResponse {
  name: string;
  short_description: string;
  description: string;
}

export async function generateProductWithAI(input: File | string): Promise<AIProductResponse> {
  if (input instanceof File) {
    const formData = new FormData();
    formData.append("image", input);
    return authFetchAPI<AIProductResponse>("/admin/ai/generate-product", {
      method: "POST",
      body: formData,
    });
  }

  return authFetchAPI<AIProductResponse>("/admin/ai/generate-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: input }),
  });
}

