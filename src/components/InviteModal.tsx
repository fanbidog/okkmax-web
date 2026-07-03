"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/Toast";
import { InviteArt } from "@/components/InviteArt";
import { useT } from "@/components/LocaleProvider";

type Data = { code: string; count: number; points: number; records: { name: string; at: string }[] };

// 复制:优先 Clipboard API(仅 https/localhost 可用),否则回退 execCommand,保证 http 局域网也能复制
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* 落到下面的回退 */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.top = "-9999px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export function InviteModal() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [showRecs, setShowRecs] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    async function onOpen() {
      try {
        const res = await fetch("/api/invite");
        if (res.status === 401) { window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "register" } })); return; }
        const d = await res.json();
        setData(d); setShowRecs(false); setOpen(true);
      } catch { toast(t("打开失败,请重试"), "err"); }
    }
    window.addEventListener("open-invite", onOpen);
    return () => window.removeEventListener("open-invite", onOpen);
  }, []);

  if (!open || !data) return null;
  const link = `${window.location.origin}/invite/${data.code}`;
  const copy = async (text: string, key: "code" | "link") => {
    if (await copyText(text)) { setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600); }
    else toast(t("复制失败,请手动复制"), "err");
  };
  const Check = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;

  return createPortal(
    <div className="iov" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="imodal">
        <button className="iclose" aria-label={t("关闭")} onClick={() => setOpen(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <InviteArt />
        <div className="ibody">
          <h3>{t("邀请好友,得 20 积分")}</h3>
          <div className="idesc">{t("分享你的专属邀请链接。好友通过链接注册成功后,")}<b>{t("你得 20 积分、好友得 10 积分")}</b>{t(",积分可兑换平台权益(邀请奖励每天上限 10 次)。")}</div>

          <div className="ifld">
            <div className="ilb">{t("邀请码")}</div>
            <div className="icode-row">
              <span className="icode">{data.code}</span>
              <button className="icpi" aria-label={t("复制邀请码")} onClick={() => copy(data.code, "code")}>{copied === "code" ? <Check /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>}</button>
            </div>
          </div>

          <div className="ifld">
            <div className="ilb">{t("邀请链接")}</div>
            <div className="ilinkbox">
              <input value={link} readOnly onFocus={(e) => e.target.select()} />
              <button className="icp" onClick={() => copy(link, "link")}>{copied === "link" ? <><Check />{t("已复制")}</> : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>{t("复制")}</>}</button>
            </div>
          </div>

          <hr className="idot" />
          <div className="ihist-head">
            <span className="it">{t("邀请历史")}</span>
            {data.count > 0 && <button className="iall" onClick={() => setShowRecs((s) => !s)}>{showRecs ? t("收起") : t("查看全部")} <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></button>}
          </div>
          {showRecs ? (
            <div className="irecs">{data.records.map((r, i) => <div className="irec" key={i}><span className="rn">{r.name}</span><span className="rt">{r.at}</span></div>)}</div>
          ) : (
            <div className="itiles">
              <div className="itile"><div className="iv">{data.count}</div><div className="ik">{t("已邀请(人)")}</div></div>
              <div className="itile"><div className="iv a">{data.points}</div><div className="ik">{t("累计积分")}</div></div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
