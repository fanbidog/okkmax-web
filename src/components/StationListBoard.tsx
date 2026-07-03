"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { pageList, PAGE_SIZE } from "@/lib/pagination";
import { Dropdown } from "./Dropdown";
import { Radar } from "./Radar";
import { ServiceLogo } from "./ServiceIcon";
import { VENDOR_LABEL } from "@/lib/brandIcons";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

export interface StationRow {
  id: string;
  isFav: boolean;
  slug: string;
  name: string;
  host: string | null;
  logoUrl: string | null;
  score: number | null;
  families: string[];
  modelCount: number;
  startIn: number | null;
  startOut: number | null;
  minRatio: number | null;
  uptime: number | null;
  latency: number | null;
  trend: number[];
  intro: string | null;
  tags: string[];
  recommend: boolean;
  radar: Record<string, number>;
  services: string[];
}

const PRICES: [string, string][] = [["all", "全部"], ["lt05", "≤0.5x"], ["lte1", "≤1x"], ["gt1", ">1x"]];
const UPS: [string, string][] = [["all", "全部"], ["gte99", "≥99%"], ["gte95", "≥95%"], ["lt95", "<95%"]];
const SORTS: [string, string][] = [["score", "综合分"], ["price", "倍率"], ["uptime", "在线率"]];

// 分类徽章:用 class(浅色保留原色,暗色由 list.css 的 [data-theme=dark] 覆盖)
const TAG_CLS: Record<string, string> = { 模型丰富: "rich", 生态完善: "eco", 文档完善: "doc" };
// 综合分=掺水实测分(0-100):档名对齐掺水档(≥85 官方纯血 / 60-85 混合渠道 / <30 来源存疑)
function scoreLabel(s: number) { return s >= 85 ? "优秀" : s >= 60 ? "良好" : s >= 30 ? "一般" : "偏低"; }

function Stars({ score }: { score: number }) {
  const f = Math.max(0, Math.min(5, Math.round(score / 20)));
  return <span style={{ fontSize: 13, letterSpacing: 1.5 }}><span style={{ color: "#ffb400" }}>{"★".repeat(f)}</span><span style={{ color: "var(--line2)" }}>{"★".repeat(5 - f)}</span></span>;
}

function Sparkline({ data, uptime }: { data: number[]; uptime: number | null }) {
  const w = 84, h = 26;
  const pts = data.map((v, i) => ({ v, i })).filter((p) => p.v >= 0);
  if (pts.length < 2) return <div style={{ height: h, color: "var(--ink3)", fontSize: 11 }}>—</div>;
  const vals = pts.map((p) => p.v); const min = Math.min(...vals), max = Math.max(...vals); const rng = max - min || 1;
  const d = pts.map((p, k) => `${k ? "L" : "M"}${((k / (pts.length - 1)) * w).toFixed(1)} ${(h - ((p.v - min) / rng) * (h - 4) - 2).toFixed(1)}`).join(" ");
  const col = uptime == null ? "var(--ink3)" : uptime >= 95 ? "#16a34a" : uptime >= 80 ? "#eab308" : "#e0512b";
  return <svg width={w} height={h}><path d={d} fill="none" stroke={col} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function ModelStack({ families }: { families: string[] }) {
  if (!families.length) return <span style={{ color: "var(--ink3)" }}>—</span>;
  const shown = families.slice(0, 4); // 最多 4 个 logo,其余进 +N
  const hidden = families.length - shown.length;
  return (
    <span style={{ display: "flex", alignItems: "center", paddingLeft: 8 }}>
      {shown.map((f) => (
        <span key={f} className="svc-ic" title={VENDOR_LABEL[f] ?? f} style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--surface)", background: "var(--surface)", boxShadow: "0 0 0 1px var(--line2)", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -8, flexShrink: 0, overflow: "hidden" }}>
          <ServiceLogo service={f} size={15} />
        </span>
      ))}
      {hidden > 0 && <span style={{ marginLeft: 6, fontSize: 12.5, fontWeight: 600, color: "var(--accent-d)", background: "var(--accent-50)", padding: "3px 8px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap" }}>+{hidden}</span>}
    </span>
  );
}

const RIBBON: Record<number, string> = { 0: "#d4a017", 1: "#9aa0a6", 2: "#c08457" };

function RowFav({ id, isFav, loggedIn }: { id: string; isFav: boolean; loggedIn: boolean }) {
  const t = useT();
  const [fav, setFav] = useState(isFav);
  const [busy, setBusy] = useState(false);
  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!loggedIn) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    if (busy) return; setBusy(true);
    try {
      const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: id }) });
      const d = await res.json();
      if (res.ok) { setFav(d.favorited); toast(d.favorited ? t("已收藏") : t("已取消收藏")); }
      else toast(t("操作失败,请重试"), "err");
    } catch { toast(t("操作失败,请重试"), "err"); }
    setBusy(false);
  }
  return (
    <button onClick={toggle} title={fav ? t("已收藏") : t("收藏")} aria-label={t("收藏")} style={{ position: "absolute", top: 13, right: 16, background: "none", border: "none", cursor: "pointer", padding: 4, color: fav ? "#f0a020" : "var(--line2)", lineHeight: 0, zIndex: 2 }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z" /></svg>
    </button>
  );
}

export function StationListBoard({ rows, showFilters = true, loggedIn = false }: { rows: StationRow[]; showFilters?: boolean; loggedIn?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [price, setPrice] = useState("all");
  const [up, setUp] = useState("all");
  const [sortKey, setSortKey] = useState("score");
  const [filterOpen, setFilterOpen] = useState(false);  // 移动端筛选弹层
  const activeCount = (svc !== "all" ? 1 : 0) + (price !== "all" ? 1 : 0) + (up !== "all" ? 1 : 0);
  const resetFilters = () => { setSvc("all"); setPrice("all"); setUp("all"); setSortKey("score"); };

  // 模型类型筛选项:从实际出现的厂商动态生成(细到 DeepSeek/Qwen 等)
  const SVCS = useMemo<[string, string][]>(() => {
    const seen: string[] = [];
    for (const r of rows) for (const f of r.families) if (!seen.includes(f)) seen.push(f);
    return [["all", t("全部")], ...seen.map((f) => [f, t(VENDOR_LABEL[f] ?? f)] as [string, string])];
  }, [rows, t]);
  const TR = ([v, l]: [string, string]): [string, string] => [v, t(l)];
  const PRICES_T = PRICES.map(TR);
  const UPS_T = UPS.map(TR);
  const SORTS_T = SORTS.map(TR);

  const view = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = rows;
    if (svc !== "all") list = list.filter((r) => r.families.includes(svc));
    if (price !== "all") list = list.filter((r) => r.minRatio != null && (price === "lt05" ? r.minRatio <= 0.5 : price === "lte1" ? r.minRatio <= 1 : r.minRatio > 1));
    if (up !== "all") list = list.filter((r) => r.uptime != null && (up === "gte99" ? r.uptime >= 99 : up === "gte95" ? r.uptime >= 95 : r.uptime < 95));
    if (qq) list = list.filter((r) => r.name.toLowerCase().includes(qq) || (r.intro ?? "").toLowerCase().includes(qq));
    return [...list].sort((a, b) =>
      sortKey === "price" ? (a.minRatio ?? Infinity) - (b.minRatio ?? Infinity)
        : sortKey === "uptime" ? (b.uptime ?? -1) - (a.uptime ?? -1)
          : (b.score ?? -1) - (a.score ?? -1));
  }, [rows, q, svc, price, up, sortKey]);

  // 分页:每页 20,筛选/排序变了回到第 1 页(在筛选后的全集上分页)
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const goPage = (n: number) => { setPage(n); requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  useEffect(() => { setPage(1); }, [q, svc, price, up, sortKey]);
  const totalPages = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * PAGE_SIZE;
  const pageRows = view.slice(start, start + PAGE_SIZE);

  const M = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontSize: 12.5, color: "var(--ink2)", fontWeight: 500, marginBottom: 18 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <>
      <div ref={topRef} style={{ scrollMarginTop: 76 }} aria-hidden />
      {showFilters && <div className="slb-mfilter">
        <div className="slb-msearch">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜索站点 / 简介")} />
        </div>
        <button className="slb-fbtn" onClick={() => setFilterOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
          {t("筛选")}{activeCount > 0 && <span className="cnt">{activeCount}</span>}
        </button>
      </div>}

      {showFilters && <div className="card pad slb-pcfilter" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="slb-search" style={{ position: "relative", width: 230 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: 11, top: 11, color: "var(--ink3)" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜索站点 / 简介")} style={{ width: "100%", height: 36, border: "1px solid var(--line2)", borderRadius: 10, background: "var(--bg2)", padding: "0 12px 0 34px", fontSize: 13, fontFamily: "inherit", color: "var(--ink)" }} />
        </div>
        <div className="slb-controls" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Dropdown label={t("模型类型")} value={svc} options={SVCS} onPick={setSvc} />
          <Dropdown label={t("倍率区间")} value={price} options={PRICES_T} onPick={setPrice} />
          <Dropdown label={t("在线率")} value={up} options={UPS_T} onPick={setUp} />
          <Dropdown label={t("排序")} value={sortKey} options={SORTS_T} onPick={setSortKey} />
          <button onClick={() => router.refresh()} aria-label={t("刷新")} style={{ height: 36, width: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line2)", borderRadius: 10, background: "var(--surface)", color: "var(--ink2)", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
          </button>
        </div>
      </div>}

      {view.length ? <>
      <div className="slb-cards">
      {pageRows.map((r, i) => (
        <div
          key={r.slug}
          onClick={() => router.push(`/station/${r.slug}`)}
          className="card hover"
          style={{ padding: "18px 22px 16px", marginBottom: 14, position: "relative", cursor: "pointer" }}
        >
          <div style={{ position: "absolute", top: 0, left: 22, width: 22, padding: "3px 0 5px", textAlign: "center", color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: "0 0 5px 5px", background: RIBBON[start + i] ?? "var(--ink3)" }}>{start + i + 1}</div>
          <RowFav id={r.id} isFav={r.isFav} loggedIn={loggedIn} />

          <div className="slb-row">
            {/* 身份:logo 单列,名/域名/简介/标签 同列对齐 */}
            <div className="slb-info" style={{ paddingLeft: 28, display: "flex", gap: 12 }}>
              {r.logoUrl
                ? <img src={r.logoUrl} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : <span className="lg" style={{ width: 46, height: 46, fontSize: 18, borderRadius: "50%" }}>{r.name.slice(0, 1)}</span>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                {r.host && <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.host}</div>}
                {r.intro && <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 9, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.intro}</div>}
                {r.tags.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>{r.tags.map((tag) => { const k = TAG_CLS[tag]; return <span key={tag} className={"slb-tag" + (k ? " t-" + k : "")}>{t(tag)}</span>; })}</div>}
              </div>
            </div>

            {/* 四指标:文字在上,图标沉底对齐 */}
            <div className="slb-metrics" style={{ alignItems: "stretch" }}>
              <M label={t("综合分")}>
                <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1 }}>{r.score != null ? r.score.toFixed(0) : "—"}</div>
                {r.score != null ? <><div style={{ marginTop: 6 }}><Stars score={r.score} /></div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink2)", marginTop: 5 }}>{t(scoreLabel(r.score))}</div></> : <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 6 }}>{t("未检测")}</div>}
              </M>
              <M label={t("倍率")}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{r.minRatio != null ? `${t("低至")} ${r.minRatio}x` : "—"}</div>
                <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 13, color: "var(--ink3)" }}>{r.minRatio != null ? t("较官方价") : ""}</div>
              </M>
              <M label={t("在线率")}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{r.uptime != null ? `${r.uptime.toFixed(0)}%` : "—"}</div>
                <div style={{ marginTop: "auto", paddingTop: 10 }}><Sparkline data={r.trend} uptime={r.uptime} /></div>
              </M>
              <M label={t("支持模型")}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{r.modelCount} {t("个")}</div>
                <div style={{ marginTop: "auto", paddingTop: 10 }}><ModelStack families={r.families} /></div>
              </M>
            </div>

            {/* 雷达 */}
            <div className="slb-radar" style={{ flexShrink: 0 }}><Radar dims={r.radar} size={160} /></div>
          </div>
        </div>
      ))}
      </div>

      {/* 移动端:表格(站点/综合分/在线率/延迟/支持模型),PC 隐藏 */}
      <div className="slb-mtable card flat-x" style={{ marginBottom: 16 }}>
        <table className="slb-mt">
          <thead><tr>
            <td>{t("站点")}</td>
            <td style={{ textAlign: "right" }}>{t("综合分")}</td>
            <td style={{ textAlign: "right" }}>{t("在线率")}</td>
            <td style={{ textAlign: "right" }}>{t("延迟")}</td>
            <td style={{ textAlign: "right" }}>{t("支持模型")}</td>
          </tr></thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.slug} onClick={() => router.push(`/station/${r.slug}`)} style={{ cursor: "pointer" }}>
                <td>
                  <div className="slb-mt-st">
                    {r.logoUrl
                      ? <img src={r.logoUrl} alt="" className="slb-mt-logo" />
                      : <span className="slb-mt-logo lg">{r.name.slice(0, 1)}</span>}
                    <span className="slb-mt-nm">{r.name}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>{r.score != null ? <span className="score">{r.score.toFixed(0)}</span> : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
                <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ink)" }}>{r.uptime != null ? `${r.uptime.toFixed(0)}%` : "—"}</td>
                <td style={{ textAlign: "right", color: "var(--ink3)" }}>{r.latency != null ? `${(r.latency / 1000).toFixed(1)}s` : "—"}</td>
                <td style={{ textAlign: "right" }}><span style={{ display: "inline-flex", justifyContent: "flex-end", width: "100%" }}><ModelStack families={r.families} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </> : <div className="card pad" style={{ padding: "50px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>{t("没有符合条件的站")}</div>}

      {totalPages > 1 && (
        <nav className="board-pager" aria-label={t("分页")}>
          {pageList(cur, totalPages).map((n, k) => n === "…"
            ? <span key={`e${k}`} className="bp-e">…</span>
            : <button key={n} type="button" className={"bp" + (n === cur ? " on" : "")} aria-current={n === cur ? "page" : undefined} onClick={() => goPage(n as number)}>{n}</button>)}
        </nav>
      )}

      {/* 移动端筛选弹层 */}
      {filterOpen && <>
        <div className="slb-ov" onClick={() => setFilterOpen(false)} />
        <div className="slb-sheet">
          <div className="slb-grip" />
          <div className="slb-sheet-h"><span className="t">{t("筛选")}</span><span className="rst" onClick={resetFilters}>{t("重置")}</span></div>
          {([[t("排序"), SORTS_T, sortKey, setSortKey], [t("模型类型"), SVCS, svc, setSvc], [t("倍率区间"), PRICES_T, price, setPrice], [t("在线率"), UPS_T, up, setUp]] as [string, [string, string][], string, (v: string) => void][]).map(([label, opts, val, set]) => (
            <div className="slb-grp" key={label}>
              <div className="slb-grp-l">{label}</div>
              <div className="slb-chips">
                {opts.map(([v, l]) => <button key={v} type="button" className={"slb-ch" + (val === v ? " on" : "")} onClick={() => set(v)}>{l}</button>)}
              </div>
            </div>
          ))}
          <button type="button" className="slb-apply" onClick={() => setFilterOpen(false)}>{t("查看")} {view.length} {t("个结果")}</button>
        </div>
      </>}
    </>
  );
}
