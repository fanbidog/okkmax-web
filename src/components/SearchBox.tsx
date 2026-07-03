"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useT } from "@/components/LocaleProvider";

interface Hit { slug: string; name: string; logoUrl: string | null; host: string | null; score: number | null; modelCount: number }

export function SearchBox() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Hit[] | null>(null);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K toggle, Esc close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // load once on first open, autofocus, reset on close
  useEffect(() => {
    if (open) {
      if (!data) fetch("/api/search").then((r) => r.json()).then((d) => setData(d.stations || [])).catch(() => setData([]));
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    setQ(""); setIdx(0);
  }, [open, data]);

  const results = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const all = data || [];
    const f = qq ? all.filter((s) => s.name.toLowerCase().includes(qq) || s.slug.toLowerCase().includes(qq) || (s.host?.toLowerCase().includes(qq) ?? false)) : all;
    return f.slice(0, 8);
  }, [q, data]);

  useEffect(() => { setIdx(0); }, [q]);

  const go = useCallback((slug: string) => { setOpen(false); router.push(`/station/${slug}`); }, [router]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = results[idx]; if (r) go(r.slug); }
  }

  // keep highlighted row in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  return (
    <>
      <button type="button" className="navsearch-btn" onClick={() => setOpen(true)} aria-label={t("搜索站点")}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      </button>

      {open && createPortal(
        <div className="sbx-overlay" onMouseDown={() => setOpen(false)}>
          <div className="sbx-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sbx-inrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink3)", flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t("输入站点名称…")}
                role="combobox" aria-expanded aria-controls="sbx-listbox" aria-autocomplete="list" aria-activedescendant={results[idx] ? `sbx-opt-${idx}` : undefined} />
              <kbd className="esc">esc</kbd>
            </div>

            <div className="sbx-list" ref={listRef} id="sbx-listbox" role="listbox">
              {data === null ? (
                <div className="sbx-empty">{t("加载中…")}</div>
              ) : results.length === 0 ? (
                <div className="sbx-empty">{q.trim() ? <>{t("未找到「")}{q.trim()}{t("」相关站点")}</> : t("暂无站点")}</div>
              ) : (
                results.map((r, i) => (
                  <button key={r.slug} type="button" data-i={i} id={`sbx-opt-${i}`} role="option" aria-selected={i === idx} className={"sbx-item" + (i === idx ? " on" : "")} onMouseEnter={() => setIdx(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(r.slug)}>
                    <span className="sbx-logo">{r.logoUrl ? <img src={r.logoUrl} alt="" /> : <span>{r.name.slice(0, 1)}</span>}</span>
                    <span className="sbx-meta">
                      <span className="nm">{r.name}</span>
                      {r.host && <span className="hs">{r.host}</span>}
                    </span>
                    <span className="sbx-models">{r.modelCount > 0 ? <><i>{t("模型")}</i>{r.modelCount}</> : ""}</span>
                    <span className="sbx-score">{r.score != null ? <><i>{t("综合分")}</i>{r.score}</> : ""}</span>
                  </button>
                ))
              )}
            </div>

            <div className="sbx-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> {t("选择")}</span>
              <span><kbd>↵</kbd> {t("打开")}</span>
              <span><kbd>esc</kbd> {t("关闭")}</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
