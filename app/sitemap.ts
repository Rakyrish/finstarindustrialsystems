import { MetadataRoute } from "next";
import { fetchAllProducts, getCategories } from "@/lib/api";
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
      // fetchAllProducts() auto-paginates — sitemap includes every active product
      fetchAllProducts(),
    ]);

    // A "successful" fetch that returns nothing is just as dangerous as a
    // thrown error here — either way the sitemap would silently collapse to
    // 4 static URLs and drop the entire catalogue from Google's index.
    if (products.length === 0) {
      throw new Error(
        `Sitemap build got 0 products from the API — refusing to publish a sitemap that drops the entire catalogue.`,
      );
    }

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${SITE_URL}${buildCategoryPath(category.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    // Loud on purpose: this fallback silently drops every product/category
    // URL from the sitemap, which is a de-indexing risk if it goes
    // unnoticed. Surface it in build/deploy logs every time it fires.
    console.error(
      "[sitemap] Falling back to static routes only — product/category URLs are NOT in this sitemap build. " +
        "Investigate the backend API before this deploy ships.",
      error,
    );
    return staticRoutes;
  }
}
