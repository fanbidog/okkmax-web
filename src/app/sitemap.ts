import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic"; // 站点列表从库动态生成

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 手动下架(retiredAt)的不进 sitemap;其余(含暂停监测)保留。
  const stations = await prisma.station.findMany({
    where: { retiredAt: null },
    select: { slug: true, scoredAt: true, createdAt: true },
  });

  const staticPages: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/list", changeFrequency: "daily", priority: 0.9 },
    { path: "/reputation", changeFrequency: "daily", priority: 0.8 },
    { path: "/availability", changeFrequency: "hourly", priority: 0.7 },
    { path: "/tools/iq", changeFrequency: "daily", priority: 0.8 },
    { path: "/activity", changeFrequency: "weekly", priority: 0.6 },
    { path: "/help", changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...staticPages.map((p) => ({ url: SITE_URL + p.path, lastModified: new Date(), changeFrequency: p.changeFrequency, priority: p.priority })),
    ...stations.map((s) => ({
      url: `${SITE_URL}/station/${s.slug}`,
      lastModified: s.scoredAt ?? s.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
