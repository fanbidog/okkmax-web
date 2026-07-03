import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { splitLegacyTags } from "@/lib/reviewTags";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import { pick } from "@/lib/i18n/pick";
import { pageList } from "@/lib/pagination";
import { getCurrentUser } from "@/lib/auth";
import { ReputationFilter } from "@/components/ReputationFilter";

export const dynamic = "force-dynamic";
const PER = 12;

function displayUrl(u: string) {
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function Thumb({ down }: { down?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0, transform: down ? "rotate(180deg)" : undefined }}>
      <path d="M2 21h2.5V10H2v11zM23 12a2 2 0 0 0-2-2h-6.31l.95-4.57.03-.32a1.5 1.5 0 0 0-.44-1.06L14.17 3 7.6 9.59A2 2 0 0 0 7 11v8a2 2 0 0 0 2 2h9a2 2 0 0 0 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" />
    </svg>
  );
}

function TagPill({ t, n, neg }: { t: string; n: number; neg?: boolean }) {
  const c = neg
    ? { bg: "var(--red-50)", bd: "var(--line2)", fg: "var(--red)" }
    : { bg: "var(--ok-50)", bd: "var(--line2)", fg: "var(--ok)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, background: c.bg, border: `1px solid ${c.bd}`, color: c.fg, fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 999 }}>
      <Thumb down={neg} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
      <span style={{ fontWeight: 400, opacity: 0.7, flexShrink: 0 }}>({n})</span>
    </span>
  );
}

export const metadata = {
  title: "中转站口碑与真实用户评价",
  description: "真实用户对各 AI 中转站的评分、评价与使用反馈,帮你了解每个中转站好不好用。",
  alternates: { canonical: "/reputation" },
};

export default async function ReputationPage({ searchParams }: { searchParams: Promise<{ p?: string; q?: string; score?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  const me = await getCurrentUser();
  const [stations, allStations] = await Promise.all([
    prisma.station.findMany({
      where: { reviews: { some: {} } },
      select: {
        slug: true, name: true, logoUrl: true, description: true, description_en: true, homepage: true, baseUrl: true,
        reviews: { select: { rating: true, tags: true, prosTags: true, consTags: true } },
      },
    }),
    // 写评价的选站列表:所有未下架的站(可给尚无评价的站写第一条)
    prisma.station.findMany({ where: { retiredAt: null }, select: { id: true, slug: true, name: true, logoUrl: true }, orderBy: { name: "asc" } }),
  ]);

  const cards = stations.map((s) => {
    const count = s.reviews.length;
    const avg = count ? s.reviews.reduce((a, r) => a + r.rating, 0) / count : 0;
    const pos = new Map<string, number>();
    const neg = new Map<string, number>();
    for (const r of s.reviews) {
      const { pros, cons } = (r.prosTags.length || r.consTags.length) ? { pros: r.prosTags, cons: r.consTags } : splitLegacyTags(r.tags);
      for (const t of pros) pos.set(t, (pos.get(t) || 0) + 1);
      for (const t of cons) neg.set(t, (neg.get(t) || 0) + 1);
    }
    const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const url = s.homepage || s.baseUrl;
    return { slug: s.slug, name: s.name, logoUrl: s.logoUrl, description: pick(s, "description", locale), url, count, avg, pros: top(pos), cons: top(neg) };
  }).sort((a, b) => b.avg - a.avg || b.count - a.count);

  // 筛选:按名字搜索 + 评分区间(多少分-多少分)
  const q = (sp.q ?? "").trim().toLowerCase();
  const score = sp.score ?? "all";
  const inScore = (avg: number) =>
    score === "all" || (score === "4.5" && avg >= 4.5) || (score === "4" && avg >= 4 && avg < 4.5)
    || (score === "3" && avg >= 3 && avg < 4) || (score === "low" && avg < 3);
  const filtered = cards.filter((c) => (!q || c.name.toLowerCase().includes(q)) && inScore(c.avg));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const page = Math.min(Math.max(1, Number(sp.p) || 1), totalPages);
  const pageCards = filtered.slice((page - 1) * PER, page * PER);
  const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(score !== "all" ? { score } : {}) }).toString(); // 分页保留筛选

  return (
    <>
      <SiteNav active="reputation" />
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div style={{ padding: "34px 0 18px" }}>
          <h1 style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em" }}>{t("口碑", locale)}</h1>
          <div style={{ fontSize: 13.5, color: "var(--ink2)", marginTop: 5 }}>
            {t("真实用户对各中转站的评价与打分。机器测客观数据,口碑是主观体验,互为补充。", locale)}
          </div>
        </div>

        <ReputationFilter stations={allStations} loggedIn={!!me} />

        {filtered.length ? (
          <>
            <div className="rep-list" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pageCards.map((c) => (
                <div key={c.slug} className="rep-item">
                <div className="card rep-card rep-pc" style={{ padding: "26px 30px", display: "flex", justifyContent: "space-between", gap: 28, alignItems: "stretch" }}>
                  <div className="rep-id" style={{ display: "flex", gap: 15 }}>
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt="" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)", flexShrink: 0 }} />
                      : <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--bg2)", border: "1px solid var(--line2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 20, color: "var(--ink2)", flexShrink: 0 }}>{c.name.slice(0, 1)}</div>}
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/station/${c.slug}`} style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.01em" }}>{c.name}</Link>
                      {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 3 }}>{displayUrl(c.url)}</a>}
                      {c.description && <>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)", marginTop: 13, marginBottom: 5 }}>{t("产品描述", locale)}</div>
                        <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</div>
                      </>}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 13 }}>{t("优点", locale)}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "flex-start" }}>
                      {c.pros.length ? c.pros.map(([tag, n]) => <TagPill key={tag} t={t(tag, locale)} n={n} />)
                        : <span style={{ fontSize: 13, color: "var(--ink3)" }}>{t("暂无", locale)}</span>}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 13 }}>{t("缺点", locale)}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "flex-start" }}>
                      {c.cons.length ? c.cons.map(([tag, n]) => <TagPill key={tag} t={t(tag, locale)} n={n} neg />)
                        : <span style={{ fontSize: 13, color: "var(--ink3)" }}>{t("暂无", locale)}</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 13 }}>{t("星级分", locale)}</div>
                    <div style={{ color: "#f0a020", fontSize: 21, letterSpacing: 2, lineHeight: 1 }}>{"★".repeat(Math.round(c.avg))}<span style={{ color: "var(--line2)" }}>{"★".repeat(5 - Math.round(c.avg))}</span></div>
                    <div style={{ marginTop: 7, color: "var(--ink)" }}><b style={{ fontWeight: 600, fontSize: 16 }}>{c.avg.toFixed(1)}</b> <span style={{ fontSize: 13, color: "var(--ink2)" }}>/ 5</span> <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>({c.count})</span></div>
                    <Link href={`/station/${c.slug}#reviews`} style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: "var(--accent-d)", border: "1px solid var(--line2)", borderRadius: 999, padding: "9px 18px", whiteSpace: "nowrap" }}>{t("了解更多", locale)} <span style={{ fontSize: 12 }}>↗</span></Link>
                  </div>
                </div>

                {/* 移动端:卡头放评分 + 优缺点 inline + 无框分割线(PC 块在 ≤768 隐藏) */}
                <div className="rep-m">
                  <div className="rep-m-head">
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt="" className="rep-m-logo" />
                      : <div className="rep-m-logo">{c.name.slice(0, 1)}</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/station/${c.slug}`} className="rep-m-nm">{c.name}</Link>
                      {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="rep-m-url">{displayUrl(c.url)}</a>}
                    </div>
                    <div className="rep-m-rate">
                      <div className="rep-m-stars">{"★".repeat(Math.round(c.avg))}<span className="off">{"★".repeat(5 - Math.round(c.avg))}</span></div>
                      <div className="rep-m-score"><b>{c.avg.toFixed(1)}</b> / 5 ({c.count})</div>
                    </div>
                  </div>
                  {c.description && <div className="rep-m-desc">{c.description}</div>}
                  <div className="rep-m-grp">
                    <span className="rep-m-l">{t("优点", locale)}</span>
                    <div className="rep-m-pills">{c.pros.length ? c.pros.map(([tag, n]) => <TagPill key={tag} t={t(tag, locale)} n={n} />) : <span className="rep-m-none">{t("暂无", locale)}</span>}</div>
                  </div>
                  <div className="rep-m-grp">
                    <span className="rep-m-l">{t("缺点", locale)}</span>
                    <div className="rep-m-pills">{c.cons.length ? c.cons.map(([tag, n]) => <TagPill key={tag} t={t(tag, locale)} n={n} neg />) : <span className="rep-m-none">{t("暂无", locale)}</span>}</div>
                  </div>
                  <div className="rep-m-foot"><Link href={`/station/${c.slug}#reviews`} className="rep-m-more">{t("了解更多", locale)} ↗</Link></div>
                </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="board-pager" aria-label={t("分页", locale)} style={{ marginTop: 22 }}>
                {pageList(page, totalPages).map((n, i) => n === "…"
                  ? <span key={`e${i}`} className="bp-e">…</span>
                  : <Link key={n} href={`/reputation?${qs ? qs + "&" : ""}p=${n}`} className={"bp" + (n === page ? " on" : "")} aria-current={n === page ? "page" : undefined}>{n}</Link>)}
              </nav>
            )}
          </>
        ) : (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>{t("还没有评价。去任意站点详情页写下第一条吧。", locale)}</div>
        )}
      </div>
    </>
  );
}
