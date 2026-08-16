import type { MetadataRoute } from "next";
import { fetchProjects } from "@/lib/project-archive-repo";

const SITE_URL = "https://watcharin-service.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const projects = await fetchProjects();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      // หน้าแรกเดิม ย้ายมาเป็นหน้าเจาะลึกสำหรับกลุ่มบริษัทและงานโรงงาน
      url: `${SITE_URL}/studio`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // แต่ละโปรเจกต์เป็นหน้าของตัวเอง — ให้คนเสิร์ชเจอรายตัวได้
    ...projects.map((p) => ({
      url: `${SITE_URL}/projects/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
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
