import { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { buildCategoryPath, SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      getProducts({ pageSize: 100 }),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${SITE_URL}${buildCategoryPath(category.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.results.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
