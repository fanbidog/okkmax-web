"use client";
import { useState } from "react";
import { availabilityToColor } from "@/lib/uptimeColor";
import { useT } from "@/components/LocaleProvider";

type TPoint = { t?: number; av: number; st?: number; lat?: number; sc?: Record<string, number> };
const STATUS: Record<number, string> = { 1: "可用", 2: "降级", 0: "不可用" };
const MAIN = new Set(["available", "degraded", "unavailable", "missing"]);
const ERR: Record<string, string> = {
  slow_latency: "响应过慢", rate_limit: "被限流", server_error: "服务端报错", client_error: "请求被拒",
  auth_error: "密钥失效", invalid_request: "请求无效", network_error: "连接失败", response_timeout: "超时无响应", content_mismatch: "答案不符",
};

function fmtTime(t: number | undefined, period: string): string {
  if (!t) return "";
  const d = new Date(t * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  if (period === "90m") return `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (period === "24h") return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:00`;
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function UptimeHeatmap({ points, period = "7d", height = 26 }: { points?: unknown; period?: string; height?: number }) {
  const t = useT();
  const arr = (Array.isArray(points) ? points : []) as TPoint[];
  const [hover, setHover] = useState<{ x: number; top: number; bottom: number; p: TPoint } | null>(null);
  if (!arr.length) return <span style={{ color: "var(--ink3)" }}>—</span>;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* 点多(90m 档 ~46 个)时缝隙减半 + 允许条块收缩,总宽永远吃不破容器(曾在详情页溢出 12px) */}
      <div style={{ display: "flex", gap: arr.length > 36 ? 1 : 2, height }}>
        {arr.map((p, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 3,
              background: p.av < 0 ? "var(--line2)" : availabilityToColor(p.av),
              opacity: p.av < 0 ? 0.5 : 0.85,
              cursor: "default", // 条块只有悬浮详情、无点击行为,别用 pointer 暗示可点(整行跳转已在外层格子阻断)
              transition: "opacity .15s",
            }}
            onMouseEnter={p.av >= 0 ? (e) => { const r = e.currentTarget.getBoundingClientRect(); setHover({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom, p }); } : undefined}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </div>
      {hover && (
        <div
          style={{
            // 顶部空间不够(表格前几行)就翻到条块下方弹,不再冲出视口;左右夹紧防出屏。
            // 短行 nowrap 定卡片宽(紧凑不折字),只有「异常原因」行允许内部换行(见下)。
            position: "fixed",
            top: hover.top < 210 ? hover.bottom + 8 : hover.top - 8,
            transform: hover.top < 210 ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            left: Math.min(Math.max(hover.x, 132), (typeof window !== "undefined" ? window.innerWidth : 9999) - 132),
            background: "var(--surface)", color: "var(--ink)", fontSize: 12, lineHeight: 1.65,
            padding: "9px 12px", borderRadius: 10, zIndex: 30, whiteSpace: "nowrap",
            border: "1px solid var(--line2)", boxShadow: "var(--sh-float)", pointerEvents: "none",
          }}
        >
          {(() => {
            const sc = hover.p.sc ?? {};
            const a = sc.available ?? 0, d = sc.degraded ?? 0, u = sc.unavailable ?? 0;
            const total = a + d + u;
            const errs = Object.entries(sc).filter(([k, v]) => !MAIN.has(k) && v > 0).map(([k, v]) => `${t(ERR[k] ?? k)} ${v}`);
            const dot = (c: string) => <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c, marginRight: 5, verticalAlign: "middle" }} />;
            return <>
              <div style={{ color: "var(--ink3)", fontSize: 11.5 }}>{fmtTime(hover.p.t, period) || "—"}</div>
              <div style={{ fontWeight: 500 }}>{t("可用率")} {hover.p.av.toFixed(1)}%{STATUS[hover.p.st ?? -1] ? `(${t(STATUS[hover.p.st ?? -1])})` : ""}</div>
              {total > 0 && <div style={{ color: "var(--ink3)" }}>{t("监测")} {total} {t("次")}{hover.p.lat ? `,${t("延迟")} ${hover.p.lat}ms` : ""}</div>}
              {total > 0 && <div style={{ display: "flex", gap: 12, marginTop: 1 }}>
                <span>{dot("#22c55e")}{t("可用")} {a}</span>
                <span>{dot("#eab308")}{t("波动")} {d}</span>
                <span>{dot("#ef4444")}{t("不可用")} {u}</span>
              </div>}
              {errs.length > 0 && <div style={{ color: "var(--ink3)", whiteSpace: "normal", maxWidth: 236 }}>{t("异常原因")}:{errs.join(t("、"))}</div>}
            </>;
          })()}
        </div>
      )}
    </div>
  );
}
