import type { MetadataRoute } from "next";

const SITE_URL = "https://watcharin-service.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      // The Factory OS demo is a sales asset in its own right — it answers
      // "what does an MES dashboard actually look like" for search traffic.
      url: `${SITE_URL}/coresync`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
