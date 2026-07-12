import { prisma } from "@/lib/prisma";
import { formatEvent, type EventType } from "@/lib/stationEvents";
import { SITE_URL } from "@/lib/seo";

// 站点动态 RSS(全量事件类型,与站点详情页动态同源;TG 只推三类,RSS 是自选订阅、给全量)。
// 手动下架(retiredAt)的站不出现;5 分钟共享缓存,和事件产出节奏(discover 5 分钟)对齐。
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const rows = await prisma.stationEvent.findMany({
    where: { station: { retiredAt: null } },
    orderBy: { at: "desc" },
    take: 100,
    include: { station: { select: { name: true, slug: true } } },
  });
  const items = rows.map((r) => {
    const text = formatEvent({ type: r.type as EventType, channel: r.channel, data: r.data as Record<string, unknown> | null });
    const link = `${SITE_URL}/station/${encodeURIComponent(r.station.slug)}`;
    return `    <item>
      <title>${esc(`${r.station.name}:${text}`)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(r.id)}</guid>
      <pubDate>${r.at.toUTCString()}</pubDate>
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OkkMax 站点动态</title>
    <link>${esc(SITE_URL)}</link>
    <description>AI API 中转站收录、调价、纯度档位与分组变化动态</description>
    <language>zh-CN</language>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
