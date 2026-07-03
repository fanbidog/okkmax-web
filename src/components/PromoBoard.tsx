"use client";
import { useState, useEffect, useRef } from "react";
import { GATE_WARN, ELIG_WARN, MODALITY_OPTS, type FreeApiView, type RelayView } from "@/lib/promoData";
import { InfoTip } from "@/components/InfoTip";
import { useT } from "@/components/LocaleProvider";
import { pageList, PAGE_SIZE } from "@/lib/pagination";

const GATE_DESC: Record<string, string> = {
  免绑卡: "无需绑定信用卡 / 实名即可领用。", 需实名: "领用前需先实名认证。",
  国内直连: "国内网络可直接访问,无需代理。", 需海外网络: "需海外网络 / 代理才能访问。",
};

/* ---------- 图标 ---------- */
const Chev = () => (<svg className="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>);
const CheckI = () => (<svg className="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>);
const SearchI = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>);
const BindI = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>);
const GlobeI = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7 -2.6 15.3 0 18" /></svg>);

/* 门槛:PC 显图标+文字;移动端只图标(.gt 隐藏),点击弹白卡说明(复用 InfoTip) */
function Gate({ v, icon }: { v: string; icon: React.ReactNode }) {
  const t = useT();
  return (
    <InfoTip align="right" more={false} width={220} desc={t(GATE_DESC[v] ?? v)}
      trigger={<span className={"gi" + (GATE_WARN.has(v) ? " warn" : "")}>{icon}<span className="gt">{t(v)}</span></span>} />
  );
}

/* ---------- Logo:有图用图,无图用首字母 + 名字派生底色 ---------- */
const FALLBACK_BG = ["#64748b", "#0ea5e9", "#7c5cff", "#f59e0b", "#10b981", "#ec4899", "#1e3a8a"];
function hashColor(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return FALLBACK_BG[h % FALLBACK_BG.length]; }
function Logo({ url, seed }: { url: string; seed: string }) {
  if (url) return <img className="lg" src={url} alt="" />;
  return <span className="lg" style={{ background: hashColor(seed) }}>{seed.slice(0, 1).toUpperCase()}</span>;
}

/* ---------- 下拉(单选 / 多选,样式同 /list)---------- */
function Drop({ label, value, options, onPick, accent = true, align }: { label: string; value: string; options: string[]; onPick: (v: string) => void; accent?: boolean; align?: "r" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const active = accent && value !== "全部";
  return (
    <div className="fdrop">
      <button className={"fpill" + (active ? " on" : "") + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
        <span className="pl">{t(label)}</span><span className="pv">{t(value)}</span><Chev />
      </button>
      {open && (<>
        <div className="fdrop-bk" onClick={() => setOpen(false)} />
        <div className={"fmenu" + (align === "r" ? " r" : "")}>
          {options.map((o) => (
            <button key={o} className={"fitem" + (o === value ? " on" : "")} onClick={() => { onPick(o); setOpen(false); }}>{t(o)}</button>
          ))}
        </div>
      </>)}
    </div>
  );
}

function MultiDrop({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const summary = selected.length ? (selected.length === 1 ? t(selected[0]) : `${t(selected[0])} +${selected.length - 1}`) : t("全部");
  return (
    <div className="fdrop">
      <button className={"fpill" + (selected.length ? " on" : "") + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
        <span className="pl">{t(label)}</span><span className="pv">{summary}</span><Chev />
      </button>
      {open && (<>
        <div className="fdrop-bk" onClick={() => setOpen(false)} />
        <div className="fmenu">
          {options.map((o) => (
            <button key={o} className={"fitem" + (selected.includes(o) ? " on" : "")} onClick={(e) => { e.stopPropagation(); onToggle(o); }}>{t(o)}<CheckI /></button>
          ))}
        </div>
      </>)}
    </div>
  );
}

/* ---------- 工具 ---------- */
const DAY = 86400000;
const ctxNum = (s: string) => { const m = s.match(/([\d.]+)\s*(万|[KkMm])?/); if (!m) return 0; let n = parseFloat(m[1]); const u = m[2]; if (u === "万") n *= 1e4; else if (u === "K" || u === "k") n *= 1e3; else if (u === "M" || u === "m") n *= 1e6; return n; };
const fmtFull = (iso: string) => iso.slice(0, 10);
const fmtMD = (iso: string) => iso.slice(5, 10);
const endTs = (iso: string | null) => (iso ? new Date(iso).getTime() : Infinity); // 长期排最后

/* ---------- 卡片 ---------- */
function FreeCard({ a }: { a: FreeApiView }) {
  const t = useT();
  const cta = a.dead
    ? <span className="board-go off">{t("已失效")}</span>
    : <a className="board-go" href={a.claimUrl || "#"} target="_blank" rel="noopener noreferrer">{t("立即前往")}</a>;
  const due = <div className="fc-due">{a.dead ? <b>{t("已失效")}</b> : <>{t("截止")} <b>{a.endsAt ? fmtFull(a.endsAt) : t("长期")}</b></>}</div>;
  return (
    <div className={"fcard" + (a.dead ? " dead" : "")}>
      <div className="fc-r1">
        <div className="fc-id">
          <Logo url={a.logoUrl} seed={a.model} />
          <div style={{ minWidth: 0 }}>
            <div className="mn">{a.model}</div>
            <div className="pv">{a.provider}</div>
          </div>
        </div>
        <div className="fc-m"><div className="ml">{t("上下文")}</div><div className="mv mono">{a.context}</div></div>
        <div className="fc-m"><div className="ml">{t("最大输出")}</div><div className="mv mono">{a.maxOutput}</div></div>
        <div className="fc-sp" />
        <div className="fc-m fc-gate"><div className="ml">{t("门槛")}</div>
          <div className="gate2">
            <Gate v={a.bindCard} icon={<BindI />} />
            <Gate v={a.network} icon={<GlobeI />} />
          </div>
        </div>
        <div className="fc-sp" />
        <span className="cta-pc">{cta}</span>
      </div>
      <div className="fc-r2">
        <div className="fc-quota">{a.quota}</div>
        <div className="fc-mod">{a.modality.map((m) => <span key={m} className="mtag">{t(m)}</span>)}</div>
        <div className="fc-sp" />
        <span className="due-pc">{due}</span>
      </div>
      <div className="fc-mfoot">{due}{cta}</div>
    </div>
  );
}

function RelayCard({ p, open, onToggle }: { p: RelayView; open: boolean; onToggle: () => void }) {
  const t = useT();
  const stepList = p.steps.split("\n").map((s) => s.trim()).filter(Boolean);
  const hasSteps = stepList.length > 0;
  const cta = p.dead
    ? <span className="board-go off">{t("已结束")}</span>
    : <a className="board-go" href={p.claimUrl || "#"} target="_blank" rel="noopener noreferrer">{t("立即前往")}</a>;
  const due = <div className="fc-due">{p.dead ? <b>{p.endsAt ? `${t("已结束")} ${fmtMD(p.endsAt)}` : t("已结束")}</b> : <>{t("截止")} <b>{p.endsAt ? `${t("至")} ${fmtMD(p.endsAt)}` : t("长期有效")}</b></>}</div>;
  return (
    <div className={"fcard" + (p.dead ? " dead" : "")}>
      <div className="fc-r1">
        <div className="fc-id">
          <Logo url={p.logoUrl} seed={p.station} />
          <div style={{ minWidth: 0 }}>
            <div className="mn">{p.station}</div>
            <div className="pv">{p.host}</div>
          </div>
        </div>
        <div className="fc-m fc-act"><div className="ml">{t("活动内容")}</div><div className="mv">{p.activity}</div></div>
        <div className="fc-m"><div className="ml">{t("参与资格")}</div><div className={"mv" + (ELIG_WARN.has(p.eligibility) ? " warn" : "") + (p.eligibility === "—" ? " dash" : "")}>{p.eligibility}</div></div>
        <div className="fc-sp" />
        <span className="cta-pc">{cta}</span>
      </div>
      {/* 手机端:截止/立即前往(mfoot)在上,领取步骤在下(fc-r2 此时只剩 toggle)。PC mfoot 隐藏,顺序不受影响 */}
      <div className="fc-mfoot">{due}{cta}</div>
      <div className="fc-r2">
        <div className="rstep-w" />
        {!p.dead && hasSteps && <span className={"fc-steptog" + (open ? " open" : "")} onClick={onToggle}>{t("领取步骤")}<Chev /></span>}
        <div className="fc-sp" />
        <span className="due-pc">{due}</span>
      </div>
      {open && !p.dead && hasSteps && (
        <div className="fc-exp">
          <ol>{stepList.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {p.terms && <div className="terms">{t("条款")}：{p.terms}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- 主体 ---------- */
export function PromoBoard({ freeApis, relayPromos }: { freeApis: FreeApiView[]; relayPromos: RelayView[] }) {
  const t = useT();
  const [tab, setTab] = useState(0);
  // 免费 API 筛选
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [gate, setGate] = useState("全部");
  const [mods, setMods] = useState<string[]>([]);
  const [sort, setSort] = useState("语境最大");
  // 中转站福利筛选
  const [rq, setRq] = useState("");
  const [rst, setRst] = useState("全部");
  const [rsort, setRsort] = useState("时间");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const freeActive = (svc !== "全部" ? 1 : 0) + (status !== "全部" ? 1 : 0) + (gate !== "全部" ? 1 : 0) + (mods.length ? 1 : 0);
  const relayActiveCnt = rst !== "全部" ? 1 : 0;

  const toggleMod = (m: string) => setMods((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  const now = Date.now();

  // ---- 免费 API:搜索 + 筛选 + 排序 ----
  const svcOpts = ["全部", ...Array.from(new Set(freeApis.map((a) => a.provider)))];
  const qn = q.trim().toLowerCase();
  const freeView = freeApis
    .filter((a) => (!qn || a.model.toLowerCase().includes(qn) || a.provider.toLowerCase().includes(qn))
      && (svc === "全部" || a.provider === svc)
      && (gate === "全部" || (gate === "免绑卡" ? a.bindCard === "免绑卡" : a.network === "国内直连"))
      && (mods.length === 0 || mods.every((m) => a.modality.includes(m)))
      && (status === "全部"
        || (status === "已失效" && a.dead)
        || (status === "长期" && !a.dead && a.endsAt === null)
        || (status === "临期" && !a.dead && a.endsAt !== null && endTs(a.endsAt) - now >= 0 && endTs(a.endsAt) - now <= 14 * DAY)))
    .sort((x, y) => (y.sortWeight - x.sortWeight) // 置顶恒在最前
      || (sort === "最新" ? y.createdAt.localeCompare(x.createdAt) : ctxNum(y.context) - ctxNum(x.context)));

  // ---- 中转站福利:搜索 + 状态 + 排序,再拆 进行中 / 已结束 ----
  const rqn = rq.trim().toLowerCase();
  const relayView = relayPromos
    .filter((p) => (!rqn || p.station.toLowerCase().includes(rqn) || p.host.toLowerCase().includes(rqn) || p.activity.toLowerCase().includes(rqn))
      && (rst === "全部" || (rst === "进行中" ? !p.dead : p.dead)))
    .sort((x, y) => (y.sortWeight - x.sortWeight)
      || (rsort === "最新" ? y.createdAt.localeCompare(x.createdAt) : endTs(x.endsAt) - endTs(y.endsAt)));
  const relayActive = relayView.filter((p) => !p.dead);
  const relayEnded = relayView.filter((p) => p.dead);
  const freeActiveTotal = freeApis.filter((a) => !a.dead).length; // tab 徽章:进行中的免费 API 数

  // 分页(每 tab 独立;切 tab / 改筛选回第 1 页)。数据量大时才出翻页器,现少即全在 1 页。
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const goPage = (n: number) => { setPage(n); requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  useEffect(() => { setPage(1); }, [tab, q, svc, status, gate, mods, sort, rq, rst, rsort]);
  const totalPages = Math.max(1, Math.ceil((tab === 0 ? freeView.length : relayActive.length) / PAGE_SIZE));
  const curPage = Math.min(Math.max(1, page), totalPages);
  const freeSlice = freeView.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const relaySlice = relayActive.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <div className="promo-root">
      <div ref={topRef} style={{ scrollMarginTop: 76 }} aria-hidden />
      <div className="ptabs">
        <button className={"ptab" + (tab === 0 ? " on" : "")} onClick={() => setTab(0)}>{t("免费 API")}<span className="n">{freeActiveTotal}</span></button>
        <button className={"ptab" + (tab === 1 ? " on" : "")} onClick={() => setTab(1)}>{t("中转站福利")}<span className="n">{relayActive.length}</span></button>
      </div>

      {tab === 0 ? (
        <>
          <div className="slb-mfilter">
            <div className="slb-msearch"><SearchI /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜模型 / 提供者…")} /></div>
            <button className="slb-fbtn" onClick={() => setFilterOpen(true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M6 12h12M10 19h4" /></svg>{t("筛选")}{freeActive > 0 && <span className="cnt">{freeActive}</span>}</button>
          </div>
          <div className="fbar"><div className="tools">
            <div className="search"><SearchI /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜模型 / 提供者…")} /></div>
            <div className="rgroup">
              <Drop label="服务" value={svc} options={svcOpts} onPick={setSvc} />
              <Drop label="状态" value={status} options={["全部", "长期", "临期", "已失效"]} onPick={setStatus} />
              <Drop label="门槛" value={gate} options={["全部", "免绑卡", "国内直连"]} onPick={setGate} />
              <MultiDrop label="模态" options={MODALITY_OPTS} selected={mods} onToggle={toggleMod} />
              <Drop label="排序" value={sort} options={["语境最大", "最新"]} onPick={setSort} accent={false} align="r" />
            </div>
          </div></div>
          <div className="flist">
            {freeView.length ? freeSlice.map((a) => <FreeCard key={a.id} a={a} />) : <div className="flist-empty">{t("没有符合条件的免费 API")}</div>}
          </div>
        </>
      ) : (
        <>
          <div className="slb-mfilter">
            <div className="slb-msearch"><SearchI /><input value={rq} onChange={(e) => setRq(e.target.value)} placeholder={t("搜站点 / 活动…")} /></div>
            <button className="slb-fbtn" onClick={() => setFilterOpen(true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M6 12h12M10 19h4" /></svg>{t("筛选")}{relayActiveCnt > 0 && <span className="cnt">{relayActiveCnt}</span>}</button>
          </div>
          <div className="fbar"><div className="tools">
            <div className="search"><SearchI /><input value={rq} onChange={(e) => setRq(e.target.value)} placeholder={t("搜站点 / 活动…")} /></div>
            <div className="rgroup">
              <Drop label="状态" value={rst} options={["全部", "进行中", "已结束"]} onPick={setRst} />
              <Drop label="排序" value={rsort} options={["时间", "最新"]} onPick={setRsort} accent={false} align="r" />
            </div>
          </div></div>
          <div className="flist">
            {relaySlice.map((p) => <RelayCard key={p.id} p={p} open={openId === p.id} onToggle={() => setOpenId((o) => (o === p.id ? null : p.id))} />)}
            {curPage === totalPages && relayEnded.length > 0 && <div className="fc-sec">{t("已结束的活动")}</div>}
            {curPage === totalPages && relayEnded.map((p) => <RelayCard key={p.id} p={p} open={false} onToggle={() => undefined} />)}
            {relayView.length === 0 && <div className="flist-empty">{t("没有符合条件的活动")}</div>}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <nav className="board-pager" aria-label={t("分页")} style={{ marginTop: 20 }}>
          {pageList(curPage, totalPages).map((n, i) => n === "…"
            ? <span key={`e${i}`} className="bp-e">…</span>
            : <button key={n} type="button" className={"bp" + (n === curPage ? " on" : "")} aria-current={n === curPage ? "page" : undefined} onClick={() => goPage(n as number)}>{n}</button>)}
        </nav>
      )}

      {filterOpen && <>
        <div className="slb-ov" onClick={() => setFilterOpen(false)} />
        <div className="slb-sheet">
          <div className="slb-grip" />
          <div className="slb-sheet-h"><span className="t">{t("筛选")}</span><span className="rst" onClick={() => { if (tab === 0) { setSvc("全部"); setStatus("全部"); setGate("全部"); setMods([]); setSort("语境最大"); } else { setRst("全部"); setRsort("时间"); } }}>{t("重置")}</span></div>
          {tab === 0 ? (<>
            <div className="slb-grp"><div className="slb-grp-l">{t("排序")}</div><div className="slb-chips">{["语境最大", "最新"].map((o) => <button key={o} type="button" className={"slb-ch" + (sort === o ? " on" : "")} onClick={() => setSort(o)}>{t(o)}</button>)}</div></div>
            <div className="slb-grp"><div className="slb-grp-l">{t("服务")}</div><div className="slb-chips">{svcOpts.map((o) => <button key={o} type="button" className={"slb-ch" + (svc === o ? " on" : "")} onClick={() => setSvc(o)}>{t(o)}</button>)}</div></div>
            <div className="slb-grp"><div className="slb-grp-l">{t("状态")}</div><div className="slb-chips">{["全部", "长期", "临期", "已失效"].map((o) => <button key={o} type="button" className={"slb-ch" + (status === o ? " on" : "")} onClick={() => setStatus(o)}>{t(o)}</button>)}</div></div>
            <div className="slb-grp"><div className="slb-grp-l">{t("门槛")}</div><div className="slb-chips">{["全部", "免绑卡", "国内直连"].map((o) => <button key={o} type="button" className={"slb-ch" + (gate === o ? " on" : "")} onClick={() => setGate(o)}>{t(o)}</button>)}</div></div>
            <div className="slb-grp"><div className="slb-grp-l">{t("模态(可多选)")}</div><div className="slb-chips">{MODALITY_OPTS.map((o) => <button key={o} type="button" className={"slb-ch" + (mods.includes(o) ? " on" : "")} onClick={() => toggleMod(o)}>{t(o)}</button>)}</div></div>
          </>) : (<>
            <div className="slb-grp"><div className="slb-grp-l">{t("排序")}</div><div className="slb-chips">{["时间", "最新"].map((o) => <button key={o} type="button" className={"slb-ch" + (rsort === o ? " on" : "")} onClick={() => setRsort(o)}>{t(o)}</button>)}</div></div>
            <div className="slb-grp"><div className="slb-grp-l">{t("状态")}</div><div className="slb-chips">{["全部", "进行中", "已结束"].map((o) => <button key={o} type="button" className={"slb-ch" + (rst === o ? " on" : "")} onClick={() => setRst(o)}>{t(o)}</button>)}</div></div>
          </>)}
          <button type="button" className="slb-apply" onClick={() => setFilterOpen(false)}>{t("查看")} {tab === 0 ? freeView.length : relayView.length} {t("个结果")}</button>
        </div>
      </>}
    </div>
  );
}
