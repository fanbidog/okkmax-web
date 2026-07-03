"use client";
import { useT } from "@/components/LocaleProvider";

// 五维雷达图(站点画像)。dims: { 维度名: 0-100 }。
export function Radar({ dims, size = 150 }: { dims: Record<string, number>; size?: number }) {
  const t = useT();
  const labels = Object.keys(dims);
  const n = labels.length;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 40;
  const ang = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const ringPoly = (f: number) => labels.map((_, i) => pt(i, R * f).join(",")).join(" ");
  const dataPoly = labels.map((l, i) => pt(i, R * (Math.max(0, Math.min(100, dims[l])) / 100)).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {[0.34, 0.67, 1].map((f) => (
        <polygon key={f} points={ringPoly(f)} fill="none" stroke="var(--line2)" strokeWidth={1} />
      ))}
      {labels.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line2)" strokeWidth={1} />; })}
      <polygon points={dataPoly} fill="rgba(224,81,43,0.12)" stroke="var(--accent)" strokeWidth={1.5} />
      {labels.map((l, i) => {
        const r = R * (Math.max(0, Math.min(100, dims[l])) / 100);
        const [x, y] = pt(i, r);
        return <circle key={"d" + i} cx={x} cy={y} r={2} fill="var(--accent)" />;
      })}
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 16);
        return <text key={l} x={x} y={y} fontSize={10.5} fontWeight={600} fill="var(--ink2)" textAnchor="middle" dominantBaseline="middle">{t(l)}</text>;
      })}
    </svg>
  );
}
