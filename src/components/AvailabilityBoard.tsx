"use client";
import { useMemo, useState, useEffect } from "react";
import { StationAvailCard, type AvailCard } from "./StationAvailCard";
import { Dropdown } from "./Dropdown";
import { stationStatus } from "@/lib/uptimeColor";
import { pageList, PAGE_SIZE } from "@/lib/pagination";
import { useT } from "@/components/LocaleProvider";

import { useRouter } from "next/navigation";

const SVCS: [string, string][] = [["all", "全部"], ["cc", "Claude"], ["cx", "GPT"], ["gm", "Gemini"]];
const STATES: [string, string][] = [["all", "全部"], ["正常", "正常"], ["部分异常", "部分异常"], ["异常", "异常"]];
const PERIODS: [string, string][] = [["90m", "90m"], ["24h", "24h"], ["7d", "7d"], ["30d", "30d"]];

export function AvailabilityBoard({ cards, period }: { cards: AvailCard[]; period: string }) {
  const t = useT();
  const router = useRouter();
  const TR = ([v, l]: [string, string]): [string, string] => [v, t(l)];
  const SVCS_T = SVCS.map(TR);
  const STATES_T = STATES.map(TR);
  const SORT_OPTS: [string, string][] = [["uptime", t("可用率")], ["latency", t("延迟")]];
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [st, setSt] = useState("all");
  const [sortKey, setSortKey] = useState<"uptime" | "latency">("uptime");
  const [filterOpen, setFilterOpen] = useState(false);
  const activeCount = (svc !== "all" ? 1 : 0) + (st !== "all" ? 1 : 0);
  const goPeriod = (p: string) => router.push(p === "24h" ? "/availability" : `/availability?p=${p}`);
  // 默认全收起(移动端要求);PC 挂载后自动展开前 2 张(见下方 effect)。
  // 初始空 → SSR/移动端都是收起态,无 hydration 错位、移动端不闪。
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(() => new Set());
  // 显示「全部分组」的卡(默认空 → 只显前 3 个分组);展开全部时连分组一起全显
  const [showAllSlugs, setShowAllSlugs] = useState<Set<string>>(() => new Set());
  // 仅 PC(>768)挂载后默认展开可用率前 2 张;移动端保持全收起
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      setOpenSlugs(new Set([...cards].sort((a, b) => (b.avgUptimeNum ?? -1) - (a.avgUptimeNum ?? -1)).slice(0, 2).map((c) => c.slug)));
    }
  }, [cards]);

  const view = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = cards
      .map((c) => {
        const channels = svc === "all" ? c.channels : c.channels.filter((ch) => ch.service === svc);
        if (!channels.length) return null;
        const s = svc === "all" ? { text: c.statusText, color: c.statusColor } : stationStatus(channels);
        return { ...c, channels, statusText: s.text, statusColor: s.color };
      })
      .filter((c): c is AvailCard => c !== null);
    if (qq) list = list.filter((c) => c.name.toLowerCase().includes(qq) || c.channels.some((ch) => ch.group.toLowerCase().includes(qq) || ch.model.toLowerCase().includes(qq)));
    if (st !== "all") list = list.filter((c) => c.statusText === st);
    return [...list].sort((a, b) =>
      sortKey === "uptime"
        ? (b.avgUptimeNum ?? -1) - (a.avgUptimeNum ?? -1)
        : (a.avgLatencyNum ?? Infinity) - (b.avgLatencyNum ?? Infinity),
    );
  }, [cards, q, svc, st, sortKey]);

  // 分页:每页 20,筛选/排序变了回到第 1 页(在筛选后的全集上分页)
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q, svc, st, sortKey]);
  const totalPages = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const pageCards = view.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const allOpen = pageCards.length > 0 && pageCards.every((c) => openSlugs.has(c.slug));
  // 展开全部 = 当前页所有卡全开 + 分组全显;收起全部 = 全收起(卡 + 分组都清)
  const toggleAll = () => {
    if (allOpen) { setOpenSlugs(new Set()); setShowAllSlugs(new Set()); }
    else { const all = new Set(pageCards.map((c) => c.slug)); setOpenSlugs(all); setShowAllSlugs(all); }
  };
  // 手动点箭头展开某卡 = 连分组一起全显(只有默认自动展开的前 2 张才只显 3 个);收起则两者都清
  const toggle = (slug: string) => {
    const opening = !openSlugs.has(slug);
    setOpenSlugs((prev) => { const n = new Set(prev); if (opening) n.add(slug); else n.delete(slug); return n; });
    setShowAllSlugs((prev) => { const n = new Set(prev); if (opening) n.add(slug); else n.delete(slug); return n; });
  };
  const toggleGroups = (slug: string) => setShowAllSlugs((prev) => { const n = new Set(prev); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });

  return (
    <>
      <div className="slb-mfilter">
        <div className="slb-msearch">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜站名 / 分组 / 模型")} />
        </div>
        <button className="slb-fbtn" onClick={() => setFilterOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
          {t("筛选")}{activeCount > 0 && <span className="cnt">{activeCount}</span>}
        </button>
        <button className="slb-fbtn av-iconbtn" onClick={toggleAll} aria-label={allOpen ? t("全部收起") : t("全部展开")} title={allOpen ? t("全部收起") : t("全部展开")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: allOpen ? "rotate(180deg)" : "none", transition: ".18s" }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
      </div>

      <div className="card pad av-pcfilter" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 240 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: 11, top: 11, color: "var(--ink3)" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜站名 / 分组 / 模型")} style={{ width: "100%", height: 36, border: "1px solid var(--line2)", borderRadius: 10, background: "var(--bg2)", padding: "0 12px 0 34px", fontSize: 13, fontFamily: "inherit", color: "var(--ink)" }} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Dropdown label={t("服务")} value={svc} options={SVCS_T} onPick={setSvc} />
          <Dropdown label={t("状态")} value={st} options={STATES_T} onPick={setSt} />
          <Dropdown label={t("排序")} value={sortKey} options={SORT_OPTS} onPick={(v) => setSortKey(v as "uptime" | "latency")} />
          <button className="btn-line" onClick={toggleAll} style={{ height: 36, padding: "0 14px", fontSize: 13 }}>{allOpen ? t("收起全部") : t("展开全部")}</button>
        </div>
      </div>

      {view.length
        ? pageCards.map((c) => <StationAvailCard key={c.slug} card={c} period={period} open={openSlugs.has(c.slug)} showAll={showAllSlugs.has(c.slug)} onToggle={() => toggle(c.slug)} onToggleGroups={() => toggleGroups(c.slug)} />)
        : <div style={{ padding: "50px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>{t("没有符合条件的站")}</div>}

      {totalPages > 1 && (
        <nav className="board-pager" aria-label={t("分页")}>
          {pageList(cur, totalPages).map((n, k) => n === "…"
            ? <span key={`e${k}`} className="bp-e">…</span>
            : <button key={n} type="button" className={"bp" + (n === cur ? " on" : "")} aria-current={n === cur ? "page" : undefined} onClick={() => setPage(n as number)}>{n}</button>)}
        </nav>
      )}

      {/* 移动端筛选弹层(含时间段) */}
      {filterOpen && <>
        <div className="slb-ov" onClick={() => setFilterOpen(false)} />
        <div className="slb-sheet">
          <div className="slb-grip" />
          <div className="slb-sheet-h"><span className="t">{t("筛选")}</span><span className="rst" onClick={() => { setSvc("all"); setSt("all"); setSortKey("uptime"); }}>{t("重置")}</span></div>
          <div className="slb-grp">
            <div className="slb-grp-l">{t("时间段")}</div>
            <div className="slb-chips">{PERIODS.map(([v, l]) => <button key={v} type="button" className={"slb-ch" + (period === v ? " on" : "")} onClick={() => goPeriod(v)}>{l}</button>)}</div>
          </div>
          <div className="slb-grp">
            <div className="slb-grp-l">{t("排序")}</div>
            <div className="slb-chips">{SORT_OPTS.map(([v, l]) => <button key={v} type="button" className={"slb-ch" + (sortKey === v ? " on" : "")} onClick={() => setSortKey(v as "uptime" | "latency")}>{l}</button>)}</div>
          </div>
          <div className="slb-grp">
            <div className="slb-grp-l">{t("服务")}</div>
            <div className="slb-chips">{SVCS_T.map(([v, l]) => <button key={v} type="button" className={"slb-ch" + (svc === v ? " on" : "")} onClick={() => setSvc(v)}>{l}</button>)}</div>
          </div>
          <div className="slb-grp">
            <div className="slb-grp-l">{t("状态")}</div>
            <div className="slb-chips">{STATES_T.map(([v, l]) => <button key={v} type="button" className={"slb-ch" + (st === v ? " on" : "")} onClick={() => setSt(v)}>{l}</button>)}</div>
          </div>
          <button type="button" className="slb-apply" onClick={() => setFilterOpen(false)}>{t("查看")} {view.length} {t("个结果")}</button>
        </div>
      </>}
    </>
  );
}
