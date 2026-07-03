"use client";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";

/** 可交互雷达:鼠标悬浮或点击某个顶点,弹出该维度数值。 */
export function RadarInteractive({ dims, size = 216 }: { dims: Record<string, number>; size?: number }) {
  const t = useT();
  const labels = Object.keys(dims);
  const n = labels.length;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 40;
  const ang = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const val = (l: string) => Math.max(0, Math.min(100, dims[l]));
  const ringPoly = (f: number) => labels.map((_, i) => pt(i, R * f).join(",")).join(" ");
  const dataPoly = labels.map((l, i) => pt(i, R * (val(l) / 100)).join(",")).join(" ");
  const [active, setActive] = useState<number | null>(null);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.34, 0.67, 1].map((f) => <polygon key={f} points={ringPoly(f)} fill="none" stroke="var(--line2)" strokeWidth={1} />)}
        {labels.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line2)" strokeWidth={1} />; })}
        <polygon points={dataPoly} fill="rgba(224,81,43,0.12)" stroke="var(--accent)" strokeWidth={1.5} />
        {labels.map((l, i) => {
          const [x, y] = pt(i, R * (val(l) / 100));
          return (
            <g key={l}>
              <circle cx={x} cy={y} r={active === i ? 4 : 2.5} fill="var(--accent)" />
              <circle cx={x} cy={y} r={15} fill="transparent" style={{ cursor: "pointer" }}
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                onClick={() => setActive((a) => (a === i ? null : i))} />
            </g>
          );
        })}
        {labels.map((l, i) => { const [x, y] = pt(i, R + 16); return <text key={l} x={x} y={y} fontSize={10.5} fontWeight={600} fill="var(--ink2)" textAnchor="middle" dominantBaseline="middle">{t(l)}</text>; })}
      </svg>
      {active != null && (() => {
        const [x, y] = pt(active, R * (val(labels[active]) / 100));
        return (
          <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-128%)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px -8px rgba(0,0,0,.22)", padding: "7px 12px", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 5 }}>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 2 }}>{t(labels[active])}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />{Math.round(dims[labels[active]])}</div>
          </div>
        );
      })()}
    </div>
  );
}
