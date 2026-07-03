"use client";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";

/** 指数卡标尺上的白点:悬浮或点击显示数值(与综合对比雷达图一致)。 */
export function IdxPointer({ pct, label }: { pct: number; label: string }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <span
      className="idx-ptr"
      style={{ left: `${pct}%` }}
      role="button"
      tabIndex={0}
      aria-label={`${t("数值")} ${label}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((v) => !v)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShow((v) => !v); } }}
    >
      {show && <span className="idx-tip">{label}</span>}
    </span>
  );
}
