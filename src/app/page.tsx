import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { HeroDetectForm } from "@/components/HeroDetectForm";
import { InfoCard } from "@/components/InfoCard";
import { StationRow } from "@/components/StationRow";
import { HomeReviews, type HomeReviewItem } from "@/components/HomeReviews";
import { HomePromos, type HomePromoItem } from "@/components/HomePromos";
import { getCurrentUser } from "@/lib/auth";
import { splitLegacyTags } from "@/lib/reviewTags";
import { classifyTier } from "@/lib/tier";
import { HEADLINE } from "@/lib/headline";
import type { GroupCatalog } from "@/lib/stationMeta";
import { getLocale } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

/** 数字页码:首页、末页、当前±1,中间省略号。 */
function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) out.push(i);
  if (page < total - 2) out.push("…");
  out.push(total);
  return out;
}

export const metadata = {
  alternates: { canonical: "/" }, // 消除 ?m= / ?p= 变体的重复
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ m?: string; p?: string }> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const selModel = sp?.m && HEADLINE.some((h) => h.id === sp.m) ? sp.m! : HEADLINE[0].id;

  const channels = await prisma.channel.findMany({
    where: { delistedAt: null, station: { retiredAt: null } }, // 下架组/手动下架站不进首页榜单
    include: {
      station: true,
      uptimes: { orderBy: { capturedAt: "desc" }, take: 1 },
      windows: { where: { period: "24h" } },
      detections: { orderBy: { detectedAt: "desc" }, take: 1 },
    },
  });
  const recent = await prisma.detectionResult.findMany({
    where: { channel: { delistedAt: null, station: { retiredAt: null } } }, // 下架组/手动下架站不进首页最新检测
    orderBy: { detectedAt: "desc" },
    take: 9,
    include: { channel: { include: { station: true } } },
  });
  // 检测框 URL 联想:收录站点名 + 接口地址(用户可选/搜/粘贴)
  const stationOpts = await prisma.station.findMany({ where: { retiredAt: null }, select: { name: true, baseUrl: true, logoUrl: true }, orderBy: { name: "asc" } });
  // 首页公告(CMS,后台改 Content[home_banner].body;空则不渲染)
  const bannerRow = await prisma.content.findUnique({ where: { key: "home_banner" }, select: { body: true, body_en: true } });
  const banner = (pick(bannerRow, "body", locale) as string | null | undefined)?.trim() || "";

  // 按站点聚合排行(每站一行,选中模型决定价格列)
  const byStation = new Map<string, typeof channels>();
  for (const c of channels) {
    const arr = byStation.get(c.stationId) ?? [];
    arr.push(c);
    byStation.set(c.stationId, arr);
  }
  const delistedByStation = new Map<string, Set<string>>();
  for (const c of await prisma.channel.findMany({ where: { delistedAt: { not: null } }, select: { stationId: true, name: true } })) {
    const s = delistedByStation.get(c.stationId) ?? new Set<string>();
    s.add(c.name); delistedByStation.set(c.stationId, s);
  }
  const me = await getCurrentUser();
  const favSet = me ? new Set((await prisma.favorite.findMany({ where: { userId: me.id }, select: { stationId: true } })).map((f) => f.stationId)) : new Set<string>();
  const allRows = [...byStation.values()].map((chs) => {
    const st = chs[0].station;
    const score = st.compositeScore; // 缓存综合分(算分步骤每小时算;样本不足为 null=积累中)
    const avail = st.availIndex;       // 缓存可用指数
    const bestWin = chs.map((c) => c.windows[0]).filter(Boolean).sort((a, b) => b!.avg - a!.avg)[0];
    const delisted = delistedByStation.get(st.id);
    const groups = ((st.groups as unknown as GroupCatalog[] | undefined) ?? []).filter((g) => !delisted?.has(g.name));
    let priceIn: number | null = null, priceOut: number | null = null;
    let hasModel = false;
    for (const g of groups) {
      const m = g.models.find((mm) => mm.id === selModel);
      if (!m) continue;
      hasModel = true; // 有该模型即上榜,不管有没有价(sub2api 等站无价目)
      // 取有效价的最小值;跳过 in 为 null/0 的条目 —— 否则 `null < 18` 被当 0<18 会把真价覆盖成空(cctq 曾显示—)
      if (m.in != null && m.in > 0 && (priceIn == null || m.in < priceIn)) { priceIn = m.in; priceOut = m.out; }
    }
    return { id: st.id, slug: st.slug, name: st.name, logoUrl: st.logoUrl, homepage: st.homepage, referralUrl: st.referralUrl, score, avail, points: bestWin?.points ?? null, priceIn, priceOut, isFav: favSet.has(st.id), loggedIn: !!me, rank: st.rank, prevRank: st.prevRank, hasModel };
  })
    .filter((r) => r.hasModel) // 选中模型:不提供该模型的站不进榜
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const bp = Math.min(Math.max(1, Number(sp.p) || 1), totalPages);
  const stationRows = allRows.slice((bp - 1) * PAGE_SIZE, bp * PAGE_SIZE);

  // 三宫格:最新实测 / 可用性监测 / 速度监测(均取真实数据)
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const mmdd = (d: Date) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const testItems = recent.map((d) => ({
    id: d.id, logoUrl: d.channel.station.logoUrl, initial: d.channel.station.name.slice(0, 1), name: d.model,
    a: classifyTier(d.totalScore).label, b: mmdd(d.detectedAt),
    href: `/station/${d.channel.station.slug}`,
  }));
  const monItems = channels
    .filter((c) => c.currentStatus != null)
    .sort((a, b) => (a.currentStatus! - b.currentStatus!) || ((b.currentLatencyMs ?? 0) - (a.currentLatencyMs ?? 0)))
    .slice(0, 9)
    .map((c) => {
      const st = c.currentStatus!;
      const a = st === 0 ? t("超时", locale) : st === 2 ? t("慢", locale) : t("在线", locale);
      const b = st === 0 && c.currentLatencyMs ? `${Math.round(c.currentLatencyMs / 1000)}s`
        : c.avail != null ? `${Math.round(c.avail)}%`
        : c.currentLatencyMs ? `${(c.currentLatencyMs / 1000).toFixed(1)}s` : "";
      return { id: c.id, logoUrl: c.station.logoUrl, initial: c.station.name.slice(0, 1), name: c.name, a, b, href: `/station/${c.station.slug}` };
    });
  const speedItems = channels
    .filter((c) => (c.currentLatencyMs ?? 0) > 0 && c.currentStatus !== 0)
    .sort((a, b) => (a.currentLatencyMs ?? 0) - (b.currentLatencyMs ?? 0))
    .slice(0, 9)
    .map((c) => ({ id: c.id, logoUrl: c.station.logoUrl, initial: c.station.name.slice(0, 1), name: c.name, a: `${((c.currentLatencyMs ?? 0) / 1000).toFixed(1)}s`, href: `/station/${c.station.slug}` }));

  // 口碑精选:近期高分评价,每站取 1 条,共 3 条
  const featRaw = await prisma.review.findMany({
    where: { rating: { gte: 4 }, station: { retiredAt: null } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true, rating: true, body: true, prosTags: true, consTags: true, tags: true,
      user: { select: { name: true, email: true, image: true } },
      station: { select: { slug: true, name: true, logoUrl: true } },
    },
  });
  const seenStation = new Set<string>();
  const seenBody = new Set<string>();
  const featured: HomeReviewItem[] = [];
  for (const r of featRaw) {
    if (seenStation.has(r.station.slug) || seenBody.has(r.body)) continue; // 每站最多 1 条,且不展示重复正文
    seenStation.add(r.station.slug);
    seenBody.add(r.body);
    const { pros, cons } = (r.prosTags.length || r.consTags.length) ? { pros: r.prosTags, cons: r.consTags } : splitLegacyTags(r.tags);
    featured.push({
      id: r.id, body: r.body, rating: r.rating, pros: pros.slice(0, 2), cons: cons.slice(0, 1),
      userName: r.user?.name?.trim() || r.user?.email?.split("@")[0] || t("匿名用户", locale), userImage: r.user?.image ?? null,
      stationSlug: r.station.slug, stationName: r.station.name, stationLogo: r.station.logoUrl,
    });
    if (featured.length >= 6) break;
  }

  // 福利活动:active 且未过期的免费 API + 中转站福利,混排 3 张(优先 2 免费 + 1 福利)
  const promoNow = Date.now();
  const [freeRaw, perkRaw] = await Promise.all([
    prisma.freeApi.findMany({ where: { active: true }, orderBy: [{ sortWeight: "desc" }, { createdAt: "desc" }], take: 6 }),
    prisma.relayPromo.findMany({ where: { active: true }, orderBy: [{ sortWeight: "desc" }, { createdAt: "desc" }], take: 4 }),
  ]);
  const freeItems: HomePromoItem[] = freeRaw
    .filter((a) => !a.endsAt || a.endsAt.getTime() >= promoNow)
    .map((a) => ({
      id: a.id, kind: "free", logoUrl: a.logoUrl, initial: (a.provider || a.model || "?").slice(0, 1).toUpperCase(),
      title: a.model, sub: a.provider, desc: pick(a, "quota", locale) || (a.context ? `${a.context} ${t("上下文", locale)}` : t("官方免费额度", locale)),
      meta: [a.bindCard, a.network, a.endsAt ? `${t("截止", locale)} ${mmdd(a.endsAt)}` : t("长期", locale)].filter(Boolean) as string[],
      href: a.claimUrl || "/activity",
    }));
  const perkItems: HomePromoItem[] = perkRaw
    .filter((p) => !p.endsAt || p.endsAt.getTime() >= promoNow)
    .map((p) => ({
      id: p.id, kind: "perk", logoUrl: p.logoUrl, initial: (p.station || "?").slice(0, 1).toUpperCase(),
      title: p.station, sub: p.host || "", desc: pick(p, "activity", locale),
      meta: [p.endsAt ? `${t("截止", locale)} ${mmdd(p.endsAt)}` : t("长期", locale)].filter(Boolean) as string[],
      href: p.claimUrl || "/activity",
    }));
  let promoItems = [...freeItems.slice(0, 2), ...perkItems.slice(0, 1)];
  if (promoItems.length < 3) promoItems = [...promoItems, ...freeItems.slice(2), ...perkItems.slice(1)];
  promoItems = promoItems.slice(0, 3);

  return (
    <>
      <SiteNav active="home" />

      <header className="hero">
        <div className="wrap">
          <h1>{t("发现", locale)}<span className="g">{t("好用", locale)}</span>{t("的 AI 中转站", locale)}</h1>
          <p className="sub">{t("纯度检测、在线率、延迟,逐项实测公开可复现。或者贴一个站,自己测。", locale)}</p>
          <HeroDetectForm stations={stationOpts} />
        </div>
      </header>

      <div className="wrap">
        {banner && (
          <div className="home-banner" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
            <span>{banner}</span>
          </div>
        )}
        <section className="home-sec">
          <div className="ic-grid">
            <InfoCard title={t("最新实测", locale)} moreHref="/list" items={testItems} empty={t("暂无检测记录", locale)} />
            <InfoCard title={t("可用性监测", locale)} moreHref="/availability" items={monItems} empty={t("暂无监测数据", locale)} />
            <InfoCard title={t("速度监测", locale)} moreHref="/availability" items={speedItems} empty={t("暂无速度数据", locale)} />
          </div>
        </section>

        <section className="home-sec" id="rankings" style={{ scrollMarginTop: 72 }}>
          <div className="hs-head"><span className="hs-t">{t("站点排行", locale)}</span><Link className="hs-more" href="/list">{t("查看更多", locale)} ›</Link></div>
          <div className="board">
            <div className="det-modelrow" style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 2px 12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t("选模型", locale)}</span>
              {HEADLINE.map((h) => (
                <Link key={h.id} href={`/?m=${h.id}#rankings`} className={selModel === h.id ? "pill on" : "pill"}>{h.label}{h.new && <span className="pnew">NEW</span>}</Link>
              ))}
            </div>
            <div className="card flat-x board-scroll">
              <table className="tbl-strong">
                <thead><tr>
                  <td>{t("排名", locale)}</td><td>{t("站点", locale)}</td>
                  <td style={{ textAlign: "right" }}>{t("综合评分", locale)}</td><td style={{ textAlign: "right" }}>{t("输入/输出", locale)}</td>
                  <td style={{ textAlign: "right" }}>{t("纯度", locale)}</td><td style={{ textAlign: "right" }}>{t("在线率", locale)}</td><td style={{ textAlign: "right" }}>{t("24h 趋势", locale)}</td>
                </tr></thead>
                <tbody>
                  {stationRows.map((r, i) => <StationRow key={r.slug} {...r} rank={(bp - 1) * PAGE_SIZE + i + 1} />)}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <nav className="board-pager" aria-label={t("排名分页", locale)}>
                {pageList(bp, totalPages).map((n, i) => n === "…"
                  ? <span key={`e${i}`} className="bp-e">…</span>
                  : <Link key={n} href={`/?m=${selModel}&p=${n}#rankings`} className={"bp" + (n === bp ? " on" : "")} aria-current={n === bp ? "page" : undefined}>{n}</Link>)}
              </nav>
            )}
          </div>
        </section>

        <HomeReviews items={featured} />
        <HomePromos items={promoItems} />
      </div>
    </>
  );
}
