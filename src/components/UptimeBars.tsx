import type { CSSProperties } from "react";

type TPoint = { av: number; st: number };

/** 可用率趋势 bar:按每桶 availability 上色(绿≥98 / 琥珀≥90 / 红<90 / 缺省灰)。 */
export function UptimeBars({ points, max = 14 }: { points?: unknown; max?: number }) {
  const arr = (Array.isArray(points) ? points : []) as TPoint[];
  const valid = arr.filter((p) => p && typeof p.av === "number");
  if (!valid.length) return <span style={{ color: "var(--ink3)" }}>—</span>;
  const recent = valid.slice(-max);
  return (
    <span className="up">
      {recent.map((p, i) => {
        let cls = "";
        let style: CSSProperties | undefined;
        if (p.av < 0) style = { opacity: 0.18 };
        else if (p.av < 90) cls = "r";
        else if (p.av < 98) cls = "a";
        return <i key={i} className={cls} style={style} />;
      })}
    </span>
  );
}
