export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  description: string;
  shortDescription: string;
  featured?: boolean;
  specs?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  productCount: number;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface NavLink {
  label: string;
  href: string;
}
