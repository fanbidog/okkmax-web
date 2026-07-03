import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { TierTag } from "@/components/Tag";
import { UptimeHeatmap } from "@/components/UptimeHeatmap";
import { ScoreGauge } from "@/components/ScoreGauge";
import { StationSideNav } from "@/components/StationSideNav";
import { IndexCard } from "@/components/IndexCard";
import { InfoTip } from "@/components/InfoTip";
import { SocialChips } from "@/components/SocialChips";
import { StationBasicInfo } from "@/components/StationBasicInfo";
import { AnnouncementList } from "@/components/AnnouncementList";
import { RouteActions } from "@/components/RouteActions";
import { CompareBlock } from "@/components/CompareBlock";
import { radarDims } from "@/lib/stationRow";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FeedbackButton } from "@/components/FeedbackButton";
import { ShareButton } from "@/components/ShareButton";
import { HEADLINE } from "@/lib/headline";
import { splitLegacyTags } from "@/lib/reviewTags";
import { TestHistoryModal } from "@/components/TestHistoryModal";
import { MoreModels } from "@/components/MoreModels";
import { GroupModelTable, type GMGroup } from "@/components/GroupModelTable";
import { StationTimeline } from "@/components/StationTimeline";
import { getCurrentUser } from "@/lib/auth";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewList } from "@/components/ReviewList";
import type { GroupCatalog, Announcement, Social, Route } from "@/lib/stationMeta";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import { pick, pickJson } from "@/lib/i18n/pick";
import { absUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const s = await prisma.station.findUnique({
    where: { slug },
    select: { name: true, description: true, description_en: true, compositeScore: true, availIndex: true, logoUrl: true, retiredAt: true },
  });
  if (!s) return { title: t("站点未找到", locale) };
  // 标题用稳定关键词短语(不放会变的分数,避免每次重抓标题都变);数字放 description。
  const title = `${s.name} ${t("测评:纯度、可用性、价格与真实用户评价", locale)}`;
  const metrics = [
    s.compositeScore != null ? `${t("综合分", locale)} ${Math.round(s.compositeScore)}` : null,
    s.availIndex != null ? `${t("可用率", locale)} ${Math.round(s.availIndex)}%` : null,
  ].filter(Boolean).join("、");
  const base = pick(s, "description", locale) || s.name;
  const description = [base, metrics && `(${metrics})`, t("纯度、可用性、价格全自动探针实测,附真实用户评价。", locale)].filter(Boolean).join(" ").slice(0, 155);
  const canonical = `/station/${slug}`;
  return {
    title,
    description,
    keywords: [s.name, `${s.name}测评`, `${s.name}怎么样`, `${s.name}纯度`, `${s.name}可用性`, `${s.name}价格`],
    alternates: { canonical },
    openGraph: { type: "article", title: `${s.name} ${t("测评", locale)}`, description, url: absUrl(canonical), images: s.logoUrl ? [s.logoUrl] : undefined },
    ...(s.retiredAt ? { robots: { index: false, follow: true } } : {}),
  };
}

function familyOf(id: string): string {
  if (id.startsWith("claude")) return "Claude";
  if (id.startsWith("gpt") || id.startsWith("codex")) return "GPT / Codex";
  if (id.startsWith("gemini")) return "Gemini";
  if (id.startsWith("deepseek")) return "DeepSeek";
  if (id.startsWith("glm")) return "GLM";
  if (id.startsWith("kimi")) return "Kimi";
  if (id.startsWith("mimo")) return "Mimo";
  if (id.startsWith("minimax") || id.startsWith("MiniMax")) return "MiniMax";
  if (id.startsWith("qwen")) return "通义千问";
  return "其他";
}

function scoreLabel(s: number) {
  return s >= 85 ? "纯正" : s >= 60 ? "中等" : s >= 30 ? "偏低" : "存疑";
}

// 表头排序指示:上下双向箭头 SVG(避免 ↕ 在 iOS 渲染成彩色 emoji)。inline-block 防被全局 svg 样式顶成块级换行。active=当前列(高亮),否则淡显
function SortArrow({ active }: { active: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4, opacity: active ? 1 : 0.4 }}>
      <path d="M12 5v14" /><path d="M8 9l4-4 4 4" /><path d="M8 15l4 4 4-4" />
    </svg>
  );
}

export default async function StationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ w?: string; g?: string; m?: string; sort?: string; view?: string; ep?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const period = ["90m", "24h", "7d", "30d"].includes(sp.w ?? "") ? (sp.w as string) : "90m";
  const view = sp.view === "group" ? "group" : "model";
  const station = await prisma.station.findUnique({
    where: { slug },
    include: {
      channels: {
        where: { delistedAt: null }, // 下架组不进监测数据/榜单
        orderBy: { name: "asc" },
        include: {
          windows: { where: { period } },
          detections: { orderBy: { detectedAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!station) notFound();

  const eventWhere = { stationId: station.id, at: { gte: new Date(Date.now() - 90 * 86_400_000) } };
  const allEventRows = await prisma.stationEvent.findMany({
    where: eventWhere, orderBy: { at: "desc" }, take: 300,
    select: { type: true, channel: true, data: true, at: true },
  });
  // 按「行数(事件 + 跨天日期头)」分页,让每页视觉高度稳定(日期头也占一行)。
  const ROW_BUDGET = 7;
  const eventPagesArr: (typeof allEventRows)[] = [];
  {
    let cur: typeof allEventRows = [], rows = 0, prevDay: string | null = null;
    for (const e of allEventRows) {
      const day = e.at.toISOString().slice(0, 10);
      if (cur.length && rows + (day !== prevDay ? 2 : 1) > ROW_BUDGET) { eventPagesArr.push(cur); cur = []; rows = 0; prevDay = null; }
      rows += (cur.length === 0 || day !== prevDay) ? 2 : 1; // 新页首条或跨天 → 多算一行日期头
      cur.push(e); prevDay = day;
    }
    if (cur.length) eventPagesArr.push(cur);
  }
  const eventPages = Math.max(1, eventPagesArr.length);
  const ep = Math.min(Math.max(1, Number(sp.ep) || 1), eventPages);
  const timeline = (eventPagesArr[ep - 1] ?? []).map((e) => ({
    type: e.type as import("@/lib/stationEvents").EventType,
    channel: e.channel,
    data: (e.data ?? null) as Record<string, unknown> | null,
    at: e.at.toISOString(),
  }));
  const evHref = (n: number) => {
    const q = new URLSearchParams();
    if (sp.m) q.set("m", sp.m);
    if (sp.sort) q.set("sort", sp.sort);
    if (sp.w) q.set("w", sp.w);
    if (sp.view) q.set("view", sp.view);
    q.set("ep", String(n));
    return `?${q.toString()}#timeline`; // 翻页定位到动态区,不跳顶/底
  };

  const testHistory = await prisma.detectionResult.findMany({
    where: { channel: { stationId: station.id, delistedAt: null } }, // 下架组的历史检测不在列表展示(数据仍留库)
    orderBy: { detectedAt: "desc" },
    take: 100,
    include: { channel: { select: { name: true } } },
  });
  const tests = testHistory.map((d) => ({ at: d.detectedAt.toISOString(), channel: d.channel.name, model: d.model, actualModel: d.actualModel, modelDowngraded: d.modelDowngraded, score: d.totalScore }));

  // 评论(用户评价)—— 主观、人工
  const me = await getCurrentUser();
  const isFav = me ? (await prisma.favorite.findUnique({ where: { userId_stationId: { userId: me.id, stationId: station.id } } })) != null : false;
  const reviews = await prisma.review.findMany({
    where: { stationId: station.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      replies: { include: { user: { select: { name: true, email: true, image: true } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  const ratingCount = reviews.length;
  const ratingAvg = ratingCount ? reviews.reduce((s, r) => s + r.rating, 0) / ratingCount : null;
  const ratingDist = [5, 4, 3, 2, 1].map((n) => ({ star: n, n: reviews.filter((r) => r.rating === n).length }));
  // 每条评论的优点/缺点(新数据读 pros/cons,旧数据按已知极性兜底拆)
  const reviewPC = (r: { prosTags: string[]; consTags: string[]; tags: string[] }) =>
    (r.prosTags.length || r.consTags.length) ? { pros: r.prosTags, cons: r.consTags } : splitLegacyTags(r.tags);
  // 标签聚合(总览不分优缺点,扁平)
  const tagCounts = new Map<string, number>();
  for (const r of reviews) for (const t of r.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tagCloud = [...tagCounts].sort((a, b) => b[1] - a[1]);
  // 点赞计数 + 我点过的
  const allTargetIds = [...reviews.map((r) => r.id), ...reviews.flatMap((r) => r.replies.map((x) => x.id))];
  const votes = allTargetIds.length ? await prisma.vote.findMany({ where: { targetId: { in: allTargetIds } } }) : [];
  const vcount = (id: string) => votes.filter((v) => v.targetId === id).length;
  const ivoted = (id: string) => (me ? votes.some((v) => v.targetId === id && v.userId === me.id) : false);
  const uname = (u: { name: string | null; email: string }) => u.name || u.email.split("@")[0];
  const reviewData = reviews.map((r) => ({
    id: r.id, user: uname(r.user), avatar: r.user.image, rating: r.rating, body: r.body, ...reviewPC(r), date: r.createdAt.toISOString().slice(0, 10),
    votes: vcount(r.id), voted: ivoted(r.id),
    replies: r.replies.map((rep) => ({ id: rep.id, user: uname(rep.user), avatar: rep.user.image, body: rep.body, date: rep.createdAt.toISOString().slice(0, 10), votes: vcount(rep.id), voted: ivoted(rep.id) })),
  }));

  // 下架组(标了 delistedAt 的分组):从展示里隐藏,通用按标记、不点名。
  const delistedNames = new Set(
    (await prisma.channel.findMany({ where: { stationId: station.id, delistedAt: { not: null } }, select: { name: true } })).map((c) => c.name),
  );
  const groups = ((station.groups as unknown as GroupCatalog[] | undefined) ?? []).filter((g) => !delistedNames.has(g.name));
  // 多语言:server 端按当前 locale 把可翻字段挑成最终字符串,client 组件只接结果(pickJson 用 node crypto,client 不能用)。
  const locale = await getLocale();
  const annEn = station.announcements_en as Record<string, string> | null;
  const routesEn = station.routes_en as Record<string, string> | null;
  const infoEn = station.info_en as Record<string, string> | null;
  const trJson = (enMap: Record<string, string> | null, src?: string) =>
    src ? pickJson(enMap, src, locale) : src; // 空串/缺省直接透传,避免对 undefined 取 hash
  const announcements = ((station.announcements as unknown as Announcement[] | undefined) ?? []).map((a) => ({
    ...a,
    title: trJson(annEn, a.title) ?? a.title,
    content: trJson(annEn, a.content) ?? a.content,
  }));
  const routes = ((station.routes as unknown as Route[] | undefined) ?? []).map((rt) => ({
    ...rt,
    desc: trJson(routesEn, rt.desc),
  }));
  const rawInfo = (station.info as { minTopup?: string; payment?: string; invoice?: string; refund?: string; promo?: string } | null) ?? {};
  const info = {
    minTopup: trJson(infoEn, rawInfo.minTopup),
    payment: trJson(infoEn, rawInfo.payment),
    invoice: trJson(infoEn, rawInfo.invoice),
    refund: trJson(infoEn, rawInfo.refund),
    promo: trJson(infoEn, rawInfo.promo),
  };
  // 外链:配了返佣链接就走它(用户无感、平台拿返佣),否则官网。显示文字仍是官网。
  const goUrl = station.referralUrl || station.homepage || null;

  const allModels = [...new Set(groups.flatMap((gx) => gx.models.map((m) => m.id)))].sort();
  const headline = HEADLINE.filter((h) => allModels.includes(h.id));
  const minPriceByModel = new Map<string, number>();
  for (const gx of groups) for (const mm of gx.models) { if (mm.in == null) continue; const c = minPriceByModel.get(mm.id); if (c == null || mm.in < c) minPriceByModel.set(mm.id, mm.in); }
  const modelList = allModels.map((id) => ({ id, family: familyOf(id), minPrice: minPriceByModel.get(id) ?? null }));

  // 综合对比块:代表通道(纯度最高)的检测明细 + 五维雷达
  const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const detChans = station.channels.filter((c) => c.detections[0]);
  const repCh = detChans.slice().sort((a, b) => (b.detections[0]!.totalScore) - (a.detections[0]!.totalScore))[0] ?? null;
  // 模型覆盖:厂商家数 + 模型总数
  const famNames = [...new Set(allModels.map((id) => familyOf(id)))];

  // 综合排名:用缓存的综合分排名(算分步骤统一算,与指数卡/榜单一致)
  const rankTotal = await prisma.station.count({ where: { compositeScore: { not: null } } });
  const rank = station.rank; // 缓存综合排名,null=暂无综合分
  const pctRank = rankTotal && rank ? Math.round((1 - (rank - 1) / rankTotal) * 100) : 0;

  // 30 天可用率:各分组 30d 窗口平均在线率的均值
  const up30 = await prisma.uptimeWindow.findMany({ where: { period: "30d", channel: { stationId: station.id, delistedAt: null } }, select: { avg: true } });
  const up30vals = up30.map((w) => w.avg).filter((v) => v >= 0);
  const avail30 = up30vals.length ? up30vals.reduce((a, b) => a + b, 0) / up30vals.length : null;

  const cmpMetrics = repCh ? [
    { label: t("综合排名", locale), value: rank ? `${rank}/${rankTotal}` : "—", sub: rank ? `${t("按平均纯度,同类前", locale)} ${pctRank}%` : t("暂无排名", locale), pct: pctRank },
    { label: t("30 天可用率", locale), value: avail30 != null ? `${Math.round(avail30)}%` : "—", sub: t("近 30 天各分组平均在线率", locale), pct: avail30 ?? 0 },
    { label: t("模型覆盖", locale), value: String(allModels.length), sub: `${t("覆盖", locale)} ${famNames.length} ${t("家厂商,共", locale)} ${allModels.length} ${t("个模型", locale)}`, pct: cl(allModels.length * 2.2, 10, 100) },
  ] : [];
  const cmpMinIn = minPriceByModel.size ? Math.min(...minPriceByModel.values()) : null;
  // 雷达五维与列表/收藏共用同一函数 + 缓存评分,保证同站同数(纯度/稳定/速度=指数卡同源)。
  const cmpDims = radarDims({ purityIndex: station.purityIndex, availIndex: station.availIndex, speedIndex: station.speedIndex, priceIn: cmpMinIn, modelCount: allModels.length });
  const selModel = sp.m && allModels.includes(sp.m) ? sp.m : (headline[0]?.id ?? allModels[0] ?? "");
  const sort = ["price", "clean", "avail"].includes(sp.sort ?? "") ? (sp.sort as string) : "price";
  const chByName = new Map(station.channels.map((c) => [c.name, c]));
  const rows = groups
    .map((gx) => {
      const pm = gx.models.find((m) => m.id === selModel);
      if (!pm) return null;
      const ch = chByName.get(gx.name);
      const det = ch?.detections[0];
      const win = ch?.windows[0];
      const avail = win && win.avg >= 0 ? win.avg : null;
      return { group: gx.name, gRatio: gx.ratio, in: pm.in, out: pm.out, cache: pm.cache,
        score: det ? det.totalScore : null, actualModel: det?.actualModel ?? null, modelDowngraded: det?.modelDowngraded ?? null,
        latencyMs: ch?.currentLatencyMs ?? null, avail, points: win?.points ?? null };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  rows.sort((a, b) => {
    if (sort === "clean") return (b.score ?? -1) - (a.score ?? -1);
    if (sort === "avail") return (b.avail ?? -1) - (a.avail ?? -1);
    return (a.in ?? Infinity) - (b.in ?? Infinity); // price 升序,无价排最后
  });

  // 「按分组」视图:全部分组 × 全部模型 + 监测数据(监测组才有掺水/延迟/在线/趋势)
  const groupRows: GMGroup[] = groups.map((gx) => {
    const ch = chByName.get(gx.name);
    const det = ch?.detections[0];
    const win = ch?.windows[0];
    const prices = gx.models.map((m) => m.in).filter((v): v is number => v != null && v > 0);
    return {
      name: gx.name, ratio: gx.ratio,
      startPrice: prices.length ? Math.min(...prices) : null,
      score: det ? det.totalScore : null, actualModel: det?.actualModel ?? null, modelDowngraded: det?.modelDowngraded ?? null,
      latencyMs: ch?.currentLatencyMs ?? null, avail: win && win.avg >= 0 ? win.avg : null, points: (win?.points as { av: number }[] | undefined) ?? null,
      models: gx.models.map((m) => ({ id: m.id, in: m.in, out: m.out, cache: m.cache, ratio: m.ratio })),
    };
  });

  const svcMap: Record<string,string> = { cc: "Claude Code", cx: "Codex", gm: "Gemini" };
  const services = [...new Set(station.channels.map(c => svcMap[c.service] ?? c.service))].join(" · ") || "—";
  // 评分读缓存(算分步骤每轮写,见 docs/scoring-system.md)。null = 未测/无数据 → 显「—」。
  const composite = station.compositeScore;
  const purityIndex = station.purityIndex; // null = 纯度未测(非 claude / 无检测)
  const availIndex = station.availIndex;
  const speedIndex = station.speedIndex;

  return (
    <>
      <SiteNav active="list" />
      <div className="wrap">
        {/* crumb 面包屑 —— 全宽置顶 */}
        <div className="crumb" style={{ paddingTop: 34 }}>{t("榜单", locale)} › {station.name}</div>
        <div className="layout">
          {/* 左栏 lnav 锚点导航 —— ▢ 静态锚点 */}
          <nav className="lnav">
            {/* 站点身份卡 —— logo + 站名 */}
            <div style={{ background: "var(--bg2)", borderRadius: 16, padding: "30px 16px 26px", textAlign: "center", marginBottom: 22 }}>
              {station.logoUrl
                ? <img src={station.logoUrl} alt={station.name} style={{ width: 82, height: 82, borderRadius: "50%", objectFit: "cover", margin: "0 auto" }} />
                : <div className="lg" style={{ width: 82, height: 82, fontSize: 34, borderRadius: "50%", margin: "0 auto" }}>{station.name.slice(0, 1)}</div>}
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.01em", marginTop: 15, lineHeight: 1.3 }}>{station.name}</div>
            </div>
            {/* 锚点导航 —— scrollspy 跟随 */}
            <StationSideNav hasCompare={!!repCh} />
          </nav>

          {/* 右栏 —— 头部 + 内容 */}
          <div style={{ minWidth: 0 }}>
            {/* identity banner —— 名/服务/链接 + 综合评分 dial + 官网主按钮 */}
            <div className="det-banner" style={{ padding: "0 0 22px", marginBottom: 22, borderBottom: "1px solid var(--line)", display: "flex", gap: 20, alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  {station.logoUrl
                    ? <img className="det-mlogo" src={station.logoUrl} alt="" />
                    : <span className="det-mlogo lg">{station.name.slice(0, 1)}</span>}
                  <span className="det-name" style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.02em" }}>{station.name}</span>
                </div>
                <SocialChips homepage={station.homepage} docsUrl={station.docsUrl} socials={station.socials as unknown as Social[] | undefined} />
                <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 11, lineHeight: 1.6, maxWidth: 720 }}>{pick(station, "description", locale) ?? `${t("AI API 中转站", locale)} · ${services}`}</div>
              </div>
              <div className="det-bside" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", flexShrink: 0 }}>
                <div className="det-gaugerow" style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11.5, color: "var(--ink3)" }}>{t("综合评分", locale)}<InfoTip align="right" desc={t("站点总评:可用和速度加权,再按纯度打折——纯度越低、分越低。", locale)} formula={t("综合 = (可用 × 0.6 + 速度 × 0.4) × 纯度系数", locale)} /></div>
                    <ScoreGauge value={composite} />
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink2)", marginTop: -4 }}>{composite != null ? t(scoreLabel(composite), locale) : "—"}</div>
                  </div>
                  <div className="det-acts" style={{ display: "flex", gap: 8 }}>
                    <FeedbackButton stationId={station.id} />
                    <FavoriteButton stationId={station.id} initialFavorited={isFav} loggedIn={!!me} />
                    <ShareButton name={station.name} />
                  </div>
                </div>
                <a className="btn-accent det-go" href={goUrl ?? "#"} target={goUrl ? "_blank" : undefined} rel="noopener" style={{ padding: "9px 24px", fontSize: 14, marginTop: 2 }}>{t("前往官网", locale)} ↗</a>
              </div>
            </div>

          {/* 中栏 main */}
          <main>
            {/* 测评表现 metrics —— ✓ 真 */}
            <div className="sec-h" id="perf">{t("测评表现", locale)}</div>
            <div className="idxgrid" style={{ marginBottom: 16 }}>
              <IndexCard label={t("纯度指数", locale)} value={purityIndex} rank={rank} tip={{ desc: t("站点 Claude 走不走官方后端,即纯度检测分,越高越纯正。", locale), formula: t("纯度 = 平均( 最纯 3 组各自的近 3 天检测中位数 )", locale) }} leftLabel={t("0 来源存疑", locale)} midLabel={t("50 混合渠道", locale)} rightLabel={t("100 官方渠道", locale)} />
              <IndexCard label={t("可用指数", locale)} value={availIndex} rank={rank} tip={{ desc: t("站点最佳几个分组近 2 天的平均在线率,反映稳不稳。", locale), formula: t("可用 = 平均( 最佳 3 组各自的近 2 天在线率 )", locale) }} leftLabel="0%" midLabel={t("在线率", locale)} rightLabel="100%" />
              <IndexCard label={t("速度指数", locale)} value={speedIndex} rank={rank} tip={{ desc: t("由响应延迟换算,越快分越高。", locale), formula: t("速度分 = (8秒 − 延迟) ÷ 6.5秒 × 100,限 0–100", locale) }} leftLabel="0 ≥8s" midLabel={t("延迟", locale)} rightLabel="100 ≤1.5s" />
            </div>

            {/* 基本信息 KV —— 人工维护(admin 可选录入,只显示已填项) */}
            <div className="sec-h" id="info">{t("基本信息", locale)}</div>
            <StationBasicInfo name={station.name} info={info} />

            {/* 模型与价格 · 可用性 —— 选模型横向比各分组(价站方标称 · 掺水/可用性平台实测) */}
            <div className="sec-h" id="models"><span>{t("模型与价格", locale)}</span><TestHistoryModal tests={tests} baseUrl={station.baseUrl} /></div>
            <div className="det-segrow" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div className="seg">
                <Link scroll={false} href={`?view=model&m=${selModel}&sort=${sort}&w=${period}`} className={view === "model" ? "on" : ""}>{t("按模型", locale)}</Link>
                <Link scroll={false} href={`?view=group&w=${period}`} className={view === "group" ? "on" : ""}>{t("按分组", locale)}</Link>
              </div>
              <div className="seg" style={{ marginLeft: "auto" }}>{[["90m", "90分钟"], ["24h", "24小时"], ["7d", "7天"], ["30d", "30天"]].map(([k, label]) => (<Link key={k} scroll={false} href={`?m=${selModel}&sort=${sort}&w=${k}&view=${view}`} className={period === k ? "on" : ""}><span className="seg-lg">{t(label, locale)}</span><span className="seg-sm">{k}</span></Link>))}</div>
            </div>
            {view === "group" ? <GroupModelTable groups={groupRows} period={period} /> : (
            <>
            <div className="det-modelrow" style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 2px 12px", flexWrap: "nowrap", overflowX: "auto" }}>
              <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t("选模型", locale)}</span>
              {headline.map((h) => <Link key={h.id} scroll={false} href={`?m=${h.id}&sort=${sort}&w=${period}`} className={selModel === h.id ? "pill on" : "pill"}>{h.label}{h.new && <span className="pnew">NEW</span>}</Link>)}
              <MoreModels models={modelList} selected={selModel} active={!headline.some((h) => h.id === selModel)} />
            </div>
            <div className="card flat-x" style={{ marginBottom: 16 }}>
              <table className="tbl-strong">
                <thead><tr>
                  <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>{t("分组", locale)}</td>
                  <td style={{ textAlign: "right" }}>{t("倍率", locale)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}><Link scroll={false} href={`?m=${selModel}&sort=price&w=${period}`} style={{ color: sort === "price" ? "var(--accent-d)" : "inherit" }}>{t("输入/输出", locale)} <SortArrow active={sort === "price"} /></Link></td>
                  <td style={{ textAlign: "right" }}><Link scroll={false} href={`?m=${selModel}&sort=clean&w=${period}`} style={{ color: sort === "clean" ? "var(--accent-d)" : "inherit" }}>{t("纯度", locale)} <SortArrow active={sort === "clean"} /></Link></td>
                  <td style={{ textAlign: "right" }}>{t("延迟", locale)}</td>
                  <td style={{ textAlign: "right" }}><Link scroll={false} href={`?m=${selModel}&sort=avail&w=${period}`} style={{ color: sort === "avail" ? "var(--accent-d)" : "inherit" }}>{t("在线率", locale)} <SortArrow active={sort === "avail"} /></Link></td>
                  <td style={{ textAlign: "right" }}>{t("趋势", locale)}</td>
                </tr></thead>
                <tbody>
                  {rows.length ? rows.map((r) => (
                    <tr key={r.group}>
                      <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>{r.group}</td>
                      <td style={{ textAlign: "right" }}>{r.gRatio}x</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{r.in != null && r.out != null ? <>¥{r.in} / ¥{r.out}{r.cache != null && <div style={{ fontSize: 11.5, fontWeight: 400, color: "var(--ink3)", marginTop: 2 }}>{t("缓存", locale)} ¥{r.cache}</div>}</> : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
                      <td style={{ textAlign: "right" }}>{r.score != null ? <TierTag score={r.score} /> : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
                      <td style={{ textAlign: "right" }}>{r.latencyMs != null ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{r.avail != null ? `${r.avail.toFixed(0)}%` : "—"}</td>
                      <td style={{ textAlign: "right" }}><div style={{ display: "inline-block", width: 150 }}><UptimeHeatmap points={r.points} period={period} height={20} /></div></td>
                    </tr>
                  )) : <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: "18px 0" }}>{t("该模型暂无分组", locale)}</td></tr>}
                </tbody>
              </table>
            </div>
            </>
            )}

            {repCh && (<>
              <div className="sec-h" id="compare">{t("综合对比", locale)}</div>
              <CompareBlock dims={cmpDims} metrics={cmpMetrics} />
            </>)}

            {/* 动态 timeline —— ▢ 空态。bare 卡无边框,pad 的 20px 侧边距只会让表格与栏目左右错位,故不用 pad */}
            <div className="sec-h" id="timeline">{t("动态", locale)}</div>
            <div className="card bare" style={{ marginBottom: 16, paddingTop: 6 }}>
              <StationTimeline events={timeline} page={ep} totalPages={eventPages} hrefForPage={evHref} />
            </div>

            {/* 站点公告 + 接口链接 —— 两栏并排(分割线改版) */}
            <div className="det-anncols" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
              <div id="announce"><AnnouncementList announcements={announcements} /></div>
              <div>
                <div className="anh" id="lines"><h3>{t("接口链接", locale)}</h3></div>
                <div className="lkbox">
                  {(routes.length ? routes : [{ name: t("主线路", locale), url: station.baseUrl }] as Route[]).map((rt, i) => (
                    <div className="lkrow" key={i}>
                      <div className="lk-n">{rt.name || `${t("线路", locale)} ${i + 1}`}</div>
                      {rt.desc && <div className="lk-d">{rt.desc}</div>}
                      <div className="lk-r"><span className="lk-u">{rt.url}</span><span style={{ flexShrink: 0 }}><RouteActions url={rt.url} /></span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 评论(用户评价)—— 主观、人工 */}
            <div className="sec-h" id="reviews">{t("评论", locale)} {ratingCount > 0 && <span className="s">{ratingCount} {t("条", locale)}</span>}</div>

            {/* 总览三列:评分(含留下评论按钮)| 分布 | 标签 —— 分割线、无竖线 */}
            <div className="rvtop">
              <div className="rv-score">
                <div className="rv-big">{ratingAvg != null ? ratingAvg.toFixed(1) : "—"}</div>
                <div className="rv-stars" style={{ fontSize: 15, margin: "6px 0" }}>{"★".repeat(Math.round(ratingAvg ?? 0))}<span className="off">{"★".repeat(5 - Math.round(ratingAvg ?? 0))}</span></div>
                <div className="rv-cnt">{ratingCount} {t("条评论", locale)}</div>
                <ReviewForm stationId={station.id} slug={station.slug} loggedIn={!!me} />
              </div>
              <div className="rv-distcol">
                {ratingDist.map((d) => (
                  <div className="rv-dist" key={d.star}>
                    <span style={{ width: 24 }}>{d.star}★</span>
                    <span className="rv-bar"><i style={{ width: `${ratingCount ? (d.n / ratingCount) * 100 : 0}%` }} /></span>
                    <span style={{ width: 18, textAlign: "right", color: "var(--ink3)" }}>{d.n}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="rv-tgl">{t("用户标签", locale)}</div>
                {tagCloud.length
                  ? <div className="rv-tags">{tagCloud.map(([tag, n]) => <span className="rv-tag" key={tag}>{t(tag, locale)}<i>{n}</i></span>)}</div>
                  : <div style={{ fontSize: 13, color: "var(--ink3)" }}>{t("还没有标签", locale)}</div>}
              </div>
            </div>

            {/* 评论列表 */}
            {reviewData.length > 0
              ? <div className="rvlist"><ReviewList reviews={reviewData} loggedIn={!!me} /></div>
              : (
                <div className="rvempty">
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>
                  <div className="t">{t("抢先发表评论", locale)}</div>
                </div>
              )}
          </main>
          </div>
        </div>
      </div>
    </>
  );
}
