import { getProducts } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  try {
    const products = await getProducts({ pageSize: 200 });

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${products.results
  .filter((product) => product.imageUrls.length > 0 || product.imageUrl)
  .map((product) => {
    const images = (product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl])
      .filter(Boolean)
      .map(
        (imageUrl) => `<image:image>
  <image:loc>${imageUrl}</image:loc>
  <image:title><![CDATA[${product.name}]]></image:title>
  <image:caption><![CDATA[${product.category.name} supplied by Finstar Industrial Systems Ltd in Kenya]]></image:caption>
</image:image>`,
      )
      .join("\n");

    return `<url>
  <loc>${absoluteUrl(`/products/${product.slug}`)}</loc>
  ${images}
</url>`;
  })
  .join("\n")}
</urlset>`;

    return new Response(body, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />`,
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      },
    );
  }
}
