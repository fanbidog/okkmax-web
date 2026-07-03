"use client";
import { useState } from "react";

/** 共享的自定义下拉(可用性页 / 站点页通用)。 */
export function Dropdown({ label, value, options, onPick }: { label: string; value: string; options: [string, string][]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find(([k]) => k === value)?.[1] ?? "";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 11px", border: "1px solid var(--line2)", borderRadius: 10, background: "var(--surface)", fontSize: 13, fontFamily: "inherit", color: "var(--ink)", cursor: "pointer" }}
      >
        <span style={{ color: "var(--ink3)" }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{current}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: ".15s" }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: 42, left: 0, minWidth: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--sh-float)", padding: 5, zIndex: 50, whiteSpace: "nowrap" }}>
            {options.map(([k, l]) => (
              <div
                key={k}
                onClick={() => { onPick(k); setOpen(false); }}
                onMouseEnter={(e) => { if (k !== value) e.currentTarget.style.background = "var(--bg2)"; }}
                onMouseLeave={(e) => { if (k !== value) e.currentTarget.style.background = "transparent"; }}
                style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: k === value ? "var(--accent-d)" : "var(--ink)", fontWeight: k === value ? 600 : 400, background: k === value ? "var(--accent-50)" : "transparent" }}
              >
                {l}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
