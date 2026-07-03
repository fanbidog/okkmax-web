"use client";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/LocaleProvider";

const MODELS = ["Claude", "GPT", "Gemini"];
const PAYMENTS = ["支付宝", "微信", "USDT", "银行卡", "信用卡", "PayPal"];
const TRI = ["支持", "不支持", "其他"];

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
function Opt({ on, onClick, radio, children }: { on: boolean; onClick: () => void; radio?: boolean; children: React.ReactNode }) {
  return <span className={"opt" + (on ? " on" : "") + (radio ? " radio" : "")} onClick={onClick}><span className="box"><Check /></span>{children}</span>;
}

export function SubmitForm() {
  const t = useT();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intro, setIntro] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [payments, setPayments] = useState<string[]>([]);
  const [invoice, setInvoice] = useState("");
  const [invoiceOther, setInvoiceOther] = useState("");
  const [refund, setRefund] = useState("");
  const [refundOther, setRefundOther] = useState("");
  const [promo, setPromo] = useState("");
  const [contact, setContact] = useState("");
  const [probeAccount, setProbeAccount] = useState("");
  const [pwd, setPwd] = useState("");
  const [note, setNote] = useState("");

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  function genPwd() {
    const up = "ABCDEFGHJKLMNPQRSTUVWXYZ", low = "abcdefghijkmnpqrstuvwxyz", dig = "23456789", sp = "!@#$%^&*";
    const all = up + low + dig + sp;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    let p = pick(up) + pick(low) + pick(dig) + pick(sp);
    for (let i = 0; i < 8; i++) p += pick(all);
    setPwd(p.split("").sort(() => Math.random() - 0.5).join(""));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const need = (v: string) => v.trim().length > 0;
    if (!need(name) || !need(url)) return setErr(t("请填写站点名称和站点 URL"));
    if (!need(intro)) return setErr(t("请填写网站介绍"));
    if (payments.length === 0) return setErr(t("请选择支付方式"));
    if (!invoice) return setErr(t("请选择发票"));
    if (invoice === "其他" && !need(invoiceOther)) return setErr(t("请填写发票说明"));
    if (!refund) return setErr(t("请选择退款政策"));
    if (refund === "其他" && !need(refundOther)) return setErr(t("请填写退款政策说明"));
    if (!need(contact)) return setErr(t("请填写联系方式"));
    if (!need(probeAccount) || !need(pwd)) return setErr(t("请填写探测账户与密码"));

    setErr(""); setBusy(true);
    const fd = new FormData();
    fd.set("name", name); fd.set("url", url); fd.set("intro", intro);
    models.forEach((m) => fd.append("models", m));
    fd.set("payment", payments.join("、"));
    fd.set("invoice", invoice === "其他" ? invoiceOther : invoice);
    fd.set("refund", refund === "其他" ? refundOther : refund);
    fd.set("promo", promo); fd.set("contact", contact);
    fd.set("probeAccount", probeAccount); fd.set("probePassword", pwd); fd.set("note", note);
    const res = await fetch("/api/submissions", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDone(true); else setErr(d.error || t("提交失败"));
    setBusy(false);
  }

  if (done) return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "60px 24px", textAlign: "center", margin: "0 auto", maxWidth: 560 }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--ok-50)", color: "var(--ok)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{t("提交成功")}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink2)", marginTop: 8, lineHeight: 1.6 }}>{t("我们会人工核实后决定是否收录,感谢你的推荐。")}</div>
    </div>
  );

  return (
    <form className="sform" onSubmit={submit}>
      <div className="row2">
        <div><div className="lbrow"><label className="lb">{t("站点名称")}<span className="req">*</span></label><span style={{ fontSize: 12, color: "var(--ink3)" }}>{name.length}/80</span></div><input className="inp" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("例:OpenRouter")} /></div>
        <div><label className="lb">{t("站点 URL")}<span className="req">*</span></label><input className="inp" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={200} placeholder="https://example.com" /></div>
      </div>

      <div>
        <div className="lbrow"><label className="lb">{t("网站介绍")}<span className="req">*</span></label><span style={{ fontSize: 12, color: "var(--ink3)" }}>{intro.length}/200</span></div>
        <textarea className="inp" value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={200} rows={4} placeholder={t("请介绍站点定位、主要优势、服务特点、价格/稳定性/售后等信息。")} />
        <div className="hint">{t("这段会展示在站点详情页,也影响排名和用户点击,请认真填写。")}</div>
      </div>

      <div>
        <label className="lb">{t("支持模型")}</label>
        <div className="opts">{MODELS.map((m) => <Opt key={m} on={models.includes(m)} onClick={() => toggle(models, setModels, m)}>{m}</Opt>)}</div>
      </div>

      <div>
        <label className="lb">{t("支付方式")}<span className="req">*</span></label>
        <div className="opts">{PAYMENTS.map((p) => <Opt key={p} on={payments.includes(p)} onClick={() => toggle(payments, setPayments, p)}>{t(p)}</Opt>)}</div>
      </div>

      <div>
        <label className="lb">{t("发票")}<span className="req">*</span></label>
        <div className="opts">
          {TRI.map((v) => <Opt key={v} radio on={invoice === v} onClick={() => setInvoice(v)}>{t(v)}</Opt>)}
          {invoice === "其他" && <input className="inp other-inp" value={invoiceOther} onChange={(e) => setInvoiceOther(e.target.value)} maxLength={60} placeholder={t("请填写说明,如:有条件可开")} />}
        </div>
      </div>

      <div>
        <label className="lb">{t("退款政策")}<span className="req">*</span></label>
        <div className="opts">
          {TRI.map((v) => <Opt key={v} radio on={refund === v} onClick={() => setRefund(v)}>{t(v)}</Opt>)}
          {refund === "其他" && <input className="inp other-inp" value={refundOther} onChange={(e) => setRefundOther(e.target.value)} maxLength={60} placeholder={t("请填写说明,如:7天无理由 / 仅赠送额度不退")} />}
        </div>
      </div>

      <div>
        <div className="lbrow"><label className="lb">{t("优惠活动")}<span className="opt">{t("选填")}</span></label><span style={{ fontSize: 12, color: "var(--ink3)" }}>{promo.length}/120</span></div>
        <input className="inp" value={promo} onChange={(e) => setPromo(e.target.value)} maxLength={120} placeholder={t("例:新用户注册送 $5 体验额度 / 充值满 ¥100 送 ¥30")} />
      </div>

      <div className="divnote">{t("以下仅用于人工核实与持续监测,不会公开展示")}</div>

      <div><label className="lb">{t("联系方式")}<span className="req">*</span></label><input className="inp" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder={t("微信 / QQ号 / 手机号 / Telegram 等")} /></div>

      <div className="row2">
        <div><label className="lb">{t("探测账户")}<span className="req">*</span></label><input className="inp" value={probeAccount} onChange={(e) => setProbeAccount(e.target.value)} maxLength={120} placeholder={t("账户名,收录后将持续探测,请确保额度充足")} /></div>
        <div>
          <div className="lbrow">
            <label className="lb">{t("探测账户密码")}<span className="req">*</span></label>
            <button type="button" className="genpw" onClick={genPwd}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18v3h3l11-11-3-3L2 18zM14.5 5.5l3 3" /></svg>{t("生成密码")}</button>
          </div>
          <input className="inp" value={pwd} onChange={(e) => setPwd(e.target.value)} maxLength={120} placeholder={t("大小写字母 + 数字 + 特殊符号,大于 8 位")} />
        </div>
      </div>

      <div><div className="lbrow"><label className="lb">{t("备注")}</label><span style={{ fontSize: 12, color: "var(--ink3)" }}>{note.length}/500</span></div><textarea className="inp" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder={t("补充审核需要知道的信息,可留空。")} /></div>

      {err && <div className="ferr">{err}</div>}
      <div className="submit-row"><button type="submit" className="btn-accent" disabled={busy} style={{ padding: "13px 44px", fontSize: 15 }}>{busy ? t("提交中…") : t("提交申请")}</button></div>
    </form>
  );
}
