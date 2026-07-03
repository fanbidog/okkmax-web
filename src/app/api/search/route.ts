import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const stations = await prisma.station.findMany({
    select: { slug: true, name: true, logoUrl: true, homepage: true, groups: true, channels: { where: { delistedAt: null }, select: { detections: { take: 1, orderBy: { detectedAt: "desc" }, select: { totalScore: true } } } } },
  });
  const out = stations.map((s) => {
    const sc = s.channels.map((c) => c.detections[0]?.totalScore).filter((v): v is number => v != null);
    const score = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null;
    const groups = (Array.isArray(s.groups) ? s.groups : []) as { models?: { id: string }[] }[];
    const ids = new Set<string>();
    for (const g of groups) for (const m of g.models ?? []) ids.add(m.id);
    return { slug: s.slug, name: s.name, logoUrl: s.logoUrl, host: s.homepage ? s.homepage.replace(/^https?:\/\//, "").replace(/\/+$/, "") : null, score, modelCount: ids.size };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return NextResponse.json({ stations: out });
}
