"use client";
import { useState } from "react";
import { TierTag } from "./Tag";
import { UptimeHeatmap } from "./UptimeHeatmap";
import { useT } from "@/components/LocaleProvider";

/** 去浮点噪声:0.08000000000000002 → 0.08(最多 4 位小数,去尾零)。 */
const yuan = (n: number) => Number(n.toFixed(4));

// 展开里每半边的行:整条 borderBottom 连续(不被列间距切成几段)
const hRow: React.CSSProperties = { display: "flex", gap: 14, padding: "4px 0 6px", borderBottom: "1px solid var(--line2)", color: "var(--ink3)", fontSize: 11.5 };
const dRow: React.CSSProperties = { display: "flex", gap: 14, padding: "7px 0", borderBottom: "1px solid var(--line)" };
const cName: React.CSSProperties = { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, color: "var(--ink)" };
const cNum: React.CSSProperties = { width: 96, textAlign: "right", whiteSpace: "nowrap", fontSize: 12.5, fontVariantNumeric: "tabular-nums" };
const cCache: React.CSSProperties = { width: 60, textAlign: "right", whiteSpace: "nowrap", fontSize: 12.5, color: "var(--ink3)" };

export interface GMModel { id: string; in: number | null; out: number | null; cache: number | null; ratio: number | null; }
export interface GMGroup {
  name: string; ratio: number | null; startPrice: number | null;
  score: number | null; actualModel: string | null; modelDowngraded: boolean | null;
  latencyMs: number | null; avail: number | null; points: { av: number }[] | null;
  models: GMModel[];
}

/** 「按分组」视图:每个分组一行(含掺水/延迟/在线率/趋势,来自该组监测模型),默认收起;点开展开该组全部模型与价格。 */
export function GroupModelTable({ groups, period }: { groups: GMGroup[]; period: string }) {
  const t = useT();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (name: string) => setOpen((s) => { const n = new Set(s); if (n.has(name)) n.delete(name); else n.add(name); return n; });

  return (
    <div className="card flat-x" style={{ marginBottom: 16 }}>
      <table className="gm-table tbl-strong">
        <thead><tr>
          <td style={{ textAlign: "left" }}>{t("分组")}</td>
          <td style={{ textAlign: "right" }}>{t("倍率")}</td>
          <td style={{ textAlign: "right" }}>{t("输入/输出")}</td>
          <td style={{ textAlign: "right" }}>{t("纯度")}</td>
          <td style={{ textAlign: "right" }}>{t("延迟")}</td>
          <td style={{ textAlign: "right" }}>{t("在线率")}</td>
          <td style={{ textAlign: "right" }}>{t("趋势")}</td>
        </tr></thead>
        <tbody>
          {groups.length ? groups.map((g) => {
            const isOpen = open.has(g.name);
            return (
              <GroupRows key={g.name} g={g} isOpen={isOpen} onToggle={() => toggle(g.name)} period={period} />
            );
          }) : <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: "18px 0" }}>{t("暂无分组")}</td></tr>}
        </tbody>
      </table>
      <div style={{ padding: "9px 18px", fontSize: 12, color: "var(--ink3)", borderTop: "1px solid var(--line)" }}>{t("点击分组展开全部模型")}</div>
    </div>
  );
}

function GroupRows({ g, isOpen, onToggle, period }: { g: GMGroup; isOpen: boolean; onToggle: () => void; period: string }) {
  const t = useT();
  return (
    <>
      <tr onClick={onToggle} className={"gm-head" + (isOpen ? " open" : "")} style={{ borderTop: "2px solid var(--line)" }}>
        <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-block", width: 14, color: "var(--ink3)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .12s" }}>›</span>
          <span style={{ fontWeight: 600 }}>{g.name}</span>
          <span style={{ color: "var(--ink3)", fontSize: 12, marginLeft: 7 }}>{g.models.length} {t("模型")}</span>
        </td>
        <td style={{ textAlign: "right" }}>{g.ratio != null ? `${g.ratio}x` : "—"}</td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{g.startPrice != null ? `¥${yuan(g.startPrice)} ${t("起")}` : "—"}</td>
        <td style={{ textAlign: "right" }}>{g.score != null ? <TierTag score={g.score} /> : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
        <td style={{ textAlign: "right" }}>{g.latencyMs != null ? `${(g.latencyMs / 1000).toFixed(1)}s` : "—"}</td>
        <td style={{ textAlign: "right", fontWeight: 600 }}>{g.avail != null ? `${g.avail.toFixed(0)}%` : "—"}</td>
        {/* 趋势图格子不参与整行展开/收起:悬浮看趋势时误点不该把分组折叠 */}
        <td style={{ textAlign: "right", cursor: "default" }} onClick={(e) => e.stopPropagation()}>{g.points ? <div style={{ display: "inline-block", width: 150 }}><UptimeHeatmap points={g.points} period={period} height={20} /></div> : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
      </tr>
      {isOpen && (() => {
        const mid = Math.ceil(g.models.length / 2);
        const halves = [g.models.slice(0, mid), g.models.slice(mid)];
        return (
          <tr className="gm-exp">
            <td colSpan={7} style={{ padding: 0 }}>
              <div style={{ background: "var(--bg2)", padding: "8px 24px 12px 36px", borderLeft: "2px solid var(--accent)" }}>
                <div style={{ display: "flex", gap: 56, alignItems: "flex-start" }}>
                  {halves.map((half, ci) => half.length ? (
                    <div key={ci} style={{ flex: 1, minWidth: 0 }}>
                      <div style={hRow}><span style={{ flex: 1 }}>{t("模型")}</span><span style={{ width: 96, textAlign: "right" }}>{t("输入 / 输出")}</span><span style={{ width: 60, textAlign: "right" }}>{t("缓存")}</span></div>
                      {half.map((m) => (
                        <div key={m.id} className="gm-mrow" style={dRow}>
                          <span style={cName} title={m.id}>{m.id}</span>
                          <span style={{ ...cNum, color: m.in != null ? "var(--ink2)" : "var(--ink3)" }}>{m.in != null && m.out != null ? `¥${yuan(m.in)} / ¥${yuan(m.out)}` : "—"}</span>
                          <span style={cCache}>{m.cache != null ? `¥${yuan(m.cache)}` : "—"}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div key={ci} style={{ flex: 1 }} />)}
                </div>
              </div>
            </td>
          </tr>
        );
      })()}
    </>
  );
}
