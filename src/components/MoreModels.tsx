"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { prettyModel } from "@/lib/headline";

export interface ModelMeta { id: string; family: string; minPrice: number | null; }

export function MoreModels({ models, selected, active }: { models: ModelMeta[]; selected: string; active: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [q, setQ] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const sp = useSearchParams();
  // 下拉用 fixed 定位锚到按钮,避开 选模型 行的 overflow-x 裁切(否则手机端弹不出来)
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const w = 280;
      let left = r.right - w;                 // 右对齐「更多」按钮,向左展开(按钮在最右,永不溢出右屏)
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 6, left });
    }
    setOpen(true);
  };
  // 下拉是 fixed 定位:滚动/缩放时跟随按钮重新定位(框内滚动、键盘弹出都不关),仅当按钮滚出视口才关
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return; }
      const w = 280;
      let left = r.right - w;                 // 右对齐「更多」按钮,向左展开(按钮在最右,永不溢出右屏)
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 6, left });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [open]);
  const go = (id: string) => { const p = new URLSearchParams(sp.toString()); p.set("m", id); router.push(`?${p.toString()}`, { scroll: false }); setOpen(false); setQ(""); };
  const ql = q.trim().toLowerCase();
  const filtered = ql ? models.filter((m) => m.id.toLowerCase().includes(ql) || m.family.toLowerCase().includes(ql) || prettyModel(m.id).toLowerCase().includes(ql)) : models;
  const byFamily = filtered.reduce((acc, m) => { (acc[m.family] ??= []).push(m); return acc; }, {} as Record<string, ModelMeta[]>);
  const FAMILY_ORDER = ["Claude", "GPT / Codex", "Gemini", "DeepSeek", "GLM", "Kimi", "Mimo", "MiniMax", "通义千问", "其他"];
  const famEntries = Object.entries(byFamily).sort((a, b) => {
    const ia = FAMILY_ORDER.indexOf(a[0]); const ib = FAMILY_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return (
    <span className="mm-more">
      <button ref={btnRef} className={active ? "pill on" : "pill"} onClick={() => (open ? setOpen(false) : openMenu())} style={active ? undefined : { borderStyle: "dashed" }} title={active ? selected : undefined}>
        {active ? <span style={{ display: "inline-block", maxWidth: 92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>{prettyModel(selected)}</span> : t("更多")} ▾
      </button>
      {open && pos && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "fixed", top: pos.top, left: pos.left, width: 280, maxHeight: 360, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--line2)", borderRadius: 11, boxShadow: "var(--sh-float)", zIndex: 41, padding: 8 }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("🔍 搜模型 / 家族…")} className="mm-search-inp" style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid var(--line2)", borderRadius: 7, background: "var(--bg2)", marginBottom: 6, fontFamily: "inherit", outline: "none" }} />
            {famEntries.map(([fam, ms]) => (
              <div key={fam}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", padding: "8px 8px 4px", letterSpacing: ".05em" }}>{t(fam).toUpperCase()}</div>
                {ms.map((m) => (
                  <div key={m.id} title={m.id} onClick={() => go(m.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12.5, background: m.id === selected ? "var(--accent-50)" : undefined, color: m.id === selected ? "var(--accent-d)" : "var(--ink2)", fontWeight: m.id === selected ? 600 : 400 }}>
                    <span>{prettyModel(m.id)}</span>{m.minPrice != null && <span style={{ fontSize: 11.5, color: "var(--ink3)" }}>¥{m.minPrice}</span>}
                  </div>
                ))}
              </div>
            ))}
            {!filtered.length && <div style={{ padding: 12, color: "var(--ink3)", fontSize: 12, textAlign: "center" }}>{t("无匹配")}</div>}
          </div>
        </>,
        document.body,
      )}
    </span>
  );
}
