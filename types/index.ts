export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  productCount: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: ProductCategory;
  imageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  featured: boolean;
  specs: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface InquiryPayload {
  name: string;
  email: string;
  message: string;
  phone?: string;
  company?: string;
  subject?: string;
  products?: string[];    // saved/tagged product names from the bookmark system
  source_url?: string;
}

export interface InquiryResponse {
  message: string;
  email_sent?: boolean;
  emailSent?: boolean;
  data: {
    id: number;
    name: string;
    email: string;
    message: string;
    createdAt: string;
  };
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface CategoryLink {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  isStaff: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
}

export interface SavedProduct {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  categoryName: string;
  categorySlug: string;
  savedAt: string;
}
