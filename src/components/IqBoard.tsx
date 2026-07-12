"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { useT } from "@/components/LocaleProvider";
import { toast } from "@/components/Toast";

// 模型智商榜交互主体(/tools/iq):能力指数柱形图(厂商筛选)+ 完整排行(排序/悬浮)+ 信号速览 + 分项基准榜(弹窗)
// 视觉与交互 1:1 对照 public/mock-iq-radar.html(用户定稿),数据由页面从库里注入。

export type IqRow = {
  id: number; display: string; ven: string; logo: string; cur: number;
  ci: [number, number] | null; base: number | null; gold: number | null;
  diff: number | null; bdiff: number | null; st: number;
  re: boolean; nw: boolean; sr: number | null; lat: number | null;
  modes: { reasoning: number | null; coding: number | null; tooling: number | null };
  stability: number | null;
  vals: (number | null)[]; hmed: number | null;
};

const VEN: Record<string, [string, string]> = {
  anthropic: ["Anthropic", "#c2703f"], openai: ["OpenAI", "var(--iq-openai)"], google: ["Google", "#3f9e6e"],
  deepseek: ["DeepSeek", "#4d6bfe"], kimi: ["Kimi", "#6366f1"], glm: ["Z.AI", "#0ea5e9"],
};
// 未知厂商(来源方上新)配色:哈希到固定色板,同厂商永远同色,无需发版
const FALLBACK_VEN = ["#6b7280", "#0891b2", "#7c5cd6", "#b45309", "#0d9488", "#b0568f"];
const hashColor = (v: string) => { let h = 0; for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0; return FALLBACK_VEN[h % FALLBACK_VEN.length]; };
const venOf = (v: string): [string, string] => VEN[v] ?? [v, hashColor(v)];

function Bulb({ size = 14 }: { size?: number }) {
  return (
    <svg className="bulb" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.4-1 2.5h-6c0-1.1-.3-1.9-1-2.5A6 6 0 0 1 12 3z" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
  );
}

type Tip = { node: ReactNode; x: number; y: number; below?: boolean; wide?: boolean };

const SORT_KEYS = ["cur", "bdiff", "base", "diff", "gold", "ci"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const sortVal = (m: IqRow, k: SortKey): number | null =>
  k === "ci" ? (m.ci ? m.ci[1] - m.ci[0] : null) : (m[k] as number | null);

const EXPORT_W = 1152; // 导出图统一宽度(桌面卡片宽),M 端横滑内容也按完整宽度出图

/** 把卡片 DOM 克隆到屏外、注入出处行(页面上不存在,只进图),转 PNG 后分享(触屏)或下载。
 *  title:图内容自身缺上下文时补一条标题(如排行表);brand:是否带 OkkMax 字标(图表卡标题已含品牌,不重复加)。 */
async function snapCard(src: HTMLElement, file: string, opt: { syncText?: string; title?: string; brand?: boolean }) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:fixed;left:-99999px;top:0;width:${EXPORT_W}px;z-index:-1`;
  const clone = src.cloneNode(true) as HTMLElement;
  clone.style.display = "block"; // M 端隐藏的桌面表格也能出图
  clone.querySelectorAll(".ar, .icob, .sic, .hinfo").forEach((el) => el.remove()); // 交互控件不进图
  if (opt.title) {
    const head = document.createElement("div");
    head.style.cssText = "padding:16px 20px 12px;font-size:17px;font-weight:600;letter-spacing:-.01em;color:var(--ink)";
    head.textContent = opt.title;
    clone.prepend(head);
  }
  const foot = document.createElement("div");
  foot.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--line)";
  foot.innerHTML =
    `<span style="font-size:12px;color:var(--ink3)">okkmax.com/tools/iq${opt.syncText ? "，" + opt.syncText : ""}</span>` +
    (opt.brand ? `<span style="font-family:var(--font-orbitron),sans-serif;font-weight:900;font-size:14px;letter-spacing:.04em;color:var(--ink)">OkkMa<span style="color:var(--accent)">x</span></span>` : "");
  clone.appendChild(foot);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  try {
    const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#fff";
    const dataUrl = await toPng(clone, { pixelRatio: 2, backgroundColor: surface });
    // 触屏设备优先系统分享面板(可直接进微信/TG);被拒/激活过期/不支持一律落回下载
    if (window.matchMedia("(pointer:coarse)").matches && navigator.canShare) {
      const blob = await (await fetch(dataUrl)).blob();
      const f = new File([blob], file, { type: "image/png" });
      if (navigator.canShare({ files: [f] })) {
        try { await navigator.share({ files: [f] }); return; } catch { /* 落回下载 */ }
      }
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = file;
    a.click();
  } finally {
    wrap.remove();
  }
}

// 分项森林图坐标:竖线=全场中位,偏差条绿右/红左,对称量程
function dimBar(v: number, med: number, R: number) {
  const eff = v - med, pos = eff >= 0, x = Math.max(2, Math.min(98, 50 + (eff / R) * 50));
  return { pos, left: pos ? 50 : x, width: Math.max(0.8, Math.abs(x - 50)) };
}

export function IqBoard({ rows, days, syncText }: { rows: IqRow[]; days: string[]; syncText?: string }) {
  const t = useT();
  const [selIds, setSelIds] = useState<Set<number>>(() => new Set(rows.map((r) => r.id)));
  const [panelOpen, setPanelOpen] = useState(false);
  const [sortK, setSortK] = useState<SortKey>("cur");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [tip, setTip] = useState<Tip | null>(null);
  const [modal, setModal] = useState<{ k: string; title: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set()); // M 端行展开(可多开)
  const arRef = useRef<HTMLDivElement>(null);
  const chartCardRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const [snapping, setSnapping] = useState(false);
  const snap = async (el: HTMLElement | null, file: string, opt?: { title?: string; brand?: boolean }) => {
    if (!el || snapping) return;
    setSnapping(true);
    try { await snapCard(el, file, { syncText, ...opt }); }
    catch (e) { console.error(e); toast(t("图片生成失败，请重试"), "err"); }
    finally { setSnapping(false); }
  };

  useEffect(() => {
    if (!panelOpen) return;
    const close = (e: MouseEvent) => { if (!arRef.current?.contains(e.target as Node)) setPanelOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [panelOpen]);

  const chartList = rows.filter((r) => selIds.has(r.id));
  const maxCur = Math.max(...chartList.map((r) => r.cur), 1);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const x = sortVal(a, sortK), y = sortVal(b, sortK);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return sortDir === "desc" ? y - x : x - y;
  }), [rows, sortK, sortDir]);

  // 悬浮定位:锚定元素上方居中,左右夹紧(与主站 UptimeHeatmap 一致)
  const anchorTip = (el: Element, node: ReactNode, opt?: { below?: boolean; wide?: boolean }) => {
    const r = el.getBoundingClientRect();
    const half = opt?.wide ? 160 : 132;
    setTip({
      node, x: Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half),
      y: opt?.below ? r.bottom + 7 : r.top - 8, below: opt?.below, wide: opt?.wide,
    });
  };

  const modelTipNode = (d: IqRow) => (
    <>
      <div className="t">{d.display}{d.nw && <span style={{ color: "#c2410c" }}> NEW</span>}　{venOf(d.ven)[0]}</div>
      <div className="r">
        {t("综合得分")} <b>{d.cur}</b> / 100
        {d.base != null && <><br />{t("近期常态")} <b>{d.base}</b>{d.gold != null && <>，{t("发布时")} <b>{d.gold}</b></>}</>}
        {d.base == null && d.gold != null && <><br />{t("发布时得分")} <b>{d.gold}</b></>}
        {d.ci && <><br />{t("置信区间")} <b>{d.ci[0]}–{d.ci[1]}</b></>}
        {d.sr != null && <><br />{t("成功率")} <b>{d.sr}%</b>{d.lat != null && <>，{t("延迟")} <b>{d.lat}ms</b></>}</>}
      </div>
    </>
  );

  // 表头列:k=排序键 i=说明文案(文案对齐来源方官方口径:7 轴计分/95% 置信/CUSUM 检测)
  const HTIPS: Record<string, string> = {
    cur: t("最新一轮全套测试的总分（0–100），就是标题说的「智商」，越高越聪明。旁边的小条形图：竖线是它的近期常态，绿条=比平时好，红条=比平时差（可能在降智）。"),
    bnear: t("当前分和它近期常态的差距：负数表示比自己最近 30 天的平时水平低（可能在降智），和旁边小条形图画的是同一个数。"),
    diff: t("当前分和它刚上线时的差距：正数比发布时强，负数比发布时弱，看的是长期变化，比单日排名更有意义。"),
    ci: t("±N 是这个分数的浮动范围，越小越可信；浮动大的分数看个大概就行。"),
    base: t("它最近 30 天的中间水平，也就是「平时考多少分」。当前分明显低于这个数，就可能在降智。"),
    gold: t("刚上线时考出的分，当作长期对比的起点。「—」= 来源方没给这项数据。"),
    hm: t("过去 30 天每天的表现：绿=正常，黄=有波动，红=明显低于自己平时水平（疑似降智），灰=当天没数据。"),
  };
  const COLS: { t: string; k?: SortKey; i?: string; r?: boolean }[] = [
    { t: "#" }, { t: t("模型") },
    { t: t("综合得分"), k: "cur", i: "cur" },
    { t: t("较近期"), k: "bdiff", i: "bnear", r: true },
    { t: t("近期常态"), k: "base", i: "base", r: true },
    { t: t("较发布时"), k: "diff", i: "diff", r: true },
    { t: t("发布时得分"), k: "gold", i: "gold", r: true },
    { t: t("置信区间"), k: "ci", i: "ci", r: true },
    { t: t("30 天趋势"), i: "hm", r: true },
  ];

  // 信号速览(数据不足的信号自动隐藏)
  const withDiff = rows.filter((r) => r.diff != null);
  const gain = withDiff.length ? [...withDiff].sort((a, b) => b.diff! - a.diff!)[0] : null;
  const withB = rows.filter((r) => r.bdiff != null);
  const alarm = [...withB].sort((a, b) => a.bdiff! - b.bdiff!).find((r) => r.st === 2) ?? (withB.length ? [...withB].sort((a, b) => a.bdiff! - b.bdiff!)[0] : null);
  const bestCoding = rows.filter((r) => r.modes.coding != null).sort((a, b) => b.modes.coding! - a.modes.coding!)[0] ?? null;
  const ciHalf = (r: IqRow) => (r.ci ? `±${(r.ci[1] - r.ci[0]) / 2}` : "");
  const signals = [
    gain && gain.diff! > 0 && { m: gain, desc: t("和刚发布时相比，它提升得最多。"), cls: "up", v: `+${gain.diff}`, sub: ciHalf(gain) },
    { m: rows[0], desc: t("现在总分最高的模型。"), cls: "", v: String(rows[0].cur), sub: "/ 100" },
    bestCoding && { m: bestCoding, desc: t("写代码的测试里，它得分最高。"), cls: "", v: String(bestCoding.modes.coding), sub: "/ 100" },
    alarm && alarm.bdiff! < 0 && { m: alarm, desc: t("比自己平时的水平掉得最狠，疑似降智。"), cls: "dn", v: String(alarm.bdiff), sub: ciHalf(alarm) },
  ].filter(Boolean) as { m: IqRow; desc: string; cls: string; v: string; sub: string }[];

  // 分项基准榜(推理/代码/工具调用=来源分项接口,稳定性=近 7 天稳定性轴中位)
  const DIMS: [string, string, string][] = [
    ["reasoning", t("推理"), t("REASONING：解数学、逻辑这类要动脑的难题，它表现如何")],
    ["coding", t("代码"), t("CODING：写代码、改 bug 的水平，每小时都在测")],
    ["tooling", t("工具调用"), t("TOOLING：让它调用工具干活，靠不靠谱")],
    ["stability", t("稳定性"), t("STABILITY：同样的题反复做，发挥稳不稳（近 7 天）")],
  ];
  const dimVal = (m: IqRow, k: string): number | null =>
    k === "stability" ? m.stability : m.modes[k as keyof IqRow["modes"]];
  const dimData = (k: string) => {
    const has = rows.filter((m) => dimVal(m, k) != null).sort((a, b) => dimVal(b, k)! - dimVal(a, k)!);
    const allv = has.map((m) => dimVal(m, k)!);
    const med = [...allv].sort((a, b) => a - b)[Math.floor(allv.length / 2)] ?? 0;
    const R = Math.max(4, ...allv.map((v) => Math.abs(v - med)));
    return { has, med, R };
  };
  const dimRow = (m: IqRow, i: number, k: string, med: number, R: number) => {
    const v = dimVal(m, k)!;
    const b = dimBar(v, med, R);
    return (
      <div className="drow" key={m.id}>
        <span className="dn">{i + 1}</span>
        <img className="mlogo s" src={m.logo} alt="" />
        <span className="nm2">{m.display}</span>
        <span className="tk"><span className="bs" /><i className={b.pos ? "" : "neg"} style={{ left: `${b.left}%`, width: `${b.width}%` }} /></span>
        <span className="dv">{v}</span>
      </div>
    );
  };

  const strip = (m: IqRow) => m.vals.map((v, i) => {
    if (v == null) return <i key={i} style={{ background: "rgb(148,163,184)", opacity: 0.4 }} />;
    const hmed = m.hmed ?? 0;
    const deg = v < 58 || v < hmed - 13;
    const c = deg ? "rgb(239,68,68)" : v < hmed - 6 ? "rgb(234,179,8)" : "rgb(34,197,94)";
    const stt = deg ? t("降智") : v < hmed - 6 ? t("波动") : "";
    return (
      <i key={i} style={{ background: c }}
        onMouseMove={(e) => anchorTip(e.currentTarget, (
          <>
            <div style={{ color: "var(--ink3)", fontSize: 11.5 }}>{days[i]}</div>
            <div style={{ fontWeight: 500 }}>{t("当日得分")} {v} / 100{stt && `（${stt}）`}</div>
          </>
        ))}
      />
    );
  });

  return (
    <>
      {/* 能力指数柱形图 */}
      <div className="card nsh" ref={chartCardRef}>
        <div className="aa-head">
          <div>
            <div className="t">{t("OkkMax 模型能力指数")}</div>
            <div className="d">{t("持续让各家模型做同一套题：写代码每小时测，推理和工具调用每天各测一轮，汇成 0–100 的综合分——也就是这页说的「智商」，越高越聪明。下面是最新一轮的排名。")}</div>
          </div>
          <div className="ar" ref={arRef}>
            <button className="icob" aria-label={t("下载图片")} disabled={snapping}
              onClick={() => snap(chartCardRef.current, "okkmax-iq.png", { brand: false })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.3" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /><circle cx="9" cy="9" r="2" /><path d="M17 22v-5.5" /><path d="m14.5 19.5 2.5 2.5 2.5-2.5" /></svg>
            </button>
            <span className="sel" onClick={() => setPanelOpen((v) => !v)}>
              {chartList.length} / {rows.length} {t("款模型")}<Chevron />
            </span>
            <div className={`venpanel${panelOpen ? " on" : ""}`}>
              {rows.map((m) => (
                <label className="vrow" key={m.id}>
                  <input type="checkbox" checked={selIds.has(m.id)}
                    onChange={(e) => {
                      setSelIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(m.id);
                        else if (next.size > 1) next.delete(m.id); // 至少保留一款
                        return next;
                      });
                    }} />
                  <img src={m.logo} alt="" />{m.display}
                  <span className="c">{m.cur}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="iq-scroll">
        <div className="iq-chart" onMouseLeave={() => setTip(null)}
          onMouseMove={(e) => { if (!(e.target as HTMLElement).closest(".aa-bar,.bulb")) setTip(null); }}>
          <div className="aa-grid">{[25, 50, 75, 100].map((g) => <i key={g} style={{ bottom: `${g}%` }} />)}</div>
          {chartList.map((d) => {
            const h = (d.cur / maxCur) * 100, inside = h >= 10;
            return (
              <div className="aa-col" key={d.id}>
                <div className="aa-bar" style={{ height: `${Math.max(h, 2)}%`, background: venOf(d.ven)[1] }}
                  onMouseMove={(e) => setTip({ node: modelTipNode(d), x: Math.min(Math.max(e.clientX, 132), window.innerWidth - 132), y: e.clientY + 16, below: true })}>
                  {inside && <b style={d.ven === "openai" ? { color: "var(--iq-openai-ink)" } : undefined}>{d.cur}</b>}
                </div>
                {!inside && <span className="aa-out">{d.cur}</span>}
                <div className="aa-foot">
                  <img src={d.logo} alt="" />
                  {d.re && (
                    <span style={{ display: "inline-flex", color: "var(--ink)" }}
                      onMouseMove={(e) => { e.stopPropagation(); anchorTip(e.currentTarget, <div className="r">{t("推理模型")}</div>); }}>
                      <Bulb />
                    </span>
                  )}
                </div>
                <span className="nm">{d.display}</span>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* 完整排行(桌面=表格,M 端=卡片,同 /activity 版式) */}
      <section className="home-sec" style={{ paddingBottom: 0 }}>
        <div className="hs-head">
          <span className="hs-t">{t("完整排行")}</span>
          <button className="icob" aria-label={t("下载图片")} disabled={snapping}
            onClick={() => snap(tableCardRef.current, "okkmax-iq-table.png", { title: t("模型智商榜"), brand: true })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.3" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /><circle cx="9" cy="9" r="2" /><path d="M17 22v-5.5" /><path d="m14.5 19.5 2.5 2.5 2.5-2.5" /></svg>
          </button>
        </div>
        <div className="board iq-deskboard"><div className="card flat-x" ref={tableCardRef}>
          <table className="tbl-strong iqtbl">
            <thead><tr>
              {COLS.map((c, ci) => (
                <td key={ci} style={c.r ? { textAlign: "right" } : undefined}>
                  {c.k ? (
                    <span className="hs" data-dir={sortK === c.k ? sortDir : ""}
                      onClick={() => {
                        if (sortK === c.k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                        else { setSortK(c.k!); setSortDir("desc"); }
                      }}>
                      {c.t}
                      <svg className="sic" width="8" height="13" viewBox="0 0 8 13"><path className="up2" d="M4 1 7.4 5H.6z" fill="#c8c8cf" /><path className="dn2" d="M4 12 .6 8h6.8z" fill="#c8c8cf" /></svg>
                    </span>
                  ) : c.t}
                  {c.i && (
                    <span className="hinfo"
                      onMouseEnter={(e) => anchorTip(e.currentTarget, HTIPS[c.i!], { wide: true })}
                      onMouseLeave={() => setTip(null)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 16.5v-4.5" /><path d="M12 7.9h.01" /></svg>
                    </span>
                  )}
                </td>
              ))}
            </tr></thead>
            <tbody onMouseLeave={() => setTip(null)}>
              {sorted.map((m, i) => {
                // 森林图:效果 = 当前 − 近期常态;对称量程 ±R,基线居中,超出顶格;基线缺失不画条
                const R = 28, eff = m.bdiff ?? 0;
                const xp = Math.max(2, Math.min(98, 50 + (eff / R) * 50));
                const pos = eff >= 0, barL = pos ? 50 : xp, barW = m.bdiff == null ? 0 : Math.max(0.6, Math.abs(xp - 50));
                const w2 = m.ci ? m.ci[1] - m.ci[0] : null;
                const num = (v: number | null, signed?: boolean) =>
                  v == null ? "—" : signed
                    ? <span style={{ color: v < 0 ? "var(--red)" : "var(--ok)" }}>{v < 0 ? String(v) : `+${v}`}</span>
                    : String(v);
                return (
                  <tr key={m.id}>
                    <td>{i + 1}</td>
                    <td><div className="bl"><img className="mlogo" src={m.logo} alt="" /><div style={{ fontWeight: 600 }}>{m.display}{m.nw && <span className="pnew">NEW</span>}</div></div></td>
                    <td>
                      <div className="fp" onMouseMove={(e) => anchorTip((e.currentTarget as HTMLElement).querySelector(".w")!, modelTipNode(m))}>
                        <span className="cv">{m.cur}</span>
                        <span className="w"><span className="lane" /><span className="base" /><span className={`bar ${pos ? "pos" : "neg"}`} style={{ left: `${barL}%`, width: `${barW}%` }} /></span>
                      </div>
                    </td>
                    <td className="numcell">{num(m.bdiff, true)}</td>
                    <td className="numcell">{num(m.base)}</td>
                    <td className="numcell">{num(m.diff, true)}</td>
                    <td className="numcell">{num(m.gold)}</td>
                    <td className="numcell">
                      {m.ci ? (
                        <span onMouseMove={(e) => anchorTip(e.currentTarget, <div className="r">{t("置信区间")} <b>{m.ci![0]}–{m.ci![1]}</b></div>)}>
                          ±{(w2! / 2) % 1 ? (w2! / 2).toFixed(1) : w2! / 2}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="trendcell"><span className="hm30">{strip(m)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></div>
        <div className="iq-cards" onMouseLeave={() => setTip(null)}>
          <div className="iqm2-head"><span># {t("模型")}</span><span>{t("综合得分")}</span></div>
          {sorted.map((m, i) => {
            const w2 = m.ci ? m.ci[1] - m.ci[0] : null;
            const open = expanded.has(m.id);
            const signed = (v: number | null) =>
              v == null ? "—" : <span style={{ color: v < 0 ? "var(--red)" : "var(--ok)" }}>{v < 0 ? String(v) : `+${v}`}</span>;
            const ext: [string, ReactNode][] = [
              [t("较近期"), signed(m.bdiff)],
              [t("近期常态"), m.base ?? "—"],
              [t("较发布时"), signed(m.diff)],
              [t("发布时得分"), m.gold ?? "—"],
              [t("置信区间"), w2 == null ? "—" : `±${(w2 / 2) % 1 ? (w2 / 2).toFixed(1) : w2 / 2}`],
            ];
            return (
              <div className="iqm2" key={m.id}>
                <div className="r2" onClick={() => setExpanded((prev) => { const n = new Set(prev); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}>
                  <svg className={`cvr${open ? " open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
                  <span className="rk">{i + 1}</span>
                  <img className="mlogo s" src={m.logo} alt="" />
                  <span className="qn">
                    <span className="n1">{m.display}{m.nw && <span className="pnew">NEW</span>}</span>
                  </span>
                  <span className="qv"><span className="p">{m.cur}</span></span>
                </div>
                <span className="hm30">{strip(m)}</span>
                {open && (
                  <div className="ext">
                    {ext.map(([l, v], k) => (
                      <span key={k}><span className="ml">{l}</span><span className="mv">{v}</span></span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 信号速览 */}
      <section className="home-sec" style={{ paddingBottom: 0 }}>
        <div className="hs-head"><span className="hs-t">{t("信号速览")}</span></div>
        <div className="leaders">
          {signals.map((x, i) => (
            <div className="sgrow" key={i}>
              <img className="mlogo" src={x.m.logo} alt="" />
              <div className="info"><div className="snm">{x.m.display}</div><div className="sdesc">{x.desc}</div></div>
              <div className="sval"><div className={`v ${x.cls}`}>{x.v}</div><div className="sub">{x.sub}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* 分项基准榜 */}
      <section className="home-sec" style={{ paddingBottom: 0 }}>
        <div className="hs-head"><span className="hs-t">{t("分项基准榜")}</span></div>
        <div className="dims">
          {DIMS.map(([k, title, desc]) => {
            const { has, med, R } = dimData(k);
            return (
              <div className="card nsh" key={k}>
                <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 4 }}>{desc}。</div>
                </div>
                <div style={{ padding: "4px 20px 6px" }}>{has.slice(0, 10).map((m, i) => dimRow(m, i, k, med, R))}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink3)" }}>
                  <span>{has.length} {t("款有效监测")}</span>
                  <span style={{ cursor: "pointer" }} onClick={() => setModal({ k, title })}>{t("查看全部")} {has.length} {t("款")} →</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 查看全部弹窗(主站居中弹窗规范) */}
      {modal && (() => {
        const { has, med, R } = dimData(modal.k);
        return (
          <div className="dmask" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
            <div className="dmodal">
              <div className="mh">
                <span className="t">{modal.title}（{t("全部")} {has.length} {t("款")}）</span>
                <span className="d">{t("竖线 = 所有模型的中间水平")}（{med} {t("分")}）</span>
                <button className="x" onClick={() => setModal(null)} aria-label={t("关闭")}>×</button>
              </div>
              <div className="mb">{has.map((m, i) => dimRow(m, i, modal.k, med, R))}</div>
            </div>
          </div>
        );
      })()}

      {/* 悬浮提示(fptip=数据浮层 / htip=表头说明白卡) */}
      {tip && (
        <div className={tip.wide ? "htip" : "fptip"}
          style={{ left: tip.x, top: tip.y, opacity: 1, transform: tip.below ? "translate(-50%,0)" : "translate(-50%,-100%)" }}>
          {tip.node}
        </div>
      )}
    </>
  );
}
