import type { MetadataRoute } from "next";
import { siteFeatures } from "@/lib/site-config";
import { workspacePaths } from "@/lib/site-features";

const SITE_URL = "https://watcharin-service.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...(!siteFeatures.workspace ? workspacePaths : [])],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
