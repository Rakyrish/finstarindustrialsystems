import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finstar Industrial Systems Ltd",
    short_name: "Finstar",
    description:
      "Industrial refrigeration, HVAC, boiler, cold room, and engineering supply solutions in Nairobi, Kenya and East Africa.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#ea580c",
    orientation: "portrait",
    categories: ["business", "industrial", "engineering"],
    lang: "en-KE",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
