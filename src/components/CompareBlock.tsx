import { RadarInteractive } from "./RadarInteractive";

export interface CmpMetric { label: string; value: string; sub: string; pct: number }

/** 综合对比:左雷达(悬浮/点击顶点看数值)+ 右「指标 + 进度条」,左右各半。 */
export function CompareBlock({ dims, metrics }: {
  dims: Record<string, number>; metrics: CmpMetric[];
}) {
  return (
    <div className="card pad bare cmp-grid" style={{ marginBottom: 16, display: "grid", alignItems: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <RadarInteractive dims={dims} size={236} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {metrics.map((m) => (
          <div key={m.label}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</span>
              <span style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink3)", margin: "3px 0 7px" }}>{m.sub}</div>
            <div style={{ height: 7, borderRadius: 4, background: "var(--bg2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, m.pct))}%`, borderRadius: 4, background: "#f0a98c" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
