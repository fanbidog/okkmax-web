"use client";
import Link from "next/link";
import { UptimeHeatmap } from "./UptimeHeatmap";
import { ServiceLogo, SERVICE_LABEL } from "./ServiceIcon";
import { STATUS_COLOR } from "@/lib/uptimeColor";
import { useT } from "@/components/LocaleProvider";

export interface AvailChannel {
  group: string;
  service: string; // cc/cx/gm
  model: string;
  statusKey: "ok" | "warn" | "down" | "none";
  statusText: string;
  avg: number | null;
  latency: string;
  points: unknown;
  dot: string; // availabilityToColor
}
export interface AvailCard {
  name: string;
  slug: string;
  logoUrl: string | null;
  statusText: string;
  statusColor: string;
  avgUptime: string;
  avgLatency: string;
  avgUptimeNum: number | null;
  avgLatencyNum: number | null;
  channels: AvailChannel[];
  defaultOpen: boolean;
}

const COLS = "140px 50px 116px 76px 82px 74px minmax(116px,1fr)";

export function StationAvailCard({ card, period, open, showAll, onToggle, onToggleGroups }: { card: AvailCard; period: string; open: boolean; showAll: boolean; onToggle: () => void; onToggleGroups: () => void }) {
  const t = useT();
  // showAll 由父组件控制(展开全部时连分组一起全显);默认只显前 3 个分组
  const shown = showAll ? card.channels : card.channels.slice(0, 3);

  // 收起态:每个服务一个概览点(该服务有异常则红)
  const svcSummary = (() => {
    const m: Record<string, "ok" | "bad"> = {};
    for (const c of card.channels) {
      if (m[c.service] === "bad") continue;
      m[c.service] = c.statusKey === "down" || c.statusKey === "warn" ? "bad" : "ok";
    }
    return Object.entries(m);
  })();

  return (
    <div className="card av-card" style={{ padding: "18px 22px", marginBottom: 14 }}>
      <div className="avail-cardhead" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {card.logoUrl
          ? <img src={card.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div className="lg" style={{ width: 36, height: 36, fontSize: 15 }}>{card.name.slice(0, 1)}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Link href={`/station/${card.slug}`} style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>{card.name}</Link>
            <span className="av-status" style={{ fontSize: 12.5, color: card.statusColor }}>● {t(card.statusText)}</span>
          </div>
          <div className="av-sub" style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
            {card.channels.length} {t("个监测")}
            {(() => { const d = card.channels.filter((c) => c.statusKey === "down").length; return d > 0 ? ` · ${d}/${card.channels.length} ${t("通道异常")}` : ""; })()}
          </div>
        </div>
        <div className="av-met" style={{ textAlign: "right" }}>
          <div className="av-met-l" style={{ fontSize: 11, color: "var(--ink3)" }}>{t("平均可用率")}</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{card.avgUptime}</div>
        </div>
        <div className="av-met" style={{ textAlign: "right", margin: "0 18px 0 22px" }}>
          <div className="av-met-l" style={{ fontSize: 11, color: "var(--ink3)" }}>{t("平均延迟")}</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{card.avgLatency}</div>
        </div>
        <button
          onClick={onToggle}
          aria-label={open ? t("收起") : t("展开")}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink3)", padding: 4, display: "flex" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: ".18s" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {!open ? (
        <div style={{ display: "flex", gap: 20, padding: "18px 2px 2px 48px", flexWrap: "wrap" }}>
          {svcSummary.map(([svc, st]) => (
            <span key={svc} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink2)" }}>
              <span style={{ display: "inline-flex" }}><ServiceLogo service={svc} size={15} /></span>
              {SERVICE_LABEL[svc] ?? svc}
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: st === "bad" ? STATUS_COLOR.down : STATUS_COLOR.ok }} />
            </span>
          ))}
        </div>
      ) : (
        <div className="avail-chans" style={{ marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 16, alignItems: "center", padding: "11px 6px 10px", fontSize: 11.5, fontWeight: 500, color: "var(--ink)", borderBottom: "1px solid var(--line)" }}>
            <div>{t("分组")}</div><div style={{ textAlign: "right" }}>{t("服务")}</div><div style={{ textAlign: "right" }}>{t("监测模型")}</div>
            <div style={{ textAlign: "right" }}>{t("状态")}</div><div style={{ textAlign: "right" }}>{t("平均延迟")}</div>
            <div style={{ textAlign: "right" }}>{t("可用率")}</div><div style={{ paddingLeft: 4 }}>{t("响应趋势")}</div>
          </div>
          {shown.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: COLS, gap: 16, alignItems: "center", padding: "12px 6px", fontSize: 13, fontWeight: 500, borderBottom: i < shown.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.group}</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><ServiceLogo service={c.service} size={17} /></div>
              <div style={{ fontWeight: 500, whiteSpace: "nowrap", textAlign: "right" }}>{c.model}</div>
              <div style={{ textAlign: "right", color: c.statusKey === "down" ? STATUS_COLOR.down : "var(--ink)" }}>{t(c.statusText)}</div>
              <div style={{ textAlign: "right", color: c.statusKey === "down" ? STATUS_COLOR.down : "var(--ink)" }}>{t(c.latency)}</div>
              <div style={{ textAlign: "right", fontWeight: 600 }}>{c.avg != null ? `${c.avg.toFixed(1)}%` : "—"}</div>
              <div style={{ paddingLeft: 4 }}><UptimeHeatmap points={c.points} period={period} height={18} /></div>
            </div>
          ))}
          {card.channels.length > 3 && (
            <button onClick={onToggleGroups} className="av-morebtn" style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", color: "var(--ink3)", fontSize: 12.5, padding: "11px 0 3px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {showAll ? t("收起") : `${t("展开剩余")} ${card.channels.length - 3} ${t("个分组")}`}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAll ? "rotate(180deg)" : "none", transition: ".18s" }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
