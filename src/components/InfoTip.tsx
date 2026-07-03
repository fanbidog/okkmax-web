"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

/** 指数公式公示浮层:ⓘ 图标(或自定义 trigger),悬停/点击弹白卡 —— 一句说明 + 可选公式 + 可选查看更多。 */
export function InfoTip({ desc, formula, align = "center", trigger, more = true, width = 340 }: {
  desc: string; formula?: string; align?: "left" | "right" | "center"; trigger?: React.ReactNode; more?: boolean; width?: number;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = () => { if (t.current) clearTimeout(t.current); if (!open) t.current = setTimeout(() => setOpen(true), 350); };
  const hide = () => { if (t.current) clearTimeout(t.current); t.current = setTimeout(() => setOpen(false), 160); };
  // 默认相对 ⓘ 图标水平居中;靠边的(如头部综合分)用 right 防溢出
  const pos = align === "right" ? { right: 0 } : align === "left" ? { left: 0 } : { left: "50%", transform: "translateX(-50%)" };
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 3 }} onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-label={tr("说明")}
        onClick={() => { if (t.current) clearTimeout(t.current); setOpen((v) => !v); }}
        style={{ display: "inline-flex", padding: 5, margin: -5, border: "none", background: "none", color: "var(--ink3)", cursor: "pointer", lineHeight: 0 }}
      >
        {trigger ?? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9.5" /><path d="M12 16.5v-4.5" /><path d="M12 7.9h.01" />
          </svg>
        )}
      </button>
      {open && (
        <span
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 6px)", ...pos, zIndex: 30, width, maxWidth: "78vw", padding: "15px 17px 12px",
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14,
            boxShadow: "0 16px 44px -12px rgba(20,12,8,.22)", textAlign: "left", cursor: "default", fontWeight: 400,
          }}
        >
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.7 }}>{desc}</span>
          {formula && (
            <span style={{
              display: "block", marginTop: 10, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
              fontSize: 12, color: "var(--ink)", fontWeight: 500, lineHeight: 1.5, letterSpacing: "-.01em",
            }}>{formula}</span>
          )}
          {more && <Link href="/help#scoring" style={{ display: "block", textAlign: "right", marginTop: 11, fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{tr("查看更多")} →</Link>}
        </span>
      )}
    </span>
  );
}
