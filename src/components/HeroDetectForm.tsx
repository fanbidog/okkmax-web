"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addHistory } from "@/lib/history";
import { HEADLINE } from "@/lib/headline";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

/** 首页检测:横排(接口地址 / KEY / 目标模型 一行,上下文检测 + 检测放第二行)。
 *  模型直接指定(预置 HEADLINE + 自定义手填),不做自动探测——有些站不开 /v1/models。 */
export function HeroDetectForm({ stations = [] }: { stations?: { name: string; baseUrl: string; logoUrl: string | null }[] }) {
  const t = useT();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(HEADLINE[0].id); // 预置模型 id(只能选预置,不允许自定义)
  const [longCtx, setLongCtx] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);
  const urlWrapRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  // 点外面关下拉
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const tgt = e.target as Node;
      if (ddRef.current && !ddRef.current.contains(tgt)) setDdOpen(false);
      if (urlWrapRef.current && !urlWrapRef.current.contains(tgt)) setUrlOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const sel = HEADLINE.find((h) => h.id === model);
  const modelLabel = sel?.label ?? model;

  const ClearIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  );

  async function submit() {
    if (loading) return;
    if (!baseUrl.trim()) { toast(t("请填写 API 接口地址"), "err"); return; }
    if (!apiKey.trim()) { toast(t("请填写 API KEY"), "err"); return; }
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/detect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseUrl, apiKey, model, longContext: longCtx }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("提交失败"));
      addHistory({ jobId: data.jobId, baseUrl, host: baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, ""), model, at: new Date().toISOString() });
      router.push(`/r/${data.jobId}`);
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); setLoading(false); }
  }

  const uf = baseUrl.trim().toLowerCase();
  const stMatches = uf ? stations.filter((s) => s.name.toLowerCase().includes(uf) || s.baseUrl.toLowerCase().includes(uf)) : stations;

  return (
    <div className="dz">
      <div className="hdcard">
        <div className="hdrow3">
          {/* 接口地址 + 收录站点联想 */}
          <div className="hdf hdurl-wrap" ref={urlWrapRef}>
            <label>{t("API 接口地址")}</label>
            <div className="ipt">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input ref={urlRef} value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); setUrlOpen(true); }} onFocus={() => setUrlOpen(true)} placeholder="https://api.anthropic.com" />
              {baseUrl && <button type="button" className="ipt-clr" onClick={() => { setBaseUrl(""); setUrlOpen(false); urlRef.current?.focus(); }} aria-label={t("清除")}><ClearIcon /></button>}
            </div>
            {urlOpen && stations.length > 0 && (
              <div className="hdurl-list">
                {stMatches.length ? stMatches.map((s) => (
                  <button type="button" key={s.baseUrl} className="hdurl-item" onClick={() => { setBaseUrl(s.baseUrl); setUrlOpen(false); }}>
                    <span className="l">{s.logoUrl ? <img src={s.logoUrl} alt="" /> : <span className="lg">{s.name.slice(0, 1).toUpperCase()}</span>}<b>{s.name}</b></span>
                    <span className="u">{s.baseUrl}</span>
                  </button>
                )) : <div className="hddg" style={{ padding: "12px 14px" }}>{t("无匹配，直接粘贴接口地址也行")}</div>}
              </div>
            )}
          </div>

          {/* API KEY */}
          <div className="hdf">
            <label>API KEY</label>
            <div className="ipt">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.2-8.2M16 6l3 3M14 8l2 2" /></svg>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
              {apiKey && <button type="button" className="ipt-clr" onClick={() => setApiKey("")} aria-label={t("清除")}><ClearIcon /></button>}
            </div>
          </div>

          {/* 目标模型:预置 + 自定义(下拉里内嵌手填) */}
          <div className="hdf hddd-wrap" ref={ddRef}>
            <label>{t("目标模型")}</label>
            <button type="button" className={"hddd" + (ddOpen ? " open" : "")} onClick={() => setDdOpen((o) => !o)}>
              <span className="v">{modelLabel}{sel?.new && <span className="pnew">NEW</span>}</span>
              <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {ddOpen && (
              <div className="hddlist">
                {HEADLINE.map((h) => (
                  <button type="button" key={h.id} className={"hddi" + (h.id === model ? " on" : "")} onClick={() => { setModel(h.id); setDdOpen(false); }}>{h.label}{h.new && <span className="pnew">NEW</span>}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hdrow2">
          <div className={"hdadv" + (longCtx ? " on" : "")} onClick={() => setLongCtx((v) => !v)} role="checkbox" aria-checked={longCtx} tabIndex={0}>
            <span className="cb"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
            <span className="t">{t("上下文检测")}<span className="tm">{t("（预计增加耗时 30 秒）")}</span></span>
          </div>
          <button className="go" onClick={submit} disabled={loading}>{loading ? t("检测中…") : t("开始检测")}</button>
        </div>
      </div>
      <div className="hdcap"><span>{t("为保障账户安全,建议优先使用测试专用 KEY")}</span><a href="/history" target="_blank" rel="noopener">{t("检测历史")}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 5 }}><path d="m9 18 6-6-6-6" /></svg></a></div>
      {err && <div className="hderr">{err}</div>}
    </div>
  );
}
