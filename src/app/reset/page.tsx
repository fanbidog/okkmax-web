"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

function ResetInner() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const t = useT();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (pw.length < 6) { setMsg(t("新密码至少 6 位")); return; }
    if (pw !== confirm) { setMsg(t("两次密码不一致")); return; }
    setBusy(true); setMsg("");
    const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: pw }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) { setDone(true); }
    else setMsg(t(d.error || "重置失败"));
    setBusy(false);
  }

  const card: React.CSSProperties = { maxWidth: 420, margin: "80px auto", background: "var(--surface)", borderRadius: 16, padding: "32px 28px", boxShadow: "0 4px 14px rgba(28,25,23,.05)" };
  const fld: React.CSSProperties = { width: "100%", height: 46, border: "1px solid var(--line2)", borderRadius: 10, padding: "0 14px", fontSize: 14, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)", marginBottom: 12, boxSizing: "border-box" };

  if (done) return (
    <div style={card}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>{t("密码已重置")}</div>
      <div style={{ fontSize: 14, color: "var(--ink3)", marginBottom: 20 }}>{t("为安全起见所有设备已退出登录,请用新密码重新登录。")}</div>
      <button onClick={() => { router.push("/"); setTimeout(() => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "login" } })), 50); }}
        style={{ width: "100%", height: 48, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("去登录")}</button>
    </div>
  );

  if (!token) return <div style={card}><div style={{ fontSize: 15, color: "var(--red)" }}>{t("链接无效,请从邮件重新打开。")}</div></div>;

  return (
    <div style={card}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 18 }}>{t("设置新密码")}</div>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("新密码(至少 6 位)")} style={fld} />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("确认新密码")} style={fld} />
      {msg && <div style={{ fontSize: 13, color: "var(--red)", marginBottom: 12 }}>{msg}</div>}
      <button onClick={submit} disabled={busy} style={{ width: "100%", height: 48, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{busy ? t("提交中…") : t("重置密码")}</button>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
