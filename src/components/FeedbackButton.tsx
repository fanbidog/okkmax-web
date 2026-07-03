"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { PointsCoin } from "@/components/PointsCoin";
import { useT } from "@/components/LocaleProvider";

const TABS = [
  { key: "basic", label: "基本信息勘误", ph: "请帮助反馈站点基本信息的错误或更新,如站名、网址、简介、成立时间、运营方、Logo 等。如有官方页面或截图佐证请一并附上。" },
  { key: "price", label: "价格变动", ph: "请说明哪个模型 / 分组的价格发生了变化,原价与现价分别是多少,并附上定价页链接或截图。" },
  { key: "model", label: "模型更新", ph: "请说明该站点新增或下线了哪些模型,建议附上官方模型列表或公告链接。" },
  { key: "other", label: "其他问题", ph: "其他需要我们核实或更正的信息,请尽量描述清楚并提供来源。" },
];

export function FeedbackButton({ stationId }: { stationId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(TABS[0].key);
  const [body, setBody] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  function close() { setOpen(false); setTimeout(() => { setTab(TABS[0].key); setBody(""); setSource(""); setDone(false); setErr(""); }, 180); }

  async function submit() {
    if (!body.trim()) { setErr(t("请填写反馈内容")); return; }
    if (busy) return; setBusy(true); setErr("");
    const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId, type: tab, body, source }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDone(true); else setErr(d.error || t("提交失败"));
    setBusy(false);
  }

  const cur = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <button className="iconbtn has-tip" aria-label={t("信息反馈(可赚积分)")} onClick={() => setOpen(true)} style={{ position: "relative", overflow: "visible" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
        <span style={{ position: "absolute", top: -6, right: -6, lineHeight: 0 }}><PointsCoin size={14} /></span>
        <span className="tip">{t("信息反馈 可赚积分")}</span>
      </button>

      {open && createPortal(
        <div className="fb-overlay" onMouseDown={close}>
          <div className="fb-modal" onMouseDown={(e) => e.stopPropagation()}>
            {done ? (
              <div style={{ padding: "44px 30px 40px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#E1F5EE", color: "#0F6E56", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{t("感谢反馈")}</div>
                <div style={{ fontSize: 13.5, color: "var(--ink2)", marginTop: 8, lineHeight: 1.6 }}>{t("我们会人工核实后更新该站点信息。")}</div>
                <button className="btn-accent" onClick={close} style={{ marginTop: 22, padding: "9px 30px", fontSize: 14 }}>{t("完成")}</button>
              </div>
            ) : (
              <>
                <div className="fb-head">
                  <span className="fb-title">{t("提交反馈")}</span>
                  <button className="fb-x" onClick={close} aria-label={t("关闭")}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                </div>
                <div className="fb-body">
                  <div className="fb-label">{t("反馈类型")}</div>
                  <div className="fb-tabs">
                    {TABS.map((tb) => (
                      <button key={tb.key} className={"fb-tab" + (tb.key === tab ? " on" : "")} onClick={() => setTab(tb.key)}>{t(tb.label)}</button>
                    ))}
                  </div>
                  <textarea className="fb-area" value={body} onChange={(e) => setBody(e.target.value)} placeholder={t(cur.ph)} />
                  <input className="fb-src" value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("请提供相关来源链接或说明情况")} />
                  {err && <div style={{ fontSize: 13, color: "var(--red)", marginTop: 10 }}>{err}</div>}
                </div>
                <div className="fb-foot">
                  <button className="fb-cancel" onClick={close}>{t("取消")}</button>
                  <button className="btn-accent" onClick={submit} disabled={busy} style={{ padding: "9px 26px", fontSize: 14 }}>{busy ? t("提交中…") : t("完成")}</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
